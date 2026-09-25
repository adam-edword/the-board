// marker colors + handwriting fonts people can pick for their name on the board.
// keys must match the check constraints in supabase/migrations/0006_marker_style.sql

export const MARKER_COLORS = {
  white: "#f4f4f5",
  red: "#f87171",
  orange: "#fb923c",
  yellow: "#facc15",
  green: "#4ade80",
  blue: "#60a5fa",
  purple: "#c084fc",
  pink: "#f472b6",
} as const;

// css vars are set up by next/font in app/layout.tsx. size evens out how big
// each font looks, some run much larger than others at the same px.
export const MARKER_FONTS = {
  kalam: { label: "kalam", family: "var(--font-kalam)", size: 15 },
  "permanent-marker": { label: "permanent marker", family: "var(--font-permanent-marker)", size: 16 },
  caveat: { label: "caveat", family: "var(--font-caveat)", size: 19 },
  "rock-salt": { label: "rock salt", family: "var(--font-rock-salt)", size: 12 },
  "gochi-hand": { label: "gochi hand", family: "var(--font-gochi-hand)", size: 16 },
  "sedgwick-ave": { label: "sedgwick ave", family: "var(--font-sedgwick-ave)", size: 16 },
} as const;

export type MarkerColor = keyof typeof MARKER_COLORS;
export type MarkerFont = keyof typeof MARKER_FONTS;

export type Marker = { name: string; color: MarkerColor; font: MarkerFont };

export function markerStyle(m: { color: MarkerColor; font: MarkerFont }): React.CSSProperties {
  const font = MARKER_FONTS[m.font] ?? MARKER_FONTS.kalam;
  return { color: MARKER_COLORS[m.color] ?? MARKER_COLORS.white, fontFamily: font.family, fontSize: font.size };
}

export function isMarkerColor(v: unknown): v is MarkerColor {
  return typeof v === "string" && v in MARKER_COLORS;
}

export function isMarkerFont(v: unknown): v is MarkerFont {
  return typeof v === "string" && v in MARKER_FONTS;
}
