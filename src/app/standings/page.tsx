import Link from "next/link";
import { redirect } from "next/navigation";
import { TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoinIcon } from "@/components/coin-icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getChampions, getMe, getMembers, getSeasonData, getSeasons } from "@/lib/data";
import { markerStyle } from "@/lib/markers";
import { firstName } from "@/lib/format";
import { seasonStats } from "@/lib/stats";
import { WeekBreakdown, type BreakdownWeek } from "./week-breakdown";

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}` : "–");

export default async function StandingsPage(props: PageProps<"/standings">) {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!me.onboarded) redirect("/welcome");
  if (!me.approved) redirect("/");

  const seasons = await getSeasons();
  const current = seasons[0] ?? new Date().getFullYear();
  const { season: asked } = await props.searchParams;
  const season = seasons.find((s) => String(s) === asked) ?? current;
  const past = season !== current;
  // champ banner: this season's winner if it's over, or last season's otherwise
  const bannerSeason = past ? season : seasons[1];
  const banner = bannerSeason ? await getChampions(bannerSeason) : null;
  const [{ weeks: seasonWeeks, games, picks, adjustments }, members] = await Promise.all([
    getSeasonData(season),
    getMembers(),
  ]);
  const stats = seasonStats(seasonWeeks, games, picks, adjustments, members);
  const hasCoin = members.some((m) => m.is_bot);

  // weekly breakdown: weeks in order, opening on the latest week with a final game
  const breakdown: BreakdownWeek[] = seasonWeeks.map((w) => ({
    id: w.id,
    label: w.label,
    done: stats.get(members[0]?.id ?? "")?.weeks.find((l) => l.week.id === w.id)?.done ?? false,
    rows: members.map((m) => {
      const l = stats.get(m.id)!.weeks.find((x) => x.week.id === w.id)!;
      return {
        id: m.id,
        name: m.name.toLowerCase(),
        color: m.marker_color,
        font: m.marker_font,
        bot: m.is_bot,
        played: l.played,
        won: l.won,
        cfb: l.cfb,
        nfl: l.nfl,
        total: l.points,
      };
    }),
  }));
  const withFinal = new Set(games.filter((g) => g.status === "post").map((g) => g.week_id));
  const initialWeekId = ([...breakdown].reverse().find((w) => withFinal.has(w.id)) ?? breakdown.at(-1))?.id ?? 0;

  const rows = members
    .map((m) => ({ m, s: stats.get(m.id)! }))
    .sort((a, b) => b.s.points - a.s.points || b.s.correct / (b.s.decided || 1) - a.s.correct / (a.s.decided || 1));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{season} standings</h1>
        {seasons.length > 1 && (
          <div className="flex gap-1.5">
            {seasons.map((y) => (
              <Button key={y} asChild size="sm" variant={y === season ? "default" : "outline"}>
                <Link href={y === current ? "/standings" : `/standings?season=${y}`}>{y}</Link>
              </Button>
            ))}
          </div>
        )}
      </div>

      {banner && (
        <Card className={cn("flex-row items-center gap-3 px-4", past && "bg-live/10 ring-live/40")}>
          <TrophyIcon className={cn("shrink-0 text-live", past ? "size-7" : "size-5")} />
          <div>
            <div className={cn(past ? "text-base font-semibold" : "text-sm text-muted-foreground")}>
              {past ? `${season} champion${banner.champs.length > 1 ? "s" : ""}` : `${bannerSeason} champ${banner.champs.length > 1 ? "s" : ""}`}
            </div>
            <div className="text-sm">
              {banner.champs.map((m, i) => (
                <span key={m.id}>
                  {i > 0 && " & "}
                  <span style={{ ...markerStyle({ color: m.marker_color, font: m.marker_font }), fontSize: past ? 26 : 20 }}>
                    {firstName(m.name).toLowerCase()}
                  </span>
                </span>
              ))}{" "}
              <span className="text-muted-foreground">with {banner.points} pts</span>
            </div>
          </div>
        </Card>
      )}

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
                  <Link
                    href={`/players/${m.id}${past ? `?season=${season}` : ""}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {m.is_bot && <CoinIcon className="mr-1.5" />}
                    {/* written in their own marker, like on the board */}
                    <span style={markerStyle({ color: m.marker_color, font: m.marker_font })}>
                      {m.name.toLowerCase()}
                    </span>
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

      {breakdown.length > 0 && (
        <WeekBreakdown weeks={breakdown} initialWeekId={initialWeekId} linkSuffix={past ? `?season=${season}` : ""} />
      )}
    </div>
  );
}
