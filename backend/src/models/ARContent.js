const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ARContent = sequelize.define('ARContent', {
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
  markerId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  markerType: {
    type: DataTypes.ENUM('image', 'object', 'location'),
    allowNull: false
  },
  markerImage: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  model3d: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  animation: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  audio: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  history: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  technique: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  culturalSignificance: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('剪纸', '刺绣', '泥塑', '其他'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'inactive'),
    defaultValue: 'draft'
  },
  scans: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'ar_contents'
});

module.exports = ARContent;
