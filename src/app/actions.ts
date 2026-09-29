"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSchedule, toGameRow, type League } from "@/lib/espn";
import { syncScores } from "@/lib/sync";
import { getMe } from "@/lib/data";
import { isLocked } from "@/lib/format";
import type { Side } from "@/lib/types";
import { RESERVED_COLORS, RESERVED_FONTS, isMarkerColor, isMarkerFont } from "@/lib/markers";

async function requireAdmin() {
  const me = await getMe();
  if (!me?.is_admin) throw new Error("admins only");
  return me;
}

// ---------------------------------------------------------------- picks

export async function setPick(gameId: number, side: Side | null) {
  const supabase = await createClient();
  const me = await getMe();
  if (!me) return { error: "you got signed out, refresh and sign back in" };

  // rls blocks late picks for regular players, but admins are allowed to edit
  // anything, so check here too. admin fixes go through adminSetPick instead
  // so they get flagged with an asterisk.
  const { data: game } = await supabase.from("games").select("kickoff, status").eq("id", gameId).single();
  if (!game || isLocked(game)) return { error: "that game already kicked off" };

  const { error } = side
    ? await supabase
        .from("picks")
        .upsert({ user_id: me.id, game_id: gameId, side, edited: false, auto: false, updated_at: new Date().toISOString() })
    : await supabase.from("picks").delete().eq("user_id", me.id).eq("game_id", gameId);
  if (error) return { error: "that game already kicked off" };

  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------- admin fixes
// anything changed here is flagged `edited` and shows with an asterisk

export async function adminSetPick(userId: string, gameId: number, side: Side | null) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = side
    ? await supabase
        .from("picks")
        // an admin fix replaces a coin fill-in, so it's no longer "picked by the coin"
        .upsert({ user_id: userId, game_id: gameId, side, edited: true, auto: false, updated_at: new Date().toISOString() })
    : await supabase.from("picks").delete().eq("user_id", userId).eq("game_id", gameId);
  if (error) return { error: "couldn't save that pick" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminSetAdjustment(userId: string, weekId: number, formData: FormData) {
  await requireAdmin();
  const raw = String(formData.get("points") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  const supabase = await createClient();
  if (raw === "") {
    await supabase.from("score_adjustments").delete().eq("user_id", userId).eq("week_id", weekId);
  } else {
    const points = Math.trunc(Number(raw));
    if (!Number.isFinite(points)) return;
    await supabase
      .from("score_adjustments")
      .upsert(
        { user_id: userId, week_id: weekId, points, note, edited: true },
        { onConflict: "user_id,week_id" },
      );
  }
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- profile

export async function updateName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const me = await getMe();
  if (!me || !name) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ name }).eq("id", me.id);
  revalidatePath("/", "layout");
}

export async function updateMarker(color: string, font: string) {
  if (!pickable(color, font)) return { error: "pick a color and font from the list" };
  const me = await getMe();
  if (!me) return { error: "not signed in" };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ marker_color: color, marker_font: font }).eq("id", me.id);
  if (error) return { error: error.code === "23505" ? "someone just grabbed that color, pick another" : "couldn't save that, try again" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function completeOnboarding(name: string, color: string, font: string) {
  const clean = name.trim().slice(0, 40);
  if (!clean) return { error: "put a name on it" };
  if (!pickable(color, font)) return { error: "pick a color and font from the list" };
  const me = await getMe();
  if (!me) return { error: "not signed in" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ name: clean, marker_color: color, marker_font: font, onboarded: true })
    .eq("id", me.id);
  if (error) return { error: error.code === "23505" ? "someone just grabbed that color, pick another" : "couldn't save that, try again" };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------- admin

// one tap "+ new week": names it one past the highest "week N" so far
export async function createNextWeek() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: weeks } = await supabase.from("weeks").select("label, season");
  // stay in the current season (it runs past new year's for the playoffs)
  const season = weeks?.length ? Math.max(...weeks.map((w) => w.season)) : new Date().getFullYear();
  const nums = (weeks ?? [])
    .filter((w) => w.season === season)
    .map((w) => Number(/(\d+)\s*$/.exec(w.label)?.[1]))
    .filter(Number.isFinite);
  const next = nums.length ? Math.max(...nums) + 1 : 0;
  const { data, error } = await supabase
    .from("weeks")
    .insert({ label: `week ${next}`, season })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/admin?week=${data.id}`);
}

// wraps up the current season (it stays viewable in standings) and starts the
// next one with a fresh week 0
export async function startNewSeason() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: weeks } = await supabase.from("weeks").select("season");
  const current = weeks?.length ? Math.max(...weeks.map((w) => w.season)) : new Date().getFullYear() - 1;
  const { data, error } = await supabase
    .from("weeks")
    .insert({ label: "week 0", season: current + 1 })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect(`/admin?week=${data.id}`);
}

export async function renameWeek(weekId: number, formData: FormData) {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;
  const supabase = await createClient();
  await supabase.from("weeks").update({ label }).eq("id", weekId);
  revalidatePath("/", "layout");
}

export async function deleteWeek(weekId: number) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("weeks").delete().eq("id", weekId);
  redirect("/admin");
}

export async function addGame(weekId: number, league: League, espnId: string, week: number, seasonType: number) {
  await requireAdmin();
  // re-fetch from espn rather than trusting the client with team names etc
  const schedule = await fetchSchedule(league, { week, seasonType });
  const g = schedule.games.find((x) => x.espnId === espnId);
  if (!g) throw new Error("game not found on espn");

  const supabase = await createClient();
  await requireHandPicked(supabase, weekId);
  const { error } = await supabase.from("games").upsert(toGameRow(weekId, g), { onConflict: "week_id,espn_id" });
  if (error) throw error;
  revalidatePath("/", "layout");
}

// only one featured game per week. passing the current one again un-features it.
export async function setFeatured(weekId: number, gameId: number, featured: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await requireHandPicked(supabase, weekId);
  const { error: clearError } = await supabase
    .from("games")
    .update({ featured: false })
    .eq("week_id", weekId)
    .eq("featured", true);
  if (clearError) throw clearError;
  if (featured) {
    const { error } = await supabase.from("games").update({ featured: true }).eq("id", gameId).eq("week_id", weekId);
    if (error) throw error;
  }
  revalidatePath("/", "layout");
}

export async function removeGame(gameId: number) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("games").delete().eq("id", gameId);
  revalidatePath("/", "layout");
}

export async function setMember(uid: string, approved: boolean, isAdmin: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_member", {
    uid,
    make_approved: approved,
    make_admin: isAdmin,
  });
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function refreshScores() {
  await requireAdmin();
  await syncScores({ force: true });
  revalidatePath("/", "layout");
}

// any real marker except the ones saved for the ai player
function pickable(color: unknown, font: unknown) {
  return isMarkerColor(color) && isMarkerFont(font) && !RESERVED_COLORS.includes(color) && !RESERVED_FONTS.includes(font);
}

// weeks the commissioner agent picked are locked: no adding games or moving
// the 2x. removing stays open, but only for broken games (see games-workspace)
async function requireHandPicked(supabase: Awaited<ReturnType<typeof createClient>>, weekId: number) {
  const { data } = await supabase.from("weeks").select("auto_slate").eq("id", weekId).single();
  if (data?.auto_slate) throw new Error("this week's games were picked by the commissioner and are locked");
}
