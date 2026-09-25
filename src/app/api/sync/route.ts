import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { syncScores } from "@/lib/sync";

// optional manual trigger: curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/sync
// not required, scores already sync whenever someone opens the board.
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await syncScores({ force: true }));
}
