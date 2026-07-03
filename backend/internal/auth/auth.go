package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// In a real production app, NEVER hardcode this.
// It should be read from os.Getenv("JWT_SECRET")
var jwtSecret = []byte("super_secret_gitwriter_key_change_me")

// Claims represents the data we embed inside the JWT token
type Claims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	jwt.RegisteredClaims
}

// HashPassword takes a plain text string and returns a bcrypt hash
func HashPassword(password string) (string, error) {
	// 14 is the "cost" factor. The higher the number, the more CPU time 
	// it takes to hash, making brute-force attacks significantly harder.
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// CheckPasswordHash compares a plain text password against the database hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateJWT creates a signed token valid for 24 hours
func GenerateJWT(userID int, username, email string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	
	claims := &Claims{
		UserID:   userID,
		Username: username,
		Email:    email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	// Create the token using the HS256 cryptographic algorithm
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	
	// Sign it with our secret key
	return token.SignedString(jwtSecret)
}

// ValidateJWT verifies the token is authentic and hasn't expired
func ValidateJWT(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, errors.New("token has expired")
		}
		return nil, errors.New("invalid token")
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}