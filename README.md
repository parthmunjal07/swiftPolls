# PulseBoard — Live Polling Platform

> Real-time audience engagement through live polls, interactive sessions, and async surveys — all in one platform.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker](#running-with-docker)
  - [Running the Backend](#running-the-backend)
  - [Running the Frontend](#running-the-frontend)
- [Pages & Routes](#pages--routes)
- [WebSocket Events](#websocket-events)

---

## Overview

**PulseBoard** is a full-stack, real-time live polling application that lets presenters create and host interactive poll sessions for their audience. Presenters control the flow of questions live, while the audience joins via a shareable room code and votes in real-time — seeing results update instantly on screen.

Beyond live sessions, PulseBoard also supports **async polls** — shareable public survey links that can be filled out at any time without joining a live session. Analytics are tracked per poll and per session, giving hosts rich insight into audience responses.

---

## Features

### For Presenters (Hosts)
-  **Dashboard** — Manage all created polls, view status, launch sessions, and share links
-  **Poll Builder** — Create multi-question polls with multiple choice options, time limits, and result visibility controls
-  **Poll Editor** — Edit existing polls (title, description, questions, options)
-  **Presenter View** — Full-screen live session controller to navigate questions, reveal results, and end the session
-  **Analytics Page** — Per-poll breakdown of responses, option counts, and session history with charts (Recharts)

### For Audience Members
-  **Join via Room Code** — Enter a 6–8 character room code to join a live session instantly (no account needed)
-  **Async Public Polls** — Respond to polls via a public shareable link at any time
-  **Thank You Page** — Confirmation screen after poll submission

### Platform
-  **Authentication** — Email/password and **Google OAuth 2.0** sign-in
-  **Real-time WebSockets** — Live vote synchronization via Socket.IO
-  **Background Jobs** — BullMQ workers for async analytics aggregation and automated poll expiry
-  **Redis** — Caching, BullMQ job queues, and rate-limiting
-  **Security** — JWT access/refresh tokens, Helmet headers, CORS policy, and express-rate-limit
-  **Dark / Light Mode** — Full theme switching support
-  **Responsive Design** — Works seamlessly across desktop and mobile

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| React Router v7 | Client-side routing |
| TanStack Query v5 | Server state & data fetching |
| Socket.IO Client | Real-time WebSocket connection |
| Recharts | Poll analytics charts |
| React Hook Form + Zod | Form management & validation |
| Tailwind CSS v4 | Utility-first styling |
| Lucide React | Icon library |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | HTTP server & REST API |
| TypeScript | Type safety |
| Socket.IO | WebSocket server for live events |
| Drizzle ORM | Type-safe PostgreSQL ORM |
| PostgreSQL | Primary relational database |
| Redis (ioredis) | Caching, queues, and rate limiting |
| BullMQ | Background job queue (analytics, expiry) |
| Passport.js | Google OAuth 2.0 authentication |
| JSON Web Tokens | Access & refresh token auth |
| bcrypt | Password hashing |
| Nodemailer | Email notifications |
| Zod | Request body validation |
| Helmet | HTTP security headers |
| express-rate-limit | API rate limiting |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│          React + Vite  ·  TanStack Query  ·  Socket.IO      │
└────────────────────────────┬────────────────────────────────┘
                             │  HTTP (REST) + WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Node.js)                        │
│   Express REST API   ·   Socket.IO Server   ·   BullMQ      │
└───────────┬──────────────────────────────┬──────────────────┘
            │                              │
            ▼                              ▼
┌───────────────────┐          ┌────────────────────┐
│    PostgreSQL      │          │       Redis         │
│  (Primary Store)   │          │ (Cache · Queues ·   │
│                   │          │  Rate Limiting)      │
└───────────────────┘          └────────────────────┘
```

**Data Flow for Live Sessions:**
1. Host starts a session → backend creates a session row and emits `session:started`
2. Audience joins via room code → socket joins the session room
3. Host advances to next question → `question:change` event broadcast to all participants
4. Audience submits a vote → REST POST to `/api/responses`, analytics updated via BullMQ job, real-time `vote:update` emitted to presenter
5. Host reveals results → `results:visible` event broadcast to audience

---

## Project Structure

```
pulseboard-live-polling/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Entry point (Express + Socket.IO setup)
│   │   ├── controllers/           # Route handler logic
│   │   │   ├── auth.controller.ts
│   │   │   ├── polls.controller.ts
│   │   │   ├── response.controller.ts
│   │   │   ├── session.controller.ts
│   │   │   └── analytics.controller.ts
│   │   ├── routes/                # Express routers
│   │   │   ├── auth.routes.ts
│   │   │   ├── poll.routes.ts
│   │   │   ├── response.routes.ts
│   │   │   ├── session.routes.ts
│   │   │   └── analytics.routes.ts
│   │   ├── db/
│   │   │   ├── index.ts           # Drizzle DB connection
│   │   │   └── schema.ts          # Full database schema
│   │   ├── sockets/
│   │   │   ├── index.ts           # Socket event registration
│   │   │   └── io.ts              # Shared Socket.IO instance
│   │   ├── jobs/
│   │   │   ├── queues.ts          # BullMQ queue definitions & repeatable jobs
│   │   │   └── workers.ts         # Background job processors
│   │   ├── middlewares/
│   │   │   └── auth.middleware.ts # JWT auth middleware
│   │   ├── validations/           # Zod schemas for request validation
│   │   └── utils/                 # Shared utility helpers
│   ├── drizzle/                   # Drizzle migration files
│   ├── drizzle.config.js
│   ├── docker-compose.yml         # PostgreSQL + Redis containers
│   ├── tsconfig.json
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.tsx               # React entry point
    │   ├── App.tsx                # Router + provider composition
    │   ├── index.css              # Global styles & Tailwind base
    │   ├── pages/
    │   │   ├── LandingPage.tsx    # Home / join poll entry
    │   │   ├── LoginPage.tsx
    │   │   ├── SignupPage.tsx
    │   │   ├── AuthSuccessPage.tsx  # Google OAuth callback handler
    │   │   ├── DashboardPage.tsx    # Host poll management
    │   │   ├── PollBuilderPage.tsx  # Create new poll
    │   │   ├── EditPollPage.tsx     # Edit existing poll
    │   │   ├── PollAnalyticsPage.tsx
    │   │   ├── PresenterPage.tsx    # Live session host view
    │   │   ├── AudiencePage.tsx     # Live session audience view
    │   │   ├── AsyncPollPage.tsx    # Public async poll
    │   │   └── ThankYouPage.tsx
    │   ├── components/            # Reusable UI components
    │   ├── context/
    │   │   ├── AuthContext.tsx     # Auth state & JWT management
    │   │   ├── SocketContext.tsx   # Socket.IO connection context
    │   │   └── ThemeContext.tsx    # Dark/light mode context
    │   ├── hooks/                 # Custom React hooks
    │   ├── api/                   # Axios API call functions
    │   ├── types/                 # Shared TypeScript interfaces
    │   └── lib/                   # Utility functions
    ├── index.html
    ├── vite.config.ts
    └── package.json
```

---

## Database Schema

The PostgreSQL schema is managed by **Drizzle ORM** and consists of the following tables:

| Table | Description |
|---|---|
| `users` | Registered users (email/password or Google OAuth) |
| `polls` | Poll definitions with `live` or `async` mode, expiry, and slug |
| `questions` | Questions belonging to a poll, ordered by `display_order` |
| `options` | Answer choices for each question |
| `question_settings` | Per-question config: time limits, live result visibility |
| `sessions` | Live session instances (room code, status, current question) |
| `session_participants` | Audience members who joined a session |
| `responses` | Submitted response records (tied to poll + optional session) |
| `response_ans` | Individual answer selections per response |
| `analytics` | Aggregated option vote counts per poll/session |

**Poll Modes:**
- `live` — Controlled by a host in real-time; audience joins via room code
- `async` — Public shareable link; respondents fill at their own pace

**Session Statuses:** `waiting` → `active` → `ended`

---

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Health check |
| `POST` | `/api/auth/register` | — | Email/password registration |
| `POST` | `/api/auth/login` | — | Email/password login |
| `POST` | `/api/auth/logout` | — | Clear auth cookies |
| `POST` | `/api/auth/refresh` | — | Refresh access token |
| `GET` | `/api/auth/google` | — | Initiate Google OAuth |
| `GET` | `/api/auth/google/callback` | — | Google OAuth callback |
| `GET` | `/api/polls` | ✅ | List all polls for current user |
| `POST` | `/api/polls` | ✅ | Create a new poll |
| `GET` | `/api/polls/:id` | ✅ | Get poll details |
| `PUT` | `/api/polls/:id` | ✅ | Update a poll |
| `DELETE` | `/api/polls/:id` | ✅ | Delete a poll |
| `GET` | `/api/polls/slug/:slug` | — | Get public async poll by slug |
| `POST` | `/api/responses` | — | Submit a poll response |
| `GET` | `/api/sessions` | ✅ | List sessions for a poll |
| `POST` | `/api/sessions` | ✅ | Start a new live session |
| `PATCH` | `/api/sessions/:id` | ✅ | Update session state |
| `GET` | `/api/analytics/:pollId` | ✅ | Get poll analytics |

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **Docker** (for PostgreSQL and Redis)

---

### Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# URLs
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database
DATABASE_URL=postgres://polls:polls@localhost:5432/postgres

# Redis (optional, defaults to localhost:6379)
REDIS_URL=redis://localhost:6379
```

---

### Running with Docker

Start PostgreSQL and Redis using the provided Docker Compose file:

```bash
cd backend
docker compose up -d
```

This spins up:
- **PostgreSQL** on port `5432` (user: `polls`, password: `polls`, db: `postgres`)
- **Redis** on port `6379`

---

### Running the Backend

```bash
cd backend

# Install dependencies
npm install

# Generate and apply database migrations
npm run db:generate
npm run db:migrate

# Start dev server (TypeScript watch mode)
npm run dev
```

The backend will be available at `http://localhost:8079`.

---

### Running the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/` | Landing Page (home + join poll) | Public |
| `/login` | Login | Public |
| `/signup` | Signup | Public |
| `/auth-success` | Google OAuth callback handler | Public |
| `/dashboard` | Host Dashboard | 🔐 Private |
| `/polls/create` | Poll Builder | 🔐 Private |
| `/polls/:id/edit` | Edit Poll | 🔐 Private |
| `/polls/:id` | Poll Analytics | 🔐 Private |
| `/present/:sessionId` | Presenter View (live session) | 🔐 Private |
| `/join/:code` | Audience View (live session) | Public |
| `/join` | Join via code input | Public |
| `/poll/:slug` | Async Public Poll | Public |

---

## WebSocket Events

PulseBoard uses Socket.IO for real-time communication during live sessions.

| Event | Direction | Description |
|---|---|---|
| `session:join` | Client → Server | Audience joins a session room |
| `session:started` | Server → Client | Host started the session |
| `session:ended` | Server → Client | Session concluded |
| `question:change` | Server → Client | Host advanced to a new question |
| `vote:submit` | Client → Server | Audience submits a vote |
| `vote:update` | Server → Client | Live vote count update for presenter |
| `results:visible` | Server → Client | Host revealed results to audience |
| `participant:joined` | Server → Client | New participant joined notification |

---

## License

This project is for personal and educational use.
