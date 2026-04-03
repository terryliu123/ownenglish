# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OwnEnglish is a teaching assistance platform for live English teachers (直播英语老师的教学辅助平台). It has two main components:

- **Client** (`client/`): React + TypeScript frontend running on port 5173
- **Server** (`server/`): FastAPI Python backend running on port 8000

## Development Commands

### Client
```bash
cd client
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build       # Production build
npm run lint         # Run ESLint
```

### Server
```bash
cd server
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt              # Install dependencies
uvicorn app.main:app --reload --port 8000    # Start dev server
pytest                                       # Run tests
```

## Architecture

### Client (`client/src/`)
- **React 18** with TypeScript and Vite build tool
- **Tailwind CSS** for styling (configured in `postcss.config.js`)
- **Zustand** (`stores/app-store.tsx`) for client-side state
- **TanStack Query** for server state management (5-min stale time)
- **React Router v7** for routing
- Vite proxies `/api` requests to `http://localhost:8000` and `/ws` to WebSocket server

### Server (`server/app/`)
- **FastAPI** with async SQLAlchemy 2.0 ORM
- **Pydantic v2** for data validation
- **JWT authentication** with access tokens (15min) and refresh tokens (7 days)
- Database: SQLite by default, PostgreSQL when `DATABASE_URL` is set to `postgresql+asyncpg://...`
- API versioned at `/api/v1`: `auth`, `classes`, `study_packs`, `live`

### API Endpoints (v1)
- `POST /api/v1/auth/register` - Register user (teacher/student role)
- `POST /api/v1/auth/login` - Login, returns access + refresh tokens
- `GET /api/v1/auth/me` - Current user info
- `GET/POST /api/v1/classes` - List/create classes
- `POST /api/v1/classes/join` - Join class with invite code
- `GET/POST /api/v1/study-packs` - List/create study packs
- `PATCH /api/v1/study-packs/{id}` - Update study pack
- `POST /api/v1/study-packs/{id}/publish` - Publish study pack
- `POST /api/v1/study-packs/submissions` - Submit answers
- `POST /api/v1/audio/upload` - Upload audio recording (students)
- `GET /api/v1/audio/{filename}` - Get audio file

### Reports & Analytics
- `GET /api/v1/reports/student/summary` - Student's learning summary
- `GET /api/v1/reports/student/weak-points` - Student's weak points analysis
- `GET /api/v1/reports/teacher/class/{id}/summary` - Class summary for teacher
- `GET /api/v1/reports/teacher/class/{id}/students` - Student progress list
- `GET /api/v1/reports/teacher/live-session/{id}/results` - Live session results

### Free Practice (免费区)
- `GET /api/v1/free-practice/categories` - List practice categories
- `GET /api/v1/free-practice/categories/{id}` - Get category with exercises
- `POST /api/v1/free-practice/submit` - Submit answer
- Categories: Greetings, Introductions, Numbers, Polite Expressions, Directions, Shopping

### Real-time Classroom (WebSocket)
- **Endpoint**: `WS /api/v1/live/ws?token=<jwt>&class_id=<id>`
- **Teacher**: Create/publish tasks, view real-time submissions, end sessions
- **Student**: Join classroom, receive tasks, submit answers, view results
- **Task types**: `single_choice`, `true_false`, `matching`, `fill_blank`
- **Connection managed by**: `server/app/core/websocket.py` - `ConnectionManager` class
- **Client hook**: `client/src/services/websocket.ts` - `useLiveWebSocket` React hook

### User Roles
- **Teacher**: Creates classes, study packs, views analytics
- **Student**: Joins classes, completes study pack submissions

## Key Files
- `client/src/App.tsx` - Main routing configuration
- `client/src/services/api.ts` - Axios client with auth interceptors
- `client/src/services/websocket.ts` - WebSocket client hook for live classroom
- `client/src/hooks/useAudioRecorder.ts` - Browser audio recording hook
- `server/app/main.py` - FastAPI app entry point
- `server/app/core/config.py` - Settings (uses pydantic-settings)
- `server/app/core/websocket.py` - WebSocket connection manager
- `server/app/api/v1/auth.py` - Auth endpoints and JWT dependency
- `server/app/api/v1/live.py` - Real-time classroom WebSocket endpoints
- `server/app/api/v1/study_packs.py` - Study pack CRUD and submissions
- `server/app/api/v1/audio.py` - Audio upload/download endpoints
- `server/app/api/v1/reports.py` - Analytics and reports endpoints
- `server/app/api/v1/free_practice.py` - Free practice content (A1-A2 level)
- `server/app/models/__init__.py` - SQLAlchemy models (User, Class, StudyPack, LiveSession, etc.)

## Features

### Speaking Practice (口语练习)
- Browser MediaRecorder API for audio recording (WebM/MP4)
- Max recording duration: 60 seconds
- Audio upload to server with JWT auth
- Uploaded files stored in `server/uploads/audio/`
- API endpoint: `POST /api/v1/audio/upload`

### Reports & Analytics (学习报告)
- **Student**: Learning summary, weak points analysis, recommendations
- **Teacher**: Class summary, student progress tracking, live session results
- Completion rates, submission counts, accuracy by module type
- Student rankings by activity level
