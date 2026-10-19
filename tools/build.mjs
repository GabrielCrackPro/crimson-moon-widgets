import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { WIDGETS } from "../src/widgets.mjs";
import { buildPreset, stripPreview } from "../src/modules.mjs";
import { zip } from "../src/zip.mjs";
import { renderThumb } from "./thumbs.mjs";
import { GEOMETRY, PALETTE, SURFACE, THEME_GLOBALS } from "../src/tokens.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const PREVIEW = path.join(ROOT, "preview");

const CELL_DP = 100; // one launcher cell, rendered 1dp : 1px in the preview

/** Kustom #AARRGGBB -> CSS rgba(). */
function css(hex) {
  const h = String(hex).replace("#", "").padEnd(8, "F");
  const a = parseInt(h.slice(0, 2), 16) / 255;
  const r = parseInt(h.slice(2, 4), 16);
  const g = parseInt(h.slice(4, 6), 16);
  const b = parseInt(h.slice(6, 8), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

const INK_FALLBACK = css(THEME_GLOBALS.textColor.value);

/** Resolve a spec colour for HTML: globals, formulas that wrap a hex, literals. */
function resolveColor(value, fallback = INK_FALLBACK) {
  if (typeof value !== "string") return fallback;
  if (value.startsWith("gv:")) {
    const def = THEME_GLOBALS[value.slice(3)];
    return def ? css(def.value) : fallback;
  }
  const hex = value.match(/#([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6})/);
  if (hex) return css(hex[0]);
  return fallback;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/**
 * Draw one item the way Kustom's absolute layout would. Sizes are cqw — one
 * percent of the board's width — so a 44 dp numeral stays 11% of the widget at
 * any preview size, exactly as /si(skpi) keeps it fixed on the phone.
 */
function renderItem(item, cols) {
  const pos = `left:${(item.x ?? 0) * 100}%;top:${(item.y ?? 0) * 100}%;`;
  // The board is cols * 100 dp wide, so one dp is 1/cols of a percent-width.
  const dp = (n) => `${Number((n / cols).toFixed(3))}cqw`;
  switch (item.kind) {
    case "card":
      return `<div class="card" style="${pos}width:100%;height:100%;background:${resolveColor(item.color ?? "gv:ink")};border-radius:${dp(GEOMETRY.corners)};border:1px solid ${css(SURFACE.hair)}"></div>`;
    case "rule":
      return `<div class="rule" style="${pos}width:${item.w * 100}%;height:${dp(item.h)};background:${resolveColor(item.color)};border-radius:1px"></div>`;
    case "vrule":
      // Width is in dp (a hairline), height spans the board.
      return `<div class="rule" style="${pos}width:${dp(item.w)};height:${item.h * 100}%;background:${resolveColor(item.color)};border-radius:1px"></div>`;
    case "circle":
      return `<div class="dot" style="${pos}width:${item.w * 100}%;aspect-ratio:1;background:${resolveColor(item.color)};border-radius:999px"></div>`;
    case "text":
      return `<div class="text" style="${pos}width:${item.w * 100}%;font-size:${dp(item.size)};line-height:1.05;color:${resolveColor(item.color)};text-align:${(item.align ?? "LEFT").toLowerCase()};-webkit-line-clamp:${item.lines ?? 1}">${escapeHtml(item.demo ?? "")}</div>`;
    case "bar": {
      const track = `<div class="bar" style="${pos}width:${item.w * 100}%;height:${dp(item.h)};background:${resolveColor(item.track)}"></div>`;
      // A formula colour cannot be evaluated here, so the spec names the
      // colour the demo value lands on.
      const fill = `<div class="bar" style="${pos}width:${(item.w * 100 * (item.demo ?? 0)) / 100}%;height:${dp(item.h)};background:${resolveColor(item.demoColor ?? item.color)}"></div>`;
      return track + fill;
    }
    case "art":
      // Square, because a BitmapModule has no corner radius we can prove Kustom
      // reads — the preview must not promise a shape the preset cannot draw.
      return `<div class="art" style="${pos}width:${item.w * 100}%;height:${item.h * 100}%"></div>`;
    case "tap":
      return "";
    default:
      throw new Error(`preview: unknown item kind ${item.kind}`);
  }
}

/** The modules of one spec, as the absolute-positioned markup Kustom mirrors. */
function boardInner(spec) {
  return `<div class="widget">
          ${spec.items.map((item) => renderItem(item, spec.grid[0])).join("\n          ")}
        </div>`;
}

/** Each backdrop is shown with the preset it suits, not on its own. */
const WALLPAPER_PAIRING = {
  moonrise: "moon-dial",
  eclipse: "moon-clock",
  bloom: "sakura-note",
  spine: "crimson-split",
  blueprint: "neon-panel",
  ink: "crimson-player",
};

function wallpapersSection(wallpapers) {
  if (!wallpapers) {
    return `<section class="backdrops"><h2>Backdrops</h2><p class="lede">Run <code>npm run wallpapers</code> to render the wallpaper set.</p></section>`;
  }

  const phones = wallpapers.designs
    .map((design) => {
      const spec = WIDGETS.find((w) => w.id === WALLPAPER_PAIRING[design.id]) ?? WIDGETS[0];
      const file = design.files.find((f) => f.id === "phone") ?? design.files[0];
      const [cols, rows] = spec.grid;
      return `<figure class="wall">
        <div class="phone" style="background-image:url('../dist/${file.file}')">
          <div class="phone-widget" style="aspect-ratio:${cols} / ${rows}">
            ${boardInner(spec)}
          </div>
        </div>
        <figcaption><strong>${escapeHtml(design.title)}</strong><em>${file.width}×${file.height}</em></figcaption>
      </figure>`;
    })
    .join("\n");

  return `<section class="backdrops">
    <h2>Six backdrops</h2>
    <p class="lede">Same palette, drawn as vectors and rasterised at 1080×2400 and 1440×3200. Each phone shows its backdrop behind a real preset — the plates are translucent ink, so the backdrop has to stay quiet underneath them.</p>
    <div class="walls">
${phones}
    </div>
  </section>`;
}

function previewHtml(manifest, wallpapers) {
  const boards = WIDGETS.map((w) => {
    const [cols, rows] = w.grid;
    const width = cols * CELL_DP;
    const height = rows * CELL_DP;
    return `<figure class="board">
      <div class="frame" style="aspect-ratio:${cols} / ${rows};max-width:${width}px">
        ${boardInner(w)}
      </div>
      <figcaption><strong>${escapeHtml(w.title)}</strong><em>${cols}×${rows} · ${w.id}.kwgt</em></figcaption>
    </figure>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Crimson Moon Widgets — KWGT pack</title>
<style>
  :root {
    --ink: ${PALETTE.ink};
    --plate: ${PALETTE.plateGlow};
    --moon: ${PALETTE.moon};
    --sakura: ${PALETTE.glyphTop};
    --deep: ${PALETTE.deepCrimson};
    --text: ${PALETTE.text};
    --dim: rgba(246, 231, 236, .5);
    --hair: ${css(SURFACE.hair)};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background:
      radial-gradient(1200px 700px at 78% -10%, rgba(255, 47, 93, .18), transparent 60%),
      radial-gradient(900px 500px at 10% 110%, rgba(255, 47, 93, .10), transparent 60%),
      var(--ink);
    color: var(--text);
    font: 14px/1.5 "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1000px; margin: 0 auto; padding: 64px 24px 96px; }
  header { margin-bottom: 48px; }
  .kicker { font-size: 11px; letter-spacing: .32em; text-transform: uppercase; color: var(--moon); margin: 0 0 14px; }
  h1 { font-size: clamp(32px, 5vw, 52px); line-height: 1; margin: 0 0 16px; letter-spacing: -.03em; }
  h1 span { display: block; color: var(--deep); font-weight: 300; font-style: italic; }
  .lede { max-width: 52ch; color: var(--dim); margin: 0; }
  .boards { display: grid; gap: 44px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
  .board { margin: 0; min-width: 0; }
  .frame { width: 100%; margin: 0 auto; }
  .widget { position: relative; width: 100%; height: 100%; container-type: inline-size; }
  .widget > div { position: absolute; }
  .text { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; font-variant-numeric: tabular-nums; }
  .art { background: linear-gradient(135deg, rgba(255, 126, 157, .55), rgba(163, 10, 38, .55)), radial-gradient(circle at 30% 20%, rgba(255, 47, 93, .9), transparent 60%); border: 1px solid var(--hair); }
  figcaption { margin-top: 14px; display: flex; justify-content: space-between; gap: 12px; align-items: baseline; font-size: 12px; }
  .backdrops { margin-top: 96px; padding-top: 44px; border-top: 1px solid var(--hair); }
  .backdrops h2 { font-size: 26px; letter-spacing: -.02em; margin: 0 0 12px; }
  .backdrops .lede { margin-bottom: 34px; }
  .walls { display: grid; gap: 30px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
  .wall { margin: 0; min-width: 0; }
  .phone { position: relative; width: 100%; aspect-ratio: 1080 / 2400; border-radius: 26px; overflow: hidden; border: 1px solid rgba(255, 63, 107, .28); background-size: cover; background-position: center; box-shadow: 0 26px 60px -34px rgba(255, 47, 93, .45); }
  .phone-widget { position: absolute; left: 5%; width: 90%; top: 24%; }
  .phone-widget .widget { position: relative; }
  figcaption strong { font-weight: 600; }
  figcaption em { color: var(--dim); font-style: normal; font-size: 11px; }
  footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--hair); color: var(--dim); font-size: 12px; }
  code { font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--sakura); }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="kicker">KWGT pack · ${manifest.widgets.length} presets · one palette</p>
    <h1>Crimson Moon<span>widgets for the same home screen</span></h1>
    <p class="lede">Every plate, hairline and accent below comes from the icon pack's tokens, and each board is drawn from the same spec that generates its <code>.kwgt</code> file — what you see is the layout Kustom reads.</p>
  </header>
  <section class="boards">
${boards}
  </section>
${wallpapersSection(wallpapers)}
  <footer>
    Install: copy every <code>.kwgt</code> from <code>dist/</code> into <code>Kustom/widgets/</code> on the phone, then add a KWGT widget and pick it from the SD-card tab. Do not unzip the files, and do not use Import on a preset that already sits in that folder.
  </footer>
</div>
</body>
</html>
`;
}

async function main() {
  // The wallpaper pass owns dist/wallpapers and runs before this; everything
  // else in dist is rebuilt from the specs.
  await mkdir(DIST, { recursive: true });
  for (const entry of await readdir(DIST)) {
    if (entry !== "wallpapers") await rm(path.join(DIST, entry), { recursive: true, force: true });
  }
  await mkdir(PREVIEW, { recursive: true });

  const manifest = { schemaVersion: 13, widgets: [] };

  for (const spec of WIDGETS) {
    const preset = stripPreview(buildPreset(spec));
    const json = `${JSON.stringify(preset, null, 2)}\n`;
    // KWGT's picker reads its preview out of these entries, the same ones a
    // Kustom export writes; a preset without them shows as a blank tile.
    const thumb = await renderThumb(spec);
    const archive = zip([
      { name: "preset.json", data: json },
      { name: "preset_thumb_portrait.jpg", data: thumb },
      { name: "preset_thumb_landscape.jpg", data: thumb },
    ]);
    const file = `${spec.id}.kwgt`;
    await writeFile(path.join(DIST, file), archive);

    const modules = countModules(preset.preset_root);
    manifest.widgets.push({
      id: spec.id,
      title: spec.title,
      description: spec.description,
      grid: spec.grid,
      file,
      bytes: archive.length,
      sha256: createHash("sha256").update(archive).digest("hex"),
      modules,
    });
    console.log(`  ${file.padEnd(20)} ${String(archive.length).padStart(5)} B  ${modules} modules`);
  }

  const wallpapers = await readFile(path.join(DIST, "wallpapers", "manifest.json"), "utf8")
    .then(JSON.parse)
    .catch(() => null);

  await writeFile(path.join(DIST, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(PREVIEW, "index.html"), previewHtml(manifest, wallpapers));

  console.log(`\nGenerated ${manifest.widgets.length} presets + preview/index.html`);
}

function countModules(node) {
  let n = 0;
  const walk = (m) => {
    if (!m || typeof m !== "object") return;
    if (m.internal_type && m.internal_type !== "RootLayerModule") n++;
    for (const child of m.viewgroup_items ?? []) walk(child);
  };
  walk(node);
  return n;
}

await main();
