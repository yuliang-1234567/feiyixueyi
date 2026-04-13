-- 创建数据库
CREATE DATABASE IF NOT EXISTS `ihc` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `ihc`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(20) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `avatar` VARCHAR(500) DEFAULT '',
  `role` ENUM('user', 'admin', 'artist') DEFAULT 'user',
  `nickname` VARCHAR(50) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `interests` JSON DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 作品表
CREATE TABLE IF NOT EXISTS `artworks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `imageUrl` VARCHAR(500) NOT NULL,
  `category` ENUM('剪纸', '刺绣', '泥塑', '其他') NOT NULL,
  `authorId` INT NOT NULL,
  `aiSimilarity` DECIMAL(5, 2) DEFAULT NULL,
  `aiAccuracy` DECIMAL(5, 2) DEFAULT NULL,
  `aiSuggestions` JSON DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `views` INT DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_author` (`authorId`),
  INDEX `idx_category` (`category`),
  INDEX `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 作品点赞表
CREATE TABLE IF NOT EXISTS `artwork_likes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `artworkId` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`artworkId`) REFERENCES `artworks`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `idx_user_artwork` (`userId`, `artworkId`),
  INDEX `idx_artwork` (`artworkId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 产品表
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `images` JSON DEFAULT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `originalPrice` DECIMAL(10, 2) DEFAULT NULL,
  `category` ENUM('T恤', '手机壳', '帆布袋', '明信片', '其他') NOT NULL,
  `patternId` INT DEFAULT NULL,
  `stock` INT DEFAULT 0,
  `status` ENUM('draft', 'published', 'sold_out') DEFAULT 'draft',
  `creatorId` INT DEFAULT NULL,
  `sales` INT DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`patternId`) REFERENCES `artworks`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_category` (`category`),
  INDEX `idx_status` (`status`),
  INDEX `idx_creator` (`creatorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 产品评分表
CREATE TABLE IF NOT EXISTS `product_ratings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `productId` INT NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `idx_user_product` (`userId`, `productId`),
  INDEX `idx_product` (`productId`),
  INDEX `idx_rating` (`rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单表
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `items` JSON NOT NULL,
  `totalAmount` DECIMAL(10, 2) NOT NULL,
  `shippingName` VARCHAR(50) DEFAULT NULL,
  `shippingPhone` VARCHAR(20) DEFAULT NULL,
  `shippingAddress` VARCHAR(500) DEFAULT NULL,
  `shippingCity` VARCHAR(50) DEFAULT NULL,
  `shippingProvince` VARCHAR(50) DEFAULT NULL,
  `shippingZipCode` VARCHAR(10) DEFAULT NULL,
  `status` ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user` (`userId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AR内容表
CREATE TABLE IF NOT EXISTS `ar_contents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `markerId` VARCHAR(100) NOT NULL UNIQUE,
  `markerType` ENUM('image', 'object', 'location') NOT NULL,
  `markerImage` VARCHAR(500) DEFAULT NULL,
  `model3d` VARCHAR(500) DEFAULT NULL,
  `animation` VARCHAR(500) DEFAULT NULL,
  `audio` VARCHAR(500) DEFAULT NULL,
  `history` TEXT DEFAULT NULL,
  `technique` TEXT DEFAULT NULL,
  `culturalSignificance` TEXT DEFAULT NULL,
  `category` ENUM('剪纸', '刺绣', '泥塑', '其他') NOT NULL,
  `status` ENUM('draft', 'active', 'inactive') DEFAULT 'draft',
  `scans` INT DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_marker` (`markerId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 大师表
CREATE TABLE IF NOT EXISTS `masters` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `image` VARCHAR(500) DEFAULT '',
  `description` TEXT DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `achievements` JSON DEFAULT NULL,
  `status` ENUM('draft', 'published', 'hidden') DEFAULT 'published',
  `displayOrder` INT DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_category` (`category`),
  INDEX `idx_display_order` (`displayOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 新闻表
CREATE TABLE IF NOT EXISTS `news` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `image` VARCHAR(500) DEFAULT '',
  `content` TEXT DEFAULT NULL,
  `excerpt` TEXT DEFAULT NULL,
  `author` VARCHAR(100) DEFAULT NULL,
  `views` INT DEFAULT 0,
  `status` ENUM('draft', 'published', 'hidden') DEFAULT 'published',
  `publishDate` DATETIME DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_category` (`category`),
  INDEX `idx_publish_date` (`publishDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订阅表
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `status` ENUM('active', 'unsubscribed', 'bounced') DEFAULT 'active',
  `source` VARCHAR(50) DEFAULT 'home',
  `subscribedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入测试用户（密码: admin123）
-- 注意：密码哈希使用 bcrypt，对应密码 "admin123"
-- 推荐使用 npm run create:user 脚本来创建用户，因为 Sequelize 会自动处理密码加密
-- 如果用户已存在，先删除再插入（确保密码哈希正确）

-- 删除已存在的测试用户
DELETE FROM `users` WHERE `email` IN ('admin@example.com', 'artist1@example.com', 'user1@example.com');

-- 插入测试用户（密码: admin123）
-- 密码哈希: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
INSERT INTO `users` (`username`, `email`, `password`, `role`, `createdAt`, `updatedAt`) VALUES
('admin', 'admin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', NOW(), NOW()),
('artist1', 'artist1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'artist', NOW(), NOW()),
('user1', 'user1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', NOW(), NOW());

-- 插入示例大师数据
INSERT INTO `masters` (`name`, `category`, `image`, `description`, `bio`, `status`, `displayOrder`, `createdAt`, `updatedAt`) VALUES
('陈大师', '木雕', '/placeholder.jpg', '传统木雕技艺传承人', '陈大师从事木雕艺术50余年，是国家级非物质文化遗产传承人。', 'published', 1, NOW(), NOW()),
('李大师', '针织', '/placeholder.jpg', '传统针织技艺传承人', '李大师精通各种传统针织技法，作品曾多次获得国际大奖。', 'published', 2, NOW(), NOW()),
('张大师', '陶艺', '/placeholder.jpg', '传统陶艺技艺传承人', '张大师的陶艺作品融合传统与现代，具有独特的艺术风格。', 'published', 3, NOW(), NOW()),
('王大师', '剪纸', '/placeholder.jpg', '传统剪纸技艺传承人', '王大师的剪纸作品精细入微，展现了传统艺术的魅力。', 'published', 4, NOW(), NOW());

-- 插入示例新闻数据
INSERT INTO `news` (`title`, `category`, `image`, `content`, `excerpt`, `author`, `views`, `status`, `publishDate`, `createdAt`, `updatedAt`) VALUES
('年度元宵灯会筹启动', '节日活动', '/placeholder.jpg', '一年一度的元宵灯会即将启动，届时将有众多非遗项目展示...', '一年一度的元宵灯会即将启动', '平台编辑', 0, 'published', NOW(), NOW(), NOW()),
('VR博物馆之旅下月上线', '科技前沿', '/placeholder.jpg', '虚拟现实技术与非遗文化相结合，打造全新的博物馆体验...', '虚拟现实技术与非遗文化相结合', '平台编辑', 0, 'published', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), NOW()),
('青少年茶艺工作坊圆满结束', '青少年', '/placeholder.jpg', '为期一周的青少年茶艺工作坊已圆满结束，参与者纷纷表示收获颇丰...', '为期一周的青少年茶艺工作坊已圆满结束', '平台编辑', 0, 'published', DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY), NOW());
