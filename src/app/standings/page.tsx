import { redirect } from "next/navigation";
import { getMe, getMembers, getSeasonData, getWeeks, scorePicks } from "@/lib/data";

export default async function StandingsPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!me.approved) redirect("/");

  const weeks = await getWeeks();
  const season = weeks[0]?.season ?? new Date().getFullYear();
  const [{ weeks: seasonWeeks, games, picks }, members] = await Promise.all([getSeasonData(season), getMembers()]);

  const season_ = scorePicks(games, picks);
  const perWeek = seasonWeeks.map((w) => {
    const ids = new Set(games.filter((g) => g.week_id === w.id).map((g) => g.id));
    return {
      week: w,
      scores: scorePicks(
        games.filter((g) => ids.has(g.id)),
        picks.filter((p) => ids.has(p.game_id)),
      ),
    };
  });

  const weeklyWins = new Map<string, number>();
  for (const { scores } of perWeek) {
    const best = Math.max(0, ...[...scores.values()].map((s) => s.correct));
    if (best === 0) continue;
    for (const [uid, s] of scores) if (s.correct === best) weeklyWins.set(uid, (weeklyWins.get(uid) ?? 0) + 1);
  }

  const rows = members
    .map((m) => {
      const s = season_.get(m.id) ?? { correct: 0, decided: 0 };
      return { m, ...s, pct: s.decided ? s.correct / s.decided : 0, weeks: weeklyWins.get(m.id) ?? 0 };
    })
    .sort((a, b) => b.correct - a.correct || b.pct - a.pct);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{season} standings</h1>

      <table className="w-full text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th className="p-2 text-left font-normal">#</th>
            <th className="p-2 text-left font-normal">name</th>
            <th className="p-2 text-right font-normal">right</th>
            <th className="p-2 text-right font-normal">wrong</th>
            <th className="p-2 text-right font-normal">%</th>
            <th className="p-2 text-right font-normal" title="weeks won (ties count for everyone tied)">wk wins</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.m.id} className={`border-t border-zinc-800 ${r.m.id === me.id ? "bg-zinc-900" : ""}`}>
              <td className="p-2 text-zinc-500">{i + 1}</td>
              <td className="p-2 font-medium">{r.m.name.toLowerCase()}</td>
              <td className="p-2 text-right font-mono font-bold">{r.correct}</td>
              <td className="p-2 text-right font-mono text-zinc-400">{r.decided - r.correct}</td>
              <td className="p-2 text-right font-mono text-zinc-400">{r.decided ? Math.round(r.pct * 100) : "–"}</td>
              <td className="p-2 text-right font-mono">{r.weeks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {perWeek.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">by week</h2>
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="sticky left-0 bg-zinc-950 p-2 text-left font-normal">name</th>
                  {perWeek.map(({ week }) => (
                    <th key={week.id} className="whitespace-nowrap p-2 text-right font-normal">
                      {week.label.replace(/^week\s*/i, "wk ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.m.id} className="border-t border-zinc-800">
                    <td className="sticky left-0 bg-zinc-950 p-2">{r.m.name.toLowerCase()}</td>
                    {perWeek.map(({ week, scores }) => {
                      const best = Math.max(0, ...[...scores.values()].map((s) => s.correct));
                      const c = scores.get(r.m.id)?.correct ?? 0;
                      return (
                        <td key={week.id} className={`p-2 text-right font-mono ${c === best && best > 0 ? "text-lime-400 font-bold" : ""}`}>
                          {c}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
