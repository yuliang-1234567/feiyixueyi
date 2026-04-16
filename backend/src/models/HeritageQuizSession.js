const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HeritageQuizSession = sequelize.define('HeritageQuizSession', {
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
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: false,
    defaultValue: 'medium'
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  answeredQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'abandoned'),
    allowNull: false,
    defaultValue: 'in_progress'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'heritage_quiz_sessions',
  indexes: [
    {
      fields: ['userId', 'createdAt']
    },
    {
      fields: ['status', 'createdAt']
    }
  ]
});

module.exports = HeritageQuizSession;
