// Bundle the built pack for a release and record what went into it. Uses the
// same zip writer as the presets, so the archives are deterministic and the
// checksums mean something; CI calls this script, it is not a CI-only path.

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { zip } from "../src/zip.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "release");

const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
const version = pkg.version;

const pngs = (await readdir(path.join(DIST, "wallpapers"))).filter((f) => f.endsWith(".png")).sort();
const presets = (await readdir(DIST)).filter((f) => f.endsWith(".kwgt")).sort();
if (!presets.length) throw new Error("dist/ has no presets — run npm run build first");
if (pngs.length < 2) throw new Error("dist/wallpapers has no renders — run npm run build first");

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

/** The preset archive mirrors dist/: the ten files, plus the manifest. */
const presetEntries = [
  ...(await Promise.all(
    presets.map(async (name) => ({ name, data: await readFile(path.join(DIST, name)) })),
  )),
  { name: "manifest.json", data: await readFile(path.join(DIST, "manifest.json")) },
];

const wallEntries = [
  { name: "manifest.json", data: await readFile(path.join(DIST, "wallpapers", "manifest.json")) },
  ...(await Promise.all(
    pngs.map(async (name) => ({
      name,
      data: await readFile(path.join(DIST, "wallpapers", name)),
    })),
  )),
  ...(
    await Promise.all(
      (await readdir(path.join(DIST, "wallpapers", "svg")))
        .filter((f) => f.endsWith(".svg"))
        .sort()
        .map(async (name) => ({
          name: `svg/${name}`,
          data: await readFile(path.join(DIST, "wallpapers", "svg", name)),
        })),
    )
  ),
];

const bundles = [
  { name: `crimson-moon-widgets-${version}.zip`, entries: presetEntries, what: `${presets.length} presets` },
  { name: `crimson-moon-wallpapers-${version}.zip`, entries: wallEntries, what: `${pngs.length} wallpapers + SVG sources` },
];

for (const bundle of bundles) {
  const archive = zip(bundle.entries);
  await writeFile(path.join(OUT, bundle.name), archive);
  const sha = createHash("sha256").update(archive).digest("hex");
  await writeFile(path.join(OUT, `${bundle.name}.sha256`), `${sha}  ${bundle.name}\n`);
  console.log(`  ${bundle.name.padEnd(38)} ${(archive.length / 1024).toFixed(0).padStart(5)} KB  ${bundle.what}`);
  console.log(`  ${" ".repeat(38)} ${sha}`);
}

console.log(`\nBundled ${bundles.length} archives for ${version}`);
