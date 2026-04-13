const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const sourceRoot = path.join(projectRoot, 'web', 'public', 'images');
const targetRoot = path.join(projectRoot, 'backend', 'uploads', 'images');
const SOURCE_SUBDIRS = ['categories', 'works'];
const CATEGORY_FILE_ALLOWLIST = new Set([
  'background.jpg',
  'categories001.jpg', 'categories002.jpg', 'categories003.jpg', 'categories004.jpg',
  'categories005.jpg', 'categories006.jpg', 'categories007.jpg', 'categories008.jpg',
  'categories009.jpg', 'categories010.jpg', 'categories011.jpg', 'categories012.jpg',
  'categories013.jpg', 'categories014.jpg', 'categories015.jpg', 'categories016.jpg',
  'categories017.jpg', 'categories018.jpg', 'categories019.jpg', 'categories020.jpg',
  'categories021.jpg', 'categories022.jpg', 'categories023.jpg', 'categories024.jpg'
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDirectoryRecursive(src, dest, filterFn) {
  if (!fs.existsSync(src)) {
    return;
  }
  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath, filterFn);
    } else if (entry.isFile()) {
      if (!filterFn || filterFn(entry.name)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function countFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  let count = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(fullPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    console.error(`Source images directory not found: ${sourceRoot}`);
    process.exit(1);
  }

  ensureDir(targetRoot);

  for (const subDir of SOURCE_SUBDIRS) {
    const srcPath = path.join(sourceRoot, subDir);
    const targetPath = path.join(targetRoot, subDir);
    if (subDir === 'categories') {
      copyDirectoryRecursive(srcPath, targetPath, (fileName) => CATEGORY_FILE_ALLOWLIST.has(fileName));
    } else {
      copyDirectoryRecursive(srcPath, targetPath);
    }
  }

  const sourceCount = SOURCE_SUBDIRS
    .map((dirName) => countFiles(path.join(sourceRoot, dirName)))
    .reduce((sum, n) => sum + n, 0);
  const targetCount = SOURCE_SUBDIRS
    .map((dirName) => countFiles(path.join(targetRoot, dirName)))
    .reduce((sum, n) => sum + n, 0);

  console.log('Mini-program image sync completed.');
  console.log(`Source: ${sourceRoot}`);
  console.log(`Target: ${targetRoot}`);
  console.log(`Synced subdirectories: ${SOURCE_SUBDIRS.join(', ')}`);
  console.log(`Source file count: ${sourceCount}`);
  console.log(`Target file count: ${targetCount}`);
}

main();
