import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { espnWeekNear, fetchSchedule, toGameRow, type EspnGame } from "@/lib/espn";

// the commissioner: every tuesday morning an agent picks the weekend's games
// and posts them. nobody (the admin included) gets a say, same as the old
// whiteboard. it's kept apart from claude the player on purpose: it never sees
// anyone's picks, record, or the standings, only the matchups.

const MODEL = "claude-opus-5-5";
const TZ = "America/Chicago";
// the board's usual shape: 6 college, 3 nfl, and the 2x game is a college one
const CFB_GAMES = 6;
const NFL_GAMES = 3;
const RETRY_MS = 20 * 60_000;

type Candidate = EspnGame & { id: string };

/**
 * makes the coming weekend's board, once it's tuesday 9am central or later and
 * no board week has games that weekend yet. safe to call often: it bails early
 * otherwise, and only tries once every 20 minutes.
 */
export async function runSlatePicker() {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_SECRET_KEY) return { skipped: "not configured" };

  const now = new Date();
  const { weekday, hour } = centralParts(now);
  // tuesday 9am through saturday
  if (weekday < 2 || weekday > 6 || (weekday === 2 && hour < 9)) return { skipped: "not tuesday yet" };

  // the weekend: thursday through monday around this week's saturday
  const saturday = addDays(centralMidnight(now), 6 - weekday);
  const from = addDays(saturday, -2);
  const to = addDays(saturday, 3);

  const db = createAdminClient();
  const { data: existing } = await db
    .from("games")
    .select("id")
    .gte("kickoff", from.toISOString())
    .lt("kickoff", to.toISOString())
    .limit(1);
  if (existing?.length) return { skipped: "already has a board" };

  const { data: claimed } = await db
    .from("sync_state")
    .update({ slate_attempted_at: now.toISOString() })
    .eq("id", 1)
    .lte("slate_attempted_at", new Date(now.getTime() - RETRY_MS).toISOString())
    .select("id");
  if (!claimed?.length) return { skipped: "throttled" };

  // every game espn has that weekend, far enough out to still be picked
  const soonest = now.getTime() + 12 * 3600_000;
  const inWindow = (g: EspnGame) => {
    const t = new Date(g.kickoff).getTime();
    return g.status === "pre" && t >= Math.max(from.getTime(), soonest) && t < to.getTime();
  };
  const [cfbWeek, nflWeek] = await Promise.all([
    espnWeekNear("ncaaf", saturday.toISOString()),
    espnWeekNear("nfl", addDays(saturday, 1).toISOString()),
  ]);
  const [cfb, nfl] = await Promise.all([
    cfbWeek ? fetchSchedule("ncaaf", { week: cfbWeek.week, seasonType: cfbWeek.seasonType }) : null,
    nflWeek ? fetchSchedule("nfl", { week: nflWeek.week, seasonType: nflWeek.seasonType }) : null,
  ]);
  const candidates: Candidate[] = [...(cfb?.games ?? []), ...(nfl?.games ?? [])]
    .filter(inWindow)
    .map((g) => ({ ...g, id: g.espnId }));
  const cfbCount = candidates.filter((g) => g.league === "ncaaf").length;
  const nflCount = candidates.filter((g) => g.league === "nfl").length;
  if (cfbCount < CFB_GAMES || nflCount < NFL_GAMES) return { skipped: "not enough games on espn" };

  const slate = await askClaude(candidates);
  const byId = new Map(candidates.map((g) => [g.id, g]));
  const chosen = [...new Map(slate.games.filter((s) => byId.has(s.espn_id)).map((s) => [s.espn_id, s])).values()];
  const pickedCfb = chosen.filter((s) => byId.get(s.espn_id)!.league === "ncaaf").slice(0, CFB_GAMES);
  const pickedNfl = chosen.filter((s) => byId.get(s.espn_id)!.league === "nfl").slice(0, NFL_GAMES);
  if (pickedCfb.length < CFB_GAMES || pickedNfl.length < NFL_GAMES) throw new Error("slate picker: incomplete slate");
  const games = [...pickedCfb, ...pickedNfl];
  const featured = pickedCfb.some((s) => s.espn_id === slate.featured_espn_id) ? slate.featured_espn_id : pickedCfb[0].espn_id;

  // a new week, named one past the season's last "week N"
  const { data: weeks } = await db.from("weeks").select("label, season");
  const season = weeks?.length ? Math.max(...weeks.map((w) => w.season)) : now.getFullYear();
  const nums = (weeks ?? [])
    .filter((w) => w.season === season)
    .map((w) => Number(/(\d+)\s*$/.exec(w.label)?.[1]))
    .filter(Number.isFinite);
  const label = `week ${nums.length ? Math.max(...nums) + 1 : 0}`;
  const { data: week, error: weekError } = await db
    .from("weeks")
    .insert({ label, season, auto_slate: true })
    .select("id")
    .single();
  if (weekError) throw weekError;

  const rows = games.map((s) => ({
    ...toGameRow(week.id, byId.get(s.espn_id)!),
    slate_reason: s.reason.trim().slice(0, 300) || null,
    featured: s.espn_id === featured,
  }));
  const { error } = await db.from("games").insert(rows);
  if (error) {
    await db.from("weeks").delete().eq("id", week.id);
    throw error;
  }

  try {
    await postToDiscord(label, rows);
  } catch (e) {
    console.error("slate picker: discord post failed", e);
  }
  return { week: label, games: rows.length };
}

// ---------------------------------------------------------------- claude

const SUBMIT_SLATE: Anthropic.Beta.BetaTool = {
  name: "submit_slate",
  description: `Post this week's board. Call this once, at the end, with exactly ${CFB_GAMES} college games and ${NFL_GAMES} NFL games.`,
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["games", "featured_espn_id"],
    properties: {
      games: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["espn_id", "reason"],
          properties: {
            espn_id: { type: "string", description: "the game's id from the list" },
            reason: { type: "string", description: "one short sentence on why this game made the board" },
          },
        },
      },
      featured_espn_id: { type: "string", description: "the college game worth double points" },
    },
  },
};

const SYSTEM = `You're Claude, acting as commissioner for a group of friends' weekly straight-up pick'em (no spreads, pick who wins). Each week you choose which games go on the board, and nobody can change them, so choose well.

Pick exactly ${CFB_GAMES} college games and ${NFL_GAMES} NFL games, and choose one of the college games as the featured game, worth double points.

What makes a good board: games people will actually watch and argue about. Favor close games (a small betting line), ranked matchups, rivalries, and big-stage slots (primetime, national TV). Avoid obvious blowouts, even between big names. Spread it across the weekend where you can. The featured game should be the biggest college game of the week. You can search the web for storylines if it helps, but don't overthink it.

For each game, write one short sentence on why it's on the board, in your own voice: plain, a little dry, no hype, no emojis. Lowercase is fine.

When you're done, call submit_slate once.`;

function candidateList(games: Candidate[]) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit" });
  const team = (n: string, r: number | null) => (r ? `#${r} ${n}` : n);
  return games
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .map((g) =>
      [
        `- ${g.id} (${g.league === "nfl" ? "NFL" : "college"}): ${team(g.awayName, g.awayRank)} at ${team(g.homeName, g.homeRank)}`,
        `${fmt.format(new Date(g.kickoff))} central`,
        g.network && `on ${g.network}`,
        g.line && `line ${g.line}`,
        g.note,
      ]
        .filter(Boolean)
        .join(", "),
    )
    .join("\n");
}

async function askClaude(candidates: Candidate[]) {
  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: `Here's everything on this weekend:\n\n${candidateList(candidates)}\n\nPick the board.` },
  ];
  for (let turn = 0; turn < 8; turn++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: SYSTEM,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }, SUBMIT_SLATE],
      messages,
    });
    const message = await stream.finalMessage();
    const submit = message.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "submit_slate",
    );
    if (submit && message.stop_reason !== "max_tokens") return parseSlate(submit.input);
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    if (message.stop_reason === "refusal") throw new Error("slate picker: request was declined");
    messages.push({ role: "assistant", content: message.content });
    messages.push({ role: "user", content: "Post the board now with submit_slate." });
  }
  throw new Error("slate picker: never submitted a slate");
}

function parseSlate(input: unknown) {
  const { games, featured_espn_id } = (input ?? {}) as { games?: unknown; featured_espn_id?: unknown };
  return {
    games: (Array.isArray(games) ? games : []).flatMap((g) => {
      const { espn_id, reason } = (g ?? {}) as Record<string, unknown>;
      return typeof espn_id === "string" ? [{ espn_id, reason: typeof reason === "string" ? reason : "" }] : [];
    }),
    featured_espn_id: typeof featured_espn_id === "string" ? featured_espn_id : "",
  };
}

// ---------------------------------------------------------------- discord

async function postToDiscord(
  label: string,
  rows: { away_abbr: string; home_abbr: string; kickoff: string; featured: boolean; slate_reason: string | null }[],
) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const lines = [...rows]
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .map((r) => `**${r.away_abbr} @ ${r.home_abbr}**${r.featured ? " ⭐ 2x" : ""}${r.slate_reason ? `\n${r.slate_reason}` : ""}`);
  const site = process.env.SITE_URL?.replace(/\/$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "the board",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: `${label} is up`,
          url: site || undefined,
          description: `${lines.join("\n\n")}\n\npicks lock at kickoff.`.slice(0, 4000),
          color: 0xd97757,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`discord ${res.status}`);
}

// ---------------------------------------------------------------- dates

function centralParts(at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short",
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
  };
}

// midnight central on the day `at` falls on (in central)
function centralMidnight(at: Date) {
  const { year, month, day } = centralParts(at);
  const guess = Date.UTC(year, month - 1, day, 6); // central is utc-5 or -6
  const { hour } = centralParts(new Date(guess));
  return new Date(guess - hour * 3600_000);
}

// whole days later, landing on midnight central even across dst changes
function addDays(midnight: Date, days: number) {
  return centralMidnight(new Date(midnight.getTime() + days * 86_400_000 + 12 * 3600_000));
}
