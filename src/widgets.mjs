// Ten widgets, one palette. Each spec is declarative and absolute: positions
// are fractions of the root and sizes are dp, so build.mjs can turn the same
// object into either a Kustom preset or the HTML preview without a second
// layout to keep in sync.

// ---------------------------------------------------------------- shorthands
// Every widget is built from the same six primitives, so a spec reads as a
// layout rather than as JSON. `demo` is what the preview draws where a formula
// would run on the phone.

const text = (title, x, y, w, size, color, expr, demo, extra = {}) => ({
  kind: "text",
  title,
  x,
  y,
  w,
  size,
  color,
  expr,
  demo,
  ...extra,
});

/** A crimson rule: width in root fraction, thickness in dp. */
const line = (title, x, y, w, h = 2) => ({ kind: "rule", title, x, y, w, h, color: "gv:accent" });

/** A hairline, the pack's only structural device. */
const hair = (title, x, y, w) => ({ kind: "rule", title, x, y, w, h: 1, color: "gv:hairline" });

/** The same hairline stood on end; height in root fraction. */
const vhair = (title, x, y, h) => ({ kind: "vrule", title, x, y, w: 1, h, color: "gv:hairline" });

/**
 * Dots are placed by centre, not by corner: a circle is `w` wide in x and — on
 * a board of `cols`×`rows` cells — `w * cols / rows` tall in y. Getting that
 * wrong turns a round blossom into a smear.
 */
const dotter = (cols, rows) => (title, cx, cy, w = 0.012, color = "gv:accentSoft") => ({
  kind: "circle",
  title,
  x: cx - w / 2,
  y: cy - (w * cols) / rows / 2,
  w,
  color,
});

/** Five petals plus a centre on a ring, which reads as a flower at 4 dp. */
const blossom = (cols, rows, cx, cy, r, dot) => {
  const ry = (r * cols) / rows;
  return [
    dot("Blossom centre", cx, cy, r * 0.62, "gv:accent"),
    ...[0, 1, 2, 3, 4].map((i) => {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      return dot(`Blossom petal ${i + 1}`, cx + Math.cos(angle) * r, cy + Math.sin(angle) * ry, r * 0.86);
    }),
  ];
};

const card = { kind: "card" };

// ------------------------------------------------------------------- pieces
// The four readouts the pack keeps reusing, so a fifth column costs one entry.
const readout = (label, value, caption) => ({ label, value, caption });

const WEATHER = readout(
  "C L I M A",
  { expr: "$wi(temp)$°C", demo: "16°C" },
  { expr: "$tc(cap, wi(cond))$", demo: "Despejado" },
);
const BATTERY = readout(
  "B A T E R Í A",
  { expr: "$bi(level)$%", demo: "78%" },
  { expr: "$if(bi(charging) = 1, Charging, On battery)$", demo: "On battery" },
);
const AGENDA = readout(
  "A G E N D A",
  { expr: '$if(ci(title, 0) = "", "--:--", df(HH:mm, ci(start, 0)))$', demo: "10:00" },
  { expr: '$if(ci(title, 0) = "", No events, ci(title, 0))$', demo: "Design review" },
);
const MUSIC = readout(
  "M Ú S I C A",
  { expr: "$mi(title)$", demo: "Sakura" },
  { expr: "$mi(artist)$", demo: "Night Static" },
);

// ------------------------------------------------------------------ presets
export const WIDGETS = [
  {
    id: "neon-panel",
    title: "Neon Panel",
    description: "A wide panel: day, date, time and four readouts over one plate",
    features: "",
    grid: [4, 2],
    items: (() => {
      const dot = dotter(4, 2);
      const columns = [WEATHER, BATTERY, AGENDA, MUSIC].flatMap((column, i) => {
        const x = 0.06 + i * 0.24;
        const key = column.label.replace(/ /g, "");
        return [
          text(`${key} label`, x, 0.55, 0.2, 8.5, "gv:dimColor", column.label, column.label),
          text(`${key} value`, x, 0.625, 0.2, 15, "gv:textColor", column.value.expr, column.value.demo),
          text(`${key} caption`, x, 0.775, 0.2, 8.5, "gv:dimColor", column.caption.expr, column.caption.demo),
        ];
      });

      return [
        card,
        // Left rail: a hairline and three stacked kanji, moonlight.
        { kind: "vrule", title: "Rail", x: 0.006, y: 0.1, w: 1, h: 0.4, color: "gv:accent" },
        text("Rail 1", 0.014, 0.1, 0.032, 9, "gv:accentSoft", "月", "月", { align: "CENTER" }),
        text("Rail 2", 0.014, 0.18, 0.032, 9, "gv:accentSoft", "の", "の", { align: "CENTER" }),
        text("Rail 3", 0.014, 0.26, 0.032, 9, "gv:accentSoft", "光", "光", { align: "CENTER" }),
        ...blossom(4, 2, 0.955, 0.075, 0.016, dot),
        text("Day name", 0.08, 0.02, 0.84, 44, "gv:textColor", "$tc(up, df(EEEE))$", "JUEVES", {
          align: "CENTER",
        }),
        text("Date line", 0.08, 0.275, 0.84, 12, "gv:accentSoft", '$tc(up, df(d MMMM, yyyy))$ + "."', "15 OCTUBRE, 2026.", {
          align: "CENTER",
        }),
        text("Time", 0.4, 0.345, 0.2, 20, "gv:textColor", "$df(HH:mm)$", "20:06", { align: "CENTER" }),
        line("Time rule left", 0.255, 0.4, 0.115),
        line("Time rule right", 0.63, 0.4, 0.115),
        ...columns,
        vhair("Split 1", 0.283, 0.56, 0.26),
        vhair("Split 2", 0.523, 0.56, 0.26),
        vhair("Split 3", 0.763, 0.56, 0.26),
        hair("Footer rule left", 0.16, 0.872, 0.5),
        hair("Footer rule right", 0.68, 0.872, 0.16),
        text("Footer mark", 0.36, 0.855, 0.28, 9, "gv:accentSoft", "月の光", "月の光", { align: "CENTER" }),
        text("Footer motto", 0.06, 0.935, 0.4, 7.5, "gv:dimColor", "GOOD THINGS TAKE TIME", "GOOD THINGS TAKE TIME"),
      ];
    })(),
  },

  {
    id: "moon-dial",
    title: "Moon Dial",
    description: "The full-height hero: time, date and three live readouts down one plate",
    features: "CALENDAR",
    grid: [4, 4],
    items: (() => {
      const dot = dotter(4, 4);
      const rows = [WEATHER, BATTERY, AGENDA].flatMap((column, i) => {
        const x = 0.06 + i * 0.31;
        const key = column.label.replace(/ /g, "");
        return [
          text(`${key} label`, x, 0.575, 0.28, 8, "gv:dimColor", column.label, column.label),
          text(`${key} value`, x, 0.605, 0.28, 15, "gv:textColor", column.value.expr, column.value.demo),
          text(`${key} caption`, x, 0.68, 0.28, 8, "gv:dimColor", column.caption.expr, column.caption.demo, {
            lines: 2,
          }),
        ];
      });

      return [
        card,
        text("Halo mark", 0.06, 0.045, 0.4, 9, "gv:accentSoft", "月の光", "月の光"),
        text("Brand", 0.55, 0.05, 0.39, 8, "gv:dimColor", "CRIMSON MOON", "CRIMSON MOON", { align: "CENTER" }),
        text("Time", 0.05, 0.1, 0.9, 56, "gv:textColor", "$df(HH:mm)$", "21:47", { align: "CENTER" }),
        text("Seconds", 0.05, 0.275, 0.9, 10, "gv:accentSoft", "$df(ss)$", "06", { align: "CENTER" }),
        line("Accent rule", 0.44, 0.35, 0.12),
        text("Day name", 0.05, 0.395, 0.9, 15, "gv:textColor", "$tc(up, df(EEEE))$", "FRIDAY", { align: "CENTER" }),
        text("Date", 0.05, 0.455, 0.9, 10, "gv:dimColor", "$tc(up, df(d MMMM yyyy))$", "17 OCTOBER 2026", {
          align: "CENTER",
        }),
        hair("Divider", 0.06, 0.535, 0.88),
        ...rows,
        hair("Footer rule", 0.06, 0.795, 0.88),
        { kind: "circle", title: "Moon halo", x: 0.8, y: 0.795, w: 0.12, color: "$#22FF2F5D$" },
        dot("Moon", 0.86, 0.855, 0.07, "gv:accent"),
        text("Footer motto", 0.06, 0.885, 0.6, 7.5, "gv:dimColor", "GOOD THINGS TAKE TIME", "GOOD THINGS TAKE TIME"),
      ];
    })(),
  },

  {
    id: "moon-clock",
    title: "Moon Clock",
    description: "Time, seconds, weekday and date, with battery and weather along the foot",
    features: "",
    grid: [4, 2],
    items: (() => {
      const dot = dotter(4, 2);
      return [
        card,
        line("Accent rule", 0.075, 0.14, 0.16),
        text("Time", 0.075, 0.19, 0.78, 42, "gv:textColor", "$df(HH:mm)$", "21:47"),
        text("Seconds", 0.375, 0.3, 0.14, 11, "gv:accentSoft", "$df(ss)$", "06"),
        hair("Mid rule", 0.075, 0.46, 0.85),
        text("Weekday", 0.075, 0.55, 0.5, 11, "gv:accentSoft", "$tc(up, df(EEEE))$", "FRIDAY"),
        text("Date", 0.075, 0.66, 0.5, 11, "gv:dimColor", "$df(d MMMM yyyy)$", "17 OCTOBER 2026"),
        hair("Foot rule", 0.075, 0.78, 0.85),
        text("Battery", 0.075, 0.81, 0.2, 9, "gv:dimColor", "$bi(level)$%", "78%"),
        text("Temp", 0.3, 0.81, 0.25, 9, "gv:dimColor", "$wi(temp)$°C", "16°C"),
        text("Condition", 0.56, 0.81, 0.36, 9, "gv:dimColor", "$tc(cap, wi(cond))$", "Despejado"),
        { kind: "circle", title: "Moon halo", x: 0.855, y: 0.25, w: 0.1, color: "$#22FF2F5D$" },
        dot("Moon", 0.87, 0.3, 0.065, "gv:accent"),
        dot("Star 1", 0.805, 0.21, 0.008),
        dot("Star 2", 0.95, 0.24, 0.007),
        dot("Star 3", 0.82, 0.4, 0.006),
      ];
    })(),
  },

  {
    id: "crimson-split",
    title: "Crimson Split",
    description: "Time on the left, the next event and what is playing on the right",
    features: "CALENDAR",
    grid: [4, 2],
    items: [
      card,
      vhair("Split", 0.505, 0.1, 0.8),
      text("Now label", 0.07, 0.13, 0.38, 8, "gv:dimColor", "NOW", "NOW"),
      text("Time", 0.07, 0.2, 0.4, 30, "gv:textColor", "$df(HH:mm)$", "21:47"),
      text("Weekday", 0.07, 0.4, 0.4, 10, "gv:accentSoft", "$tc(up, df(EEEE))$", "FRIDAY"),
      text("Date", 0.07, 0.49, 0.4, 9, "gv:dimColor", "$df(d MMMM)$", "17 OCTOBER"),
      hair("Left rule", 0.07, 0.6, 0.36),
      text("Battery", 0.07, 0.64, 0.36, 9, "gv:dimColor", "$bi(level)$% battery", "78% battery"),
      text("Next label", 0.57, 0.13, 0.36, 8, "gv:dimColor", "NEXT UP", "NEXT UP"),
      text("Event", 0.57, 0.2, 0.36, 13, "gv:textColor", '$if(ci(title, 0) = "", Nothing scheduled, ci(title, 0))$', "Design review", {
        lines: 2,
      }),
      text("Event time", 0.57, 0.38, 0.36, 10, "gv:accentSoft", '$if(ci(title, 0) = "", , df(HH:mm, ci(start, 0)))$', "18:30"),
      hair("Right rule", 0.57, 0.48, 0.36),
      text("Playing label", 0.57, 0.53, 0.36, 8, "gv:dimColor", "PLAYING", "PLAYING"),
      text("Track", 0.57, 0.6, 0.36, 10, "gv:textColor", "$if(mi(state) = PLAYING, mi(title), Nothing playing)$", "Sakura"),
      text("Artist", 0.57, 0.69, 0.36, 8, "gv:dimColor", "$mi(artist)$", "Night Static"),
      hair("Foot rule", 0.07, 0.8, 0.86),
      text("Foot mark", 0.07, 0.84, 0.3, 9, "gv:accentSoft", "月の光", "月の光"),
      text("Foot brand", 0.55, 0.845, 0.38, 8, "gv:dimColor", "CRIMSON MOON", "CRIMSON MOON", { align: "CENTER" }),
    ],
  },

  {
    id: "crimson-agenda",
    title: "Crimson Agenda",
    description: "The next two calendar events, their hour and the day they fall on",
    features: "CALENDAR",
    grid: [4, 2],
    items: [
      card,
      text("Day label", 0.075, 0.12, 0.5, 9, "gv:dimColor", "$tc(up, df(EEEE d))$", "FRIDAY 17"),
      line("Accent rule", 0.075, 0.205, 0.1),
      text("Event", 0.075, 0.26, 0.84, 16, "gv:textColor", '$if(ci(title, 0) = "", No events today, ci(title, 0))$', "Design review", {
        lines: 2,
      }),
      text(
        "Event time",
        0.075,
        0.47,
        0.84,
        10,
        "gv:accentSoft",
        '$if(ci(title, 0) = "", , df(HH:mm, ci(start, 0)) + " – " + df(HH:mm, ci(end, 0)))$',
        "18:30 – 19:15",
      ),
      hair("Divider", 0.075, 0.565, 0.85),
      text("Next label", 0.075, 0.6, 0.2, 8, "gv:dimColor", "NEXT", "NEXT"),
      text("Next event", 0.075, 0.655, 0.55, 10, "gv:textColor", '$if(ci(title, 1) = "", Nothing else today, ci(title, 1))$', "Team sync"),
      text("Next time", 0.64, 0.66, 0.27, 9, "gv:dimColor", '$if(ci(title, 1) = "", , df(HH:mm, ci(start, 1)))$', "11:00", {
        align: "CENTER",
      }),
    ],
  },

  {
    id: "crimson-strip",
    title: "Crimson Strip",
    description: "A 4×1 line of type: the pack's motto between a kanji and a blossom",
    features: "",
    grid: [4, 1],
    items: (() => {
      const dot = dotter(4, 1);
      return [
        card,
        text("Kanji", 0.035, 0.14, 0.05, 9, "gv:accentSoft", "月", "月", { align: "CENTER" }),
        vhair("Rail", 0.105, 0.14, 0.5),
        text("Quote", 0.14, 0.22, 0.56, 15, "gv:textColor", "GOOD THINGS TAKE TIME", "GOOD THINGS TAKE TIME"),
        text("Sub line", 0.14, 0.55, 0.5, 9, "gv:dimColor", "月の光 — the moon keeps its own hours.", "月の光 — the moon keeps its own hours."),
        text("Brand", 0.66, 0.22, 0.2, 8, "gv:accentSoft", "CRIMSON", "CRIMSON", { align: "CENTER" }),
        text("Brand 2", 0.66, 0.4, 0.2, 8, "gv:dimColor", "MOON", "MOON", { align: "CENTER" }),
        ...blossom(4, 1, 0.93, 0.52, 0.016, dot),
      ];
    })(),
  },

  {
    id: "sakura-note",
    title: "Sakura Note",
    description: "A square note card: four kanji down the rail and the motto in two lines",
    features: "",
    grid: [2, 2],
    items: (() => {
      const dot = dotter(2, 2);
      return [
        card,
        vhair("Rail", 0.065, 0.1, 0.42),
        text("Kanji 1", 0.09, 0.1, 0.1, 12, "gv:accentSoft", "静", "静"),
        text("Kanji 2", 0.09, 0.2, 0.1, 12, "gv:accentSoft", "か", "か"),
        text("Kanji 3", 0.09, 0.3, 0.1, 12, "gv:accentSoft", "な", "な"),
        text("Kanji 4", 0.09, 0.4, 0.1, 12, "gv:accentSoft", "夜", "夜"),
        ...blossom(2, 2, 0.82, 0.14, 0.035, dot),
        text("Quote 1", 0.09, 0.555, 0.82, 13, "gv:textColor", "GOOD THINGS", "GOOD THINGS"),
        text("Quote 2", 0.09, 0.655, 0.82, 13, "gv:accentSoft", "TAKE TIME.", "TAKE TIME."),
        hair("Foot rule", 0.09, 0.79, 0.35),
        text("Foot", 0.09, 0.835, 0.82, 8, "gv:dimColor", "桜 · CRIMSON MOON", "桜 · CRIMSON MOON"),
      ];
    })(),
  },

  {
    id: "sakura-battery",
    title: "Sakura Battery",
    description: "Charge level with a bar that turns deep crimson when low",
    features: "",
    grid: [4, 1],
    items: (() => {
      const dot = dotter(4, 1);
      return [
        card,
        text("Label", 0.075, 0.14, 0.4, 8, "gv:dimColor", "BATTERY", "BATTERY"),
        text("Level", 0.075, 0.3, 0.4, 26, "$if(bi(level) <= 20, gv(alert), gv(textColor))$", "$bi(level)$%", "78%"),
        text("State", 0.075, 0.8, 0.35, 8, "gv:dimColor", "$if(bi(charging) = 1, Charging, On battery)$", "On battery"),
        {
          kind: "bar",
          title: "Charge",
          x: 0.45,
          y: 0.32,
          w: 0.48,
          h: 6,
          level: "bi(level)",
          color: "$if(bi(level) <= 20, gv(alert), gv(accent))$",
          track: "$#33F6E7EC$",
          demo: 78,
          demoColor: "gv:accent",
        },
        dot("Plug dot", 0.458, 0.58, 0.016, "$if(bi(charging) = 1, gv(accent), gv(hairline))$"),
        text("Plug state", 0.48, 0.545, 0.3, 8, "gv:dimColor", "$if(bi(charging) = 1, Charging, Unplugged)$", "Unplugged"),
        text(
          "Advice",
          0.45,
          0.8,
          0.48,
          8,
          "gv:alert",
          "$if(bi(level) <= 20, Low — plug me in, Time to spare)$",
          "Time to spare",
        ),
      ];
    })(),
  },

  {
    id: "night-weather",
    title: "Night Weather",
    description: "Current temperature, condition, the day's range and a moon",
    features: "",
    grid: [4, 2],
    items: (() => {
      const dot = dotter(4, 2);
      return [
        card,
        line("Accent rule", 0.075, 0.14, 0.16),
        text("Temperature", 0.075, 0.17, 0.6, 44, "gv:textColor", "$wi(temp)$°", "14°"),
        text("Condition", 0.075, 0.55, 0.5, 11, "gv:accentSoft", "$tc(cap, wi(cond))$", "Clear"),
        hair("Lower rule", 0.075, 0.65, 0.85),
        // The high and low live once, in the right column; repeating them here
        // as a "H 18 L 9" line would say the same thing twice on one plate.
        text("Updated", 0.075, 0.69, 0.5, 9, "gv:dimColor", "as of $df(HH:mm)$", "as of 21:47"),
        hair("Right rule", 0.65, 0.17, 0.27),
        text("High", 0.65, 0.19, 0.27, 14, "gv:textColor", '$if(wi(high) = -999, "--", "H  " + wi(high) + "°")$', "H  18°"),
        text("Low", 0.65, 0.31, 0.27, 11, "gv:dimColor", '$if(wi(low) = -999, "--", "L  " + wi(low) + "°")$', "L  9°"),
        { kind: "circle", title: "Moon halo", x: 0.82, y: 0.61, w: 0.13, color: "$#22FF2F5D$" },
        dot("Moon", 0.85, 0.67, 0.07, "gv:accent"),
      ];
    })(),
  },

  {
    id: "crimson-player",
    title: "Crimson Player",
    description: "Album art, title, artist, album and transport on one plate",
    features: "MUSIC",
    grid: [4, 2],
    items: [
      card,
      { kind: "art", title: "Cover", x: 0.06, y: 0.15, w: 0.24, h: 0.7, expr: "$mi(cover)$" },
      text("Title", 0.34, 0.19, 0.6, 13, "gv:textColor", "$mi(title)$", "Sakura Drive"),
      text("Artist", 0.34, 0.32, 0.6, 10, "gv:dimColor", "$mi(artist)$", "Night Static"),
      text("Album", 0.34, 0.41, 0.6, 8, "gv:dimColor", "$mi(album)$", "Crimson Hours"),
      text("State", 0.34, 0.51, 0.3, 8, "gv:accent", "$if(mi(state) = PLAYING, PLAYING, PAUSED)$", "PLAYING"),
      hair("Transport rule", 0.34, 0.6, 0.58),
      // Words instead of ⏮ ▶ ⏭: those code points fall back to emoji on some
      // ROMs and arrive in colour, which a monochrome plate cannot carry.
      text("Previous", 0.34, 0.66, 0.14, 9, "gv:dimColor", "PREV", "PREV", {
        align: "CENTER",
        events: [{ action: "MUSIC", music_action: "PREVIOUS" }],
      }),
      text("Play pause", 0.49, 0.645, 0.16, 11, "gv:textColor", "$if(mi(state) = PLAYING, PAUSE, PLAY)$", "PAUSE", {
        align: "CENTER",
        events: [{ action: "MUSIC" }],
      }),
      text("Next", 0.66, 0.66, 0.14, 9, "gv:dimColor", "NEXT", "NEXT", {
        align: "CENTER",
        events: [{ action: "MUSIC", music_action: "NEXT" }],
      }),
      hair("Foot rule", 0.34, 0.82, 0.58),
      text("Foot mark", 0.34, 0.86, 0.3, 8, "gv:dimColor", "月の光", "月の光"),
      text("Foot brand", 0.62, 0.865, 0.3, 7.5, "gv:dimColor", "CRIMSON MOON", "CRIMSON MOON", { align: "CENTER" }),
    ],
  },
];
