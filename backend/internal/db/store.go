package db

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Store holds the database connection pool
type Store struct {
	pool *pgxpool.Pool
}

// NewStore initializes the connection to PostgreSQL
func NewStore(ctx context.Context, dsn string) (*Store, error) {
	log.Println("Initializing database connection...")
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Printf("Failed to create database pool: %v", err)
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	// Verify the connection works
	if err := pool.Ping(ctx); err != nil {
		log.Printf("Database ping failed: %v", err)
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	log.Println("Database connection successfully established")
	return &Store{pool: pool}, nil
}

// Close gracefully shuts down the connection pool
func (s *Store) Close() {
	log.Println("Closing database connection pool...")
	s.pool.Close()
}
