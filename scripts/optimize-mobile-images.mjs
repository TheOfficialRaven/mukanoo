import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const root = path.resolve("e:/HTML/mukanoo weboldal");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeMobile(srcRel, destRel, { width, quality = 72 }) {
  const src = path.join(root, srcRel);
  const dest = path.join(root, destRel);
  await ensureDir(path.dirname(dest));
  const meta = await sharp(src).metadata();
  const targetW = Math.min(width, meta.width || width);
  await sharp(src)
    .rotate()
    .resize({ width: targetW, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(dest);
  const before = (await fs.stat(src)).size;
  const after = (await fs.stat(dest)).size;
  console.log(
    `${srcRel} → ${destRel} | ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB (w=${targetW})`
  );
}

const jobs = [
  // Backgrounds — mobile ~900–1100px wide, stronger compression
  ["assets/backgrounds/textil_1.webp", "assets/backgrounds/mobile/textil_1.webp", { width: 1100, quality: 68 }],
  ["assets/backgrounds/textil_2.webp", "assets/backgrounds/mobile/textil_2.webp", { width: 1100, quality: 68 }],
  ["assets/backgrounds/textil_3.webp", "assets/backgrounds/mobile/textil_3.webp", { width: 1100, quality: 68 }],
  ["assets/backgrounds/rolam_bg.webp", "assets/backgrounds/mobile/rolam_bg.webp", { width: 1100, quality: 68 }],
  ["assets/backgrounds/velemenyek_bg.webp", "assets/backgrounds/mobile/velemenyek_bg.webp", { width: 1100, quality: 68 }],
  ["assets/backgrounds/hero_bg.webp", "assets/backgrounds/mobile/hero_bg.webp", { width: 1200, quality: 72 }],

  // Content photos
  ["assets/imgs/rolam.webp", "assets/imgs/mobile/rolam.webp", { width: 900, quality: 72 }],
  ["assets/imgs/kapcsolat.webp", "assets/imgs/mobile/kapcsolat.webp", { width: 900, quality: 72 }],

  // Gallery first page (Lighthouse flagged) + rest for consistency when lazy
  ...Array.from({ length: 42 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return [
      `assets/imgs/referenciak/referencia-${n}.webp`,
      `assets/imgs/referenciak/mobile/referencia-${n}.webp`,
      { width: 960, quality: 70 }
    ];
  }),

  // LCP hero logo — display ~700px, 2x ≈ 1400 max but source is 2304; 1200 enough
  ["assets/icons/Mukanoo_Hero@4x.webp", "assets/icons/mobile/Mukanoo_Hero.webp", { width: 1200, quality: 82 }]
];

for (const [src, dest, opts] of jobs) {
  try {
    await writeMobile(src, dest, opts);
  } catch (err) {
    console.warn("SKIP", src, err.message);
  }
}

console.log("Done.");
