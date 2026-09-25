import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { sendNotifications } from "@/lib/notify";
import { syncScores } from "@/lib/sync";

// hit every 15 minutes by a coolify scheduled task:
//   wget -qO- --header="Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron
// syncs scores first so reports see the final results, then posts whatever
// discord reminders / weekly reports are due. safe to call as often as you like.
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let sync;
  try {
    sync = await syncScores();
  } catch (e) {
    // still send reminders if espn is down
    console.error("score sync failed", e);
    sync = { error: String(e) };
  }
  return NextResponse.json({ sync, notify: await sendNotifications() });
}
