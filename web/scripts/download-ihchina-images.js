/**
 * 下载 ihchina.cn 网站的图片资源
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 创建目标目录
const targetDir = path.join(__dirname, '../public/images/ihchina');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// page2 中的10个类别背景图片（book-item 背景）
const categoryBackgrounds = [
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b1.png', name: 'b1.png' },
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b2.png', name: 'b2.png' },
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b3.png', name: 'b3.png' },
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b4.png', name: 'b4.png' },
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b5.png', name: 'b5.png' },
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b6.png', name: 'b6.png' },
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b7.png', name: 'b7.png' },
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b8.png', name: 'b8.png' },
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b9.png', name: 'b9.png' },
  { url: 'https://www.ihchina.cn/Public/static/themes/image/temp/b10.png', name: 'b10.png' }
];

// page2 中的其他图片
const categoryImages = [
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/11/14/s5beb9247da49c.png', name: 'category-main.png' },
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3fe7402c29.png', name: 'category-01.png' },
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3febe562a2.png', name: 'category-02.png' },
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3fedf4c187.png', name: 'category-03.png' },
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3fef5cd130.png', name: 'category-04.png' },
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3ff1e8ce35.png', name: 'category-05.png' },
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3ff35cc42c.png', name: 'category-06.png' },
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3ff4c5330e.png', name: 'category-07.png' },
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3ff60e7149.png', name: 'category-08.png' },
  { url: 'https://www.ihchina.cn/Uploads/Picture/2018/10/27/s5bd3ff751828b.png', name: 'category-09.png' }
];

const allImages = [...categoryBackgrounds, ...categoryImages];

// 下载函数
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ 下载成功: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      console.error(`❌ 下载失败: ${url}`, err.message);
      reject(err);
    });
  });
}

// 下载所有图片
async function downloadAll() {
  console.log('开始下载图片资源...\n');
  
  for (const item of allImages) {
    const filepath = path.join(targetDir, item.name);
    try {
      await downloadFile(item.url, filepath);
    } catch (error) {
      console.error(`下载 ${item.name} 失败:`, error.message);
    }
  }
  
  console.log('\n下载完成！');
}

downloadAll();
