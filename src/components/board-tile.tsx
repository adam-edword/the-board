"use client";

import { useOptimistic, useTransition } from "react";
import { StarIcon } from "lucide-react";
import { toast } from "sonner";
import { setPick } from "@/app/actions";
import { cn } from "@/lib/utils";
import { isLocked, kickoffLabel } from "@/lib/format";
import type { Game, Side } from "@/lib/types";
import { markerStyle, type Marker } from "@/lib/markers";
import { jitter, rng, wobblyLine } from "@/lib/scribble";
import { Card } from "@/components/ui/card";
import { TeamLogo } from "./team-logo";
import { CoinIcon } from "./coin-icon";

type Props = {
  game: Game;
  // everyone else's names per side
  others: Record<Side, Marker[]>;
  mySide: Side | null;
  me: Marker;
  pickedCount: number;
  total: number;
};

// one whiteboard square. tap a side to write your name under it, tap again to erase.
export function BoardTile({ game: g, others, mySide, me, pickedCount, total }: Props) {
  const [side, setOptimisticSide] = useOptimistic(mySide);
  const [pending, startTransition] = useTransition();
  const locked = isLocked(g);
  const final = g.status === "post";
  const live = g.status === "in";
  const needsPick = !locked && !side;

  function choose(next: Side) {
    if (isLocked(g)) return void toast.error("that game already kicked off");
    const value = side === next ? null : next;
    startTransition(async () => {
      setOptimisticSide(value);
      const res = await setPick(g.id, value);
      if (res?.error) toast.error(res.error);
    });
  }

  // every tile gets its own slight tilt and hand-drawn lines, seeded by the game
  // so it looks the same on every load
  const r = rng(g.id * 7919);
  const tilt = { rotate: jitter(r, 0.7), x: jitter(r, 1.5), y: jitter(r, 1.5) };
  const divider = wobblyLine(r, true, 1.2);
  const underlines = { away: wobblyLine(r, false, 8), home: wobblyLine(r, false, 8) };

  // pickedCount comes from the server, adjust it for an unsaved optimistic change
  const count = pickedCount + (side && !mySide ? 1 : 0) - (!side && mySide ? 1 : 0);

  return (
    <Card
      size="sm"
      style={{ transform: `translate(${tilt.x}px, ${tilt.y}px) rotate(${tilt.rotate}deg)` }}
      className={cn(
        "gap-0 py-0",
        g.featured && "ring-2 ring-live/60",
        needsPick && !g.featured && "outline-1 outline-dashed outline-live/50",
      )}
    >
      <div className="relative grid grid-cols-2">
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute top-1.5 left-1/2 h-[calc(100%-0.75rem)] w-3 -translate-x-1/2 text-foreground/35"
        >
          <path d={divider} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {(["away", "home"] as Side[]).map((s) => {
          const won = final && g.winner === s;
          const lost = final && !!g.winner && g.winner !== s && g.winner !== "tie";
          const mine = side === s;
          const score = s === "home" ? g.home_score : g.away_score;
          const rank = s === "home" ? g.home_rank : g.away_rank;
          return (
            <button
              key={s}
              type="button"
              onClick={() => choose(s)}
              disabled={locked || pending}
              aria-pressed={mine}
              aria-label={`pick ${s === "home" ? g.home_name : g.away_name}`}
              className={cn(
                "flex min-h-36 flex-col p-2 text-left outline-none transition-colors",
                "focus-visible:bg-muted/60 disabled:cursor-default",
                !locked && "hover:bg-muted/40 active:bg-muted/60",
                won && "bg-win/10",
              )}
            >
              <div className="relative w-full pb-2">
                <div className="flex items-center gap-1.5">
                  <TeamLogo src={s === "home" ? g.home_logo : g.away_logo} size={18} />
                  <span className={cn("truncate text-sm font-bold", won && "text-win", lost && "text-muted-foreground")}>
                    {rank && <span className="mr-0.5 text-[10px] font-normal text-muted-foreground">{rank}</span>}
                    {s === "home" ? g.home_abbr : g.away_abbr}
                  </span>
                </div>
                {g.status !== "pre" && g.status !== "void" && (
                  <div className={cn("mt-0.5 font-mono text-lg leading-none font-semibold tabular-nums", won && "text-win", lost && "text-muted-foreground")}>
                    {score ?? 0}
                  </div>
                )}
                <svg
                  aria-hidden
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute -bottom-0.5 left-0 h-2 w-full text-foreground/30"
                >
                  <path d={underlines[s]} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
              <ul className="mt-1.5 w-full space-y-0.5 leading-tight">
                {(mine ? [me, ...others[s]] : others[s]).map((m, i) => (
                  <li
                    key={i}
                    style={{ ...markerStyle(m), ...handwriting(g.id, m.name) }}
                    className={cn("truncate origin-left", lost && "line-through decoration-2 opacity-45")}
                  >
                    {m.bot && <CoinIcon className="mr-1" />}
                    {m.name}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-1 border-t px-2 py-1.5 text-[11px] text-muted-foreground">
        <span className={cn("flex min-w-0 items-center gap-1 truncate", live && "font-medium text-live")}>
          {live && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-live" />}
          {g.status === "pre" ? kickoffLabel(g.kickoff) : (g.status_detail ?? "").toLowerCase()}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {g.featured && (
            <span className="flex items-center gap-0.5 font-medium text-live">
              <StarIcon className="size-3 fill-current" /> 2x
            </span>
          )}
          {locked ? (g.league === "nfl" ? "nfl" : "cfb") : `${count}/${total} in`}
        </span>
      </div>
    </Card>
  );
}

// each name is written a little crooked, and the same name keeps the same
// wobble on a tile even as other people add theirs
function handwriting(gameId: number, name: string): React.CSSProperties {
  let h = gameId;
  for (const ch of name) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  const r = rng(h);
  return {
    transform: `translateX(${jitter(r, 3).toFixed(1)}px) rotate(${jitter(r, 2.5).toFixed(2)}deg)`,
    textShadow: "0 0 1.5px color-mix(in oklab, currentColor 45%, transparent)",
  };
}
