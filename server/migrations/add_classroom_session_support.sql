-- Migration: Add classroom session support
-- Date: 2026-04-06
-- Description: Extend LiveSession model and add LiveSessionEvent table

-- 1. Extend live_sessions table
ALTER TABLE live_sessions
ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(36) REFERENCES teacher_profiles(user_id),
ADD COLUMN IF NOT EXISTS title VARCHAR(200),
ADD COLUMN IF NOT EXISTS entry_mode VARCHAR(50),
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS summary_json JSON,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status column to support 'cancelled' (existing values remain valid)
COMMENT ON COLUMN live_sessions.status IS 'active, ended, cancelled';

-- 2. Create live_session_events table
CREATE TABLE IF NOT EXISTS live_session_events (
    id VARCHAR(36) PRIMARY KEY,
    live_session_id VARCHAR(36) NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload_json JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_session_events_session_id ON live_session_events(live_session_id);
CREATE INDEX IF NOT EXISTS idx_live_session_events_created_at ON live_session_events(created_at);

-- 3. Add live_session_id to live_challenge_sessions
ALTER TABLE live_challenge_sessions
ADD COLUMN IF NOT EXISTS live_session_id VARCHAR(36) REFERENCES live_sessions(id);

CREATE INDEX IF NOT EXISTS idx_live_challenge_sessions_live_session_id ON live_challenge_sessions(live_session_id);

-- 4. Add live_session_id to bigscreen_activity_sessions
ALTER TABLE bigscreen_activity_sessions
ADD COLUMN IF NOT EXISTS live_session_id VARCHAR(36) REFERENCES live_sessions(id);

CREATE INDEX IF NOT EXISTS idx_bigscreen_activity_sessions_live_session_id ON bigscreen_activity_sessions(live_session_id);

-- 5. Add live_session_id to teaching_aid_sessions
ALTER TABLE teaching_aid_sessions
ADD COLUMN IF NOT EXISTS live_session_id VARCHAR(36) REFERENCES live_sessions(id);

CREATE INDEX IF NOT EXISTS idx_teaching_aid_sessions_live_session_id ON teaching_aid_sessions(live_session_id);

-- Verify changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'live_sessions'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'live_session_events'
ORDER BY ordinal_position;
