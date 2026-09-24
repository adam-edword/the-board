import { NextResponse, type NextRequest } from "next/server";
import { syncScores } from "@/lib/sync";

// optional manual trigger: curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/sync
// not required, scores already sync whenever someone opens the board.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await syncScores({ force: true }));
}
