# WritersGit Backend

WritersGit Backend is a distributed Git-backed collaborative writing platform. It is built in Go and uses a split architecture consisting of an **API Gateway/Server** and specialized **Storage Nodes** that run standard Git repositories behind a gRPC interface.

---

## Architecture Overview

```mermaid
graph TD
    Client[Client / Frontend] -->|HTTP / JSON| API[API Server: Port 8080]
    API -->|Read/Write Metadata| DB[(PostgreSQL)]
    API -->|gRPC: Port 50051| Storage[Storage Node: Port 50051]
    Storage -->|go-git| GitRepos[(Local Git Repositories)]
```

1. **API Server (`cmd/api-server`)**: 
   - Handles client authentication (JWT via HttpOnly Cookies or Bearer tokens).
   - Manages user metadata and routes projects to assigned Storage Nodes using PostgreSQL.
   - Forwards write and repository initialization operations to Storage Nodes via gRPC.
2. **Storage Node (`cmd/storage-node`)**:
   - Exposes gRPC endpoints for repository initialization (`InitRepo`) and committing drafts (`CommitDraft`).
   - Dynamically writes files to disk and commits them to Git repositories scoped per project UUID using a hashed path lookup (e.g. `./local_storage/hashes/ab/cd/abcd-uuid...`).
3. **Database (PostgreSQL)**:
   - Stores users, project metadata, and registration/routing details of storage nodes.

---

## Prerequisites

Before running the application locally, ensure you have the following installed:

- **Go**: Version `1.25` or higher
- **PostgreSQL**: Version 13+
- **Protobuf Compiler (`protoc`)**: *(Optional)* Only required if you make changes to the `.proto` file.

---

## Database Setup

1. **Start the Database via Docker**:
   A `docker-compose.yml` file is provided in the project root to quickly spin up a PostgreSQL instance.
   ```bash
   cd .. # Go to the WritersGit root directory
   docker-compose up -d
   ```
   This will start PostgreSQL with the database `gitwriter` created and accessible on port `5432` with the default credentials (`devuser`/`devpassword`).

2. **Initialize Schema**:
   Run the following SQL commands to set up the tables:
   ```sql
   -- 1. Users Table
   CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       username VARCHAR(255) NOT NULL,
       email VARCHAR(255) UNIQUE NOT NULL,
       password_hash VARCHAR(255) NOT NULL
   );

   -- 2. Storage Nodes Table
   CREATE TABLE storage_nodes (
       id VARCHAR(255) PRIMARY KEY,
       grpc_address VARCHAR(255) NOT NULL,
       is_active BOOLEAN NOT NULL DEFAULT true
   );

   -- 3. Projects Table
   CREATE TABLE projects (
       id UUID PRIMARY KEY,
       user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       title VARCHAR(255) NOT NULL,
       storage_node_id VARCHAR(255) NOT NULL REFERENCES storage_nodes(id) ON DELETE CASCADE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **Register Local Storage Node (CRITICAL)**:
   The API server assigns projects to active storage nodes registered in the database. Insert a record for your local storage node:
   ```sql
   INSERT INTO storage_nodes (id, grpc_address, is_active)
   VALUES ('node-1', 'localhost:50051', true);
   ```

---

## Getting Started

### 1. Run the Storage Node

The Storage Node must be running so that the API Server can initialize and save drafts to Git repositories.

1. **Configuration (Environment Variables)**:
   - `GRPC_PORT`: Port for the gRPC server (default: `50051`).
   - `STORAGE_ROOT`: Location where git repositories are initialized and updated (default: `./local_storage/hashes`).

2. **Start the Storage Node**:
   ```bash
   # From the root directory of the backend project
   go run ./cmd/storage-node/main.go
   ```
   You should see logs indicating that the gRPC server is listening on port `50051`.

### 2. Run the API Server

1. **Configuration (Environment Variables)**:
   - `DB_DSN`: PostgreSQL connection string (default: `postgres://devuser:devpassword@localhost:5432/gitwriter?sslmode=disable`).
   - `PORT`: Port for the HTTP API server (default: `8080`).

2. **Start the API Server**:
   ```bash
   # Set the database DSN matching your local Postgres credentials if they differ from the default
   export DB_DSN="postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/gitwriter?sslmode=disable"
   
   go run ./cmd/api-server/main.go
   ```
   You should see logs indicating a successful database connection and that the API server is listening on port `8080`.

---

## API Endpoints & Verification Flow

You can verify the setup by calling the API endpoints using `curl` or tools like Postman.

### 1. Register a New User
```bash
curl -X POST http://localhost:8080/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "writer1",
    "email": "writer1@example.com",
    "password": "securepassword123"
  }'
```

### 2. Log In
Log in to receive your JWT token. This will set an HttpOnly cookie named `gitwriter_jwt`.
```bash
curl -c cookies.txt -X POST http://localhost:8080/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "writer1@example.com",
    "password": "securepassword123"
  }'
```
> **Note**: For tools that don't support cookies (like raw `curl`), you can also pass the JWT via the `Authorization: Bearer <TOKEN>` header.

### 3. Create a Project
Create a book/project (this initializes a Git repository under `local_storage/hashes/`):
```bash
curl -b cookies.txt -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Novel"
  }'
```
Response will include a `project_uuid`. Keep note of this UUID for the next step.

### 4. Save a Draft (Commit)
This saves text content to the specified file and commits it with the author details to the project's Git repository:
```bash
curl -b cookies.txt -X POST http://localhost:8080/api/v1/projects/save \
  -H "Content-Type: application/json" \
  -d '{
    "project_uuid": "YOUR-PROJECT-UUID-HERE",
    "file_path": "chapter_1.md",
    "content": "# Chapter 1: The Beginning\n\nIt was a dark and stormy night..."
  }'
```
Response will include a `commit_hash` indicating the commit succeeded.

### 5. List Projects
List all projects associated with your user:
```bash
curl -b cookies.txt -X GET http://localhost:8080/api/v1/projects
```

---

## Protobuf Regeneration (Optional)

If you modify `pb/storage.proto`, you will need to regenerate the Go gRPC code.

1. Install the protoc plugins for Go:
   ```bash
   go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
   go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
   ```
2. Run the compiler from the project root:
   ```bash
   protoc --go_out=. --go-grpc_out=. pb/storage.proto
   ```
