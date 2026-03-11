const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  for (const size of sizes) {
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#3b82f6"/>
        <text
          x="50%"
          y="50%"
          font-family="Arial, sans-serif"
          font-size="${size * 0.4}px"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
          dominant-baseline="central"
        >י</text>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));

    console.log(`Generated icon-${size}x${size}.png`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
