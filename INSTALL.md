# 5.2 默认安装过程（计算机设计大赛文档可直接引用）

本节基于当前仓库实际脚本与目录结构编写，适用于 Windows 本地开发环境。

## 1. 获取源码

```bash
git clone https://github.com/yuliang-1234567/feiyixueyi.git
cd feiyixueyi
```

## 2. 环境准备

- Node 版本：
    最低：Node 18.17.0
    推荐（生产/云上）：Node 20.3.0+
- npm 8 及以上
- MySQL 8.0（推荐）

检查版本：

```bash
node -v
npm -v
```

## 3. 安装依赖（默认方式）

在仓库根目录执行：

```bash
npm run install:all
```

说明：该命令会依次安装根目录、backend、web 三处依赖。

## 4. 配置环境变量

### 4.1 后端环境变量

在 backend 目录创建 .env 文件（参考 backend/ENV_CONFIG.md），最低可运行示例：

```env
PORT=3100
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=ihc
DB_USER=root
DB_PASSWORD=你的MySQL密码

JWT_SECRET=请替换为你自己的随机密钥
JWT_EXPIRE=7d

CORS_ORIGIN=http://localhost:3001
```

### 4.2 Web 环境变量（确保端口一致）

在 web 目录创建或修改 .env.development：

```env
PORT=3001
REACT_APP_API_URL=http://localhost:3100/api
REACT_APP_LOCAL_API_URL=http://localhost:3100/api
```

注意：前端与后端端口必须一致，否则会出现接口请求失败。

## 5. 初始化数据库

推荐方式（按项目内置脚本）：

```bash
cd backend
npm run db:init
cd ..
```

如需导入已有 MySQL 转储文件：

```bash
node backend/scripts/import-dump.js D:/downloads/Dump20260225.sql
```

## 6. 启动项目

在仓库根目录开启两个终端：

终端 A（后端）：

```bash
npm run dev:backend
```

终端 B（Web）：

```bash
npm run dev:web
```

## 7. 启动验证

后端健康检查：

```bash
curl http://localhost:3100/api/health
```

Web 首页检查：

```bash
curl -I http://localhost:3001
```

如果想访问线上演示站：
https://feiyixueyi.cn
## 8. 常见问题与处理

- 问题 1：DB_USER 或 DB_PASSWORD 未配置。
   处理：检查 backend/.env 中 DB_USER、DB_PASSWORD 是否填写。

- 问题 2：前端能打开但接口全失败。
   处理：确认 web/.env.development 中 REACT_APP_API_URL 与 REACT_APP_LOCAL_API_URL 指向当前后端端口（例如 3100）。

- 问题 3：数据库表不存在。
   处理：在 backend 目录重新执行 npm run db:init。

- 问题 4：端口冲突。
   处理：更换 PORT 后同步修改前端 API 地址与 CORS_ORIGIN。

## 9. 补充说明（用于答辩描述）

- 本项目采用前后端分离：后端 Node.js + Express + Sequelize(MySQL)，前端 React。
- 安装流程遵循“统一安装依赖 -> 配置环境变量 -> 初始化数据库 -> 前后端并行启动 -> 健康检查验证”的工程化顺序。
- AI 相关 Key（如 OpenAI、Qwen、火山引擎）可按需配置，未配置时可先完成基础功能联调。
