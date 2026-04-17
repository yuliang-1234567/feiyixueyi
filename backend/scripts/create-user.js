/**
 * 创建测试用户脚本
 * 用于在数据库中创建测试用户
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');

async function createTestUser() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 导入模型
    require('../src/models');

    // 创建测试用户
    const testUsers = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin666',
        role: 'admin'
      },
      {
        username: 'artist1',
        email: 'artist1@example.com',
        password: 'admin123',
        role: 'artist'
      },
      {
        username: 'user1',
        email: 'user1@example.com',
        password: 'admin123',
        role: 'user'
      }
    ];

    for (const userData of testUsers) {
      try {
        // 检查用户是否已存在
        const existingUser = await User.findOne({
          where: {
            email: userData.email
          }
        });

        if (existingUser) {
          if (userData.email === 'admin@example.com') {
            existingUser.password = userData.password;
            existingUser.role = 'admin';
            existingUser.username = userData.username;
            await existingUser.save();
            console.log(`✅ 管理员账号已更新: ${userData.email} (${userData.role})`);
          } else {
            console.log(`⚠️  用户 ${userData.email} 已存在，跳过创建`);
          }
        } else {
          // 创建用户（密码会在 hook 中自动加密）
          const user = await User.create(userData);
          console.log(`✅ 创建用户成功: ${user.email} (${user.role})`);
        }
      } catch (error) {
        console.error(`❌ 创建用户 ${userData.email} 失败:`, error.message);
      }
    }

    console.log('\n✅ 测试用户创建完成');
    console.log('\n📋 测试账号信息:');
    console.log('   管理员: admin@example.com / admin666');
    console.log('   艺术家: artist1@example.com / admin123');
    console.log('   普通用户: user1@example.com / admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

createTestUser();

