-- All-in-one safe upgrade SQL for ihc database
-- Merged from: safe_migration.sql, migration_add_comments_likes.sql,
-- migration_add_product_fields.sql, fix_products_missing_columns.sql
-- Purpose: apply non-destructive schema upgrades and missing columns.

USE `ihc`;

SET @db_name = DATABASE();

-- ---------- artworks columns ----------
SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='artworks' AND COLUMN_NAME='likesCount') = 0,
  'ALTER TABLE `artworks` ADD COLUMN `likesCount` INT DEFAULT 0 AFTER `views`',
  'SELECT ''skip artworks.likesCount'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='artworks' AND COLUMN_NAME='commentsCount') = 0,
  'ALTER TABLE `artworks` ADD COLUMN `commentsCount` INT DEFAULT 0 AFTER `likesCount`',
  'SELECT ''skip artworks.commentsCount'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='artworks' AND COLUMN_NAME='status') = 0,
  'ALTER TABLE `artworks` ADD COLUMN `status` ENUM(''draft'', ''published'', ''hidden'') DEFAULT ''published'' AFTER `views`',
  'SELECT ''skip artworks.status'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='artworks' AND COLUMN_NAME='deletedAt') = 0,
  'ALTER TABLE `artworks` ADD COLUMN `deletedAt` DATETIME DEFAULT NULL AFTER `updatedAt`',
  'SELECT ''skip artworks.deletedAt'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- artworks indexes
SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='artworks' AND INDEX_NAME='idx_status') = 0,
  'ALTER TABLE `artworks` ADD INDEX `idx_status` (`status`)',
  'SELECT ''skip idx_status on artworks'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='artworks' AND INDEX_NAME='idx_deleted') = 0,
  'ALTER TABLE `artworks` ADD INDEX `idx_deleted` (`deletedAt`)',
  'SELECT ''skip idx_deleted on artworks'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- products columns ----------
SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='views') = 0,
  'ALTER TABLE `products` ADD COLUMN `views` INT DEFAULT 0 AFTER `sales`',
  'SELECT ''skip products.views'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='likesCount') = 0,
  'ALTER TABLE `products` ADD COLUMN `likesCount` INT DEFAULT 0 AFTER `views`',
  'SELECT ''skip products.likesCount'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='commentsCount') = 0,
  'ALTER TABLE `products` ADD COLUMN `commentsCount` INT DEFAULT 0 AFTER `likesCount`',
  'SELECT ''skip products.commentsCount'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='rating') = 0,
  'ALTER TABLE `products` ADD COLUMN `rating` DECIMAL(3,2) DEFAULT 0 AFTER `commentsCount`',
  'SELECT ''skip products.rating'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='deletedAt') = 0,
  'ALTER TABLE `products` ADD COLUMN `deletedAt` DATETIME DEFAULT NULL AFTER `updatedAt`',
  'SELECT ''skip products.deletedAt'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Missing product detail fields
SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='material') = 0,
  'ALTER TABLE `products` ADD COLUMN `material` VARCHAR(200) NULL COMMENT ''材质''',
  'SELECT ''skip products.material'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='size') = 0,
  'ALTER TABLE `products` ADD COLUMN `size` VARCHAR(200) NULL COMMENT ''尺寸''',
  'SELECT ''skip products.size'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='origin') = 0,
  'ALTER TABLE `products` ADD COLUMN `origin` VARCHAR(200) NULL COMMENT ''产地''',
  'SELECT ''skip products.origin'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='craftsmanship') = 0,
  'ALTER TABLE `products` ADD COLUMN `craftsmanship` TEXT NULL COMMENT ''工艺传承描述''',
  'SELECT ''skip products.craftsmanship'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='culturalMeaning') = 0,
  'ALTER TABLE `products` ADD COLUMN `culturalMeaning` TEXT NULL COMMENT ''文化寓意描述''',
  'SELECT ''skip products.culturalMeaning'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- products indexes
SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND INDEX_NAME='idx_deleted') = 0,
  'ALTER TABLE `products` ADD INDEX `idx_deleted` (`deletedAt`)',
  'SELECT ''skip idx_deleted on products'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- supporting tables ----------
CREATE TABLE IF NOT EXISTS `comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `targetType` ENUM('artwork', 'product') NOT NULL,
  `targetId` INT NOT NULL,
  `content` TEXT NOT NULL,
  `parentId` INT DEFAULT NULL,
  `rating` INT DEFAULT NULL,
  `status` ENUM('active', 'deleted', 'hidden') DEFAULT 'active',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parentId`) REFERENCES `comments`(`id`) ON DELETE CASCADE,
  INDEX `idx_target` (`targetType`, `targetId`),
  INDEX `idx_user` (`userId`),
  INDEX `idx_parent` (`parentId`),
  INDEX `idx_created` (`createdAt`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_likes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `productId` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `idx_user_product` (`userId`, `productId`),
  INDEX `idx_product` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `views` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT DEFAULT NULL,
  `targetType` ENUM('artwork', 'product') NOT NULL,
  `targetId` INT NOT NULL,
  `ipAddress` VARCHAR(45) DEFAULT NULL,
  `userAgent` VARCHAR(500) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_target` (`targetType`, `targetId`),
  INDEX `idx_user` (`userId`),
  INDEX `idx_created` (`createdAt`),
  INDEX `idx_ip` (`ipAddress`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- data backfill ----------
UPDATE `artworks` a
SET `likesCount` = (
  SELECT COUNT(*) FROM `artwork_likes` al WHERE al.`artworkId` = a.`id`
)
WHERE EXISTS (SELECT 1 FROM `artwork_likes` al WHERE al.`artworkId` = a.`id`);

UPDATE `products` p
SET `likesCount` = (
  SELECT COUNT(*) FROM `product_likes` pl WHERE pl.`productId` = p.`id`
)
WHERE EXISTS (SELECT 1 FROM `product_likes` pl WHERE pl.`productId` = p.`id`);

UPDATE `products` p
SET `rating` = (
  SELECT AVG(`rating`) FROM `product_ratings` pr WHERE pr.`productId` = p.`id`
)
WHERE EXISTS (SELECT 1 FROM `product_ratings` pr WHERE pr.`productId` = p.`id`);

-- ---------- verify ----------
SHOW COLUMNS FROM `products`;
SHOW COLUMNS FROM `artworks`;
SELECT 'all_in_one_safe_upgrade done' AS result;
