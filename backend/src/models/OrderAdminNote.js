const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderAdminNote = sequelize.define('OrderAdminNote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id',
    },
  },
  type: {
    type: DataTypes.ENUM('refund', 'after_sale'),
    allowNull: false,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
  },
  operatorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'order_admin_notes',
  indexes: [
    {
      unique: true,
      fields: ['orderId', 'type'],
    },
    {
      fields: ['orderId'],
    },
    {
      fields: ['operatorId'],
    },
  ],
});

module.exports = OrderAdminNote;
