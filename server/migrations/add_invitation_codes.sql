-- Invitation codes table
CREATE TABLE IF NOT EXISTS invitation_codes (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    used_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add invitation_code_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_code_id VARCHAR(36);

-- Create index on invitation_codes.code
CREATE INDEX IF NOT EXISTS ix_invitation_codes_code ON invitation_codes (code);
