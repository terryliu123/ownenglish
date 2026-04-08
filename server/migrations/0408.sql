 ALTER TABLE teaching_aids ADD COLUMN teacher_id VARCHAR(36);
 ALTER TABLE teaching_aids ADD COLUMN share_code VARCHAR(16);
 ALTER TABLE teaching_aids ADD COLUMN is_public BOOLEAN DEFAULT FALSE;