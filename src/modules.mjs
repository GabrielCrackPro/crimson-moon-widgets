import { THEME_GLOBALS } from "./tokens.mjs";

// Kustom stores each property three ways at once: a literal value, a formula
// that produces it, and a toggle flag that says "this property was set".
// A module built here always sets the toggle and then either a literal or a
// formula, which is exactly how the presets we studied (KWGT 3.7x exports,
// preset_info.version 13) are serialised.
//
// Geometry lives in two units on purpose:
//   - sizes are dp, converted with $n/si(skpi)$ so they grow with the display;
//   - positions are fractions of the root, so one preset resizes from a 2x1
//     strip to a tablet block without a second layout.

export const SET = 10;

export const dp = (n) => `$${n}/si(skpi)$`;
export const fx = (f) => `$si(rwidth)*${round(f)}$`;
export const fy = (f) => `$si(rheight)*${round(f)}$`;

const round = (n) => Number(n.toFixed(4));

/**
 * A colour literal stays a literal, `gv:accent` becomes a global reference and
 * a leading `$` is passed through as a formula, so the battery bar can turn
 * deep crimson below 20% without a second module.
 */
function paint(value) {
  if (typeof value === "string" && value.startsWith("gv:")) {
    return { formula: `$gv(${value.slice(3)})$` };
  }
  if (typeof value === "string" && value.startsWith("$")) {
    return { formula: value };
  }
  return { literal: value };
}

/** Apply a property either as a literal or as a formula, with its toggle. */
function set(target, prop, value) {
  if (value == null) return;
  if (typeof value === "object" && value.formula) {
    target.internal_formulas[prop] = value.formula;
  } else if (typeof value === "object" && value.literal !== undefined) {
    target[prop] = value.literal;
  } else {
    target[prop] = value;
  }
  target.internal_toggles[prop] = SET;
}

function base(type, title, anchor = "TOPLEFT") {
  return {
    internal_type: type,
    internal_title: title,
    position_anchor: anchor,
    internal_toggles: {},
    internal_formulas: {},
  };
}

function place(module, x, y) {
  if (x != null) set(module, "position_padding_left", { formula: fx(x) });
  if (y != null) set(module, "position_padding_top", { formula: fy(y) });
  return module;
}

export function shape({ title, x, y, w, h, color, radius, circle = false, mask }) {
  const m = base("ShapeModule", title);
  m.shape_type = circle ? "CIRCLE" : "RECT";
  // A circle keeps its aspect: one size drives both axes.
  set(m, "shape_width", { formula: `$si(rwidth)*${round(w)}$` });
  set(m, "shape_height", { formula: circle ? `$si(rwidth)*${round(w)}$` : fy(h) });
  set(m, "paint_color", paint(color));
  if (radius) set(m, "shape_corners", { formula: `$gv(${radius})/si(skpi)$` });
  if (mask) m.fx_mask = mask;
  return place(m, x, y);
}

export function text({ title, x, y, w, size, color, expr, align = "LEFT", lines = 1, events }) {
  const m = base("TextModule", title);
  m.text_expression = expr;
  m.text_size_type = "FIXED_WIDTH";
  // CENTER is the only alignment observed in real presets; left is Kustom's
  // default, so leaving the key out avoids guessing at an enum value.
  if (align === "CENTER") m.text_align = "CENTER";
  m.text_lines = lines;
  set(m, "text_width", { formula: fx(w) });
  set(m, "text_size", { formula: dp(size) });
  set(m, "paint_color", paint(color));
  if (events) m.internal_events = events;
  return place(m, x, y);
}

/** A hairline: width in root fraction, thickness in dp. */
export function rule({ title, x, y, w, h, color }) {
  const m = base("ShapeModule", title);
  m.shape_type = "RECT";
  set(m, "shape_width", { formula: `$si(rwidth)*${round(w)}$` });
  set(m, "shape_height", { formula: dp(h) });
  set(m, "paint_color", paint(color));
  return place(m, x, y);
}

/** The same hairline stood on end: thickness in dp, height in root fraction. */
export function vrule({ title, x, y, w, h, color }) {
  const m = base("ShapeModule", title);
  m.shape_type = "RECT";
  set(m, "shape_width", { formula: dp(w) });
  set(m, "shape_height", { formula: fy(h) });
  set(m, "paint_color", paint(color));
  return place(m, x, y);
}

/**
 * A progress bar drawn as two rectangles rather than a ProgressModule: the fill
 * width is arithmetic on the value, which needs nothing beyond shapes and works
 * the same for battery, storage, or any other 0-100 source.
 */
export function bar({ title, x, y, w, h, level, color, track, demo }) {
  // Thickness is in dp, not a fraction of the root: a bar has to stay a bar.
  const segment = (name, width, colorValue) => {
    const m = base("ShapeModule", name);
    m.shape_type = "RECT";
    set(m, "shape_width", { formula: width });
    set(m, "shape_height", { formula: dp(h) });
    set(m, "shape_corners", { formula: dp(h / 2) });
    set(m, "paint_color", paint(colorValue));
    return place(m, x, y);
  };

  const fill = segment(`${title} fill`, `$si(rwidth)*${round(w)}*(${level})/100$`, color);
  fill.__demo = { fill: demo };
  return [segment(`${title} track`, `$si(rwidth)*${round(w)}$`, track), fill];
}

export function art({ title, x, y, w, h, expr }) {
  const m = base("BitmapModule", title);
  m.bitmap_scale_mode = "CENTER_CROP";
  set(m, "bitmap_bitmap", { formula: expr });
  set(m, "bitmap_width", { formula: fx(w) });
  set(m, "bitmap_height", { formula: fy(h) });
  return place(m, x, y);
}

/** Tap target over an area, in front of whatever it covers. */
export function tap({ title, x, y, w, h, events }) {
  const m = shape({ title, x, y, w, h, color: "#00000000" });
  m.internal_events = events;
  return m;
}

/** Turn a declarative widget spec into the JSON Kustom expects. */
export function buildPreset(spec) {
  const items = [];

  for (const item of spec.items) {
    switch (item.kind) {
      case "card":
        items.push(
          shape({ title: "Card", x: 0, y: 0, w: 1, h: 1, color: item.color ?? "gv:ink", radius: "corners" }),
        );
        break;
      case "rect":
        items.push(shape({ title: item.title, ...item }));
        break;
      case "circle":
        items.push(shape({ title: item.title, circle: true, ...item }));
        break;
      case "text":
        items.push(text(item));
        break;
      case "rule":
        items.push(rule(item));
        break;
      case "vrule":
        items.push(vrule(item));
        break;
      case "bar":
        items.push(...bar(item));
        break;
      case "art":
        items.push(art(item));
        break;
      case "tap":
        items.push(tap(item));
        break;
      default:
        throw new Error(`${spec.id}: unknown item kind "${item.kind}"`);
    }
  }

  const globals_list = {};
  let index = 1;
  for (const [name, def] of Object.entries(THEME_GLOBALS)) {
    globals_list[name] = {
      index: index++,
      type: def.type,
      title: def.title,
      description: def.description,
      ...(def.type === "NUMBER" ? { min: def.min, max: def.max } : {}),
      global_formula: "",
      value: def.value,
    };
  }

  return {
    preset_info: {
      version: 13,
      title: spec.title,
      description: spec.description,
      author: "Gabriel Crack",
      email: "",
      features: spec.features ?? "",
      release: spec.release ?? 0,
      locked: false,
      pflags: 0,
    },
    preset_root: {
      internal_type: "RootLayerModule",
      globals_list,
      viewgroup_items: items,
    },
  };
}

/** Drop preview-only keys so they never reach the preset JSON. */
export function stripPreview(value) {
  if (Array.isArray(value)) return value.map(stripPreview);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith("__")) continue;
    out[k] = stripPreview(v);
  }
  return out;
}
