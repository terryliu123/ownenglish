-- 将 activity_logs.type 从 enum 改为 varchar，支持新增的日志类型
-- 在 PostgreSQL 中执行此脚本

ALTER TABLE activity_logs
  ALTER COLUMN type TYPE VARCHAR(50)
  USING type::text;

-- 删除不再需要的 enum 类型（可选，如果确认无其他表使用）
-- DROP TYPE IF EXISTS activitytype;
