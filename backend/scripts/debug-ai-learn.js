require('dotenv').config({ path: __dirname + '/../.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function getLatestArtwork() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ihc',
  });

  const [rows] = await conn.query('SELECT id, title, imageUrl FROM artworks ORDER BY createdAt DESC LIMIT 1');
  await conn.end();
  return rows && rows[0] ? rows[0] : null;
}

async function calculateSimilarity(image1Buffer, image2Buffer) {
  try {
    const { data: pixels1 } = await sharp(image1Buffer).raw().toBuffer({ resolveWithObject: true });
    const { data: pixels2 } = await sharp(image2Buffer).raw().toBuffer({ resolveWithObject: true });

    let totalDiff = 0;
    let totalSquaredDiff = 0;
    const pixelCount = Math.min(pixels1.length, pixels2.length);

    for (let i = 0; i < pixelCount; i++) {
      const diff = Math.abs(pixels1[i] - pixels2[i]);
      totalDiff += diff;
      totalSquaredDiff += diff * diff;
    }

    const meanDiff = totalDiff / pixelCount;
    const normalizedDiff = meanDiff / 255;
    const similarity = Math.exp(-normalizedDiff * 3);
    return Math.max(0.3, Math.min(0.95, similarity));
  } catch (e) {
    console.error('calc err', e.message);
    return 0.65;
  }
}

async function estimateSimilarityFromSingleImage(imageBuffer) {
  try {
    const { data: pixels } = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true });

    let sum = 0;
    for (let i = 0; i < pixels.length; i++) sum += pixels[i];
    const mean = sum / pixels.length;

    let varianceSum = 0;
    let gradientSum = 0;
    let gradientCount = 0;

    for (let i = 0; i < pixels.length; i++) {
      const current = pixels[i];
      const diff = current - mean;
      varianceSum += diff * diff;
      if (i > 0) {
        gradientSum += Math.abs(current - pixels[i - 1]);
        gradientCount += 1;
      }
    }

    const std = Math.sqrt(varianceSum / pixels.length);
    const avgGradient = gradientCount > 0 ? gradientSum / gradientCount : 0;

    const contrastScore = Math.min(1, std / 64);
    const structureScore = Math.min(1, avgGradient / 40);
    const exposureScore = 1 - Math.min(1, Math.abs(mean - 128) / 128);

    const combined = (contrastScore * 0.45) + (structureScore * 0.35) + (exposureScore * 0.2);

    return Math.max(0.35, Math.min(0.92, 0.45 + combined * 0.5));
  } catch (e) {
    console.error('single eval err', e.message);
    return 0.68;
  }
}

(async function main(){
  console.log('Debug AI Learn -- start');
  const art = await getLatestArtwork().catch(e=>{ console.error('DB error', e.message); return null; });
  if (art) console.log('Latest artwork:', art.id, art.title, art.imageUrl);

  let referenceImagePath = null;
  if (art && art.imageUrl) {
    if (art.imageUrl.startsWith('/uploads/')) {
      referenceImagePath = path.join(__dirname, '..', art.imageUrl);
    } else {
      referenceImagePath = path.join(__dirname, '../uploads', art.imageUrl.replace('/uploads/', ''));
    }
    if (!fs.existsSync(referenceImagePath)) {
      console.warn('Reference image file not found:', referenceImagePath);
      referenceImagePath = null;
    }
  }

  // choose a sample user image: prefer uploads/artworks, else any upload
  const uploadsDir = path.join(__dirname, '../uploads/artworks');
  let samplePath = null;
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir).filter(f=>!f.startsWith('.'));
    if (files.length) samplePath = path.join(uploadsDir, files[0]);
  }
  if (!samplePath) {
    const tempDir = path.join(__dirname, '../uploads/temp');
    if (fs.existsSync(tempDir)) {
      const tmp = fs.readdirSync(tempDir).filter(f=>!f.startsWith('.'));
      if (tmp.length) samplePath = path.join(tempDir, tmp[0]);
    }
  }

  if (!samplePath && referenceImagePath) samplePath = referenceImagePath;

  if (!samplePath) {
    console.error('No sample image found in uploads to test.');
    process.exit(1);
  }

  console.log('Using sample image for user:', samplePath);

  // prepare buffers like route does: resize 320, greyscale, normalize
  const userBuf = await sharp(samplePath).resize(320,320).greyscale().normalize().toBuffer();

  const singleSim = await estimateSimilarityFromSingleImage(userBuf);
  console.log('Self-evaluate similarity:', Math.round(singleSim * 100), '%');

  if (referenceImagePath) {
    const refBuf = await sharp(referenceImagePath).resize(320,320).greyscale().normalize().toBuffer();
    const sim = await calculateSimilarity(userBuf, refBuf);
    console.log('Compare with reference similarity:', Math.round(sim * 100), '%');
  } else {
    console.log('No valid reference image found; compare skipped.');
  }

  console.log('Debug AI Learn -- done');
})();
