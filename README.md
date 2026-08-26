# WritersGit

WritersGit is a Git-backed collaborative writing platform designed for authors to track their book and article progress. It provides a robust, distributed architecture to ensure seamless version control and secure storage of writing drafts.

---

## 🏗️ Architecture

WritersGit is split into a **Frontend** and a **Backend**, utilizing modern technologies to deliver a scalable and performant application.

### 1. Backend (`/backend`)
The backend is built in **Go** and uses a distributed architecture:
- **API Server**: Handles client authentication (JWT), user metadata, project management, and routing to Storage Nodes. It connects to a **PostgreSQL** database.
- **Storage Nodes**: Specialized nodes running behind a gRPC interface. They dynamically write files to disk and commit them to local Git repositories (`go-git`) scoped per project UUID.
- **Database**: PostgreSQL (provided via `docker-compose.yml`) stores users, project metadata, and storage node registrations.

For detailed backend instructions, refer to the [Backend README](backend/README.md).

### 2. Frontend (`/frontend`)
The frontend is built with **Next.js**, utilizing React and modern web development practices to provide an intuitive user interface for authors to write, manage projects, and view their version history.

For detailed frontend instructions, refer to the [Frontend README](frontend/README.md).

---

## 🚀 Getting Started

Follow these steps to run the complete WritersGit application locally.

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- [Go 1.25+](https://go.dev/)
- [Node.js & npm/yarn/pnpm](https://nodejs.org/)

### 1. Start the Database
From the root directory, start the PostgreSQL database using Docker Compose:
```bash
docker-compose up -d
```
*Note: This starts PostgreSQL on port `5432` with user `devuser`, password `devpassword`, and database `gitwriter`.*

Before running the backend, you must initialize the database schema and register your local storage node. Please refer to the **Database Setup** section in the [Backend README](backend/README.md).

### 2. Run the Backend
The backend requires both the Storage Node and the API Server to be running.

**Start the Storage Node:**
```bash
cd backend
go run ./cmd/storage-node/main.go
```

**Start the API Server (in a new terminal):**
```bash
cd backend
go run ./cmd/api-server/main.go
```
*The API Server runs on `http://localhost:8080` and the gRPC Storage Node runs on port `50051`.*

### 3. Run the Frontend
In a new terminal window, start the Next.js development server:
```bash
cd frontend
npm install  # or yarn install / pnpm install
npm run dev  # or yarn dev / pnpm dev
```
*The Frontend runs on `http://localhost:3000`.*

---

## 📄 License
See the [LICENSE](LICENSE) file for more information.
