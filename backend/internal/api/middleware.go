package api

import (
	"net/http"
	"strings"

	"gitwriter/internal/auth"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware ensures the user has a valid JWT token
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// 1. Try to get the token from the HttpOnly Cookie first (Next.js flow)
		cookie, err := c.Cookie("gitwriter_jwt")
		if err == nil {
			tokenString = cookie
		} else {
			// 2. Fallback: Try the Authorization header (Postman / mobile app flow)
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && parts[0] == "Bearer" {
					tokenString = parts[1]
				}
			}
		}

		// If we still don't have a token, boot them out
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		// 3. Validate the token
		claims, err := auth.ValidateJWT(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// 4. Success! Inject the UserID into the context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("email", claims.Email)
		c.Next()
	}
}