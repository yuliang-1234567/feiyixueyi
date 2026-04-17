const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HeritageQuizFavorite = sequelize.define('HeritageQuizFavorite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'heritage_quiz_questions',
      key: 'id',
    },
  },
}, {
  tableName: 'heritage_quiz_favorites',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'questionId'],
    },
    {
      fields: ['userId', 'createdAt'],
    },
    {
      fields: ['questionId'],
    },
  ],
});

module.exports = HeritageQuizFavorite;
