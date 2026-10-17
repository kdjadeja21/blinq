import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile(new URL("../src/app/icon.svg", import.meta.url));
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(out(name));
}

const inner = Math.round(512 * 0.64);
const glyph = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#6E28D9" },
})
  .composite([{ input: glyph, gravity: "center" }])
  .png()
  .toFile(out("icon-maskable-512.png"));
