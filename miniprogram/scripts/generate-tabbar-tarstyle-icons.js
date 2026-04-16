const path = require('path');
const sharp = require('../../backend/node_modules/sharp');

const SIZE = 81;

const palettes = {
  normal: {
    stroke: '#A7ADB6',
    accent: '#7A7E83',
    bg: '#F4F5F7',
    border: '#DDE1E6'
  },
  active: {
    stroke: '#C8102E',
    accent: '#C8102E',
    bg: '#FBECEF',
    border: '#F3C8D1'
  }
};

const iconDefs = {
  home: {
    glyph: ({ stroke }) => `
      <path d="M24 38 L40.5 24 L57 38" stroke="${stroke}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M28.5 36.5V56H52.5V36.5" stroke="${stroke}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M38 56V46H43V56" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round"/>
    `
  },
  gallery: {
    glyph: ({ stroke, accent }) => `
      <rect x="24" y="27" width="33" height="29" rx="6" stroke="${stroke}" stroke-width="3.6"/>
      <circle cx="34" cy="35" r="3" fill="${accent}"/>
      <path d="M28 51L36 43L42 48L48 41L54 51" stroke="${stroke}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    `
  },
  shop: {
    glyph: ({ stroke, accent }) => `
      <path d="M29 26H52C54.2 26 56 27.8 56 30V55C56 57.2 54.2 59 52 59H29C26.8 59 25 57.2 25 55V30C25 27.8 26.8 26 29 26Z" stroke="${stroke}" stroke-width="3.6"/>
      <path d="M32 34H49" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M32 41H49" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M32 48H43" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="56" cy="27" r="3.2" fill="${accent}"/>
    `
  },
  ar: {
    glyph: ({ stroke, accent }) => `
      <path d="M40.5 25L55.5 33.5V50.5L40.5 59L25.5 50.5V33.5L40.5 25Z" stroke="${stroke}" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M40.5 25V42" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M25.5 33.5L40.5 42L55.5 33.5" stroke="${stroke}" stroke-width="3.2" stroke-linejoin="round"/>
      <circle cx="58.5" cy="24.5" r="3" fill="${accent}"/>
    `
  },
  profile: {
    glyph: ({ stroke }) => `
      <circle cx="40.5" cy="33" r="8.5" stroke="${stroke}" stroke-width="3.6"/>
      <path d="M25.5 56C28.5 48.8 34.1 45.2 40.5 45.2C46.9 45.2 52.5 48.8 55.5 56" stroke="${stroke}" stroke-width="3.6" stroke-linecap="round"/>
    `
  }
};

function renderSvg(name, mode) {
  const palette = palettes[mode];
  const glyph = iconDefs[name].glyph(palette);

  return `
  <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 81 81" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="14" width="53" height="53" rx="15" fill="${palette.bg}" stroke="${palette.border}" stroke-width="2"/>
    ${glyph}
  </svg>`;
}

async function generateOne(name, isActive) {
  const mode = isActive ? 'active' : 'normal';
  const filename = isActive ? `${name}-active.png` : `${name}.png`;
  const outputPath = path.join(__dirname, '..', 'images', 'tabbar', filename);
  await sharp(Buffer.from(renderSvg(name, mode))).png().toFile(outputPath);
  return outputPath;
}

async function main() {
  const names = ['home', 'gallery', 'shop', 'ar', 'profile'];
  const outputs = [];

  for (const name of names) {
    outputs.push(await generateOne(name, false));
    outputs.push(await generateOne(name, true));
  }

  console.log('Generated tabbar icons:');
  outputs.forEach((p) => console.log(p));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
