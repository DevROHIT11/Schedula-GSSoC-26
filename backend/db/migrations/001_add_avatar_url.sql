-- Adds avatar_url to users. Idempotent: safe to re-run.
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
);
SET @stmt := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER longitude',
  'SELECT ''avatar_url already exists'' AS info');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;
