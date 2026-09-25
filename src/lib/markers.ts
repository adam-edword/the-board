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
  pangolin: { label: "pangolin", family: "var(--font-pangolin)", size: 15 },
  "protest-revolution": { label: "protest revolution", family: "var(--font-protest-revolution)", size: 15 },
  lacquer: { label: "lacquer", family: "var(--font-lacquer)", size: 14 },
  "fuzzy-bubbles": { label: "fuzzy bubbles", family: "var(--font-fuzzy-bubbles)", size: 14 },
  gaegu: { label: "gaegu", family: "var(--font-gaegu)", size: 18 },
  "covered-by-your-grace": { label: "covered by your grace", family: "var(--font-covered-by-your-grace)", size: 17 },
} as const;

export type MarkerColor = keyof typeof MARKER_COLORS;
export type MarkerFont = keyof typeof MARKER_FONTS;

// `at` is when they wrote it (pick time), used to place names like a real whiteboard
export type Marker = { id?: string; name: string; color: MarkerColor; font: MarkerFont; bot?: boolean; at?: string; edited?: boolean };

export function markerStyle(m: { color: MarkerColor; font: MarkerFont }): React.CSSProperties {
  const font = MARKER_FONTS[m.font] ?? MARKER_FONTS.pangolin;
  return { color: MARKER_COLORS[m.color] ?? MARKER_COLORS.white, fontFamily: font.family, fontSize: font.size };
}

export function isMarkerColor(v: unknown): v is MarkerColor {
  return typeof v === "string" && v in MARKER_COLORS;
}

export function isMarkerFont(v: unknown): v is MarkerFont {
  return typeof v === "string" && v in MARKER_FONTS;
}
