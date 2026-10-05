import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { firstName } from "@/lib/format";
import { MARKER_COLORS, MARKER_FONTS, type MarkerFont } from "@/lib/markers";
import type { Recap } from "@/lib/recap";
import type { Profile } from "@/lib/types";

// the week recap card drawn as a png for discord, matching the board's card.
// everything is drawn at 2x so it stays sharp on phones.

const S = 2;
const C = { bg: "#0a0a0a", card: "#171717", cardTo: "#1f1f1f", border: "#2a2a2a", fg: "#fafafa", muted: "#a1a1a1", live: "#fab72a" };

// marker fonts as ttf (satori can't read woff2), trimmed to latin in public/fonts
const FONT_FILES: Record<string, string> = {
  geist: "geist-400.ttf",
  "geist-bold": "geist-700.ttf",
  "geist-mono": "geist-mono-700.ttf",
  pangolin: "pangolin.ttf",
  "protest-revolution": "protest-revolution.ttf",
  lacquer: "lacquer.ttf",
  "fuzzy-bubbles": "fuzzy-bubbles.ttf",
  gaegu: "gaegu.ttf",
  "covered-by-your-grace": "covered-by-your-grace.ttf",
  // fallbacks for names outside latin (dinkler's is in yi)
  "noto-sans": "noto-sans.ttf",
  "noto-sans-yi": "noto-sans-yi.ttf",
};

async function loadFonts() {
  const dir = path.join(process.cwd(), "public", "fonts");
  return Promise.all(
    Object.entries(FONT_FILES).map(async ([name, file]) => ({
      name,
      data: (await readFile(path.join(dir, file))).buffer as ArrayBuffer,
      weight: (name === "geist-bold" || name === "geist-mono" ? 700 : 400) as 400 | 700,
      style: "normal" as const,
    })),
  );
}

async function wordmark() {
  const png = await readFile(path.join(process.cwd(), "public", "claude-wordmark-clay.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** the recap as a png, or null if there's nothing to show */
export async function renderRecapPng(label: string, recap: Recap) {
  const [fonts, claudeMark] = await Promise.all([loadFonts(), wordmark()]);

  const name = (m: Profile) => {
    const font = MARKER_FONTS[m.marker_font as MarkerFont] ?? MARKER_FONTS.pangolin;
    const px = Math.round(font.size * 1.15 * S);
    if (m.marker_font === "claude-serif") {
      // his wordmark instead of text, sized like the board
      const h = Math.round(px * 0.6);
      // eslint-disable-next-line @next/next/no-img-element
      return <img alt="Claude" src={claudeMark} height={h} width={Math.round((h * 715) / 174)} style={{ marginBottom: -2 * S }} />;
    }
    return (
      <span style={{ fontFamily: m.marker_font, fontSize: px, color: MARKER_COLORS[m.marker_color] ?? MARKER_COLORS.white }}>
        {firstName(m.name).toLowerCase()}
      </span>
    );
  };
  const names = (list: Profile[]) =>
    list.flatMap((m, i) => [
      ...(i > 0 ? [<span key={`sep${m.id}`} style={{ whiteSpace: "pre" }}>{i === list.length - 1 ? " & " : ", "}</span>] : []),
      <span key={m.id} style={{ display: "flex" }}>
        {name(m)}
      </span>,
    ]);
  const bold = (t: string | number) => <span style={{ fontFamily: typeof t === "number" ? "geist-mono" : "geist-bold" }}>{t}</span>;

  const rows: { icon: React.ReactNode; muted?: boolean; parts: React.ReactNode[] }[] = [];
  const { winners, top, losers, bottom, featured, upset, coin } = recap;
  if (winners.length)
    rows.push({ icon: icons.trophy, parts: [...names(winners), ` ${winners.length > 1 ? "tied for the week" : "won the week"} with `, bold(top), " pts"] });
  if (losers.length) rows.push({ icon: icons.down, muted: true, parts: [...names(losers), " brought up the rear with ", bold(bottom)] });
  if (featured)
    rows.push({
      icon: icons.star,
      parts: [
        ...(featured.team === null ? ["featured game ended in a tie. "] : ["featured: ", bold(featured.team), " won. "]),
        ...(featured.had.length ? [...names(featured.had), " cashed the double"] : ["nobody had it"]),
      ],
    });
  if (upset)
    rows.push({
      icon: icons.zap,
      parts: [
        "upset of the week: ",
        bold(upset.winner),
        ` over ${upset.loser}. `,
        ...(upset.had.length ? ["only ", ...names(upset.had), " saw it coming"] : ["nobody saw it coming"]),
      ],
    });
  if (coin)
    rows.push({
      icon: icons.coin,
      parts: [
        "the coin got ",
        bold(coin.pts),
        ". ",
        ...(coin.beat.length ? ["it beat ", ...names(coin.beat)] : [coin.everyoneBeatIt ? "everyone beat it" : "nobody lost to it"]),
      ],
    });

  // text wraps, so guess each row's height from its length to size the image
  const width = 560 * S;
  // names are elements here, so count them by their text (markers run a bit wide)
  const nameLen = new Map(Object.values(recap).flatMap((v) => (v && typeof v === "object" ? collect(v) : [])).map((m) => [m.id, m.name.length]));
  const textChars = (parts: React.ReactNode[]) =>
    parts.reduce<number>((n, p) => {
      if (typeof p === "string") return n + p.length;
      const key = (p as React.ReactElement | null)?.key ?? "";
      const id = typeof key === "string" && !key.startsWith("sep") ? key : "";
      return n + (nameLen.has(id) ? Math.ceil(nameLen.get(id)! * 1.3) : 3);
    }, 0);
  const charsPerLine = 62;
  const lineH = 26 * S;
  const height =
    (12 + 22 + 30 + 18 + 22 + 12) * S +
    rows.reduce((h, r) => h + Math.max(1, Math.ceil(textChars(r.parts) / charsPerLine)) * lineH + 14 * S, 0) +
    // a little slack in case a row wraps more than guessed
    lineH / 2 +
    0;

  const res = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.bg, padding: 12 * S }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            borderRadius: 18 * S,
            border: `${S}px solid ${C.border}`,
            backgroundImage: `linear-gradient(135deg, ${C.card}, ${C.cardTo})`,
            padding: `${22 * S}px ${24 * S}px`,
            fontFamily: "geist",
            color: C.fg,
            fontSize: 16 * S,
          }}
        >
          <div style={{ fontFamily: "geist-bold", fontSize: 22 * S, marginBottom: 18 * S, flexShrink: 0 }}>{`${label} recap`}</div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", flexShrink: 0, alignItems: "flex-start", gap: 12 * S, marginBottom: 14 * S, color: r.muted ? C.muted : C.fg }}>
              <div style={{ display: "flex", width: 20 * S, height: lineH, alignItems: "center", flexShrink: 0 }}>{r.icon}</div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", lineHeight: `${lineH}px`, flex: 1 }}>
                {r.parts.flatMap((p, j) =>
                  typeof p === "string"
                    ? p.split(/(\s+)/).filter(Boolean).map((w, k) => <span key={`${j}-${k}`} style={{ whiteSpace: "pre" }}>{w}</span>)
                    : [<span key={j} style={{ display: "flex", alignItems: "center", height: lineH }}>{p}</span>],
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { width, height, fonts },
  );
  return Buffer.from(await res.arrayBuffer());
}

const svg = (children: React.ReactNode, fill = "none", stroke = C.live) => (
  <svg width={18 * S} height={18 * S} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const icons = {
  trophy: svg(
    [
      <path key="0" d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2" />,
      <path key="1" d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2" />,
      <path key="2" d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3" />,
      <path key="3" d="M4 22h16" />,
      <path key="4" d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />,
      <path key="5" d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" />,
    ],
  ),
  down: svg(
    [
      <path key="0" d="M16 17h6v-6" />,
      <path key="1" d="m22 17-8.5-8.5-5 5L2 7" />,
    ],
    "none",
    C.muted,
  ),
  star: svg(
    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />,
    C.live,
  ),
  zap: svg(
    <path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z" />,
  ),
  coin: (
    <svg width={18 * S} height={18 * S} viewBox="0 0 24 24">
      <path
        d="M12.3 2.4c5.3.1 9.4 4.3 9.2 9.7-.2 5.2-4.4 9.6-9.8 9.5-5.3-.1-9.4-4.6-9.3-9.8.1-5.1 4.6-9.5 9.9-9.4z"
        fill="#facc15"
        fillOpacity={0.22}
        stroke="#facc15"
        strokeWidth={1.8}
      />
      <path
        d="M12.1 5.6c3.6 0 6.3 2.9 6.2 6.5-.1 3.5-2.9 6.3-6.4 6.2-3.5-.1-6.1-3-6-6.4.1-3.5 2.8-6.3 6.2-6.3z"
        fill="none"
        stroke="#facc15"
        strokeWidth={1.1}
        strokeDasharray="2.2 1.6"
      />
      <path
        d="M14.6 9.4c-.6-.9-1.6-1.4-2.7-1.3-1.9.2-3.1 1.9-3 3.9.1 2 1.6 3.6 3.4 3.5 1.1 0 2-.6 2.5-1.4"
        fill="none"
        stroke="#facc15"
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </svg>
  ),
};

// every profile mentioned anywhere in the recap
function collect(v: object): Profile[] {
  if (Array.isArray(v)) return v.flatMap((x) => (x && typeof x === "object" ? ("marker_font" in x ? [x as Profile] : collect(x)) : []));
  return Object.values(v).flatMap((x) => (x && typeof x === "object" ? collect(x) : []));
}
