import { NextResponse, type NextRequest } from "next/server";
import { syncScores } from "@/lib/sync";

// hit by the daily vercel cron (see vercel.json) to catch kickoff time changes.
// live scores are also pulled whenever someone opens the board.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await syncScores({ force: true }));
}
