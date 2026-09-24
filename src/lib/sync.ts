import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchGame, type League } from "@/lib/espn";

const MIN_INTERVAL_MS = 60_000;

/**
 * pulls fresh scores from espn for any game that isn't final yet.
 * throttled so it runs at most once a minute no matter how many people
 * have the board open. safe to call on every page load.
 */
export async function syncScores({ force = false } = {}) {
  if (!process.env.SUPABASE_SECRET_KEY) return { skipped: "no secret key" };
  const db = createAdminClient();

  // claim the sync slot atomically so two requests don't both hit espn
  const cutoff = new Date(Date.now() - (force ? 0 : MIN_INTERVAL_MS)).toISOString();
  const { data: claimed } = await db
    .from("sync_state")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", 1)
    .lte("last_synced_at", cutoff)
    .select("id");
  if (!claimed?.length) return { skipped: "throttled" };

  // normal runs refresh games that should have started. forced runs (admin
  // button / daily cron) also refresh upcoming games to catch time changes.
  const horizon = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
  const { data: games, error } = await db
    .from("games")
    .select("id, league, espn_id, kickoff, status")
    .in("status", ["pre", "in"])
    .lte("kickoff", horizon);
  if (error) throw error;

  const now = Date.now();
  const stale = (games ?? []).filter(
    (g) => force || g.status === "in" || new Date(g.kickoff).getTime() <= now,
  );

  const results = await Promise.allSettled(
    stale.map(async (g) => {
      const fresh = await fetchGame(g.league as League, g.espn_id);
      const { error } = await db
        .from("games")
        .update({
          kickoff: fresh.kickoff,
          status: fresh.status,
          status_detail: fresh.statusDetail,
          home_score: fresh.homeScore,
          away_score: fresh.awayScore,
          home_rank: fresh.homeRank,
          away_rank: fresh.awayRank,
          winner: fresh.winner,
        })
        .eq("id", g.id);
      if (error) throw error;
    }),
  );

  return { updated: results.filter((r) => r.status === "fulfilled").length, of: stale.length };
}
