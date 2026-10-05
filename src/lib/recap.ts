import { pickIsRight, pointsFor } from "@/lib/format";
import type { Adjustment, Game, Pick, Profile } from "@/lib/types";

// the end-of-week summary, shared by the board's recap card and the image the
// bot posts to discord. null until every game in the week is final.
export type Recap = {
  winners: Profile[];
  top: number;
  losers: Profile[];
  bottom: number;
  featured: { team: string | null; had: Profile[] } | null; // team null = tie
  upset: { winner: string; loser: string; had: Profile[] } | null;
  coin: { pts: number; beat: Profile[]; everyoneBeatIt: boolean } | null;
};

export function computeRecap(games: Game[], picks: Pick[], adjustments: Adjustment[], members: Profile[]): Recap | null {
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

  const team = (g: Game, side: "home" | "away") => (side === "home" ? g.home_abbr : g.away_abbr);

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

  const featuredGame = games.find((g) => g.featured && g.status === "post" && g.winner);
  const featured = featuredGame
    ? {
        team: featuredGame.winner === "tie" ? null : team(featuredGame, featuredGame.winner as "home" | "away"),
        had: picks
          .filter((p) => p.game_id === featuredGame.id && pickIsRight(featuredGame, p.side) && humanIds.has(p.user_id))
          .map((p) => members.find((m) => m.id === p.user_id)!),
      }
    : null;

  const coinPts = coin && pts.has(coin.id) ? pts.get(coin.id)! : null;
  return {
    winners,
    top,
    losers,
    bottom,
    featured,
    upset: upset && {
      winner: team(upset.game, upset.game.winner as "home" | "away"),
      loser: team(upset.game, upset.game.winner === "home" ? "away" : "home"),
      had: upset.had,
    },
    coin:
      coinPts === null
        ? null
        : {
            pts: coinPts,
            beat: humans.filter((m) => pts.get(m.id)! < coinPts),
            everyoneBeatIt: humans.every((m) => pts.get(m.id)! > coinPts),
          },
  };
}
