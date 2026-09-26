import { StarIcon, TrendingDownIcon, TrophyIcon, ZapIcon } from "lucide-react";
import { firstName } from "@/lib/format";
import { markerStyle, type Marker } from "@/lib/markers";
import { weekRecap } from "@/lib/recap";
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
  const recap = weekRecap(games, picks, adjustments, members);
  if (!recap) return null;
  const { humans, top, bottom, winners, losers, upset, featured, featuredHad, coinPts, beatCoin, lostToCoin } = recap;
  const featuredTie = featured?.winner === "tie";

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
              {featuredTie ? (
                <>featured game ended in a tie. </>
              ) : (
                <>
                  featured: <b>{team(featured, featured.winner as "home" | "away")}</b> won.{" "}
                </>
              )}
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
