import { createClient } from "@/lib/supabase/server";
import { espnWeekNear, type League } from "@/lib/espn";
import type { Game } from "@/lib/types";
import { GamesWorkspace, type StartWeeks } from "./games-workspace";

export async function GamesTab({ weekId, prevWeekId, label, games, locked }: {
  weekId: number;
  prevWeekId: number | null;
  label: string;
  games: Game[];
  locked: boolean;
}) {
  const start = locked ? {} : await startWeeks(games, prevWeekId);
  return <GamesWorkspace key={weekId} weekId={weekId} label={label} games={games} start={start} locked={locked} />;
}

// which espn week the game browser should open on for each league, so it lines
// up with the board week being edited instead of whatever week espn is on now:
// - the week already has games: the espn week they're in
// - it's empty: the espn week after the previous board week's games
// - neither: leave it to espn (its current week)
async function startWeeks(games: Game[], prevWeekId: number | null): Promise<StartWeeks> {
  let from: { kickoff: string; league: League }[] = games;
  let step = 0;
  if (!from.length && prevWeekId) {
    const supabase = await createClient();
    const { data } = await supabase.from("games").select("kickoff, league").eq("week_id", prevWeekId);
    from = (data ?? []) as typeof from;
    step = 1;
  }
  const leagues: League[] = ["nfl", "ncaaf"];
  const found = await Promise.all(
    leagues.map((l) => {
      // go off that league's own games when there are any, they pin the week exactly
      const at = earliest(from.filter((g) => g.league === l)) ?? earliest(from);
      return at ? espnWeekNear(l, at).catch(() => null) : null;
    }),
  );
  const start: StartWeeks = {};
  leagues.forEach((l, i) => {
    const w = found[i];
    if (w) start[l] = { week: w.week + step, st: w.seasonType };
  });
  return start;
}

function earliest(games: { kickoff: string }[]) {
  return games.map((g) => g.kickoff).sort()[0] ?? null;
}
