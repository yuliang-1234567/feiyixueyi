const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIInvocationLog = sequelize.define('AIInvocationLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  feature: {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: 'unknown',
  },
  endpoint: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  provider: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  model: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  latencyMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  downgraded: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  costCny: {
    type: DataTypes.DECIMAL(12, 6),
    allowNull: false,
    defaultValue: 0,
  },
  errorReason: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
}, {
  tableName: 'ai_invocation_logs',
  indexes: [
    { fields: ['createdAt'] },
    { fields: ['feature', 'createdAt'] },
    { fields: ['model', 'createdAt'] },
    { fields: ['provider', 'createdAt'] },
    { fields: ['success', 'createdAt'] },
    { fields: ['downgraded', 'createdAt'] },
  ],
});

module.exports = AIInvocationLog;
