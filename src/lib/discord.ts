import "server-only";

// posts one embed to the group's discord channel (DISCORD_WEBHOOK_URL).
// does nothing when it isn't set. throws on a failed post, so callers decide
// whether that matters.
export async function postToDiscord(msg: { username: string; title: string; description: string; color?: number }) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const site = process.env.SITE_URL?.replace(/\/$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: msg.username,
      allowed_mentions: { parse: [] },
      embeds: [{ title: msg.title, url: site || undefined, description: msg.description.slice(0, 4000), color: msg.color ?? 0xd97757 }],
    }),
  });
  if (!res.ok) throw new Error(`discord ${res.status}`);
}
