/**
 * 验证密码哈希是否正确
 * 用于测试 bcrypt 密码哈希
 */

const bcrypt = require('bcryptjs');

// 测试密码
const testPassword = 'admin123';
// 数据库中的密码哈希
const passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

async function verifyPassword() {
  console.log('🔐 验证密码哈希...');
  console.log('   密码:', testPassword);
  console.log('   哈希:', passwordHash);
  
  try {
    const isValid = await bcrypt.compare(testPassword, passwordHash);
    if (isValid) {
      console.log('✅ 密码哈希验证成功！');
    } else {
      console.log('❌ 密码哈希验证失败！');
      console.log('   正在生成新的密码哈希...');
      
      // 生成新的密码哈希
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('   新哈希:', newHash);
      
      // 验证新哈希
      const newValid = await bcrypt.compare(testPassword, newHash);
      if (newValid) {
        console.log('✅ 新密码哈希验证成功！');
        console.log('\n📋 请使用以下 SQL 更新数据库:');
        console.log(`UPDATE users SET password = '${newHash}' WHERE email = 'admin@example.com';`);
      }
    }
  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
}

verifyPassword();

