import { NextResponse, type NextRequest } from "next/server";
import { runAiPlayer } from "@/lib/ai-player";
import { runSlatePicker } from "@/lib/slate-picker";
import { runRecapPoster } from "@/lib/recap-poster";

// trigger for a scheduled task: curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/ai-player
// posts finished weeks' recaps, then runs the commissioner (tuesdays) and the
// ai player (wednesdays). board page
// loads kick these off too, this just makes them reliable.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const recap = await runRecapPoster().catch((e) => {
      console.error("recap post failed", e);
      return { error: "recap post failed" };
    });
    const slate = await runSlatePicker().catch((e) => {
      console.error("slate picker failed", e);
      return { error: "slate picker failed" };
    });
    return NextResponse.json({ recap, slate, player: await runAiPlayer() });
  } catch (e) {
    console.error("ai player failed", e);
    return NextResponse.json({ error: "ai player failed" }, { status: 500 });
  }
}
