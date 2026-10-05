import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { computeRecap } from "@/lib/recap";
import { renderRecapPng } from "@/lib/recap-image";
import type { Adjustment, Game, Pick, Profile } from "@/lib/types";
import { PROFILE_COLUMNS } from "@/lib/data";

// posts a week's recap card to discord once every game is final. each week
// posts once (weeks.recap_posted_at), and only within a few days of its last
// game so an old week never posts out of nowhere.
const FRESH_MS = 4 * 86_400_000;

export async function runRecapPoster() {
  if (!process.env.DISCORD_WEBHOOK_URL || !process.env.SUPABASE_SECRET_KEY) return { skipped: "not configured" };
  const db = createAdminClient();
  const { data: weeks } = await db.from("weeks").select("id, label, games(kickoff, status)").is("recap_posted_at", null);
  const now = Date.now();
  const ready = (weeks ?? []).filter((w) => {
    const games = w.games as { kickoff: string; status: string }[];
    if (!games.length || !games.every((g) => g.status === "post" || g.status === "void")) return false;
    const last = Math.max(...games.map((g) => new Date(g.kickoff).getTime()));
    return now - last < FRESH_MS;
  });

  let posted = 0;
  for (const w of ready) {
    // claim it so two runs never double post
    const { data: claimed } = await db
      .from("weeks")
      .update({ recap_posted_at: new Date().toISOString() })
      .eq("id", w.id)
      .is("recap_posted_at", null)
      .select("id");
    if (!claimed?.length) continue;
    try {
      const png = await recapPng(w.id, w.label);
      if (png) await post(w.label, png);
      posted++;
    } catch (e) {
      // let it try again on a later run
      await db.from("weeks").update({ recap_posted_at: null }).eq("id", w.id);
      throw e;
    }
  }
  return { posted };
}

export async function recapPng(weekId: number, label: string) {
  const db = createAdminClient();
  const [{ data: games }, { data: picks }, { data: adjustments }, { data: members }] = await Promise.all([
    db.from("games").select("*").eq("week_id", weekId),
    db.from("picks").select("user_id, game_id, side, games!inner(week_id)").eq("games.week_id", weekId),
    db.from("score_adjustments").select("user_id, week_id, points").eq("week_id", weekId),
    db.from("profiles").select(PROFILE_COLUMNS).eq("approved", true),
  ]);
  const recap = computeRecap(
    (games ?? []) as Game[],
    (picks ?? []).map(({ user_id, game_id, side }) => ({ user_id, game_id, side })) as Pick[],
    (adjustments ?? []) as Adjustment[],
    (members ?? []) as Profile[],
  );
  return recap ? renderRecapPng(label, recap) : null;
}

async function post(label: string, png: Buffer) {
  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify({
      username: "the board",
      allowed_mentions: { parse: [] },
      content: `${label} is in the books.`,
      attachments: [{ id: 0, filename: "recap.png" }],
    }),
  );
  form.append("files[0]", new Blob([new Uint8Array(png)], { type: "image/png" }), "recap.png");
  const res = await fetch(process.env.DISCORD_WEBHOOK_URL!, { method: "POST", body: form });
  if (!res.ok) throw new Error(`discord ${res.status}`);
}
