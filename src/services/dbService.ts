import { supabase } from '../lib/supabase';
import { Match, Team } from '../types';

export const dbService = {
  // Obtener equipos
  async getTeams(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*');
    
    if (error) {
      console.error('Error fetching teams:', error);
      return [];
    }
    return data as Team[];
  },

  // Suscribirse a partidos en tiempo real
  subscribeMatches(callback: (matches: Match[]) => void) {
    // Carga inicial
    this.getMatches().then(callback);

    // Suscripción a cambios
    const subscription = supabase
      .channel('public:matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        this.getMatches().then(callback);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  async getMatches(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)');
    
    if (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
    // Mapear el resultado para que coincida con nuestro tipo Match si es necesario
    return data.map(m => ({
      ...m,
      homeTeam: m.home_team,
      awayTeam: m.away_team
    })) as Match[];
  },

  // Bracket (Almacenado como JSON en una tabla simple para este demo)
  async saveBracket(rounds: any) {
    const { error } = await supabase
      .from('tournament_metadata')
      .upsert({ key: 'bracket', data: rounds, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    
    if (error) console.error('Error saving bracket:', error);
  },

  async getBracket() {
    const { data, error } = await supabase
      .from('tournament_metadata')
      .select('data')
      .eq('key', 'bracket')
      .single();
    
    if (error || !data) return null;
    return (data as any).data;
  },

  subscribeBracket(callback: (rounds: any) => void) {
    this.getBracket().then(rounds => { if (rounds) callback(rounds); });

    const subscription = supabase
      .channel('public:tournament_metadata')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_metadata', filter: 'key=eq.bracket' }, (payload) => {
        if (payload.new && (payload.new as any).data) {
          callback((payload.new as any).data);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  // Inicialización (Seeding)
  async seedInitialData(teams: Team[], matches: Match[], bracketRounds: any) {
    try {
      console.log('Starting seed process...');
      
      // 1. Insert teams
      // We'll insert and then fetch to get the real UUIDs
      const teamsToInsert = teams.map(({ name, code, flag_url, group_name }) => ({
        name,
        code,
        flag_url,
        group_name
      }));

      const { data: insertedTeams, error: teamsError } = await supabase
        .from('teams')
        .upsert(teamsToInsert, { onConflict: 'code' })
        .select();

      if (teamsError) throw teamsError;
      console.log('Teams seeded:', insertedTeams?.length);

      // 2. Map matches to real team UUIDs
      if (insertedTeams) {
        const teamMap = new Map(insertedTeams.map(t => [t.code, t.id]));
        
        const matchesToInsert = matches.map(m => {
          const homeId = teamMap.get(m.homeTeam?.code || '');
          const awayId = teamMap.get(m.awayTeam?.code || '');
          
          return {
            home_team_id: homeId,
            away_team_id: awayId,
            start_at: m.start_at || new Date().toISOString(),
            phase: m.phase,
            home_score: m.home_score,
            away_score: m.away_score,
            status: m.status,
            group_name: m.group_name
          };
        });

        const { error: matchesError } = await supabase
          .from('matches')
          .insert(matchesToInsert);

        if (matchesError) console.warn('Possible error seeding matches (could be already there):', matchesError);
      }

      // 3. Seed Bracket
      await this.saveBracket(bracketRounds);
      
      console.log('Seed process completed successfully');
      return true;
    } catch (e) {
      console.error('Seed error:', e);
      throw e;
    }
  }
};
