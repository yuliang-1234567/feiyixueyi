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

-- product review/violation fields
SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='violationStatus') = 0,
  'ALTER TABLE `products` ADD COLUMN `violationStatus` ENUM(''normal'', ''suspected'', ''confirmed'') NOT NULL DEFAULT ''normal'' COMMENT ''违规状态''',
  'SELECT ''skip products.violationStatus'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='reviewStatus') = 0,
  'ALTER TABLE `products` ADD COLUMN `reviewStatus` ENUM(''pending'', ''approved'', ''rejected'', ''reopened'') NOT NULL DEFAULT ''pending'' COMMENT ''复审状态''',
  'SELECT ''skip products.reviewStatus'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='reviewReason') = 0,
  'ALTER TABLE `products` ADD COLUMN `reviewReason` TEXT NULL COMMENT ''复审备注''',
  'SELECT ''skip products.reviewReason'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='offlineReason') = 0,
  'ALTER TABLE `products` ADD COLUMN `offlineReason` TEXT NULL COMMENT ''违规下架原因''',
  'SELECT ''skip products.offlineReason'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='reviewedBy') = 0,
  'ALTER TABLE `products` ADD COLUMN `reviewedBy` INT NULL COMMENT ''审核管理员ID''',
  'SELECT ''skip products.reviewedBy'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='reviewedAt') = 0,
  'ALTER TABLE `products` ADD COLUMN `reviewedAt` DATETIME NULL COMMENT ''审核时间''',
  'SELECT ''skip products.reviewedAt'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='products' AND COLUMN_NAME='rejectCount') = 0,
  'ALTER TABLE `products` ADD COLUMN `rejectCount` INT NOT NULL DEFAULT 0 COMMENT ''被驳回次数''',
  'SELECT ''skip products.rejectCount'' AS msg'
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

-- ---------- heritage qa + quiz tables ----------
CREATE TABLE IF NOT EXISTS `heritage_qa_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `categoryId` VARCHAR(50) NOT NULL DEFAULT 'craft',
  `categoryName` VARCHAR(50) NOT NULL DEFAULT '传统技艺',
  `question` TEXT NOT NULL,
  `answer` TEXT NOT NULL,
  `promptVersion` VARCHAR(20) NOT NULL DEFAULT 'v1',
  `model` VARCHAR(80) DEFAULT NULL,
  `provider` VARCHAR(40) NOT NULL DEFAULT 'qwen',
  `latencyMs` INT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_category_created` (`userId`, `categoryId`, `createdAt`),
  INDEX `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `heritage_quiz_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `categoryId` VARCHAR(50) NOT NULL DEFAULT 'craft',
  `categoryName` VARCHAR(50) NOT NULL DEFAULT '传统技艺',
  `difficulty` ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  `questionType` ENUM('single', 'multiple', 'judge') NOT NULL DEFAULT 'single',
  `stem` TEXT NOT NULL,
  `optionA` VARCHAR(255) NOT NULL,
  `optionB` VARCHAR(255) NOT NULL,
  `optionC` VARCHAR(255) DEFAULT NULL,
  `optionD` VARCHAR(255) DEFAULT NULL,
  `optionE` VARCHAR(255) DEFAULT NULL,
  `optionF` VARCHAR(255) DEFAULT NULL,
  `correctOption` ENUM('A', 'B', 'C', 'D') DEFAULT NULL,
  `correctAnswer` VARCHAR(20) NOT NULL DEFAULT 'A',
  `explanation` TEXT DEFAULT NULL,
  `sourceType` ENUM('ai', 'official', 'competition') NOT NULL DEFAULT 'ai',
  `sourceRef` VARCHAR(500) DEFAULT NULL,
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status_category_difficulty` (`status`, `categoryId`, `difficulty`),
  INDEX `idx_source_type` (`sourceType`),
  INDEX `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `heritage_quiz_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `categoryId` VARCHAR(50) NOT NULL DEFAULT 'craft',
  `categoryName` VARCHAR(50) NOT NULL DEFAULT '传统技艺',
  `difficulty` ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  `totalQuestions` INT NOT NULL DEFAULT 10,
  `answeredQuestions` INT NOT NULL DEFAULT 0,
  `score` INT DEFAULT NULL,
  `status` ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
  `completedAt` DATETIME DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_created` (`userId`, `createdAt`),
  INDEX `idx_status_created` (`status`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `heritage_quiz_session_answers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sessionId` INT NOT NULL,
  `questionId` INT NOT NULL,
  `selectedOption` VARCHAR(20) DEFAULT NULL,
  `isCorrect` TINYINT(1) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`sessionId`) REFERENCES `heritage_quiz_sessions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`questionId`) REFERENCES `heritage_quiz_questions`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_session_question` (`sessionId`, `questionId`),
  INDEX `idx_question_id` (`questionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- heritage quiz compatibility upgrades ----------
SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='heritage_quiz_questions' AND COLUMN_NAME='questionType') = 0,
  'ALTER TABLE `heritage_quiz_questions` ADD COLUMN `questionType` ENUM(''single'', ''multiple'', ''judge'') NOT NULL DEFAULT ''single'' AFTER `difficulty`',
  'SELECT ''skip heritage_quiz_questions.questionType'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='heritage_quiz_questions' AND COLUMN_NAME='optionE') = 0,
  'ALTER TABLE `heritage_quiz_questions` ADD COLUMN `optionE` VARCHAR(255) NULL AFTER `optionD`',
  'SELECT ''skip heritage_quiz_questions.optionE'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='heritage_quiz_questions' AND COLUMN_NAME='optionF') = 0,
  'ALTER TABLE `heritage_quiz_questions` ADD COLUMN `optionF` VARCHAR(255) NULL AFTER `optionE`',
  'SELECT ''skip heritage_quiz_questions.optionF'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='heritage_quiz_questions' AND COLUMN_NAME='correctAnswer') = 0,
  'ALTER TABLE `heritage_quiz_questions` ADD COLUMN `correctAnswer` VARCHAR(20) NOT NULL DEFAULT ''A'' AFTER `correctOption`',
  'SELECT ''skip heritage_quiz_questions.correctAnswer'' AS msg'
);
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = 'ALTER TABLE `heritage_quiz_questions` MODIFY COLUMN `optionC` VARCHAR(255) NULL';
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = 'ALTER TABLE `heritage_quiz_questions` MODIFY COLUMN `optionD` VARCHAR(255) NULL';
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = 'ALTER TABLE `heritage_quiz_questions` MODIFY COLUMN `correctOption` ENUM(''A'', ''B'', ''C'', ''D'') NULL';
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = 'UPDATE `heritage_quiz_questions` SET `questionType` = ''single'' WHERE `questionType` IS NULL OR `questionType` = ''''';
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = 'UPDATE `heritage_quiz_questions` SET `correctAnswer` = COALESCE(NULLIF(`correctAnswer`, ''''), `correctOption`, ''A'')';
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql_stmt = 'ALTER TABLE `heritage_quiz_session_answers` MODIFY COLUMN `selectedOption` VARCHAR(20) NULL';
PREPARE stmt FROM @sql_stmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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
