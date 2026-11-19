import sharp from "sharp";
import fs from "fs";
import path from "path";

async function out(input, output, opts) {
  await fs.promises.mkdir(path.dirname(output), { recursive: true });
  const meta = await sharp(input).rotate().metadata();
  let pipeline = sharp(input).rotate();
  if (opts.width && meta.width > opts.width) {
    pipeline = pipeline.resize({ width: opts.width, withoutEnlargement: true });
  }
  await pipeline.webp({ quality: opts.quality, effort: 6 }).toFile(output);
  const before = fs.statSync(input).size;
  const after = fs.statSync(output).size;
  console.log(
    path.relative(process.cwd(), output) +
      ": " +
      Math.round(before / 1024) +
      "KB -> " +
      Math.round(after / 1024) +
      "KB"
  );
}

const jobs = [
  ["assets/backgrounds/textil_1.webp", "assets/backgrounds/mobile/textil_1.webp", 1200, 68],
  ["assets/backgrounds/textil_2.webp", "assets/backgrounds/mobile/textil_2.webp", 1200, 68],
  ["assets/backgrounds/textil_3.webp", "assets/backgrounds/mobile/textil_3.webp", 1200, 68],
  ["assets/backgrounds/rolam_bg.webp", "assets/backgrounds/mobile/rolam_bg.webp", 1200, 70],
  ["assets/backgrounds/velemenyek_bg.webp", "assets/backgrounds/mobile/velemenyek_bg.webp", 1200, 70],
  ["assets/backgrounds/hero_bg.webp", "assets/backgrounds/mobile/hero_bg.webp", 1200, 72],
  ["assets/imgs/rolam.webp", "assets/imgs/mobile/rolam.webp", 900, 72],
  ["assets/imgs/kapcsolat.webp", "assets/imgs/mobile/kapcsolat.webp", 900, 72],
  ["assets/icons/Mukanoo_Hero@4x.webp", "assets/icons/mobile/Mukanoo_Hero.webp", 1200, 82]
];

for (const [input, output, width, quality] of jobs) {
  if (!fs.existsSync(input)) {
    console.warn("missing", input);
    continue;
  }
  await out(input, output, { width, quality });
}

for (let i = 1; i <= 42; i++) {
  const n = String(i).padStart(2, "0");
  const src = `assets/imgs/referenciak/referencia-${n}.webp`;
  if (!fs.existsSync(src)) continue;
  await out(src, `assets/imgs/referenciak/mobile/referencia-${n}.webp`, {
    width: 800,
    quality: 70
  });
}

for (const file of await fs.promises.readdir("assets", { recursive: true })) {
  if (String(file).endsWith(".tmp.webp")) {
    await fs.promises.unlink(path.join("assets", file));
    console.log("removed", file);
  }
}

console.log("done");
