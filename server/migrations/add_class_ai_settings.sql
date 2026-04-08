-- 添加 classes.ai_settings 字段
ALTER TABLE classes ADD COLUMN IF NOT EXISTS ai_settings JSONB;
