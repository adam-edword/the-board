import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchGame, type League } from "@/lib/espn";

const MIN_INTERVAL_MS = 60_000;
const FULL_INTERVAL_MS = 6 * 3600_000;

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

  // every few hours also re-check upcoming games so flexed / moved kickoff
  // times get picked up (no cron needed, piggybacks on page loads)
  if (!force) {
    const { data: full } = await db
      .from("sync_state")
      .update({ last_full_sync_at: new Date().toISOString() })
      .eq("id", 1)
      .lte("last_full_sync_at", new Date(Date.now() - FULL_INTERVAL_MS).toISOString())
      .select("id");
    force = !!full?.length;
  }

  // normal runs refresh games that should have started. full runs also
  // refresh upcoming games to catch time changes.
  const horizon = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
  const { data: games, error } = await db
    .from("games")
    .select("id, league, espn_id, kickoff, status")
    .or("status.in.(pre,in),and(status.eq.post,winner.is.null)")
    .lte("kickoff", horizon);
  if (error) throw error;

  const now = Date.now();
  // also look at games starting within 3 hours, in case espn moved the kickoff earlier
  const soon = now + 3 * 3600_000;
  const stale = (games ?? []).filter(
    (g) => force || g.status !== "pre" || new Date(g.kickoff).getTime() <= soon,
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
          // networks sometimes get announced late, so keep the latest (but never wipe one out)
          ...(fresh.network ? { network: fresh.network } : {}),
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

  // anyone who missed a pick on a game that's now started gets coin's side
  const { data: filled } = await db.rpc("fill_missed_picks");

  return { updated: results.filter((r) => r.status === "fulfilled").length, of: stale.length, filled };
}
