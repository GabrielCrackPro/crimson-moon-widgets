// KWGT's preset picker loads a preset's preview image out of an entry inside
// the .kwgt itself: org.kustom.api.preset.glide.PresetFileDataFetcher asks the
// preset file for "preset_thumb_portrait.jpg" (or the landscape twin), which
// is why every real pack — Kuper's sample included — ships those entries and
// a pack without them shows blank tiles. The thumb is drawn here from the same
// declarative spec as the preset, as SVG rasterised by sharp, so it cannot
// drift from the layout Kustom reads.

import sharp from "sharp";
import { GEOMETRY, PALETTE, THEME_GLOBALS } from "../src/tokens.mjs";

const globals = Object.fromEntries(
  Object.entries(THEME_GLOBALS).map(([name, def]) => [name, def.value]),
);

/** Kustom #AARRGGBB -> CSS rgba(), alpha first, as build.mjs renders it. */
function css(hex) {
  const h = String(hex).replace("#", "").padEnd(8, "F");
  const a = parseInt(h.slice(0, 2), 16) / 255;
  const r = parseInt(h.slice(2, 4), 16);
  const g = parseInt(h.slice(4, 6), 16);
  const b = parseInt(h.slice(6, 8), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

/** A spec colour: a global, a formula that names one, a literal, or a fallback. */
function resolveColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  if (value.startsWith("gv:")) return globals[value.slice(3)] ?? fallback;
  const global = value.match(/gv\((\w+)\)/);
  if (global && globals[global[1]]) return globals[global[1]];
  const hex = value.match(/#([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6})/);
  if (hex) return css(hex[0]);
  return fallback;
}

function esc(s) {
  return String(s).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

const TEXT_FALLBACK = css(globals.textColor);
const DIM_FALLBACK = css(globals.dimColor);
const ACCENT_FALLBACK = css(globals.accent);

/**
 * One board as a JPEG at its own aspect ratio, the same geometry the HTML
 * preview and the on-device canvas use: positions are fractions of the root,
 * sizes are dp on a board of `cols * 100` dp width.
 *
 * @param {object} spec a widget spec from src/widgets.mjs
 * @returns {Promise<Buffer>} the encoded JPEG
 */
export async function renderThumb(spec) {
  const [cols, rows] = spec.grid;
  const W = 1024;
  const H = Math.round((W * rows) / cols);
  const dp = (n) => (n / cols) * W;

  const shapes = [
    // The widget sits on a quiet plate; JPEG has no alpha, so paint the ink.
    `<rect width="${W}" height="${H}" fill="${css(PALETTE.inkDeep)}"/>`,
  ];

  for (const item of spec.items) {
    switch (item.kind) {
      case "card":
        shapes.push(
          `<rect width="${W}" height="${H}" rx="${Number(dp(GEOMETRY.corners).toFixed(2))}" fill="${resolveColor(item.color ?? "gv:ink", css(globals.ink))}"/>`,
        );
        break;
      case "rule":
        shapes.push(
          `<rect x="${(item.x * W).toFixed(2)}" y="${(item.y * H).toFixed(2)}" width="${(item.w * W).toFixed(2)}" height="${dp(item.h).toFixed(2)}" rx="1" fill="${resolveColor(item.color, ACCENT_FALLBACK)}"/>`,
        );
        break;
      case "vrule":
        shapes.push(
          `<rect x="${(item.x * W).toFixed(2)}" y="${(item.y * H).toFixed(2)}" width="${dp(item.w).toFixed(2)}" height="${(item.h * H).toFixed(2)}" rx="1" fill="${resolveColor(item.color, css(globals.hairline))}"/>`,
        );
        break;
      case "circle": {
        // Placed by top-left in the spec; `w` is square in dp on a cell grid.
        const r = (item.w * W) / 2;
        shapes.push(
          `<circle cx="${(item.x * W + r).toFixed(2)}" cy="${(item.y * H + r).toFixed(2)}" r="${r.toFixed(2)}" fill="${resolveColor(item.color, ACCENT_FALLBACK)}"/>`,
        );
        break;
      }
      case "text": {
        const fs = dp(item.size);
        const align = item.align ?? "LEFT";
        const anchor = align === "CENTER" ? "middle" : align === "RIGHT" ? "end" : "start";
        const x = item.x * W + (align === "CENTER" ? (item.w * W) / 2 : align === "RIGHT" ? item.w * W : 0);
        shapes.push(
          `<text x="${x.toFixed(2)}" y="${(item.y * H + fs * 0.86).toFixed(2)}" font-size="${fs.toFixed(2)}" font-family="sans-serif" text-anchor="${anchor}" fill="${resolveColor(item.color, item.color === "gv:dimColor" ? DIM_FALLBACK : TEXT_FALLBACK)}">${esc(item.demo ?? "")}</text>`,
        );
        break;
      }
      case "bar": {
        const h = dp(item.h);
        const y = item.y * H;
        shapes.push(
          `<rect x="${(item.x * W).toFixed(2)}" y="${y.toFixed(2)}" width="${(item.w * W).toFixed(2)}" height="${h.toFixed(2)}" fill="${resolveColor(item.track, "rgba(246, 231, 236, 0.2)")}" />`,
          `<rect x="${(item.x * W).toFixed(2)}" y="${y.toFixed(2)}" width="${((item.w * W * (item.demo ?? 0)) / 100).toFixed(2)}" height="${h.toFixed(2)}" fill="${resolveColor(item.demoColor ?? item.color, ACCENT_FALLBACK)}"/>`,
        );
        break;
      }
      case "art":
        // A BitmapModule the thumb cannot know: hint the slot, promise no image.
        shapes.push(
          `<rect x="${(item.x * W).toFixed(2)}" y="${(item.y * H).toFixed(2)}" width="${(item.w * W).toFixed(2)}" height="${(item.h * H).toFixed(2)}" rx="${Number(dp(GEOMETRY.corners / 2).toFixed(2))}" fill="rgba(246, 231, 236, 0.06)" stroke="${css(globals.hairline)}" stroke-width="1"/>`,
        );
        break;
      case "tap":
        break;
      default:
        throw new Error(`thumbs: unknown item kind ${item.kind}`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${shapes.join("")}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}
