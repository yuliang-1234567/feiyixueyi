const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductLike = sequelize.define('ProductLike', {
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
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  }
}, {
  tableName: 'product_likes',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'productId']
    },
    {
      fields: ['productId']
    }
  ]
});

module.exports = ProductLike;

