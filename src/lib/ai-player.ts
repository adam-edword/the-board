import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

// the ai player: a regular member of the board whose picks come from claude.
// once a week (wednesday, like a normal guy filling out his picks) he looks
// up each game, makes his picks, and sums up his week in a sentence or two.

// who he is. his name and marker live on his profile.
const PERSONA: { team: string | null } = {
  team: null, // the one team he can't be objective about, once he has one
};

const MODEL = "claude-opus-5-5";
// how long to wait after a failed or partial run before trying again
const RETRY_MS = 20 * 60_000;
// games kicking off sooner than this get left to the coin
const MIN_LEAD_MS = 10 * 60_000;

type OpenGame = {
  id: number;
  week_id: number;
  home_abbr: string;
  away_abbr: string;
  league: "nfl" | "ncaaf";
  kickoff: string;
  home_name: string;
  home_rank: number | null;
  away_name: string;
  away_rank: number | null;
  network: string | null;
  featured: boolean;
};

type AiPick = { game_id: number; side: "home" | "away" };

/**
 * makes the ai player's picks for any game that's due. a game is due from
 * noon central on the wednesday of its week until shortly before kickoff.
 * safe to call on every page load: it bails early when nothing is due, and
 * only one attempt runs every 20 minutes.
 */
export async function runAiPlayer() {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_SECRET_KEY) return { skipped: "not configured" };
  const db = createAdminClient();

  const { data: ai } = await db.from("profiles").select("id, name").eq("is_ai", true).eq("approved", true).maybeSingle();
  if (!ai) return { skipped: "no ai player" };

  const now = Date.now();
  const { data: games } = await db
    .from("games")
    .select("id, week_id, league, kickoff, home_name, home_abbr, home_rank, away_name, away_abbr, away_rank, network, featured")
    .eq("status", "pre")
    .gt("kickoff", new Date(now + MIN_LEAD_MS).toISOString())
    .order("kickoff");
  const { data: mine } = await db.from("picks").select("game_id").eq("user_id", ai.id);
  const picked = new Set((mine ?? []).map((p) => p.game_id));
  // the admin can flip sync_state.ai_pick_now to have him pick early: every
  // open game in the next week counts as due, then the flag clears
  const { data: state } = await db.from("sync_state").select("ai_pick_now").eq("id", 1).single();
  const early = !!state?.ai_pick_now;
  const weekOut = now + 7 * 86_400_000;
  const due = ((games ?? []) as OpenGame[]).filter(
    (g) =>
      !picked.has(g.id) &&
      (now >= pickDay(new Date(g.kickoff)).getTime() || (early && new Date(g.kickoff).getTime() <= weekOut)),
  );
  if (!due.length) return { skipped: "nothing due" };

  // claim the slot so overlapping page loads don't both run it
  const { data: claimed } = await db
    .from("sync_state")
    .update({ ai_attempted_at: new Date().toISOString(), ai_pick_now: false })
    .eq("id", 1)
    .lte("ai_attempted_at", new Date(now - RETRY_MS).toISOString())
    .select("id");
  if (!claimed?.length) return { skipped: "throttled" };

  const { picks, summary } = await askClaude(ai.name, due);
  const allowed = new Map(due.map((g) => [g.id, g]));
  const rows = picks
    .filter((p) => allowed.has(p.game_id) && (p.side === "home" || p.side === "away"))
    // a pick can't land after kickoff, even if the research ran long
    .filter((p) => new Date(allowed.get(p.game_id)!.kickoff).getTime() > Date.now())
    .map((p) => ({
      user_id: ai.id,
      game_id: p.game_id,
      side: p.side,
      auto: false,
      edited: false,
      updated_at: new Date().toISOString(),
    }));
  if (rows.length) {
    const { error } = await db.from("picks").upsert(rows, { onConflict: "user_id,game_id", ignoreDuplicates: true });
    if (error) throw error;
    // one summary per week. a later run for a game added late keeps the first.
    const weekId = allowed.get(rows[0].game_id)!.week_id;
    if (summary) {
      await db.from("ai_summaries").upsert(
        { week_id: weekId, summary: summary.slice(0, 500) },
        { onConflict: "week_id", ignoreDuplicates: true },
      );
    }
    // tell the group chat. a failed post shouldn't undo the picks.
    try {
      await postToDiscord(ai.name, rows, allowed, summary, db);
    } catch (e) {
      console.error("ai player: discord post failed", e);
    }
  }
  return { picked: rows.length, due: due.length };
}

// posts his picks to the group's discord channel (DISCORD_WEBHOOK_URL): his
// summary, then one short line per game
async function postToDiscord(
  name: string,
  rows: { game_id: number; side: "home" | "away" }[],
  games: Map<number, OpenGame>,
  summary: string,
  db: ReturnType<typeof createAdminClient>,
) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const picked = rows
    .map((r) => ({ r, g: games.get(r.game_id)! }))
    .sort((a, b) => a.g.kickoff.localeCompare(b.g.kickoff));
  const { data: week } = await db.from("weeks").select("label").eq("id", picked[0].g.week_id).maybeSingle();
  const lines = picked.map(({ r, g }) => {
    const [win, lose] = r.side === "home" ? [g.home_abbr, g.away_abbr] : [g.away_abbr, g.home_abbr];
    return `**${win}** over ${lose}${g.featured ? " ⭐" : ""}`;
  });
  const site = process.env.SITE_URL?.replace(/\/$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: name.toLowerCase(),
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: `${name.toLowerCase()}'s picks${week?.label ? ` for ${week.label}` : ""}`,
          url: site || undefined,
          description: `${summary ? `${summary}\n\n` : ""}${lines.join("\n")}`.slice(0, 4000),
          color: 0xd97757,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`discord ${res.status}`);
}

// noon central on the wednesday on or before kickoff. that's when he picks.
function pickDay(kickoff: Date) {
  const tz = "America/Chicago";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      .formatToParts(kickoff)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const back = (weekday - 3 + 7) % 7;
  // wall-clock noon that day in utc, then shift by central's offset at that moment
  const noonUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - back, 12);
  const offset = centralOffsetMs(new Date(noonUtc), tz);
  const at = new Date(noonUtc - offset);
  // a wednesday game before noon picks the week before
  return at.getTime() > kickoff.getTime() ? new Date(at.getTime() - 7 * 86_400_000) : at;
}

// how far the zone is from utc at a moment (negative for central)
function centralOffsetMs(at: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return wall - at.getTime();
}

const SUBMIT_PICKS: Anthropic.Beta.BetaTool = {
  name: "submit_picks",
  description: "Lock in your picks for this week. Call this once, at the end, with a pick for every game listed.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "picks"],
    properties: {
      summary: {
        type: "string",
        description: "one or two short, casual sentences about your week of picks",
      },
      picks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["game_id", "side"],
          properties: {
            game_id: { type: "integer", description: "the id of the game from the list" },
            side: { type: "string", enum: ["home", "away"], description: "which team you're taking" },
          },
        },
      },
    },
  },
};

function systemPrompt(name: string) {
  const team = PERSONA.team
    ? `\n\nYour team is ${PERSONA.team}. You can't be objective about them: you pick them to win pretty much every time, even when you probably shouldn't.`
    : "";
  return `You're ${name}, playing in a weekly straight-up pick'em with your friends. Think of yourself as a regular guy in the group. You like football, you watch most weekends, but you're not obsessed and you're not a stats nerd. Every week you pick a winner for each game on the board: no spreads, just who wins. The featured game is worth double.

Before you pick, you do what a normal fan does: look up the games. Check who's hurt, who's starting at quarterback, how the teams have been playing, and what the betting line says. Then go with your read. You mostly trust the favorites but you'll take an underdog when something tells you to.${team}

Along with your picks, write a summary of your week: one or two short sentences, casual, the way you'd text the group chat. Your gut on the week, a pick you feel great or nervous about, that kind of thing. No stats dumps, no hedging, no emojis, lowercase is fine.

When you're done, call submit_picks once with a pick for every game.`;
}

function gameList(games: OpenGame[]) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return games
    .map((g) => {
      const team = (n: string, r: number | null) => (r ? `#${r} ${n}` : n);
      const when = `${fmt.format(new Date(g.kickoff))} central${g.network ? ` on ${g.network}` : ""}`;
      return `- game ${g.id} (${g.league === "nfl" ? "NFL" : "college"}${g.featured ? ", featured, worth double" : ""}): ${team(g.away_name, g.away_rank)} (away) at ${team(g.home_name, g.home_rank)} (home), ${when}`;
    })
    .join("\n");
}

async function askClaude(name: string, games: OpenGame[]): Promise<{ picks: AiPick[]; summary: string }> {
  const client = new Anthropic();
  const today = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "full" }).format(new Date());
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `It's ${today}. Here's this week's board:\n\n${gameList(games)}\n\nLook into the games, then submit your picks.`,
    },
  ];

  // web search runs on anthropic's side. a long research turn can pause, in
  // which case we hand the turn back and let it keep going.
  for (let turn = 0; turn < 8; turn++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: systemPrompt(name),
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 25 }, SUBMIT_PICKS],
      messages,
    });
    const message = await stream.finalMessage();

    const submit = message.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "submit_picks",
    );
    if (submit && message.stop_reason !== "max_tokens") return parsePicks(submit.input);

    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    if (message.stop_reason === "refusal") throw new Error("ai player: request was declined");
    // finished without submitting: nudge once more
    messages.push({ role: "assistant", content: message.content });
    messages.push({ role: "user", content: "Submit your picks now with submit_picks." });
  }
  throw new Error("ai player: never submitted picks");
}

function parsePicks(input: unknown): { picks: AiPick[]; summary: string } {
  const { picks: list, summary } = (input ?? {}) as { picks?: unknown; summary?: unknown };
  const picks = (Array.isArray(list) ? list : []).flatMap((p) => {
    const { game_id, side } = (p ?? {}) as Record<string, unknown>;
    if (typeof game_id !== "number" || (side !== "home" && side !== "away")) return [];
    return [{ game_id, side: side as AiPick["side"] }];
  });
  return { picks, summary: typeof summary === "string" ? summary.trim() : "" };
}
