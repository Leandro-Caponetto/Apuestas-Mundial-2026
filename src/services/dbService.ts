import { supabase } from '../lib/supabase';
import { Match, Team, Profile } from '../types';

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
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ id: userId, points: 0, balance: 0, username: 'JUGADOR NUEVO' }])
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
