-- P0-1: Runtime state snapshot persistence
CREATE TABLE IF NOT EXISTS live_room_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    class_id VARCHAR(36) NOT NULL UNIQUE REFERENCES classes(id),
    teacher_id VARCHAR(36) NOT NULL REFERENCES users(id),
    live_session_id VARCHAR(36) REFERENCES live_sessions(id),
    room_state JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_live_room_snapshots_class_id ON live_room_snapshots(class_id);
