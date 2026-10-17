// Stage everything the Android app ships: the presets Kustom loads, the
// wallpapers it applies, and a catalog the app draws its thumbnails from.
//
// The catalog exists so the app never needs preview bitmaps. It draws each
// preset from the same declarative spec the .kwgt was built from, with the
// phone's own fonts — which is the only way the kanji in the designs render
// correctly on a device without shipping a font.

import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { WIDGETS } from "../src/widgets.mjs";
import { WALLPAPERS } from "../src/wallpapers.mjs";
import { GEOMETRY, INK, THEME_GLOBALS } from "../src/tokens.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const ASSETS = path.join(ROOT, "android", "app", "src", "main", "assets");

const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));

const globals = Object.fromEntries(
  Object.entries(THEME_GLOBALS).map(([name, def]) => [name, def.value]),
);

/**
 * A spec colour is a global, a formula that names one, a literal, or nothing.
 * The app needs one ARGB per item, so a formula resolves to the first global it
 * mentions — the preview shows the accent state, not the alert state.
 */
function resolveColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  if (value.startsWith("gv:")) return globals[value.slice(3)] ?? fallback;
  const global = value.match(/gv\((\w+)\)/);
  if (global && globals[global[1]]) return globals[global[1]];
  const hex = value.match(/#([0-9A-Fa-f]{8})/);
  if (hex) return `#${hex[1].toUpperCase()}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return `#FF${value.slice(1).toUpperCase()}`;
  return fallback;
}

const TEXT_FALLBACK = INK.text;
const DIM_FALLBACK = INK.dim;

function itemFor(item) {
  const base = { kind: item.kind, title: item.title ?? "Card" };
  if (item.kind === "card") {
    return { ...base, color: resolveColor(item.color ?? "gv:ink", globals.ink) };
  }
  if (item.kind === "text") {
    const color =
      item.color === "gv:dimColor"
        ? DIM_FALLBACK
        : resolveColor(item.color, TEXT_FALLBACK);
    return {
      ...base,
      x: item.x,
      y: item.y,
      w: item.w,
      size: item.size,
      color,
      text: item.demo,
      align: item.align ?? "LEFT",
      lines: item.lines ?? 1,
    };
  }
  if (item.kind === "bar") {
    return {
      ...base,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      level: item.demo ?? 50,
      color: resolveColor(item.demoColor ?? item.color, globals.accent),
      track: resolveColor(item.track, "#33F6E7EC"),
    };
  }
  if (item.kind === "art") {
    return { ...base, x: item.x, y: item.y, w: item.w, h: item.h };
  }
  if (item.kind === "rule" || item.kind === "vrule") {
    return {
      ...base,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      color: resolveColor(item.color, globals.hairline),
    };
  }
  // circle and rect share a shape payload
  return {
    ...base,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    circle: item.kind === "circle",
    color: resolveColor(item.color, globals.accent),
  };
}

const widgets = WIDGETS.map((spec) => ({
  id: spec.id,
  title: spec.title,
  description: spec.description,
  grid: spec.grid,
  file: `${spec.id}.kwgt`,
  items: spec.items.filter((item) => item.kind !== "tap").map(itemFor),
}));

const wallpapers = WALLPAPERS.map((design) => ({
  id: design.id,
  title: design.title,
  description: design.description,
  file: `${design.id}.png`,
}));

await rm(ASSETS, { recursive: true, force: true });
await mkdir(path.join(ASSETS, "widgets"), { recursive: true });
await mkdir(path.join(ASSETS, "wallpapers"), { recursive: true });

const presets = (await readdir(DIST)).filter((f) => f.endsWith(".kwgt")).sort();
for (const file of presets) {
  await copyFile(path.join(DIST, file), path.join(ASSETS, "widgets", file));
}

for (const wallpaper of wallpapers) {
  await copyFile(
    path.join(DIST, "wallpapers", wallpaper.file),
    path.join(ASSETS, "wallpapers", wallpaper.file),
  );
}

await writeFile(
  path.join(ASSETS, "catalog.json"),
  `${JSON.stringify(
    {
      version: pkg.version,
      package: "com.crimsonmoon.widgets",
      corners: GEOMETRY.corners,
      widgets,
      wallpapers,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `  android assets  ${presets.length} presets, ${wallpapers.length} wallpapers, catalog for ${widgets.length} boards`,
);
