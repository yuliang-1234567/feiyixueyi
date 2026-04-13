# 小程序工具类说明

## API工具 (api.js)

统一处理API请求和错误处理。

### 使用方法

```javascript
const api = require('../../utils/api.js');

// GET请求
const res = await api.get('/artworks', { page: 1, limit: 20 });

// POST请求
const res = await api.post('/auth/login', { email: 'demo@example.com', password: '123456' });

// 构建图片URL
const imageUrl = api.getImageUrl('/uploads/artworks/xxx.jpg');
```

### API基础URL配置

在 `app.js` 中配置：
```javascript
globalData: {
  apiUrl: 'http://localhost:3000/api'  // 开发环境
  // apiUrl: 'https://your-domain.com/api'  // 生产环境
}
```

## 图标使用说明

由于微信小程序不支持iconfont，我们使用以下方式：

1. **Emoji图标**：直接在代码中使用emoji，如 `❤️`、`⭐`、`📦` 等
2. **图片图标**：使用图片作为图标（需要准备图标图片）
3. **文字图标**：使用特殊字符作为图标

### TabBar图标

TabBar图标需要图片文件，路径在 `app.json` 中配置：
- `images/icons/home.png` - 首页图标
- `images/icons/home-active.png` - 首页激活图标
- 其他类似

如果没有图标图片，可以暂时使用文字或emoji。

