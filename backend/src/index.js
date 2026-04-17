const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');

// 加载环境变量
dotenv.config();

// 创建上传目录
require('./utils/createUploadsDir');

const app = express();
// 信任 Nginx 反向代理，确保 req.protocol 可正确识别为 https
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: function (origin, callback) {
    // 允许的源列表
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:3001',
      'http://localhost:3000',
      // 可以添加小程序等其他来源
    ];
    // 允许无来源的请求（如移动应用、Postman等）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // 开发环境允许所有来源，生产环境应该严格限制
    }
  },
  credentials: true
}));

// 添加Cross-Origin-Embedder-Policy和Cross-Origin-Opener-Policy头信息，解决SharedArrayBuffer弃用警告
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});
// 增加请求体大小限制，支持大文件上传
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/artworks', require('./routes/artworks'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/ai', require('./routes/ai'));
app.use('/', require('./routes/upload'));
app.use('/api', require('./routes/upload'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/ar', require('./routes/ar'));
app.use('/api/home', require('./routes/home'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/news', require('./routes/news'));
app.use('/api/admin', require('./routes/admin'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '非遗平台API服务运行正常' });
});

// 连接数据库并启动服务器
const startServer = async () => {
  try {
    // 检查环境变量
    console.log('📋 环境配置:');
    console.log('   PORT:', process.env.PORT || 3000);
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('   DB_HOST:', process.env.DB_HOST || 'localhost');
    console.log('   DB_USER:', process.env.DB_USER || '❌ 未设置');
    console.log('   DB_NAME:', process.env.DB_NAME || 'ihc');
    console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '已设置' : '❌ 未设置');
    
    if (!process.env.JWT_SECRET) {
      console.error('❌ 错误: JWT_SECRET 未设置，请在 .env 文件中配置');
      console.error('   示例: JWT_SECRET=your-secret-key-change-this-in-production');
      process.exit(1);
    }

    await testConnection();
    
    // 导入所有模型以初始化关联关系
    require('./models');
    
    // 同步数据库模型（开发环境，生产环境不应使用）
    if (process.env.NODE_ENV === 'development' && process.env.SYNC_DB === 'true') {
      await sequelize.sync({ alter: false });
      console.log('✅ 数据库模型同步完成');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📡 API 端点: http://localhost:${PORT}/api`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('❌ 错误:', err);
  
  // 处理 Multer 文件上传错误
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件过大，最大支持 50MB，请压缩图片后重试'
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '文件数量超出限制，请确保只上传一个文件'
      });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: '意外的文件字段，请检查上传的文件字段名是否正确'
      });
    } else if (err.code === 'LIMIT_FIELD_COUNT') {
      return res.status(400).json({
        success: false,
        message: '表单字段数量超出限制'
      });
    } else if (err.code === 'LIMIT_FIELD_KEY') {
      return res.status(400).json({
        success: false,
        message: '表单字段名过长'
      });
    } else if (err.code === 'LIMIT_FIELD_VALUE') {
      return res.status(400).json({
        success: false,
        message: '表单字段值过大'
      });
    } else if (err.code === 'LIMIT_PART_COUNT') {
      return res.status(400).json({
        success: false,
        message: '表单部分数量超出限制'
      });
    }
  }
  
  // 处理文件类型错误
  if (err.message && err.message.includes('只支持图片格式')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  // 处理其他错误
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;

