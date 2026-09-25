import { StarIcon, TrendingDownIcon, TrophyIcon, ZapIcon } from "lucide-react";
import { firstName, pickIsRight, pointsFor } from "@/lib/format";
import { markerStyle, type Marker } from "@/lib/markers";
import type { Adjustment, Game, Pick, Profile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoinIcon } from "./coin-icon";

// end-of-week summary, sized to screenshot for the group chat.
// only shows once every game in the week is final.
export function WeekRecap({ label, games, picks, adjustments, members }: {
  label: string;
  games: Game[];
  picks: Pick[];
  adjustments: Adjustment[];
  members: Profile[];
}) {
  if (!games.length || !games.every((g) => g.status === "post" || g.status === "void")) return null;

  const byGame = new Map(games.map((g) => [g.id, g]));
  // points for everyone who actually played this week
  const pts = new Map<string, number>();
  for (const p of picks) {
    const g = byGame.get(p.game_id);
    pts.set(p.user_id, (pts.get(p.user_id) ?? 0) + (g && pickIsRight(g, p.side) ? pointsFor(g) : 0));
  }
  for (const a of adjustments) pts.set(a.user_id, (pts.get(a.user_id) ?? 0) + a.points);

  const coin = members.find((m) => m.is_bot);
  const humans = members.filter((m) => !m.is_bot && pts.has(m.id));
  if (!humans.length) return null;
  const sorted = [...humans].sort((a, b) => pts.get(b.id)! - pts.get(a.id)!);
  const top = pts.get(sorted[0].id)!;
  const bottom = pts.get(sorted[sorted.length - 1].id)!;
  const winners = top > 0 ? sorted.filter((m) => pts.get(m.id) === top) : [];
  const losers = top === bottom ? [] : sorted.filter((m) => pts.get(m.id) === bottom);

  // biggest upset: the finished game where the fewest people had the winner
  const humanIds = new Set(humans.map((m) => m.id));
  let upset: { game: Game; had: Profile[]; total: number } | null = null;
  for (const g of games) {
    if (g.status !== "post" || !g.winner || g.winner === "tie") continue;
    const onIt = picks.filter((p) => p.game_id === g.id && humanIds.has(p.user_id));
    if (!onIt.length) continue;
    const had = onIt.filter((p) => p.side === g.winner).map((p) => members.find((m) => m.id === p.user_id)!);
    const share = had.length / onIt.length;
    if (share < 0.5 && (!upset || share < upset.had.length / upset.total)) upset = { game: g, had, total: onIt.length };
  }

  const featured = games.find((g) => g.featured && g.status === "post" && g.winner && g.winner !== "tie");
  const featuredHad = featured
    ? picks
        .filter((p) => p.game_id === featured.id && p.side === featured.winner && humanIds.has(p.user_id))
        .map((p) => members.find((m) => m.id === p.user_id)!)
    : [];

  const coinPts = coin && pts.has(coin.id) ? pts.get(coin.id)! : null;
  const beatCoin = coinPts === null ? [] : humans.filter((m) => pts.get(m.id)! > coinPts);
  const lostToCoin = coinPts === null ? [] : humans.filter((m) => pts.get(m.id)! < coinPts);

  const team = (g: Game, side: "home" | "away") => (side === "home" ? g.home_abbr : g.away_abbr);
  return (
    <Card className="bg-gradient-to-br from-card to-muted/40">
      <CardHeader>
        <CardTitle className="font-heading text-lg">{label} recap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {winners.length > 0 && (
          <p className="flex items-baseline gap-2">
            <TrophyIcon className="size-4 shrink-0 translate-y-0.5 text-live" />
            <span>
              <Names list={winners} /> {winners.length > 1 ? "tied for the week" : "won the week"} with{" "}
              <b className="font-mono">{top}</b> pts
            </span>
          </p>
        )}
        {losers.length > 0 && (
          <p className="flex items-baseline gap-2 text-muted-foreground">
            <TrendingDownIcon className="size-4 shrink-0 translate-y-0.5" />
            <span>
              <Names list={losers} /> brought up the rear with <b className="font-mono">{bottom}</b>
            </span>
          </p>
        )}
        {featured && (
          <p className="flex items-baseline gap-2">
            <StarIcon className="size-4 shrink-0 translate-y-0.5 fill-live text-live" />
            <span>
              featured: <b>{team(featured, featured.winner as "home" | "away")}</b> won.{" "}
              {featuredHad.length ? (
                <>
                  <Names list={featuredHad} /> cashed the double
                </>
              ) : (
                "nobody had it"
              )}
            </span>
          </p>
        )}
        {upset && (
          <p className="flex items-baseline gap-2">
            <ZapIcon className="size-4 shrink-0 translate-y-0.5 text-live" />
            <span>
              upset of the week: <b>{team(upset.game, upset.game.winner as "home" | "away")}</b> over{" "}
              {team(upset.game, upset.game.winner === "home" ? "away" : "home")}.{" "}
              {upset.had.length ? (
                <>
                  only <Names list={upset.had} /> saw it coming
                </>
              ) : (
                "nobody saw it coming"
              )}
            </span>
          </p>
        )}
        {coinPts !== null && (
          <p className="flex items-baseline gap-2">
            <CoinIcon className="size-4 translate-y-0.5" />
            <span>
              the coin got <b className="font-mono">{coinPts}</b>.{" "}
              {lostToCoin.length > 0 ? (
                <>
                  it beat <Names list={lostToCoin} />
                </>
              ) : beatCoin.length === humans.length ? (
                "everyone beat it"
              ) : (
                "nobody lost to it"
              )}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function marker(m: Profile): Marker {
  return { name: firstName(m.name).toLowerCase(), color: m.marker_color, font: m.marker_font, bot: m.is_bot };
}

// "a, b & c" written in each person's own marker
function Names({ list }: { list: Profile[] }) {
  return (
    <>
      {list.map((m, i) => (
        <span key={m.id}>
          {i > 0 && (i === list.length - 1 ? " & " : ", ")}
          <span style={markerStyle(marker(m))} className="text-[1.15em]">
            {marker(m).name}
          </span>
        </span>
      ))}
    </>
  );
}
