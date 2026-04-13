# 项目设置指南

## 前置要求

- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0
- MongoDB >= 4.4（或使用云数据库如 MongoDB Atlas）
- Git

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd ihc
```

### 2. 安装依赖

#### 方法一：使用根目录脚本（推荐）

```bash
npm run install:all
```

#### 方法二：手动安装

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

### 3. 配置环境变量

#### 后端配置

在 `backend` 目录下创建 `.env` 文件：

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ihc
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d
OPENAI_API_KEY=your_openai_api_key_here
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:3001
MINIPROGRAM_APPID=your_miniprogram_appid
MINIPROGRAM_SECRET=your_miniprogram_secret
```

#### Web前端配置

在 `web` 目录下创建 `.env` 文件：

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_UPLOAD_URL=http://localhost:3000/uploads
```

### 4. 启动MongoDB

#### 本地MongoDB

```bash
# Windows
mongod

# macOS (使用Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

#### 或使用MongoDB Atlas（云数据库）

1. 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 创建免费集群
3. 获取连接字符串
4. 更新 `.env` 文件中的 `MONGODB_URI`

### 5. 启动开发服务器

#### 启动后端服务

```bash
cd backend
npm run dev
```

后端服务将在 http://localhost:3000 启动

#### 启动Web前端

在新的终端窗口中：

```bash
cd web
npm start
```

Web前端将在 http://localhost:3001 启动（React默认端口）

### 6. 小程序开发

1. 安装微信开发者工具
2. 打开微信开发者工具
3. 选择"小程序"项目
4. 项目目录选择 `miniprogram` 文件夹
5. 在 `app.js` 中配置 `apiUrl` 为你的后端API地址
6. 开始开发

## 项目结构

```
ihc/
├── backend/              # 后端API服务
│   ├── src/
│   │   ├── index.js     # 入口文件
│   │   ├── models/      # 数据模型
│   │   ├── routes/      # 路由
│   │   ├── middleware/  # 中间件
│   │   └── utils/       # 工具函数
│   ├── uploads/         # 上传文件目录
│   └── package.json
├── web/                 # React Web前端
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 通用组件
│   │   ├── store/       # 状态管理
│   │   └── utils/       # 工具函数
│   └── package.json
├── miniprogram/         # 微信小程序
│   ├── pages/           # 页面
│   ├── app.js           # 小程序入口
│   └── app.json         # 小程序配置
└── README.md
```

## API接口

### 基础URL

- 开发环境：`http://localhost:3000/api`
- 生产环境：根据实际部署情况配置

### 主要接口

#### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

#### 作品相关
- `GET /api/artworks` - 获取作品列表
- `GET /api/artworks/:id` - 获取作品详情
- `POST /api/artworks` - 创建作品
- `POST /api/artworks/:id/like` - 点赞作品

#### AI功能
- `POST /api/ai/learn` - AI学艺（轮廓比对）
- `POST /api/ai/transform` - 数字焕新（后台算法融合纹样与产品样机；样机图放在 `backend/uploads/product-templates/`，详见 [backend/ENV_CONFIG.md](./backend/ENV_CONFIG.md)）

#### 产品相关
- `GET /api/products` - 获取产品列表
- `GET /api/products/:id` - 获取产品详情
- `POST /api/products` - 创建产品

#### 订单相关
- `GET /api/orders` - 获取订单列表
- `POST /api/orders` - 创建订单

#### AR相关
- `GET /api/ar` - 获取AR内容列表
- `POST /api/ar/scan` - 扫描标识物获取AR内容

## 常见问题

### 1. MongoDB连接失败

- 检查MongoDB服务是否运行
- 检查 `MONGODB_URI` 配置是否正确
- 检查网络连接和防火墙设置

### 2. 端口被占用

- 修改 `.env` 文件中的 `PORT` 配置
- 或使用 `lsof -ti:3000 | xargs kill` 关闭占用端口的进程

### 3. 上传文件失败

- 检查 `uploads` 目录权限
- 检查文件大小是否超过限制
- 检查磁盘空间

### 4. CORS错误

- 检查后端 `CORS_ORIGIN` 配置
- 确保前端URL在允许的源列表中

## 开发建议

1. 使用 ESLint 进行代码检查
2. 遵循项目代码规范
3. 提交前运行测试
4. 使用 Git 进行版本控制
5. 定期更新依赖包

## 生产部署

### 后端部署

1. 设置 `NODE_ENV=production`
2. 使用 PM2 或其他进程管理器
3. 配置反向代理（如 Nginx）
4. 启用HTTPS
5. 配置数据库备份

### 前端部署

1. 运行 `npm run build`
2. 将 `build` 目录部署到静态文件服务器
3. 配置反向代理
4. 启用HTTPS

### 小程序发布

1. 在微信公众平台注册小程序
2. 配置服务器域名
3. 上传代码并提交审核
4. 发布小程序

## 技术支持

如有问题，请查看：
- [项目文档](./README.md)
- [环境配置说明](./backend/ENV_CONFIG.md)
- 项目Issue页面
