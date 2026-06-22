export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  nickname?: string;
  email?: string;
  created_at: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';
export type MatchStage =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final';

export interface Match {
  id: string;
  api_match_id: string;
  home_team: string;
  away_team: string;
  home_team_flag?: string;
  away_team_flag?: string;
  group_name?: string;
  stage: MatchStage;
  match_time: string;
  home_score?: number;
  away_score?: number;
  status: MatchStatus;
  // Knockout extra-time / penalty data
  went_to_et?: boolean;
  et_home_score?: number;
  et_away_score?: number;
  penalty_winner?: string;
}

export interface Player {
  id: string;
  api_player_id: string;
  name: string;
  team: string;
  photo_url?: string;
  goals: number;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  league_id?: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_et_home_score?: number;
  predicted_et_away_score?: number;
  predicted_penalty_winner?: string;
  points_earned?: number;
  et_points_earned?: number;
  penalty_points_earned?: number;
  submitted_at: string;
  updated_at: string;
}

export interface OutrightPrediction {
  id: string;
  user_id: string;
  league_id?: string;
  predicted_winner_team?: string;
  predicted_top_scorer_id?: string;
  predicted_top_scorer_name?: string;
  winner_points: number;
  scorer_points: number;
  submitted_at: string;
  updated_at: string;
}

export interface League {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  joined_at: string;
  profiles?: { display_name: string; avatar_url?: string };
}

export interface LeaderboardEntry {
  id: string;
  display_name: string;
  avatar_url?: string;
  nickname?: string;
  total_points: number;
  exact_hits: number;
  outcome_hits: number;
  misses: number;
  games_scored: number;
}

export interface ScoringConfig {
  key: string;
  value: number;
  label: string;
}
