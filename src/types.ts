export interface Team {
  id: string;
  name: string;
  code: string;
  flag_url: string;
  group_name: string;
}

export interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  start_at: string;
  phase: 'group' | 'round_32' | 'round_16' | 'quarter' | 'semi' | 'final';
  home_score: number | null;
  away_score: number | null;
  status: 'pending' | 'playing' | 'finished';
  group_name: string;
  home_team?: Team;
  away_team?: Team;
  homeTeam?: Team;
  awayTeam?: Team;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points_earned: number;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  points: number;
}
