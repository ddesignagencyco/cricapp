import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = 'C:/Users/Sajid/.cursor/projects/c-Users-Sajid-Desktop-cric-info/assets';
const OUT = path.join(__dirname, '../public/advertisements');

function overlaySvg({ width, height, title, line, cta, vertical = false }) {
  const titleSize = vertical ? 28 : Math.max(15, Math.round(height * 0.32));
  const lineSize = vertical ? 15 : Math.max(11, Math.round(height * 0.18));
  const titleY = vertical ? height - 118 : Math.round(height * 0.42);
  const lineY = vertical ? height - 92 : Math.round(height * 0.72);
  const gradient = vertical
    ? `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#07111F" stop-opacity="0.05"/>
        <stop offset="0.55" stop-color="#07111F" stop-opacity="0.2"/>
        <stop offset="1" stop-color="#07111F" stop-opacity="0.82"/>
      </linearGradient>`
    : `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#07111F" stop-opacity="0.78"/>
        <stop offset="0.5" stop-color="#07111F" stop-opacity="0.28"/>
        <stop offset="1" stop-color="#07111F" stop-opacity="0.45"/>
      </linearGradient>`;
  const button = cta
    ? vertical
      ? `<rect x="24" y="${height - 72}" width="140" height="36" rx="6" fill="#0284C7"/>
         <text x="94" y="${height - 48}" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="13" font-weight="700">${cta}</text>`
      : `<rect x="${width - 168}" y="${Math.round((height - 34) / 2)}" width="144" height="34" rx="6" fill="#0284C7"/>
         <text x="${width - 96}" y="${Math.round(height / 2 + 5)}" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="13" font-weight="700">${cta}</text>`
    : '';

  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>${gradient}</defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    <text x="24" y="${titleY}" fill="#F8FAFC" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="800">${title}</text>
    <text x="24" y="${lineY}" fill="#E2E8F0" font-family="Arial, sans-serif" font-size="${lineSize}">${line}</text>
    ${button}
  </svg>`);
}

async function makeAd({ src, width, height, title, line, cta, filename, vertical = false }) {
  const photo = await sharp(path.join(ASSETS, src))
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .toBuffer();

  await sharp(photo)
    .composite([{ input: overlaySvg({ width, height, title, line, cta, vertical }) }])
    .png({ compressionLevel: 8 })
    .toFile(path.join(OUT, filename));

  console.log(`wrote ${filename} (${width}x${height})`);
}

await makeAd({
  src: 'ad-boundary-sports.png',
  width: 970,
  height: 90,
  title: 'Boundary Sports',
  line: 'Train Your Game',
  cta: 'Shop Gear',
  filename: 'leaderboard-970x90.png',
});

await makeAd({
  src: 'ad-greenline-travel.png',
  width: 728,
  height: 90,
  title: 'GreenLine Travel',
  line: 'Follow the Tour',
  cta: 'Book Now',
  filename: 'leaderboard-728x90.png',
});

await makeAd({
  src: 'ad-powerplay-fitness.png',
  width: 468,
  height: 60,
  title: 'PowerPlay Fitness',
  line: 'Built for Every Innings',
  filename: 'tablet-468x60.png',
});

await makeAd({
  src: 'ad-stadium-mobile.png',
  width: 320,
  height: 100,
  title: 'Stadium Mobile',
  line: 'Stay Connected to the Game',
  filename: 'mobile-320x100.png',
});

await makeAd({
  src: 'ad-pitchcraft-gear.png',
  width: 300,
  height: 250,
  title: 'PitchCraft Gear',
  line: 'Match-day essentials',
  cta: 'Shop Kit',
  filename: 'rectangle-300x250.png',
  vertical: true,
});

await makeAd({
  src: 'ad-nightwatch-optics.png',
  width: 336,
  height: 280,
  title: 'NightWatch Optics',
  line: 'See every delivery',
  cta: 'View Range',
  filename: 'large-rectangle-336x280.png',
  vertical: true,
});

await makeAd({
  src: 'ad-tourkit-luggage.png',
  width: 300,
  height: 600,
  title: 'TourKit Luggage',
  line: 'Pack for the away series',
  cta: 'Shop Bags',
  filename: 'half-page-300x600.png',
  vertical: true,
});
