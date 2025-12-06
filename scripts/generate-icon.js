const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
const pngPath = path.join(__dirname, '../assets/icons/icon.png');
const icoPath = path.join(__dirname, '../assets/icons/icon.ico');

async function generateIcons() {
  console.log('Reading SVG...');
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate PNG at 256x256
  console.log('Converting to PNG...');
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(pngPath);

  // Generate multiple sizes for ICO
  console.log('Generating ICO with multiple sizes...');
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);

  console.log('Icons generated successfully!');
  console.log(`  PNG: ${pngPath}`);
  console.log(`  ICO: ${icoPath}`);
}

generateIcons().catch(console.error);
