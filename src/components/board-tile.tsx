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
  roster: string[];
};

// one whiteboard square. tap a side to write your name under it, tap again to erase.
export function BoardTile({ game: g, others, mySide, me, pickedCount, total, roster }: Props) {
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
      try {
        const res = await setPick(g.id, value);
        if (res?.error) toast.error(res.error);
      } catch {
        toast.error("couldn't save that pick, check your connection");
      }
    });
  }

  // every tile gets its own hand-drawn lines, seeded by the game so it looks
  // the same on every load
  const r = rng(g.id * 7919);
  const divider = wobblyLine(r, true, 1.2);
  const underlines = { away: wobblyLine(r, false, 8), home: wobblyLine(r, false, 8) };
  const coinTilt = jitter(r, 25);

  // pickedCount comes from the server, adjust it for an unsaved optimistic change
  const count = pickedCount + (side && !mySide ? 1 : 0) - (!side && mySide ? 1 : 0);

  return (
    <Card
      size="sm"
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
          className="pointer-events-none absolute top-1.5 left-1/2 h-[calc(100%-0.75rem)] w-3 -translate-x-1/2 text-foreground/20"
        >
          <path d={divider} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {(["away", "home"] as Side[]).map((s) => {
          // on a tie both sides count as right
          const won = final && (g.winner === s || g.winner === "tie");
          const lost = final && !!g.winner && !won;
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
                "relative flex flex-col p-3 text-left outline-none transition-colors",
                "focus-visible:bg-muted/60 disabled:cursor-default",
                !locked && "hover:bg-muted/40 active:bg-muted/60",
                won && "bg-win/10",
              )}
            >
              <div className="relative w-full pb-2">
                <div className="flex items-center gap-2">
                  <TeamLogo src={s === "home" ? g.home_logo : g.away_logo} size={26} />
                  <div className="min-w-0">
                    <div className={cn("truncate text-base leading-tight font-bold", won && "text-win", lost && "text-muted-foreground")}>
                      {rank && <span className="mr-1 text-xs font-normal text-muted-foreground">#{rank}</span>}
                      {s === "home" ? g.home_abbr : g.away_abbr}
                    </div>
                    <div className="truncate text-[11px] leading-tight text-muted-foreground">
                      {s === "home" ? g.home_name : g.away_name}
                    </div>
                  </div>
                </div>
                {g.status !== "pre" && g.status !== "void" && (
                  <div className={cn("mt-1 font-mono text-xl leading-none font-semibold tabular-nums", won && "text-win", lost && "text-muted-foreground")}>
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
              {(() => {
                const coinHere = others[s].some((m) => m.bot);
                // an optimistic switch hasn't been saved yet, so it counts as the newest pick
                const writers = [...(mine ? [me] : []), ...others[s]];
                const { height, spots } = placeNames(g.id, s, writers.filter((m) => !m.bot), coinHere, roster);
                return (
                  <ul className="relative mt-2 w-full" style={{ height }}>
                    {spots.map(({ m, top, rowH, x, tilt }) => (
                      // full-width row; the two flexible spacers push the name to a random
                      // spot left-to-right, but it can never spill out of its side
                      <li key={`${m.name}-${top}`} className="absolute inset-x-0 flex items-center" style={{ top, height: rowH }}>
                        <span style={{ flexGrow: x }} />
                        <span
                          style={{
                            ...bigger(markerStyle(m)),
                            transform: `rotate(${tilt}deg)`,
                            textShadow: "0 0 1.5px color-mix(in oklab, currentColor 45%, transparent)",
                          }}
                          className={cn(
                            "min-w-0 truncate leading-none whitespace-nowrap py-0.5",
                            lost && "line-through decoration-2 opacity-45",
                          )}
                        >
                          {m.name}
                          {m.edited && <span title="edited by the admin">*</span>}
                        </span>
                        <span style={{ flexGrow: 1 - x }} />
                      </li>
                    ))}
                  </ul>
                );
              })()}
              {others[s].some((m) => m.bot) && (
                // the coin flip lands in the corner of whichever side it picked
                <CoinIcon
                  className={cn("absolute right-3 bottom-3 size-6", lost && "opacity-40")}
                  style={{ transform: `rotate(${coinTilt}deg)` }}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-1 border-t px-2 py-1.5 text-[11px] text-muted-foreground">
        <span className={cn("flex min-w-0 items-center gap-1 truncate", live && "font-medium text-live")}>
          {live && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-live" />}
          {g.status === "pre" ? kickoffLabel(g.kickoff) : (g.status_detail ?? "").toLowerCase()}
          {g.network && (g.status === "pre" || live) && <span className="truncate"> on {g.network}</span>}
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

// names get scattered around their side like a real whiteboard. the name area
// is a fixed height split into invisible rows. every person on the roster owns
// one row per side of each tile (a seeded shuffle), so nobody ever overlaps and
// nobody's name moves when someone else picks or switches sides. rows squeeze
// together once there are more people than roomy rows, and only past that does
// the tile grow. the bottom row stays clear on the side where the coin landed.
const ROW = 30; // roomy row height
const MIN_ROW = 19; // how tight rows can squeeze before the tile grows
const ROWS = 6; // fixed height, in roomy rows

function placeNames(gameId: number, side: Side, writers: Marker[], coinHere: boolean, roster: string[]) {
  const coinSpace = coinHere ? ROW : 0;
  const room = ROWS * ROW - coinSpace;
  // anyone not on the roster (shouldn't happen) still gets a row after it
  const everyone = [...roster, ...writers.map((m) => m.id ?? m.name).filter((id) => !roster.includes(id))];
  const slots = Math.max(Math.floor(room / ROW), everyone.length);
  const rowH = Math.max(MIN_ROW, Math.min(ROW, room / slots));
  const height = Math.max(ROWS * ROW, slots * rowH + coinSpace);

  // seeded shuffle of the rows for this side of this game
  const order = Array.from({ length: slots }, (_, i) => i);
  const r = rng(gameId * 2 + (side === "home" ? 1 : 0));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const spots = writers.map((m) => {
    const key = m.id ?? m.name;
    const slot = order[everyone.indexOf(key)];
    let h = gameId * 31 + (side === "home" ? 7 : 3);
    for (const ch of key) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
    const rr = rng(h);
    return { m, top: slot * rowH, rowH, x: rr(), tilt: jitter(rr, 3) };
  });
  return { height, spots };
}

// names read a bit bigger now that tiles are bigger
function bigger(style: React.CSSProperties): React.CSSProperties {
  return { ...style, fontSize: Math.round(Number(style.fontSize ?? 15) * 1.2) };
}
