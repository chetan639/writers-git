package main

import (
	"context"
	"log"
	"os"

	"gitwriter/internal/api"
	"gitwriter/internal/db"
)

func main() {
	// Read the database connection string from the environment
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "postgres://devuser:devpassword@localhost:5432/gitwriter?sslmode=disable"
	}

	// 1. Connect to PostgreSQL
	store, err := db.NewStore(context.Background(), dsn)
	if err != nil {
		log.Fatalf("Cannot connect to database: %v", err)
	}
	defer store.Close()
	log.Println("Successfully connected to PostgreSQL")

	// 2. Initialize the Gin API Server
	server := api.NewServer(store)

	// 3. Start listening for HTTP requests
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	log.Printf("Starting API server on port %s", port)
	if err := server.Start(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}