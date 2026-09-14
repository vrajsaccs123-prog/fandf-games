/**
 * Generates favicon, PWA, and social preview assets from the official F&F logo.
 * Run: node scripts/generate-branding.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "Favicon.png");
const PUBLIC = join(ROOT, "public");

/** Extract the circular logo mark (trim dark outer padding). */
async function loadLogoMark() {
  const trimmed = await sharp(SOURCE)
    .trim({ threshold: 12 })
    .png()
    .toBuffer();

  return sharp(trimmed);
}

/** Fit logo into a square canvas with optional background. */
async function logoSquare(size, { background = { r: 0, g: 0, b: 0, alpha: 0 } } = {}) {
  const mark = await loadLogoMark();
  const meta = await mark.metadata();
  const inset = Math.round(size * 0.06);
  const inner = size - inset * 2;

  const resized = await mark
    .resize(inner, inner, { fit: "contain", background })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png();
}

async function writePng(path, pipeline) {
  await pipeline.toFile(path);
  console.log("  wrote", path.replace(PUBLIC, "public"));
}

async function generateFavicons() {
  console.log("Generating favicons…");

  const favicon16 = await logoSquare(16).then((p) => p.toBuffer());
  const favicon32 = await logoSquare(32).then((p) => p.toBuffer());

  await writePng(join(PUBLIC, "favicon-16x16.png"), sharp(favicon16));
  await writePng(join(PUBLIC, "favicon-32x32.png"), sharp(favicon32));

  const ico = await pngToIco([favicon16, favicon32]);
  await writeFile(join(PUBLIC, "favicon.ico"), ico);
  console.log("  wrote public/favicon.ico");

  await writePng(join(PUBLIC, "apple-touch-icon.png"), await logoSquare(180));
}

async function generatePwaIcons() {
  console.log("Generating PWA icons…");
  const iconsDir = join(PUBLIC, "icons");
  await mkdir(iconsDir, { recursive: true });

  await writePng(join(iconsDir, "icon-192.png"), await logoSquare(192));
  await writePng(join(iconsDir, "icon-512.png"), await logoSquare(512));
}

async function generateOgImage() {
  console.log("Generating social preview…");
  const socialDir = join(PUBLIC, "social");
  await mkdir(socialDir, { recursive: true });

  const logoSize = 340;
  const logoPng = await logoSquare(logoSize, {
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).then((p) => p.toBuffer());

  const logoB64 = logoPng.toString("base64");

  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c0a08"/>
      <stop offset="45%" stop-color="#121810"/>
      <stop offset="100%" stop-color="#0f3720"/>
    </linearGradient>
    <radialGradient id="glow" cx="35%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#328255" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#328255" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <circle cx="980" cy="110" r="180" fill="#328255" opacity="0.06"/>
  <circle cx="1050" cy="520" r="120" fill="#e8912a" opacity="0.05"/>
  <image href="data:image/png;base64,${logoB64}" x="120" y="145" width="${logoSize}" height="${logoSize}" filter="url(#shadow)"/>
  <text x="520" y="260" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="700" fill="#ebe4d7">F&amp;F Games</text>
  <text x="520" y="330" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#968773">Games for Friends &amp; Family</text>
  <text x="520" y="400" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#6b6154">Fun, strategic games made to play together.</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .resize(1200, 630)
    .png()
    .toFile(join(socialDir, "og-image.png"));

  console.log("  wrote public/social/og-image.png");
}

async function main() {
  await mkdir(PUBLIC, { recursive: true });
  await generateFavicons();
  await generatePwaIcons();
  await generateOgImage();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
