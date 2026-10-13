# College Office Request Tracker

> **Cloud & DevOps Mini Project**  
> A containerized institutional service request management system built with Node.js 20, Express, MongoDB 7, and vanilla HTML/CSS/JS.

---

## 1. Project Overview

The **College Office Request Tracker** streamlines certificate and service requests between students and administrative staff.
- **Students**: Self-register, submit requests (Bonafide Certificate, Transcript, ID Card, Fee Receipt), and track processing statuses in real time.
- **Staff**: Log in with seeded administrative credentials, inspect all requests, filter by status, search by request ID, advance the request lifecycle, and append official remarks.
- **Sequential IDs**: Generates atomic IDs (`REQ-0001`, `REQ-0002`) via an atomic MongoDB Counter collection.
- **Status Lifecycle**: Strictly enforces institutional state progression:  
  `Submitted` &rarr; `In Progress` &rarr; `Approved` | `Rejected` &rarr; `Ready for Collection` &rarr; `Completed`. `Rejected` and `Completed` are terminal states. Any invalid transition returns HTTP 400.
- **Staff Portal Security**: Includes 15-minute inactivity auto-lock for unattended desks, server-side token & role verification (`/api/auth/me`), staff audit trail logging (`lastUpdatedBy`), and HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`).
- **Role Isolation**: Cross-student viewing and student access to staff endpoints return HTTP 403 Forbidden.

---

## 2. Tech Stack

- **Backend**: Node.js 20 (Alpine), Express 4
- **Database**: MongoDB 7, Mongoose 8
- **Authentication**: JWT, bcryptjs password hashing
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (served by Express)
- **DevOps**: Docker, Docker Compose, GitHub Actions CI
- **Monitoring & Observability**: Prometheus, Grafana, prom-client

---

## 3. Quick Start Setup (Docker)

### Prerequisites
- Docker & Docker Compose installed and running.

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Build and Start the Stack
```bash
docker compose up --build -d
```

### 3. Verify Containers
```bash
docker compose ps
```
The stack spins up 4 containers:
- `college_tracker_app` on port `3000` (Node.js API & UI)
- `college_tracker_mongo` on port `27017` (MongoDB database)
- `college_tracker_prometheus` on port `9090` (Metrics scraping)
- `college_tracker_grafana` on port `3001` (Metrics dashboard)

### 4. Seed Staff Account
```bash
docker compose exec app node backend/scripts/seedStaff.js
```

### Endpoints & Credentials
| Service | URL | Credentials / Notes |
|---|---|---|
| **Web Portal** | `http://localhost:3000` | Staff & Student portals |
| **Prometheus UI** | `http://localhost:9090` | Metrics target `app:3000` (State: UP) |
| **Grafana Dashboard** | `http://localhost:3001` | Username: `admin`, Password: `admin` |
| **Default Staff** | `http://localhost:3000` | `staff@college.edu` / `Staff@123` |
| **Student Self-Register** | `http://localhost:3000/register.html` | User created |

Access the application in your browser at: **`http://localhost:3000`**

---

## 4. API Reference

| Method | Endpoint | Role | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/health` | Public | Service health & uptime probe | `200` |
| `POST` | `/api/auth/register` | Public | Register new student (role forced to `student`) | `201`, `400` |
| `POST` | `/api/auth/login` | Public | Authenticate user; returns JWT token | `200`, `400`, `401` |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated profile | `200`, `401` |
| `POST` | `/api/requests` | Student | Submit new request; generates `REQ-XXXX` | `201`, `400`, `403` |
| `GET` | `/api/requests/my` | Student | View student's own submitted requests | `200`, `403` |
| `GET` | `/api/requests/:requestId` | Student (own) / Staff (any) | Fetch specific request details | `200`, `403`, `404` |
| `GET` | `/api/requests` | Staff | View all requests (`?status=` and `?search=`) | `200`, `403` |
| `PATCH` | `/api/requests/:requestId` | Staff | Update status & remarks (validates flow) | `200`, `400`, `403`, `404` |
| `GET` | `/metrics` | Public / Prometheus | Prometheus metrics scraping endpoint | `200` |

---

## 5. Demo & Persistence Script

Run through this interactive flow to demonstrate functionality and container volume persistence:

```bash
# 1. Confirm containers are up and healthy
docker compose ps

# 2. Seed administrative staff
docker compose exec app node backend/scripts/seedStaff.js

# 3. Use the application:
#    - Navigate to http://localhost:3000/register.html
#    - Register a student (e.g. John Doe, CS-2024-001)
#    - Submit Request 1: Bonafide Certificate -> assigned REQ-0001 (Submitted)
#    - Submit Request 2: Transcript -> assigned REQ-0002 (Submitted)
#    - Sign out and log in as staff (staff@college.edu / Staff@123)
#    - Update REQ-0001: Submitted -> In Progress -> Approved -> Ready for Collection
#    - Try an invalid transition (e.g. Submitted -> Approved on REQ-0002) -> rejected with 400

# 4. Stop containers (preserves named volume)
docker compose down

# 5. Restart containers
docker compose up -d

# 6. Verify data persistence:
#    - Open http://localhost:3000 and log back in as John Doe or Staff
#    - Confirm REQ-0001 (Ready for Collection) and REQ-0002 remain intact.
```

---

## 6. Troubleshooting

1. **Docker is not installed or Docker daemon is not running**:
   - Ensure Docker Desktop is installed and running with WSL 2 / Hyper-V backend.
   - For local development without Docker: ensure local MongoDB is running on port 27017, run `npm install`, `node backend/scripts/seedStaff.js`, then `npm start`.

2. **Port 3000 is already in use (`EADDRINUSE`)**:
   - Check which process is using port 3000:
     - Linux/macOS: `lsof -i :3000` or `netstat -tulnp | grep 3000`
     - Windows PowerShell: `Get-NetTCPConnection -LocalPort 3000`
   - Terminate the conflicting process or modify `PORT` in `.env`.

3. **MongoDB container is not healthy yet (`waiting for condition: service_healthy`)**:
   - Initial MongoDB startup can take 5–15 seconds depending on disk speed.
   - Inspect container logs with `docker compose logs mongo` to verify `mongosh` ping checks.

---

## 7. Team Contributions

| Member | Branch | Responsibility |
|---|---|---|
| | `feature/auth` | |
| | `feature/requests-api` | |
| | `feature/frontend` | |
| | `feature/docker` | |
