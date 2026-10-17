// Six backdrops for the pack, drawn from the same tokens as the presets and the
// icon pack. Everything here is geometry and gradients: no text (a CJK glyph
// would depend on the rasteriser's fonts) and no filters (their output differs
// between librsvg builds). One SVG per design, rasterised at two sizes.

import { PALETTE } from "./tokens.mjs";

export const CANVAS = { width: 1080, height: 2400 };

/** Raster widths. The height follows the 9:20 canvas, so no crop is needed. */
export const SIZES = [
  { id: "phone", width: 1080, suffix: "" },
  { id: "qhd", width: 1440, suffix: "@1440" },
];

const W = CANVAS.width;
const H = CANVAS.height;
const ink = PALETTE.ink;

/** The vignette every design shares: the centre stays readable, the rim sinks. */
const VIGNETTE = `<radialGradient id="vignette" cx="50%" cy="42%" r="78%">
  <stop offset="0" stop-color="${ink}" stop-opacity="0"/>
  <stop offset="0.6" stop-color="${ink}" stop-opacity="0.16"/>
  <stop offset="1" stop-color="${ink}" stop-opacity="0.66"/>
</radialGradient>`;

const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
${VIGNETTE}
${defs}
</defs>
<rect width="${W}" height="${H}" fill="${ink}"/>
${body}
<rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>
`;

/** A ring of five petals: the same blossom the presets draw, at wallpaper scale. */
function blossom(cx, cy, radius, dotRadius, opacity) {
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = (cx + Math.cos(a) * radius).toFixed(1);
    const y = (cy + Math.sin(a) * radius).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${dotRadius}" fill="${PALETTE.glyphTop}" fill-opacity="${opacity}"/>`;
  });
  return [
    ...petals,
    `<circle cx="${cx}" cy="${cy}" r="${dotRadius * 0.8}" fill="${PALETTE.moon}" fill-opacity="${opacity}"/>`,
  ].join("\n");
}

export const WALLPAPERS = [
  {
    id: "moonrise",
    title: "Moonrise",
    description: "A low crimson bloom with the moon's outline sitting in it",
    svg: svg(
      `<radialGradient id="rise" cx="50%" cy="50%" r="50%">
  <stop offset="0" stop-color="${PALETTE.moon}" stop-opacity="0.38"/>
  <stop offset="0.42" stop-color="${PALETTE.deepCrimson}" stop-opacity="0.2"/>
  <stop offset="1" stop-color="${ink}" stop-opacity="0"/>
</radialGradient>`,
      `<ellipse cx="540" cy="1760" rx="860" ry="860" fill="url(#rise)"/>
<circle cx="540" cy="1700" r="172" fill="${PALETTE.moon}" fill-opacity="0.05"/>
<circle cx="540" cy="1700" r="172" fill="none" stroke="${PALETTE.moon}" stroke-opacity="0.42" stroke-width="2"/>
<circle cx="540" cy="1700" r="128" fill="none" stroke="${PALETTE.glyphTop}" stroke-opacity="0.14" stroke-width="1"/>`,
    ),
  },
  {
    id: "eclipse",
    title: "Eclipse",
    description: "One thin ring over a wide, dim halo — the quietest of the six",
    svg: svg(
      `<radialGradient id="eclipse" cx="50%" cy="50%" r="50%">
  <stop offset="0" stop-color="${PALETTE.deepCrimson}" stop-opacity="0.18"/>
  <stop offset="0.7" stop-color="${PALETTE.moon}" stop-opacity="0.09"/>
  <stop offset="1" stop-color="${ink}" stop-opacity="0"/>
</radialGradient>`,
      `<circle cx="540" cy="1120" r="720" fill="url(#eclipse)"/>
<circle cx="540" cy="1120" r="470" fill="none" stroke="${PALETTE.moon}" stroke-opacity="0.28" stroke-width="2"/>
<circle cx="540" cy="1120" r="424" fill="none" stroke="${PALETTE.glyphTop}" stroke-opacity="0.12" stroke-width="1"/>`,
    ),
  },
  {
    id: "bloom",
    title: "Bloom",
    description: "Sakura light in the top-right corner, where widgets rarely go",
    svg: svg(
      `<radialGradient id="bloomA" cx="50%" cy="50%" r="50%">
  <stop offset="0" stop-color="${PALETTE.glyphTop}" stop-opacity="0.34"/>
  <stop offset="0.5" stop-color="${PALETTE.moon}" stop-opacity="0.14"/>
  <stop offset="1" stop-color="${ink}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="bloomB" cx="50%" cy="50%" r="50%">
  <stop offset="0" stop-color="${PALETTE.moon}" stop-opacity="0.26"/>
  <stop offset="1" stop-color="${ink}" stop-opacity="0"/>
</radialGradient>`,
      `<ellipse cx="880" cy="430" rx="720" ry="720" fill="url(#bloomA)"/>
<ellipse cx="960" cy="180" rx="320" ry="320" fill="url(#bloomB)"/>
${blossom(880, 430, 46, 6, 0.14)}`,
    ),
  },
  {
    id: "spine",
    title: "Spine",
    description: "A hairline down the left edge with three ticks, widget-safe",
    svg: svg(
      `<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${PALETTE.deepCrimson}" stop-opacity="0.44"/>
  <stop offset="1" stop-color="${ink}" stop-opacity="0"/>
</linearGradient>`,
      `<rect x="0" y="0" width="420" height="${H}" fill="url(#edge)"/>
<line x1="64" y1="520" x2="64" y2="1560" stroke="${PALETTE.rim}" stroke-opacity="0.3" stroke-width="2"/>
<line x1="64" y1="560" x2="104" y2="560" stroke="${PALETTE.glyphTop}" stroke-opacity="0.12" stroke-width="1"/>
<line x1="64" y1="700" x2="104" y2="700" stroke="${PALETTE.glyphTop}" stroke-opacity="0.10" stroke-width="1"/>
<line x1="64" y1="840" x2="104" y2="840" stroke="${PALETTE.glyphTop}" stroke-opacity="0.08" stroke-width="1"/>
<circle cx="64" cy="1600" r="4" fill="${PALETTE.moon}" fill-opacity="0.5"/>`,
    ),
  },
  {
    id: "blueprint",
    title: "Blueprint",
    description: "The 4-column grid the presets are laid out on, barely visible",
    svg: svg(
      "",
      [54, 297, 540, 783, 1026]
        .map(
          (x) =>
            `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${PALETTE.rim}" stroke-opacity="0.07" stroke-width="2"/>`,
        )
        .concat(
          [300, 600, 900, 1200, 1500, 1800, 2100].map(
            (y) =>
              `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${PALETTE.rim}" stroke-opacity="0.05" stroke-width="1"/>`,
          ),
        )
        .join("\n"),
    ),
  },
  {
    id: "ink",
    title: "Ink",
    description: "Nothing but the plate colour and its vignette",
    svg: svg("", ""),
  },
];

/** The design's SVG at a given raster width, ready for sharp. */
export function wallpaperAt(spec, width) {
  const height = Math.round((width * H) / W);
  return spec.svg.replace(`width="${W}" height="${H}"`, `width="${width}" height="${height}"`);
}
