import { firstName, isLocked } from "@/lib/format";
import type { Game, Pick, Profile } from "@/lib/types";

// the whiteboard: games down the side, people across the top
export function BoardGrid({ games, members, picks, picked, meId }: {
  games: Game[];
  members: Profile[];
  picks: Pick[];
  picked: { user_id: string; game_id: number }[];
  meId: string;
}) {
  const pickMap = new Map(picks.map((p) => [`${p.user_id}:${p.game_id}`, p.side]));
  const pickedSet = new Set(picked.map((p) => `${p.user_id}:${p.game_id}`));

  const totals = new Map<string, number>();
  for (const m of members) totals.set(m.id, 0);
  for (const g of games) {
    if (g.status !== "post" || !g.winner) continue;
    for (const m of members) {
      if (pickMap.get(`${m.id}:${g.id}`) === g.winner) totals.set(m.id, (totals.get(m.id) ?? 0) + 1);
    }
  }
  const best = Math.max(0, ...totals.values());

  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-zinc-950 p-2 text-left text-xs font-normal text-zinc-500">game</th>
            {members.map((m) => (
              <th
                key={m.id}
                className={`min-w-14 p-2 text-center text-xs font-semibold ${m.id === meId ? "text-white" : "text-zinc-400"}`}
              >
                {firstName(m.name).toLowerCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.map((g) => {
            const locked = isLocked(g);
            return (
              <tr key={g.id}>
                <td className="sticky left-0 z-10 whitespace-nowrap border-t border-zinc-800 bg-zinc-950 p-2 text-xs">
                  <span className={g.winner === "away" ? "font-bold text-white" : "text-zinc-400"}>{g.away_abbr}</span>
                  <span className="text-zinc-600"> @ </span>
                  <span className={g.winner === "home" ? "font-bold text-white" : "text-zinc-400"}>{g.home_abbr}</span>
                  {g.status === "in" && <span className="ml-1 text-amber-400">•</span>}
                </td>
                {members.map((m) => {
                  const key = `${m.id}:${g.id}`;
                  const side = pickMap.get(key);
                  const hasPicked = pickedSet.has(key);
                  let cls = "text-zinc-300";
                  if (g.status === "post" && side && g.winner) {
                    cls = g.winner === side ? "bg-lime-500/20 text-lime-300 font-semibold" : "bg-red-500/15 text-red-300/80 line-through";
                  }
                  return (
                    <td key={m.id} className={`border-t border-zinc-800 p-2 text-center font-mono text-xs ${cls}`}>
                      {side
                        ? side === "home" ? g.home_abbr : g.away_abbr
                        : hasPicked
                          ? <span className="text-zinc-500" title="picked, hidden until kickoff">✓</span>
                          : <span className={locked ? "text-zinc-700" : "text-amber-500/70"}>–</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="sticky left-0 z-10 border-t-2 border-zinc-700 bg-zinc-950 p-2 text-xs font-semibold">total</td>
            {members.map((m) => {
              const t = totals.get(m.id) ?? 0;
              return (
                <td
                  key={m.id}
                  className={`border-t-2 border-zinc-700 p-2 text-center font-mono font-bold ${t === best && best > 0 ? "text-lime-400" : ""}`}
                >
                  {t}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
      <p className="mt-3 text-xs text-zinc-500">✓ = picked, hidden until kickoff · – = no pick yet</p>
    </div>
  );
}
