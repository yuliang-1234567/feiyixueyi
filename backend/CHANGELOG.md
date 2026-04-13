# 更新日志

## 2024-11-10

### 修复
- **移除 TensorFlow.js Node 依赖**: 解决了在 Windows 上安装 `@tensorflow/tfjs-node` 时出现的编译错误问题
  - 原因：`@tensorflow/tfjs-node` 在 Windows 上需要 Visual Studio 和 C++ 构建工具才能编译
  - 解决方案：移除该依赖，后端仅使用 Sharp 进行图像处理
  - 影响：AI功能主要在前端使用 TensorFlow.js 实现，后端可通过调用外部API（如 OpenAI API）实现AI处理

- **升级 Multer**: 从 1.x 升级到 2.x 版本，修复安全漏洞
  - 从 `multer@^1.4.5-lts.1` 升级到 `multer@^2.0.0`
  - API 兼容，无需修改代码

- **移除 Canvas 依赖**: 移除未使用的 `canvas` 依赖，减少安装复杂度

### 技术说明

#### 为什么移除 TensorFlow.js Node？
1. **安装复杂**: 在 Windows 上需要安装 Visual Studio 和 C++ 构建工具
2. **未实际使用**: 代码中虽然引入了 TensorFlow，但实际未使用
3. **替代方案**: 
   - 前端使用 TensorFlow.js（浏览器版本，无需编译）
   - 后端使用 Sharp 进行图像处理（有预编译二进制）
   - 复杂的AI处理可通过调用外部API实现

#### 当前架构
- **前端**: 使用 TensorFlow.js 进行客户端AI处理
- **后端**: 使用 Sharp 进行图像处理和预处理
- **AI服务**: 可通过 OpenAI API 或其他AI服务API实现高级功能

### 依赖变更

#### 移除
- `@tensorflow/tfjs-node@^4.10.0`
- `canvas@^2.11.2`

#### 升级
- `multer@^1.4.5-lts.1` → `multer@^2.0.0`

#### 保留
- `sharp@^0.32.6` - 图像处理（有预编译二进制，安装简单）
- `openai@^4.10.0` - OpenAI API 客户端（可选，用于AI功能）

### 安装说明

现在安装依赖应该不会出现问题：

```bash
cd backend
npm install
```

如果遇到问题，请查看 [故障排除指南](./TROUBLESHOOTING.md)。

