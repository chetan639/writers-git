package db

import (
	"context"
	"fmt"
)

// User represents a registered author in the system
type User struct {
	ID           int
	Username     string
	Email        string
	PasswordHash string
}

// CreateUser inserts a new user and returns their generated ID
func (s *Store) CreateUser(ctx context.Context, username, email, passwordHash string) (int, error) {
	var id int
	
	// We use RETURNING id so PostgreSQL instantly hands back the new user's ID
	query := `INSERT INTO users (username, email, password_hash) 
	          VALUES ($1, $2, $3) RETURNING id`
			  
	err := s.pool.QueryRow(ctx, query, username, email, passwordHash).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("failed to create user: %w", err)
	}
	
	return id, nil
}

// GetUserByEmail fetches a user's details (including the password hash) for login
func (s *Store) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	
	query := `SELECT id, username, email, password_hash FROM users WHERE email = $1`
	err := s.pool.QueryRow(ctx, query, email).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash)
	
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	
	return &u, nil
}