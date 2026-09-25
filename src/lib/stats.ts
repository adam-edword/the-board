import { pointsFor } from "@/lib/format";
import type { Adjustment, Game, Pick, Profile, Week } from "@/lib/types";

// season stats for the standings table and player pages. everything is derived
// from the same games / picks / adjustments the board uses.

export type WeekLine = {
  week: Week;
  done: boolean; // every game final
  played: boolean; // had picks or a back-filled score
  points: number;
  coinPoints: number | null;
  won: boolean; // top score that week (ties count)
};

export type PlayerStats = {
  points: number;
  correct: number;
  decided: number;
  edited: boolean;
  weeks: WeekLine[];
  weekWins: number;
  vsCoin: { w: number; l: number; t: number };
  featured: { hit: number; total: number };
  // picks where most of the group went the other way
  contrarian: { picks: number; wins: number; decided: number };
  crowd: { picks: number; wins: number; decided: number };
  favoriteTeam: { abbr: string; count: number } | null;
};

export function seasonStats(
  weeks: Week[],
  games: Game[],
  picks: Pick[],
  adjustments: Adjustment[],
  members: Profile[],
): Map<string, PlayerStats> {
  const byGame = new Map(games.map((g) => [g.id, g]));
  const humans = new Set(members.filter((m) => !m.is_bot).map((m) => m.id));
  const coinId = members.find((m) => m.is_bot)?.id;
  const out = new Map<string, PlayerStats>();
  const get = (id: string) => {
    let s = out.get(id);
    if (!s) {
      s = {
        points: 0,
        correct: 0,
        decided: 0,
        edited: false,
        weeks: [],
        weekWins: 0,
        vsCoin: { w: 0, l: 0, t: 0 },
        featured: { hit: 0, total: 0 },
        contrarian: { picks: 0, wins: 0, decided: 0 },
        crowd: { picks: 0, wins: 0, decided: 0 },
        favoriteTeam: null,
      };
      out.set(id, s);
    }
    return s;
  };
  for (const m of members) get(m.id);

  // points + record per person per week
  const weekPts = new Map<string, Map<number, number>>(); // user -> week -> pts
  const addPts = (user: string, week: number, pts: number) => {
    const m = weekPts.get(user) ?? new Map<number, number>();
    m.set(week, (m.get(week) ?? 0) + pts);
    weekPts.set(user, m);
  };

  const picksByGame = new Map<number, Pick[]>();
  const teamCounts = new Map<string, Map<string, number>>();
  for (const p of picks) {
    const g = byGame.get(p.game_id);
    if (!g) continue;
    (picksByGame.get(g.id) ?? picksByGame.set(g.id, []).get(g.id)!).push(p);
    const s = get(p.user_id);
    if (p.edited) s.edited = true;
    addPts(p.user_id, g.week_id, 0); // mark as played
    const abbr = p.side === "home" ? g.home_abbr : g.away_abbr;
    const tc = teamCounts.get(p.user_id) ?? new Map<string, number>();
    tc.set(abbr, (tc.get(abbr) ?? 0) + 1);
    teamCounts.set(p.user_id, tc);
    if (g.status !== "post" || !g.winner) continue;
    s.decided++;
    const right = g.winner === p.side;
    if (right) {
      s.correct++;
      s.points += pointsFor(g);
      addPts(p.user_id, g.week_id, pointsFor(g));
    }
    if (g.featured && g.winner !== "tie") {
      s.featured.total++;
      if (right) s.featured.hit++;
    }
  }
  for (const a of adjustments) {
    const s = get(a.user_id);
    s.points += a.points;
    s.correct += a.correct ?? 0;
    s.decided += a.decided ?? 0;
    if (a.edited) s.edited = true;
    addPts(a.user_id, a.week_id, a.points);
  }

  // contrarian vs crowd, humans only, needs at least two other people on the game
  for (const [gid, ps] of picksByGame) {
    const g = byGame.get(gid)!;
    const humanPicks = ps.filter((p) => humans.has(p.user_id));
    for (const p of humanPicks) {
      const others = humanPicks.filter((o) => o.user_id !== p.user_id);
      if (others.length < 2) continue;
      const same = others.filter((o) => o.side === p.side).length;
      const bucket = same < others.length / 2 ? get(p.user_id).contrarian : get(p.user_id).crowd;
      bucket.picks++;
      if (g.status === "post" && g.winner && g.winner !== "tie") {
        bucket.decided++;
        if (g.winner === p.side) bucket.wins++;
      }
    }
  }

  // week lines, week wins, vs coin
  for (const w of weeks) {
    const wg = games.filter((g) => g.week_id === w.id);
    const done = wg.length > 0 && wg.every((g) => g.status === "post" || g.status === "void");
    const played = [...weekPts.entries()].filter(([, m]) => m.has(w.id));
    const best = Math.max(0, ...played.filter(([id]) => humans.has(id)).map(([, m]) => m.get(w.id)!));
    const coinPts = coinId ? (weekPts.get(coinId)?.get(w.id) ?? null) : null;
    for (const m of members) {
      const pts = weekPts.get(m.id)?.get(w.id);
      const s = get(m.id);
      const line: WeekLine = {
        week: w,
        done,
        played: pts !== undefined,
        points: pts ?? 0,
        coinPoints: coinPts,
        won: done && pts !== undefined && best > 0 && pts === best && humans.has(m.id),
      };
      s.weeks.push(line);
      if (line.won) s.weekWins++;
      if (done && line.played && coinPts !== null && m.id !== coinId) {
        if (line.points > coinPts) s.vsCoin.w++;
        else if (line.points < coinPts) s.vsCoin.l++;
        else s.vsCoin.t++;
      }
    }
  }

  for (const [id, tc] of teamCounts) {
    const [abbr, count] = [...tc.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (abbr) get(id).favoriteTeam = { abbr, count };
  }
  return out;
}
