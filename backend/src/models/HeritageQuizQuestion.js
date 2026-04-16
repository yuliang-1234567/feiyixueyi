const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HeritageQuizQuestion = sequelize.define('HeritageQuizQuestion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  questionType: {
    type: DataTypes.ENUM('single', 'multiple', 'judge'),
    allowNull: false,
    defaultValue: 'single'
  },
  stem: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  optionA: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  optionB: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  optionC: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  optionD: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  optionE: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  optionF: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  correctOption: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D'),
    allowNull: true
  },
  correctAnswer: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'A'
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sourceType: {
    type: DataTypes.ENUM('ai', 'official', 'competition'),
    allowNull: false,
    defaultValue: 'ai'
  },
  sourceRef: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'published'
  }
}, {
  tableName: 'heritage_quiz_questions',
  indexes: [
    {
      fields: ['status', 'categoryId', 'difficulty']
    },
    {
      fields: ['sourceType']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = HeritageQuizQuestion;
