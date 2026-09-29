import { NextResponse, type NextRequest } from "next/server";
import { runAiPlayer } from "@/lib/ai-player";

// optional trigger for a scheduled task: curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/ai-player
// board page loads already kick it off, this just makes wednesdays reliable.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runAiPlayer());
  } catch (e) {
    console.error("ai player failed", e);
    return NextResponse.json({ error: "ai player failed" }, { status: 500 });
  }
}
