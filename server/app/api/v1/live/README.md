# Live Classroom API Module

This module provides endpoints for real-time classroom management.

## Structure

```
live/
├── __init__.py          # Main router aggregation and WebSocket endpoint
├── schemas.py           # Pydantic models for request/response validation
├── utils.py             # Utility functions (log_activity, _answers_match, etc.)
├── ai_import.py         # AI-powered task import and generation functions
├── task_groups.py       # Task groups CRUD and management endpoints
├── sessions.py          # Live session and room state endpoints
├── challenges.py        # Challenge/competition mode endpoints
├── submissions.py       # Student submissions management endpoints
└── websocket_handlers.py # WebSocket connection handlers
```

## API Endpoints

### Task Groups
- `GET /live/task-groups` - List task groups for a class
- `POST /live/task-groups` - Create a new task group
- `GET /live/task-groups/{group_id}` - Get task group details
- `PUT /live/task-groups/{group_id}` - Update task group
- `DELETE /live/task-groups/{group_id}` - Delete task group

### Tasks
- `POST /live/task-groups/{group_id}/tasks` - Add task to group
- `PUT /live/task-groups/{group_id}/tasks/{task_id}` - Update task
- `DELETE /live/task-groups/{group_id}/tasks/{task_id}` - Delete task
- `POST /live/task-groups/{group_id}/tasks/reorder` - Reorder tasks

### AI Import
- `POST /live/task-groups/ai-import` - Import tasks from text
- `POST /live/task-groups/ai-import-docx` - Import tasks from .docx file
- `POST /live/task-groups/ai-generate` - Generate tasks with AI

### Task Group Sharing
- `POST /live/task-groups/{group_id}/share` - Share task group
- `GET /live/task-groups/share/{share_token}` - Get shared task group
- `POST /live/task-groups/import-shared` - Import shared task group
- `GET /live/task-groups/{group_id}/shares` - List shares
- `DELETE /live/task-groups/shares/{share_id}` - Delete share

### Live Sessions
- `GET /live/classes/{class_id}/presence` - Get class presence info
- `GET /live/room-state` - Get full room state

### Challenges
- `GET /live/challenges` - List challenges
- `POST /live/challenges` - Create challenge
- `GET /live/challenges/{challenge_id}` - Get challenge details
- `DELETE /live/challenges/{challenge_id}` - Delete challenge

### Submissions
- `GET /live/task-groups/{group_id}/submissions` - Get all submissions (teacher)
- `GET /live/task-groups/{group_id}/my-submissions` - Get my submissions (student)

### WebSocket
- `WS /live/ws` - Real-time classroom WebSocket endpoint

## Backward Compatibility

The original `live.py` file has been kept as a thin wrapper that re-exports from this package.
All existing imports will continue to work:

```python
from app.api.v1.live import router  # Works as before
from app.api.v1.live import LiveTaskCreate  # Works as before
```
