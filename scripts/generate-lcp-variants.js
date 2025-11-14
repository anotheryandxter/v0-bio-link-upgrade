const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Remote LCP image URL (detected from repo/dev notes)
const LCP_URL = 'https://wxotlwlbbepzlslciwis.supabase.co/storage/v1/object/public/static/maps/9321b7fa-40db-4f54-8e8b-0d56ff8fe08a-1761848220263.png';
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'optim', 'lcp');
const SIZES = [320, 640, 1024, 1920];

async function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Failed to download, status ' + res.statusCode));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function run() {
  console.log('Downloading LCP image...');
  const buf = await downloadBuffer(LCP_URL);
  await ensureDir(OUT_DIR);

  for (const size of SIZES) {
    const base = path.join(OUT_DIR, `lcp-${size}`);
    console.log('Generating', base + '.avif');
    await sharp(buf).resize({ width: size }).avif({ quality: 60 }).toFile(base + '.avif');
    console.log('Generating', base + '.webp');
    await sharp(buf).resize({ width: size }).webp({ quality: 70 }).toFile(base + '.webp');
    console.log('Generating', base + '.jpg');
    await sharp(buf).resize({ width: size }).jpeg({ quality: 80 }).toFile(base + '.jpg');
  }

  console.log('Generated variants in', OUT_DIR);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
