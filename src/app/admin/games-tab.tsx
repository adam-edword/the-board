import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSchedule, type League } from "@/lib/espn";
import { kickoffLabel } from "@/lib/format";
import type { Game } from "@/lib/types";
import { removeGame, setFeatured } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamLogo } from "@/components/team-logo";
import { AddGameButton } from "./add-game-button";

// ------------------------------------------------------------ games tab

export async function GamesTab({ weekId, label, games, sp, href }: {
  weekId: number;
  label: string;
  games: Game[];
  sp: Record<string, string | string[] | undefined>;
  href: (over: Record<string, string | number | undefined>) => string;
}) {
  const league: League = sp.league === "ncaaf" ? "ncaaf" : "nfl";
  const top25 = sp.top25 === "1";
  const schedule = await fetchSchedule(league, {
    week: sp.ew ? Number(sp.ew) : undefined,
    seasonType: sp.st ? Number(sp.st) : undefined,
  }).catch(() => null);

  const added = new Set(games.map((g) => g.espn_id));
  let browse = schedule?.games ?? [];
  if (league === "ncaaf" && top25) browse = browse.filter((g) => g.homeRank || g.awayRank);
  if (league === "ncaaf") {
    // better-ranked team first, then the other team's rank, then kickoff. unranked last
    const key = (g: (typeof browse)[number]) => [g.homeRank ?? 99, g.awayRank ?? 99].sort((x, y) => x - y);
    browse = [...browse].sort((x, y) => {
      const [xa, xb] = key(x);
      const [ya, yb] = key(y);
      return xa - ya || xb - yb || x.kickoff.localeCompare(y.kickoff);
    });
  }
  const b = (over: Record<string, string | number | undefined>) =>
    href({ league, ew: schedule?.week, st: schedule?.seasonType, top25: top25 ? 1 : undefined, ...over });

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* ---------------- this week's slate */}
      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>
            {label} <span className="text-muted-foreground">· {games.length} games</span>
          </CardTitle>
          <CardDescription>star one as the featured game (worth 2 pts).</CardDescription>
        </CardHeader>
        <CardContent>
          {games.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              no games yet. add some from espn →
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {games.map((g) => (
                <li key={g.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <TeamLogo src={g.away_logo} size={18} />
                      {g.away_abbr}
                      <span className="text-muted-foreground">@</span>
                      <TeamLogo src={g.home_logo} size={18} />
                      {g.home_abbr}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {g.league === "nfl" ? "nfl" : "college"} · {kickoffLabel(g.kickoff)}
                    </div>
                  </div>
                  <form action={setFeatured.bind(null, weekId, g.id, !g.featured)}>
                    <Button
                      type="submit"
                      size="icon-sm"
                      variant={g.featured ? "secondary" : "ghost"}
                      aria-label={g.featured ? "unfeature" : "make featured"}
                      className={g.featured ? "text-live" : "text-muted-foreground"}
                    >
                      <StarIcon className={g.featured ? "fill-current" : ""} />
                    </Button>
                  </form>
                  <form action={removeGame.bind(null, g.id)}>
                    <Button type="submit" size="icon-sm" variant="ghost" aria-label="remove game">
                      <XIcon />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---------------- espn browser */}
      <Card>
        <CardHeader>
          <CardTitle>add games from espn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-muted p-0.5">
              {(["nfl", "ncaaf"] as const).map((l) => (
                <Link
                  key={l}
                  href={b({ league: l, ew: undefined, st: undefined })}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm",
                    league === l ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {l === "nfl" ? "nfl" : "college"}
                </Link>
              ))}
            </div>
            {schedule && (
              <div className="flex items-center gap-1 text-sm">
                <Button asChild size="icon-sm" variant="ghost" aria-label="previous week">
                  <Link href={b({ ew: Math.max(1, schedule.week - 1) })}>
                    <ChevronLeftIcon />
                  </Link>
                </Button>
                <span className="min-w-20 text-center tabular-nums">
                  {schedule.seasonType === 3 ? "playoffs " : "espn "}wk {schedule.week}
                </span>
                <Button asChild size="icon-sm" variant="ghost" aria-label="next week">
                  <Link href={b({ ew: schedule.week + 1 })}>
                    <ChevronRightIcon />
                  </Link>
                </Button>
              </div>
            )}
            <div className="ml-auto flex gap-1">
              {league === "ncaaf" && (
                <Button asChild size="sm" variant={top25 ? "secondary" : "ghost"}>
                  <Link href={b({ top25: top25 ? undefined : 1 })}>top 25</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
                <Link href={b({ st: schedule?.seasonType === 3 ? 2 : 3, ew: 1 })}>
                  {schedule?.seasonType === 3 ? "regular season" : "playoffs"}
                </Link>
              </Button>
            </div>
          </div>

          {!schedule && <p className="text-sm text-destructive">couldn&apos;t reach espn, try again in a sec.</p>}
          {schedule && browse.length === 0 && <p className="text-sm text-muted-foreground">no games that week.</p>}

          {browse.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {browse.map((g) => (
                <li key={g.espnId} className={cn("flex items-center gap-3 px-3 py-2 text-sm", added.has(g.espnId) && "bg-muted/40")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <TeamLogo src={g.awayLogo} size={20} />
                      <span className="truncate">
                        {g.awayRank && <span className="text-xs text-muted-foreground">#{g.awayRank} </span>}
                        {g.awayName}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <TeamLogo src={g.homeLogo} size={20} />
                      <span className="truncate">
                        <span className="text-muted-foreground">@ </span>
                        {g.homeRank && <span className="text-xs text-muted-foreground">#{g.homeRank} </span>}
                        {g.homeName}
                      </span>
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                    {kickoffLabel(g.kickoff)}
                    {g.network && <span className="block">{g.network}</span>}
                  </span>
                  <AddGameButton
                    added={added.has(g.espnId)}
                    args={[weekId, league, g.espnId, schedule!.week, schedule!.seasonType]}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

