import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { WIDGETS } from "../src/widgets.mjs";
import { buildPreset, stripPreview } from "../src/modules.mjs";
import { zip, zipEntryNames } from "../src/zip.mjs";
import { PALETTE, SURFACE, INK, THEME_GLOBALS } from "../src/tokens.mjs";
import { WALLPAPERS, SIZES, CANVAS } from "../src/wallpapers.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

const MODULE_TYPES = new Set(["RootLayerModule", "ShapeModule", "TextModule", "BitmapModule"]);
// Enum values only ever observed in real KWGT exports. Anything else is a
// guess, and a guessed enum is silently ignored by the app.
const ENUMS = {
  position_anchor: new Set(["TOPLEFT", "TOPRIGHT", "CENTERLEFT", "TOP", "BOTTOMLEFT", "BOTTOM"]),
  shape_type: new Set(["RECT", "CIRCLE"]),
  text_align: new Set(["CENTER"]),
  text_size_type: new Set(["FIXED_WIDTH"]),
  bitmap_scale_mode: new Set(["CENTER_CROP"]),
};
const FUNCTIONS = new Set(["si", "gv", "df", "tc", "bi", "wi", "mi", "if", "ci", "nc", "mu", "round"]);
const FEATURES = new Set(["", "MUSIC", "CALENDAR"]);
const TOGGLE_ON = 10;

// Every colour the pack is allowed to paint with, alpha ignored: the icon
// pack's palette plus the surfaces derived from it.
const RGB = new Set(
  [...Object.values(PALETTE), ...Object.values(SURFACE), ...Object.values(INK)]
    .map((v) => String(v).replace("#", "").slice(-6).toUpperCase()),
);

let failures = 0;
const fail = (message) => {
  failures++;
  console.log(`  \u2717 ${message}`);
};
const ok = (message) => console.log(`  ok  ${message}`);

function modulesIn(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (node.internal_type) out.push(node);
  for (const child of node.viewgroup_items ?? []) modulesIn(child, out);
  return out;
}

/** A property formula is the whole value: exactly one $...$ pair. */
function checkFormula(where, raw) {
  if (typeof raw !== "string" || !raw.includes("$")) return;
  if (!raw.startsWith("$") || !raw.endsWith("$") || raw.length < 2) {
    fail(`${where}: formula is not wrapped in $...$: ${raw}`);
    return;
  }
  checkExpression(where, raw.slice(1, -1), raw);
}

/**
 * A text_expression may mix prose and formulas — `$df(hh)$ minutes` is valid
 * Kustom — so only the pieces between dollars are checked as code.
 */
function checkTextExpression(where, raw) {
  if (typeof raw !== "string") return;
  if (!raw.trim()) {
    fail(`${where}: empty text_expression`);
    return;
  }
  const parts = raw.split("$");
  if ((parts.length - 1) % 2 !== 0) {
    fail(`${where}: odd number of $ in text_expression: ${raw}`);
    return;
  }
  for (let i = 1; i < parts.length; i += 2) checkExpression(where, parts[i], raw);
}

function checkExpression(where, inner, raw) {
  if (inner.includes("$")) fail(`${where}: nested $ inside a formula: ${raw}`);
  const opens = (inner.match(/\(/g) ?? []).length;
  const closes = (inner.match(/\)/g) ?? []).length;
  if (opens !== closes) fail(`${where}: unbalanced parentheses: ${raw}`);
  for (const call of inner.matchAll(/([a-z]+)\s*\(/g)) {
    if (!FUNCTIONS.has(call[1])) fail(`${where}: unknown function ${call[1]}() in ${raw}`);
  }
}

function checkColors(where, raw) {
  if (typeof raw !== "string") return;
  for (const match of raw.matchAll(/#([0-9A-Fa-f]{6,8})/g)) {
    const hex = match[1].toUpperCase();
    if (hex.length === 6) {
      fail(`${where}: colour ${match[0]} is missing the alpha byte Kustom expects`);
      continue;
    }
    if (!RGB.has(hex.slice(2))) fail(`${where}: ${match[0]} is outside the palette`);
  }
}

// ------------------------------------------------------------- the specs
// The presets can only be as honest as their specs, so the source of truth is
// checked first: unique ids, a card behind every board, and a demo value for
// every string the preview has to draw.
const ITEM_KINDS = new Set(["card", "rect", "circle", "text", "rule", "vrule", "bar", "art", "tap"]);
{
  const ids = new Set();
  for (const spec of WIDGETS) {
    if (!/^[a-z][a-z0-9-]*$/.test(spec.id)) fail(`widget id "${spec.id}" is not a lowercase slug`);
    if (ids.has(spec.id)) fail(`duplicate widget id ${spec.id}`);
    ids.add(spec.id);
    if (!spec.title || !spec.description) fail(`${spec.id}: needs a title and a description`);
    if ((spec.description ?? "").length > 96) fail(`${spec.id}: description is longer than a launcher row`);
    for (const n of spec.grid) {
      if (!Number.isInteger(n) || n < 1 || n > 8) fail(`${spec.id}: grid ${spec.grid.join("x")} is out of range`);
    }
    const cards = spec.items.filter((item) => item.kind === "card");
    if (cards.length !== 1) fail(`${spec.id}: needs exactly one card, found ${cards.length}`);
    if (spec.items[0]?.kind !== "card") fail(`${spec.id}: the card has to be the first item, or it covers the board`);

    const titles = new Set();
    const rows = spec.grid[1];
    for (const item of spec.items) {
      if (!ITEM_KINDS.has(item.kind)) fail(`${spec.id}: unknown item kind "${item.kind}"`);
      // The card is the one unnamed item: buildPreset titles it "Card" itself.
      if (item.kind !== "card") {
        if (!item.title) fail(`${spec.id}: an item has no title`);
        if (titles.has(item.title)) fail(`${spec.id}: two items are titled "${item.title}"`);
        titles.add(item.title);
      }
      // Everything is placed inside the root, so nothing can be dragged off a
      // plate by a rounding error at an unusual size. A vrule stores its width
      // in dp (it is a hairline), so only its height is a fraction.
      if (item.kind === "card") continue;
      if (!(item.x >= 0 && item.x <= 1)) fail(`${spec.id}/${item.title}: left ${item.x} is outside the root`);
      if (!(item.y >= 0 && item.y <= 1)) fail(`${spec.id}/${item.title}: top ${item.y} is outside the root`);
      if (item.kind !== "vrule" && (item.x ?? 0) + (item.w ?? 0) > 1.001)
        fail(`${spec.id}/${item.title}: runs past the right edge`);
      if (item.kind === "vrule" && (item.y ?? 0) + item.h > 1.001) fail(`${spec.id}/${item.title}: runs past the bottom edge`);
      if (item.kind === "art" && (item.y ?? 0) + item.h > 1.001) fail(`${spec.id}/${item.title}: runs past the bottom edge`);
      if (item.kind === "bar" && !(item.demo >= 0 && item.demo <= 100)) fail(`${spec.id}/${item.title}: demo level ${item.demo} is not a percentage`);

      if (item.kind !== "text") continue;
      if (typeof item.demo !== "string") {
        fail(`${spec.id}/${item.title}: text has no demo value, so the preview would draw a gap`);
      } else if (!item.expr.includes("$") && item.demo !== item.expr) {
        fail(`${spec.id}/${item.title}: literal text and its demo disagree`);
      }
      // A text box grows downwards from its top; the estimate is generous
      // (1.2 line height) so a layout that only just fits still passes.
      const bottom = (item.y ?? 0) + ((item.lines ?? 1) * item.size * 1.2) / (rows * 100);
      if (bottom > 1.03) fail(`${spec.id}/${item.title}: text runs past the bottom edge (${bottom.toFixed(3)})`);
      if ((item.y ?? 0) < 0) fail(`${spec.id}/${item.title}: text starts above the board`);
    }
  }
}
ok(`${WIDGETS.length} specs are well formed`);

// --------------------------------------------------------------- the presets
const generated = [];
for (const spec of WIDGETS) {
  const preset = stripPreview(buildPreset(spec));
  const json = `${JSON.stringify(preset, null, 2)}\n`;
  const archive = zip([{ name: "preset.json", data: json }]);
  generated.push({ spec, json, archive });
}

const files = await readdir(DIST).catch(() => []);
if (!files.length) fail("dist/ is empty — run npm run build first");

let archiveChecked = 0;
for (const { spec, json, archive } of generated) {
  const file = `${spec.id}.kwgt`;
  const onDisk = await readFile(path.join(DIST, file)).catch(() => null);
  if (!onDisk) {
    fail(`missing preset: ${file}`);
    continue;
  }
  if (!onDisk.equals(archive)) fail(`${file}: on disk differs from what the sources build`);
  const names = zipEntryNames(onDisk);
  // A .kwgt is a zip whose root holds preset.json; anything else is either a
  // leftover or a sign the container was written wrong.
  if (names.length !== 1 || names[0] !== "preset.json")
    fail(`${file}: archive entries should be [preset.json], got [${names.join(", ")}]`);

  const parsed = JSON.parse(onDisk.length ? json : "{}");
  const info = parsed.preset_info ?? {};
  for (const key of ["version", "title", "description", "author", "features", "release", "locked", "pflags"]) {
    if (!(key in info)) fail(`${file}: preset_info.${key} is missing`);
  }
  if (info.version !== 13) fail(`${file}: preset_info.version is ${info.version}, expected 13`);
  if (!info.title || !info.description) fail(`${file}: preset_info needs a title and description`);
  if (!FEATURES.has(info.features)) fail(`${file}: preset_info.features "${info.features}" is not a known value`);

  const root = parsed.preset_root ?? {};
  if (root.internal_type !== "RootLayerModule") fail(`${file}: root is not a RootLayerModule`);
  const globals = root.globals_list ?? {};
  if (!Object.keys(globals).length) fail(`${file}: no globals_list`);
  for (const [name, def] of Object.entries(globals)) {
    if (typeof def.index !== "number") fail(`${file}: global ${name} has no index`);
    if (!["COLOR", "NUMBER"].includes(def.type)) fail(`${file}: global ${name} has type ${def.type}`);
    if (def.type === "COLOR") checkColors(`${file}/global ${name}`, def.value);
  }

  const modules = modulesIn(root).filter((m) => m.internal_type !== "RootLayerModule");
  for (const module of modules) {
    const where = `${file}/${module.internal_title ?? module.internal_type}`;
    if (!MODULE_TYPES.has(module.internal_type)) fail(`${where}: unknown internal_type ${module.internal_type}`);
    const toggles = module.internal_toggles ?? {};
    const formulas = module.internal_formulas ?? {};
    for (const [prop, value] of Object.entries(toggles)) {
      if (value !== TOGGLE_ON) fail(`${where}: toggle ${prop}=${value} is not ${TOGGLE_ON}`);
      if (!(prop in module) && !(prop in formulas)) fail(`${where}: toggle ${prop} has neither a value nor a formula`);
    }
    for (const prop of Object.keys(formulas)) {
      if (!(prop in toggles)) fail(`${where}: formula ${prop} is missing its toggle`);
    }
    if (!module.internal_title) fail(`${where}: module has no title`);
    for (const [prop, allowed] of Object.entries(ENUMS)) {
      if (module[prop] != null && !allowed.has(module[prop]))
        fail(`${where}: ${prop} "${module[prop]}" is not a value seen in real presets`);
    }
    for (const [prop, value] of Object.entries(module)) {
      if (typeof value === "string" && prop.startsWith("paint")) checkColors(where, value);
    }
    for (const value of Object.values(formulas)) {
      checkFormula(where, value);
      checkColors(where, value);
    }
    if (module.text_expression != null) {
      checkTextExpression(where, module.text_expression);
      // Width and size may arrive as literals or as formulas; either is valid,
      // but a text module with neither would let Kustom size it freely.
      for (const prop of ["text_width", "text_size"]) {
        if (!(prop in module) && !(prop in formulas)) fail(`${where}: text needs ${prop}`);
      }
    }
    if (module.internal_type === "BitmapModule" && !String(formulas.bitmap_bitmap ?? "").includes("mi(cover)"))
      fail(`${where}: bitmap source should come from mi(cover)`);
  }
  archiveChecked++;
}
ok(`${archiveChecked} presets are zips holding one valid preset.json`);

// Fonts: nothing may reference Kustom's bundled fonts, which we cannot ship.
for (const { spec, json } of generated) {
  if (json.includes("kfile://")) fail(`${spec.id}: references a bundled font or icon set we do not ship`);
}
ok("no preset depends on a font or icon set we do not ship");

// Geometry: everything has to land on the card.
for (const { spec, json } of generated) {
  const parsed = JSON.parse(json);
  for (const module of modulesIn(parsed.preset_root)) {
    const toggles = module.internal_toggles ?? {};
    const left = (module.internal_formulas ?? {}).position_padding_left ?? "";
    const top = (module.internal_formulas ?? {}).position_padding_top ?? "";
    const width = (module.internal_formulas ?? {}).shape_width ?? (module.internal_formulas ?? {}).text_width ?? "";
    const grab = (raw) => {
      const m = String(raw).match(/si\(rwidth\)\*([0-9.]+)/);
      return m ? Number(m[1]) : null;
    };
    const x = grab(left);
    const w = grab(width);
    if (x != null && w != null && x + w > 1.001)
      fail(`${spec.id}/${module.internal_title}: left ${x} + width ${w} runs past the widget edge`);
    if (top && !String(top).startsWith("$si(rheight)*"))
      fail(`${spec.id}/${module.internal_title}: top is not a fraction of the root height`);
    void toggles;
  }
}
ok("every module sits inside the widget it belongs to");

// ------------------------------------------------------------------ manifest
const manifestRaw = await readFile(path.join(DIST, "manifest.json"), "utf8").catch(() => null);
if (!manifestRaw) fail("missing dist/manifest.json");
else {
  const manifest = JSON.parse(manifestRaw);
  if (manifest.schemaVersion !== 13) fail(`manifest schemaVersion is ${manifest.schemaVersion}`);
  const ids = new Set();
  for (const entry of manifest.widgets) {
    if (ids.has(entry.id)) fail(`manifest repeats widget id ${entry.id}`);
    ids.add(entry.id);
    const spec = WIDGETS.find((w) => w.id === entry.id);
    if (!spec) {
      fail(`manifest lists ${entry.id}, which no widget spec defines`);
      continue;
    }
    if (entry.grid.join("x") !== spec.grid.join("x")) fail(`${entry.id}: grid ${entry.grid} disagrees with the spec`);
    const bytes = await readFile(path.join(DIST, entry.file)).catch(() => null);
    if (!bytes) fail(`${entry.id}: manifest points at a missing file`);
    else {
      if (bytes.length !== entry.bytes) fail(`${entry.id}: manifest size ${entry.bytes} is wrong`);
      const sha = createHash("sha256").update(bytes).digest("hex");
      if (sha !== entry.sha256) fail(`${entry.id}: manifest checksum is wrong`);
    }
  }
  if (manifest.widgets.length !== WIDGETS.length)
    fail(`manifest lists ${manifest.widgets.length} widgets, the sources define ${WIDGETS.length}`);
  ok(`${manifest.widgets.length} manifest entries match their files byte for byte`);
}

// ------------------------------------------------------------------- preview
const preview = await readFile(path.join(ROOT, "preview/index.html"), "utf8").catch(() => null);
if (!preview) fail("missing preview/index.html");
else {
  for (const spec of WIDGETS) {
    if (!preview.includes(spec.title)) fail(`preview is missing the board for ${spec.id}`);
    if (!preview.includes(`${spec.grid[0]}×${spec.grid[1]}`)) fail(`preview does not state the grid of ${spec.id}`);
  }
  // The preview renders demo strings; a formula reaching it means a spec lost
  // its sample value and the board would show raw Kustom syntax.
  const leaked = preview.match(/\$[a-z]+\s*\(/g);
  if (leaked) fail(`preview shows unrendered formulas: ${leaked.slice(0, 3).join(", ")}`);
  ok("preview renders every board at its launcher size");
}

// ---------------------------------------------------------------- wallpapers
// PNG dimensions come straight out of the IHDR chunk, so this pass needs no
// image library — the check stays dependency-free even though the renderer
// does not.
function pngSize(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

let wallpaperCount = 0;
const wallpaperManifestRaw = await readFile(path.join(DIST, "wallpapers", "manifest.json"), "utf8").catch(() => null);
if (!wallpaperManifestRaw) {
  fail("missing dist/wallpapers/manifest.json — run npm run wallpapers");
} else {
  const wallpapers = JSON.parse(wallpaperManifestRaw);
  if (wallpapers.designs.length !== WALLPAPERS.length)
    fail(`wallpaper manifest lists ${wallpapers.designs.length} designs, the sources define ${WALLPAPERS.length}`);

  for (const design of WALLPAPERS) {
    const entry = wallpapers.designs.find((d) => d.id === design.id);
    if (!entry) {
      fail(`wallpaper ${design.id} is missing from the manifest`);
      continue;
    }
    if (entry.title !== design.title) fail(`wallpaper ${design.id}: manifest title disagrees with the spec`);

    // A wallpaper that needs a font or a filter renders differently on another
    // machine, which is exactly the kind of surprise a backdrop cannot have.
    if (/<text[\s>]/.test(design.svg)) fail(`wallpaper ${design.id}: uses text, which depends on installed fonts`);
    if (/<filter[\s>]|feGaussianBlur/.test(design.svg)) fail(`wallpaper ${design.id}: uses a filter, which differs between rasterisers`);
    for (const match of design.svg.matchAll(/#([0-9A-Fa-f]{6})/g)) {
      if (!RGB.has(match[1].toUpperCase())) fail(`wallpaper ${design.id}: ${match[0]} is outside the palette`);
    }
    if (!design.svg.includes(`fill="${PALETTE.ink}"`)) fail(`wallpaper ${design.id}: does not fill the canvas with ink`);

    for (const size of SIZES) {
      const file = entry.files.find((f) => f.id === size.id);
      if (!file) {
        fail(`wallpaper ${design.id}: no ${size.id} render in the manifest`);
        continue;
      }
      const png = await readFile(path.join(DIST, file.file)).catch(() => null);
      if (!png) {
        fail(`wallpaper ${design.id}: ${file.file} is missing`);
        continue;
      }
      if (png.length !== file.bytes) fail(`wallpaper ${design.id} ${size.id}: manifest size is wrong`);
      const sha = createHash("sha256").update(png).digest("hex");
      if (sha !== file.sha256) fail(`wallpaper ${design.id} ${size.id}: manifest checksum is wrong`);
      const dims = pngSize(png);
      const expected = { width: size.width, height: Math.round((size.width * CANVAS.height) / CANVAS.width) };
      if (!dims) fail(`wallpaper ${design.id} ${size.id}: is not a PNG`);
      else if (dims.width !== expected.width || dims.height !== expected.height)
        fail(`wallpaper ${design.id} ${size.id}: is ${dims.width}×${dims.height}, expected ${expected.width}×${expected.height}`);
    }
  }
  // The preview is how these get judged before they reach a phone, so every
  // backdrop has to appear there with the phone-size render behind it.
  if (preview) {
    for (const design of WALLPAPERS) {
      if (!preview.includes(design.title)) fail(`preview is missing the backdrop ${design.id}`);
      const phone = wallpapers.designs.find((d) => d.id === design.id)?.files.find((f) => f.id === "phone");
      if (phone && !preview.includes(phone.file)) fail(`preview does not reference ${phone.file}`);
    }
  }

  wallpaperCount = WALLPAPERS.length;
  ok(`${WALLPAPERS.length} wallpapers match their manifest at ${SIZES.length} sizes`);
  ok("wallpaper sources are palette-only geometry and gradients");
}

// ---------------------------------------------------------------------- done
console.log(
  failures
    ? `\n${failures} problem${failures === 1 ? "" : "s"} found.`
    : `\nAll checks passed: ${WIDGETS.length} presets, ${wallpaperCount} wallpapers.`,
);
if (failures) process.exit(1);
