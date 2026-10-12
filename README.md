# College Office Request Tracker

> **Cloud & DevOps Mini Project**  
> Containerized, full-stack institutional service request management system built with **Node.js 20**, **Express**, **MongoDB 7**, **Mongoose**, **JWT**, **bcryptjs**, and vanilla HTML/CSS/JS.

---

## Table of Contents
- [Overview](#overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Status Flow & Workflow Rules](#status-flow--workflow-rules)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start with Docker](#quick-start-with-docker)
- [Local Development Setup](#local-development-setup)
- [API Reference](#api-reference)
- [Step-by-Step Docker Demo Script](#step-by-step-docker-demo-script)
- [CI/CD Pipeline](#cicd-pipeline)
- [Git Branching & Commit Conventions](#git-branching--commit-conventions)

---

## Overview

The **College Office Request Tracker** streamlines administrative workflows between students and college staff. Students can register, submit certificate requests (Bonafide, Transcripts, ID Cards, Fee Receipts), and track real-time processing statuses. Administrative staff can review, search, filter, and progress requests through a strictly enforced institutional lifecycle.

### Key Features
- **Role-Based Access Control**:
  - **Student**: Public self-registration, submit requests, view only personal requests, real-time status and remarks tracking.
  - **Staff**: Seeded administrative account, view all submissions, filter by status, search by Request ID/student details, advance workflow statuses, add instructions and remarks.
- **Strict Role Isolation**: Students attempting to access staff endpoints or inspect other students' requests receive `HTTP 403 Forbidden`.
- **Atomic Sequential Tracking IDs**: Unique, human-readable IDs (`REQ-0001`, `REQ-0002`) generated atomically via MongoDB's `$inc` operator on a dedicated Counter collection.
- **Strict Status Flow**: Enforced at both backend model layer (`HTTP 400 Bad Request` on invalid transitions) and in the staff user interface.
- **Production-Grade Containerization**: Multi-service Docker Compose deployment with automated health checks, non-root user execution, and persistent volume storage.

---

## Architecture & Tech Stack

- **Runtime & Backend**: Node.js 20 (Alpine), Express 4
- **Database & ODM**: MongoDB 7, Mongoose 8
- **Authentication**: Stateless JSON Web Tokens (JWT) + salted password hashing with `bcryptjs`
- **Frontend**: Vanilla HTML5, responsive CSS3, vanilla JavaScript (served directly by Express static middleware)
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions (`.github/workflows/docker.yml`)

---

## Status Flow & Workflow Rules

Requests strictly adhere to the following institutional state machine:

```
                  +---------------------------+
                  |         Submitted         |
                  +-------------+-------------+
                                |
                                v
                  +---------------------------+
                  |        In Progress        |
                  +------+-------------+------+
                         |             |
           +-------------+             +-------------+
           v                                         v
+--------------------+                     +--------------------+
|      Approved      |                     |      Rejected      | (Terminal)
+----------+---------+                     +--------------------+
           |
           v
+--------------------+
|Ready for Collection| (Terminal)
+--------------------+
```

### Transition Validation Rules:
1. `Submitted` &rarr; `In Progress`
2. `In Progress` &rarr; `Approved` OR `Rejected`
3. `Approved` &rarr; `Ready for Collection`
4. `Rejected` and `Ready for Collection` are **terminal** states; no further transitions are allowed.
5. Any invalid jump (e.g. `Submitted` &rarr; `Approved` directly) returns **HTTP 400 Bad Request**.

---

## Repository Structure

```
College-Office/
├── .github/
│   └── workflows/
│       └── docker.yml          # GitHub Actions Docker build workflow
├── backend/
│   ├── config/
│   │   └── db.js               # MongoDB connection (fails fast without fallback)
│   ├── controllers/
│   │   ├── authController.js   # Registration, login, /me endpoint logic
│   │   └── requestController.js# Request creation, querying, status validation
│   ├── middleware/
│   │   └── auth.js             # JWT verification & role authorization (401/403)
│   ├── models/
│   │   ├── Counter.js          # Atomic sequential ID generator collection
│   │   ├── Request.js          # Request schema, status & certificate enums
│   │   └── User.js             # User schema with bcrypt password hashing
│   ├── routes/
│   │   ├── authRoutes.js       # Auth endpoint routing
│   │   └── requestRoutes.js    # Request endpoint routing
│   ├── scripts/
│   │   └── seedStaff.js        # Staff user seed script (idempotent)
│   ├── package.json            # Backend package descriptor
│   └── server.js               # Express application entrypoint & static server
├── frontend/
│   ├── css/
│   │   └── style.css           # Clean, responsive styles with color-coded badges
│   ├── js/
│   │   ├── auth.js             # Session management & auth guarding
│   │   ├── staff.js            # Staff dashboard, search/filter & update modal
│   │   └── student.js          # Student portal & submission handlers
│   ├── login.html              # Login page for students and staff
│   ├── register.html           # Student self-registration page
│   ├── staff.html              # Staff administrative dashboard
│   └── student.html            # Student portal
├── .dockerignore               # Docker build ignore rules
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── Dockerfile                  # Production container definition (node:20-alpine)
├── docker-compose.yml          # Multi-container orchestration (App + MongoDB 7)
├── package.json                # Project root manifest
├── package-lock.json           # Locked dependency tree
└── README.md                   # Project documentation & demo script
```

---

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose plugin)
- *Optional for local development*: **Node.js 20+** and **MongoDB 7+**

---

## Quick Start with Docker

### 1. Clone the repository and configure environment
```bash
git clone <repository-url>
cd College-Office
cp .env.example .env
```

### 2. Build and launch containers
```bash
docker compose up --build -d
```

### 3. Verify services are running and healthy
```bash
docker ps
```
Both `college_tracker_mongo` and `college_tracker_app` should show `healthy` status.

### 4. Seed the administrative staff account
```bash
docker compose exec app node backend/scripts/seedStaff.js
```
Default provisioned credentials:
- **Email**: `staff@college.edu`
- **Password**: `Staff@123`
- **Role**: `staff`

### 5. Access the Web Application
Open your browser and navigate to:
```
http://localhost:3000
```

---

## Local Development Setup

To run directly on your host machine without Docker:

1. Ensure MongoDB is running locally on `mongodb://127.0.0.1:27017`.
2. Configure `.env`:
   ```bash
   cp .env.example .env
   ```
   Set `MONGODB_URI=mongodb://127.0.0.1:27017/college_tracker`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Seed the staff user:
   ```bash
   npm run seed
   ```
5. Start the server:
   ```bash
   npm start
   ```
6. Access `http://localhost:3000`.

---

## API Reference

### Health Check
| Method | Endpoint | Access | Description | Status |
|---|---|---|---|---|
| `GET` | `/api/health` | Public | System uptime & health check (used by Docker HEALTHCHECK) | `200` |

### Authentication
| Method | Endpoint | Access | Request Body | Response / Details | Status |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | `{ name, email, password, studentId? }` | Registers a new student account (role forced to `student`) | `201`, `400` |
| `POST` | `/api/auth/login` | Public | `{ email, password }` | Authenticates user; returns JWT token and profile | `200`, `400`, `401` |
| `GET` | `/api/auth/me` | Authenticated | *None* (Bearer Token) | Returns profile of the currently logged-in user | `200`, `401` |

### Requests Management
| Method | Endpoint | Access | Query / Body | Description | Status |
|---|---|---|---|---|---|
| `POST` | `/api/requests` | Student Only | `{ requestType, description }` | Submits request; generates sequential ID (`REQ-0001`) | `201`, `400`, `403` |
| `GET` | `/api/requests/my` | Student Only | *None* | Retrieves all requests created by authenticated student | `200`, `403` |
| `GET` | `/api/requests/:requestId` | Student (own) / Staff (any) | *None* | Looks up request by `REQ-XXXX` ID. Cross-student access is forbidden. | `200`, `403`, `404` |
| `GET` | `/api/requests` | Staff Only | `?status=<status>&search=<term>` | Lists all requests with optional status filtering & text search | `200`, `403` |
| `PATCH` | `/api/requests/:requestId` | Staff Only | `{ status?, remarks? }` | Updates status (validated against lifecycle) and adds remarks | `200`, `400`, `403`, `404` |

---

## Step-by-Step Docker Demo Script

Follow this scripted verification flow to demonstrate the complete containerized application:

### Step 1: Verify Running Containers & Health
```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```
*Expected Output*: Both `college_tracker_mongo` and `college_tracker_app` show `(healthy)`.

Verify application health check endpoint:
```bash
curl -s http://localhost:3000/api/health
```
*Expected Output*:
```json
{"status":"ok","uptime":15,"timestamp":"2026-10-12T16:45:00.000Z"}
```

---

### Step 2: Seed Staff Credentials
Execute the seed script inside the running container:
```bash
docker compose exec app node backend/scripts/seedStaff.js
```
*Expected Output*:
```
[Seed] Connected to MongoDB.
[Seed] Staff user 'staff@college.edu' created successfully.
[Seed] Credentials:
       Email:    staff@college.edu
       Password: Staff@123
       Role:     staff
```

---

### Step 3: Student Registration & Login Flow
1. Navigate to `http://localhost:3000/register.html`.
2. Register a new student:
   - **Name**: `Alice Walker`
   - **Email**: `alice@student.college.edu`
   - **Roll Number**: `CS-2024-001`
   - **Password**: `Student@123`
3. Notice automatic redirection to `student.html`.

---

### Step 4: Submit Certificate Requests (Sequential IDs)
1. On the Student Portal (`student.html`):
   - **Request Type**: Select `Bonafide Certificate`.
   - **Reason & Details**: `Need bonafide certificate for state scholarship application.`
   - Click **Submit Request**.
2. Notice the tracking ID assigned: **`REQ-0001`** with initial status **`Submitted`** (Blue badge).
3. Submit a second request:
   - **Request Type**: Select `Transcript`.
   - **Reason & Details**: `Official transcript required for foreign university admissions.`
   - Click **Submit Request**.
4. Notice the sequential tracking ID: **`REQ-0002`**.

---

### Step 5: Staff Review, Search, and Status Progression
1. Click **Sign Out** in the student portal navbar.
2. Sign in as Staff:
   - **Email**: `staff@college.edu`
   - **Password**: `Staff@123`
3. You will be redirected to `staff.html`.
4. Test Search & Filter:
   - Search `REQ-0001` &rarr; table filters immediately to Alice's request.
   - Filter by status `Submitted` &rarr; displays only new submissions.
5. Click **Update Status** on `REQ-0001`:
   - Notice the dropdown strictly enforces the workflow: only `Advance to: In Progress` is permitted.
   - Add Remarks: `Application received. Verification in progress.`
   - Click **Update Request**.
   - Current status updates to **`In Progress`** (Amber badge).
6. Click **Update Status** again on `REQ-0001`:
   - Allowed choices: `Approved` or `Rejected`.
   - Select `Approved`. Remarks: `Documents verified. Ready for print.`
   - Status updates to **`Approved`** (Green badge).
7. Advance to the final collection stage:
   - Click **Update Status**. Allowed choice: `Ready for Collection`.
   - Add Remarks: `Ready for pickup at Counter 2 (9 AM - 1 PM).`
   - Status updates to **`Ready for Collection`** (Purple badge - Terminal).
8. Attempting further status changes on terminal status is disabled in UI and rejected by backend with `400 Bad Request`.

---

### Step 6: Verify Student Real-Time View
1. Sign out of the Staff Portal and log back in as `alice@student.college.edu`.
2. Observe `REQ-0001`:
   - Status shows **`Ready for Collection`** (Purple badge).
   - Staff remarks displayed: `"Ready for pickup at Counter 2 (9 AM - 1 PM)."`.

---

### Step 7: Verify Database Persistence Across Container Restarts
Test data persistence using named Docker volumes:
```bash
# 1. Stop and remove containers
docker compose down

# 2. Start the stack back up
docker compose up -d

# 3. Log in as Alice or Staff at http://localhost:3000
```
All accounts, sequential request records (`REQ-0001`, `REQ-0002`), statuses, and remarks persist intact from the named volume `college_tracker_mongo_data`.

---

## CI/CD Pipeline

The project includes an automated GitHub Actions workflow defined in [`.github/workflows/docker.yml`](.github/workflows/docker.yml).
- **Trigger**: Runs on every `push` and `pull_request` targeting the `main` branch.
- **Workflow**:
  1. Checks out the repository code.
  2. Sets up Docker Buildx.
  3. Builds the production Docker image to ensure zero container build regressions.

---

## Git Branching & Commit Conventions

Development was executed following a structured Git feature-branch workflow:

1. **`main`**: Initialized base architecture and health check endpoint.
2. **`feature/auth`**: User model, bcrypt hashing, JWT middleware, student registration, staff seed script.
3. **`feature/requests-api`**: Request model, Counter collection for `REQ-XXXX` sequential IDs, role-based endpoint controllers, status state machine validation.
4. **`feature/frontend`**: Vanilla HTML/CSS/JS interfaces for Student Portal, Staff Dashboard, and authentication forms.
5. **`feature/docker`**: Production Dockerfile (node:20-alpine, non-root, health check), docker-compose.yml, GitHub Actions CI workflow.
6. **`README`**: Comprehensive architecture documentation, API specification, and interactive demo script.
