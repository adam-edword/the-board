import { createClient } from "@/lib/supabase/server";
import { espnWeekNear, type League } from "@/lib/espn";
import type { Game } from "@/lib/types";
import { getMe } from "@/lib/data";
import { GamesWorkspace, type StartWeeks, type SwapView } from "./games-workspace";

export async function GamesTab({ weekId, prevWeekId, label, games, locked }: {
  weekId: number;
  prevWeekId: number | null;
  label: string;
  games: Game[];
  locked: boolean;
}) {
  const [start, swaps] = await Promise.all([startWeeks(games, prevWeekId), locked ? getSwaps(weekId) : []]);
  return <GamesWorkspace key={weekId} weekId={weekId} label={label} games={games} start={start} locked={locked} swaps={swaps} />;
}

// pending swaps for a commissioner week, plus the last few that were settled
async function getSwaps(weekId: number): Promise<SwapView[]> {
  const supabase = await createClient();
  const [me, { data: swaps }, { data: admins }] = await Promise.all([
    getMe(),
    supabase
      .from("slate_swaps")
      .select("id, out_label, in_label, status, in_kickoff, proposed_by, slate_swap_votes(admin_id, approve)")
      .eq("week_id", weekId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("profiles").select("id, name").eq("is_admin", true),
  ]);
  const name = (id: string) => (admins ?? []).find((a) => a.id === id)?.name.toLowerCase() ?? "someone";
  return (swaps ?? []).map((s) => {
    const votes = (s.slate_swap_votes ?? []) as { admin_id: string; approve: boolean }[];
    const expired = s.status === "pending" && new Date(s.in_kickoff).getTime() <= Date.now();
    return {
      id: s.id,
      outLabel: s.out_label,
      inLabel: s.in_label,
      status: expired ? "expired" : (s.status as SwapView["status"]),
      proposedBy: name(s.proposed_by),
      approvedBy: votes.filter((v) => v.approve).map((v) => name(v.admin_id)),
      waitingOn: (admins ?? []).filter((a) => !votes.some((v) => v.admin_id === a.id)).map((a) => a.name.toLowerCase()),
      canVote: !!me && !votes.some((v) => v.admin_id === me.id),
    };
  });
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
