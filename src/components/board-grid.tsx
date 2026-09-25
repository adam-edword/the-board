import { cn } from "@/lib/utils";
import { firstName, pointsFor } from "@/lib/format";
import type { Game, Pick, Profile, Side } from "@/lib/types";
import type { Marker } from "@/lib/markers";
import { BoardTile } from "./board-tile";

// the whiteboard: one tile per game, names written under the side they took
export function BoardGrid({ games, members, picks, picked, meId }: {
  games: Game[];
  members: Profile[];
  picks: Pick[];
  picked: { user_id: string; game_id: number }[];
  meId: string;
}) {
  const names = new Map(members.map((m) => [m.id, firstName(m.name).toLowerCase()]));
  const markers = new Map<string, Marker>(
    members.map((m) => [m.id, { name: names.get(m.id)!, color: m.marker_color, font: m.marker_font }]),
  );

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
        {games.map((g) => {
          const others: Record<Side, Marker[]> = { home: [], away: [] };
          let mySide: Side | null = null;
          for (const p of picks) {
            if (p.game_id !== g.id) continue;
            if (p.user_id === meId) mySide = p.side;
            else others[p.side].push(markers.get(p.user_id) ?? { name: "?", color: "white", font: "kalam" });
          }
          others.home.sort((a, b) => a.name.localeCompare(b.name));
          others.away.sort((a, b) => a.name.localeCompare(b.name));
          return (
            <BoardTile
              key={g.id}
              game={g}
              others={others}
              mySide={mySide}
              me={markers.get(meId) ?? { name: "you", color: "white", font: "kalam" }}
              pickedCount={picked.filter((p) => p.game_id === g.id).length}
              total={members.length}
            />
          );
        })}
      </div>
    </div>
  );
}
