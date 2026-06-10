import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[CLEAN] Missing Supabase config env vars!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanNullMatches() {
  console.log('[CLEAN] Fetching matches to evaluate null team fields...');
  
  const { data: matches, error: fetchError } = await supabase
    .from('matches')
    .select('id, start_at, phase, group_name, home_team_id, away_team_id');

  if (fetchError || !matches) {
    console.error('[CLEAN] Error fetching matches:', fetchError);
    return;
  }

  console.log(`[CLEAN] Evaluate ${matches.length} matches from Supabase.`);

  const nullTeamMatches = matches.filter(m => m.home_team_id === null || m.away_team_id === null);

  if (nullTeamMatches.length === 0) {
    console.log('[CLEAN] No matches with null teams detected in Supabase.');
    return;
  }

  console.log(`[CLEAN] Found ${nullTeamMatches.length} matches with null teams. Deleting them individually...`);

  for (const m of nullTeamMatches) {
    console.log(`[CLEAN] Deleting match ID: ${m.id} (${m.phase} - ${m.group_name}) - Date: ${m.start_at}`);
    
    // Delete predictions first for this match
    const { error: pError } = await supabase.from('predictions').delete().eq('match_id', m.id);
    if (pError) {
      console.warn(`[CLEAN] Note: error deleting predictions for match ${m.id}:`, pError.message);
    }

    const { data: delResult, error: mError } = await supabase
      .from('matches')
      .delete()
      .eq('id', m.id)
      .select();

    if (mError) {
      console.error(`[CLEAN] Error deleting match ${m.id}:`, mError.message);
    } else {
      console.log(`[CLEAN] Successfully deleted match ${m.id}:`, JSON.stringify(delResult));
    }
  }

  console.log('[CLEAN] Finished cleaning null matches.');
}

cleanNullMatches();
