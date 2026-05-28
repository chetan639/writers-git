// internal/api/grpc_manager.go
package api

import (
	"fmt"
	"sync"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// ConnectionManager keeps track of active gRPC connections
type ConnectionManager struct {
	clients map[string]*grpc.ClientConn
	mu      sync.RWMutex
}

// NewConnectionManager initializes the cache
func NewConnectionManager() *ConnectionManager {
	return &ConnectionManager{
		clients: make(map[string]*grpc.ClientConn),
	}
}

// GetClient retrieves an existing connection or creates a new one
func (m *ConnectionManager) GetClient(address string) (*grpc.ClientConn, error) {
	// 1. Fast path: check if we already have it (Read Lock)
	m.mu.RLock()
	conn, exists := m.clients[address]
	m.mu.RUnlock()

	if exists {
		return conn, nil
	}

	// 2. Slow path: we need to create it (Write Lock)
	m.mu.Lock()
	defer m.mu.Unlock()

	// Double-check pattern: another thread might have created it while we were waiting for the lock
	if conn, exists := m.clients[address]; exists {
		return conn, nil
	}

	// 3. Create the new connection using NewClient
	newConn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to %s: %w", address, err)
	}

	// 4. Save it to the map and return
	m.clients[address] = newConn
	return newConn, nil
}