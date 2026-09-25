import Link from "next/link";
import { redirect } from "next/navigation";
import { TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoinIcon } from "@/components/coin-icon";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMe, getMembers, getSeasonData, getWeeks } from "@/lib/data";
import { seasonStats } from "@/lib/stats";

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}` : "–");

export default async function StandingsPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!me.onboarded) redirect("/welcome");
  if (!me.approved) redirect("/");

  const weeks = await getWeeks();
  const season = weeks[0]?.season ?? new Date().getFullYear();
  const [{ weeks: seasonWeeks, games, picks, adjustments }, members] = await Promise.all([
    getSeasonData(season),
    getMembers(),
  ]);
  const stats = seasonStats(seasonWeeks, games, picks, adjustments, members);
  const hasCoin = members.some((m) => m.is_bot);

  const rows = members
    .map((m) => ({ m, s: stats.get(m.id)! }))
    .sort((a, b) => b.s.points - a.s.points || b.s.correct / (b.s.decided || 1) - a.s.correct / (a.s.decided || 1));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
              <TableHead className="text-right" title="finished weeks won (ties count for everyone tied)">
                wk wins
              </TableHead>
              {hasCoin && (
                <TableHead className="text-right" title="finished weeks where they outscored the coin">
                  beat <CoinIcon />
                </TableHead>
              )}
              <TableHead className="text-right" title="share of picks that went against most of the group">
                contra
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ m, s }, i) => (
              <TableRow key={m.id} className={cn(m.id === me.id && "bg-muted/40")}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/players/${m.id}`} className="underline-offset-4 hover:underline">
                    {m.is_bot && <CoinIcon className="mr-1.5" />}
                    {m.name.toLowerCase()}
                  </Link>
                  {i === 0 && s.points > 0 && <TrophyIcon className="ml-1.5 inline size-3.5 text-live" />}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {s.points}
                  {s.edited && <span title="includes an admin edit">*</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{s.correct}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{s.decided - s.correct}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{pct(s.correct, s.decided)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{m.is_bot ? "–" : s.weekWins}</TableCell>
                {hasCoin && (
                  <TableCell className="text-right font-mono tabular-nums">{m.is_bot ? "–" : s.vsCoin.w}</TableCell>
                )}
                <TableCell className="text-right font-mono text-muted-foreground tabular-nums">
                  {m.is_bot ? "–" : pct(s.contrarian.picks, s.contrarian.picks + s.crowd.picks)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {rows.some(({ s }) => s.edited) && (
        <p className="text-xs text-muted-foreground">* includes a pick or score the admin edited</p>
      )}

      {seasonWeeks.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">by week</h2>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">name</TableHead>
                  {seasonWeeks.map((w) => (
                    <TableHead key={w.id} className="text-right">
                      {w.label.replace(/^week\s*/i, "wk ")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ m, s }) => (
                  <TableRow key={m.id}>
                    <TableCell className="sticky left-0 bg-card">{m.name.toLowerCase()}</TableCell>
                    {s.weeks.map((l) => (
                      <TableCell
                        key={l.week.id}
                        className={cn(
                          "text-right font-mono tabular-nums",
                          l.won && "font-bold text-win",
                          !l.played && "text-muted-foreground/50",
                        )}
                      >
                        {l.played ? l.points : "–"}
                      </TableCell>
                    ))}
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
