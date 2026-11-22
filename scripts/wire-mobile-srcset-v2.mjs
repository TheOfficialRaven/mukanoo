import fs from "fs";

const file = "index.html";
let html = fs.readFileSync(file, "utf8");

/* Referencia: picture → srcset/sizes (Lighthouse megbízhatóbban a 800w mobilt választja) */
html = html.replace(
  /<div class="media media--square"><picture><source media="\(max-width: 860px\)" srcset="assets\/imgs\/referenciak\/mobile\/(referencia-\d+)\.webp" type="image\/webp"><img src="assets\/imgs\/referenciak\/\1\.webp" alt="([^"]*)" loading="lazy" decoding="async"(?: fetchpriority="high")? width="960" height="960"><\/picture><\/div>/g,
  (_m, name, alt) =>
    `<div class="media media--square"><img src="assets/imgs/referenciak/${name}.webp" srcset="assets/imgs/referenciak/mobile/${name}.webp 800w, assets/imgs/referenciak/${name}.webp 1600w" sizes="(max-width: 860px) 48vw, 22vw" alt="${alt}" loading="lazy" decoding="async" width="960" height="960"></div>`
);

/* Rolam */
html = html.replace(
  /<picture>\s*<source media="\(max-width: 860px\)" srcset="assets\/imgs\/mobile\/rolam\.webp" type="image\/webp">\s*<img src="assets\/imgs\/rolam\.webp" alt="([^"]*)" width="1086" height="1448" loading="lazy" decoding="async">\s*<\/picture>/,
  `<img src="assets/imgs/rolam.webp" srcset="assets/imgs/mobile/rolam.webp 900w, assets/imgs/rolam.webp 1086w" sizes="(max-width: 860px) 42vw, min(540px, 40vw)" alt="$1" width="1086" height="1448" loading="lazy" decoding="async">`
);

/* Kapcsolat */
html = html.replace(
  /<picture>\s*<source media="\(max-width: 860px\)" srcset="assets\/imgs\/mobile\/kapcsolat\.webp" type="image\/webp">\s*<img src="assets\/imgs\/kapcsolat\.webp" alt="([^"]*)" width="1350" height="1800" loading="lazy" decoding="async">\s*<\/picture>/,
  `<img src="assets/imgs/kapcsolat.webp" srcset="assets/imgs/mobile/kapcsolat.webp 900w, assets/imgs/kapcsolat.webp 1350w" sizes="(max-width: 860px) 100vw, min(420px, 36vw)" alt="$1" width="1350" height="1800" loading="lazy" decoding="async">`
);

/* Hero logo — art direction: marad picture + fetchpriority; srcset a fallback img-en */
html = html.replace(
  /<picture>\s*<source media="\(max-width: 860px\)" srcset="assets\/icons\/mobile\/Mukanoo_Hero\.webp" type="image\/webp">\s*<img class="hero__logo" src="assets\/icons\/Mukanoo_Hero@4x\.webp" alt="" width="576" height="44" decoding="async" fetchpriority="high">\s*<\/picture>/,
  `<picture>
            <source media="(max-width: 860px)" srcset="assets/icons/mobile/Mukanoo_Hero.webp" type="image/webp">
            <img class="hero__logo" src="assets/icons/Mukanoo_Hero@4x.webp" srcset="assets/icons/mobile/Mukanoo_Hero.webp 800w, assets/icons/Mukanoo_Hero@4x.webp 2304w" sizes="(max-width: 860px) 90vw, 576px" alt="" width="576" height="44" decoding="async" fetchpriority="high">
          </picture>`
);

html = html.replace(
  /css\/styles\.css\?v=[^"]+/,
  "css/styles.css?v=perf-mobile-3"
);

fs.writeFileSync(file, html);
console.log(
  "referencia srcset:",
  (html.match(/referenciak\/mobile\/referencia-\d+\.webp 800w/g) || []).length
);
console.log("rolam srcset:", html.includes("assets/imgs/mobile/rolam.webp 900w"));
console.log("cache:", html.includes("perf-mobile-3"));
