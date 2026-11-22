import fs from "fs";

const file = "index.html";
let html = fs.readFileSync(file, "utf8");

/* Head: media-split background CSS + cache bust */
html = html.replace(
  /<link rel="stylesheet" href="css\/styles\.css\?v=[^"]+">/,
  `<link rel="stylesheet" href="css/styles.css?v=perf-mobile-7">
  <link rel="stylesheet" href="css/bg-mobile.css?v=1" media="(max-width: 860px)">
  <link rel="stylesheet" href="css/bg-desktop.css?v=1" media="(min-width: 861px)">`
);

/* Hero logo: mobil src default */
html = html.replace(
  /<picture>\s*<source media="\(max-width: 860px\)" srcset="assets\/icons\/mobile\/Mukanoo_Hero\.webp" type="image\/webp">\s*<img class="hero__logo" src="assets\/icons\/Mukanoo_Hero@4x\.webp"[^>]*>\s*<\/picture>/,
  `<picture>
            <source media="(min-width: 861px)" srcset="assets/icons/Mukanoo_Hero@4x.webp" type="image/webp">
            <img class="hero__logo" src="assets/icons/mobile/Mukanoo_Hero.webp" alt="" width="576" height="44" decoding="async" fetchpriority="high">
          </picture>`
);

/* Rolam: mobil src default */
html = html.replace(
  /<img src="assets\/imgs\/rolam\.webp" srcset="assets\/imgs\/mobile\/rolam\.webp 900w, assets\/imgs\/rolam\.webp 1086w" sizes="\(max-width: 860px\) 42vw, min\(540px, 40vw\)" alt="([^"]*)" width="1086" height="1448" loading="lazy" decoding="async">/,
  `<picture>
          <source media="(min-width: 861px)" srcset="assets/imgs/rolam.webp" type="image/webp">
          <img src="assets/imgs/mobile/rolam.webp" alt="$1" width="900" height="1200" loading="lazy" decoding="async">
        </picture>`
);

/* Kapcsolat */
html = html.replace(
  /<img src="assets\/imgs\/kapcsolat\.webp" srcset="assets\/imgs\/mobile\/kapcsolat\.webp 900w, assets\/imgs\/kapcsolat\.webp 1350w" sizes="\(max-width: 860px\) 100vw, min\(420px, 36vw\)" alt="([^"]*)" width="1350" height="1800" loading="lazy" decoding="async">/,
  `<picture>
            <source media="(min-width: 861px)" srcset="assets/imgs/kapcsolat.webp" type="image/webp">
            <img src="assets/imgs/mobile/kapcsolat.webp" alt="$1" width="900" height="1200" loading="lazy" decoding="async">
          </picture>`
);

/* Referenciák: mobil src default, desktop csak min-width source */
html = html.replace(
  /<div class="media media--square"><img src="assets\/imgs\/referenciak\/(referencia-\d+)\.webp" srcset="assets\/imgs\/referenciak\/mobile\/\1\.webp 800w, assets\/imgs\/referenciak\/\1\.webp 1600w" sizes="\(max-width: 860px\) 48vw, 22vw" alt="([^"]*)" loading="lazy" decoding="async" width="960" height="960"><\/div>/g,
  (_m, name, alt) =>
    `<div class="media media--square"><picture><source media="(min-width: 861px)" srcset="assets/imgs/referenciak/${name}.webp" type="image/webp"><img src="assets/imgs/referenciak/mobile/${name}.webp" alt="${alt}" loading="lazy" decoding="async" width="800" height="800"></picture></div>`
);

fs.writeFileSync(file, html);

const checks = {
  bgMobile: html.includes('bg-mobile.css'),
  bgDesktop: html.includes('bg-desktop.css'),
  heroMobileSrc: html.includes('src="assets/icons/mobile/Mukanoo_Hero.webp"'),
  refMobileSrc: (html.match(/src="assets\/imgs\/referenciak\/mobile\/referencia-\d+\.webp"/g) || []).length,
  refDesktopSource: (html.match(/source media="\(min-width: 861px\)" srcset="assets\/imgs\/referenciak\/referencia-/g) || []).length,
  noDesktopRefSrc: !(html.match(/src="assets\/imgs\/referenciak\/referencia-\d+\.webp"/)),
};
console.log(checks);
