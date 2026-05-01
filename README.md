# AI驱动的非遗技艺沉浸式学习与文创平台

## 项目简介

本项目是一个前后端分离的非遗数字化平台，覆盖学习、创作、管理与多端展示全流程，核心能力包括：

- AI学艺：作品轮廓比对、相似度评分、结构化学习建议
- AI问答：围绕非遗知识的对话问答与历史记录
- 答题闯关：题库出题、闯关评分、收藏与历史回看
- 一笔成纹：基于描述和主题快速生成纹样草图
- 数字焕新：纹样与文创样机融合生成效果图
- 后台管理：用户、作品、商品、订单、收藏、AI调用监控
- 多端展示：Web与微信小程序协同展示与使用

## 技术栈

### 后端

- Node.js + Express
- Sequelize + MySQL 8.0
- JWT + bcryptjs（认证与安全）
- Sharp + Multer（图像处理与上传）
- DashScope/Qwen + OpenAI SDK（AI能力接入）

### Web端

- React 18 + React Router
- Ant Design + ECharts
- Axios + Zustand
- TensorFlow.js（前端AI相关能力）

### 小程序端

- 微信小程序原生框架
- 覆盖首页、画廊、学习、AI学艺、商城、个人中心等页面

## 项目结构

```text
ihc/
├── backend/          # 后端API服务
├── web/              # React Web前端
├── miniprogram/      # 微信小程序
└── README.md
```

## 快速开始

### 前置要求

- Node.js >= 16
- npm >= 8
- MySQL >= 8.0

### 1. 安装依赖

在项目根目录执行：

```bash
npm run install:all
```

### 2. 配置环境变量

后端配置文件：`backend/.env`

```env
PORT=3100
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=ihc
DB_USER=root
DB_PASSWORD=your_mysql_password

JWT_SECRET=change-this-to-a-random-secret
JWT_EXPIRE=7d

CORS_ORIGIN=http://localhost:3001
```

Web 配置文件：`web/.env.development`

```env
PORT=3001
REACT_APP_API_URL=http://localhost:3100/api
REACT_APP_LOCAL_API_URL=http://localhost:3100/api
```

可选 AI 环境变量（未配置时部分能力会降级或回退）：

- `QWEN_API_KEY`
- `DASHSCOPE_API_KEY`
- `DEEPSEEK_API_KEY`

### 3. 初始化数据库

```bash
cd backend
npm run db:init
cd ..
```

### 4. 启动服务

终端 A：

```bash
npm run dev:backend
```

终端 B：

```bash
npm run dev:web
```

### 5. 健康检查

- 后端健康检查：`http://localhost:3100/api/health`
- Web 首页：`http://localhost:3001`

## 主要接口

### 认证与用户

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `PUT /api/users/:id`

### AI与学习能力

- `POST /api/ai/learn`：AI学艺评分与建议
- `POST /api/ai/ask-heritage`：AI问答
- `GET /api/ai/heritage-qa-history`：问答历史
- `GET /api/ai/quiz/challenge/start`：开始闯关
- `POST /api/ai/quiz/challenge/submit`：提交闯关答案
- `GET /api/ai/quiz/challenge/history`：闯关历史
- `POST /api/ai/quiz/favorites/toggle`：题目收藏切换
- `GET /api/ai/quiz/favorites`：收藏题目列表
- `POST /api/ai/heritage-sketch-generate`：一笔成纹
- `POST /api/ai/generate-product`：数字焕新文创图生成
- `POST /api/ai/transform`：图像融合与转换

### 内容与交易

- `GET /api/artworks`
- `POST /api/artworks`
- `GET /api/products`
- `POST /api/products`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/ar`
- `POST /api/ar/scan`

### 后台管理（Admin）

- `GET /api/admin/overview`：综合看板
- `GET /api/admin/users`：用户管理
- `GET /api/admin/artworks`：作品管理
- `GET /api/admin/products`：商品管理
- `GET /api/admin/orders`：订单管理
- `GET /api/admin/favorites/artworks`：作品收藏统计
- `GET /api/admin/favorites/quiz`：答题收藏统计
- `GET /api/admin/ai-monitor/overview`：AI调用监控

## 核心功能模块

### 1. AI学艺

- 上传作品并进行图像预处理
- 本地算法计算相似度评分
- 调用大模型输出结构化学习建议

### 2. AI问答

- 非遗知识问答
- 对话上下文与历史记录
- 接口级限流与失败回退

### 3. 答题闯关

- 闯关抽题与题型兼容（单选/多选/判断）
- 自动判分与战绩沉淀
- 收藏题目与历史回看

### 4. 一笔成纹

- 根据风格与主题生成纹样草图提示
- 支持与后续数字焕新流程联动

### 5. 数字焕新

- 纹样上传、文本描述或图文组合输入
- 生成文创样机效果图
- 支持生成失败时的兜底策略

### 6. 后台管理系统

- Web 后台路由与鉴权保护
- 用户、作品、商品、订单全链路管理
- AI调用成本、成功率与降级情况监控

### 7. 小程序多端展示

- 小程序与Web共享后端API
- 覆盖首页、画廊、学习、AI学艺、商城、个人中心
- 支持作品浏览、互动与学习记录沉淀

## 常见问题

### 1. 数据库连接失败

- 检查 MySQL 服务是否运行
- 检查 `backend/.env` 中 `DB_*` 配置
- 确保已执行 `npm run db:init`

### 2. 前端能打开但接口失败

- 检查 `web/.env.development` 中 API 地址是否与后端端口一致
- 检查 `backend/.env` 的 `CORS_ORIGIN`

### 3. Sharp 安装失败

- 在 `backend` 目录执行：`npm run fix:sharp`

### 4. AI功能不可用

- 检查 `QWEN_API_KEY` 或 `DASHSCOPE_API_KEY`
- 未配置时，部分接口会使用本地模板或回退策略

## 技术亮点

- AI驱动学习闭环：评分 + 建议 + 训练路径
- 创作转化闭环：一笔成纹 + 数字焕新 + 商品发布
- 管理闭环：后台管理 + AI监控 + 数据看板
- 多端协同：Web 与微信小程序统一后端能力
- 工程可落地：限流、错误处理、降级与日志追踪

## 详细文档

- [安装文档](./INSTALL.md)
- [项目设置指南](./SETUP.md)
- [后端环境变量说明](./backend/ENV_CONFIG.md)
- [后端故障排查](./backend/TROUBLESHOOTING.md)

## 许可证

MIT License