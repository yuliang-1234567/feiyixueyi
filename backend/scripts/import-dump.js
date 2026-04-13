const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  const dumpPathArg = process.argv[2];
  if (!dumpPathArg) {
    console.error('❌ 用法: node backend/scripts/import-dump.js <dump-file-path>');
    process.exit(1);
  }

  const dumpPath = path.resolve(dumpPathArg);
  if (!fs.existsSync(dumpPath)) {
    console.error(`❌ SQL 文件不存在: ${dumpPath}`);
    process.exit(1);
  }

  const dbName = process.env.DB_NAME || 'ihc';
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log(`✅ 已连接 MySQL: ${host}:${port}`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ 已确保数据库存在: ${dbName}`);

    const sql = fs.readFileSync(dumpPath, 'utf8');
    console.log(`📝 开始导入: ${dumpPath}`);

    await connection.query(`USE \`${dbName}\`;`);
    await connection.query(sql);

    console.log('🎉 导入完成');
  } catch (error) {
    console.error('❌ 导入失败:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
