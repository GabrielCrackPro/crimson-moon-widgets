// The palette, lifted verbatim from crimson-moon-iconpack's src/render.mjs so a
// phone running both packs shows one design, not two relatives.
//
// Kustom writes colours as #AARRGGBB — alpha first, the opposite of CSS — and
// every literal in a preset has to be in that order.

export const PALETTE = {
  ink: "#050306",
  inkDeep: "#040205",
  plateGlow: "#3a0a1a",
  moon: "#ff2f5d",
  deepCrimson: "#a30a26",
  glyphTop: "#ff7e9d",
  glyphBottom: "#d90f3c",
  rim: "#ff3f6b",
  text: "#f6e7ec",
};

/** #RRGGBB (or #AARRGGBB) -> Kustom's #AARRGGBB. */
export function kustomColor(hex, alpha = "FF") {
  const clean = String(hex).replace("#", "");
  const rgb = clean.length === 8 ? clean.slice(2) : clean;
  const a = clean.length === 8 ? clean.slice(0, 2) : alpha;
  return `#${a}${rgb}`.toUpperCase();
}

// Surfaces, dim text and hairlines are the palette with alpha baked in, which
// is how the icons read too: a plate that is ink with a bloom, not a new colour.
export const SURFACE = {
  card: kustomColor(PALETTE.ink, "D9"),
  cardSoft: kustomColor(PALETTE.plateGlow, "B3"),
  hair: kustomColor(PALETTE.rim, "40"),
  hairSoft: kustomColor(PALETTE.rim, "1F"),
};

export const INK = {
  text: kustomColor(PALETTE.text, "FF"),
  dim: kustomColor(PALETTE.text, "8A"),
  dimmer: kustomColor(PALETTE.text, "52"),
  accent: kustomColor(PALETTE.moon, "FF"),
  sakura: kustomColor(PALETTE.glyphTop, "FF"),
  deep: kustomColor(PALETTE.deepCrimson, "FF"),
  rim: kustomColor(PALETTE.rim, "FF"),
};

// Sizes are dp, and every module converts them with /si(skpi) the way the
// presets we studied do; geometry is a fraction of the root, so one preset
// resizes from a 2x1 strip to a full-screen widget without a second layout.
export const TYPE = {
  numeral: 42,
  figure: 26,
  title: 14,
  body: 12,
  label: 10,
};

export const GEOMETRY = {
  pad: 18,
  gap: 6,
  corners: 28,
  hair: 2,
};

/** Globals every preset carries, so the colours are editable in one panel. */
export const THEME_GLOBALS = {
  accent: { type: "COLOR", title: "Accent", description: "Crimson moon", value: INK.accent },
  accentSoft: { type: "COLOR", title: "Accent soft", description: "Sakura", value: INK.sakura },
  alert: { type: "COLOR", title: "Alert", description: "Low battery", value: INK.deep },
  ink: { type: "COLOR", title: "Card", description: "Plate fill", value: SURFACE.card },
  hairline: { type: "COLOR", title: "Hairline", description: "Rim line", value: SURFACE.hair },
  textColor: { type: "COLOR", title: "Text", description: "Primary text", value: INK.text },
  dimColor: { type: "COLOR", title: "Dim text", description: "Secondary text", value: INK.dim },
  corners: { type: "NUMBER", title: "Corners", description: "Card radius", min: 0, max: 72, value: GEOMETRY.corners },
  padding: { type: "NUMBER", title: "Padding", description: "Card inset", min: 0, max: 64, value: GEOMETRY.pad },
};
