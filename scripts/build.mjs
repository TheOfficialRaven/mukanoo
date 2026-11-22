/*
 * Éles build (Netlify): a deploy-mappában dolgozik, a repó forrásfájljai érintetlenek maradnak.
 * - css/styles.css és js/main.js minifikálása
 * - tartalom-hash a ?v= paraméterben (hosszú cache biztonságosan)
 * - index.html: a CSS beágyazása <style>-ba (nincs renderelést blokkoló CSS-kérés)
 * - index.html: a mobil hero logó (LCP) data URI-ként, preload nélkül
 *
 * Futtatás: Netlify-on automatikusan; helyben csak másolaton: node scripts/build.mjs <mappa>
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { transform } from "esbuild";

const target = process.argv[2] || (process.env.NETLIFY === "true" ? process.cwd() : null);
if (!target) {
  console.error("Csak másolaton futtasd: node scripts/build.mjs <kimeneti-mappa>");
  process.exit(1);
}

const root = path.resolve(target);
const cssPath = path.join(root, "css", "styles.css");
const jsPath = path.join(root, "js", "main.js");

const hash = (text) => crypto.createHash("sha1").update(text).digest("hex").slice(0, 10);

const css = (await transform(fs.readFileSync(cssPath, "utf8"), { loader: "css", minify: true })).code;
const js = (await transform(fs.readFileSync(jsPath, "utf8"), { loader: "js", minify: true })).code;
fs.writeFileSync(cssPath, css);
fs.writeFileSync(jsPath, js);

const cssHash = hash(css);
const jsHash = hash(js);

/* A gyökérben lévő HTML-hez képest: ../assets → assets */
const inlineCss = css.replace(/url\((["']?)\.\.\//g, "url($1");

/* Mobil LCP (hero logó): a HTML-be ágyazva nincs külön képkérés */
const heroMobile = "assets/icons/mobile/Mukanoo_Hero.webp";
const heroMobileUri = `data:image/webp;base64,${fs.readFileSync(path.join(root, heroMobile)).toString("base64")}`;

for (const name of fs.readdirSync(root).filter((file) => file.endsWith(".html"))) {
  const file = path.join(root, name);
  let html = fs.readFileSync(file, "utf8");

  html = html
    .replace(/css\/styles\.css(\?v=[^"']*)?/g, `css/styles.css?v=${cssHash}`)
    .replace(/js\/main\.js(\?v=[^"']*)?/g, `js/main.js?v=${jsHash}`);

  if (name === "index.html") {
    html = html.replace(
      /<link rel="stylesheet" href="css\/styles\.css\?v=[^"]*">/,
      () => `<style>${inlineCss}</style>`
    );
    html = html
      .replace(/[ \t]*<link rel="preload" as="image" href="assets\/icons\/mobile\/Mukanoo_Hero\.webp"[^>]*>\r?\n/, "")
      .replace(`src="${heroMobile}"`, () => `src="${heroMobileUri}"`);
  }

  fs.writeFileSync(file, html);
}

console.log(
  `build kész — css ${Math.round(css.length / 1024)} KB (${cssHash}), js ${Math.round(js.length / 1024)} KB (${jsHash})`
);
