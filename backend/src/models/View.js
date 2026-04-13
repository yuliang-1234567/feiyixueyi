const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const View = sequelize.define('View', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  targetType: {
    type: DataTypes.ENUM('artwork', 'product'),
    allowNull: false
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'views',
  timestamps: true, // 启用时间戳
  updatedAt: false, // 禁用 updatedAt，浏览记录不需要更新时间
  createdAt: true,  // 启用 createdAt
  indexes: [
    {
      fields: ['targetType', 'targetId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['ipAddress']
    }
  ]
});

module.exports = View;

