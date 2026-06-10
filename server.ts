import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { WORLD_CUP_TEAMS } from './src/lib/constants';
import { MOCK_MATCHES, getInitialBracket } from './src/lib/mockData';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Supabase Admin - fallback to VITE_SUPABASE_ANON_KEY if Service Role Key is missing
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabaseAdminGlobal: any = null;
if (supabaseUrl && supabaseServiceKey && supabaseUrl !== 'your_supabase_url' && supabaseServiceKey !== 'your_supabase_anon_key') {
  supabaseAdminGlobal = createClient(supabaseUrl, supabaseServiceKey);
}

// Helper to get active Supabase client from env or request headers
function getSupabaseAdmin(req?: express.Request): any {
  if (supabaseAdminGlobal) return supabaseAdminGlobal;
  
  const url = process.env.VITE_SUPABASE_URL || (req ? req.headers['x-supabase-url'] : null) as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || (req ? req.headers['x-supabase-key'] : null) as string;
  
  if (url && key && url !== 'your_supabase_url' && key !== 'your_supabase_anon_key' && url !== 'placeholder' && key !== 'placeholder') {
    return createClient(url, key);
  }
  return null;
}

// Let other legacy checks of global supabaseAdmin pass if either is configured
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? supabaseAdminGlobal : null;

app.use(express.json());

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const RAPIDAPI_FOOTBALL_KEY = process.env.RAPIDAPI_FOOTBALL_KEY;

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'demo',
    diagnostics: {
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      supabaseUrlLength: process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL.length : 0,
      hasSupabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      envKeys: Object.keys(process.env).filter(k => k.startsWith('VITE_') || k.includes('KEY') || k.includes('URL') || k.includes('SUPABASE'))
    }
  });
});

// Proxy to get live matches from API-Football (RapidAPI)
app.get('/api/rapidapi/live-matches', async (req, res) => {
  const key = process.env.RAPIDAPI_FOOTBALL_KEY || '4c01bef4c4msh80d107a10f214afp1173e6jsn12be3ea56581';
  if (!key) {
    return res.status(500).json({ error: 'RapidAPI key not configured' });
  }

  try {
    const response = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all', {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'RapidAPI Error', details: err });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy to get list of teams from API-Football (RapidAPI)
app.get('/api/rapidapi/teams', async (req, res) => {
  const key = process.env.RAPIDAPI_FOOTBALL_KEY || '4c01bef4c4msh80d107a10f214afp1173e6jsn12be3ea56581';
  if (!key) {
    return res.status(500).json({ error: 'RapidAPI key not configured' });
  }

  const league = req.query.league || '1'; // League 1 is World Cup by default in api-football
  const season = req.query.season || '2022'; // 2022 is last WC, 2026 will be next

  try {
    const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/teams?league=${league}&season=${season}`, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'RapidAPI Error', details: err });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Proxy to get World Cup matches from football-data.org
app.get('/api/football-data/matches', async (req, res) => {
  if (!FOOTBALL_DATA_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
    });
    
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'API Error', details: err });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const CURATED_KNOCKOUT_MATCHES = [
  // Round of 32
  { home: 'KOR', away: 'CAN', phase: 'round_32', date: '2026-06-28T18:00:00Z', group: 'Estadio Los Angeles', home_score: 1, away_score: 2, status: 'finished' },
  { home: 'BRA', away: 'JPN', phase: 'round_32', date: '2026-06-29T18:00:00Z', group: 'Estadio Houston', home_score: 3, away_score: 1, status: 'finished' },
  { home: 'GER', away: 'BEL', phase: 'round_32', date: '2026-06-29T21:00:00Z', group: 'Estadio Boston', home_score: 2, away_score: 1, status: 'finished' },
  { home: 'NED', away: 'MAR', phase: 'round_32', date: '2026-06-29T15:00:00Z', group: 'Estadio Monterrey', home_score: 1, away_score: 0, status: 'finished' },
  { home: 'ECU', away: 'SEN', phase: 'round_32', date: '2026-06-30T18:00:00Z', group: 'Estadio Dallas', home_score: 1, away_score: 2, status: 'finished' },
  { home: 'FRA', away: 'USA', phase: 'round_32', date: '2026-06-30T21:00:00Z', group: 'Estadio N.Y./N.J.', home_score: 2, away_score: 0, status: 'finished' },
  { home: 'MEX', away: 'SWE', phase: 'round_32', date: '2026-06-30T15:00:00Z', group: 'Estadio Ciudad de México', home_score: 2, away_score: 1, status: 'finished' },
  { home: 'ENG', away: 'COL', phase: 'round_32', date: '2026-07-01T18:00:00Z', group: 'Estadio Atlanta', home_score: 1, away_score: 1, status: 'finished' },
  { home: 'EGY', away: 'SUI', phase: 'round_32', date: '2026-07-01T21:00:00Z', group: 'Estadio Seattle', home_score: 0, away_score: 2, status: 'finished' },
  { home: 'TUR', away: 'ITA', phase: 'round_32', date: '2026-07-01T15:00:00Z', group: 'Estadio Bahía S.F.', home_score: 1, away_score: 2, status: 'finished' },
  { home: 'ESP', away: 'AUT', phase: 'round_32', date: '2026-07-02T18:00:00Z', group: 'Estadio Los Angeles', home_score: 3, away_score: 0, status: 'finished' },
  { home: 'POR', away: 'CRO', phase: 'round_32', date: '2026-07-02T21:00:00Z', group: 'Estadio Toronto', home_score: 2, away_score: 1, status: 'finished' },
  { home: 'QAT', away: 'ARG', phase: 'round_32', date: '2026-07-03T18:00:00Z', group: 'Estadio Vancouver', home_score: 0, away_score: 4, status: 'finished' },
  { home: 'PAR', away: 'URU', phase: 'round_32', date: '2026-07-03T21:00:00Z', group: 'Estadio Dallas', home_score: 1, away_score: 2, status: 'finished' },
  { home: 'ALG', away: 'TUN', phase: 'round_32', date: '2026-07-03T15:00:00Z', group: 'Estadio Miami', home_score: 0, away_score: 1, status: 'finished' },
  { home: 'UZB', away: 'PAN', phase: 'round_32', date: '2026-07-03T23:00:00Z', group: 'Estadio Kansas City', home_score: 2, away_score: 1, status: 'finished' },

  // Round of 16
  { home: 'CAN', away: 'BRA', phase: 'round_16', date: '2026-07-04T18:00:00Z', group: 'Estadio Houston', home_score: 1, away_score: 3, status: 'finished' },
  { home: 'GER', away: 'NED', phase: 'round_16', date: '2026-07-04T21:00:00Z', group: 'Estadio Filadelfia', home_score: 2, away_score: 1, status: 'finished' },
  { home: 'SEN', away: 'FRA', phase: 'round_16', date: '2026-07-05T18:00:00Z', group: 'Estadio N.Y./N.J.', home_score: 0, away_score: 2, status: 'finished' },
  { home: 'MEX', away: 'ENG', phase: 'round_16', date: '2026-07-05T21:00:00Z', group: 'Estadio Ciudad de México', home_score: 1, away_score: 2, status: 'finished' },
  { home: 'SUI', away: 'ITA', phase: 'round_16', date: '2026-07-06T18:00:00Z', group: 'Estadio Dallas', home_score: 1, away_score: 2, status: 'finished' },
  { home: 'ESP', away: 'POR', phase: 'round_16', date: '2026-07-06T21:00:00Z', group: 'Estadio Seattle', home_score: 2, away_score: 1, status: 'finished' },
  { home: 'ARG', away: 'URU', phase: 'round_16', date: '2026-07-07T18:00:00Z', group: 'Estadio Atlanta', home_score: 3, away_score: 2, status: 'finished' },
  { home: 'TUN', away: 'UZB', phase: 'round_16', date: '2026-07-07T21:00:00Z', group: 'Estadio Vancouver', home_score: 0, away_score: 1, status: 'finished' },

  // Quarter Finals
  { home: 'BRA', away: 'GER', phase: 'quarter', date: '2026-07-09T18:00:00Z', group: 'Estadio Boston', home_score: 1, away_score: 2, status: 'finished' },
  { home: 'FRA', away: 'ENG', phase: 'quarter', date: '2026-07-10T21:00:00Z', group: 'Estadio Los Angeles', home_score: 2, away_score: 0, status: 'finished' },
  { home: 'ITA', away: 'ESP', phase: 'quarter', date: '2026-07-11T18:00:00Z', group: 'Estadio Miami', home_score: 1, away_score: 2, status: 'finished' },
  { home: 'ARG', away: 'UZB', phase: 'quarter', date: '2026-07-11T21:00:00Z', group: 'Estadio Kansas City', home_score: 4, away_score: 1, status: 'finished' },

  // Semi Finals
  { home: 'GER', away: 'FRA', phase: 'semi', date: '2026-07-14T18:00:00Z', group: 'Estadio Dallas', home_score: 1, away_score: 2, status: 'finished' },
  { home: 'ESP', away: 'ARG', phase: 'semi', date: '2026-07-15T21:00:00Z', group: 'Estadio Atlanta', home_score: 2, away_score: 3, status: 'finished' },

  // Final
  { home: 'FRA', away: 'ARG', phase: 'final', date: '2026-07-19T20:00:00Z', group: 'Estadio N.Y./N.J.', home_score: 2, away_score: 3, status: 'finished' }
];

async function buildAndSaveBracket(supabaseAdmin: any, dbMatchesOverride?: any[]) {
  try {
    console.log('[BRACKET SYNC] Rebuilding interactive tournament bracket...');
    
    let dbMatches = dbMatchesOverride;
    if (!dbMatches) {
      // Fetch group matches & knockout matches
      const { data, error: matchesErr } = await supabaseAdmin
        .from('matches')
        .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
        .order('start_at', { ascending: true });

      if (matchesErr) {
        console.error('[BRACKET SYNC] Error fetching matches:', matchesErr);
        return [];
      }
      dbMatches = data || [];
    }

    const initialBracket = getInitialBracket();

    // Filter matches for each phase
    const r32Matches = dbMatches.filter((m: any) => m.phase === 'round_32');
    const r16Matches = dbMatches.filter((m: any) => m.phase === 'round_16');
    const qfMatches = dbMatches.filter((m: any) => m.phase === 'quarter');
    const sfMatches = dbMatches.filter((m: any) => m.phase === 'semi');
    const fMatches = dbMatches.filter((m: any) => m.phase === 'final');
    
    const mapTeam = (teamData: any) => {
      if (!teamData) return null;
      return {
        id: teamData.id,
        name: teamData.name,
        code: teamData.code,
        flag_url: teamData.flag_url,
        group_name: teamData.group_name
      };
    };

    const mapBracketMatch = (templateMatch: any, realMatch: any) => {
      if (!realMatch) return templateMatch;
      return {
        ...templateMatch,
        homeTeam: mapTeam(realMatch.home_team),
        awayTeam: mapTeam(realMatch.away_team),
        homeScore: realMatch.home_score !== null && realMatch.home_score !== undefined ? realMatch.home_score.toString() : '',
        awayScore: realMatch.away_score !== null && realMatch.away_score !== undefined ? realMatch.away_score.toString() : '',
        status: realMatch.status === 'finished' ? 'finished' : 'pending',
        date: new Date(realMatch.start_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase(),
        location: realMatch.group_name || templateMatch.location
      };
    };

    // Populate rounds
    const updatedRounds = initialBracket.map((round: any) => {
      const roundName = round.name;
      let pool: any[] = [];
      if (roundName === 'R32') pool = r32Matches;
      else if (roundName === 'R16') pool = r16Matches;
      else if (roundName === 'CUARTOS') pool = qfMatches;
      else if (roundName === 'SEMIFINAL') pool = sfMatches;
      else if (roundName === 'FINAL') pool = fMatches;

      // Sort pool ascending by start_at to maintain chronological mapping
      pool.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

      const updatedMatches = round.matches.map((templateMatch: any, index: number) => {
        return mapBracketMatch(templateMatch, pool[index]);
      });

      return {
        ...round,
        matches: updatedMatches
      };
    });

    const { error: saveErr } = await supabaseAdmin
      .from('tournament_metadata')
      .upsert({ key: 'bracket', data: updatedRounds, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (saveErr) {
      console.error('[BRACKET SYNC] Error saving bracket:', saveErr);
    } else {
      console.log('[BRACKET SYNC] Successfully updated bracket data in tournament_metadata.');
    }

    return updatedRounds;
  } catch (err: any) {
    console.error('[BRACKET SYNC] Exception building bracket:', err);
    return [];
  }
}

let isSynchronizingGlobal = false;

// Sync matches to Supabase
app.post('/api/sync-matches', async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin(req);
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin not configured' });
  }

  if (isSynchronizingGlobal) {
    return res.status(429).json({ error: 'Ya hay un proceso de sincronización oficial en progreso. Por favor, espera un momento.' });
  }
  isSynchronizingGlobal = true;

  try {
    // Ensure all 48 teams exist in the database with correct codes and groups
    try {
      const teamsToUpsert = WORLD_CUP_TEAMS.map(t => ({
        name: t.name,
        code: t.code,
        flag_url: t.flag_url,
        group_name: t.group_name
      }));
      const { error: upsertTeamsError } = await supabaseAdmin
        .from('teams')
        .upsert(teamsToUpsert, { onConflict: 'code' });
      if (upsertTeamsError) {
        console.error('[SYNC] Error seeding teams before sync:', upsertTeamsError);
      } else {
        console.log('[SYNC] Successfully verified/seeded all World Cup 2026 teams in database.');
      }
    } catch (err) {
      console.error('[SYNC] Exception seeding teams:', err);
    }

    // Ensure retired teams and matches are cleaned up before sync
    await cleanRetiredTeams(supabaseAdmin);

    // Dictionary mapping API-Football team names to our standard 3-letter codes
    const nameToCode: Record<string, string> = {
      'argentina': 'ARG',
      'brazil': 'BRA',
      'france': 'FRA',
      'spain': 'ESP',
      'germany': 'GER',
      'belgium': 'BEL',
      'portugal': 'POR',
      'mexico': 'MEX',
      'netherlands': 'NED',
      'usa': 'USA',
      'england': 'ENG',
      'croatia': 'CRO',
      'uruguay': 'URU',
      'switzerland': 'SUI',
      'denmark': 'DEN',
      'senegal': 'SEN',
      'japan': 'JPN',
      'morocco': 'MAR',
      'poland': 'POL',
      'sweden': 'SWE',
      'colombia': 'COL',
      'canada': 'CAN',
      'ecuador': 'ECU',
      'saudi arabia': 'KSA',
      'south korea': 'KOR',
      'korea republic': 'KOR',
      'ghana': 'GHA',
      'cameroon': 'CMR',
      'tunisia': 'TUN',
      'costa rica': 'CRC',
      'australia': 'AUS',
      'qatar': 'QAT',
      'iran': 'IRN',
      'serbia': 'SRB',
      'egypt': 'EGY',
      'italy': 'ITA',
      'nigeria': 'NGA',
      'peru': 'PER',
      'austria': 'AUT',
      'panama': 'PAN',
      'ukraine': 'UKR',
      'ivory coast': 'CIV',
      'paraguay': 'PAR',
      'turkey': 'TUR',
      'norway': 'NOR',
      'algeria': 'ALG',
      'greece': 'GRE',
      'venezuela': 'VEN',
      'mali': 'MLI'
    };

    const getGroupNameFromRound = (round: string): string | null => {
      const match = round.match(/Group\s+([A-L])/i);
      return match ? match[1].toUpperCase() : null;
    };

    const cleanGroupName = (group: string | null | undefined): string | null => {
      if (!group) return null;
      return group.replace(/^(grupo\s+|group\s+|grupo|group|group_)/i, '').trim().toUpperCase();
    };

    const getPhaseFromRound = (round: string): string => {
      const r = round.toLowerCase();
      if (r.includes('group')) return 'group';
      if (r.includes('32') || r.includes('sixteenth') || r.includes('1/16')) return 'round_32';
      if (r.includes('16') || r.includes('eighth') || r.includes('1/8')) return 'round_16';
      if (r.includes('quarter') || r.includes('1/4')) return 'quarter';
      if (r.includes('semi') || r.includes('1/2')) return 'semi';
      if (r.includes('final')) return 'final';
      return 'group';
    };

    const getStatusFromShort = (short: string): string => {
      const s = short.toUpperCase();
      if (['FT', 'AET', 'PEN'].includes(s)) return 'finished';
      if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'INT'].includes(s)) return 'playing';
      return 'pending';
    };

    const results = [];

    // Try parsing from football-data.org if key exists
    if (FOOTBALL_DATA_API_KEY) {
      try {
        console.log('Attempting sync with Football-Data.org...');
        const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
          headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
        });

        if (response.ok) {
          const apiData: any = await response.json();
          const apiMatches = apiData.matches || [];

          const phaseMap: Record<string, string> = {
            'GROUP_STAGE': 'group',
            'LAST_16': 'round_16',
            'ROUND_OF_16': 'round_16',
            'QUARTER_FINALS': 'quarter',
            'SEMI_FINALS': 'semi',
            'FINAL': 'final'
          };

          const { data: teams, error: teamsErr } = await supabaseAdmin.from('teams').select('*');
          if (teamsErr) throw teamsErr;

          const teamMap = new Map(teams.map((t: any) => [t.code, t.id]));

          for (const apiMatch of apiMatches) {
            const homeId = teamMap.get(apiMatch.homeTeam.tla);
            const awayId = teamMap.get(apiMatch.awayTeam.tla);

            if (!homeId || !awayId) continue;

            const matchData = {
              home_team_id: homeId,
              away_team_id: awayId,
              start_at: apiMatch.utcDate,
              phase: phaseMap[apiMatch.stage] || apiMatch.stage.toLowerCase(),
              home_score: apiMatch.score.fullTime.home,
              away_score: apiMatch.score.fullTime.away,
              status: apiMatch.status === 'FINISHED' ? 'finished' : (apiMatch.status === 'IN_PLAY' ? 'playing' : 'pending'),
              group_name: cleanGroupName(apiMatch.group)
            };

            const { data: existing } = await supabaseAdmin
              .from('matches')
              .select('id')
              .eq('home_team_id', homeId)
              .eq('away_team_id', awayId)
              .eq('start_at', apiMatch.utcDate)
              .maybeSingle();

            if (existing) {
              await supabaseAdmin.from('matches').update(matchData).eq('id', existing.id);
              results.push({ id: existing.id, status: 'updated' });
            } else {
              const { data: inserted } = await supabaseAdmin.from('matches').insert([matchData]).select();
              if (inserted) results.push({ id: inserted[0].id, status: 'inserted' });
            }
          }

          return res.json({ success: true, source: 'football-data.org', count: results.length, details: results });
        }
      } catch (err: any) {
        console.warn('Football-Data.org sync failed, falling back to API-Football:', err.message);
      }
    }

    // Fallback / Default sync with API-Football (RapidAPI)
    try {
      console.log('Syncing with API-Football (RapidAPI)...');
      const key = process.env.RAPIDAPI_FOOTBALL_KEY || '4c01bef4c4msh80d107a10f214afp1173e6jsn12be3ea56581';
      
      let fixtures: any[] = [];
      let sourceUsed = 'API-Football (RapidAPI) Season 2026';

      console.log('Fetching API-Football Season 2026...');
      const response = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&season=2026', {
        headers: {
          'x-rapidapi-key': key,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
        }
      });
      if (response.ok) {
        const apiData = await response.json();
        if (apiData.response && apiData.response.length > 0) {
          fixtures = apiData.response;
          console.log(`Successfully fetched ${fixtures.length} matches for World Cup 2026!`);
        } else {
          console.log('No matches returned for World Cup 2026, or plan subscription restriction. Throwing to fallback...');
          throw new Error('Empty 2026 response');
        }
      } else {
        throw new Error(`2026 fetch responded with status code: ${response.status}`);
      }

      // Attempt to merge any actual live World Cup fixtures if they are playing right now
      try {
        console.log('Checking for active live World Cup fixtures (live=all)...');
        const liveResponse = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&live=all', {
          headers: {
            'x-rapidapi-key': key,
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
          }
        });
        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          const liveMatches = liveData.response || [];
          if (liveMatches.length > 0) {
            console.log(`Found ${liveMatches.length} active live World Cup matches! Merging...`);
            for (const lm of liveMatches) {
              const index = fixtures.findIndex(f => f.fixture.id === lm.fixture.id);
              if (index !== -1) {
                fixtures[index] = lm;
              } else {
                fixtures.push(lm);
              }
            }
          }
        }
      } catch (liveErr: any) {
        console.warn('Could not check for active live World Cup matches:', liveErr.message);
      }

      const { data: teams, error: teamsErr } = await supabaseAdmin.from('teams').select('*');
      if (teamsErr) throw teamsErr;

      const teamMap = new Map(teams.map((t: any) => [t.code, t.id]));

      // Securely wipe any mismatching matches (like left over 2022 fallback, or procedural fakes)
      console.log('Wiping out matches database for complete synchrony with the official API feed...');
      await supabaseAdmin.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const insertedKeys = new Set<string>();
      for (const item of fixtures) {
        const apiHomeName = item.teams.home.name.toLowerCase();
        const apiAwayName = item.teams.away.name.toLowerCase();

        const homeCode = nameToCode[apiHomeName];
        const awayCode = nameToCode[apiAwayName];

        const homeId = teamMap.get(homeCode || '');
        const awayId = teamMap.get(awayCode || '');

        if (!homeId || !awayId) {
          // Skip match if teams are not in our World Cup DB
          continue;
        }

        const mTime = item.fixture.date ? new Date(item.fixture.date).toISOString().split('.')[0] + 'Z' : '';
        const keyStr = `${homeId}_${awayId}_${mTime}`;
        if (insertedKeys.has(keyStr)) {
          console.log(`[SYNC] skipping duplicate fixture: ${apiHomeName} vs ${apiAwayName} at ${mTime}`);
          continue;
        }
        insertedKeys.add(keyStr);

        const matchData = {
          home_team_id: homeId,
          away_team_id: awayId,
          start_at: item.fixture.date,
          phase: getPhaseFromRound(item.league.round),
          home_score: item.goals.home,
          away_score: item.goals.away,
          status: getStatusFromShort(item.fixture.status.short),
          group_name: cleanGroupName(getGroupNameFromRound(item.league.round))
        };

        const { data: inserted } = await supabaseAdmin.from('matches').insert([matchData]).select();
        if (inserted) results.push({ id: inserted[0].id, status: 'inserted' });
      }

      const updatedRounds = await buildAndSaveBracket(supabaseAdmin);

      const { data: finalMatches } = await supabaseAdmin
        .from('matches')
        .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
        .order('start_at', { ascending: true });

      res.json({ 
        success: true, 
        source: sourceUsed, 
        count: results.length, 
        details: results,
        matches: finalMatches || [],
        bracket: updatedRounds
      });
    } catch (error: any) {
      console.error('API-Football (RapidAPI) sync failed:', error.message);
      
      let errorMsg = error.message || 'Error desconocido';
      if (errorMsg.includes('subscribed') || errorMsg.includes('403') || errorMsg.includes('not active')) {
        errorMsg = 'No estás suscrito al servicio "API-Football" en RapidAPI. Por favor, asegúrate de haber activado el plan (incluso el gratuito) para este endpoint con tu clave API en: https://rapidapi.com/api-sports/api/api-football';
      } else if (errorMsg.includes('Subscription') || errorMsg.includes('unsubscribed')) {
        errorMsg = 'Debes suscribirte al feed de API-Football en RapidAPI para poder descargar partidos reales.';
      }

      res.status(403).json({ 
        success: false, 
        error: errorMsg,
        details: 'El modo de datos simulados (mock fallback) se ha desactivado a petición del usuario. Configura tu credencial RAPIDAPI_FOOTBALL_KEY para obtener datos reales.',
        wasFallback: false
      });
    }
  } finally {
    isSynchronizingGlobal = false;
  }
});

// Mercado Pago Integration
app.post('/api/create-preference', async (req, res) => {
  const { amount, userId } = req.body;

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Mercado Pago access token not configured' });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preference = new Preference(client);

    // Log incoming request for debugging
    console.log('Creating MP preference for:', { amount, userId });

    // Robust URL handling for the preview environment
    let cleanBaseUrl = 'https://' + req.get('host'); // Use request host as a safer default
    try {
      const referer = req.headers.referer;
      if (referer && referer !== 'null' && !referer.includes('localhost')) {
        const url = new URL(referer);
        cleanBaseUrl = `${url.protocol}//${url.host}`;
      } else {
         // Try to get from origin if referer is not useful
         const origin = req.headers.origin;
         if (origin && origin !== 'null' && !origin.includes('localhost')) {
           const url = new URL(origin);
           cleanBaseUrl = `${url.protocol}//${url.host}`;
         }
      }
    } catch (e) {
      console.warn('Could not parse referer/origin, using fallback:', e);
    }

    // Mercado Pago often requires HTTPS and formal domains for some features
    console.log('Final URL for MP:', cleanBaseUrl);

    const preferenceData = {
      body: {
        items: [
          {
            id: 'recharge',
            title: 'Recarga de Saldo - Copa 2026',
            quantity: 1,
            unit_price: Number(amount),
            currency_id: 'ARS'
          }
        ],
        back_urls: {
          success: `${cleanBaseUrl}/betting`,
          failure: `${cleanBaseUrl}/betting`,
          pending: `${cleanBaseUrl}/betting`,
        },
        auto_return: 'approved',
        // notification_url: `${cleanBaseUrl}/api/mercadopago/webhook`, // Temporarily disable to check if it's the culprit
        metadata: {
          user_id: userId,
          amount: amount
        }
      }
    };

    console.log('Sending Preference Data:', JSON.stringify(preferenceData, null, 2));

    const result = await preference.create(preferenceData);

    console.log('MP Preference created successfully:', result.id);
    res.json({ id: result.id, init_point: result.init_point });
  } catch (error: any) {
    console.error('Error creating MP preference:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optional Webhook to confirm payment (security best practice)
app.post('/api/mercadopago/webhook', async (req, res) => {
  const { query, body } = req;
  const topic = query.topic || query.type;

  if (topic === 'payment' && supabaseAdmin) {
    const paymentId = body.data?.id || query.id;
    
    try {
      // In a real app, you would fetch payment info from MP using the paymentId
      // and update the user balance in Supabase if status is 'approved'.
      // For this demo, we'll assume the client-side success callback handles it 
      // but a webhook is much safer for production.
      console.log('Received MP webhook for payment:', paymentId);
    } catch (error) {
      console.error('Webhook error:', error);
    }
  }
  
  res.sendStatus(200);
});

// Route to clean up retired teams and matches using service role credentials
app.post('/api/admin/clean-retired', async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin(req);
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin not configured' });
  }

  try {
    await cleanRetiredTeams(supabaseAdmin);
    return res.json({ success: true, message: 'Retired teams and associated matches cleaned up successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error cleaning retired teams' });
  }
});

// Admin Route to Resolve Match and Assign PRODE Points
app.post('/api/admin/resolve-match', async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin(req);
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin not configured' });
  }

  const { matchId, homeScore, awayScore } = req.body;

  if (!matchId || homeScore === undefined || awayScore === undefined) {
    return res.status(400).json({ error: 'Missing required parameters: matchId, homeScore, awayScore' });
  }

  try {
    const hScore = Number(homeScore);
    const aScore = Number(awayScore);

    // 1. Update the match scores and status in the DB
    const { error: matchErr } = await supabaseAdmin
      .from('matches')
      .update({
        home_score: hScore,
        away_score: aScore,
        status: 'finished'
      })
      .eq('id', matchId);

    if (matchErr) throw matchErr;

    // 2. Fetch all predictions made for this match
    const { data: predictions, error: predErr } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('match_id', matchId);

    if (predErr) throw predErr;

    // 3. For each prediction, calculate points earned (Exact Score = 3pts, Outcome = 1pt, Wrong = 0pts)
    const userIdsToUpdate = new Set<string>();
    
    if (predictions && predictions.length > 0) {
      for (const pred of predictions) {
        const ph = pred.home_score;
        const pa = pred.away_score;
        let pointsEarned = 0;

        if (ph === hScore && pa === aScore) {
          // Exact score
          pointsEarned = 3;
        } else if (
          (ph > pa && hScore > aScore) || // Predicted home win, real home win
          (ph < pa && hScore < aScore) || // Predicted away win, real away win
          (ph === pa && hScore === aScore) // Predicted draw, real draw
        ) {
          // Correct outcome but wrong score
          pointsEarned = 1;
        }

        userIdsToUpdate.add(pred.user_id);

        const { error: predUpdErr } = await supabaseAdmin
          .from('predictions')
          .update({ points_earned: pointsEarned })
          .eq('id', pred.id);

        if (predUpdErr) {
          console.error(`Error updating prediction score for ${pred.id}:`, predUpdErr);
        }
      }

      // 4. Recalculate total points for all affected profiles
      for (const uid of userIdsToUpdate) {
        const { data: allUserPredictions, error: userPredErr } = await supabaseAdmin
          .from('predictions')
          .select('points_earned')
          .eq('user_id', uid);

        if (userPredErr) {
          console.error(`Error fetching all predictions for user ${uid}:`, userPredErr);
          continue;
        }

        const totalPoints = (allUserPredictions || []).reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0);

        const { error: profUpdErr } = await supabaseAdmin
          .from('profiles')
          .update({ points: totalPoints })
          .eq('id', uid);

        if (profUpdErr) {
          console.error(`Error updating points for profile ${uid}:`, profUpdErr);
        }
      }
    }

    res.json({ success: true, predictionsResolved: predictions?.length || 0 });
  } catch (error: any) {
    console.error('Error resolving match:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Route to Create Match manually
app.post('/api/admin/create-match', async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin(req);
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin not configured' });
  }

  const { home_team_id, away_team_id, start_at, phase, group_name } = req.body;

  if (!home_team_id || !away_team_id || !start_at || !phase) {
    return res.status(400).json({ error: 'Missing required parameters: home_team_id, away_team_id, start_at, phase' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .insert([{
        home_team_id,
        away_team_id,
        start_at,
        phase,
        group_name,
        status: 'pending'
      }])
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)');

    if (error) {
      console.error('Supabase error inserting match:', error);
      throw error;
    }

    res.json({ success: true, match: data ? data[0] : null });
  } catch (error: any) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Route to Delete Match
app.post('/api/admin/delete-match', async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin(req);
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin not configured' });
  }

  const { matchId } = req.body;
  if (!matchId) {
    return res.status(400).json({ error: 'Missing matchId' });
  }

  try {
    // Delete associated predictions first to avoid foreign key violations
    await supabaseAdmin.from('predictions').delete().eq('match_id', matchId);

    const { error } = await supabaseAdmin
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Route to Update Match details (Teams, Dates, etc)
app.post('/api/admin/update-match', async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin(req);
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin not configured' });
  }

  const { matchId, home_team_id, away_team_id, start_at, phase, group_name, status } = req.body;

  if (!matchId) {
    return res.status(400).json({ error: 'Missing matchId parameter' });
  }

  try {
    const updatePayload: any = {};
    if (home_team_id !== undefined) updatePayload.home_team_id = home_team_id;
    if (away_team_id !== undefined) updatePayload.away_team_id = away_team_id;
    if (start_at !== undefined) updatePayload.start_at = start_at;
    if (phase !== undefined) updatePayload.phase = phase;
    if (group_name !== undefined) updatePayload.group_name = group_name;
    if (status !== undefined) updatePayload.status = status;

    const { data, error } = await supabaseAdmin
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId)
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)');

    if (error) {
      console.error('Supabase error updating match:', error);
      throw error;
    }

    res.json({ success: true, match: data ? data[0] : null });
  } catch (error: any) {
    console.error('Error updating match:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Route to Reset all fixtures to correct World Cup matches
app.post('/api/admin/reset-fixtures', async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin(req);
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin not configured' });
  }

  try {
    // 1. Clear old predictions and matches
    await supabaseAdmin.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: delMatchesError } = await supabaseAdmin.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delMatchesError) throw delMatchesError;

    // 2. Register/Upsert all 32 real World Cup 2022 Teams
    const teamsToUpsert = WORLD_CUP_TEAMS.map(t => ({
      name: t.name,
      code: t.code,
      flag_url: t.flag_url,
      group_name: t.group_name
    }));

    const { error: upsertTeamsError } = await supabaseAdmin
      .from('teams')
      .upsert(teamsToUpsert, { onConflict: 'code' });
    if (upsertTeamsError) throw upsertTeamsError;

    // 3. Fetch all teams to map codes to UUIDs
    const { data: dbTeams, error: teamsError } = await supabaseAdmin.from('teams').select('id, code, name');
    if (teamsError) throw teamsError;

    // 4. Safely delete any leftover teams from old mock layouts (48-team formats)
    const validCodes = WORLD_CUP_TEAMS.map(t => t.code.toUpperCase());
    const extraTeams = (dbTeams || []).filter((t: any) => !validCodes.includes(t.code.toUpperCase()));
    for (const et of extraTeams) {
      await supabaseAdmin.from('teams').delete().eq('id', et.id);
    }

    // 5. Build dynamic code Map
    const teamMap = new Map();
    (dbTeams || []).forEach((t: any) => {
      teamMap.set(t.code.toUpperCase(), t.id);
    });

    // 6. Map and insert all 48 official group stage matches
    const insertData = [];
    for (const match of MOCK_MATCHES) {
      const homeCode = (match.home_team_id || '').toUpperCase();
      const awayCode = (match.away_team_id || '').toUpperCase();

      const homeUUID = teamMap.get(homeCode);
      const awayUUID = teamMap.get(awayCode);

      if (!homeUUID || !awayUUID) {
        continue;
      }

      insertData.push({
        home_team_id: homeUUID,
        away_team_id: awayUUID,
        start_at: match.start_at,
        phase: match.phase || 'group',
        home_score: match.home_score,
        away_score: match.away_score,
        status: match.status || 'pending',
        group_name: match.group_name
      });
    }

    if (insertData.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('matches').insert(insertData);
      if (insertError) throw insertError;
    }

    res.json({ success: true, count: insertData.length });
  } catch (error: any) {
    console.error('Error resetting fixtures:', error);
    res.status(500).json({ error: error.message });
  }
});

async function cleanRetiredTeams(supabaseClient: any) {
  try {
    if (!supabaseClient) {
      console.log('Database client not configured yet for cleaning retired teams.');
      return;
    }
    console.log('[CLEANUP] Checking for retired/legacy teams in database (like Chile)...');
    const { data: dbTeams, error: fetchErr } = await supabaseClient.from('teams').select('id, name, code');
    if (fetchErr) {
      console.error('[CLEANUP] Error fetching teams for cleaning:', fetchErr);
      return;
    }
    if (!dbTeams || dbTeams.length === 0) {
      console.log('[CLEANUP] Teams table is empty.');
      return;
    }

    const VALID_TEAM_CODES = [
      'MEX', 'CAN', 'ECU', 'QAT',
      'ARG', 'KSA', 'POL', 'EGY',
      'FRA', 'AUS', 'DEN', 'TUN',
      'ESP', 'GER', 'JPN', 'CRC',
      'BRA', 'SUI', 'SRB', 'CMR',
      'POR', 'GHA', 'URU', 'KOR',
      'ENG', 'USA', 'ITA', 'NED',
      'BEL', 'MAR', 'CRO', 'NGA',
      'COL', 'SEN', 'AUT', 'PER',
      'PAN', 'SWE', 'UKR', 'CIV',
      'PAR', 'TUR', 'NOR', 'ALG',
      'IRN', 'GRE', 'VEN', 'MLI'
    ];

    const retiredTeams = dbTeams.filter((t: any) => {
      if (!t.code) return false;
      const uppercaseCode = t.code.toUpperCase();
      if (uppercaseCode === 'TBD') return false;
      return !VALID_TEAM_CODES.includes(uppercaseCode);
    });

    if (retiredTeams.length === 0) {
      console.log('[CLEANUP] No retired teams found in database. All teams are valid!');
      return;
    }

    console.log(`[CLEANUP] Found ${retiredTeams.length} retired teams to clean:`, retiredTeams.map((t: any) => `${t.name} (${t.code})`));

    for (const team of retiredTeams) {
      // 1. Find all associated matches
      const { data: associatedMatches, error: matchesErr } = await supabaseClient
        .from('matches')
        .select('id')
        .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`);

      if (matchesErr) {
        console.error(`[CLEANUP] Error fetching matches for retired team ${team.name}:`, matchesErr);
        continue;
      }

      if (associatedMatches && associatedMatches.length > 0) {
        const matchIds = associatedMatches.map((m: any) => m.id);
        console.log(`[CLEANUP] Deleting predictions for ${associatedMatches.length} matches of retired team ${team.name}...`);
        await supabaseClient.from('predictions').delete().in('match_id', matchIds);
        
        console.log(`[CLEANUP] Deleting ${associatedMatches.length} matches of retired team ${team.name}...`);
        await supabaseClient.from('matches').delete().in('id', matchIds);
      }

      // 2. Delete team
      const { error: deleteErr } = await supabaseClient.from('teams').delete().eq('id', team.id);
      if (deleteErr) {
        console.error(`[CLEANUP] Error deleting retired team ${team.name}:`, deleteErr);
      } else {
        console.log(`[CLEANUP] Successfully deleted retired team from database: ${team.name} (${team.code})`);
      }
    }
  } catch (err: any) {
    console.error('[CLEANUP] Exception during cleaning retired teams:', err);
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Clean retired teams on boot using admin credentials
  if (supabaseAdmin) {
    cleanRetiredTeams(supabaseAdmin).catch(e => console.error('[CLEANUP] Error on startup clean:', e));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('--- STARTUP ENVIRONMENT DIAGNOSTICS ---');
    console.log('VITE_SUPABASE_URL is configured:', !!process.env.VITE_SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY is configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('VITE_SUPABASE_ANON_KEY is configured:', !!process.env.VITE_SUPABASE_ANON_KEY);
    console.log('Keys in process.env containing VITE, KEY or URL:', Object.keys(process.env).filter(k => k.includes('VITE_') || k.includes('KEY') || k.includes('URL') || k.includes('SUPABASE')));
    console.log('----------------------------------------');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
