import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { firstName } from "@/lib/format";

// at 1pm central on each game day, the bot tags whoever still hasn't picked
// that day's games in discord. if the day's first game starts before 3pm, it
// goes 2 hours before kickoff instead so nobody misses the early games. one
// post per day at most, and none if everyone's in.
const LEAD_MS = 2 * 3600_000;
const REMIND_HOUR = 13;
const TZ = "America/Chicago";

export async function runPickReminder() {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url || !process.env.SUPABASE_SECRET_KEY) return { skipped: "not configured" };
  const db = createAdminClient();
  const now = Date.now();

  const { data: upcoming } = await db
    .from("games")
    .select("id, kickoff")
    .eq("status", "pre")
    .gt("kickoff", new Date(now).toISOString())
    .order("kickoff");
  if (!upcoming?.length) return { skipped: "no games" };

  // the next game day, in central time, and whether it's time to remind
  const day = centralDate(upcoming[0].kickoff);
  const firstKick = new Date(upcoming[0].kickoff).getTime();
  if (now < Math.min(centralAt(day, REMIND_HOUR), firstKick - LEAD_MS)) return { skipped: "not yet" };
  const games = upcoming.filter((g) => centralDate(g.kickoff) === day);

  // one reminder per day, even if two runs land at once
  const { data: claimed } = await db.from("pick_reminders").insert({ day }).select("day");
  if (!claimed?.length) return { skipped: "already reminded" };

  const [{ data: people }, { data: picks }] = await Promise.all([
    db.from("profiles").select("id, name, discord_id").eq("approved", true).eq("onboarded", true).eq("is_bot", false).eq("is_ai", false),
    db.from("picks").select("user_id, game_id").in("game_id", games.map((g) => g.id)),
  ]);
  const picked = new Map<string, number>();
  for (const p of picks ?? []) picked.set(p.user_id, (picked.get(p.user_id) ?? 0) + 1);
  const missing = (people ?? []).filter((p) => (picked.get(p.id) ?? 0) < games.length);
  if (!missing.length) return { reminded: 0 };

  const tags = missing.map((p) => (p.discord_id ? `<@${p.discord_id}>` : firstName(p.name).toLowerCase()));
  const site = process.env.SITE_URL?.replace(/\/$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "the board",
      content: `games today, first one kicks off at ${timeLabel(firstKick)} central. you still have picks to make: ${tags.join(" ")}${site ? `\n${site}` : ""}`,
      allowed_mentions: { users: missing.flatMap((p) => (p.discord_id ? [p.discord_id] : [])) },
    }),
  });
  if (!res.ok) {
    // let a later run try again
    await db.from("pick_reminders").delete().eq("day", day);
    throw new Error(`discord ${res.status}`);
  }
  return { reminded: missing.length };
}

function centralDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

// a wall-clock hour on a central date ("2026-10-08", 13) as a timestamp
function centralAt(day: string, hour: number) {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  const shown = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", hour: "2-digit" }).format(new Date(guess)));
  return guess + (hour - shown) * 3600_000;
}

function timeLabel(at: number) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(at)).toLowerCase();
}
