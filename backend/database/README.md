# 数据库初始化说明

## 使用方法

### 方法一：使用 Node.js 脚本（推荐）

```bash
# 在 backend 目录下
npm run db:init
```

或直接执行：

```bash
node database/execute-sql.js
```

### 方法二：使用 MySQL 命令行

```bash
# 登录 MySQL
mysql -u root -p123456

# 执行 SQL 脚本
source backend/database/init.sql

# 或直接执行
mysql -u root -p123456 < backend/database/init.sql
```

### 方法三：使用 MySQL Workbench

1. 打开 MySQL Workbench
2. 连接到 MySQL 服务器
3. 打开 `backend/database/init.sql` 文件
4. 执行 SQL 脚本

## 数据库配置

- **数据库名**: `ihc`
- **用户名**: `root`
- **密码**: `123456`
- **主机**: `localhost`
- **端口**: `3306`

## 表结构

- `users` - 用户表
- `artworks` - 作品表
- `artwork_likes` - 作品点赞表
- `products` - 产品表
- `product_ratings` - 产品评分表
- `orders` - 订单表
- `ar_contents` - AR内容表

## 注意事项

1. 确保 MySQL 8.0 已安装并运行
2. 确保 root 用户密码为 `123456`，或修改 `.env` 文件中的数据库配置
3. 确保 MySQL 支持 JSON 数据类型（MySQL 5.7.8+）
4. 生产环境建议修改默认密码和创建专用数据库用户
5. 测试用户的密码哈希在 SQL 中，实际使用时应该通过注册接口创建用户

## 重置数据库

如果需要重置数据库，可以执行：

```sql
DROP DATABASE IF EXISTS `ihc`;
-- 然后重新执行 init.sql
```

## 测试用户

SQL 脚本中包含了测试用户（密码: admin123）：
- 用户名: `admin`, 邮箱: `admin@example.com`, 角色: `admin`
- 用户名: `artist1`, 邮箱: `artist1@example.com`, 角色: `artist`

**注意**: 测试用户的密码哈希对应密码 "admin123"。在实际使用中，建议通过注册接口创建用户，密码会自动使用 bcrypt 加密。
