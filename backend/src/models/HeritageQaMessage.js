const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HeritageQaMessage = sequelize.define('HeritageQaMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  categoryId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'craft'
  },
  categoryName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: '传统技艺'
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  promptVersion: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'v1'
  },
  model: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  provider: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'qwen'
  },
  latencyMs: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'heritage_qa_messages',
  indexes: [
    {
      fields: ['userId', 'categoryId', 'createdAt']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = HeritageQaMessage;
