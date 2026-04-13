# AI驱动的"非遗"技艺沉浸式学习与文创平台

## 项目简介

本项目是一个前后端分离的非物质文化遗产（非遗）技艺学习与文创平台，通过AI技术实现：
- **AI学艺**：通过计算机视觉技术进行轮廓比对、相似度评分和改进建议
- **数字焕新**：将非遗纹样应用到现代物品上进行预览和定制
- **AR识物**：扫描线下文物或特定图片，显示3D动画和讲解
- **文创商城**：购买由用户生成或官方合作的文创产品

## 技术栈

### 后端
- Node.js + Express
- Sequelize + MySQL 8.0（数据库ORM）
- Sharp（图像处理，有预编译二进制，Windows友好）
- JWT（身份认证）
- OpenAI API（可选，用于AI功能）

### Web端
- React + TypeScript
- TensorFlow.js / OpenCV.js
- Ant Design / Material-UI
- Axios

### 小程序端
- 微信小程序
- AR能力
- 云开发 / 云函数

## 项目结构

```
ihc/
├── backend/          # 后端API服务
├── web/              # React Web前端
├── miniprogram/      # 微信小程序
└── README.md
```

## 快速开始

### 前置要求

- Node.js >= 16.0.0
- MySQL >= 8.0
- npm 或 yarn

### 1. 克隆项目

```bash
git clone <repository-url>
cd ihc
```

### 2. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../web
npm install
```

或者使用一键安装：
```bash
npm run install:all
```

### 3. 配置环境变量

#### 后端配置 (backend/.env)

在 `backend` 目录下创建 `.env` 文件，参考 `backend/ENV_CONFIG.md` 中的说明：

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ihc
DB_USER=root
DB_PASSWORD=123456
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d
OPENAI_API_KEY=your_openai_api_key_here
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:3001
MINIPROGRAM_APPID=your_miniprogram_appid
MINIPROGRAM_SECRET=your_miniprogram_secret
```

> 📝 **注意**: 详细的环境变量配置说明请查看 [backend/ENV_CONFIG.md](./backend/ENV_CONFIG.md)

#### Web端配置 (web/.env)

在 `web` 目录下创建 `.env` 文件：

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_UPLOAD_URL=http://localhost:3000/uploads
```

### 4. 启动MySQL并创建数据库

确保MySQL 8.0服务正在运行：

```bash
# Windows
# 启动MySQL服务（通过服务管理器或命令行）

# macOS (使用Homebrew)
brew services start mysql@8.0

# Linux
sudo systemctl start mysql
```

创建数据库：

```bash
# 登录MySQL
mysql -u root -p123456

# 执行SQL脚本
source backend/database/init.sql

# 或直接执行
mysql -u root -p123456 < backend/database/init.sql
```

### 5. 启动开发服务器

#### 启动后端服务

```bash
cd backend
npm run dev
```

后端服务将在 http://localhost:3000 启动

#### 启动Web前端

```bash
cd web
npm start
```

Web前端将在 http://localhost:3001 启动（React默认端口）

### 6. 小程序开发

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 在 `project.config.json` 中配置你的小程序 AppID
3. 修改 `app.js` 中的 `apiUrl` 为你的后端API地址
4. 开始开发

## API接口文档

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息（需要认证）

### 用户相关

- `GET /api/users` - 获取用户列表（需要认证）
- `GET /api/users/:id` - 获取用户详情（需要认证）
- `PUT /api/users/:id` - 更新用户信息（需要认证）

### 作品相关

- `GET /api/artworks` - 获取作品列表
- `GET /api/artworks/:id` - 获取作品详情
- `POST /api/artworks` - 创建作品（需要认证）
- `POST /api/artworks/:id/like` - 点赞作品（需要认证）

### AI功能

- `POST /api/ai/learn` - AI学艺（轮廓比对和相似度评分）
- `POST /api/ai/transform` - 数字焕新（风格迁移）

### 产品相关

- `GET /api/products` - 获取产品列表
- `GET /api/products/:id` - 获取产品详情
- `POST /api/products` - 创建产品（需要认证）
- `PATCH /api/products/:id/status` - 更新产品状态（需要管理员权限）

### 订单相关

- `GET /api/orders` - 获取订单列表（需要认证）
- `POST /api/orders` - 创建订单（需要认证）

### AR相关

- `GET /api/ar` - 获取AR内容列表
- `POST /api/ar/scan` - 扫描标识物获取AR内容

## 核心功能

### 1. AI学艺
- 用户上传剪纸或绘画作品
- AI进行轮廓比对和相似度评分
- 提供改进建议

### 2. 数字焕新
- 上传非遗纹样
- AI风格迁移应用到现代物品
- 预览和定制

### 3. AR识物
- 扫描文物或特定图片
- 显示3D动画和讲解
- 学习技艺历史

### 4. 文创商城
- 浏览文创产品
- 购买定制产品
- 订单管理

## API文档

API文档地址：http://localhost:3000/api-docs

## 开发规范

- 使用TypeScript进行类型检查
- 遵循ESLint代码规范
- 提交前运行测试
- 代码审查后合并

## 详细文档

- [项目设置指南](./SETUP.md) - 详细的设置和配置说明
- [项目总结](./PROJECT_SUMMARY.md) - 项目架构和功能说明
- [环境配置说明](./backend/ENV_CONFIG.md) - 后端环境变量配置

## 常见问题

### MySQL连接失败
- 检查MySQL服务是否运行
- 检查 `DB_HOST`, `DB_USER`, `DB_PASSWORD` 配置是否正确
- 确保数据库 `ihc` 已创建
- 检查MySQL用户权限

### 端口被占用
- 修改 `.env` 文件中的 `PORT` 配置
- 或关闭占用端口的进程

### 文件上传失败
- 检查 `uploads` 目录权限
- 检查文件大小是否超过限制

### 依赖安装失败（TensorFlow相关）
- 项目已移除 `@tensorflow/tfjs-node` 依赖，避免 Windows 编译问题
- 后端使用 Sharp 进行图像处理（有预编译二进制）
- AI功能主要在前端使用 TensorFlow.js 实现
- 详细说明请查看 [backend/CHANGELOG.md](./backend/CHANGELOG.md) 和 [backend/TROUBLESHOOTING.md](./backend/TROUBLESHOOTING.md)

### Sharp 模块安装失败
- 如果遇到 `Cannot find module '../build/Release/sharp-win32-x64.node'` 错误
- 运行修复脚本：`cd backend && npm run fix:sharp`
- 或手动重新安装：`npm uninstall sharp && npm install sharp --platform=win32 --arch=x64`
- 详细说明请查看 [backend/SHARP_FIX.md](./backend/SHARP_FIX.md) 和 [backend/TROUBLESHOOTING.md](./backend/TROUBLESHOOTING.md)

## 技术亮点

- ✨ **AI驱动**: 前端使用TensorFlow.js实现AI分析，后端使用Sharp进行图像处理
- 🎨 **数字焕新**: 将传统非遗纹样应用到现代物品
- 📱 **AR体验**: 小程序AR扫描功能，增强互动体验
- 🛍️ **文创商城**: 完整的电商功能，支持定制产品
- 🔐 **安全认证**: JWT身份认证，保护用户数据
- 📊 **数据管理**: MongoDB数据库，支持复杂数据关系
- ⚡ **跨平台**: Windows/Mac/Linux 友好，无需编译原生模块

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## readme