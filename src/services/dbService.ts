import { supabase } from '../lib/supabase';
import { Match, Team, Profile } from '../types';
import { MOCK_MATCHES } from '../lib/mockData';

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
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)');
    
    if (error) {
      console.error('Error fetching matches:', error);
      return [];
    }

    // Sort matches chronologically by start_at
    const sortedMatches = [...(matches || [])].sort((a, b) => {
      const dateA = new Date(a.start_at).getTime();
      const dateB = new Date(b.start_at).getTime();
      return dateA - dateB;
    });

    return sortedMatches.map(m => ({
      id: m.id,
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      start_at: m.start_at,
      phase: m.phase || 'group',
      home_score: m.home_score,
      away_score: m.away_score,
      status: m.status || 'pending',
      group_name: m.group_name,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      home_team: m.home_team,
      away_team: m.away_team
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
        if (payload && payload.new && (payload.new as any).data) {
          callback((payload.new as any).data);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  // Perfiles de Usuario
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to avoid error if not found
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    if (!data) {
      // El perfil no existe todavía, lo creamos
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const metaName = user?.user_metadata?.full_name || 'JUGADOR NUEVO';
        const cleanUsername = user?.email ? user.email.split('@')[0] : 'jugador';

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId, 
            points: 0, 
            balance: 0, 
            username: cleanUsername,
            full_name: metaName
          }])
          .select()
          .single();
        
        if (createError) {
          console.warn('Could not create profile automatically (probably RLS):', createError.message);
          return null;
        }
        return newProfile as Profile;
      } catch (err) {
        console.error('Fatal profile creation error:', err);
        return null;
      }
    }
    return data as Profile;
  },

  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false });
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
    return data as Profile[];
  },

  subscribeProfile(userId: string, callback: (profile: Profile) => void) {
    this.getProfile(userId).then(p => { if (p) callback(p); });

    const subscription = supabase
      .channel(`public:profiles:id=eq.${userId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${userId}` 
      }, (payload) => {
        if (payload.new) {
          callback(payload.new as Profile);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  async addCredits(userId: string, amount: number) {
    const { data: profile, error: getError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (getError) throw getError;

    // Use amount directly if profile not found (shouldn't happen with getProfile call before)
    const currentBalance = profile?.balance ?? 0;
    const newBalance = currentBalance + amount;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (updateError) throw updateError;
    return newBalance;
  },

  async uploadAvatar(userId: string, file: File): Promise<{ url?: string; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return { url: data.publicUrl };
    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      return { error: error.message || 'Error de conexión' };
    }
  },

  async getRanking(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error fetching ranking:', error);
      return [];
    }
    return data as Profile[];
  },

  // Predicciones
  async getPredictions(userId: string) {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching predictions:', error);
      return [];
    }
    return data;
  },

  async getAllPredictions() {
    const { data, error } = await supabase
      .from('predictions')
      .select('*');
    
    if (error) {
      console.error('Error fetching all predictions:', error);
      return [];
    }
    return data;
  },

  async savePrediction(prediction: { user_id: string; match_id: string; home_score: number; away_score: number }) {
    const { error } = await supabase
      .from('predictions')
      .upsert(prediction, { onConflict: 'user_id,match_id' });
    
    if (error) {
      console.error('Error saving prediction:', error);
      throw error;
    }
  },

  subscribeAllPredictions(callback: (predictions: any[]) => void) {
    this.getAllPredictions().then(callback);

    const subscription = supabase
      .channel('public:predictions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => {
        this.getAllPredictions().then(callback);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  // Apuestas (Bets)
  async saveBet(bet: { user_id: string; items: any[]; amount: number; odds: number; potential_win: number }) {
    const { data, error } = await supabase
      .from('bets')
      .insert([{
        ...bet,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving bet:', error);
      throw error;
    }
    return data;
  },

  async getAllBets() {
    const { data, error } = await supabase
      .from('bets')
      .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all bets:', error);
      return [];
    }
    return data;
  },

  subscribeAllBets(callback: (bets: any[]) => void) {
    this.getAllBets().then(callback);

    const channelName = `bets-${Math.random().toString(36).substring(7)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => {
        this.getAllBets().then(callback);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  async deleteBet(betId: string) {
    const { error } = await supabase
      .from('bets')
      .delete()
      .eq('id', betId);
    
    if (error) {
      console.error('Error deleting bet:', error);
      throw error;
    }
  },

  // Atomic Betting (Recommended)
  async placeBetAtomic(bet: { user_id: string; items: any[]; amount: number; odds: number; potential_win: number }) {
    const { data, error } = await supabase.rpc('place_bet_atomic', {
      p_user_id: bet.user_id,
      p_items: bet.items,
      p_amount: bet.amount,
      p_odds: bet.odds,
      p_potential_win: bet.potential_win
    });

    if (error) {
      console.error('Error in atomic bet:', error);
      throw error;
    }
    return data;
  },

  async resetBalance(userId: string, amount: number = 50000) {
    const { error } = await supabase
      .from('profiles')
      .update({ balance: amount })
      .eq('id', userId);
    
    if (error) throw error;
    return amount;
  },

  // Inicialización (Seeding)
  async seedInitialData(teams: Team[], matches: Match[], bracketRounds: any) {
    try {
      console.log('Starting seed process...');
      
      // 0. Clean up any team in DB that is not in the WORLD_CUP_TEAMS list (like Chile 'CHI')
      const codes = teams.map(t => t.code);
      const { data: dbTeams } = await supabase.from('teams').select('id, code');
      if (dbTeams) {
        const teamsToDelete = dbTeams.filter(t => !t.code || !codes.includes(t.code));
        for (const team of teamsToDelete) {
          console.log(`Cleaning up retired team code from database: ${team.code}`);
          const { data: associatedMatches } = await supabase
            .from('matches')
            .select('id')
            .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`);
          if (associatedMatches && associatedMatches.length > 0) {
            const matchIds = associatedMatches.map(m => m.id);
            await supabase.from('predictions').delete().in('match_id', matchIds);
            await supabase.from('matches').delete().in('id', matchIds);
          }
          await supabase.from('teams').delete().eq('id', team.id);
          console.log(`Successfully deleted retired team: ${team.code}`);
        }
      }
      
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
      console.log('Teams seeded/updated:', insertedTeams?.length);

      // 2. Map matches to real team UUIDs without duplicating
      if (insertedTeams) {
        const teamMap = new Map(insertedTeams.map(t => [t.code, t.id]));
        
        const matchesToInsert = [];
        for (const m of matches) {
          const homeId = teamMap.get(m.homeTeam?.code || '');
          const awayId = teamMap.get(m.awayTeam?.code || '');
          
          if (!homeId || !awayId) continue;

          // Check if match already exists by teams and start date
          const { data: existing } = await supabase
            .from('matches')
            .select('id')
            .eq('home_team_id', homeId)
            .eq('away_team_id', awayId)
            .eq('start_at', m.start_at || '')
            .maybeSingle();

          const matchData = {
            home_team_id: homeId,
            away_team_id: awayId,
            start_at: m.start_at || new Date().toISOString(),
            phase: m.phase,
            home_score: m.home_score,
            away_score: m.away_score,
            status: m.status,
            group_name: m.group_name
          };

          if (existing) {
            await supabase.from('matches').update(matchData).eq('id', existing.id);
          } else {
            matchesToInsert.push(matchData);
          }
        }

        if (matchesToInsert.length > 0) {
          const { error: matchesError } = await supabase
            .from('matches')
            .insert(matchesToInsert);
          if (matchesError) console.warn('Error inserting new matches:', matchesError);
        }
        console.log('Matches processed successfully');
      }

      // 3. Seed Bracket
      await this.saveBracket(bracketRounds);
      
      console.log('Seed process completed successfully');
      return true;
    } catch (e) {
      console.error('Seed error:', e);
      throw e;
    }
  },

  // Ligas
  async getLeagues(userId: string) {
    const { data, error } = await supabase
      .from('leagues')
      .select(`
        *,
        league_members!inner(user_id)
      `)
      .eq('league_members.user_id', userId);
    
    if (error) {
      console.error('Error fetching leagues:', error);
      return [];
    }

    // Para cada liga, obtener el conteo de miembros (Supabase counts are better via RPC or separate query if needed)
    // Pero por ahora, vamos a traer las ligas y luego sus miembros si es necesario.
    const leaguesWithCount = await Promise.all((data as any[]).map(async (league) => {
      const { count } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', league.id);
      
      return { ...league, members: count || 0 };
    }));

    return leaguesWithCount;
  },

  async createLeague(userId: string, name: string) {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert([{ name, created_by: userId, invite_code: inviteCode }])
      .select()
      .single();
    
    if (leagueError) {
      console.error('Error creating league:', leagueError);
      throw leagueError;
    }

    const { error: memberError } = await supabase
      .from('league_members')
      .insert([{ league_id: league.id, user_id: userId }]);
    
    if (memberError) {
      console.error('Error adding creator to league:', memberError);
      throw memberError;
    }

    return league;
  },

  async joinLeague(userId: string, inviteCode: string) {
    // 1. Encontrar la liga por el código
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();
    
    if (leagueError || !league) {
      throw new Error('Código de invitación inválido');
    }

    // 2. Unirse
    const { error: memberError } = await supabase
      .from('league_members')
      .insert([{ league_id: league.id, user_id: userId }]);
    
    if (memberError) {
      if (memberError.code === '23505') { // Unique violation
        throw new Error('Ya eres miembro de esta liga');
      }
      console.error('Error joining league:', memberError);
      throw memberError;
    }

    return league;
  },

  async getLeagueMembers(leagueId: string) {
    const { data, error } = await supabase
      .from('league_members')
      .select(`
        user_id,
        profiles(*)
      `)
      .eq('league_id', leagueId);
    
    if (error) {
      console.error('Error fetching league members:', error);
      return [];
    }
    
    return data.map(m => m.profiles);
  },

  async getLeagueRanking(leagueId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('league_members')
      .select(`
        user_id,
        profiles(*)
      `)
      .eq('league_id', leagueId);
    
    if (error) {
      console.error('Error fetching league ranking:', error);
      return [];
    }

    const profiles = data.map(m => m.profiles as unknown as Profile);
    return profiles.sort((a, b) => (b.points || 0) - (a.points || 0));
  },

  async deleteLeague(leagueId: string) {
    const { error } = await supabase
      .from('leagues')
      .delete()
      .eq('id', leagueId);
    
    if (error) {
      console.error('Error deleting league:', error);
      throw error;
    }
    return true;
  }
};
