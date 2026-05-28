package main

import (
	"log"
	"net"
	"os"

	"gitwriter/internal/storageserver" // Adjust to match your module
	"gitwriter/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	port := os.Getenv("GRPC_PORT")
	if port == "" {
		port = "50051"
	}

	storageRoot := os.Getenv("STORAGE_ROOT")
	if storageRoot == "" {
		storageRoot = "./local_storage/hashes"
	}

	// 1. Open a TCP listener
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	// 2. Create a new gRPC server instance
	grpcServer := grpc.NewServer()

	// 3. Instantiate our custom server logic
	storageSrv := storageserver.NewServer(storageRoot)

	// 4. Register our server with the gRPC framework
	pb.RegisterGitStorageServer(grpcServer, storageSrv)

	// Optional: Enable reflection so tools like grpcurl or Postman can interact with it
	reflection.Register(grpcServer)

	log.Printf("Storage Node gRPC server listening on port %s", port)
	log.Printf("Writing Git repositories to: %s", storageRoot)

	// 5. Start serving requests
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}