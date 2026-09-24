export type Profile = {
  id: string;
  email: string | null;
  name: string;
  avatar_url: string | null;
  is_admin: boolean;
  approved: boolean;
};

export type Week = { id: number; season: number; label: string; created_at: string };

export type Game = {
  id: number;
  week_id: number;
  league: "nfl" | "ncaaf";
  espn_id: string;
  kickoff: string;
  home_name: string;
  home_abbr: string;
  home_logo: string | null;
  home_rank: number | null;
  away_name: string;
  away_abbr: string;
  away_logo: string | null;
  away_rank: number | null;
  home_score: number | null;
  away_score: number | null;
  status: "pre" | "in" | "post" | "void";
  status_detail: string | null;
  winner: "home" | "away" | "tie" | null;
  featured: boolean;
};

export type Side = "home" | "away";
export type Pick = { user_id: string; game_id: number; side: Side };
