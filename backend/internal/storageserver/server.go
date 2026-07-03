package storageserver

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"gitwriter/pb" // Adjust this to match your module name

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// Server implements the pb.GitStorageServer interface
type Server struct {
	pb.UnimplementedGitStorageServer
	storageRoot string

	// locks prevents two concurrent requests from corrupting the same git repo
	locks      map[string]*sync.Mutex
	globalLock sync.Mutex
}

func NewServer(root string) *Server {
	return &Server{
		storageRoot: root,
		locks:       make(map[string]*sync.Mutex),
	}
}

// getLock returns a mutex specific to a project UUID
func (s *Server) getLock(uuid string) *sync.Mutex {
	s.globalLock.Lock()
	defer s.globalLock.Unlock()

	if _, exists := s.locks[uuid]; !exists {
		s.locks[uuid] = &sync.Mutex{}
	}
	return s.locks[uuid]
}

// getHashedPath converts "123e4567..." to "/local_storage/hashes/12/3e/123e4567..."
func (s *Server) getHashedPath(uuid string) string {
	if len(uuid) < 4 {
		return filepath.Join(s.storageRoot, uuid)
	}
	return filepath.Join(s.storageRoot, uuid[0:2], uuid[2:4], uuid)
}

// InitRepo creates a new standard git repository
func (s *Server) InitRepo(ctx context.Context, req *pb.InitRequest) (*pb.InitResponse, error) {
	log.Printf("InitRepo requested for project UUID: %s", req.ProjectUuid)
	path := s.getHashedPath(req.ProjectUuid)

	// Create directories if they don't exist
	if err := os.MkdirAll(path, 0755); err != nil {
		log.Printf("InitRepo failed to create directory for %s: %v", req.ProjectUuid, err)
		return nil, fmt.Errorf("failed to create directory: %w", err)
	}

	// Initialize the git repository (false = standard repo with a working tree, not bare)
	// We use a standard repo here so go-git can easily manipulate files in the working directory
	_, err := git.PlainInit(path, false)
	if err != nil {
		if err == git.ErrRepositoryAlreadyExists {
			log.Printf("InitRepo: Repository already exists for %s", req.ProjectUuid)
			return &pb.InitResponse{Success: true, Message: "Repo already exists"}, nil
		}
		log.Printf("InitRepo failed to initialize git repo for %s: %v", req.ProjectUuid, err)
		return nil, fmt.Errorf("failed to init git repo: %w", err)
	}

	log.Printf("InitRepo successfully initialized repository for %s", req.ProjectUuid)
	return &pb.InitResponse{Success: true, Message: "Repository initialized"}, nil
}

// CommitDraft writes the text to a file and creates a git commit
func (s *Server) CommitDraft(ctx context.Context, req *pb.CommitRequest) (*pb.CommitResponse, error) {
	log.Printf("CommitDraft requested for project %s, file %s by %s", req.ProjectUuid, req.FilePath, req.AuthorEmail)
	mu := s.getLock(req.ProjectUuid)
	mu.Lock()
	defer mu.Unlock() // Ensure only one commit happens at a time for this specific project

	path := s.getHashedPath(req.ProjectUuid)
	repo, err := git.PlainOpen(path)
	if err != nil {
		log.Printf("CommitDraft failed to open repo for %s: %v", req.ProjectUuid, err)
		return nil, fmt.Errorf("failed to open repo: %w", err)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		log.Printf("CommitDraft failed to get worktree for %s: %v", req.ProjectUuid, err)
		return nil, fmt.Errorf("failed to get worktree: %w", err)
	}

	// Write the raw text content to the filesystem
	fullFilePath := filepath.Join(path, req.FilePath)
	if err := os.WriteFile(fullFilePath, []byte(req.Content), 0644); err != nil {
		log.Printf("CommitDraft failed to write file %s for %s: %v", fullFilePath, req.ProjectUuid, err)
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	// Stage the file (equivalent to `git add <file>`)
	if _, err := worktree.Add(req.FilePath); err != nil {
		log.Printf("CommitDraft failed to stage file %s for %s: %v", req.FilePath, req.ProjectUuid, err)
		return nil, fmt.Errorf("failed to stage file: %w", err)
	}

	// Create the commit (equivalent to `git commit -m "..."`)
	commitMsg := fmt.Sprintf("Auto-save %s", req.FilePath)
	commitHash, err := worktree.Commit(commitMsg, &git.CommitOptions{
		Author: &object.Signature{
			Name:  req.AuthorName,
			Email: req.AuthorEmail,
			When:  time.Now(),
		},
	})
	if err != nil {
		log.Printf("CommitDraft failed to commit for %s: %v", req.ProjectUuid, err)
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	log.Printf("CommitDraft successfully committed for %s with hash %s", req.ProjectUuid, commitHash.String())
	return &pb.CommitResponse{
		Success:    true,
		CommitHash: commitHash.String(),
		Message:    "Draft saved successfully",
	}, nil
}