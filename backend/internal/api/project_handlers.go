package api

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"gitwriter/internal/db"
	"gitwriter/pb"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type CreateProjectRequest struct {
	Title  string `json:"title" binding:"required"`
}

func (s *Server) handleCreateProject(c *gin.Context) {
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("CreateProject request binding failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("CreateProject attempt for title: %s", req.Title)

	// Pull the secure user_id injected by the AuthMiddleware
	userID, exists := c.Get("user_id")
	if !exists {
		log.Printf("CreateProject failed: user_id context missing")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User context missing"})
		return
	}

	// Cast the userID from an interface{} to an int
	uid := userID.(int)

	// 1. Save metadata to DB and get a Storage Node assignment
	project, err := s.db.CreateProject(c.Request.Context(), uid, req.Title)
	if err != nil {
		log.Printf("Failed to create project in DB for user %d: %v", uid, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project in DB"})
		return
	}
	log.Printf("Project created in DB with UUID: %s, assigned to Node IP: %s", project.ID.String(), project.StorageNodeIP)

	// Ask the manager for the connection instead of dialing from scratch!
    conn, err := s.connMgr.GetClient(project.StorageNodeIP)
    if err != nil {
		log.Printf("Failed to get gRPC client for IP %s: %v", project.StorageNodeIP, err)
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
		log.Printf("CRITICAL gRPC ERROR: InitRepo failed for %s: %v", project.ID.String(), err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize git repo"})
		return
	}

	log.Printf("Git repository successfully initialized for project UUID: %s", project.ID.String())

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
}

func (s *Server) handleSaveDraft(c *gin.Context) {
	var req SaveDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("SaveDraft request binding failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Reject junk before it ever reaches Postgres or a storage node
	if _, err := uuid.Parse(req.ProjectUUID); err != nil {
		log.Printf("SaveDraft rejected malformed project id %q: %v", req.ProjectUUID, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project id"})
		return
	}
	log.Printf("SaveDraft attempt for project %s, file: %s", req.ProjectUUID, req.FilePath)

	// 1. Pull the username injected by the AuthMiddleware
	usernameData, exists := c.Get("username")
	if !exists {
		log.Printf("SaveDraft failed: username context missing")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Username context missing"})
		return
	}
	// Cast it to a string
	authorName := usernameData.(string)

	// 2. Extract email from context
	emailData, exists := c.Get("email")
	if !exists {
		log.Printf("SaveDraft failed: email context missing")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Email context missing"})
		return
	}
	authorEmail := emailData.(string)

	// 3. Extract the secure user_id so we can prove the writer owns this project
	userID, exists := c.Get("user_id")
	if !exists {
		log.Printf("SaveDraft failed: user_id context missing")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User context missing"})
		return
	}
	uid := userID.(int)

	// 4. Ask the DB which node holds this project - and confirm the user actually owns it
	nodeIP, err := s.db.GetStorageNodeForUserProject(c.Request.Context(), req.ProjectUUID, uid)
	if err != nil {
		if errors.Is(err, db.ErrProjectNotFound) {
			log.Printf("SaveDraft denied: project %s not found for user %d", req.ProjectUUID, uid)
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		log.Printf("Storage node lookup failed for project %s: %v", req.ProjectUUID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Project routing failed"})
		return
	}

	// 5. Reuse the pooled gRPC connection to that node
	conn, err := s.connMgr.GetClient(nodeIP)
	if err != nil {
		log.Printf("Failed to get gRPC client for IP %s: %v", nodeIP, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get gRPC client"})
		return
	}
	grpcClient := pb.NewGitStorageClient(conn)

	// 6. Send the text to be committed
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := grpcClient.CommitDraft(ctx, &pb.CommitRequest{
		ProjectUuid: req.ProjectUUID,
		FilePath:    req.FilePath,
		Content:     req.Content,
		AuthorName:  authorName,
		AuthorEmail: authorEmail,
	})
	if err != nil {
		// Map the storage node's gRPC status onto a sensible HTTP status
		switch status.Code(err) {
		case codes.InvalidArgument:
			log.Printf("SaveDraft rejected file path %q for %s: %v", req.FilePath, req.ProjectUUID, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file path"})
		case codes.NotFound:
			log.Printf("SaveDraft: repository missing for project %s: %v", req.ProjectUUID, err)
			c.JSON(http.StatusNotFound, gin.H{"error": "Project repository not found"})
		default:
			log.Printf("gRPC Error: CommitDraft failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save draft to git"})
		}
		return
	}
	log.Printf("Draft successfully saved for project %s, commit hash: %s", req.ProjectUUID, resp.CommitHash)

	// 7. Return the Git commit hash to the user
	c.JSON(http.StatusOK, gin.H{
		"message":     resp.Message,
		"commit_hash": resp.CommitHash,
	})
}


func (s *Server) handleListProjects(c *gin.Context) {
	// 1. Pull the secure user_id injected by the AuthMiddleware
	userID, exists := c.Get("user_id")
	if !exists {
		log.Printf("ListProjects failed: user_id context missing")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User context missing"})
		return
	}
	uid := userID.(int)

	// 2. Fetch the user's projects from the database
	projects, err := s.db.GetProjectsByUser(c.Request.Context(), uid)
	if err != nil {
		log.Printf("Failed to fetch projects for user %d: %v", uid, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}
	log.Printf("Successfully fetched %d projects for user %d", len(projects), uid)

	// 3. Return the array of projects to the frontend
	c.JSON(http.StatusOK, gin.H{
		"projects": projects,
	})
}
// handleGetProjectContent serves GET /projects/:id/content?file_path=chapter_1.md
// It routes the read to whichever storage node owns the project and returns the
// latest committed text for that chapter.
func (s *Server) handleGetProjectContent(c *gin.Context) {
	projectUUID := c.Param("id")

	// Reject junk before it ever reaches Postgres or a storage node
	if _, err := uuid.Parse(projectUUID); err != nil {
		log.Printf("GetContent rejected malformed project id %q: %v", projectUUID, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project id"})
		return
	}

	// Default to the first chapter so the editor can open a fresh project with no query param
	filePath := c.DefaultQuery("file_path", "chapter_1.md")

	// Pull the secure user_id injected by the AuthMiddleware
	userID, exists := c.Get("user_id")
	if !exists {
		log.Printf("GetContent failed: user_id context missing")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User context missing"})
		return
	}
	uid := userID.(int)
	log.Printf("GetContent attempt for project %s, file: %s by user %d", projectUUID, filePath, uid)

	// 1. Ask the DB which node holds this project - and confirm the user actually owns it
	nodeIP, err := s.db.GetStorageNodeForUserProject(c.Request.Context(), projectUUID, uid)
	if err != nil {
		if errors.Is(err, db.ErrProjectNotFound) {
			log.Printf("GetContent denied: project %s not found for user %d", projectUUID, uid)
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		log.Printf("Storage node lookup failed for project %s: %v", projectUUID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Project routing failed"})
		return
	}

	// 2. Reuse the pooled gRPC connection to that node
	conn, err := s.connMgr.GetClient(nodeIP)
	if err != nil {
		log.Printf("Failed to get gRPC client for IP %s: %v", nodeIP, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get gRPC client"})
		return
	}
	grpcClient := pb.NewGitStorageClient(conn)

	// 3. Read the content back out of Git
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := grpcClient.GetContent(ctx, &pb.GetContentRequest{
		ProjectUuid: projectUUID,
		FilePath:    filePath,
	})
	if err != nil {
		// Map the storage node's gRPC status onto a sensible HTTP status
		switch status.Code(err) {
		case codes.InvalidArgument:
			log.Printf("GetContent rejected file path %q for %s: %v", filePath, projectUUID, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file path"})
		case codes.NotFound:
			log.Printf("GetContent: repository missing for project %s: %v", projectUUID, err)
			c.JSON(http.StatusNotFound, gin.H{"error": "Project repository not found"})
		default:
			log.Printf("gRPC Error: GetContent failed for %s: %v", projectUUID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load draft from git"})
		}
		return
	}

	log.Printf("Content loaded for project %s, file %s (exists=%t, commit=%s)", projectUUID, filePath, resp.Exists, resp.CommitHash)

	// 4. Hand the text back to the editor. A brand new project legitimately has no
	// content yet, so that is a 200 with an empty body rather than a 404.
	c.JSON(http.StatusOK, gin.H{
		"project_uuid": projectUUID,
		"file_path":    filePath,
		"content":      resp.Content,
		"exists":       resp.Exists,
		"commit_hash":  resp.CommitHash,
	})
}
