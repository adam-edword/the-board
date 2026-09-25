import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getMe, getMembers, getSeasonData, getWeeks } from "@/lib/data";
import { firstName } from "@/lib/format";
import { MARKER_COLORS, markerStyle } from "@/lib/markers";
import { seasonStats } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoinIcon } from "@/components/coin-icon";
import { WeeklyPoints } from "./weekly-points";

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");

export default async function PlayerPage(props: PageProps<"/players/[id]">) {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!me.onboarded) redirect("/welcome");
  if (!me.approved) redirect("/");

  const { id } = await props.params;
  const weeks = await getWeeks();
  const season = weeks[0]?.season ?? new Date().getFullYear();
  const [{ weeks: seasonWeeks, games, picks, adjustments }, members] = await Promise.all([
    getSeasonData(season),
    getMembers(),
  ]);
  const player = members.find((m) => m.id === id);
  if (!player) notFound();

  const stats = seasonStats(seasonWeeks, games, picks, adjustments, members);
  const s = stats.get(player.id)!;
  const rank = [...stats.entries()].filter(([, o]) => o.points > s.points).length + 1;
  const played = s.weeks.filter((w) => w.played && w.done);
  const best = played.length ? played.reduce((a, b) => (b.points > a.points ? b : a)) : null;
  const worst = played.length ? played.reduce((a, b) => (b.points < a.points ? b : a)) : null;
  const name = firstName(player.name).toLowerCase();
  const color = MARKER_COLORS[player.marker_color] ?? MARKER_COLORS.white;

  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: "points", value: `${s.points}${s.edited ? "*" : ""}`, sub: `#${rank} of ${members.length}` },
    { label: "pick %", value: pct(s.correct, s.decided), sub: `${s.correct}–${s.decided - s.correct}` },
    { label: "weeks won", value: player.is_bot ? "–" : String(s.weekWins) },
    { label: "featured games", value: s.featured.total ? `${s.featured.hit}/${s.featured.total}` : "–", sub: "tracked picks" },
  ];
  if (!player.is_bot) {
    tiles.push({
      label: "vs the coin",
      value: `${s.vsCoin.w}–${s.vsCoin.l}${s.vsCoin.t ? `–${s.vsCoin.t}` : ""}`,
      sub: "finished weeks",
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/standings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> standings
      </Link>

      <div className="flex items-baseline gap-3">
        {player.is_bot && <CoinIcon className="size-8 self-center" />}
        <h1 style={{ ...markerStyle({ color: player.marker_color, font: player.marker_font }), fontSize: 40 }} className="leading-none">
          {name}
        </h1>
        <span className="text-sm text-muted-foreground">{season} season</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} size="sm">
            <CardContent className="space-y-0.5">
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div className="font-mono text-2xl font-semibold tabular-nums">{t.value}</div>
              {t.sub && <div className="text-xs text-muted-foreground">{t.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>points by week</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyPoints
            color={color}
            weeks={s.weeks.map((w) => ({
              label: w.week.label,
              points: w.points,
              played: w.played,
              done: w.done,
              won: w.won,
              coin: player.is_bot ? null : w.coinPoints,
            }))}
          />
          {best && worst && best !== worst && (
            <p className="mt-3 text-sm text-muted-foreground">
              best week: <span className="text-foreground">{best.week.label}</span> ({best.points}) · worst:{" "}
              <span className="text-foreground">{worst.week.label}</span> ({worst.points})
            </p>
          )}
        </CardContent>
      </Card>

      {!player.is_bot && (
        <Card>
          <CardHeader>
            <CardTitle>picking style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              goes against the group on{" "}
              <b className="font-mono">{pct(s.contrarian.picks, s.contrarian.picks + s.crowd.picks)}</b> of picks.
            </p>
            <p className="text-muted-foreground">
              against the grain:{" "}
              <span className="text-foreground">
                {s.contrarian.wins}–{s.contrarian.decided - s.contrarian.wins} ({pct(s.contrarian.wins, s.contrarian.decided)})
              </span>{" "}
              · with the crowd:{" "}
              <span className="text-foreground">
                {s.crowd.wins}–{s.crowd.decided - s.crowd.wins} ({pct(s.crowd.wins, s.crowd.decided)})
              </span>
            </p>
            {s.favoriteTeam && s.favoriteTeam.count > 1 && (
              <p className="text-muted-foreground">
                most picked team: <span className="text-foreground">{s.favoriteTeam.abbr}</span> ({s.favoriteTeam.count}x)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              only counts picks made in the app, not back-filled whiteboard totals.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
