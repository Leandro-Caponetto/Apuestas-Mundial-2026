import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference } from 'mercadopago';

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

// Sync matches to Supabase
app.post('/api/sync-matches', async (req, res) => {
  const supabaseAdmin = getSupabaseAdmin(req);
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin not configured' });
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
    if (r.includes('16') || r.includes('eighth')) return 'round_16';
    if (r.includes('quarter')) return 'quarter';
    if (r.includes('semi')) return 'semi';
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
    
    // Fetch World Cup 2022 fixtures (historical real data of actual matches)
    const response = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&season=2022', {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`API-Football responded with ${response.status}: ${response.statusText}`);
    }

    const apiData = await response.json();
    const fixtures = apiData.response || [];

    const { data: teams, error: teamsErr } = await supabaseAdmin.from('teams').select('*');
    if (teamsErr) throw teamsErr;

    const teamMap = new Map(teams.map((t: any) => [t.code, t.id]));

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

      // Check if match already exists in database
      const { data: existing } = await supabaseAdmin
        .from('matches')
        .select('id')
        .eq('home_team_id', homeId)
        .eq('away_team_id', awayId)
        .eq('start_at', item.fixture.date)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from('matches').update(matchData).eq('id', existing.id);
        results.push({ id: existing.id, status: 'updated' });
      } else {
        const { data: inserted } = await supabaseAdmin.from('matches').insert([matchData]).select();
        if (inserted) results.push({ id: inserted[0].id, status: 'inserted' });
      }
    }

    res.json({ success: true, source: 'API-Football (RapidAPI)', count: results.length, details: results });
  } catch (error: any) {
    console.warn('API-Football sync failed, falling back to local High-Fidelity 2026 World Cup Fixture Generator:', error.message);
    
    try {
      const groupDates: Record<string, string[]> = {
        'A': ['2026-06-11T18:00:00Z', '2026-06-11T21:00:00Z', '2026-06-15T18:00:00Z', '2026-06-15T21:00:00Z', '2026-06-19T18:00:00Z', '2026-06-19T21:00:00Z'],
        'B': ['2026-06-11T19:00:00Z', '2026-06-11T22:00:00Z', '2026-06-15T19:00:00Z', '2026-06-15T22:00:00Z', '2026-06-19T19:00:00Z', '2026-06-19T22:00:00Z'],
        'C': ['2026-06-12T15:00:00Z', '2026-06-12T18:00:00Z', '2026-06-16T15:00:00Z', '2026-06-16T18:00:00Z', '2026-06-20T15:00:00Z', '2026-06-20T18:00:00Z'],
        'D': ['2026-06-12T19:00:00Z', '2026-06-12T22:00:00Z', '2026-06-16T19:00:00Z', '2026-06-16T22:00:00Z', '2026-06-20T19:00:00Z', '2026-06-20T22:00:00Z'],
        'E': ['2026-06-13T15:00:00Z', '2026-06-13T18:00:00Z', '2026-06-17T15:00:00Z', '2026-06-17T18:00:00Z', '2026-06-21T15:00:00Z', '2026-06-21T18:00:00Z'],
        'F': ['2026-06-13T19:00:00Z', '2026-06-13T22:00:00Z', '2026-06-17T19:00:00Z', '2026-06-17T22:00:00Z', '2026-06-21T19:00:00Z', '2026-06-21T22:00:00Z'],
        'G': ['2026-06-14T15:00:00Z', '2026-06-14T18:00:00Z', '2026-06-18T15:00:00Z', '2026-06-18T18:00:00Z', '2026-06-22T15:00:00Z', '2026-06-22T18:00:00Z'],
        'H': ['2026-06-14T19:00:00Z', '2026-06-14T22:00:00Z', '2026-06-18T19:00:00Z', '2026-06-18T22:00:00Z', '2026-06-22T19:00:00Z', '2026-06-22T22:00:00Z'],
        'I': ['2026-06-15T15:00:00Z', '2026-06-15T18:00:00Z', '2026-06-19T15:00:00Z', '2026-06-19T18:00:00Z', '2026-06-23T15:00:00Z', '2026-06-23T18:00:00Z'],
        'J': ['2026-06-15T19:00:00Z', '2026-06-15T22:00:00Z', '2026-06-19T19:00:00Z', '2026-06-19T22:00:00Z', '2026-06-23T19:00:00Z', '2026-06-23T22:00:00Z'],
        'K': ['2026-06-16T15:00:00Z', '2026-06-16T18:00:00Z', '2026-06-20T15:00:00Z', '2026-06-20T18:00:00Z', '2026-06-24T15:00:00Z', '2026-06-24T18:00:00Z'],
        'L': ['2026-06-16T19:00:00Z', '2026-06-16T22:00:00Z', '2026-06-20T19:00:00Z', '2026-06-20T22:00:00Z', '2026-06-24T19:00:00Z', '2026-06-24T22:00:00Z']
      };

      const { data: teams, error: teamsErr } = await supabaseAdmin.from('teams').select('*');
      if (teamsErr) throw teamsErr;

      const localResults = [];
      const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      
      for (const grp of groups) {
        const grpTeams = teams.filter((t: any) => t.group_name === grp);
        if (grpTeams.length < 2) continue;
        
        const groupMatches = [];
        if (grpTeams.length === 4) {
          groupMatches.push({ home: grpTeams[0], away: grpTeams[1], dateIndex: 0 });
          groupMatches.push({ home: grpTeams[2], away: grpTeams[3], dateIndex: 1 });
          
          groupMatches.push({ home: grpTeams[0], away: grpTeams[2], dateIndex: 2 });
          groupMatches.push({ home: grpTeams[1], away: grpTeams[3], dateIndex: 3 });
          
          groupMatches.push({ home: grpTeams[0], away: grpTeams[3], dateIndex: 4 });
          groupMatches.push({ home: grpTeams[1], away: grpTeams[2], dateIndex: 5 });
        } else {
          for (let i = 0; i < grpTeams.length; i++) {
            for (let j = i + 1; j < grpTeams.length; j++) {
              groupMatches.push({ home: grpTeams[i], away: grpTeams[j], dateIndex: (i + j) % 6 });
            }
          }
        }
        
        const dates = groupDates[grp] || [
          '2026-06-11T18:00:00Z', '2026-06-11T21:00:00Z',
          '2026-06-15T18:00:00Z', '2026-06-15T21:00:00Z',
          '2026-06-19T18:00:00Z', '2026-06-19T21:00:00Z'
        ];
        
        for (const item of groupMatches) {
          const homeId = item.home.id;
          const awayId = item.away.id;
          const matchDate = dates[item.dateIndex] || dates[0];
          
          const matchData = {
            home_team_id: homeId,
            away_team_id: awayId,
            start_at: matchDate,
            phase: 'group',
            home_score: null,
            away_score: null,
            status: 'pending',
            group_name: grp
          };
          
          const { data: existing } = await supabaseAdmin
            .from('matches')
            .select('id')
            .eq('home_team_id', homeId)
            .eq('away_team_id', awayId)
            .eq('phase', 'group')
            .maybeSingle();
            
          if (existing) {
            const { data: current } = await supabaseAdmin
              .from('matches')
              .select('home_score, away_score, status')
              .eq('id', existing.id)
              .maybeSingle();
            if (current && current.status === 'finished') {
              matchData.home_score = current.home_score;
              matchData.away_score = current.away_score;
              matchData.status = current.status;
            }
            
            await supabaseAdmin.from('matches').update(matchData).eq('id', existing.id);
            localResults.push({ id: existing.id, status: 'updated' });
          } else {
            const { data: inserted } = await supabaseAdmin.from('matches').insert([matchData]).select();
            if (inserted && inserted.length > 0) {
              localResults.push({ id: inserted[0].id, status: 'inserted' });
            }
          }
        }
      }
      
      res.json({ 
        success: true, 
        source: 'Generador Local Fixture (Exitoso, caída de API externa gestionada)', 
        count: localResults.length, 
        details: localResults,
        wasFallback: true 
      });
    } catch (fallbackError: any) {
      console.error('Local fallback generator failed:', fallbackError);
      res.status(500).json({ error: error.message || 'Error en sincronización y fallback de base de datos' });
    }
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
