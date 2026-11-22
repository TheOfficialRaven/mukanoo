import fs from "fs";

const file = "index.html";
let html = fs.readFileSync(file, "utf8");

const fontHref =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Marcellus+SC&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Ms+Madi&display=swap";

if (html.includes(`<link href="${fontHref}" rel="stylesheet">`)) {
  html = html.replace(
    `<link href="${fontHref}" rel="stylesheet">`,
    `<link rel="preload" as="style" href="${fontHref}" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link href="${fontHref}" rel="stylesheet"></noscript>`
  );
}

if (html.includes('href="assets/backgrounds/hero_bg.webp" type="image/webp" fetchpriority="high"')) {
  html = html.replace(
    `<link rel="preload" as="image" href="assets/backgrounds/hero_bg.webp" type="image/webp" fetchpriority="high">
  <link rel="stylesheet" href="css/styles.css?v=type-100">`,
    `<link rel="preload" as="image" href="assets/backgrounds/mobile/hero_bg.webp" type="image/webp" media="(max-width: 860px)" fetchpriority="high">
  <link rel="preload" as="image" href="assets/backgrounds/hero_bg.webp" type="image/webp" media="(min-width: 861px)" fetchpriority="high">
  <link rel="preload" as="image" href="assets/icons/mobile/Mukanoo_Hero.webp" type="image/webp" media="(max-width: 860px)" fetchpriority="high">
  <link rel="preload" as="image" href="assets/icons/Mukanoo_Hero@4x.webp" type="image/webp" media="(min-width: 861px)" fetchpriority="high">
  <link rel="stylesheet" href="css/styles.css?v=perf-mobile-2">`
  );
}

html = html.replace(
  `<img class="hero__logo" src="assets/icons/Mukanoo_Hero@4x.webp" alt="" width="576" height="44" decoding="async">`,
  `<picture>
            <source media="(max-width: 860px)" srcset="assets/icons/mobile/Mukanoo_Hero.webp" type="image/webp">
            <img class="hero__logo" src="assets/icons/Mukanoo_Hero@4x.webp" alt="" width="576" height="44" decoding="async" fetchpriority="high">
          </picture>`
);

html = html.replace(
  `<img src="assets/imgs/rolam.webp" alt="Muladi Klára, a MUKANOO megálmodója" width="1086" height="1448" loading="lazy" decoding="async">`,
  `<picture>
          <source media="(max-width: 860px)" srcset="assets/imgs/mobile/rolam.webp" type="image/webp">
          <img src="assets/imgs/rolam.webp" alt="Muladi Klára, a MUKANOO megálmodója" width="1086" height="1448" loading="lazy" decoding="async">
        </picture>`
);

html = html.replace(
  `<img src="assets/imgs/kapcsolat.webp" alt="Mukanoo — színpadi öltözékek" width="1350" height="1800" loading="lazy" decoding="async">`,
  `<picture>
            <source media="(max-width: 860px)" srcset="assets/imgs/mobile/kapcsolat.webp" type="image/webp">
            <img src="assets/imgs/kapcsolat.webp" alt="Mukanoo — színpadi öltözékek" width="1350" height="1800" loading="lazy" decoding="async">
          </picture>`
);

html = html.replace(
  /<div class="media media--square"><img src="assets\/imgs\/referenciak\/(referencia-\d+)\.webp" alt="([^"]+)" loading="(?:eager|lazy)" decoding="async"(?: fetchpriority="high")?><\/div>/g,
  (_m, name, alt) => {
    const n = parseInt(name.replace("referencia-", ""), 10);
    const prio = n === 1 ? ' fetchpriority="high"' : "";
    return `<div class="media media--square"><picture><source media="(max-width: 860px)" srcset="assets/imgs/referenciak/mobile/${name}.webp" type="image/webp"><img src="assets/imgs/referenciak/${name}.webp" alt="${alt}" loading="lazy" decoding="async"${prio} width="960" height="960"></picture></div>`;
  }
);

fs.writeFileSync(file, html);
console.log("wired pictures:", (html.match(/<picture>/g) || []).length);
console.log("mobile hero preload:", html.includes("assets/icons/mobile/Mukanoo_Hero.webp"));
console.log("async fonts:", html.includes("this.rel='stylesheet'"));
