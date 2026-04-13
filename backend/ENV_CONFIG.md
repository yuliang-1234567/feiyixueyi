# 环境变量配置说明

## 创建 .env 文件

在 `backend` 目录下创建 `.env` 文件，内容如下：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置（MySQL）
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ihc
DB_USER=root
DB_PASSWORD=123456

# JWT配置
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d

# OpenAI API配置（用于AI功能）
OPENAI_API_KEY=your_openai_api_key_here

# DeepSeek API配置（用于AI学艺的智能建议生成，可选）
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Qwen API配置（推荐：用于AI学艺主分析）
QWEN_API_KEY=your_qwen_api_key_here
QWEN_MODEL=qwen3.6-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_IMAGE_MODEL=qwen-image-edit-plus
QWEN_IMAGE_MODEL_CHAIN=qwen-image-edit-plus,wanx-v1,wan2.6-image

# 即梦AI / 火山引擎配置（用于数字焕新图生图 / 文生图）
# 必填：在火山引擎控制台创建访问密钥并填入
VOLCENGINE_ACCESS_KEY=your_volcengine_ak_here
VOLCENGINE_SECRET_KEY=your_volcengine_sk_here
# 可选：当使用临时安全凭证（STS）时，对应的安全令牌
VOLCENGINE_TOKEN=your_volcengine_security_token_here

# 可选：区域与网关，通常保持默认即可
# 区域，例如 cn-north-1、cn-beijing 等，具体以控制台为准
VOLCENGINE_REGION=cn-north-1
# 即梦AI网关，可用 VOLCENGINE_ENDPOINT 或 VOLCENGINE_JIMENG_ENDPOINT，建议使用官方推荐域名
VOLCENGINE_ENDPOINT=https://visual.volcengineapi.com
# 或使用以下变量（二者任一即可）
# VOLCENGINE_JIMENG_ENDPOINT=https://visual.volcengineapi.com
# 服务名，图像生成一般为 visual
VOLCENGINE_SERVICE=visual

# CORS配置
CORS_ORIGIN=http://localhost:3001

# 微信小程序配置
MINIPROGRAM_APPID=your_miniprogram_appid
MINIPROGRAM_SECRET=your_miniprogram_secret
```

## 配置说明

- **PORT**: 后端服务端口，默认 3000
- **DB_HOST**: MySQL 数据库主机地址（默认 localhost）
- **DB_PORT**: MySQL 数据库端口（默认 3306）
- **DB_NAME**: 数据库名称（默认 ihc）
- **DB_USER**: 数据库用户名（默认 root）
- **DB_PASSWORD**: 数据库密码（默认 123456）
- **JWT_SECRET**: JWT 密钥，生产环境请使用强随机字符串
- **OPENAI_API_KEY**: OpenAI API 密钥，用于 AI 功能（可选）
- **DEEPSEEK_API_KEY**: DeepSeek API 密钥，用于 AI 学艺的智能建议生成（可选，未配置时使用静态建议）
- **QWEN_API_KEY**: 阿里 DashScope 的 API Key，用于 AI 学艺主分析（推荐）
- **QWEN_MODEL**: Qwen 模型名，默认 `qwen3.6-plus`
- **QWEN_BASE_URL**: Qwen OpenAI 兼容接口地址，默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- **QWEN_IMAGE_MODEL**: 数字焕新图像增强模型，默认 `qwen-image-edit-plus`（AI 失败自动回退本地算法融合）
- **QWEN_IMAGE_MODEL_CHAIN**: 数字焕新视觉模型调用顺序（逗号分隔）。默认按性能顺序：`qwen-image-edit-plus,wanx-v1,wan2.6-image`，前一模型失败时自动尝试下一模型。
- **VOLCENGINE_ACCESS_KEY/SECRET_KEY**: 火山引擎访问密钥，用于即梦图生图/文生图接口签名，部署前必填
- **VOLCENGINE_TOKEN**: 可选安全令牌，当使用 STS 临时访问凭证时需要一并配置
- **VOLCENGINE_REGION**: 签名时使用的区域，例如 cn-north-1，默认即可
- **VOLCENGINE_ENDPOINT** 或 **VOLCENGINE_JIMENG_ENDPOINT**: 即梦AI网关地址，例如 `https://visual.volcengineapi.com`
- **VOLCENGINE_SERVICE**: 服务名，图像生成一般为 visual
- **CORS_ORIGIN**: 允许的跨域来源
- **MINIPROGRAM_APPID/SECRET**: 微信小程序配置（可选）

## Web 端配置

在 `web` 目录下创建 `.env` 文件：

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_UPLOAD_URL=http://localhost:3000/uploads
```

## 数字焕新（算法融合）接口与样机配置

数字焕新使用**后台算法**将纹样图与产品样机图融合生成预览，不依赖即梦等外部 AI 服务。

### 样机资源目录

- **路径**: `backend/uploads/product-templates/`
- 首次请求时若目录下无 `default.png`，后端会自动生成一张默认灰底图作为通用样机。
- 可按产品类型放置对应样机图，文件名与类型映射如下（未配置时回退使用 `default.png`）：

| 产品类型 | 文件名 |
|----------|--------|
| T恤 | tshirt.png |
| 手机壳 | phone-case.png |
| 帆布袋 | bag.png |
| 明信片 | postcard.png |
| 马克杯 | mug.png |
| 其他 | default.png |

### 接口说明

- **请求方式**: `POST /api/ai/transform`
- **鉴权**: 需要携带登录后的 JWT（`Authorization: Bearer <token>`）
- **Content-Type**: `multipart/form-data`

### 请求体字段

- **pattern**（**必填**，`File`）: 纹样图片文件，支持 `jpeg/jpg/png/gif/webp`，最大 50MB。算法融合必须提供纹样图。
- **productType**（可选，`string`）: 产品类型，用于选择样机与合成参数，如 `"T恤" | "手机壳" | "帆布袋" | "明信片" | "马克杯" | "其他"`，缺省为 `"其他"`。
- **config**（可选，`string | JSON`）: 融合参数透传（如 scaleRatio、opacity 等），见后端 `PRODUCT_CONFIGS` 与 `applyStyleTransfer` 的 customConfig。

### 返回结果

成功时返回：

```json
{
  "success": true,
  "message": "生成产品图成功",
  "data": {
    "transformedImageUrl": "/uploads/artworks/xxx.png",
    "productType": "手机壳"
  }
}
```

- **transformedImageUrl**: 融合图访问路径，前端拼接为 `http://<backend-host>:<port> + transformedImageUrl` 展示。
- **productType**: 实际使用的产品类型。

失败时返回：

- `400`：未上传纹样或文件过大等参数错误。
- `429`：请求过于频繁（每用户每分钟最多 10 次）。
- `503`：缺少样机资源（未配置 default.png 且自动创建失败）。
- `500`：服务器内部错误（如 Sharp 合成失败）。



