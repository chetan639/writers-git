package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Store holds the database connection pool
type Store struct {
	pool *pgxpool.Pool
}

// NewStore initializes the connection to PostgreSQL
func NewStore(ctx context.Context, dsn string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	// Verify the connection works
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	return &Store{pool: pool}, nil
}

// Close gracefully shuts down the connection pool
func (s *Store) Close() {
	s.pool.Close()
}
