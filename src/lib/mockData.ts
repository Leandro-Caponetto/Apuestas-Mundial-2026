import { Match, Team, Profile } from '../types';
import { WORLD_CUP_TEAMS } from './constants';

export const MOCK_TEAMS: Team[] = [
  // Group A (MEX, CAN)
  { id: 'mex', name: 'México', code: 'MEX', flag_url: 'https://flagcdn.com/w160/mx.png', group_name: 'A' },
  { id: 'can', name: 'Canadá', code: 'CAN', flag_url: 'https://flagcdn.com/w160/ca.png', group_name: 'A' },
  { id: 'usa', name: 'EE.UU.', code: 'USA', flag_url: 'https://flagcdn.com/w160/us.png', group_name: 'D' },
  { id: 'arg', name: 'Argentina', code: 'ARG', flag_url: 'https://flagcdn.com/w160/ar.png', group_name: 'B' },
  { id: 'bra', name: 'Brasil', code: 'BRA', flag_url: 'https://flagcdn.com/w160/br.png', group_name: 'C' },
  { id: 'fra', name: 'Francia', code: 'FRA', flag_url: 'https://flagcdn.com/w160/fr.png', group_name: 'E' },
  { id: 'ger', name: 'Alemania', code: 'GER', flag_url: 'https://flagcdn.com/w160/de.png', group_name: 'F' },
  { id: 'esp', name: 'España', code: 'ESP', flag_url: 'https://flagcdn.com/w160/es.png', group_name: 'G' },
  { id: 'tbd1', name: 'Por Clasificar', code: 'TBD', flag_url: '', group_name: 'A' },
  { id: 'tbd2', name: 'Por Clasificar', code: 'TBD', flag_url: '', group_name: 'D' },
];

export const MOCK_MATCHES: Match[] = [
  {
    id: 'm1',
    home_team_id: 'mex',
    away_team_id: 'tbd1',
    start_at: '2026-06-11T20:00:00Z',
    phase: 'group',
    home_score: null,
    away_score: null,
    status: 'pending',
    group_name: 'A',
    home_team: WORLD_CUP_TEAMS.find(t => t.code === 'MEX'),
    away_team: { id: 'tbd1', name: 'TBD (A2)', code: 'TBD', flag_url: '', group_name: 'A' }
  },
  {
    id: 'm2',
    home_team_id: 'tbd2',
    away_team_id: 'tbd3',
    start_at: '2026-06-11T23:00:00Z',
    phase: 'group',
    home_score: null,
    away_score: null,
    status: 'pending',
    group_name: 'A',
    home_team: { id: 'tbd2', name: 'TBD (A3)', code: 'TBD', flag_url: '', group_name: 'A' },
    away_team: { id: 'tbd3', name: 'TBD (A4)', code: 'TBD', flag_url: '', group_name: 'A' }
  },
  {
    id: 'm3',
    home_team_id: 'can',
    away_team_id: 'tbd4',
    start_at: '2026-06-12T19:00:00Z',
    phase: 'group',
    home_score: null,
    away_score: null,
    status: 'pending',
    group_name: 'B',
    home_team: WORLD_CUP_TEAMS.find(t => t.code === 'CAN'),
    away_team: { id: 'tbd4', name: 'TBD (B2)', code: 'TBD', flag_url: '', group_name: 'B' }
  },
  {
    id: 'm4',
    home_team_id: 'usa',
    away_team_id: 'tbd5',
    start_at: '2026-06-12T22:00:00Z',
    phase: 'group',
    home_score: null,
    away_score: null,
    status: 'pending',
    group_name: 'D',
    home_team: WORLD_CUP_TEAMS.find(t => t.code === 'USA'),
    away_team: { id: 'tbd5', name: 'TBD (D2)', code: 'TBD', flag_url: '', group_name: 'D' }
  },
  {
    id: 'm5',
    home_team_id: 'arg',
    away_team_id: 'tbd6',
    start_at: '2026-06-14T18:00:00Z',
    phase: 'group',
    home_score: null,
    away_score: null,
    status: 'pending',
    group_name: 'C',
    home_team: WORLD_CUP_TEAMS.find(t => t.code === 'ARG'),
    away_team: { id: 'tbd6', name: 'TBD (C2)', code: 'TBD', flag_url: '', group_name: 'C' }
  },
  {
    id: 'm6',
    home_team_id: 'bra',
    away_team_id: 'tbd7',
    start_at: '2026-06-15T15:00:00Z',
    phase: 'group',
    home_score: null,
    away_score: null,
    status: 'pending',
    group_name: 'E',
    home_team: WORLD_CUP_TEAMS.find(t => t.code === 'BRA'),
    away_team: { id: 'tbd7', name: 'TBD (E2)', code: 'TBD', flag_url: '', group_name: 'E' }
  }
];

export const MOCK_USER: Profile = {
  id: 'u1',
  username: 'demo_user',
  full_name: 'Usuario Demo',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  points: 15,
  balance: 1000
};

export const MOCK_LEADERBOARD: Profile[] = [
  { id: 'u1', username: 'demo_user', full_name: 'Usuario Demo', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', points: 151, balance: 1000 },
  { id: 'u2', username: 'messi10', full_name: 'Lionel Messi', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lionel', points: 120, balance: 5000 },
  { id: 'u3', username: 'cr7', full_name: 'Cristiano Ronaldo', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cristiano', points: 115, balance: 4500 },
  { id: 'u4', username: 'mbappe', full_name: 'Kylian Mbappé', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kylian', points: 98, balance: 3000 },
  { id: 'u5', username: 'neymar', full_name: 'Neymar Jr', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neymar', points: 85, balance: 2500 },
];
