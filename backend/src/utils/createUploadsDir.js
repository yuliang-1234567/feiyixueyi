const fs = require('fs');
const path = require('path');

const uploadsDirs = [
  'uploads',
  'uploads/artworks',
  'uploads/temp',
  'uploads/products',
  'uploads/patterns'
];

uploadsDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '../../', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 创建目录: ${dir}`);
  }
});

console.log('✅ 上传目录初始化完成');

