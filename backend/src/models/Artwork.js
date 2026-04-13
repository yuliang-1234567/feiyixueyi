const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Artwork = sequelize.define('Artwork', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('剪纸', '刺绣', '泥塑', '其他'),
    allowNull: false
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  aiSimilarity: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  aiAccuracy: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  aiSuggestions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'hidden'),
    defaultValue: 'published'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'artworks',
  paranoid: true, // 启用软删除
  deletedAt: 'deletedAt'
});

module.exports = Artwork;
