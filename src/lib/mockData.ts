import { Match, Team, Profile } from '../types';
import { WORLD_CUP_TEAMS, GROUPS } from './constants';

export const MOCK_TEAMS: Team[] = WORLD_CUP_TEAMS;

// Official 72 group stage matches for the 2026 World Cup matching the user schedule
const teamByCode = (code: string): Team => {
  const normCode = code.toUpperCase();
  const team = WORLD_CUP_TEAMS.find(t => t.code.toUpperCase() === normCode);
  if (!team) {
    throw new Error(`Team not found for code: ${code}`);
  }
  return team;
};

const RAW_MATCHES_INFO = [
  // --- SÁBADO 13 JUNIO 2026 ---
  { home: 'QAT', away: 'SUI', date: '2026-06-13T16:00:00Z', group: 'B' },
  { home: 'BRA', away: 'MAR', date: '2026-06-13T19:00:00Z', group: 'C' },
  { home: 'HAI', away: 'SCO', date: '2026-06-13T22:00:00Z', group: 'C' },

  // --- DOMINGO 14 JUNIO 2026 ---
  { home: 'AUS', away: 'TUR', date: '2026-06-14T01:00:00Z', group: 'D' },
  { home: 'GER', away: 'CUW', date: '2026-06-14T14:00:00Z', group: 'E' },
  { home: 'NED', away: 'JPN', date: '2026-06-14T17:00:00Z', group: 'F' },
  { home: 'CIV', away: 'ECU', date: '2026-06-14T20:00:00Z', group: 'E' },
  { home: 'SWE', away: 'TUN', date: '2026-06-14T23:00:00Z', group: 'F' },

  // --- LUNES 15 JUNIO 2026 ---
  { home: 'ESP', away: 'CPV', date: '2026-06-15T13:00:00Z', group: 'H' },
  { home: 'BEL', away: 'EGY', date: '2026-06-15T16:00:00Z', group: 'G' },
  { home: 'KSA', away: 'URU', date: '2026-06-15T19:00:00Z', group: 'H' },
  { home: 'IRN', away: 'NZL', date: '2026-06-15T22:00:00Z', group: 'G' },

  // --- MARTES 16 JUNIO 2026 ---
  { home: 'FRA', away: 'SEN', date: '2026-06-16T16:00:00Z', group: 'I' },
  { home: 'IRQ', away: 'NOR', date: '2026-06-16T19:00:00Z', group: 'I' },
  { home: 'ARG', away: 'ALG', date: '2026-06-16T22:00:00Z', group: 'J' },

  // --- MIÉRCOLES 17 JUNIO 2026 ---
  { home: 'AUT', away: 'JOR', date: '2026-06-17T01:00:00Z', group: 'J' },
  { home: 'POR', away: 'COD', date: '2026-06-17T14:00:00Z', group: 'K' },
  { home: 'ENG', away: 'CRO', date: '2026-06-17T17:00:00Z', group: 'L' },
  { home: 'GHA', away: 'PAN', date: '2026-06-17T20:00:00Z', group: 'L' },
  { home: 'UZB', away: 'COL', date: '2026-06-17T23:00:00Z', group: 'K' },

  // --- JUEVES 18 JUNIO 2026 ---
  { home: 'CZE', away: 'RSA', date: '2026-06-18T13:00:00Z', group: 'A' },
  { home: 'SUI', away: 'BIH', date: '2026-06-18T16:00:00Z', group: 'B' },
  { home: 'CAN', away: 'QAT', date: '2026-06-18T19:00:00Z', group: 'B' },
  { home: 'MEX', away: 'KOR', date: '2026-06-18T22:00:00Z', group: 'A' },

  // --- VIERNES 19 JUNIO 2026 ---
  { home: 'USA', away: 'AUS', date: '2026-06-19T16:00:00Z', group: 'D' },
  { home: 'SCO', away: 'MAR', date: '2026-06-19T19:00:00Z', group: 'C' },
  { home: 'BRA', away: 'HAI', date: '2026-06-19T21:30:00Z', group: 'C' },

  // --- SÁBADO 20 JUNIO 2026 ---
  { home: 'TUR', away: 'PAR', date: '2026-06-20T00:00:00Z', group: 'D' },
  { home: 'NED', away: 'SWE', date: '2026-06-20T14:00:00Z', group: 'F' },
  { home: 'GER', away: 'CIV', date: '2026-06-20T17:00:00Z', group: 'E' },
  { home: 'ECU', away: 'CUW', date: '2026-06-20T21:00:00Z', group: 'E' },

  // --- DOMINGO 21 JUNIO 2026 ---
  { home: 'TUN', away: 'JPN', date: '2026-06-21T01:00:00Z', group: 'F' },
  { home: 'ESP', away: 'KSA', date: '2026-06-21T13:00:00Z', group: 'H' },
  { home: 'BEL', away: 'IRN', date: '2026-06-21T16:00:00Z', group: 'G' },
  { home: 'URU', away: 'CPV', date: '2026-06-21T19:00:00Z', group: 'H' },
  { home: 'NZL', away: 'EGY', date: '2026-06-21T22:00:00Z', group: 'G' },

  // --- LUNES 22 JUNIO 2026 ---
  { home: 'ARG', away: 'AUT', date: '2026-06-22T14:00:00Z', group: 'J' },
  { home: 'FRA', away: 'IRQ', date: '2026-06-22T18:00:00Z', group: 'I' },
  { home: 'NOR', away: 'SEN', date: '2026-06-22T21:00:00Z', group: 'I' },

  // --- MARTES 23 JUNIO 2026 ---
  { home: 'JOR', away: 'ALG', date: '2026-06-23T00:00:00Z', group: 'J' },
  { home: 'POR', away: 'UZB', date: '2026-06-23T14:00:00Z', group: 'K' },
  { home: 'ENG', away: 'GHA', date: '2026-06-23T17:00:00Z', group: 'L' },
  { home: 'PAN', away: 'CRO', date: '2026-06-23T20:00:00Z', group: 'L' },
  { home: 'COL', away: 'COD', date: '2026-06-23T23:00:00Z', group: 'K' },

  // --- MIÉRCOLES 24 JUNIO 2026 ---
  { home: 'SUI', away: 'CAN', date: '2026-06-24T16:00:00Z', group: 'B' },
  { home: 'BIH', away: 'QAT', date: '2026-06-24T16:00:00Z', group: 'B' },
  { home: 'SCO', away: 'BRA', date: '2026-06-24T19:00:00Z', group: 'C' },
  { home: 'MAR', away: 'HAI', date: '2026-06-24T19:00:00Z', group: 'C' },
  { home: 'CZE', away: 'MEX', date: '2026-06-24T22:00:00Z', group: 'A' },
  { home: 'RSA', away: 'KOR', date: '2026-06-24T22:00:00Z', group: 'A' },

  // --- JUEVES 25 JUNIO 2026 ---
  { home: 'CUW', away: 'CIV', date: '2026-06-25T17:00:00Z', group: 'E' },
  { home: 'ECU', away: 'GER', date: '2026-06-25T17:00:00Z', group: 'E' },
  { home: 'JPN', away: 'SWE', date: '2026-06-25T20:00:00Z', group: 'F' },
  { home: 'TUN', away: 'NED', date: '2026-06-25T20:00:00Z', group: 'F' },
  { home: 'TUR', away: 'USA', date: '2026-06-25T23:00:00Z', group: 'D' },
  { home: 'PAR', away: 'AUS', date: '2026-06-25T23:00:00Z', group: 'D' },

  // --- VIERNES 26 JUNIO 2026 ---
  { home: 'NOR', away: 'FRA', date: '2026-06-26T16:00:00Z', group: 'I' },
  { home: 'SEN', away: 'IRQ', date: '2026-06-26T16:00:00Z', group: 'I' },
  { home: 'CPV', away: 'KSA', date: '2026-06-26T21:00:00Z', group: 'H' },
  { home: 'URU', away: 'ESP', date: '2026-06-26T21:00:00Z', group: 'H' },

  // --- SÁBADO 27 JUNIO 2026 ---
  { home: 'EGY', away: 'IRN', date: '2026-06-27T00:00:00Z', group: 'G' },
  { home: 'NZL', away: 'BEL', date: '2026-06-27T00:00:00Z', group: 'G' },
  { home: 'PAN', away: 'ENG', date: '2026-06-27T18:00:00Z', group: 'L' },
  { home: 'CRO', away: 'GHA', date: '2026-06-27T18:00:00Z', group: 'L' },
  { home: 'COL', away: 'POR', date: '2026-06-27T20:30:00Z', group: 'K' },
  { home: 'COD', away: 'UZB', date: '2026-06-27T20:30:00Z', group: 'K' },
  { home: 'ALG', away: 'AUT', date: '2026-06-27T23:00:00Z', group: 'J' },
  { home: 'JOR', away: 'ARG', date: '2026-06-27T23:00:00Z', group: 'J' },

  // --- JORNADAS PREVIAS / OPENERS (Para grupo completo de 72 partidos) ---
  { home: 'MEX', away: 'RSA', date: '2026-06-11T20:00:00Z', group: 'A' },
  { home: 'KOR', away: 'CZE', date: '2026-06-11T23:00:00Z', group: 'A' },
  { home: 'CAN', away: 'BIH', date: '2026-06-12T15:00:00Z', group: 'B' },
  { home: 'USA', away: 'PAR', date: '2026-06-12T18:00:00Z', group: 'D' },
];

const generateMockMatches = (): Match[] => {
  const matches: Match[] = [];
  let matchIdCounter = 1;

  RAW_MATCHES_INFO.forEach((raw) => {
    const homeTeam = teamByCode(raw.home);
    const awayTeam = teamByCode(raw.away);
    const mId = `m${matchIdCounter++}`;

    matches.push({
      id: mId,
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id,
      start_at: raw.date,
      phase: 'group',
      home_score: null,
      away_score: null,
      status: 'pending',
      group_name: raw.group,
      home_team: homeTeam,
      away_team: awayTeam,
      homeTeam: homeTeam,
      awayTeam: awayTeam,
    });
  });

  // Sort matches chronologically
  return matches.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
};

export const MOCK_MATCHES: Match[] = generateMockMatches();

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

const getTeamByCodeSafe = (code: string): Team | null => {
  const normCode = code.toUpperCase();
  if (normCode === 'ITA') {
    return { id: 'ita', name: 'Italia', code: 'ITA', flag_url: 'https://flagcdn.com/w160/it.png', group_name: 'D' };
  }
  return WORLD_CUP_TEAMS.find(t => t.code.toUpperCase() === normCode) || null;
};

export const getInitialBracket = () => {
  const getT = (code: string) => getTeamByCodeSafe(code);
  return [
    {
      name: 'R32',
      matches: [
        { id: 'r32-0', homeTeam: getT('KOR'), awayTeam: getT('CAN'), status: 'pending' as const, date: '28 JUN', location: 'Estadio Los Angeles', homePlaceholder: '2A', awayPlaceholder: '2B', homeScore: '', awayScore: '' },
        { id: 'r32-1', homeTeam: getT('BRA'), awayTeam: getT('JPN'), status: 'pending' as const, date: '29 JUN', location: 'Estadio Houston', homePlaceholder: '1C', awayPlaceholder: '2F', homeScore: '', awayScore: '' },
        { id: 'r32-2', homeTeam: getT('GER'), awayTeam: getT('BEL'), status: 'pending' as const, date: '29 JUN', location: 'Estadio Boston', homePlaceholder: '1E', awayPlaceholder: '3ABCDF', homeScore: '', awayScore: '' },
        { id: 'r32-3', homeTeam: getT('NED'), awayTeam: getT('MAR'), status: 'pending' as const, date: '29 JUN', location: 'Estadio Monterrey', homePlaceholder: '1F', awayPlaceholder: '2C', homeScore: '', awayScore: '' },
        { id: 'r32-4', homeTeam: getT('ECU'), awayTeam: getT('SEN'), status: 'pending' as const, date: '30 JUN', location: 'Estadio Dallas', homePlaceholder: '2E', awayPlaceholder: '2I', homeScore: '', awayScore: '' },
        { id: 'r32-5', homeTeam: getT('FRA'), awayTeam: getT('USA'), status: 'pending' as const, date: '30 JUN', location: 'Estadio N.Y./N.J.', homePlaceholder: '1I', awayPlaceholder: '3CDFGH', homeScore: '', awayScore: '' },
        { id: 'r32-6', homeTeam: getT('MEX'), awayTeam: getT('SWE'), status: 'pending' as const, date: '30 JUN', location: 'Estadio Ciudad de México', homePlaceholder: '1A', awayPlaceholder: '3CEFHI', homeScore: '', awayScore: '' },
        { id: 'r32-7', homeTeam: getT('ENG'), awayTeam: getT('COL'), status: 'pending' as const, date: '01 JUL', location: 'Estadio Atlanta', homePlaceholder: '1L', awayPlaceholder: '3EHIJK', homeScore: '', awayScore: '' },
        { id: 'r32-8', homeTeam: getT('EGY'), awayTeam: getT('SUI'), status: 'pending' as const, date: '01 JUL', location: 'Estadio Seattle', homePlaceholder: '1G', awayPlaceholder: '3AEHIJ', homeScore: '', awayScore: '' },
        { id: 'r32-9', homeTeam: getT('TUR'), awayTeam: getT('ITA'), status: 'pending' as const, date: '01 JUL', location: 'Estadio Bahía S.F.', homePlaceholder: '1D', awayPlaceholder: '3BEFIJ', homeScore: '', awayScore: '' },
        { id: 'r32-10', homeTeam: getT('ESP'), awayTeam: getT('AUT'), status: 'pending' as const, date: '02 JUL', location: 'Estadio Los Angeles', homePlaceholder: '1H', awayPlaceholder: '2J', homeScore: '', awayScore: '' },
        { id: 'r32-11', homeTeam: getT('POR'), awayTeam: getT('CRO'), status: 'pending' as const, date: '02 JUL', location: 'Estadio Toronto', homePlaceholder: '2K', awayPlaceholder: '2L', homeScore: '', awayScore: '' },
        { id: 'r32-12', homeTeam: getT('QAT'), awayTeam: getT('ARG'), status: 'pending' as const, date: '03 JUL', location: 'Estadio Vancouver', homePlaceholder: '1B', awayPlaceholder: '3EFGIJ', homeScore: '', awayScore: '' },
        { id: 'r32-13', homeTeam: getT('PAR'), awayTeam: getT('URU'), status: 'pending' as const, date: '03 JUL', location: 'Estadio Dallas', homePlaceholder: '2D', awayPlaceholder: '2G', homeScore: '', awayScore: '' },
        { id: 'r32-14', homeTeam: getT('ALG'), awayTeam: getT('TUN'), status: 'pending' as const, date: '03 JUL', location: 'Estadio Miami', homePlaceholder: '1J', awayPlaceholder: '2H', homeScore: '', awayScore: '' },
        { id: 'r32-15', homeTeam: getT('UZB'), awayTeam: getT('PAN'), status: 'pending' as const, date: '03 JUL', location: 'Estadio Kansas City', homePlaceholder: '1K', awayPlaceholder: '3DEIJL', homeScore: '', awayScore: '' }
      ]
    },
    {
      name: 'R16',
      matches: [
        { id: 'r16-0', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '04 JUL', location: 'Estadio Houston', homePlaceholder: 'Ganador R32-0', awayPlaceholder: 'Ganador R32-1', homeScore: '', awayScore: '' },
        { id: 'r16-1', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '04 JUL', location: 'Estadio Filadelfia', homePlaceholder: 'Ganador R32-2', awayPlaceholder: 'Ganador R32-3', homeScore: '', awayScore: '' },
        { id: 'r16-2', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '05 JUL', location: 'Estadio N.Y./N.J.', homePlaceholder: 'Ganador R32-4', awayPlaceholder: 'Ganador R32-5', homeScore: '', awayScore: '' },
        { id: 'r16-3', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '05 JUL', location: 'Estadio Ciudad de México', homePlaceholder: 'Ganador R32-6', awayPlaceholder: 'Ganador R32-7', homeScore: '', awayScore: '' },
        { id: 'r16-4', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '06 JUL', location: 'Estadio Dallas', homePlaceholder: 'Ganador R32-8', awayPlaceholder: 'Ganador R32-9', homeScore: '', awayScore: '' },
        { id: 'r16-5', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '06 JUL', location: 'Estadio Seattle', homePlaceholder: 'Ganador R32-10', awayPlaceholder: 'Ganador R32-11', homeScore: '', awayScore: '' },
        { id: 'r16-6', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '07 JUL', location: 'Estadio Atlanta', homePlaceholder: 'Ganador R32-12', awayPlaceholder: 'Ganador R32-13', homeScore: '', awayScore: '' },
        { id: 'r16-7', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '07 JUL', location: 'Estadio Vancouver', homePlaceholder: 'Ganador R32-14', awayPlaceholder: 'Ganador R32-15', homeScore: '', awayScore: '' }
      ]
    },
    {
      name: 'CUARTOS',
      matches: [
        { id: 'qf-0', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '09 JUL', location: 'Estadio Boston', homePlaceholder: 'Ganador R16-0', awayPlaceholder: 'Ganador R16-1', homeScore: '', awayScore: '' },
        { id: 'qf-1', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '10 JUL', location: 'Estadio Los Angeles', homePlaceholder: 'Ganador R16-2', awayPlaceholder: 'Ganador R16-3', homeScore: '', awayScore: '' },
        { id: 'qf-2', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '11 JUL', location: 'Estadio Miami', homePlaceholder: 'Ganador R16-4', awayPlaceholder: 'Ganador R16-5', homeScore: '', awayScore: '' },
        { id: 'qf-3', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '11 JUL', location: 'Estadio Kansas City', homePlaceholder: 'Ganador R16-6', awayPlaceholder: 'Ganador R16-7', homeScore: '', awayScore: '' }
      ]
    },
    {
      name: 'SEMIFINAL',
      matches: [
        { id: 'sf-0', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '14 JUL', location: 'Estadio Dallas', homePlaceholder: 'Ganador QF-0', awayPlaceholder: 'Ganador QF-1', homeScore: '', awayScore: '' },
        { id: 'sf-1', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '15 JUL', location: 'Estadio Atlanta', homePlaceholder: 'Ganador QF-2', awayPlaceholder: 'Ganador QF-3', homeScore: '', awayScore: '' }
      ]
    },
    {
      name: 'FINAL',
      matches: [
        { id: 'final', homeTeam: null, awayTeam: null, status: 'pending' as const, date: '19 JUL', location: 'Estadio N.Y./N.J.', homePlaceholder: 'Ganador SF-0', awayPlaceholder: 'Ganador SF-1', homeScore: '', awayScore: '' }
      ]
    }
  ];
};
