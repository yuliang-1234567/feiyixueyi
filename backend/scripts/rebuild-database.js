const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'ihc',
  multipleStatements: true
};

async function rebuildDatabase() {
  let connection;
  
  try {
    console.log('📋 开始重建数据库...');
    console.log('📋 数据库配置:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database
    });

    // 连接到 MySQL 服务器（不指定数据库）
    const serverConfig = { ...dbConfig };
    delete serverConfig.database;
    connection = await mysql.createConnection(serverConfig);
    console.log('✅ MySQL 服务器连接成功');

    // 读取重建脚本
    const scriptPath = path.join(__dirname, '../database/rebuild_database.sql');
    const sql = fs.readFileSync(scriptPath, 'utf8');

    console.log('📄 读取重建脚本:', scriptPath);
    console.log('🔄 执行重建脚本...');
    console.log('⚠️  警告：此操作将删除现有数据库！');

    // 执行重建脚本
    await connection.query(sql);

    console.log('✅ 数据库重建完成！');

    // 验证重建结果
    console.log('🔍 验证重建结果...');
    
    // 连接到新数据库
    await connection.end();
    connection = await mysql.createConnection(dbConfig);
    
    // 检查表
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📊 创建的表:', tables.map(t => Object.values(t)[0]).join(', '));

    // 检查用户
    const [users] = await connection.query('SELECT username, email, role FROM users');
    console.log('👥 测试用户:');
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - ${user.role}`);
    });

    // 检查 artworks 表字段
    const [artworkColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'artworks'
      AND COLUMN_NAME IN ('likesCount', 'commentsCount', 'status', 'deletedAt')
    `, [dbConfig.database]);
    console.log('📊 artworks 表关键字段:', artworkColumns.map(c => c.COLUMN_NAME).join(', '));

    // 检查 products 表字段
    const [productColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products'
      AND COLUMN_NAME IN ('views', 'likesCount', 'commentsCount', 'rating', 'deletedAt')
    `, [dbConfig.database]);
    console.log('📊 products 表关键字段:', productColumns.map(c => c.COLUMN_NAME).join(', '));

    console.log('✅ 数据库重建验证完成！');
    console.log('📌 下一步：重启后端服务器');

  } catch (error) {
    console.error('❌ 重建失败:', error.message);
    console.error('❌ 错误详情:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行重建
rebuildDatabase();

