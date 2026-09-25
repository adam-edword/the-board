"use client";

import { useCallback, useEffect, useOptimistic, useState, useTransition } from "react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon, PlusIcon, StarIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { addGame, removeGame, setFeatured } from "@/app/actions";
import { cn } from "@/lib/utils";
import { kickoffLabel } from "@/lib/format";
import type { EspnGame, League, Schedule } from "@/lib/espn";
import type { Game } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamLogo } from "@/components/team-logo";

// ---------------------------------------------------------------- slate state
// every change shows up instantly (optimistic) and saves in the background.
// if a save fails, the change rolls back and a toast says so.

type Change =
  | { type: "add"; game: Game }
  | { type: "remove"; id: number }
  | { type: "feature"; id: number; on: boolean };

function applyChange(games: Game[], c: Change): Game[] {
  if (c.type === "add") return games.some((g) => g.espn_id === c.game.espn_id) ? games : [...games, c.game];
  if (c.type === "remove") return games.filter((g) => g.id !== c.id);
  return games.map((g) => ({ ...g, featured: c.on ? g.id === c.id : g.id === c.id ? false : g.featured }));
}

// placeholder row for a game that's still saving
function draftGame(weekId: number, league: League, e: EspnGame): Game {
  return {
    id: -Number(e.espnId),
    week_id: weekId,
    league,
    espn_id: e.espnId,
    kickoff: e.kickoff,
    home_name: e.homeName,
    home_abbr: e.homeAbbr,
    home_logo: e.homeLogo,
    home_rank: e.homeRank,
    away_name: e.awayName,
    away_abbr: e.awayAbbr,
    away_logo: e.awayLogo,
    away_rank: e.awayRank,
    home_score: e.homeScore,
    away_score: e.awayScore,
    status: e.status,
    status_detail: e.statusDetail,
    winner: e.winner,
    featured: false,
  };
}

export function GamesWorkspace({ weekId, label, games: serverGames }: { weekId: number; label: string; games: Game[] }) {
  const [games, change] = useOptimistic(serverGames, applyChange);
  const [, startTransition] = useTransition();
  const sorted = [...games].sort((a, b) => a.kickoff.localeCompare(b.kickoff) || a.id - b.id);

  function run(c: Change, save: () => Promise<unknown>, failMsg: string) {
    startTransition(async () => {
      change(c);
      try {
        await save();
      } catch {
        toast.error(failMsg);
      }
    });
  }

  const add = (league: League, e: EspnGame, schedule: Schedule) =>
    run(
      { type: "add", game: draftGame(weekId, league, e) },
      () => addGame(weekId, league, e.espnId, schedule.week, schedule.seasonType),
      `couldn't add ${e.awayAbbr} @ ${e.homeAbbr}`,
    );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>
            {label} <span className="text-muted-foreground">· {games.length} games</span>
          </CardTitle>
          <CardDescription>star one as the featured game (worth 2 pts).</CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              no games yet. add some from espn →
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {sorted.map((g) => {
                const saving = g.id < 0;
                return (
                  <li key={g.espn_id} className={cn("flex items-center gap-2 px-3 py-2 text-sm", saving && "opacity-60")}>
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
                    <Button
                      size="icon-sm"
                      variant={g.featured ? "secondary" : "ghost"}
                      aria-label={g.featured ? "unfeature" : "make featured"}
                      className={g.featured ? "text-live" : "text-muted-foreground"}
                      disabled={saving}
                      onClick={() =>
                        run(
                          { type: "feature", id: g.id, on: !g.featured },
                          () => setFeatured(weekId, g.id, !g.featured),
                          "couldn't change the featured game",
                        )
                      }
                    >
                      <StarIcon className={g.featured ? "fill-current" : ""} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="remove game"
                      disabled={saving}
                      onClick={() =>
                        run({ type: "remove", id: g.id }, () => removeGame(g.id), `couldn't remove ${g.away_abbr} @ ${g.home_abbr}`)
                      }
                    >
                      <XIcon />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <EspnBrowser added={new Set(games.map((g) => g.espn_id))} onAdd={add} />
    </div>
  );
}

// ---------------------------------------------------------------- espn browser
// schedules load in the browser and are cached per week, and the weeks on
// either side get preloaded, so flipping around is instant after the first load.

const cache = new Map<string, Promise<Schedule>>();

function loadSchedule(league: League, week?: number, st?: number): Promise<Schedule> {
  const key = `${league}|${week ?? ""}|${st ?? ""}`;
  let p = cache.get(key);
  if (!p) {
    const q = new URLSearchParams({ league });
    if (week) q.set("week", String(week));
    if (st) q.set("st", String(st));
    p = fetch(`/api/schedule?${q}`).then(async (r) => {
      if (!r.ok) throw new Error("espn");
      const s = (await r.json()) as Schedule;
      cache.set(`${league}|${s.week}|${s.seasonType}`, Promise.resolve(s));
      return s;
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

function EspnBrowser({ added, onAdd }: {
  added: Set<string>;
  onAdd: (league: League, g: EspnGame, schedule: Schedule) => void;
}) {
  const [league, setLeague] = useState<League>("nfl");
  const [target, setTarget] = useState<{ week?: number; st?: number }>({});
  const [top25, setTop25] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const go = useCallback((l: League, week?: number, st?: number) => {
    setLoading(true);
    setError(false);
    setLeague(l);
    setTarget({ week, st });
  }, []);

  useEffect(() => {
    let live = true;
    loadSchedule(league, target.week, target.st)
      .then((s) => {
        if (!live) return;
        setSchedule(s);
        setLoading(false);
        // warm up the neighbors so the arrows are instant
        if (s.week > 1) loadSchedule(league, s.week - 1, s.seasonType).catch(() => {});
        loadSchedule(league, s.week + 1, s.seasonType).catch(() => {});
      })
      .catch(() => {
        if (!live) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [league, target]);

  // preload the other league too
  useEffect(() => {
    loadSchedule(league === "nfl" ? "ncaaf" : "nfl").catch(() => {});
  }, [league]);

  const shown = schedule?.games ?? [];
  let browse = league === "ncaaf" && top25 ? shown.filter((g) => g.homeRank || g.awayRank) : shown;
  if (league === "ncaaf") {
    // better-ranked team first, then the other team's rank, then kickoff. unranked last
    const key = (g: EspnGame) => [g.homeRank ?? 99, g.awayRank ?? 99].sort((x, y) => x - y);
    browse = [...browse].sort((x, y) => {
      const [xa, xb] = key(x);
      const [ya, yb] = key(y);
      return xa - ya || xb - yb || x.kickoff.localeCompare(y.kickoff);
    });
  }
  // the schedule shown can lag the league toggle for a beat while loading
  const stale = loading || (schedule !== null && schedule.games[0] && schedule.games[0].league !== league);

  return (
    <Card>
      <CardHeader>
        <CardTitle>add games from espn</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-muted p-0.5">
            {(["nfl", "ncaaf"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => go(l)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm",
                  league === l ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
                )}
              >
                {l === "nfl" ? "nfl" : "college"}
              </button>
            ))}
          </div>
          {schedule && (
            <div className="flex items-center gap-1 text-sm">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="previous week"
                onClick={() => go(league, Math.max(1, schedule.week - 1), schedule.seasonType)}
              >
                <ChevronLeftIcon />
              </Button>
              <span className="min-w-20 text-center tabular-nums">
                {schedule.seasonType === 3 ? "playoffs " : "espn "}wk {schedule.week}
              </span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="next week"
                onClick={() => go(league, schedule.week + 1, schedule.seasonType)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          )}
          {loading && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
          <div className="ml-auto flex gap-1">
            {league === "ncaaf" && (
              <Button size="sm" variant={top25 ? "secondary" : "ghost"} onClick={() => setTop25((v) => !v)}>
                top 25
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => go(league, 1, schedule?.seasonType === 3 ? 2 : 3)}
            >
              {schedule?.seasonType === 3 ? "regular season" : "playoffs"}
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">couldn&apos;t reach espn, try again in a sec.</p>}
        {!error && !loading && browse.length === 0 && <p className="text-sm text-muted-foreground">no games that week.</p>}

        {browse.length > 0 && (
          <ul className={cn("divide-y rounded-lg border transition-opacity", stale && "opacity-50")}>
            {browse.map((g) => {
              const isAdded = added.has(g.espnId);
              return (
                <li key={g.espnId} className={cn("flex items-center gap-3 px-3 py-2 text-sm", isAdded && "bg-muted/40")}>
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
                  {isAdded ? (
                    <Button size="sm" variant="ghost" disabled className="w-16 text-win">
                      <CheckIcon /> added
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-16"
                      disabled={stale || !schedule}
                      onClick={() => schedule && onAdd(league, g, schedule)}
                    >
                      <PlusIcon /> add
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
