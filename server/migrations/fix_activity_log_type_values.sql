-- 修复 activity_logs 中 type 字段存了 enum 字符串表示的数据
-- 例如 "ActivityType.CREATE_TASK_GROUP" -> "create_task_group"

UPDATE activity_logs
SET type = REPLACE(type, 'ActivityType.', '')
WHERE type LIKE 'ActivityType.%';
