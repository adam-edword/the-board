import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

// posts any queued one-off bot messages (bot_messages) to discord. "{everyone}"
// in the text becomes a tag for every player with a discord id saved.
export async function runOutbox() {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url || !process.env.SUPABASE_SECRET_KEY) return { skipped: "not configured" };
  const db = createAdminClient();
  const { data: queued } = await db.from("bot_messages").select("id, content").is("sent_at", null).order("id").limit(5);
  if (!queued?.length) return { sent: 0 };

  const { data: people } = await db
    .from("profiles")
    .select("discord_id")
    .eq("approved", true)
    .eq("is_bot", false)
    .eq("is_ai", false)
    .not("discord_id", "is", null);
  const ids = (people ?? []).map((p) => p.discord_id as string);

  let sent = 0;
  for (const m of queued) {
    // claim it first so two runs never double post
    const { data: claimed } = await db
      .from("bot_messages")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", m.id)
      .is("sent_at", null)
      .select("id");
    if (!claimed?.length) continue;
    const tagsAll = m.content.includes("{everyone}");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "the board",
        content: m.content.replaceAll("{everyone}", ids.map((id) => `<@${id}>`).join(" ")),
        allowed_mentions: { users: tagsAll ? ids : [] },
      }),
    });
    if (!res.ok) {
      await db.from("bot_messages").update({ sent_at: null }).eq("id", m.id);
      throw new Error(`discord ${res.status}`);
    }
    sent++;
  }
  return { sent };
}
