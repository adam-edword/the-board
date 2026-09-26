import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getMembers, getSeasonData, getWeekData } from "@/lib/data";
import { firstName, isLocked } from "@/lib/format";
import { weekRecap } from "@/lib/recap";
import { seasonStats } from "@/lib/stats";
import type { Game, Profile, Week } from "@/lib/types";

// discord posts for the group: pick reminders 24h and 1h before a week's first
// kickoff, and a report once every game in the week is final. run by /api/cron.

const HOUR = 3600_000;
const DAY = 24 * HOUR;
// only report weeks that wrapped up recently, so back-filling an old week
// doesn't post a report for it
const REPORT_WITHIN = 3 * DAY;

const AMBER = 0xf2b632; // the board's --live color
const BLUE = 0x5b8def;

type Kind = "remind_24h" | "remind_1h" | "report";
type Db = ReturnType<typeof createAdminClient>;
type Embed = Record<string, unknown>;

export async function sendNotifications() {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return { skipped: "no webhook" };
  if (!process.env.SUPABASE_SECRET_KEY) return { skipped: "no secret key" };
  const db = createAdminClient();
  const now = Date.now();

  // any week with a game in the last few days or the next day is a candidate
  const { data: recent, error } = await db
    .from("games")
    .select("week_id")
    .gte("kickoff", new Date(now - REPORT_WITHIN).toISOString())
    .lte("kickoff", new Date(now + DAY).toISOString());
  if (error) throw error;
  const ids = [...new Set((recent ?? []).map((g) => g.week_id as number))];
  if (!ids.length) return { sent: [] };

  const { data: weeks } = await db
    .from("weeks")
    .select("id, season, label, created_at, games(kickoff, status, winner)")
    .in("id", ids);

  const due: { week: Week; kind: Kind }[] = [];
  for (const { games, ...week } of weeks ?? []) {
    const live = games.filter((g) => g.status !== "void").map((g) => new Date(g.kickoff).getTime());
    if (!live.length) continue;
    const first = Math.min(...live);
    const last = Math.max(...live);
    if (first > now && first - now <= HOUR) due.push({ week, kind: "remind_1h" });
    else if (first > now && first - now <= DAY) due.push({ week, kind: "remind_24h" });
    // every game final with a result in (sync fills the winner in a moment after "final")
    const final = games.every((g) => g.status === "void" || (g.status === "post" && g.winner));
    if (final && now - last <= REPORT_WITHIN) due.push({ week, kind: "report" });
  }

  const sent: string[] = [];
  const failed: string[] = [];
  for (const { week, kind } of due) {
    const tag = `${week.label}:${kind}`;
    if (!(await claim(db, week.id, kind))) continue;
    try {
      const embed = kind === "report" ? await reportEmbed(db, week) : await reminderEmbed(db, week, kind);
      if (embed) await post(hook, embed);
      sent.push(tag);
    } catch (e) {
      // let the next run try again
      console.error(`discord ${tag} failed`, e);
      await db.from("notifications").delete().eq("week_id", week.id).eq("kind", kind);
      failed.push(tag);
    }
  }
  return { sent, failed };
}

// true if this run gets to send it, false if it already went out
async function claim(db: Db, weekId: number, kind: Kind) {
  const { error } = await db.from("notifications").insert({ week_id: weekId, kind });
  if (!error) return true;
  if (error.code === "23505") return false; // unique violation: already sent
  throw error;
}

async function post(hook: string, embed: Embed) {
  const res = await fetch(hook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // names are plain text, never pings
    body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
  });
  if (!res.ok) throw new Error(`discord ${res.status}: ${await res.text()}`);
}

function siteUrl(path = "") {
  const base = process.env.SITE_URL?.replace(/\/$/, "");
  return base ? `${base}${path}` : undefined;
}

// ---------------------------------------------------------------------------
// reminders
// ---------------------------------------------------------------------------

async function reminderEmbed(db: Db, week: Week, kind: Kind): Promise<Embed | null> {
  const [{ games, picks, adjustments }, members] = await Promise.all([getWeekData(week.id, db), getMembers(db)]);
  const open = games.filter((g) => g.status !== "void" && !isLocked(g));
  if (!open.length) return null;
  const firstAt = Math.min(...open.map((g) => new Date(g.kickoff).getTime()));
  const firstGames = open.filter((g) => new Date(g.kickoff).getTime() === firstAt);
  const t = Math.floor(firstAt / 1000);

  // who still has open games to pick. people covered by a flat score for the
  // week don't pick.
  const flat = new Set(adjustments.map((a) => a.user_id));
  const mine = new Map<string, number>();
  const openIds = new Set(open.map((g) => g.id));
  for (const p of picks) if (openIds.has(p.game_id)) mine.set(p.user_id, (mine.get(p.user_id) ?? 0) + 1);
  const missing = members
    .filter((m) => !m.is_bot && !flat.has(m.id) && (mine.get(m.id) ?? 0) < open.length)
    .map((m) => ({ m, left: open.length - (mine.get(m.id) ?? 0) }))
    .sort((a, b) => b.left - a.left || a.m.name.localeCompare(b.m.name));

  const list = missing.length
    ? missing.map(({ m, left }) => `${escape(name(m))}: ${left === open.length ? "no picks yet" : `${left} left`}`).join("\n")
    : "everyone's in 🎉";

  return {
    title: kind === "remind_1h" ? `${week.label}: first game locks in an hour` : `${week.label}: get your picks in`,
    url: siteUrl(`/?week=${week.id}`),
    color: BLUE,
    description: [
      `**${firstGames.map(matchup).join(", ")}** kicks off <t:${t}:R> (<t:${t}:f>)`,
      `${open.length} game${open.length === 1 ? "" : "s"} still open. picks lock at each game's kickoff.`,
    ].join("\n"),
    fields: [{ name: missing.length ? "still picking" : "picks", value: clip(list) }],
    footer: { text: "miss a pick and you get the coin's side" },
  };
}

// ---------------------------------------------------------------------------
// weekly report
// ---------------------------------------------------------------------------

async function reportEmbed(db: Db, week: Week): Promise<Embed | null> {
  const [{ games, picks, adjustments }, members, season] = await Promise.all([
    getWeekData(week.id, db),
    getMembers(db),
    getSeasonData(week.season, db),
  ]);
  const recap = weekRecap(games, picks, adjustments, members);
  if (!recap) return null; // nobody played
  const { pts, humans, top, bottom, winners, losers, upset, featured, featuredHad, coinPts, beatCoin, lostToCoin } = recap;

  const lines: string[] = [];
  if (winners.length) lines.push(`🏆 ${names(winners)} ${winners.length > 1 ? "tied for the week" : "won the week"} with **${top}** pts`);
  if (losers.length) lines.push(`📉 ${names(losers)} brought up the rear with **${bottom}**`);
  if (featured) {
    const had = featuredHad.length ? `${names(featuredHad)} cashed the double` : "nobody had it";
    lines.push(
      featured.winner === "tie"
        ? `⭐ featured game ended in a tie. ${had}`
        : `⭐ featured: **${team(featured, featured.winner as "home" | "away")}** won. ${had}`,
    );
  }
  if (upset) {
    const w = upset.game.winner as "home" | "away";
    const saw = upset.had.length ? `only ${names(upset.had)} saw it coming` : "nobody saw it coming";
    lines.push(`⚡ upset of the week: **${team(upset.game, w)}** over ${team(upset.game, w === "home" ? "away" : "home")}. ${saw}`);
  }
  if (coinPts !== null) {
    const verdict = lostToCoin.length
      ? `it beat ${names(lostToCoin)}`
      : beatCoin.length === humans.length
        ? "everyone beat it"
        : "nobody lost to it";
    lines.push(`🪙 the coin got **${coinPts}**. ${verdict}`);
  }

  const stats = seasonStats(season.weeks, season.games, season.picks, season.adjustments, members);

  // this week's scores, best first (ties share a rank), split like the
  // standings page's weekly breakdown
  const weekRows = humans.map((m) => {
    const line = stats.get(m.id)?.weeks.find((l) => l.week.id === week.id);
    return [rank(humans.map((h) => pts.get(h.id)!), pts.get(m.id)!), name(m), line?.cfb ?? 0, line?.nfl ?? 0, pts.get(m.id)!];
  });

  // season standings, same order as the standings page
  const standing = members
    .map((m) => ({ m, s: stats.get(m.id)! }))
    .sort((a, b) => b.s.points - a.s.points || b.s.correct / (b.s.decided || 1) - a.s.correct / (a.s.decided || 1));
  const seasonRows = standing.map(({ m, s }) => [
    rank(standing.map((x) => x.s.points), s.points),
    name(m),
    s.points,
    s.weekWins,
  ]);

  return {
    title: `${week.label} is final`,
    url: siteUrl(`/?week=${week.id}`),
    color: AMBER,
    description: lines.join("\n"),
    fields: [
      { name: week.label, value: table(["#", "name", "college", "nfl", "total"], weekRows) },
      { name: `${week.season} standings`, value: table(["#", "name", "pts", "wk"], seasonRows) },
    ],
    footer: { text: "the board" },
  };
}

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------

const team = (g: Game, side: "home" | "away") => (side === "home" ? g.home_abbr : g.away_abbr);
const matchup = (g: Game) => `${g.away_abbr} @ ${g.home_abbr}`;

// how the board writes people: first name, lowercase
function name(m: Profile) {
  return firstName(m.name).toLowerCase();
}

// discord markdown would eat underscores / asterisks in names
function escape(s: string) {
  return s.replace(/([\\*_~`|>])/g, "\\$1");
}

// "a, b & c", bold
function names(list: Profile[]) {
  return list.map((m, i) => `${i === 0 ? "" : i === list.length - 1 ? " & " : ", "}**${escape(name(m))}**`).join("");
}

function rank(all: number[], mine: number) {
  return 1 + all.filter((x) => x > mine).length;
}

// monospace table in a code block. text columns pad right, numbers left.
function table(head: string[], rows: (string | number)[][]) {
  const all = [head, ...rows].map((r) => r.map((c) => String(c).replace(/`/g, "").slice(0, 14)));
  const width = head.map((_, i) => Math.max(...all.map((r) => r[i].length)));
  const numeric = head.map((_, i) => rows.every((r) => typeof r[i] === "number"));
  const fmt = (r: string[]) => r.map((c, i) => (numeric[i] ? c.padStart(width[i]) : c.padEnd(width[i]))).join("  ").trimEnd();
  const out: string[] = [];
  // embed fields cap at 1024 characters
  for (const r of all) {
    if ([...out, fmt(r)].join("\n").length > 1000) {
      out.push("…");
      break;
    }
    out.push(fmt(r));
  }
  return "```\n" + out.join("\n") + "\n```";
}

function clip(s: string) {
  return s.length > 1024 ? s.slice(0, 1020) + "\n…" : s;
}
