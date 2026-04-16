// 定义所有模型的关联关系
const User = require('./User');
const Artwork = require('./Artwork');
const ArtworkLike = require('./ArtworkLike');
const Product = require('./Product');
const ProductRating = require('./ProductRating');
const ProductLike = require('./ProductLike');
const Comment = require('./Comment');
const View = require('./View');
const Order = require('./Order');
const ARContent = require('./ARContent');
const Master = require('./Master');
const News = require('./News');
const Subscription = require('./Subscription');
const HeritageQaMessage = require('./HeritageQaMessage');
const HeritageQuizQuestion = require('./HeritageQuizQuestion');
const HeritageQuizSession = require('./HeritageQuizSession');
const HeritageQuizSessionAnswer = require('./HeritageQuizSessionAnswer');

// User 关联
User.hasMany(Artwork, { foreignKey: 'authorId', as: 'artworks' });
User.hasMany(ArtworkLike, { foreignKey: 'userId', as: 'artworkLikes' });
User.hasMany(Product, { foreignKey: 'creatorId', as: 'products' });
User.hasMany(ProductRating, { foreignKey: 'userId', as: 'productRatings' });
User.hasMany(ProductLike, { foreignKey: 'userId', as: 'productLikes' });
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
User.hasMany(HeritageQaMessage, { foreignKey: 'userId', as: 'heritageQaMessages' });
User.hasMany(HeritageQuizSession, { foreignKey: 'userId', as: 'heritageQuizSessions' });

// Artwork 关联
Artwork.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Artwork.hasMany(ArtworkLike, { foreignKey: 'artworkId', as: 'likes' });
Artwork.hasMany(Product, { foreignKey: 'patternId', as: 'products' });
Artwork.hasMany(Comment, { 
  foreignKey: 'targetId', 
  as: 'comments',
  scope: { targetType: 'artwork' }
});

// ArtworkLike 关联
ArtworkLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ArtworkLike.belongsTo(Artwork, { foreignKey: 'artworkId', as: 'artwork' });

// Product 关联
Product.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });
Product.belongsTo(Artwork, { foreignKey: 'patternId', as: 'pattern' });
Product.hasMany(ProductRating, { foreignKey: 'productId', as: 'ratings' });
Product.hasMany(ProductLike, { foreignKey: 'productId', as: 'likes' });
Product.hasMany(Comment, { 
  foreignKey: 'targetId', 
  as: 'comments',
  scope: { targetType: 'product' }
});

// ProductRating 关联
ProductRating.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ProductRating.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// ProductLike 关联
ProductLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ProductLike.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Comment 关联
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'parent' });
Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'replies' });
// Comment 与 Artwork/Product 的关联
Comment.belongsTo(Artwork, {
  foreignKey: 'targetId',
  as: 'artwork',
  constraints: false,
  scope: { targetType: 'artwork' }
});
Comment.belongsTo(Product, {
  foreignKey: 'targetId',
  as: 'product',
  constraints: false,
  scope: { targetType: 'product' }
});

// View 关联
View.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Order 关联
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Heritage QA / Quiz 关联
HeritageQaMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

HeritageQuizSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
HeritageQuizSession.hasMany(HeritageQuizSessionAnswer, {
  foreignKey: 'sessionId',
  as: 'answers'
});

HeritageQuizSessionAnswer.belongsTo(HeritageQuizSession, {
  foreignKey: 'sessionId',
  as: 'session'
});
HeritageQuizSessionAnswer.belongsTo(HeritageQuizQuestion, {
  foreignKey: 'questionId',
  as: 'question'
});
HeritageQuizQuestion.hasMany(HeritageQuizSessionAnswer, {
  foreignKey: 'questionId',
  as: 'sessionAnswers'
});

module.exports = {
  User,
  Artwork,
  ArtworkLike,
  Product,
  ProductRating,
  ProductLike,
  Comment,
  View,
  Order,
  ARContent,
  Master,
  News,
  Subscription,
  HeritageQaMessage,
  HeritageQuizQuestion,
  HeritageQuizSession,
  HeritageQuizSessionAnswer
};

