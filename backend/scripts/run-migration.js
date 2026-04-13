const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'ihc'
};

const migrationFile = path.join(__dirname, '../database/simple_migration.sql');

console.log('📋 开始执行数据库迁移...');
console.log('📋 数据库:', dbConfig.database);
console.log('📋 迁移文件:', migrationFile);

// 检查迁移文件是否存在
if (!fs.existsSync(migrationFile)) {
  console.error('❌ 迁移文件不存在:', migrationFile);
  process.exit(1);
}

// 构建 MySQL 命令
const command = `mysql -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} < "${migrationFile}"`;

console.log('🔄 执行迁移命令...');

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error('❌ 错误输出:', stderr);
    
    // 如果是字段已存在的错误，可以忽略
    if (stderr.includes('Duplicate column name')) {
      console.log('⚠️  字段已存在，跳过...');
      console.log('✅ 迁移完成（部分字段可能已存在）');
    } else {
      process.exit(1);
    }
  } else {
    console.log('✅ 迁移完成！');
    if (stdout) {
      console.log('📄 输出:', stdout);
    }
  }
});

