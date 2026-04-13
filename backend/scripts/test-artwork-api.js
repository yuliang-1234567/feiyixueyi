const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function testArtworkAPI() {
  try {
    console.log('🔍 测试作品API...\n');
    
    // 1. 获取作品列表
    console.log('1. 获取作品列表...');
    const listResponse = await axios.get(`${API_URL}/artworks`, {
      params: { page: 1, limit: 5, status: 'published' }
    });
    
    if (listResponse.data.success) {
      console.log(`✅ 成功获取 ${listResponse.data.data.artworks.length} 个作品`);
      const artworks = listResponse.data.data.artworks;
      
      if (artworks.length > 0) {
        const firstArtwork = artworks[0];
        console.log('\n第一个作品信息:');
        console.log('  - ID:', firstArtwork.id);
        console.log('  - 标题:', firstArtwork.title);
        console.log('  - 图片URL:', firstArtwork.imageUrl);
        console.log('  - 完整图片URL:', `http://localhost:3000${firstArtwork.imageUrl}`);
        console.log('  - 作者:', firstArtwork.author?.username);
        console.log('  - 点赞数:', firstArtwork.likesCount);
        console.log('  - 评论数:', firstArtwork.commentsCount);
        console.log('  - 浏览数:', firstArtwork.views);
        
        // 2. 获取作品详情
        console.log('\n2. 获取作品详情...');
        const detailResponse = await axios.get(`${API_URL}/artworks/${firstArtwork.id}`);
        
        if (detailResponse.data.success) {
          const artwork = detailResponse.data.data.artwork;
          console.log('✅ 成功获取作品详情');
          console.log('  - 标题:', artwork.title);
          console.log('  - 图片URL:', artwork.imageUrl);
          console.log('  - 完整图片URL:', `http://localhost:3000${artwork.imageUrl}`);
          console.log('  - 描述:', artwork.description?.substring(0, 50) + '...');
          console.log('  - 作者:', artwork.author?.username);
          console.log('  - 点赞数:', artwork.likesCount);
          console.log('  - 评论数:', artwork.commentsCount);
          console.log('  - 浏览数:', artwork.views);
          
          // 3. 测试图片URL是否可访问
          console.log('\n3. 测试图片URL是否可访问...');
          try {
            const imageUrl = `http://localhost:3000${artwork.imageUrl}`;
            const imageResponse = await axios.head(imageUrl, { timeout: 5000 });
            console.log('✅ 图片URL可访问，状态码:', imageResponse.status);
          } catch (imageError) {
            console.log('❌ 图片URL不可访问:', imageError.message);
            console.log('   图片路径:', artwork.imageUrl);
          }
        } else {
          console.log('❌ 获取作品详情失败:', detailResponse.data.message);
        }
      } else {
        console.log('⚠️ 没有作品数据');
      }
    } else {
      console.log('❌ 获取作品列表失败:', listResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   错误信息:', error.response.data);
    }
  }
}

testArtworkAPI();

