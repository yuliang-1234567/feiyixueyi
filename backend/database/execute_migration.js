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

async function executeMigration() {
  let connection;
  
  try {
    console.log('📋 开始执行数据库迁移...');
    console.log('📋 数据库配置:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database
    });

    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');

    // 读取迁移脚本
    const migrationPath = path.join(__dirname, 'migration_add_comments_likes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 读取迁移脚本:', migrationPath);

    // 执行迁移脚本
    console.log('🔄 执行迁移脚本...');
    await connection.query(migrationSQL);

    console.log('✅ 数据库迁移完成！');

    // 验证迁移结果
    console.log('🔍 验证迁移结果...');
    
    // 检查 artworks 表的字段
    const [artworkColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'artworks'
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);
    
    console.log('📊 artworks 表字段:', artworkColumns.map(c => c.COLUMN_NAME).join(', '));

    // 检查 products 表的字段
    const [productColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products'
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);
    
    console.log('📊 products 表字段:', productColumns.map(c => c.COLUMN_NAME).join(', '));

    // 检查新表是否存在
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('comments', 'product_likes', 'views')
    `, [dbConfig.database]);
    
    console.log('📊 新增表:', tables.map(t => t.TABLE_NAME).join(', '));

    console.log('✅ 迁移验证完成！');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error('❌ 错误详情:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行迁移
executeMigration();

