package db

import (
	"context"
	"fmt"

	"github.com/google/uuid"
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

// Project represents the metadata returned to the API
type Project struct {
	ID            uuid.UUID
	Title         string
	StorageNodeIP string
}

// CreateProject generates a UUID, assigns a storage node, and saves it to DB
func (s *Store) CreateProject(ctx context.Context, userID int, title string) (*Project, error) {
	// 1. Generate the cryptographically secure UUID
	projectID := uuid.New()

	// 2. Find an active storage node (For v1, we just grab the first available one)
	// In a massive system, this query would check which node has the most free disk space.
	var nodeID, nodeAddress string
	err := s.pool.QueryRow(ctx, 
		"SELECT id, grpc_address FROM storage_nodes WHERE is_active = true LIMIT 1",
	).Scan(&nodeID, &nodeAddress)
	
	if err != nil {
		return nil, fmt.Errorf("no active storage nodes available: %w", err)
	}

	// 3. Insert the new project mapping into the database
	_, err = s.pool.Exec(ctx,
		"INSERT INTO projects (id, user_id, title, storage_node_id) VALUES ($1, $2, $3, $4)",
		projectID, userID, title, nodeID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert project: %w", err)
	}

	return &Project{
		ID:            projectID,
		Title:         title,
		StorageNodeIP: nodeAddress, // The API needs this to make the gRPC call!
	}, nil
}

// GetStorageNodeForProject looks up exactly where a specific project is hosted
func (s *Store) GetStorageNodeForProject(ctx context.Context, projectID string) (string, error) {
	var grpcAddress string
	
	// JOIN the projects and storage_nodes tables to get the IP address
	query := `
		SELECT n.grpc_address 
		FROM projects p
		JOIN storage_nodes n ON p.storage_node_id = n.id
		WHERE p.id = $1
	`
	err := s.pool.QueryRow(ctx, query, projectID).Scan(&grpcAddress)
	if err != nil {
		return "", fmt.Errorf("could not route project %s: %w", projectID, err)
	}

	return grpcAddress, nil
}