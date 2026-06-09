export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  nickname?: string;
  created_at: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';
export type MatchStage = 'group' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final';

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
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned?: number;
  submitted_at: string;
  updated_at: string;
}

export interface OutrightPrediction {
  id: string;
  user_id: string;
  predicted_winner_team?: string;
  predicted_top_scorer_id?: string;
  predicted_top_scorer_name?: string;
  winner_points: number;
  scorer_points: number;
  submitted_at: string;
  updated_at: string;
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
