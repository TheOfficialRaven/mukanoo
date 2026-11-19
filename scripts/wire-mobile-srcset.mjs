import fs from "fs";

const htmlPath = "index.html";
let html = fs.readFileSync(htmlPath, "utf8");

html = html.replace(
  /<img src="assets\/imgs\/referenciak\/(referencia-\d+)\.webp" alt="([^"]*)"([^>]*)>/g,
  (match, name, alt, rest) => {
    let attrs = rest;
    // Gallery is below the fold: prefer lazy; drop competing fetchpriority
    attrs = attrs.replace(/\s*loading="eager"/g, ' loading="lazy"');
    attrs = attrs.replace(/\s*fetchpriority="high"/g, "");
    if (!/\sloading=/.test(attrs)) attrs += ' loading="lazy"';
    if (!/\sdecoding=/.test(attrs)) attrs += ' decoding="async"';
    return (
      `<img src="assets/imgs/referenciak/${name}.webp" ` +
      `srcset="assets/imgs/referenciak/mobile/${name}.webp 800w, assets/imgs/referenciak/${name}.webp 1600w" ` +
      `sizes="(max-width: 860px) 46vw, 16vw" ` +
      `alt="${alt}"${attrs}>`
    );
  }
);

fs.writeFileSync(htmlPath, html);
console.log("wired referencia srcset");
