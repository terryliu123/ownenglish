-- Danmu records table for bullet comments feature
CREATE TABLE IF NOT EXISTS danmu_records (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    content VARCHAR(200) NOT NULL,
    is_preset BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_danmu_session ON danmu_records(session_id);
CREATE INDEX IF NOT EXISTS idx_danmu_created ON danmu_records(created_at);

ALTER TABLE live_sessions ADD COLUMN danmu_config JSON;
