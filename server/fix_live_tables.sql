-- 为 live_sessions 表添加 group_id 字段
ALTER TABLE live_sessions
ADD COLUMN IF NOT EXISTS group_id VARCHAR(36) REFERENCES live_task_groups(id);

-- 为 live_tasks 表添加 session_id 字段（如果不存在）
ALTER TABLE live_tasks
ADD COLUMN IF NOT EXISTS session_id VARCHAR(36) REFERENCES live_sessions(id);

-- 查看表结构确认
\d live_sessions;
\d live_tasks;
