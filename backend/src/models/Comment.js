const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Comment = sequelize.define('Comment', {
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
  targetType: {
    type: DataTypes.ENUM('artwork', 'product'),
    allowNull: false
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'comments',
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'deleted', 'hidden'),
    defaultValue: 'active'
  }
}, {
  tableName: 'comments',
  indexes: [
    {
      fields: ['targetType', 'targetId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['parentId']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = Comment;

