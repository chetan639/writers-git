package storageserver

import (
	"context"
	"testing"

	"gitwriter/pb"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const testUUID = "11111111-2222-3333-4444-555555555555"

func TestGetContent(t *testing.T) {
	s := NewServer(t.TempDir())
	ctx := context.Background()

	if _, err := s.InitRepo(ctx, &pb.InitRequest{ProjectUuid: testUUID}); err != nil {
		t.Fatalf("InitRepo: %v", err)
	}

	// 1. Brand new repo, no commits yet -> empty content, exists=false, no error
	resp, err := s.GetContent(ctx, &pb.GetContentRequest{ProjectUuid: testUUID, FilePath: "chapter_1.md"})
	if err != nil {
		t.Fatalf("GetContent on empty repo: %v", err)
	}
	if resp.Exists || resp.Content != "" || !resp.Success {
		t.Errorf("empty repo: got exists=%t content=%q success=%t", resp.Exists, resp.Content, resp.Success)
	}

	// 2. Commit a draft, then read it back
	want := "It was a dark and stormy night.\n"
	commit, err := s.CommitDraft(ctx, &pb.CommitRequest{
		ProjectUuid: testUUID, FilePath: "chapter_1.md", Content: want,
		AuthorName: "Ada", AuthorEmail: "ada@example.com",
	})
	if err != nil {
		t.Fatalf("CommitDraft: %v", err)
	}

	resp, err = s.GetContent(ctx, &pb.GetContentRequest{ProjectUuid: testUUID, FilePath: "chapter_1.md"})
	if err != nil {
		t.Fatalf("GetContent after commit: %v", err)
	}
	if !resp.Exists || resp.Content != want {
		t.Errorf("after commit: exists=%t content=%q, want %q", resp.Exists, resp.Content, want)
	}
	if resp.CommitHash != commit.CommitHash {
		t.Errorf("commit hash = %q, want %q", resp.CommitHash, commit.CommitHash)
	}

	// 3. A file that was never committed -> exists=false, not an error
	resp, err = s.GetContent(ctx, &pb.GetContentRequest{ProjectUuid: testUUID, FilePath: "chapter_9.md"})
	if err != nil {
		t.Fatalf("GetContent for missing file: %v", err)
	}
	if resp.Exists || resp.Content != "" {
		t.Errorf("missing file: got exists=%t content=%q", resp.Exists, resp.Content)
	}

	// 4. Unknown project -> NotFound
	_, err = s.GetContent(ctx, &pb.GetContentRequest{ProjectUuid: "99999999-8888-7777-6666-555555555555", FilePath: "chapter_1.md"})
	if status.Code(err) != codes.NotFound {
		t.Errorf("unknown project: got %v, want NotFound", err)
	}

	// 5. Path traversal is rejected on both read and write
	for _, bad := range []string{"../../etc/passwd", "/etc/passwd", "..", "", "a/../../b.md"} {
		if _, err := s.GetContent(ctx, &pb.GetContentRequest{ProjectUuid: testUUID, FilePath: bad}); status.Code(err) != codes.InvalidArgument {
			t.Errorf("GetContent(%q): got %v, want InvalidArgument", bad, err)
		}
		if _, err := s.CommitDraft(ctx, &pb.CommitRequest{ProjectUuid: testUUID, FilePath: bad, Content: "x"}); status.Code(err) != codes.InvalidArgument {
			t.Errorf("CommitDraft(%q): got %v, want InvalidArgument", bad, err)
		}
	}
}
