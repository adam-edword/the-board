import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Game, Pick, Profile, Week } from "@/lib/types";

export const getMe = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
  return (data as Profile) ?? null;
});

export async function getWeeks() {
  const supabase = await createClient();
  const { data } = await supabase.from("weeks").select("*").order("id", { ascending: false });
  return (data ?? []) as Week[];
}

export async function getMembers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("approved", true)
    .order("name");
  return (data ?? []) as Profile[];
}

export async function getWeekData(weekId: number) {
  const supabase = await createClient();
  const [games, picks, status] = await Promise.all([
    supabase.from("games").select("*").eq("week_id", weekId).order("kickoff").order("id"),
    supabase.from("picks").select("user_id, game_id, side, games!inner(week_id)").eq("games.week_id", weekId),
    supabase.rpc("pick_status", { wid: weekId }),
  ]);
  return {
    games: (games.data ?? []) as Game[],
    // only includes other people's picks for games that have kicked off (rls)
    picks: (picks.data ?? []).map(({ user_id, game_id, side }) => ({ user_id, game_id, side })) as Pick[],
    // who has picked what game, sides hidden
    picked: (status.data ?? []) as { user_id: string; game_id: number }[],
  };
}

/** every visible pick + game for a season, for standings */
export async function getSeasonData(season: number) {
  const supabase = await createClient();
  const { data: weeks } = await supabase.from("weeks").select("*").eq("season", season).order("id");
  const ids = (weeks ?? []).map((w) => w.id);
  if (!ids.length) return { weeks: [] as Week[], games: [] as Game[], picks: [] as Pick[] };
  const { data: games } = await supabase.from("games").select("*").in("week_id", ids);

  // supabase caps a single response at 1000 rows, so page through a full season
  const picks: Pick[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("picks")
      .select("user_id, game_id, side, games!inner(week_id)")
      .in("games.week_id", ids)
      .order("game_id")
      .order("user_id")
      .range(from, from + PAGE - 1);
    const rows = data ?? [];
    picks.push(...rows.map(({ user_id, game_id, side }) => ({ user_id, game_id, side }) as Pick));
    if (rows.length < PAGE) break;
  }

  return { weeks: (weeks ?? []) as Week[], games: (games ?? []) as Game[], picks };
}

export function scorePicks(games: Game[], picks: Pick[]) {
  const byId = new Map(games.map((g) => [g.id, g]));
  const totals = new Map<string, { correct: number; decided: number }>();
  for (const p of picks) {
    const g = byId.get(p.game_id);
    if (!g || g.status !== "post" || !g.winner) continue;
    const t = totals.get(p.user_id) ?? { correct: 0, decided: 0 };
    t.decided++;
    if (g.winner === p.side) t.correct++;
    totals.set(p.user_id, t);
  }
  return totals;
}
