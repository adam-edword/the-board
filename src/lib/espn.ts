// thin wrapper around espn's public (unofficial, keyless) scoreboard api

export type League = "nfl" | "ncaaf";

const SPORT_PATH: Record<League, string> = {
  nfl: "football/nfl",
  ncaaf: "football/college-football",
};

const BASE = "https://site.api.espn.com/apis/site/v2/sports";

export type EspnGame = {
  espnId: string;
  league: League;
  kickoff: string;
  homeName: string;
  homeAbbr: string;
  homeLogo: string | null;
  homeRank: number | null;
  awayName: string;
  awayAbbr: string;
  awayLogo: string | null;
  awayRank: number | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "pre" | "in" | "post" | "void";
  statusDetail: string;
  winner: "home" | "away" | "tie" | null;
  network: string | null;
};

export type Schedule = {
  season: number;
  seasonType: number;
  week: number;
  games: EspnGame[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */

function rank(c: any): number | null {
  // scoreboard uses curatedRank, the single-game summary uses rank
  const r = c?.curatedRank?.current ?? (c?.rank != null ? Number(c.rank) : null);
  return typeof r === "number" && r >= 1 && r <= 25 ? r : null;
}

function score(c: any): number | null {
  const s = c?.score;
  if (s == null || s === "") return null;
  const n = Number(typeof s === "object" ? s.value : s);
  return Number.isFinite(n) ? n : null;
}

function parseCompetition(league: League, espnId: string, comp: any): EspnGame {
  const home = comp.competitors.find((c: any) => c.homeAway === "home");
  const away = comp.competitors.find((c: any) => c.homeAway === "away");
  const type = comp.status?.type ?? {};
  const name: string = type.name ?? "";

  let status: EspnGame["status"] = type.state === "in" ? "in" : type.state === "post" ? "post" : "pre";
  if (/CANCELED|POSTPONED|FORFEIT/.test(name)) status = "void";

  const homeScore = score(home);
  const awayScore = score(away);
  let winner: EspnGame["winner"] = null;
  if (status === "post") {
    if (home.winner) winner = "home";
    else if (away.winner) winner = "away";
    else if (homeScore != null && awayScore != null) {
      // no winner flag: fall back to the final score
      winner = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "tie";
    }
  }

  return {
    espnId,
    league,
    kickoff: comp.date,
    homeName: home.team.displayName,
    homeAbbr: home.team.abbreviation,
    homeLogo: home.team.logo ?? home.team.logos?.[0]?.href ?? null,
    homeRank: league === "ncaaf" ? rank(home) : null,
    awayName: away.team.displayName,
    awayAbbr: away.team.abbreviation,
    awayLogo: away.team.logo ?? away.team.logos?.[0]?.href ?? null,
    awayRank: league === "ncaaf" ? rank(away) : null,
    homeScore,
    awayScore,
    status,
    statusDetail: type.shortDetail ?? type.detail ?? "",
    winner,
    network: comp.broadcasts?.[0]?.names?.[0] ?? comp.broadcasts?.[0]?.media?.shortName ?? null,
  };
}

/**
 * games for a given week. leave week/seasonType empty to get whatever espn
 * considers the current week. college is limited to fbs games.
 */
export async function fetchSchedule(
  league: League,
  opts: { week?: number; seasonType?: number } = {},
): Promise<Schedule> {
  const params = new URLSearchParams({ limit: "400" });
  if (opts.week) params.set("week", String(opts.week));
  if (opts.seasonType) params.set("seasontype", String(opts.seasonType));
  if (league === "ncaaf") params.set("groups", "80");

  // schedules barely change, so cache for a couple minutes to keep browsing snappy
  const res = await fetch(`${BASE}/${SPORT_PATH[league]}/scoreboard?${params}`, { next: { revalidate: 120 } });
  if (!res.ok) throw new Error(`espn scoreboard ${res.status}`);
  const data = await res.json();

  const games: EspnGame[] = (data.events ?? []).map((e: any) =>
    parseCompetition(league, String(e.id), e.competitions[0]),
  );
  games.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  return {
    season: data.season?.year ?? new Date().getFullYear(),
    seasonType: data.season?.type ?? opts.seasonType ?? 2,
    week: data.week?.number ?? opts.week ?? 1,
    games,
  };
}

/** latest score/status for a single game */
export async function fetchGame(league: League, espnId: string): Promise<EspnGame> {
  const res = await fetch(`${BASE}/${SPORT_PATH[league]}/summary?event=${espnId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`espn summary ${res.status}`);
  const data = await res.json();
  return parseCompetition(league, espnId, data.header.competitions[0]);
}
