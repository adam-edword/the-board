import { NextResponse, type NextRequest } from "next/server";
import { fetchSchedule, type League } from "@/lib/espn";
import { getMe } from "@/lib/data";

// espn schedule for the admin game browser, fetched from the browser so
// flipping weeks doesn't need a full page load
export async function GET(request: NextRequest) {
  const me = await getMe();
  if (!me?.is_admin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  const q = request.nextUrl.searchParams;
  const league: League = q.get("league") === "ncaaf" ? "ncaaf" : "nfl";
  const week = q.get("week") ? Number(q.get("week")) : undefined;
  const seasonType = q.get("st") ? Number(q.get("st")) : undefined;
  try {
    return NextResponse.json(await fetchSchedule(league, { week, seasonType }));
  } catch {
    return NextResponse.json({ error: "couldn't reach espn" }, { status: 502 });
  }
}
