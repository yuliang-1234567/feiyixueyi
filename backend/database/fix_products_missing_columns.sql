-- Safe migration for missing columns in products table.
-- Works on MySQL versions without ADD COLUMN IF NOT EXISTS.

SET @db_name = DATABASE();

-- material
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'products' AND COLUMN_NAME = 'material';
SET @sql_stmt = IF(
	@col_exists = 0,
	'ALTER TABLE products ADD COLUMN material VARCHAR(200) NULL COMMENT ''material''',
	'SELECT ''skip material (already exists)'' AS msg'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- size
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'products' AND COLUMN_NAME = 'size';
SET @sql_stmt = IF(
	@col_exists = 0,
	'ALTER TABLE products ADD COLUMN size VARCHAR(200) NULL COMMENT ''size''',
	'SELECT ''skip size (already exists)'' AS msg'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- origin
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'products' AND COLUMN_NAME = 'origin';
SET @sql_stmt = IF(
	@col_exists = 0,
	'ALTER TABLE products ADD COLUMN origin VARCHAR(200) NULL COMMENT ''origin''',
	'SELECT ''skip origin (already exists)'' AS msg'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- craftsmanship
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'products' AND COLUMN_NAME = 'craftsmanship';
SET @sql_stmt = IF(
	@col_exists = 0,
	'ALTER TABLE products ADD COLUMN craftsmanship TEXT NULL COMMENT ''craftsmanship''',
	'SELECT ''skip craftsmanship (already exists)'' AS msg'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- culturalMeaning
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'products' AND COLUMN_NAME = 'culturalMeaning';
SET @sql_stmt = IF(
	@col_exists = 0,
	'ALTER TABLE products ADD COLUMN culturalMeaning TEXT NULL COMMENT ''culturalMeaning''',
	'SELECT ''skip culturalMeaning (already exists)'' AS msg'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify final structure
SHOW COLUMNS FROM products;
