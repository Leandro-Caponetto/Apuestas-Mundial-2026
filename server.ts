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

// Supabase Admin - only initialize if keys exist
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
}

app.use(express.json());

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'demo' });
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
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin not configured' });
  }
  if (!FOOTBALL_DATA_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

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

    // 1. Get all teams from our DB
    const { data: teams, error: teamsErr } = await supabaseAdmin.from('teams').select('*');
    if (teamsErr) throw teamsErr;

    const teamMap = new Map(teams.map((t: any) => [t.code, t.id]));

    // 2. Prepare UPSERT for matches
    // Note: We'll use start_at and team IDs as a natural key for matching existing entries if api_id isn't in schema
    // Better: We'll try to find matches by date and teams
    
    const results = [];
    for (const apiMatch of apiMatches) {
      const homeId = teamMap.get(apiMatch.homeTeam.tla);
      const awayId = teamMap.get(apiMatch.awayTeam.tla);

      if (!homeId || !awayId) {
        console.warn(`Skipping match: Teams not found for ${apiMatch.homeTeam.tla} vs ${apiMatch.awayTeam.tla}`);
        continue;
      }

      const matchData = {
        home_team_id: homeId,
        away_team_id: awayId,
        start_at: apiMatch.utcDate,
        phase: phaseMap[apiMatch.stage] || apiMatch.stage.toLowerCase(),
        home_score: apiMatch.score.fullTime.home,
        away_score: apiMatch.score.fullTime.away,
        status: apiMatch.status === 'FINISHED' ? 'finished' : (apiMatch.status === 'IN_PLAY' ? 'playing' : 'pending'),
        group_name: apiMatch.group?.replace('GROUP_', '') || null
      };

      // Try to find if match exists
      const { data: existing } = await supabaseAdmin
        .from('matches')
        .select('id')
        .eq('home_team_id', homeId)
        .eq('away_team_id', awayId)
        .eq('start_at', apiMatch.utcDate)
        .maybeSingle();

      if (existing) {
        const { error: updErr } = await supabaseAdmin
          .from('matches')
          .update(matchData)
          .eq('id', existing.id);
        if (updErr) console.error('Update error:', updErr);
        results.push({ id: existing.id, status: 'updated' });
      } else {
        const { data: inserted, error: insErr } = await supabaseAdmin
          .from('matches')
          .insert([matchData])
          .select();
        if (insErr) console.error('Insert error:', insErr);
        if (inserted) results.push({ id: inserted[0].id, status: 'inserted' });
      }
    }

    res.json({ success: true, count: results.length, details: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
