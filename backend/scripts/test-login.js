/**
 * 测试登录功能
 * 用于诊断登录问题
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function testLogin() {
  console.log('🧪 开始测试登录功能...\n');

  // 测试健康检查
  try {
    console.log('1️⃣ 测试服务器连接...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ 服务器连接正常:', healthResponse.data);
  } catch (error) {
    console.error('❌ 服务器连接失败:', error.message);
    console.error('   请确保后端服务器正在运行: npm run dev');
    return;
  }

  // 测试登录
  try {
    console.log('\n2️⃣ 测试登录接口...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'chengbo@qq.com',
      password: 'admin123'
    });

    if (loginResponse.data.success) {
      console.log('✅ 登录成功!');
      console.log('   用户:', loginResponse.data.data.user);
      console.log('   Token:', loginResponse.data.data.token.substring(0, 20) + '...');
    } else {
      console.error('❌ 登录失败:', loginResponse.data.message);
    }
  } catch (error) {
    console.error('❌ 登录请求失败:');
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误信息:', error.response.data);
    } else {
      console.error('   错误:', error.message);
    }
  }

  // 测试注册
  try {
    console.log('\n3️⃣ 测试注册接口...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      username: 'testuser_' + Date.now(),
      email: `test${Date.now()}@example.com`,
      password: 'test123456'
    });

    if (registerResponse.data.success) {
      console.log('✅ 注册成功!');
      console.log('   用户:', registerResponse.data.data.user);
    } else {
      console.error('❌ 注册失败:', registerResponse.data.message);
    }
  } catch (error) {
    console.error('❌ 注册请求失败:');
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误信息:', error.response.data);
    } else {
      console.error('   错误:', error.message);
    }
  }
}

testLogin();

