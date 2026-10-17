# Crimson Moon Widgets

A KWGT pack built from the same palette as [crimson-moon-iconpack](../crimson-moon-iconpack):
ten presets, one set of globals, no second guessing about colour.

Each preset is generated from a declarative spec, so the colours, the geometry
and the preview all come from one place. One card is the hero, two are for
measurements, and the rest are plates you can leave on a home screen for weeks
without reading the same sentence twice.

| Preset | Grid | What it does |
| --- | --- | --- |
| **Neon Panel** | 4×2 | Day, date, time and four readouts on one plate |
| **Moon Dial** | 4×4 | Full-height hero: big time, then weather, battery and agenda |
| **Moon Clock** | 4×2 | Time to the second, weekday, date, battery and weather |
| **Crimson Split** | 4×2 | Time on the left, next event and now-playing on the right |
| **Crimson Agenda** | 4×2 | The next two events with their hours |
| **Crimson Strip** | 4×1 | A line of type between a kanji and a blossom |
| **Sakura Note** | 2×2 | Square note card: kanji rail and the motto |
| **Sakura Battery** | 4×1 | Charge level, a bar that turns deep crimson when low |
| **Night Weather** | 4×2 | Temperature, condition, high/low, moon |
| **Crimson Player** | 4×2 | Cover, title, artist, album and transport |

```bash
npm install                      # sharp, used only to rasterise the wallpapers
npm run build && npm run check   # 10 presets + 12 wallpaper PNGs + the preview page
npm run wallpapers               # just the backdrops, when that is all you changed
npm run serve                    # http://127.0.0.1:4322/preview/index.html
```

## Install

1. Copy every `.kwgt` from `dist/` into `Kustom/widgets/` on the phone
   (`/storage/emulated/0/Kustom/widgets/` on most setups). Do not unzip them.
2. Add a KWGT widget, open the preset picker and choose the **SD card** tab.
3. Resize the widget; the layout is written in fractions of the root, so it
   adapts rather than clipping.

`.kwgt.zip` is accepted as well. Do **not** run Import on a preset that is
already inside `Kustom/widgets/` — Kustom copies a file onto itself and leaves
you with zero bytes.

## What is in a `.kwgt`

The format is not officially specified. This is what the pack relies on, and
where each claim comes from:

| Claim | Basis |
| --- | --- |
| A `.kwgt` is a zip whose root holds `preset.json` | Real presets that unzip and rebuild this way |
| `preset.json` = `preset_info` + `preset_root` | Every studied preset |
| `preset_info.version` is `13` on current KWGT | Presets exported from KWGT 3.7x |
| Modules are typed by `internal_type`; children live in `viewgroup_items` | Studied presets |
| A property is carried by a literal, a formula in `internal_formulas`, and a flag in `internal_toggles` (`10` = set) | Studied presets |
| Colours are `#AARRGGBB`, alpha first | Studied presets |
| Globals live in `preset_root.globals_list` and read back with `$gv(name)$` | Studied presets + Kustom's globals docs |
| Enum values are limited to ones seen in real presets (`CENTER`, `RECT`/`CIRCLE`, `CENTER_CROP`, six anchors) | Studied presets |

The presets this pack learned from are downloaded into `refs/` by hand and are
gitignored: they are other people's work, they are only a reference, and nothing
here copies their layout.

### Deliberate omissions

- **No bundled fonts or icon sets.** Presets often reference
  `kfile://org.kustom.provider/fonts/...`; we cannot ship those, so type is set
  with the system font and the player's transport is words, not glyphs.
- **No `ProgressModule`.** Battery and any other 0-100 value is drawn as two
  rectangles with arithmetic on the fill width, which uses only module types
  seen in real presets.
- **No fixed widget size.** `preset_info.width/height` is omitted, so the
  presets are resizable.

## Layout

Positions are fractions of the root (`$si(rwidth)*0.075$`) and sizes are dp
(`$44/si(skpi)$`). One preset therefore works on a 2×1 strip and a full-screen
widget, and the HTML preview can render the same numbers — one dp is one percent
of the board width divided by its column count.

## The panel, and what it had to leave out

The panel is built to a reference plate whose charm comes from line-art glyphs:
a cloud-and-moon, a battery, an alarm clock, a calendar. Kustom's shape module
draws rectangles and circles only, and importing an icon set means shipping an
asset bundle this project does not have. So the panel carries that structure
with what Kustom can draw unaided:

- **Hierarchy by type.** One 44 dp day name, an accented date line, a 20 dp
time flanked by two rules — the same three-step drop the icons would have made.
- **A rail instead of a spine.** A hairline on the left edge with vertical kanji
  beside it, which also works at 2 dp when the widget is small.
- **A blossom of dots.** Five petals plus a centre, positioned on a circle in dp
  space: `dotter(cols, rows)` turns a radius in x into the taller y radius a 2:1
  board needs, so the flower stays round on every grid. A flower glyph would
  fall back to an emoji on most devices.
- **Formulas, not fixtures.** Day, date, weather, battery and agenda are live
  `$df()$`, `$wi()$`, `$bi()$` and `$ci()$` formulas; the preview shows a
  representative frame.

The four columns truncate long values rather than shrink them, which is what a
fixed-width text module does on the phone too.

## Backdrops

Six wallpapers ship in `dist/wallpapers/`, each at 1080×2400 and 1440×3200, with
the vector original beside it in `dist/wallpapers/svg/`. They exist so the
plates have something to sit on: the card fill is translucent ink, which reads
as a dark rectangle over a photo and as part of the design over one of these.

| Design | Idea |
| --- | --- |
| **Moonrise** | A low crimson bloom with the moon's outline standing in it |
| **Eclipse** | One thin ring over a wide, dim halo |
| **Bloom** | Sakura light in the top-right corner, where widgets rarely go |
| **Spine** | A hairline down the left edge with three ticks |
| **Blueprint** | The 4-column grid the presets are laid out on |
| **Ink** | Nothing but the plate colour and its vignette |

Two rules keep them reproducible on any machine: **no text** (a CJK glyph would
depend on the rasteriser's installed fonts) and **no filters** (librsvg builds
differ), so every backdrop is gradients, ellipses and hairlines. `check`
enforces both, plus the palette. The names are matched to presets in the preview
so each backdrop is judged behind a plate rather than on its own.

## Project

| Path | Purpose |
| --- | --- |
| `src/tokens.mjs` | Palette lifted from the icon pack, surfaces, type ramp, globals |
| `src/modules.mjs` | Kustom module builders: shape, circle, rule, vrule, text, bar, bitmap, tap |
| `src/widgets.mjs` | The ten widget specs, built from six shared primitives |
| `src/zip.mjs` | Dependency-free deterministic zip writer |
| `src/wallpapers.mjs` | Six backdrops as SVG, built from the same tokens |
| `tools/build.mjs` | Writes `dist/*.kwgt`, `dist/manifest.json` and the preview |
| `tools/wallpapers.mjs` | Rasterises the backdrops with sharp and records their hashes |
| `tools/check.mjs` | Validates every preset, wallpaper, manifest and the preview |
| `tools/serve.mjs` | Static server for the preview page |

`npm run check` fails on an unknown module type, a toggle without a value, a
formula without its toggle, unbalanced `$…$`, an unknown Kustom function, a
colour outside the palette, a module that runs past the widget edge, a manifest
entry that disagrees with its file, a preview that lost a board, or a preset
whose bytes differ from what the sources build. It also rejects any preset that
references a font or icon set we do not ship, and it checks the specs before
the presets: duplicate ids or titles, a board without exactly one card behind
it, an item placed off the root, a bar whose demo is not a percentage, and a
demo value that disagrees with the literal text it stands in for.

The wallpaper pass reads each PNG's IHDR directly — width, height, byte count,
SHA-256 against the manifest — so it needs no image library even though the
renderer does. It also fails a backdrop that uses text, a filter, or a colour
outside the palette.

## Roadmap

- **A pack APK.** Play Store packs are Android apps carrying `.kwgt` files in
  `assets/widgets/` and exposing them through Kustom's provider
  (`org.kustom.api.Provider`, action `org.kustom.provider.WIDGETS`), with
  `org.kustom.widget.picker.WidgetPicker` + a `kfile://` URI to open one. The
  icon pack's Gradle + CI setup is the template.
- **More widgets.** Calendar month, storage, a "moon phase" board, a 2×2 clock.
- **Publish the globals as a theme file** so both packs can be recoloured in one
  pass.

## Limits

Nothing here has been loaded in KWGT yet — there is no Android device or
emulator in this environment, so the presets are verified structurally (schema,
formulas, palette, geometry, zip layout) and visually (the preview), not by
opening them in the app. Expect one round of fixes on first import; the check
script exists so that round is about taste rather than typos.
