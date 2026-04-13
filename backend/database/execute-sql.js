/**
 * 执行 SQL 脚本的 Node.js 脚本
 * 使用方法: node database/execute-sql.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function executeSQL() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      multipleStatements: true
    });

    console.log('✅ 已连接到 MySQL 服务器');

    // 读取 SQL 文件
    const sqlFile = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 执行 SQL
    console.log('📝 正在执行 SQL 脚本...');
    await connection.query(sql);
    
    console.log('✅ SQL 脚本执行成功！');
    console.log('✅ 数据库和表已创建');
    
  } catch (error) {
    console.error('❌ 执行 SQL 脚本失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ 数据库连接已关闭');
    }
  }
}

executeSQL();

