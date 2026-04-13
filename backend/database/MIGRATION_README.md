# 数据库迁移说明

## 执行迁移

本迁移脚本添加了评论、商品点赞、浏览统计等功能所需的数据库表和字段。

### 方式一：使用 MySQL 命令行

```bash
mysql -u root -p123456 ihc < backend/database/migration_add_comments_likes.sql
```

### 方式二：在 MySQL 客户端中执行

1. 打开 MySQL 客户端
2. 连接到数据库 `ihc`
3. 执行 `backend/database/migration_add_comments_likes.sql` 文件中的 SQL 语句

## 迁移内容

### 新增表

1. **comments** - 评论表
   - 支持作品和商品的评论
   - 支持回复（parentId）
   - 支持评分（rating）

2. **product_likes** - 商品点赞表
   - 用户对商品的点赞记录

3. **views** - 浏览记录表
   - 记录用户/IP对作品和商品的浏览
   - 用于统计和防重复计数

### 新增字段

1. **artworks 表**
   - `likesCount` - 点赞数
   - `commentsCount` - 评论数
   - `status` - 状态（draft, published, hidden）
   - `deletedAt` - 软删除时间

2. **products 表**
   - `views` - 浏览量
   - `likesCount` - 点赞数
   - `commentsCount` - 评论数
   - `rating` - 平均评分
   - `deletedAt` - 软删除时间

### 数据更新

迁移脚本会自动更新现有数据的 `likesCount` 和 `commentsCount` 字段。

## 注意事项

1. 执行迁移前请备份数据库
2. 如果表已存在，迁移脚本会跳过创建（使用 `IF NOT EXISTS`）
3. 如果字段已存在，迁移脚本会跳过添加（使用 `IF NOT EXISTS`）
4. 迁移后需要重启后端服务

## 验证迁移

执行以下 SQL 查询验证迁移是否成功：

```sql
-- 检查表是否存在
SHOW TABLES LIKE 'comments';
SHOW TABLES LIKE 'product_likes';
SHOW TABLES LIKE 'views';

-- 检查字段是否存在
DESCRIBE artworks;
DESCRIBE products;
```

## 回滚

如果需要回滚，可以执行以下 SQL：

```sql
-- 删除新增的表
DROP TABLE IF EXISTS views;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS product_likes;

-- 删除新增的字段（如果需要）
ALTER TABLE artworks DROP COLUMN IF EXISTS likesCount;
ALTER TABLE artworks DROP COLUMN IF EXISTS commentsCount;
ALTER TABLE artworks DROP COLUMN IF EXISTS status;
ALTER TABLE artworks DROP COLUMN IF EXISTS deletedAt;

ALTER TABLE products DROP COLUMN IF EXISTS views;
ALTER TABLE products DROP COLUMN IF EXISTS likesCount;
ALTER TABLE products DROP COLUMN IF EXISTS commentsCount;
ALTER TABLE products DROP COLUMN IF EXISTS rating;
ALTER TABLE products DROP COLUMN IF EXISTS deletedAt;
```

注意：回滚会删除所有相关数据，请谨慎操作。

