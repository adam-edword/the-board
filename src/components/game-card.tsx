"use client";

import { useOptimistic, useTransition } from "react";
import { CheckIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";
import { setPick } from "@/app/actions";
import { cn } from "@/lib/utils";
import { isLocked, kickoffLabel } from "@/lib/format";
import type { Game, Side } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TeamLogo } from "./team-logo";

type Props = {
  game: Game;
  mySide: Side | null;
  // names of who took each side, only filled in once the game has kicked off
  pickers: { home: string[]; away: string[] } | null;
};

export function GameCard({ game, mySide, pickers }: Props) {
  const [side, setOptimisticSide] = useOptimistic(mySide);
  const [pending, startTransition] = useTransition();
  const locked = isLocked(game);

  function choose(next: Side) {
    if (isLocked(game)) return void toast.error("that game already kicked off");
    const value = side === next ? null : next; // tap your pick again to clear it
    startTransition(async () => {
      setOptimisticSide(value);
      const res = await setPick(game.id, value);
      if (res?.error) toast.error(res.error);
    });
  }

  const final = game.status === "post";
  const live = game.status === "in";
  const result = final && side ? (game.winner === side ? "win" : "loss") : null;

  return (
    <Card
      size="sm"
      className={cn(
        "gap-3 px-3 transition-colors",
        result === "win" && "bg-win/5 ring-win/40",
        result === "loss" && "bg-loss/5 ring-loss/30",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="uppercase">
          {game.league === "nfl" ? "nfl" : "college"}
        </Badge>
        <span className="flex items-center gap-2">
          {live && <span className="size-1.5 animate-pulse rounded-full bg-live" />}
          <span className={cn(live && "font-medium text-live")}>
            {game.status === "pre" ? kickoffLabel(game.kickoff) : (game.status_detail ?? "").toLowerCase()}
          </span>
          {!locked && !side && <Badge className="bg-live/15 text-live">needs a pick</Badge>}
          {locked && game.status === "pre" && <LockIcon className="size-3" />}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["away", "home"] as const).map((s) => {
          const chosen = side === s;
          const won = final && game.winner === s;
          const names = pickers?.[s] ?? [];
          const team = {
            name: s === "home" ? game.home_name : game.away_name,
            logo: s === "home" ? game.home_logo : game.away_logo,
            rank: s === "home" ? game.home_rank : game.away_rank,
            score: s === "home" ? game.home_score : game.away_score,
          };
          return (
            <button
              key={s}
              onClick={() => choose(s)}
              disabled={locked || pending}
              aria-pressed={chosen}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-3 text-center outline-none transition-all",
                "focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:active:scale-100",
                !locked && !chosen && "hover:bg-muted/60",
                chosen && "border-primary bg-primary text-primary-foreground",
                locked && !chosen && "opacity-60",
              )}
            >
              {chosen && (
                <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-primary-foreground text-primary">
                  <CheckIcon className="size-3" strokeWidth={3} />
                </span>
              )}
              <TeamLogo src={team.logo} size={36} />
              <span className="text-sm leading-tight font-semibold">
                {team.rank && <span className="mr-1 text-xs font-normal opacity-60">#{team.rank}</span>}
                {team.name}
              </span>
              <span className="text-[11px] opacity-60">{s}</span>
              {game.status !== "pre" && game.status !== "void" && (
                <span className={cn("font-mono text-2xl font-bold tabular-nums", final && !won && "opacity-40")}>
                  {team.score ?? 0}
                </span>
              )}
              {names.length > 0 && (
                <span className={cn("text-[11px] leading-snug", chosen ? "opacity-70" : "text-muted-foreground")}>
                  {names.join(", ")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {game.status === "void" && <p className="text-xs text-muted-foreground">canceled/postponed, doesn&apos;t count</p>}
      {final && game.winner === "tie" && <p className="text-xs text-muted-foreground">tie, nobody gets the point</p>}
    </Card>
  );
}
