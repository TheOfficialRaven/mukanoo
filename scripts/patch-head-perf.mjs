import fs from "fs";
import path from "path";

const file = path.resolve("e:/HTML/mukanoo weboldal/index.html");
let html = fs.readFileSync(file, "utf8");

const fontsDesktop =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Marcellus+SC&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Ms+Madi&display=swap";
const fontsMobile =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Montserrat:wght@400;500&family=Ms+Madi&display=swap";

const headStart = html.indexOf("<head>");
const headEnd = html.indexOf("</head>");
if (headStart < 0 || headEnd < 0) throw new Error("head not found");

const newHead = `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Mukanoo</title>
  <meta name="description" content="Mukanoo — anyag, fény és nyugodt arányok. Munkák, szemlélet és kapcsolat.">
  <meta name="theme-color" content="#e1e1e1">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- Mobil: kevesebb fontfájl; asztal: teljes készlet -->
  <link rel="preload" as="style" href="${fontsMobile}" media="(max-width: 860px)" onload="this.onload=null;this.rel='stylesheet'">
  <link rel="preload" as="style" href="${fontsDesktop}" media="(min-width: 861px)" onload="this.onload=null;this.rel='stylesheet'">
  <noscript>
    <link href="${fontsMobile}" rel="stylesheet" media="(max-width: 860px)">
    <link href="${fontsDesktop}" rel="stylesheet" media="(min-width: 861px)">
  </noscript>
  <link rel="preload" as="image" href="assets/backgrounds/mobile/hero_bg.webp" type="image/webp" media="(max-width: 860px)" fetchpriority="high">
  <link rel="preload" as="image" href="assets/backgrounds/hero_bg.webp" type="image/webp" media="(min-width: 861px)" fetchpriority="high">
  <link rel="preload" as="image" href="assets/icons/mobile/Mukanoo_Hero.webp" type="image/webp" media="(max-width: 860px)" fetchpriority="high">
  <link rel="preload" as="image" href="assets/icons/Mukanoo_Hero@4x.webp" type="image/webp" media="(min-width: 861px)" fetchpriority="high">
  <!-- Kritikus above-the-fold stílus (LCP), a teljes CSS async -->
  <style>
    :root{--paper:#fcfcfc;--hero:#e1e1e1;--ink:#2c2825;--header-tall:4.75rem;--pad:clamp(1.75rem,5.5vw,5.5rem);--vh-small:100svh;--serif:Georgia,"Times New Roman",serif;--sans:"Segoe UI",system-ui,sans-serif}
    html{font-size:100%}
    body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans)}
    .skip{position:absolute;left:-9999px}
    .site-header{position:fixed;inset:0 0 auto;z-index:30;height:var(--header-tall);display:flex;align-items:center;justify-content:center;padding-inline:var(--pad);background:transparent;color:#fff}
    .hero{position:relative;isolation:isolate;display:flex;align-items:flex-end;justify-content:center;box-sizing:border-box;min-height:var(--vh-small);margin:0;padding:var(--header-tall) var(--pad) 6.5svh;background-color:var(--hero);background-position:center;background-size:cover;background-repeat:no-repeat;color:#fff;text-align:center}
    @media (max-width:860px){.hero{background-image:url("assets/backgrounds/mobile/hero_bg.webp")}}
    @media (min-width:861px){.hero{background-image:url("assets/backgrounds/hero_bg.webp")}}
    .hero::before{content:"";position:absolute;inset:0;z-index:0;background:rgba(28,24,20,.38);pointer-events:none}
    .hero__inner{position:relative;z-index:1;width:min(40rem,100%)}
    .hero__logo{display:block;width:min(36rem,92vw);height:auto;margin-inline:auto}
    .hero__quote{margin:.85rem 0 1.1rem;font-family:var(--serif);font-size:clamp(1rem,2.8vw,1.2rem);font-style:italic}
    .hero__actions{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center}
    .btn{display:inline-flex;align-items:center;justify-content:center;min-width:11rem;padding:.85rem 1.25rem;border:1px solid transparent;text-decoration:none;font-family:var(--sans);font-size:.9rem}
    .btn--gold{background:#b99758;border-color:#b99758;color:#fff}
    .btn--line{background:transparent;border-color:rgba(255,255,255,.75);color:#fff}
  </style>
  <link rel="preload" href="css/styles.min.css?v=perf-mobile-2" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="css/styles.min.css?v=perf-mobile-2"></noscript>
  <script>
    /* VH lock a first paint UTÁN — csökkenti a kritikus útvonal kényszerített reflow-ját */
    (function () {
      function measure(unit) {
        var el = document.createElement("div");
        el.style.cssText = "position:fixed;left:0;top:0;width:0;height:" + unit + ";visibility:hidden;pointer-events:none;";
        document.documentElement.appendChild(el);
        var h = el.getBoundingClientRect().height;
        document.documentElement.removeChild(el);
        return Math.round(h) || 0;
      }
      function lock() {
        var small = measure("100svh") || window.innerHeight || 0;
        var large = measure("100lvh") || 0;
        if (large < small) large = small;
        var avail = (window.screen && screen.availHeight) || 0;
        var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        if (coarse && large <= small + 2 && avail > small + 24 && avail < small * 1.45) large = avail;
        var root = document.documentElement.style;
        root.setProperty("--vh-small", small + "px");
        root.setProperty("--vh-large", large + "px");
        root.setProperty("--app-height", large + "px");
      }
      window.__mukanooLockVh = lock;
      function run() { requestAnimationFrame(lock); }
      if (document.readyState === "complete") run();
      else window.addEventListener("load", run, { once: true });
    })();
  </script>
`;

html = html.slice(0, headStart) + newHead + html.slice(headEnd);
html = html.replace(
  `<script src="js/main.js" defer></script>`,
  `<script src="js/main.min.js?v=perf-mobile-2" defer></script>`
);

fs.writeFileSync(file, html);
console.log("Head patched for mobile performance");
