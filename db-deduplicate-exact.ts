import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[DEDUP] Missing Supabase config env vars!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDeduplication() {
  console.log('[DEDUP] Fetching all matches with team info...');
  
  const { data: matches, error: fetchError } = await supabase
    .from('matches')
    .select('id, start_at, home_team_id, away_team_id, home_score, away_score, status, phase, group_name');

  if (fetchError || !matches) {
    console.error('[DEDUP] Error fetching matches:', fetchError);
    return;
  }

  console.log(`[DEDUP] Fetched ${matches.length} matches from DB.`);

  // Group matches
  const matchGroups: Record<string, typeof matches> = {};

  matches.forEach(m => {
    const normDate = m.start_at ? new Date(m.start_at).toISOString().split('.')[0] + 'Z' : '';
    const key = `${m.home_team_id}_${m.away_team_id}_${normDate}_${m.phase}`;
    if (!matchGroups[key]) {
      matchGroups[key] = [];
    }
    matchGroups[key].push(m);
  });

  console.log(`[DEDUP] Grouped into ${Object.keys(matchGroups).length} unique matches.`);

  let totalDeleted = 0;

  for (const [key, group] of Object.entries(matchGroups)) {
    if (group.length <= 1) continue;

    console.log(`[DEDUP] Match "${key}" has ${group.length} occurrences. Deduplicating...`);

    // Sort to keep the best one:
    // Prefer finished matches, or matches with scores, or the one with lower alphanumeric ID
    group.sort((a, b) => {
      const aFinished = a.status === 'finished' || a.home_score !== null;
      const bFinished = b.status === 'finished' || b.home_score !== null;
      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;
      return a.id.localeCompare(b.id);
    });

    const master = group[0];
    const duplicates = group.slice(1);

    console.log(`[DEDUP] Keeping master: ${master.id}. Deleting ${duplicates.length} duplicates...`);

    for (const dup of duplicates) {
      // First clean predictions on duplicate
      await supabase.from('predictions').delete().eq('match_id', dup.id);
      
      // Delete duplicate match
      const { data, error } = await supabase
        .from('matches')
        .delete()
        .eq('id', dup.id)
        .select();

      if (error) {
        console.error(`[DEDUP] Failed to delete duplicate match ${dup.id}:`, error.message);
      } else {
        console.log(`[DEDUP] Deleted duplicate match ID: ${dup.id}`);
        totalDeleted++;
      }
    }
  }

  console.log(`[DEDUP] Success! Total duplicate matches deleted completely: ${totalDeleted}`);
}

runDeduplication();
