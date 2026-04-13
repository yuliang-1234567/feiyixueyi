-- 安全迁移脚本 - 使用 IF NOT EXISTS 逻辑
-- 执行方式：mysql -u root -p123456 ihc < safe_migration.sql

USE `ihc`;

-- 添加 artworks 表字段（如果不存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'artworks' AND COLUMN_NAME = 'likesCount') = 0,
    'ALTER TABLE `artworks` ADD COLUMN `likesCount` INT DEFAULT 0 AFTER `views`;',
    'SELECT "Column likesCount already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'artworks' AND COLUMN_NAME = 'commentsCount') = 0,
    'ALTER TABLE `artworks` ADD COLUMN `commentsCount` INT DEFAULT 0 AFTER `likesCount`;',
    'SELECT "Column commentsCount already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'artworks' AND COLUMN_NAME = 'status') = 0,
    'ALTER TABLE `artworks` ADD COLUMN `status` ENUM(\'draft\', \'published\', \'hidden\') DEFAULT \'published\' AFTER `views`;',
    'SELECT "Column status already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'artworks' AND COLUMN_NAME = 'deletedAt') = 0,
    'ALTER TABLE `artworks` ADD COLUMN `deletedAt` DATETIME DEFAULT NULL AFTER `updatedAt`;',
    'SELECT "Column deletedAt already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 artworks 表索引（如果不存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'artworks' AND INDEX_NAME = 'idx_status') = 0,
    'ALTER TABLE `artworks` ADD INDEX `idx_status` (`status`);',
    'SELECT "Index idx_status already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'artworks' AND INDEX_NAME = 'idx_deleted') = 0,
    'ALTER TABLE `artworks` ADD INDEX `idx_deleted` (`deletedAt`);',
    'SELECT "Index idx_deleted already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 products 表字段（如果不存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'views') = 0,
    'ALTER TABLE `products` ADD COLUMN `views` INT DEFAULT 0 AFTER `sales`;',
    'SELECT "Column views already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'likesCount') = 0,
    'ALTER TABLE `products` ADD COLUMN `likesCount` INT DEFAULT 0 AFTER `views`;',
    'SELECT "Column likesCount already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'commentsCount') = 0,
    'ALTER TABLE `products` ADD COLUMN `commentsCount` INT DEFAULT 0 AFTER `likesCount`;',
    'SELECT "Column commentsCount already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'rating') = 0,
    'ALTER TABLE `products` ADD COLUMN `rating` DECIMAL(3, 2) DEFAULT 0 AFTER `commentsCount`;',
    'SELECT "Column rating already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'deletedAt') = 0,
    'ALTER TABLE `products` ADD COLUMN `deletedAt` DATETIME DEFAULT NULL AFTER `updatedAt`;',
    'SELECT "Column deletedAt already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 products 表索引（如果不存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = 'ihc' AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_deleted') = 0,
    'ALTER TABLE `products` ADD INDEX `idx_deleted` (`deletedAt`);',
    'SELECT "Index idx_deleted already exists" AS message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 创建评论表
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

-- 创建商品点赞表
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

-- 创建浏览记录表
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

-- 更新现有数据
UPDATE `artworks` a
SET `likesCount` = (
  SELECT COUNT(*) FROM `artwork_likes` al WHERE al.`artworkId` = a.`id`
) WHERE EXISTS (SELECT 1 FROM `artwork_likes` al WHERE al.`artworkId` = a.`id`);

UPDATE `products` p
SET `likesCount` = (
  SELECT COUNT(*) FROM `product_likes` pl WHERE pl.`productId` = p.`id`
) WHERE EXISTS (SELECT 1 FROM `product_likes` pl WHERE pl.`productId` = p.`id`);

UPDATE `products` p
SET `rating` = (
  SELECT AVG(`rating`) FROM `product_ratings` pr WHERE pr.`productId` = p.`id`
) WHERE EXISTS (SELECT 1 FROM `product_ratings` pr WHERE pr.`productId` = p.`id`);

SELECT 'Migration completed successfully!' AS result;

