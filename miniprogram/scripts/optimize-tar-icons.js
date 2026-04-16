const fs = require('fs');
const path = require('path');
const sharp = require('../../backend/node_modules/sharp');

const args = process.argv.slice(2);

function getArg(name, defaultValue) {
  const index = args.findIndex((item) => item === `--${name}`);
  if (index === -1) {
    return defaultValue;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    return true;
  }
  return value;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function copyIfNeeded(srcPath, destPath) {
  try {
    await fs.promises.access(destPath, fs.constants.F_OK);
  } catch {
    await fs.promises.copyFile(srcPath, destPath);
  }
}

function parsePositiveInt(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return fallback;
  }
  return n;
}

async function optimizeOne(inputPath, outputPath, options) {
  const pipeline = sharp(inputPath)
    .resize(options.size, options.size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: true
    });

  if (options.mode === 'lossless') {
    await pipeline
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        effort: 10
      })
      .toFile(outputPath);
    return;
  }

  await pipeline
    .png({
      palette: true,
      quality: options.quality,
      effort: 10,
      compressionLevel: 9,
      colors: options.colors
    })
    .toFile(outputPath);
}

async function main() {
  const size = parsePositiveInt(getArg('size', 128), 128);
  const modeRaw = String(getArg('mode', 'lossy')).toLowerCase();
  const mode = modeRaw === 'lossless' ? 'lossless' : 'lossy';
  const quality = parsePositiveInt(getArg('quality', 82), 82);
  const colors = parsePositiveInt(getArg('colors', 256), 256);

  const iconDir = path.join(__dirname, '..', 'images', 'tar_icon');
  const backupDir = path.join(iconDir, '_backup_original');

  const entries = await fs.promises.readdir(iconDir, { withFileTypes: true });
  const pngFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith('.png'));

  if (pngFiles.length === 0) {
    console.log('No PNG files found in tar_icon.');
    return;
  }

  await ensureDir(backupDir);

  let totalBefore = 0;
  let totalAfter = 0;

  console.log(`Optimizing ${pngFiles.length} files in mode=${mode}, size=${size}x${size}...`);

  for (const filename of pngFiles) {
    const inputPath = path.join(iconDir, filename);
    const backupPath = path.join(backupDir, filename);

    const statBefore = await fs.promises.stat(inputPath);
    totalBefore += statBefore.size;

    await copyIfNeeded(inputPath, backupPath);
    await optimizeOne(backupPath, inputPath, { size, mode, quality, colors });

    const statAfter = await fs.promises.stat(inputPath);
    totalAfter += statAfter.size;

    const saved = statBefore.size - statAfter.size;
    const ratio = statBefore.size > 0 ? (statAfter.size / statBefore.size) * 100 : 0;

    console.log(
      `${filename}: ${formatBytes(statBefore.size)} -> ${formatBytes(statAfter.size)} (${saved >= 0 ? '-' : '+'}${formatBytes(Math.abs(saved))}, ${ratio.toFixed(1)}%)`
    );
  }

  const totalSaved = totalBefore - totalAfter;
  const totalRatio = totalBefore > 0 ? (totalAfter / totalBefore) * 100 : 0;

  console.log('');
  console.log(`Total: ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)} (${totalSaved >= 0 ? '-' : '+'}${formatBytes(Math.abs(totalSaved))}, ${totalRatio.toFixed(1)}%)`);
  console.log(`Backup folder: ${backupDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
