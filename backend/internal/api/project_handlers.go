package api

import (
	"context"
	"gitwriter/pb"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type CreateProjectRequest struct {
	Title  string `json:"title" binding:"required"`
}

func (s *Server) handleCreateProject(c *gin.Context) {
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Pull the secure user_id injected by the AuthMiddleware
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User context missing"})
		return
	}

	// Cast the userID from an interface{} to an int
	uid := userID.(int)

	// 1. Save metadata to DB and get a Storage Node assignment
	project, err := s.db.CreateProject(c.Request.Context(), uid, req.Title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project in DB"})
		return
	}

	// Ask the manager for the connection instead of dialing from scratch!
    conn, err := s.connMgr.GetClient(project.StorageNodeIP)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get gRPC client"})
        return
    }

	grpcClient := pb.NewGitStorageClient(conn)

	// 3. Tell the Storage Node to initialize the Git repository
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	_, err = grpcClient.InitRepo(ctx, &pb.InitRequest{
		ProjectUuid: project.ID.String(),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize git repo"})
		return
	}

	// 4. Return the UUID to the frontend
	c.JSON(http.StatusOK, gin.H{
		"message":      "Project created successfully",
		"project_uuid": project.ID.String(),
	})
}

type SaveDraftRequest struct {
	ProjectUUID string `json:"project_uuid" binding:"required"`
	FilePath    string `json:"file_path" binding:"required"`
	Content     string `json:"content" binding:"required"`
	AuthorName  string `json:"author_name" binding:"required"`
}

func (s *Server) handleSaveDraft(c *gin.Context) {
	var req SaveDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Ask the DB: "Which node holds this project?"
	nodeIP, err := s.db.GetStorageNodeForProject(c.Request.Context(), req.ProjectUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project routing not found"})
		return
	}

	// 2. Create a gRPC client using NewClient
	conn, err := grpc.NewClient(nodeIP, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to configure gRPC client"})
		return
	}
	defer conn.Close()
	grpcClient := pb.NewGitStorageClient(conn)

	// 3. Send the text to be committed
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := grpcClient.CommitDraft(ctx, &pb.CommitRequest{
		ProjectUuid: req.ProjectUUID,
		FilePath:    req.FilePath,
		Content:     req.Content,
		AuthorName:  req.AuthorName,
		AuthorEmail: "auto@gitwriter.app",
	})
	if err != nil {
		log.Printf("gRPC Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save draft to git"})
		return
	}

	// 4. Return the Git commit hash to the user
	c.JSON(http.StatusOK, gin.H{
		"message":     resp.Message,
		"commit_hash": resp.CommitHash,
	})
}