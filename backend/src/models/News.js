const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const News = sequelize.define('News', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: ''
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  excerpt: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  author: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'hidden'),
    defaultValue: 'published'
  },
  publishDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'news'
});

module.exports = News;
