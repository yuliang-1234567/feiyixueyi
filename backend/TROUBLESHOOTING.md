# 故障排除指南

## 安装问题

### 1. TensorFlow.js Node 安装失败

**问题**: 安装 `@tensorflow/tfjs-node` 时出现编译错误，需要 Visual Studio 和 C++ 构建工具。

**解决方案**: 
- 项目已移除 `@tensorflow/tfjs-node` 依赖
- 后端使用 Sharp 进行图像处理（有预编译二进制，无需编译）
- AI功能主要在前端使用 TensorFlow.js 实现
- 后端AI处理可以通过调用外部API（如 OpenAI API）实现

### 2. Multer 安全警告

**问题**: Multer 1.x 版本存在安全漏洞。

**解决方案**: 
- 已升级到 Multer 2.x 版本
- 如果遇到兼容性问题，可以暂时使用 1.x，但建议尽快升级

### 3. MongoDB 连接失败

**问题**: 无法连接到 MongoDB 数据库。

**解决方案**:
1. 检查 MongoDB 服务是否运行
2. 检查 `MONGODB_URI` 环境变量配置
3. 如果使用本地 MongoDB，确保服务已启动：
   ```bash
   # Windows
   mongod
   
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```
4. 或使用 MongoDB Atlas 云数据库

### 4. 端口被占用

**问题**: 端口 3000 或 3001 已被占用。

**解决方案**:
1. 修改 `.env` 文件中的 `PORT` 配置
2. 或关闭占用端口的进程：
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # macOS/Linux
   lsof -ti:3000 | xargs kill
   ```

### 5. 文件上传失败

**问题**: 上传文件时出现错误。

**解决方案**:
1. 检查 `uploads` 目录是否存在且有写权限
2. 检查文件大小是否超过限制（默认 10MB）
3. 检查文件类型是否被允许

### 6. 依赖安装缓慢

**问题**: npm install 速度很慢。

**解决方案**:
1. 使用国内镜像源：
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```
2. 或使用 yarn：
   ```bash
   yarn install
   ```
3. 或使用 cnpm：
   ```bash
   npm install -g cnpm --registry=https://registry.npmmirror.com
   cnpm install
   ```

## 运行时问题

### 1. JWT 认证失败

**问题**: 用户登录后无法访问需要认证的接口。

**解决方案**:
1. 检查 JWT_SECRET 环境变量是否配置
2. 检查 token 是否过期
3. 检查请求头中是否正确携带 token：
   ```
   Authorization: Bearer <token>
   ```

### 2. CORS 错误

**问题**: 前端请求后端 API 时出现 CORS 错误。

**解决方案**:
1. 检查后端 `CORS_ORIGIN` 环境变量配置
2. 确保前端 URL 在允许的源列表中
3. 开发环境可以临时允许所有来源（生产环境不建议）

### 3. Sharp 模块安装失败

**问题**: 启动服务器时出现 `Cannot find module '../build/Release/sharp-win32-x64.node'` 错误。

**原因**: Sharp 的原生二进制文件没有正确安装或损坏。

**解决方案**:

#### 方法一：重新安装 Sharp（推荐）

```bash
cd backend
npm uninstall sharp
npm install sharp --platform=win32 --arch=x64
```

#### 方法二：清理后重新安装

```bash
cd backend
# 删除 node_modules 中的 sharp
rm -rf node_modules/sharp
# 或 Windows PowerShell
Remove-Item -Recurse -Force node_modules\sharp

# 重新安装
npm install sharp
```

#### 方法三：重建 Sharp

```bash
cd backend
npm rebuild sharp
```

#### 方法四：完全清理后重新安装

```bash
cd backend
# 删除 node_modules 和 package-lock.json
rm -rf node_modules
rm package-lock.json
# 或 Windows PowerShell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# 重新安装所有依赖
npm install
```

#### 方法五：使用 npm cache 清理

```bash
cd backend
npm cache clean --force
npm uninstall sharp
npm install sharp
```

**注意事项**:
- 确保 Node.js 版本兼容（建议 Node.js 16+）
- 如果使用代理，可能需要配置 npm 代理
- 如果在公司网络环境，可能需要配置防火墙例外

### 4. 图像处理失败

**问题**: Sharp 处理图像时出现错误。

**解决方案**:
1. 检查图像格式是否支持
2. 检查图像文件是否损坏
3. 检查 Sharp 是否正确安装（应该使用预编译二进制）
4. 如果 Sharp 安装失败，参考上面的 "Sharp 模块安装失败" 解决方案

## 开发环境问题

### 1. Node.js 版本不兼容

**问题**: 某些依赖需要特定版本的 Node.js。

**解决方案**:
1. 使用 Node.js 16.x 或更高版本
2. 使用 nvm 管理 Node.js 版本：
   ```bash
   nvm install 18
   nvm use 18
   ```

### 2. 代码热重载不工作

**问题**: 修改代码后服务器不自动重启。

**解决方案**:
1. 检查 nodemon 是否已安装
2. 检查 `package.json` 中的 dev 脚本是否正确
3. 确保 nodemon 配置文件存在

## 生产环境问题

### 1. 性能问题

**问题**: 应用运行缓慢。

**解决方案**:
1. 启用生产模式：`NODE_ENV=production`
2. 使用 PM2 管理进程
3. 启用 gzip 压缩
4. 使用 CDN 加速静态资源
5. 优化数据库查询

### 2. 内存泄漏

**问题**: 应用运行一段时间后内存占用过高。

**解决方案**:
1. 检查是否有未关闭的数据库连接
2. 检查是否有内存泄漏的代码
3. 使用内存分析工具检查
4. 设置合理的 PM2 内存限制

## 获取帮助

如果以上解决方案都无法解决问题，请：
1. 查看项目 Issue 页面
2. 查看相关依赖的文档
3. 提交新的 Issue，包含详细的错误信息

