import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, RefreshCwIcon, StarIcon, TrashIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSchedule, type League } from "@/lib/espn";
import { getMe, getWeekData, getWeeks } from "@/lib/data";
import { kickoffLabel } from "@/lib/format";
import { TeamLogo } from "@/components/team-logo";
import { WeekPicker } from "@/components/week-picker";
import type { Profile } from "@/lib/types";
import { createWeek, deleteWeek, refreshScores, removeGame, renameWeek, setFeatured, setMember } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { AddGameButton } from "./add-game-button";

export default async function AdminPage(props: PageProps<"/admin">) {
  const me = await getMe();
  if (!me?.is_admin) redirect("/");

  const sp = await props.searchParams;
  const weeks = await getWeeks();
  const week = weeks.find((w) => String(w.id) === sp.week) ?? weeks[0];

  const league: League = sp.league === "ncaaf" ? "ncaaf" : "nfl";
  const espnWeek = sp.ew ? Number(sp.ew) : undefined;
  const seasonType = sp.st ? Number(sp.st) : undefined;
  const top25 = sp.top25 === "1";

  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("*").order("created_at");

  const [weekData, schedule] = await Promise.all([
    week ? getWeekData(week.id) : null,
    week ? fetchSchedule(league, { week: espnWeek, seasonType }).catch(() => null) : null,
  ]);
  const added = new Set(weekData?.games.map((g) => g.espn_id));
  let browse = schedule?.games ?? [];
  if (top25) browse = browse.filter((g) => g.homeRank || g.awayRank);
  if (league === "ncaaf") {
    // sort by the better-ranked team, then the other team's rank, then kickoff. unranked go last
    const key = (g: (typeof browse)[number]) => {
      const [a, b] = [g.homeRank ?? 99, g.awayRank ?? 99].sort((x, y) => x - y);
      return [a, b];
    };
    browse = [...browse].sort((x, y) => {
      const [xa, xb] = key(x);
      const [ya, yb] = key(y);
      return xa - ya || xb - yb || x.kickoff.localeCompare(y.kickoff);
    });
  }

  const q = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { week: week?.id, league, ew: schedule?.week, st: schedule?.seasonType, top25: top25 ? 1 : undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined) p.set(k, String(v));
    return `/admin?${p}`;
  };

  const thisYear = new Date().getFullYear();

  const chip = (active: boolean) => (active ? "secondary" : "ghost") as "secondary" | "ghost";

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">admin</h1>

      {/* ------------------------------------------------ weeks */}
      <Card>
        <CardHeader>
          <CardTitle>weeks</CardTitle>
          <CardDescription>make a new week, then add games to it below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createWeek} className="flex flex-wrap gap-2">
            <Input name="label" defaultValue={`week ${weeks.length + 1}`} className="min-w-32 flex-1" aria-label="week name" />
            <Input name="season" type="number" defaultValue={week?.season ?? thisYear} className="w-24" aria-label="season" />
            <Button type="submit">
              <PlusIcon /> new week
            </Button>
          </form>

          {week && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center gap-2">
                <WeekPicker weeks={weeks} current={week.id} basePath="/admin" />
                <form action={renameWeek.bind(null, week.id)} className="flex gap-2">
                  <Input name="label" defaultValue={week.label} className="w-32" aria-label="rename week" />
                  <Button type="submit" variant="outline">rename</Button>
                </form>
                <form action={refreshScores}>
                  <Button type="submit" variant="outline">
                    <RefreshCwIcon /> refresh scores
                  </Button>
                </form>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {week && weekData && (
        <>
          {/* ------------------------------------------------ games in this week */}
          <Card>
            <CardHeader>
              <CardTitle>
                games in {week.label} <span className="text-muted-foreground">({weekData.games.length})</span>
              </CardTitle>
              <CardDescription>star one as the featured game, it&apos;s worth 2 points.</CardDescription>
            </CardHeader>
            <CardContent>
              {weekData.games.length === 0 ? (
                <p className="text-sm text-muted-foreground">none yet, add some below.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {weekData.games.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Badge variant="outline" className="w-12 justify-center uppercase">
                        {g.league === "nfl" ? "nfl" : "cfb"}
                      </Badge>
                      <span className="flex-1">
                        {g.featured && <StarIcon className="mr-1.5 inline size-3.5 fill-live text-live" />}
                        {g.away_abbr} @ {g.home_abbr}
                        <span className="ml-2 text-xs text-muted-foreground">{kickoffLabel(g.kickoff)}</span>
                      </span>
                      <form action={setFeatured.bind(null, week.id, g.id, !g.featured)}>
                        <Button
                          type="submit"
                          variant={g.featured ? "secondary" : "ghost"}
                          size="sm"
                          className={g.featured ? "text-live" : "text-muted-foreground"}
                        >
                          <StarIcon className={g.featured ? "fill-current" : ""} />
                          {g.featured ? "featured" : "feature"}
                        </Button>
                      </form>
                      <form action={removeGame.bind(null, g.id)}>
                        <Button type="submit" variant="ghost" size="icon-sm" aria-label="remove game">
                          <XIcon />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* ------------------------------------------------ browse espn */}
          <Card>
            <CardHeader>
              <CardTitle>add games</CardTitle>
              <CardDescription>straight from espn. college is sorted by ranking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(["nfl", "ncaaf"] as const).map((l) => (
                  <Button key={l} asChild size="sm" variant={chip(league === l)}>
                    <Link href={q({ league: l, ew: undefined, st: undefined })}>{l === "nfl" ? "nfl" : "college"}</Link>
                  </Button>
                ))}
                <Separator orientation="vertical" className="mx-1 h-5" />
                {schedule && (
                  <span className="flex items-center gap-1 text-sm">
                    <Button asChild size="icon-sm" variant="outline" aria-label="previous week">
                      <Link href={q({ ew: Math.max(1, schedule.week - 1) })}>
                        <ChevronLeftIcon />
                      </Link>
                    </Button>
                    <span className="px-1 tabular-nums">
                      {schedule.seasonType === 3 ? "post " : ""}wk {schedule.week}
                    </span>
                    <Button asChild size="icon-sm" variant="outline" aria-label="next week">
                      <Link href={q({ ew: schedule.week + 1 })}>
                        <ChevronRightIcon />
                      </Link>
                    </Button>
                  </span>
                )}
                <Button asChild size="sm" variant="ghost">
                  <Link href={q({ st: schedule?.seasonType === 3 ? 2 : 3, ew: 1 })}>
                    {schedule?.seasonType === 3 ? "regular season" : "postseason"}
                  </Link>
                </Button>
                {league === "ncaaf" && (
                  <Button asChild size="sm" variant={chip(top25)}>
                    <Link href={q({ top25: top25 ? undefined : 1 })}>top 25 only</Link>
                  </Button>
                )}
              </div>

              {!schedule && <p className="text-sm text-destructive">couldn&apos;t reach espn, try again in a sec.</p>}
              {schedule && browse.length === 0 && <p className="text-sm text-muted-foreground">no games found for that week.</p>}

              {browse.length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {browse.map((g) => (
                    <li key={g.espnId} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <TeamLogo src={g.awayLogo} size={22} />
                        <span className="truncate">
                          {g.awayRank && <span className="text-xs text-muted-foreground">#{g.awayRank} </span>}
                          {g.awayName}
                          <span className="text-muted-foreground"> @ </span>
                          {g.homeRank && <span className="text-xs text-muted-foreground">#{g.homeRank} </span>}
                          {g.homeName}
                        </span>
                        <TeamLogo src={g.homeLogo} size={22} />
                      </div>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {kickoffLabel(g.kickoff)}
                        {g.network && ` · ${g.network}`}
                      </span>
                      <AddGameButton
                        added={added.has(g.espnId)}
                        args={[week.id, league, g.espnId, schedule!.week, schedule!.seasonType]}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ------------------------------------------------ members */}
      <Card>
        <CardHeader>
          <CardTitle>people</CardTitle>
          <CardDescription>
            add them as a google test user first, then approve them here once they&apos;ve signed in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {((people ?? []) as Profile[]).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-40 flex-1">
                  {p.name}
                  <span className="block text-xs text-muted-foreground">{p.email}</span>
                </span>
                {!p.approved && <Badge className="bg-live/15 text-live">waiting</Badge>}
                {p.is_admin && <Badge variant="secondary">admin</Badge>}
                {p.id !== me.id && (
                  <>
                    <form action={setMember.bind(null, p.id, !p.approved, p.approved ? false : p.is_admin)}>
                      <Button type="submit" size="sm" variant={p.approved ? "destructive" : "default"}>
                        {p.approved ? "remove" : "approve"}
                      </Button>
                    </form>
                    {p.approved && (
                      <form action={setMember.bind(null, p.id, true, !p.is_admin)}>
                        <Button type="submit" size="sm" variant="outline">
                          {p.is_admin ? "unmake admin" : "make admin"}
                        </Button>
                      </form>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {week && (
        <form action={deleteWeek.bind(null, week.id)}>
          <ConfirmButton message={`delete ${week.label} and everyone's picks for it? can't undo this.`}>
            <TrashIcon /> delete {week.label}
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
