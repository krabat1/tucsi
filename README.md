Az alkalmazás egy SSG (https://developer.mozilla.org/en-US/docs/Glossary/SSG).
A megadott bemenetek alapján a `/dist` könyvtárba generál (előrenderel) statikus html fájlokat.
Csak ezeket kell a szerverre feltölteni. Nincs szerveroldali logika, viszont így nincs is ami lassítsa az oldalt, SEO szempontból a legjobb, mert a robotok azonnal és egy az egyben azt látják a html fájlokat, nem tud leállni az oldal mert nincs benne futó kód, amit fel lehetne törni, és nincs folyamat ami le tudna állni, soha nem kell azon aggódni hogy "fut-e a node".

A szerveren tehát nincs Node.js függőség: Ha a szolgáltató frissít valamit, vagy leáll a Node, az oldal meg sem rezdül, mert statikus.

Gyorsaság: Az Nginx-nél nincs gyorsabb dolog a világon, mint amikor egy kész fájlt kell odaadnia. Nincs script futtatás, nincs várakozás.

Karbantarthatóság: Fejlesztésnél megmarad a "PHP include" élmény, ez csak a fejlesztőnek érdekes, mert nem kell 10 helyen átírnia a menüt.

Ajánlott .htaccess apache szerver esetén:
``` Apache
RewriteEngine On
RewriteBase /

# 1. Ha a kérés a főoldalra jön (üres path)
RewriteRule ^$ dist/index.html [L]

# 2. Ha a kért fájl létezik a dist mappában (pl. css/style.css)
RewriteCond %{DOCUMENT_ROOT}/dist/$1 -f
RewriteRule ^(.*)$ dist/$1 [L]

# 3. Szép URL-ek: ha létezik a fájl .html kiterjesztéssel a dist mappában
# Pl: domain.hu/rolunk -> dist/rolunk.html-t szolgálja ki
RewriteCond %{DOCUMENT_ROOT}/dist/$1.html -f
RewriteRule ^(.*)$ dist/$1.html [L]

# 4. Opcionális: 404 hiba kezelése
ErrorDocument 404 /dist/404.html
``` 
Ha az Apache szerveren valamiért nem működnének a szép URL-ek, nézd meg, hogy az Apache-nál az `AllowOverride All` be van-e kapcsolva – ez kell ahhoz, hogy a `.htaccess` életbe lépjen.
 
Ha a szolgáltató Nginx-et használ, ott a `.htaccess` nem fog működni. Ebben az esetben a tárhely admin felületén (vagy a konfigurációban) az alábbi `try_files` direktívát kell keresni/beállítani:

```Nginx
location / {
    root /elérési/út/a/projekthez/dist;
    index index.html;
    try_files $uri $uri.html $uri/ =404;
}
```
# Fejlesztés
## Kezdő lépések
- `npm init` - saját parancsok (`start`, `build`), későbbi bővíthetőség
- `git init` - mentéshez
## Fájlok/könyvtárak
- `/partials` - a honlap fix részei: header(fejrész + menü) és lábléc
- `/public` - statikusan kiszolgált fájlok: képek, stíluslap
- `/src` - itt vannak az oldalak tartalmai, a `/css/input.css` stíluslap, amit a tailwind/postcss figyel, ez alapján kompilálja a - `/public/css/style.css`-t, amit a fejlesztés során használ az oldal és a build után a `/dist`-be kerül
- `app.js` - ez hajtja végre a fejlesztés közbeni változásfigyelést és a folyamat végén a build-et
- `jsconfig.json` - tisztázza hogy ez ES modul és nem CommonJS, megkímél a típusellenőrzéstől
- `postcss.config.js` - tailwind beállítás
- `package.json` - a script parancsok és a függőségek miatt érdekes

## Függőségek:
Főleg devDependencies, tehát fejlesztési eszközök
### Tailwind
**Tailwind**: a Sass/SCSS-sel szemben, ami egy preprocesszor (fogja a speciális .scss kódat (változók, nesting), és lefordítja böngésző által érthető CSS-re), a tailwind egy posztprocesszor. Átnézi a html és js fájlokat, kigyűjti milyen osztályokat használtál (pl. `flex`, `pt-4`), és csak azokhoz generál CSS szabályokat. JIT (just in time) motort használ, figyeli a fájlmentést, és a másodperc törtrésze alatt "on-the-fly" generálja le a CSS-t. Ha beírod a HTML-be, hogy `bg-[#ff5733]`, a Tailwind abban a pillanatban létrehozza ezt az egyedi színosztályt a CSS fájlban. Sass-ban gyakran halmozódik fel "halott kód" (olyan CSS, amit már nem is használsz, de félsz kitörölni). A Tailwindnél ilyen nincs: a végső CSS fájlodban csak és kizárólag azok az osztályok lesznek benne, amik ténylegesen szerepelnek a HTML kódodban. Így a CSS fájlméreted általában megáll 10-20 KB körül, bármilyen óriási is az oldal.

### Tailwind telepítés:
>"Tailwind CSS v4.0 has removed the CLI in favor of new tooling approaches. The `npx tailwindcss init` command **no longer works** because there's no standalone CLI binary anymore."
```
npm install -D tailwindcss@next @tailwindcss/postcss@next
~~npx tailwindcss init~~ (NEM KELL!!)
npm install -D postcss postcss-cli
npm install -D concurrently
```
### lightningcss hiba
https://stackoverflow.com/questions/79357760/how-to-fix-cannot-find-module-lightningcss-win32-x64-msvc-node-error-in-native
Ez egy ismert probléma a Tailwind v4-gyel - hiányzik egy natív bináris függőség (lightningcss).
Megoldás:
`rm -rf node_modules package-lock.json`
azután
`npm install`

### VSCode Extension:
PostCSS Language Support
https://marketplace.visualstudio.com/items?itemName=csstools.postcss
Ez kilövi a figyelmeztetéseket postcss-nél

### @apply és @reference
Az @apply funkció csak  a @reference "tailwindcss"; szabállyal együtt használható
https://tailwindcss.com/docs/functions-and-directives#reference-directive

## concurrently
https://www.npmjs.com/package/concurrently
Párhuzamos futtatás kell hogy figyeljük a 3000-es portot és a css-mentést is.
`"start": "npm run watch:node && watch:css"`
- A `watch:node` elindul és folyamatosan fut (nem áll le)
- Az `&&` operátor megvárja amíg az első parancs befejeződik
- Mivel a `watch:nod`e soha nem áll le, a `watch:css` soha nem fog elindulni

Tehát:
`"start": "concurrently \"npm run watch:node\" \"npm run watch:css\""`

# DevTools Project Settings
chrome://flags/#devtools-project-settings -> off

## Jelenlegi honlap
https://tucsiphysio.webnode.hu/
## Google fonts
logo font: https://fonts.google.com/specimen/Life+Savers
menu font: Metropolis helyett
https://fonts.google.com/specimen/Figtree
page title: https://fonts.google.com/specimen/Josefin+Sans
https://fonts.google.com/specimen/Quicksand
https://fonts.google.com/specimen/Allura

page subtitle: Metropolis helyett
https://fonts.google.com/specimen/Figtree

képnézegető: https://photoswipe.com/getting-started/

## Utómunkák
- SEO
- WAI-ARIA
