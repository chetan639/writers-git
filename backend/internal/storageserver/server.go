package storageserver

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"gitwriter/pb" // Adjust this to match your module name

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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

	// Same sandbox check as the read path: never let a client write outside its own repo
	relPath, err := safeRelPath(req.FilePath)
	if err != nil {
		log.Printf("CommitDraft rejected path %q for %s: %v", req.FilePath, req.ProjectUuid, err)
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

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
	fullFilePath := filepath.Join(path, relPath)
	if err := os.WriteFile(fullFilePath, []byte(req.Content), 0644); err != nil {
		log.Printf("CommitDraft failed to write file %s for %s: %v", fullFilePath, req.ProjectUuid, err)
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	// Stage the file (equivalent to `git add <file>`)
	if _, err := worktree.Add(relPath); err != nil {
		log.Printf("CommitDraft failed to stage file %s for %s: %v", relPath, req.ProjectUuid, err)
		return nil, fmt.Errorf("failed to stage file: %w", err)
	}

	// Create the commit (equivalent to `git commit -m "..."`)
	commitMsg := fmt.Sprintf("Auto-save %s", relPath)
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

// safeRelPath validates a client-supplied file path before we touch the filesystem.
// It rejects absolute paths and any path that escapes the project's repo directory,
// so a request for "../../other-project/chapter_1.md" can never leave the sandbox.
func safeRelPath(filePath string) (string, error) {
	if filePath == "" {
		return "", fmt.Errorf("file path is required")
	}
	if filepath.IsAbs(filePath) {
		return "", fmt.Errorf("file path must be relative")
	}

	// Clean collapses "a/../b" style segments so the check below cannot be fooled
	cleaned := filepath.Clean(filePath)
	if cleaned == ".." || strings.HasPrefix(cleaned, ".."+string(os.PathSeparator)) {
		return "", fmt.Errorf("file path escapes the project directory")
	}
	if cleaned == "." || cleaned == string(os.PathSeparator) {
		return "", fmt.Errorf("file path is not a file")
	}

	// Git always stores paths with forward slashes, regardless of the host OS
	return filepath.ToSlash(cleaned), nil
}

// GetContent reads the latest committed version of a file straight out of the Git object
// store. We deliberately read from the HEAD commit rather than the working tree so the API
// always serves content that Git actually knows about.
func (s *Server) GetContent(ctx context.Context, req *pb.GetContentRequest) (*pb.GetContentResponse, error) {
	log.Printf("GetContent requested for project %s, file %s", req.ProjectUuid, req.FilePath)

	relPath, err := safeRelPath(req.FilePath)
	if err != nil {
		log.Printf("GetContent rejected path %q for %s: %v", req.FilePath, req.ProjectUuid, err)
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	// Take the project lock so we never read a half-written tree mid-commit
	mu := s.getLock(req.ProjectUuid)
	mu.Lock()
	defer mu.Unlock()

	path := s.getHashedPath(req.ProjectUuid)
	repo, err := git.PlainOpen(path)
	if err != nil {
		log.Printf("GetContent failed to open repo for %s: %v", req.ProjectUuid, err)
		return nil, status.Errorf(codes.NotFound, "repository not found for project %s", req.ProjectUuid)
	}

	// A freshly initialized repo has no HEAD until the first commit lands.
	// That is a normal state for a brand new project, not an error.
	head, err := repo.Head()
	if err != nil {
		if errors.Is(err, plumbing.ErrReferenceNotFound) {
			log.Printf("GetContent: project %s has no commits yet", req.ProjectUuid)
			return &pb.GetContentResponse{
				Success: true,
				Content: "",
				Exists:  false,
				Message: "Repository has no commits yet",
			}, nil
		}
		log.Printf("GetContent failed to resolve HEAD for %s: %v", req.ProjectUuid, err)
		return nil, status.Errorf(codes.Internal, "failed to resolve HEAD: %v", err)
	}

	commit, err := repo.CommitObject(head.Hash())
	if err != nil {
		log.Printf("GetContent failed to load commit %s for %s: %v", head.Hash(), req.ProjectUuid, err)
		return nil, status.Errorf(codes.Internal, "failed to load HEAD commit: %v", err)
	}

	file, err := commit.File(relPath)
	if err != nil {
		// The chapter simply has not been written yet - report it as "not existing"
		// rather than an error so the editor can open with a blank page.
		if errors.Is(err, object.ErrFileNotFound) {
			log.Printf("GetContent: file %s not found at HEAD for %s", relPath, req.ProjectUuid)
			return &pb.GetContentResponse{
				Success:    true,
				Content:    "",
				Exists:     false,
				CommitHash: head.Hash().String(),
				Message:    "File not found in the latest commit",
			}, nil
		}
		log.Printf("GetContent failed to look up file %s for %s: %v", relPath, req.ProjectUuid, err)
		return nil, status.Errorf(codes.Internal, "failed to look up file: %v", err)
	}

	contents, err := file.Contents()
	if err != nil {
		log.Printf("GetContent failed to read blob for %s in %s: %v", relPath, req.ProjectUuid, err)
		return nil, status.Errorf(codes.Internal, "failed to read file contents: %v", err)
	}

	log.Printf("GetContent successfully read %s (%d bytes) at commit %s for %s", relPath, len(contents), head.Hash(), req.ProjectUuid)
	return &pb.GetContentResponse{
		Success:    true,
		Content:    contents,
		Exists:     true,
		CommitHash: head.Hash().String(),
		Message:    "Content loaded successfully",
	}, nil
}
