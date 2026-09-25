import type { MarkerColor, MarkerFont } from "@/lib/markers";

export type Profile = {
  id: string;
  email: string | null;
  name: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_bot: boolean;
  onboarded: boolean;
  approved: boolean;
  marker_color: MarkerColor;
  marker_font: MarkerFont;
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
  network: string | null;
  winner: "home" | "away" | "tie" | null;
  featured: boolean;
};

export type Side = "home" | "away";
// flat points for a week, for old whiteboard weeks where only totals are known
// correct/decided are the right-wrong record behind it, when known
export type Adjustment = {
  user_id: string;
  week_id: number;
  points: number;
  correct: number | null;
  decided: number | null;
  edited: boolean;
  // college / nfl split, when known (whiteboard back-fills)
  cfb_points?: number | null;
  nfl_points?: number | null;
  // copied from the coin (joined mid-season / matched coin), left out of "true points"
  from_coin?: boolean;
};

// edited = an admin changed it (shown with an asterisk)
// auto = they missed it and the coin picked for them at kickoff
export type Pick = {
  user_id: string;
  game_id: number;
  side: Side;
  updated_at?: string;
  edited?: boolean;
  auto?: boolean;
};
