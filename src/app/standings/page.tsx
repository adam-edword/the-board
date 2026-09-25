import { redirect } from "next/navigation";
import { TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoinIcon } from "@/components/coin-icon";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMe, getMembers, getSeasonData, getWeeks, scorePicks } from "@/lib/data";

export default async function StandingsPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!me.onboarded) redirect("/welcome");
  if (!me.approved) redirect("/");

  const weeks = await getWeeks();
  const season = weeks[0]?.season ?? new Date().getFullYear();
  const [{ weeks: seasonWeeks, games, picks, adjustments }, members] = await Promise.all([getSeasonData(season), getMembers()]);

  const season_ = scorePicks(games, picks, adjustments);
  const perWeek = seasonWeeks.map((w) => {
    const ids = new Set(games.filter((g) => g.week_id === w.id).map((g) => g.id));
    const weekGames = games.filter((g) => g.week_id === w.id);
    return {
      week: w,
      // only finished weeks count for week wins and beating the coin
      done: weekGames.length > 0 && weekGames.every((g) => g.status === "post" || g.status === "void"),
      scores: scorePicks(
        games.filter((g) => ids.has(g.id)),
        picks.filter((p) => ids.has(p.game_id)),
        adjustments.filter((a) => a.week_id === w.id),
      ),
    };
  });

  const coinId = members.find((m) => m.is_bot)?.id;
  const weeklyWins = new Map<string, number>();
  const beatCoin = new Map<string, number>();
  for (const { scores, done } of perWeek) {
    if (!done) continue;
    const coinPts = coinId ? (scores.get(coinId)?.points ?? 0) : null;
    if (coinPts !== null) {
      for (const [uid, s] of scores) if (uid !== coinId && s.points > coinPts) beatCoin.set(uid, (beatCoin.get(uid) ?? 0) + 1);
    }
    const best = Math.max(0, ...[...scores.values()].map((s) => s.points));
    if (best === 0) continue;
    for (const [uid, s] of scores) if (s.points === best) weeklyWins.set(uid, (weeklyWins.get(uid) ?? 0) + 1);
  }

  const rows = members
    .map((m) => {
      const s = season_.get(m.id) ?? { points: 0, correct: 0, decided: 0, edited: false };
      return { m, ...s, pct: s.decided ? s.correct / s.decided : 0, weeks: weeklyWins.get(m.id) ?? 0, coin: beatCoin.get(m.id) ?? 0 };
    })
    .sort((a, b) => b.points - a.points || b.pct - a.pct);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{season} standings</h1>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>name</TableHead>
              <TableHead className="text-right">pts</TableHead>
              <TableHead className="text-right">right</TableHead>
              <TableHead className="text-right">wrong</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right" title="weeks won (ties count for everyone tied)">wk wins</TableHead>
              {coinId && (
                <TableHead className="text-right" title="finished weeks where they outscored the coin">
                  beat <CoinIcon />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.m.id} className={cn(r.m.id === me.id && "bg-muted/40")}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">
                  {r.m.is_bot && <CoinIcon className="mr-1.5" />}
                  {r.m.name.toLowerCase()}
                  {i === 0 && r.points > 0 && <TrophyIcon className="ml-1.5 inline size-3.5 text-live" />}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {r.points}
                  {r.edited && <span title="includes an admin edit">*</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{r.correct}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{r.decided - r.correct}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground tabular-nums">
                  {r.decided ? Math.round(r.pct * 100) : "–"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{r.weeks}</TableCell>
                {coinId && (
                  <TableCell className="text-right font-mono tabular-nums">{r.m.is_bot ? "–" : r.coin}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {rows.some((r) => r.edited) && (
        <p className="text-xs text-muted-foreground">* includes a pick or score the admin edited</p>
      )}

      {perWeek.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">by week</h2>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">name</TableHead>
                  {perWeek.map(({ week }) => (
                    <TableHead key={week.id} className="text-right">
                      {week.label.replace(/^week\s*/i, "wk ")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.m.id}>
                    <TableCell className="sticky left-0 bg-card">{r.m.name.toLowerCase()}</TableCell>
                    {perWeek.map(({ week, scores }) => {
                      const best = Math.max(0, ...[...scores.values()].map((s) => s.points));
                      const c = scores.get(r.m.id)?.points ?? 0;
                      const e = scores.get(r.m.id)?.edited;
                      return (
                        <TableCell
                          key={week.id}
                          className={cn("text-right font-mono tabular-nums", c === best && best > 0 && "font-bold text-win")}
                        >
                          {c}
                          {e && "*"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}
    </div>
  );
}
