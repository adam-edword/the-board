import Link from "next/link";
import { cn } from "@/lib/utils";
import { firstName, pickIsRight, pointsFor } from "@/lib/format";
import type { Adjustment, Game, Pick, Profile, Side } from "@/lib/types";
import type { Marker } from "@/lib/markers";
import { BoardTile } from "./board-tile";
import { CoinIcon } from "./coin-icon";

// the whiteboard: one tile per game, names written under the side they took
export function BoardGrid({ games, members, picks, picked, meId, adjustments = [], seasonTotals }: {
  games: Game[];
  members: Profile[];
  picks: Pick[];
  picked: { user_id: string; game_id: number }[];
  meId: string;
  adjustments?: Adjustment[];
  // season points per person, for the standings strip
  seasonTotals: Record<string, { points: number; edited: boolean }>;
}) {
  const names = new Map(members.map((m) => [m.id, firstName(m.name).toLowerCase()]));
  const markers = new Map<string, Marker>(
    members.map((m) => [m.id, { id: m.id, name: names.get(m.id)!, color: m.marker_color, font: m.marker_font, bot: m.is_bot }]),
  );

  // weekly totals
  const totals = new Map<string, number>(members.map((m) => [m.id, 0]));
  const byGame = new Map(games.map((g) => [g.id, g]));
  for (const p of picks) {
    const g = byGame.get(p.game_id);
    if (g && pickIsRight(g, p.side)) totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + pointsFor(g));
  }
  for (const a of adjustments) totals.set(a.user_id, (totals.get(a.user_id) ?? 0) + a.points);
  // standings strip: ranked by season points, with this week's points alongside
  const ranked = members
    .map((m) => ({
      id: m.id,
      name: names.get(m.id)!,
      total: seasonTotals[m.id]?.points ?? 0,
      week: totals.get(m.id) ?? 0,
      bot: m.is_bot,
      edited: !!seasonTotals[m.id]?.edited,
    }))
    .sort((a, b) => b.total - a.total || Number(a.bot) - Number(b.bot) || a.name.localeCompare(b.name));
  // ranks skip the coin and share on ties (1, 2, 2, 4)
  const humans = ranked.filter((r) => !r.bot);
  const rankOf = (total: number) => humans.filter((h) => h.total > total).length + 1;
  // the leader highlight is for people, not the coin
  const best = Math.max(0, ...humans.map((r) => r.total));
  // everyone who could write on the board, in a fixed order. each person's spot
  // on a tile comes from this, so it never depends on who else has picked.
  const roster = members.filter((m) => !m.is_bot).map((m) => m.id).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {ranked.map((r) => (
          <Link
            key={r.id}
            href={`/players/${r.id}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted/50",
              !r.bot && r.total === best && best > 0 && "border-win/50 bg-win/10 text-win",
              r.id === meId && !(!r.bot && r.total === best && best > 0) && "border-foreground/30",
            )}
            title={`${r.total} pts this season, ${r.week} this week`}
          >
            {r.bot ? <CoinIcon /> : <span className="font-mono text-[10px] opacity-60">{rankOf(r.total)}</span>}
            {r.name}
            <span className="font-mono font-semibold tabular-nums">
              {r.total}
              {r.edited && <span title="includes an admin edit">*</span>}
            </span>
            {r.week > 0 && <span className="font-mono text-[10px] opacity-60">+{r.week}</span>}
          </Link>
        ))}
      </div>

      {ranked.some((r) => r.edited) && (
        <p className="text-xs text-muted-foreground">* includes a pick or score the admin edited</p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {games.map((g) => {
          const others: Record<Side, Marker[]> = { home: [], away: [] };
          let mySide: Side | null = null;
          let myAt: string | undefined;
          let myEdited: boolean | undefined;
          for (const p of picks) {
            if (p.game_id !== g.id) continue;
            if (p.user_id === meId) {
              mySide = p.side;
              myAt = p.updated_at;
              myEdited = p.edited;
            } else {
              const m = markers.get(p.user_id) ?? { name: "?", color: "white" as const, font: "pangolin" as const };
              others[p.side].push({ ...m, at: p.updated_at, edited: p.edited });
            }
          }

          return (
            <BoardTile
              key={g.id}
              game={g}
              others={others}
              mySide={mySide}
              me={{ ...(markers.get(meId) ?? { name: "you", color: "white", font: "pangolin" }), at: myAt, edited: myEdited }}
              pickedCount={picked.filter((p) => p.game_id === g.id).length}
              total={members.length}
              roster={roster}
            />
          );
        })}
      </div>
    </div>
  );
}
