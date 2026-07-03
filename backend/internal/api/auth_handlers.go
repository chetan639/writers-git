package api

import (
	"log"
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
		log.Printf("Signup request binding failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("Signup attempt for username: %s, email: %s", req.Username, req.Email)

	// 1. Hash the password securely
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Printf("Failed to hash password for %s: %v", req.Username, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	// 2. Save the user to PostgreSQL
	// We make emails lowercase to prevent case-sensitive login errors later
	userID, err := s.db.CreateUser(c.Request.Context(), req.Username, strings.ToLower(req.Email), hashedPassword)
	if err != nil {
		log.Printf("Failed to create user %s in DB: %v", req.Username, err)
		// In a production app, check if the error is a unique constraint violation (duplicate email)
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
		return
	}

	log.Printf("Successfully created user %s with ID %d", req.Username, userID)
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
		log.Printf("Login request binding failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("Login attempt for email: %s", req.Email)

	// 1. Fetch the user from the database by email
	user, err := s.db.GetUserByEmail(c.Request.Context(), strings.ToLower(req.Email))
	if err != nil {
		log.Printf("Login failed: User not found for email %s", req.Email)
		// Always return a generic error for auth failures to prevent email enumeration attacks
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// 2. Compare the provided password with the database hash
	if !auth.CheckPasswordHash(req.Password, user.PasswordHash) {
		log.Printf("Login failed: Invalid password for email %s", req.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// 3. Passwords match! Generate the JWT VIP pass.
	token, err := auth.GenerateJWT(user.ID, user.Username, user.Email)
	if err != nil {
		log.Printf("Failed to generate JWT for user %d: %v", user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// 4. --- NEW: Set the HttpOnly Cookie ---
	// Parameters: name, value, maxAge (seconds), path, domain, secure (HTTPS only), httpOnly
	// Note: Set 'secure' to true in production when you have HTTPS!
	c.SetCookie("gitwriter_jwt", token, 3600*24, "/", "localhost", false, true)

	log.Printf("User %s successfully logged in", user.Username)
	// We still return a success message, but the frontend doesn't need to manually store anything.
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
	})
}

// --- Logout ---
func (s *Server) handleLogout(c *gin.Context) {
	log.Printf("Logout requested")
	// Overwrite the cookie with a blank value and a negative MaxAge to destroy it instantly
	c.SetCookie("gitwriter_jwt", "", -1, "/", "localhost", false, true)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}