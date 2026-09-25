import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Adjustment, Game, Pick, Profile, Week } from "@/lib/types";
import { seasonStats } from "@/lib/stats";

// everything on a profile except email, which only the admin can read
export const PROFILE_COLUMNS =
  "id, name, avatar_url, is_admin, approved, is_bot, onboarded, marker_color, marker_font, created_at";

export const getMe = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", uid).single();
  if (!data) return null;
  // emails aren't readable from profiles (members can't see each other's), so
  // take your own from your login
  const email = typeof claims?.claims?.email === "string" ? claims.claims.email : null;
  return { ...data, email } as Profile;
});

// weeks sort by their first kickoff (newest first), so a back-filled old week
// doesn't jump ahead of the current one. brand new weeks with no games go on top.
export async function getWeeks() {
  const supabase = await createClient();
  const { data } = await supabase.from("weeks").select("*, games(kickoff)");
  const start = (w: { games: { kickoff: string }[] }) =>
    w.games.length ? Math.min(...w.games.map((g) => new Date(g.kickoff).getTime())) : Infinity;
  return (data ?? [])
    .sort((a, b) => b.season - a.season || start(b) - start(a) || b.id - a.id)
    .map((w) => ({ id: w.id, season: w.season, label: w.label, created_at: w.created_at })) as Week[];
}

// newest first. the current season is the first one.
export async function getSeasons() {
  const weeks = await getWeeks();
  return [...new Set(weeks.map((w) => w.season))];
}

// whoever finished a season on top (ties share it). only for seasons that are
// over, i.e. a newer season has started.
export async function getChampions(season: number) {
  const [{ weeks, games, picks, adjustments }, members] = await Promise.all([getSeasonData(season), getMembers()]);
  const stats = seasonStats(weeks, games, picks, adjustments, members);
  const humans = members.filter((m) => !m.is_bot);
  const best = Math.max(0, ...humans.map((m) => stats.get(m.id)?.points ?? 0));
  return best > 0 ? { points: best, champs: humans.filter((m) => stats.get(m.id)?.points === best) } : null;
}

export async function getMembers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("approved", true)
    .order("name");
  return (data ?? []).map((p) => ({ ...p, email: null })) as Profile[];
}

export async function getWeekData(weekId: number) {
  const supabase = await createClient();
  const [games, picks, status, adjustments] = await Promise.all([
    supabase.from("games").select("*").eq("week_id", weekId).order("kickoff").order("id"),
    supabase.from("picks").select("user_id, game_id, side, updated_at, edited, auto, games!inner(week_id)").eq("games.week_id", weekId),
    supabase.rpc("pick_status", { wid: weekId }),
    supabase.from("score_adjustments").select("user_id, week_id, points, correct, decided, edited, cfb_points, nfl_points, from_coin").eq("week_id", weekId),
  ]);
  return {
    games: (games.data ?? []) as Game[],
    // only includes other people's picks for games that have kicked off (rls)
    picks: (picks.data ?? []).map(({ user_id, game_id, side, updated_at, edited, auto }) => ({
      user_id,
      game_id,
      side,
      updated_at,
      edited,
      auto,
    })) as Pick[],
    // who has picked what game, sides hidden
    picked: (status.data ?? []) as { user_id: string; game_id: number }[],
    adjustments: (adjustments.data ?? []) as Adjustment[],
  };
}

/** every visible pick + game for a season, for standings */
export async function getSeasonData(season: number) {
  const supabase = await createClient();
  const weeks = (await getWeeks()).filter((w) => w.season === season).reverse();
  const ids = weeks.map((w) => w.id);
  if (!ids.length) return { weeks: [] as Week[], games: [] as Game[], picks: [] as Pick[], adjustments: [] as Adjustment[] };
  const [{ data: games }, { data: adjustments }] = await Promise.all([
    supabase.from("games").select("*").in("week_id", ids),
    supabase.from("score_adjustments").select("user_id, week_id, points, correct, decided, edited, cfb_points, nfl_points, from_coin").in("week_id", ids),
  ]);

  // supabase caps a single response at 1000 rows, so page through a full season
  const picks: Pick[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("picks")
      .select("user_id, game_id, side, edited, auto, games!inner(week_id)")
      .in("games.week_id", ids)
      .order("game_id")
      .order("user_id")
      .range(from, from + PAGE - 1);
    const rows = data ?? [];
    picks.push(...rows.map(({ user_id, game_id, side, edited, auto }) => ({ user_id, game_id, side, edited, auto }) as Pick));
    if (rows.length < PAGE) break;
  }

  return { weeks, games: (games ?? []) as Game[], picks, adjustments: (adjustments ?? []) as Adjustment[] };
}
