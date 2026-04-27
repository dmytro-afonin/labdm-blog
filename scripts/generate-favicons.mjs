import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const svgPath = join(pub, "favicon.svg");

/**
 * PNG with alpha: transparent where the SVG has no paint. favicon.svg does not use an
 * opaque full-viewBox rect; any white would come from adding such in the SVG itself.
 */
async function rasterTransparent(size, outFile) {
  await sharp(svgPath).resize(size, size).ensureAlpha().png().toFile(outFile);
}

await rasterTransparent(16, join(pub, "favicon-16x16.png"));
await rasterTransparent(32, join(pub, "favicon-32x32.png"));

const buf16 = readFileSync(join(pub, "favicon-16x16.png"));
const buf32 = readFileSync(join(pub, "favicon-32x32.png"));
writeFileSync(join(pub, "favicon.ico"), await pngToIco([buf16, buf32]));

await rasterTransparent(180, join(pub, "apple-touch-icon.png"));
await rasterTransparent(192, join(pub, "icon-192.png"));
await rasterTransparent(512, join(pub, "icon-512.png"));

console.log(
  "Wrote favicon PNGs, ICO, apple-touch-icon, and manifest icons in public/",
);
