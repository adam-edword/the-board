import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { firstName, isLocked, kickoffLabel, pointsFor } from "@/lib/format";
import type { Game, Pick, Profile, Side } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { TeamLogo } from "./team-logo";

// the whiteboard: one tile per game, names written under the side they took
export function BoardGrid({ games, members, picks, picked, meId }: {
  games: Game[];
  members: Profile[];
  picks: Pick[];
  picked: { user_id: string; game_id: number }[];
  meId: string;
}) {
  const names = new Map(members.map((m) => [m.id, firstName(m.name).toLowerCase()]));

  // weekly totals
  const totals = new Map<string, number>(members.map((m) => [m.id, 0]));
  const byGame = new Map(games.map((g) => [g.id, g]));
  for (const p of picks) {
    const g = byGame.get(p.game_id);
    if (g?.status === "post" && g.winner === p.side) totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + pointsFor(g));
  }
  const ranked = members
    .map((m) => ({ id: m.id, name: names.get(m.id)!, pts: totals.get(m.id) ?? 0 }))
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
  const best = ranked[0]?.pts ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {ranked.map((r) => (
          <span
            key={r.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
              r.pts === best && best > 0 && "border-win/50 bg-win/10 text-win",
              r.id === meId && !(r.pts === best && best > 0) && "border-foreground/30",
            )}
          >
            {r.name}
            <span className="font-mono font-semibold tabular-nums">{r.pts}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {games.map((g) => (
          <Tile
            key={g.id}
            game={g}
            picks={picks.filter((p) => p.game_id === g.id)}
            pickedCount={picked.filter((p) => p.game_id === g.id).length}
            total={members.length}
            names={names}
            meId={meId}
          />
        ))}
      </div>
    </div>
  );
}

function Tile({ game: g, picks, pickedCount, total, names, meId }: {
  game: Game;
  picks: Pick[];
  pickedCount: number;
  total: number;
  names: Map<string, string>;
  meId: string;
}) {
  const locked = isLocked(g);
  const final = g.status === "post";
  const live = g.status === "in";

  return (
    <Card size="sm" className={cn("gap-0 py-0", g.featured && "ring-2 ring-live/60")}>
      <div className="grid grid-cols-2 divide-x">
        {(["away", "home"] as Side[]).map((s) => {
          const won = final && g.winner === s;
          const lost = final && g.winner && g.winner !== s;
          const takers = picks
            .filter((p) => p.side === s)
            .map((p) => ({ id: p.user_id, name: names.get(p.user_id) ?? "?" }))
            .sort((a, b) => a.name.localeCompare(b.name));
          const score = s === "home" ? g.home_score : g.away_score;
          return (
            <div key={s} className={cn("flex min-h-36 flex-col p-2", won && "bg-win/10")}>
              <div className="flex items-center gap-1.5 border-b border-dashed pb-1.5">
                <TeamLogo src={s === "home" ? g.home_logo : g.away_logo} size={18} />
                <span className={cn("text-sm font-bold", won && "text-win", lost && "text-muted-foreground")}>
                  {s === "home" ? g.home_abbr : g.away_abbr}
                </span>
                {g.status !== "pre" && g.status !== "void" && (
                  <span className={cn("ml-auto font-mono text-sm tabular-nums", lost && "text-muted-foreground")}>
                    {score ?? 0}
                  </span>
                )}
              </div>
              <ul className="mt-1.5 space-y-0.5 font-hand text-[15px] leading-tight">
                {takers.map((t) => (
                  <li
                    key={t.id}
                    className={cn(
                      "truncate",
                      t.id === meId && "font-semibold",
                      won && "text-win",
                      lost && "text-loss/80 line-through",
                    )}
                  >
                    {t.name}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-1 border-t px-2 py-1.5 text-[11px] text-muted-foreground">
        <span className={cn("flex items-center gap-1", live && "font-medium text-live")}>
          {live && <span className="size-1.5 animate-pulse rounded-full bg-live" />}
          {g.status === "pre" ? kickoffLabel(g.kickoff) : (g.status_detail ?? "").toLowerCase()}
        </span>
        <span className="flex items-center gap-1">
          {g.featured && (
            <span className="flex items-center gap-0.5 font-medium text-live">
              <StarIcon className="size-3 fill-current" /> 2x
            </span>
          )}
          {locked ? (g.league === "nfl" ? "nfl" : "cfb") : `${pickedCount}/${total} in`}
        </span>
      </div>
    </Card>
  );
}
