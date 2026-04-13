const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
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
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  shippingName: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  shippingPhone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  shippingAddress: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  shippingCity: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  shippingProvince: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  shippingZipCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'orders'
});

module.exports = Order;
