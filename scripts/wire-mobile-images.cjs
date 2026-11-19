const fs = require("fs");

let html = fs.readFileSync("index.html", "utf8");

html = html.replace(
  /<div class="media media--square"><img src="assets\/imgs\/referenciak\/referencia-(\d+)\.webp" alt="([^"]*)" loading="(?:eager|lazy)" decoding="async"(?: fetchpriority="high")?><\/div>/g,
  function (_m, num, alt) {
    var n = String(num).padStart(2, "0");
    return (
      '<div class="media media--square"><picture>' +
      '<source media="(max-width: 860px)" srcset="assets/imgs/referenciak/mobile/referencia-' +
      n +
      '.webp" type="image/webp">' +
      '<img src="assets/imgs/referenciak/referencia-' +
      n +
      '.webp" alt="' +
      alt +
      '" loading="lazy" decoding="async">' +
      "</picture></div>"
    );
  }
);

// rolam
html = html.replace(
  /<img src="assets\/imgs\/rolam\.webp" alt="([^"]*)" width="1086" height="1448" loading="lazy" decoding="async">/,
  '<picture>' +
    '<source media="(max-width: 860px)" srcset="assets/imgs/mobile/rolam.webp" type="image/webp">' +
    '<img src="assets/imgs/rolam.webp" alt="$1" width="1086" height="1448" loading="lazy" decoding="async">' +
    "</picture>"
);

// kapcsolat
html = html.replace(
  /<img src="assets\/imgs\/kapcsolat\.webp" alt="([^"]*)" width="1350" height="1800" loading="lazy" decoding="async">/,
  '<picture>' +
    '<source media="(max-width: 860px)" srcset="assets/imgs/mobile/kapcsolat.webp" type="image/webp">' +
    '<img src="assets/imgs/kapcsolat.webp" alt="$1" width="1350" height="1800" loading="lazy" decoding="async">' +
    "</picture>"
);

// hero logo — LCP
html = html.replace(
  /<img class="hero__logo" src="assets\/icons\/Mukanoo_Hero@4x\.webp" alt="" width="576" height="44" decoding="async">/,
  '<picture>' +
    '<source media="(max-width: 860px)" srcset="assets/icons/mobile/Mukanoo_Hero.webp" type="image/webp">' +
    '<img class="hero__logo" src="assets/icons/Mukanoo_Hero@4x.webp" alt="" width="576" height="44" decoding="async" fetchpriority="high">' +
    "</picture>"
);

// head preloads: responsive LCP assets
html = html.replace(
  /<link rel="preload" as="image" href="assets\/backgrounds\/hero_bg\.webp" type="image\/webp" fetchpriority="high">/,
  '<link rel="preload" as="image" href="assets/backgrounds/mobile/hero_bg.webp" type="image/webp" media="(max-width: 860px)" fetchpriority="high">\n' +
    '  <link rel="preload" as="image" href="assets/backgrounds/hero_bg.webp" type="image/webp" media="(min-width: 861px)" fetchpriority="high">\n' +
    '  <link rel="preload" as="image" href="assets/icons/mobile/Mukanoo_Hero.webp" type="image/webp" media="(max-width: 860px)" fetchpriority="high">\n' +
    '  <link rel="preload" as="image" href="assets/icons/Mukanoo_Hero@4x.webp" type="image/webp" media="(min-width: 861px)" fetchpriority="high">'
);

// async Google Fonts (keeps display=swap; removes render-block without changing final look)
html = html.replace(
  /<link href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)" rel="stylesheet">/,
  '<link rel="preload" as="style" href="$1">\n' +
    '  <link href="$1" rel="stylesheet" media="print" onload="this.media=\'all\'">\n' +
    '  <noscript><link href="$1" rel="stylesheet"></noscript>'
);

fs.writeFileSync("index.html", html);
console.log("index.html updated");
