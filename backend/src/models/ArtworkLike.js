const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ArtworkLike = sequelize.define('ArtworkLike', {
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
  artworkId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'artworks',
      key: 'id'
    }
  }
}, {
  tableName: 'artwork_likes',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'artworkId']
    }
  ]
});

module.exports = ArtworkLike;

