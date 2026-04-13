/**
 * 修复 Sharp 模块安装问题的脚本
 * 使用方法: node scripts/fix-sharp.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 开始修复 Sharp 模块...\n');

const backendDir = path.join(__dirname, '..');
const nodeModulesSharp = path.join(backendDir, 'node_modules', 'sharp');

try {
  // 1. 检查 Sharp 是否存在
  if (fs.existsSync(nodeModulesSharp)) {
    console.log('📦 删除现有的 Sharp 模块...');
    fs.rmSync(nodeModulesSharp, { recursive: true, force: true });
    console.log('✅ Sharp 模块已删除\n');
  }

  // 2. 清理 npm cache
  console.log('🧹 清理 npm cache...');
  try {
    execSync('npm cache clean --force', { stdio: 'inherit', cwd: backendDir });
    console.log('✅ npm cache 已清理\n');
  } catch (error) {
    console.log('⚠️  清理 cache 失败，继续执行...\n');
  }

  // 3. 重新安装 Sharp
  console.log('📥 重新安装 Sharp 模块...');
  console.log('   这可能需要几分钟时间，请耐心等待...\n');
  
  execSync('npm install sharp --platform=win32 --arch=x64', {
    stdio: 'inherit',
    cwd: backendDir,
    env: {
      ...process.env,
      npm_config_platform: 'win32',
      npm_config_arch: 'x64'
    }
  });

  console.log('\n✅ Sharp 模块安装完成！');
  console.log('🎉 现在可以重新启动服务器了。\n');

} catch (error) {
  console.error('\n❌ 修复失败:', error.message);
  console.log('\n请尝试手动执行以下命令:');
  console.log('1. cd backend');
  console.log('2. npm uninstall sharp');
  console.log('3. npm install sharp --platform=win32 --arch=x64');
  process.exit(1);
}

