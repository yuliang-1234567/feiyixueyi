const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HeritageQuizSessionAnswer = sequelize.define('HeritageQuizSessionAnswer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'heritage_quiz_sessions',
      key: 'id'
    }
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'heritage_quiz_questions',
      key: 'id'
    }
  },
  selectedOption: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  }
}, {
  tableName: 'heritage_quiz_session_answers',
  indexes: [
    {
      unique: true,
      fields: ['sessionId', 'questionId']
    },
    {
      fields: ['questionId']
    }
  ]
});

module.exports = HeritageQuizSessionAnswer;
