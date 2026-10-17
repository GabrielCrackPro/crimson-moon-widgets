// Rasterise the wallpaper set and record exactly what was written. Kept out of
// tools/build.mjs so the preset build stays dependency-free: only this script
// needs sharp, and `npm run check` can verify its output without it.

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { WALLPAPERS, CANVAS, SIZES, wallpaperAt } from "../src/wallpapers.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "dist", "wallpapers");
const SVG_OUT = path.join(OUT, "svg");

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(SVG_OUT, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    canvas: CANVAS,
    designs: [],
  };

  for (const design of WALLPAPERS) {
    await writeFile(path.join(SVG_OUT, `${design.id}.svg`), design.svg);

    const files = [];
    for (const size of SIZES) {
      const height = Math.round((size.width * CANVAS.height) / CANVAS.width);
      const png = await sharp(Buffer.from(wallpaperAt(design, size.width)))
        .png({ compressionLevel: 9, palette: false })
        .toBuffer();
      const name = `${design.id}${size.suffix}.png`;
      await writeFile(path.join(OUT, name), png);
      files.push({
        id: size.id,
        file: `wallpapers/${name}`,
        width: size.width,
        height,
        bytes: png.length,
        sha256: createHash("sha256").update(png).digest("hex"),
      });
      console.log(`  ${name.padEnd(22)} ${size.width}×${height}  ${(png.length / 1024).toFixed(0)} KB`);
    }

    manifest.designs.push({
      id: design.id,
      title: design.title,
      description: design.description,
      svg: `wallpapers/svg/${design.id}.svg`,
      files,
    });
  }

  await writeFile(path.join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nGenerated ${manifest.designs.length} wallpapers × ${SIZES.length} sizes`);
}

await main();
