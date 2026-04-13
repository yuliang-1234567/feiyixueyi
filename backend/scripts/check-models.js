const { sequelize } = require('../src/config/database');
const Artwork = require('../src/models/Artwork');

async function checkModels() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 检查 Artwork 模型定义
    console.log('\n📋 Artwork 模型字段:');
    const artworkAttributes = Artwork.rawAttributes;
    Object.keys(artworkAttributes).forEach(key => {
      console.log(`  - ${key}: ${artworkAttributes[key].type.constructor.name}`);
    });

    // 检查数据库表结构
    console.log('\n📋 数据库 artworks 表字段:');
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artworks'
      ORDER BY ORDINAL_POSITION
    `);
    
    results.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // 检查字段是否匹配
    console.log('\n🔍 字段匹配检查:');
    const modelFields = Object.keys(artworkAttributes);
    const dbFields = results.map(r => r.COLUMN_NAME);
    
    const missingInDb = modelFields.filter(f => !dbFields.includes(f));
    const missingInModel = dbFields.filter(f => !modelFields.includes(f) && f !== 'id' && f !== 'createdAt' && f !== 'updatedAt');
    
    if (missingInDb.length > 0) {
      console.log('⚠️  模型中有但数据库中没有的字段:', missingInDb);
    }
    if (missingInModel.length > 0) {
      console.log('⚠️  数据库中有但模型中没有的字段:', missingInModel);
    }
    if (missingInDb.length === 0 && missingInModel.length === 0) {
      console.log('✅ 所有字段都匹配');
    }

    // 测试创建记录
    console.log('\n🧪 测试创建记录...');
    try {
      const testArtwork = await Artwork.create({
        title: 'Test Artwork',
        description: 'Test',
        imageUrl: '/test.jpg',
        category: '其他',
        authorId: 1,
        status: 'published'
      });
      console.log('✅ 测试创建成功，ID:', testArtwork.id);
      
      // 删除测试记录
      await testArtwork.destroy({ force: true });
      console.log('✅ 测试记录已删除');
    } catch (error) {
      console.error('❌ 测试创建失败:', error.message);
      console.error('❌ 错误详情:', error);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await sequelize.close();
  }
}

checkModels();

