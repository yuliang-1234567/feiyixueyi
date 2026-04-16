const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const dbName = process.env.DB_NAME || 'ihc';
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 3306;

if (!dbUser || !dbPassword) {
  throw new Error('DB_USER 或 DB_PASSWORD 未配置，已停止启动。请检查 backend/.env');
}

// 创建 Sequelize 实例
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  dialectOptions: {
    charset: 'utf8mb4',
  },
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true
  },
  timezone: '+08:00' // 设置时区为东八区
});

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL数据库连接成功');
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error.message);
    throw error;
  }
};

module.exports = { sequelize, testConnection };

