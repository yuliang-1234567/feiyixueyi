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

async function calcCompare(buf1, buf2) {
  const { data: p1 } = await sharp(buf1).raw().toBuffer({ resolveWithObject: true });
  const { data: p2 } = await sharp(buf2).raw().toBuffer({ resolveWithObject: true });
  let totalDiff = 0; let totalSquared = 0; const pixelCount = Math.min(p1.length, p2.length);
  for (let i=0;i<pixelCount;i++){ const d=Math.abs(p1[i]-p2[i]); totalDiff+=d; totalSquared+=d*d; }
  const meanDiff = totalDiff / pixelCount; const normalized = meanDiff / 255; const sim = Math.exp(-normalized * 2); return Math.max(0.25, Math.min(0.98, sim));
}

async function estimateSingle(buf){
  const { data: pixels } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let sum=0; for (let i=0;i<pixels.length;i++) sum+=pixels[i]; const mean=sum/pixels.length;
  let varianceSum=0, gradientSum=0, gradientCount=0;
  for (let i=0;i<pixels.length;i++){ const cur=pixels[i]; const diff=cur-mean; varianceSum+=diff*diff; if (i>0){ gradientSum+=Math.abs(cur-pixels[i-1]); gradientCount++; } }
  const std=Math.sqrt(varianceSum/pixels.length); const avgGradient = gradientCount>0 ? gradientSum/gradientCount : 0;
  const contrastScore = Math.min(1, std/64); const structureScore = Math.min(1, avgGradient/40); const exposureScore = 1 - Math.min(1, Math.abs(mean-128)/128);
  const combined = (contrastScore*0.45)+(structureScore*0.35)+(exposureScore*0.2);
  return Math.max(0.35, Math.min(0.92, 0.45 + combined * 0.5));
}

(async()=>{
  console.log('Compare with new example');
  const art = await getLatestArtwork().catch(e=>{console.error('DB err', e.message); process.exit(1);} );
  console.log('Latest artwork:', art.id, art.title, art.imageUrl);
  let refPath = null;
  if (art.imageUrl.startsWith('/uploads/')) refPath = path.join(__dirname, '..', art.imageUrl);
  else refPath = path.join(__dirname, '../uploads', art.imageUrl.replace('/uploads/',''));
  if (!fs.existsSync(refPath)) { console.error('ref not found:', refPath); process.exit(1); }

  const newPath = path.join(__dirname, '../uploads/artworks/high_similarity_example.svg');
  if (!fs.existsSync(newPath)) { console.error('new not found:', newPath); process.exit(1); }

  const userBuf = await sharp(newPath).resize(320,320).greyscale().normalize().toBuffer();
  const refBuf = await sharp(refPath).resize(320,320).greyscale().normalize().toBuffer();

  const single = await estimateSingle(userBuf);
  const comp = await calcCompare(userBuf, refBuf);
  console.log('Self-eval:', Math.round(single*100)+'%');
  console.log('Compare:', Math.round(comp*100)+'%');
})();
