import { NextResponse, type NextRequest } from "next/server";
import { runAiPlayer } from "@/lib/ai-player";
import { runSlatePicker } from "@/lib/slate-picker";

// trigger for a scheduled task: curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/ai-player
// runs the commissioner (tuesdays) then the ai player (wednesdays). board page
// loads kick these off too, this just makes them reliable.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const slate = await runSlatePicker().catch((e) => {
      console.error("slate picker failed", e);
      return { error: "slate picker failed" };
    });
    return NextResponse.json({ slate, player: await runAiPlayer() });
  } catch (e) {
    console.error("ai player failed", e);
    return NextResponse.json({ error: "ai player failed" }, { status: 500 });
  }
}
