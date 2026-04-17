-- 商品管理后台扩展字段（违规下架与复审）
-- 执行前建议备份数据库

SET @db_name = DATABASE();

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'violationStatus'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN violationStatus ENUM('normal', 'suspected', 'confirmed') NOT NULL DEFAULT 'normal' COMMENT '违规状态'"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'reviewStatus'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN reviewStatus ENUM('pending', 'approved', 'rejected', 'reopened') NOT NULL DEFAULT 'pending' COMMENT '复审状态'"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'reviewReason'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN reviewReason TEXT NULL COMMENT '复审备注'"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'offlineReason'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN offlineReason TEXT NULL COMMENT '违规下架原因'"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'reviewedBy'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN reviewedBy INT NULL COMMENT '审核管理员ID'"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'reviewedAt'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN reviewedAt DATETIME NULL COMMENT '审核时间'"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'rejectCount'
    ),
    'SELECT 1',
    "ALTER TABLE products ADD COLUMN rejectCount INT NOT NULL DEFAULT 0 COMMENT '被驳回次数'"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
