const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  category: {
    type: DataTypes.ENUM('T恤', '手机壳', '帆布袋', '明信片', '其他'),
    allowNull: false
  },
  patternId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'artworks',
      key: 'id'
    }
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'sold_out'),
    defaultValue: 'draft'
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  sales: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // 新增字段：产品详情页所需
  material: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '材质'
  },
  size: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '尺寸'
  },
  origin: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '产地'
  },
  craftsmanship: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '工艺传承描述'
  },
  culturalMeaning: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '文化寓意描述'
  },
  violationStatus: {
    type: DataTypes.ENUM('normal', 'suspected', 'confirmed'),
    allowNull: false,
    defaultValue: 'normal',
    comment: '违规状态'
  },
  reviewStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'reopened'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '复审状态'
  },
  reviewReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '复审备注'
  },
  offlineReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '违规下架原因'
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '审核管理员ID'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '审核时间'
  },
  rejectCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '被驳回次数'
  }
}, {
  tableName: 'products',
  paranoid: true, // 启用软删除
  deletedAt: 'deletedAt'
});

module.exports = Product;
