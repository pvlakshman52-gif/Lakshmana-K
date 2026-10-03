import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer: 4 bytes per pixel
  // PNG scanline: 1 byte filter type (0) + width * 4 bytes
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const lineStart = y * scanlineLength;
    rawData[lineStart] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelStart = lineStart + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
      rawData[pixelStart + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    const crc = crc32(toCrc);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA (6)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT
  const idat = createChunk('IDAT', compressed);

  // IEND
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 implementation
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

// Draw standard MediClinic logo (rounded square with medical cross and clinic emblem)
function drawStandardIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2;
  
  // Rounded squircle background (#0f766e - deep teal)
  const pad = w * 0.04;
  const rad = w * 0.22;
  const dx = Math.max(0, Math.abs(x - cx) - (w / 2 - pad - rad));
  const dy = Math.max(0, Math.abs(y - cy) - (h / 2 - pad - rad));
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > rad) {
    return [0, 0, 0, 0]; // Transparent outside rounded corner
  }

  // Cross dimensions
  const crossW = w * 0.18;
  const crossLen = w * 0.52;

  const inHBar = (Math.abs(y - cy) <= crossW / 2) && (Math.abs(x - cx) <= crossLen / 2);
  const inVBar = (Math.abs(x - cx) <= crossW / 2) && (Math.abs(y - cy) <= crossLen / 2);

  // Subtle gradient background from #0d9488 to #042f2e
  const gradT = y / h;
  const bgR = Math.round(13 + gradT * (4 - 13));
  const bgG = Math.round(148 + gradT * (47 - 148));
  const bgB = Math.round(136 + gradT * (46 - 136));

  if (inHBar || inVBar) {
    // White cross with slight inner shine
    return [255, 255, 255, 255];
  }

  // Pulse ring around the cross
  const ringDist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
  if (Math.abs(ringDist - w * 0.38) <= w * 0.015) {
    return [45, 212, 191, 200]; // teal-400
  }

  return [bgR, bgG, bgB, 255];
}

// Draw maskable icon (full bleed background, iconography within 70% safe zone)
function drawMaskableIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;

  // Solid full-bleed teal background
  const gradT = y / h;
  const bgR = Math.round(13 + gradT * (4 - 13));
  const bgG = Math.round(148 + gradT * (47 - 148));
  const bgB = Math.round(136 + gradT * (46 - 136));

  // Cross dimensions in safe zone (smaller, centered)
  const crossW = w * 0.14;
  const crossLen = w * 0.42;

  const inHBar = (Math.abs(y - cy) <= crossW / 2) && (Math.abs(x - cx) <= crossLen / 2);
  const inVBar = (Math.abs(x - cx) <= crossW / 2) && (Math.abs(y - cy) <= crossLen / 2);

  if (inHBar || inVBar) {
    return [255, 255, 255, 255];
  }

  // Pulse circle in safe zone
  const ringDist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
  if (Math.abs(ringDist - w * 0.30) <= w * 0.015) {
    return [45, 212, 191, 220];
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, drawStandardIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, drawStandardIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, drawMaskableIcon));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, drawStandardIcon));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(64, 64, drawStandardIcon));

// SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#042f2e" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <circle cx="256" cy="256" r="190" stroke="#2dd4bf" stroke-width="10" stroke-opacity="0.8" />
  <rect x="210" y="126" width="92" height="260" rx="20" fill="#ffffff" />
  <rect x="126" y="210" width="260" height="92" rx="20" fill="#ffffff" />
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

console.log('Icons successfully created in public/');
