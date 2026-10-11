import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Keep browser tabs and Apple home-screen icons aligned with the same brand mark.
const app = new URL("../src/app/", import.meta.url);
const source = await readFile(new URL("icon.svg", app));
const png = (size) => sharp(source).resize(size, size).png().toBuffer();

await writeFile(new URL("icon.png", app), await png(48));
await writeFile(new URL("apple-icon.png", app), await png(180));

// An ICO containing PNG frames supports older clients requesting /favicon.ico.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(new URL("favicon.ico", app), Buffer.concat([header, ...frames]));
