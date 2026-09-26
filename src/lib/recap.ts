import { pickIsRight, pointsFor } from "@/lib/format";
import type { Adjustment, Game, Pick, Profile } from "@/lib/types";

export type Recap = {
  pts: Map<string, number>; // everyone who played this week (coin included)
  humans: Profile[]; // people who played, best week first
  top: number;
  bottom: number;
  winners: Profile[];
  losers: Profile[];
  upset: { game: Game; had: Profile[]; total: number } | null;
  featured: Game | undefined;
  featuredHad: Profile[];
  coinPts: number | null;
  beatCoin: Profile[];
  lostToCoin: Profile[];
};

export function weekIsFinal(games: { status: string }[]) {
  return games.length > 0 && games.every((g) => g.status === "post" || g.status === "void");
}

// end-of-week numbers behind the board's recap card and the discord report.
// null until every game in the week is final (or if nobody played).
export function weekRecap(games: Game[], picks: Pick[], adjustments: Adjustment[], members: Profile[]): Recap | null {
  if (!weekIsFinal(games)) return null;

  const byGame = new Map(games.map((g) => [g.id, g]));
  // points for everyone who actually played this week
  const pts = new Map<string, number>();
  for (const p of picks) {
    const g = byGame.get(p.game_id);
    pts.set(p.user_id, (pts.get(p.user_id) ?? 0) + (g && pickIsRight(g, p.side) ? pointsFor(g) : 0));
  }
  for (const a of adjustments) pts.set(a.user_id, (pts.get(a.user_id) ?? 0) + a.points);

  const coin = members.find((m) => m.is_bot);
  const humans = members.filter((m) => !m.is_bot && pts.has(m.id)).sort((a, b) => pts.get(b.id)! - pts.get(a.id)!);
  if (!humans.length) return null;
  const top = pts.get(humans[0].id)!;
  const bottom = pts.get(humans[humans.length - 1].id)!;
  const winners = top > 0 ? humans.filter((m) => pts.get(m.id) === top) : [];
  const losers = top === bottom ? [] : humans.filter((m) => pts.get(m.id) === bottom);

  // biggest upset: the finished game where the fewest people had the winner
  const humanIds = new Set(humans.map((m) => m.id));
  let upset: Recap["upset"] = null;
  for (const g of games) {
    if (g.status !== "post" || !g.winner || g.winner === "tie") continue;
    const onIt = picks.filter((p) => p.game_id === g.id && humanIds.has(p.user_id));
    if (!onIt.length) continue;
    const had = onIt.filter((p) => p.side === g.winner).map((p) => members.find((m) => m.id === p.user_id)!);
    const share = had.length / onIt.length;
    if (share < 0.5 && (!upset || share < upset.had.length / upset.total)) upset = { game: g, had, total: onIt.length };
  }

  const featured = games.find((g) => g.featured && g.status === "post" && g.winner);
  const featuredHad = featured
    ? picks
        .filter((p) => p.game_id === featured.id && pickIsRight(featured, p.side) && humanIds.has(p.user_id))
        .map((p) => members.find((m) => m.id === p.user_id)!)
    : [];

  const coinPts = coin && pts.has(coin.id) ? pts.get(coin.id)! : null;
  const beatCoin = coinPts === null ? [] : humans.filter((m) => pts.get(m.id)! > coinPts);
  const lostToCoin = coinPts === null ? [] : humans.filter((m) => pts.get(m.id)! < coinPts);

  return { pts, humans, top, bottom, winners, losers, upset, featured, featuredHad, coinPts, beatCoin, lostToCoin };
}
