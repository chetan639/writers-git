package api

import (
	"net/http"
	"strings"

	"gitwriter/internal/auth"

	"github.com/gin-gonic/gin"
)

// --- Signup ---

type SignupRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

func (s *Server) handleSignup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Hash the password securely
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	// 2. Save the user to PostgreSQL
	// We make emails lowercase to prevent case-sensitive login errors later
	userID, err := s.db.CreateUser(c.Request.Context(), req.Username, strings.ToLower(req.Email), hashedPassword)
	if err != nil {
		// In a production app, check if the error is a unique constraint violation (duplicate email)
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user_id": userID,
	})
}

// --- Login ---

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (s *Server) handleLogin(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Fetch the user from the database by email
	user, err := s.db.GetUserByEmail(c.Request.Context(), strings.ToLower(req.Email))
	if err != nil {
		// Always return a generic error for auth failures to prevent email enumeration attacks
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// 2. Compare the provided password with the database hash
	if !auth.CheckPasswordHash(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// 3. Passwords match! Generate the JWT VIP pass.
	token, err := auth.GenerateJWT(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// 4. Return the token to the frontend
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
	})
}