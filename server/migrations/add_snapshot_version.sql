-- Add version column to live_room_snapshots for optimistic concurrency control
ALTER TABLE live_room_snapshots ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;
