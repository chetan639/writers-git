package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Project represents a book/repository in the system
type Project struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	StorageNodeIP string    `json:"-"`
	CreatedAt     time.Time `json:"created_at"`
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

// GetProjectsByUser fetches all books belonging to a specific user, newest first
func (s *Store) GetProjectsByUser(ctx context.Context, userID int) ([]Project, error) {
	query := `
		SELECT id, title, storage_node_id, created_at 
		FROM projects 
		WHERE user_id = $1 
		ORDER BY created_at DESC
	`
	
	// Query executes the SQL and returns multiple rows
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close() // Always close rows to prevent database memory leaks!

	// Create an empty slice to hold the results
	projects := make([]Project, 0)

	// Loop through the returned rows and parse them into our struct
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.Title, &p.StorageNodeIP, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan project row: %w", err)
		}
		projects = append(projects, p)
	}

	return projects, nil
}
// ErrProjectNotFound is returned when a project either does not exist or is not
// owned by the requesting user. We deliberately do not distinguish between the two
// so an attacker cannot probe for the existence of other people's project UUIDs.
var ErrProjectNotFound = errors.New("project not found")

// GetStorageNodeForUserProject resolves which storage node hosts a project, but only
// if that project actually belongs to userID. Every routing lookup goes through here so
// an authenticated user can never reach another writer's repository.
func (s *Store) GetStorageNodeForUserProject(ctx context.Context, projectID string, userID int) (string, error) {
	var grpcAddress string

	query := `
		SELECT n.grpc_address
		FROM projects p
		JOIN storage_nodes n ON p.storage_node_id = n.id
		WHERE p.id = $1 AND p.user_id = $2
	`
	err := s.pool.QueryRow(ctx, query, projectID, userID).Scan(&grpcAddress)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrProjectNotFound
		}
		return "", fmt.Errorf("could not route project %s: %w", projectID, err)
	}

	return grpcAddress, nil
}
