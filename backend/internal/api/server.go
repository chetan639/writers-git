package api

import (
	"log"
	"time"

	"gitwriter/internal/db"

	"github.com/gin-gonic/gin"

	"github.com/gin-contrib/cors"
)

// Server holds the dependencies for our HTTP handlers
type Server struct {
	router *gin.Engine
	db     *db.Store
	connMgr *ConnectionManager
}

func NewServer(store *db.Store) *Server {
	log.Println("Initializing new API server...")
	s := &Server{
		router: gin.Default(),
		db:     store,
		connMgr: NewConnectionManager(),
	}

	s.router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	
	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// Grouping routes under /api/v1
	// 1. PUBLIC ROUTES (No VIP pass required)
	public := s.router.Group("/api/v1")
	{
		public.POST("/signup", s.handleSignup)
		public.POST("/login", s.handleLogin)
		public.POST("/logout", s.handleLogout)
	}

	private := s.router.Group("/api/v1")
	private.Use(AuthMiddleware())
	{
		private.GET("/projects", s.handleListProjects)
		private.POST("/projects", s.handleCreateProject)
		private.POST("/projects/save", s.handleSaveDraft)
	}
}

// Start runs the Gin web server
func (s *Server) Start(address string) error {
	log.Printf("Starting API server on %s", address)
	err := s.router.Run(address)
	if err != nil {
		log.Printf("Server failed to start: %v", err)
	}
	return err
}