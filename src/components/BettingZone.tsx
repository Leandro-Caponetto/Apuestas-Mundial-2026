import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Clock, 
  Save, 
  Search, 
  Award, 
  CheckCircle2, 
  ChevronRight, 
  Info,
  Calendar as CalendarIcon,
  HelpCircle,
  Plus,
  Minus,
  Lock,
  Loader2,
  Users
} from 'lucide-react';
import { dbService } from '@/services/dbService';
import { Match, Profile, Prediction } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { CommunityBoard } from './CommunityBoard';
import { WORLD_CUP_TEAMS } from '@/lib/constants';
import { MOCK_MATCHES } from '@/lib/mockData';
import { ResolveMatchModal } from './ResolveMatchModal';

const cleanGroupName = (group: string | null | undefined): string => {
  if (!group) return '';
  return group.replace(/^(grupo\s+|group\s+|grupo|group|group_)/i, '').trim().toUpperCase();
};

export const BettingZone: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializingDB, setIsInitializingDB] = useState(false);
  const [resolveModalMatch, setResolveModalMatch] = useState<Match | null>(null);
  
  const isAdmin = userEmail === 'caponettopeppers@gmail.com';
  
  // Tabs: 'COMPETITION' (Pending Matches), 'RESOLVED' (Past Matches / Results), 'COMMUNITY' (Prediction Wall)
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED' | 'COMMUNITY'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state for interactive prediction entries of the current user
  const [userPredictions, setUserPredictions] = useState<Record<string, { home_score: number; away_score: number; hasPrediction: boolean; points_earned?: number }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  
  // Store original predictions from the database to check for unsaved modifications
  const [originalPredictions, setOriginalPredictions] = useState<Record<string, { home_score: number; away_score: number }>>({});

  useEffect(() => {
    let unsubscribeMatches: (() => void) | undefined;
    let unsubscribeProfile: (() => void) | undefined;
    let isMounted = true;
    
    const init = async () => {
      try {
        // Automatically cleanup retired teams and matches in background
        try {
          fetch('/api/admin/clean-retired', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-supabase-url': import.meta.env.VITE_SUPABASE_URL || '',
              'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
            }
          }).catch(err => console.error('Silent cleanup failed:', err));
        } catch (e) {
          console.error('Trigger cleanup error:', e);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        if (session?.user) {
          setUserEmail(session.user.email || null);
          // Subscribe to profile
          const unsubProfile = dbService.subscribeProfile(session.user.id, (p) => {
            if (isMounted) setProfile(p);
          });
          
          if (!isMounted) {
            unsubProfile();
          } else {
            unsubscribeProfile = unsubProfile;
          }
          
          // Get predictions
          const preds = await dbService.getPredictions(session.user.id);
          if (!isMounted) return;
          
          const mappedPreds: Record<string, { home_score: number; away_score: number; hasPrediction: boolean; points_earned?: number }> = {};
          const mappedOriginals: Record<string, { home_score: number; away_score: number }> = {};
          
          preds.forEach((p: any) => {
            mappedPreds[p.match_id] = {
              home_score: p.home_score,
              away_score: p.away_score,
              hasPrediction: true,
              points_earned: p.points_earned
            };
            mappedOriginals[p.match_id] = {
              home_score: p.home_score,
              away_score: p.away_score
            };
          });
          
          setUserPredictions(mappedPreds);
          setOriginalPredictions(mappedOriginals);
        }
        
        // Load and subscribe to matches
        const unsubMatches = dbService.subscribeMatches((data) => {
          if (isMounted) {
            setMatches(data);
            setLoading(false);
          }
        });
        
        if (!isMounted) {
          unsubMatches();
        } else {
          unsubscribeMatches = unsubMatches;
        }
      } catch (err) {
        console.error('Error in PRODE initialization:', err);
        if (isMounted) setLoading(false);
      }
    };
    
    init();
    
    return () => {
      isMounted = false;
      if (typeof unsubscribeMatches === 'function') unsubscribeMatches();
      if (typeof unsubscribeProfile === 'function') unsubscribeProfile();
    };
  }, []);

  const handleReseedDB = async () => {
    if (!isAdmin) return;
    setIsInitializingDB(true);
    const toastId = toast.loading('Re-sembrando base de datos con Panamá (Removiendo Chile)...');
    
    const initialBracket = [
      {
        name: 'R32',
        matches: Array(16).fill(null).map((_, i) => ({
          id: `r32-${i}`,
          homeTeam: WORLD_CUP_TEAMS[i * 2] || null,
          awayTeam: WORLD_CUP_TEAMS[i * 2 + 1] || null,
          status: 'pending' as const,
          date: i < 4 ? '28 JUN' : i < 8 ? '29 JUN' : i < 12 ? '30 JUN' : '01 JUL',
          location: ['LOS ANGELES', 'NEW YORK', 'DALLAS', 'HOUSTON', 'MEXICO CITY', 'TORONTO', 'BOSTON', 'MIAMI'][i % 8],
          homeScore: '',
          awayScore: ''
        }))
      },
      {
        name: 'R16',
        matches: Array(8).fill(null).map((_, i) => ({
          id: `r16-${i}`,
          homeTeam: null,
          awayTeam: null,
          status: 'pending' as const,
          date: i < 4 ? '04 JUL' : '05 JUL',
          location: ['PHILADELPHIA', 'HOUSTON', 'NEW YORK', 'DALLAS'][i % 4],
          homeScore: '',
          awayScore: ''
        }))
      },
      {
        name: 'CUARTOS',
        matches: Array(4).fill(null).map((_, i) => ({
          id: `qf-${i}`,
          homeTeam: null,
          awayTeam: null,
          status: 'pending' as const,
          date: i < 2 ? '09 JUL' : '10 JUL',
          location: ['BOSTON', 'LOS ANGELES', 'MIAMI', 'KANSAS CITY'][i],
          homeScore: '',
          awayScore: ''
        }))
      },
      {
        name: 'SEMIFINAL',
        matches: Array(2).fill(null).map((_, i) => ({
          id: `sf-${i}`,
          homeTeam: null,
          awayTeam: null,
          status: 'pending' as const,
          date: i === 0 ? '14 JUL' : '15 JUL',
          location: i === 0 ? 'DALLAS' : 'ATLANTA',
          homeScore: '',
          awayScore: ''
        }))
      },
      {
        name: 'FINAL',
        matches: [{
          id: 'final',
          homeTeam: null,
          awayTeam: null,
          status: 'pending' as const,
          date: '19 JUL',
          location: 'NEW YORK / NEW JERSEY',
          homeScore: '',
          awayScore: ''
        }]
      }
    ];

    try {
      await dbService.seedInitialData(WORLD_CUP_TEAMS, MOCK_MATCHES, initialBracket);
      toast.success('¡Base de datos del Mundial inicializada correctamente (PAN registrado, CHI removido)! ⚽', { id: toastId });
      // Reload matches list
      const updatedMatches = await dbService.getMatches();
      setMatches(updatedMatches);
    } catch (err: any) {
      toast.error('Error al re-sembrar base de datos: ' + (err.message || 'Intente de nuevo'), { id: toastId });
      console.error(err);
    } finally {
      setIsInitializingDB(false);
    }
  };

  const handleResolveMatch = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!isAdmin) return;
    const toastId = toast.loading('Finalizando partido real y sumando puntos de PRODE...');
    try {
      const response = await fetch('/api/admin/resolve-match', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL || '',
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({ matchId, homeScore, awayScore }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('¡Partido resuelto exitosamente! Puntos acreditados a todos en tiempo real.', { id: toastId });
        // Reload matches list
        const updatedMatches = await dbService.getMatches();
        setMatches(updatedMatches);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error('Error al resolver partido: ' + err.message, { id: toastId });
    }
  };

  const handleSyncMatches = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Sincronizando partidos con el fixture...');
    try {
      const res = await fetch('/api/sync-matches', { 
        method: 'POST',
        headers: {
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL || '',
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sincronización exitosa: ${data.count} partidos procesados`, { id: toastId });
        const mData = await dbService.getMatches();
        setMatches(mData);
      } else {
        toast.error('Error: ' + (data.error || 'Fallo desconocido'), { id: toastId });
      }
    } catch (err: any) {
      toast.error('Error al sincronizar fixture', { id: toastId });
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Adjust score predictions locally
  const handleScoreChange = (matchId: string, team: 'home' | 'away', operation: 'increment' | 'decrement') => {
    setUserPredictions(prev => {
      const current = prev[matchId] || { home_score: 0, away_score: 0, hasPrediction: false };
      let newScore = team === 'home' ? current.home_score : current.away_score;
      
      if (operation === 'increment') {
        newScore += 1;
      } else if (operation === 'decrement' && newScore > 0) {
        newScore -= 1;
      }
      
      return {
        ...prev,
        [matchId]: {
          ...current,
          [team === 'home' ? 'home_score' : 'away_score']: newScore
        }
      };
    });
  };

  // Save single prediction to supabase
  const handleSavePrediction = async (matchId: string) => {
    if (!profile) {
      toast.error('Por favor, inicia sesión para poder registrar tu pronóstico');
      return;
    }
    
    const pred = userPredictions[matchId] || { home_score: 0, away_score: 0 };
    setSavingId(matchId);
    
    try {
      await dbService.savePrediction({
        user_id: profile.id,
        match_id: matchId,
        home_score: pred.home_score,
        away_score: pred.away_score
      });
      
      setOriginalPredictions(prev => ({
        ...prev,
        [matchId]: {
          home_score: pred.home_score,
          away_score: pred.away_score
        }
      }));
      
      setUserPredictions(prev => ({
        ...prev,
        [matchId]: {
          ...pred,
          hasPrediction: true
        }
      }));
      
      toast.success('Pronóstico guardado exitosamente ⚽');
    } catch (error: any) {
      toast.error('Error al guardar pronóstico: ' + error.message);
    } finally {
      setSavingId(null);
    }
  };

  // Check if a prediction has changes compared to database values
  const hasChanges = (matchId: string) => {
    const current = userPredictions[matchId];
    const original = originalPredictions[matchId];
    
    if (!current) return false;
    if (!original) {
      // If there is no original prediction and scores are non-zero, it counts as modified
      return current.home_score > 0 || current.away_score > 0 || current.hasPrediction;
    }
    
    return current.home_score !== original.home_score || current.away_score !== original.away_score;
  };

  // Get active stats for the logged-in player
  const predictionStats = useMemo(() => {
    const list = Object.values(userPredictions) as Array<{ home_score: number; away_score: number; hasPrediction: boolean; points_earned?: number }>;
    const activeList = list.filter(p => p.hasPrediction);
    const count = activeList.length;
    const exactMatches = activeList.filter(p => p.points_earned === 3).length;
    const outcomeMatches = activeList.filter(p => p.points_earned === 1).length;
    
    return {
      count,
      exactMatches,
      outcomeMatches
    };
  }, [userPredictions]);

  // Filter matches based on search term
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const homeName = m.homeTeam?.name || m.home_team?.name || '';
      const awayName = m.awayTeam?.name || m.away_team?.name || '';
      const matchesSearch = 
        homeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        awayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.group_name && m.group_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.phase && m.phase.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;
      
      if (activeTab === 'PENDING') {
        return m.status !== 'finished';
      } else if (activeTab === 'RESOLVED') {
        return m.status === 'finished';
      }
      return true;
    });
  }, [matches, searchTerm, activeTab]);

  // Group pending/resolved matches by date for clean editorial rhythm
  const groupedMatches = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    filteredMatches.forEach(m => {
      const dateStr = m.start_at ? formatDate(m.start_at) : 'Fecha pendiente';
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(m);
    });
    return groups;
  }, [filteredMatches]);
  console.log('Grouped Matches:', groupedMatches);

  // User's active predictions list sorted chronologically
  const savedPredictionsList = useMemo(() => {
    return matches
      .filter(m => {
        const pred = userPredictions[m.id] as any;
        return pred && pred.hasPrediction;
      })
      .map(m => {
        const pred = userPredictions[m.id] as any;
        return {
          match: m,
          prediction: pred,
        };
      })
      .sort((a, b) => {
        const dateA = a.match.start_at ? new Date(a.match.start_at).getTime() : 0;
        const dateB = b.match.start_at ? new Date(b.match.start_at).getTime() : 0;
        return dateA - dateB;
      });
  }, [matches, userPredictions]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="text-orange-500 animate-pulse" size={28} />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">SISTEMA PRODE</h3>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em] animate-pulse italic">Cargando fixtures y predicciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Decorative Blur Backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-orange-600/3 blur-[140px] rounded-full" />
      </div>

      {/* Futuristic Banner Header */}
      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 p-10 md:p-14 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12 text-orange-500">
            <Trophy size={320} />
          </div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex flex-wrap items-center gap-4">
              <span className="px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-[9px] font-black tracking-widest text-orange-500 uppercase italic">
                PRODE OFICIAL COPA MUNDIAL 2026
              </span>
              <button 
                onClick={handleSyncMatches}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full text-[9px] font-black text-zinc-400 hover:text-white transition-all disabled:opacity-50 uppercase tracking-widest"
              >
                <Clock size={12} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Sincronizando...' : 'Actualizar Fixture'}
              </button>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
                PRONÓSTICO DE LA COPA<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">PRODE DIGITAL</span>
              </h1>
              <p className="max-w-xl text-xs font-bold text-zinc-500 uppercase tracking-widest leading-relaxed italic">
                Demuestra tus conocimientos futbolísticos sumando puntos por aciertos exactos de marcadores o resultados en las llaves del torneo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-8 relative z-10 border-t border-zinc-800/60 mt-8">
            <button 
              onClick={() => setActiveTab('PENDING')}
              className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all ${
                activeTab === 'PENDING' 
                  ? 'bg-orange-500 text-black shadow-[0_0_25px_rgba(249,115,22,0.3)]' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700/50'
              }`}
            >
              ⚽ Próximos Partidos
            </button>
            <button 
              onClick={() => setActiveTab('RESOLVED')}
              className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all ${
                activeTab === 'RESOLVED' 
                  ? 'bg-orange-500 text-black shadow-[0_0_25px_rgba(249,115,22,0.3)]' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700/50'
              }`}
            >
              📊 Resultados & Puntos
            </button>
            <button 
              onClick={() => setActiveTab('COMMUNITY')}
              className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all ${
                activeTab === 'COMMUNITY' 
                  ? 'bg-orange-500 text-black shadow-[0_0_25px_rgba(249,115,22,0.3)]' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700/50'
              }`}
            >
              👥 Muro de Pronósticos
            </button>
          </div>
        </div>

        {/* User Stats Card */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-850 rounded-[2.5rem] p-8 md:p-10 shadow-2xl flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.4em] italic">MARCADOR PERSONAL</span>
              <Award className="text-zinc-700 group-hover:text-orange-500 transition-colors" size={20} strokeWidth={2.5} />
            </div>
            
            <div className="space-y-1">
              <span className="text-5xl md:text-6xl font-black text-white italic tabular-nums tracking-tighter">
                {profile?.points || 0} <span className="text-xl text-orange-500">PTS</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest italic col-span-2">
                  {profile?.username || 'USUARIO CONECTADO'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-zinc-800/80 pt-6">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest italic">Pronósticos</span>
                <p className="text-xl font-black text-white italic tabular-nums">{predictionStats.count}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest italic">Aciertos Exactos</span>
                <p className="text-xl font-black text-orange-500 italic tabular-nums">🏆 {predictionStats.exactMatches}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-805 border-zinc-800/50 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest italic col-span-2">Acierto Ganador (1 pt)</span>
                <span className="text-xs font-black text-white italic">{predictionStats.outcomeMatches} partidos</span>
              </div>
              <div className="w-12 h-1.5 bg-zinc-850 rounded-full overflow-hidden">
                <div 
                  className="bg-orange-500 h-full rounded-full" 
                  style={{ width: `${predictionStats.count > 0 ? (predictionStats.outcomeMatches / predictionStats.count) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-center gap-3">
            <Info size={16} className="text-orange-500 shrink-0" />
            <p className="text-[9px] font-bold text-zinc-400 leading-relaxed uppercase tracking-widest italic">
              Recuerda guardar cada pronóstico presionando el botón "Guardar" de cada partido antes que comience el juego.
            </p>
          </div>
        </div>
      </div>

      {/* Administrator Control Center */}
      {isAdmin && (
        <div className="bg-zinc-950 border-2 border-red-500/30 p-8 rounded-[2.5rem] relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-[400px] h-[200px] bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 font-sans">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[9px] font-black tracking-widest text-red-500 uppercase italic">
                SISTEMA ADMIN DE CONTROL PRODE
              </span>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                Mesa de Pruebas & Sincronización Real
              </h2>
              <p className="max-w-2xl text-[11px] font-bold text-zinc-400 uppercase tracking-wider leading-relaxed italic">
                Hola <span className="text-red-400">{userEmail}</span>. Como administrador, puedes sincronizar fixtures en tiempo real y limpiar registros viejos (como el equipo Chile que ha sido reemplazado por Panamá).
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                type="button"
                onClick={handleReseedDB}
                disabled={isInitializingDB}
                className="px-6 py-3.5 bg-red-550 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase italic tracking-widest text-[9px] rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isInitializingDB ? <Loader2 size={12} className="animate-spin" /> : '⚽'}
                Reiniciar & Sembrar con Panamá
              </button>
              
              <button
                type="button"
                onClick={handleSyncMatches}
                disabled={isSyncing}
                className="px-6 py-3.5 bg-zinc-850 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-700/50 text-white font-black uppercase italic tracking-widest text-[9px] rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Clock size={12} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Sincronizando...' : 'Actualizar Fixture API'}
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center gap-3">
            <Info size={16} className="text-red-400 shrink-0" />
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic leading-normal">
              ⚡ Consejo de pruebas: Puedes simular la finalización de cualquier partido abajo haciendo clic en "Simular Resultado Real (Admin)" para otorgar puntos al instante y ver cómo se actualiza la tabla de posiciones.
            </p>
          </div>
        </div>
      )}

      {/* Search Bar / Filter Panel */}
      {activeTab !== 'COMMUNITY' && (
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Buscar por equipo, grupo o etapa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-5 pl-16 pr-6 text-xs font-bold italic focus:border-orange-500/20 outline-none transition-all placeholder:text-zinc-600 uppercase tracking-[0.2em] text-white"
          />
        </div>
      )}

      {/* Rules Banner Grid */}
      {activeTab !== 'COMMUNITY' && (
        <div className="bg-zinc-900/50 border border-zinc-850 p-6 md:p-8 rounded-[2rem] gap-6 grid md:grid-cols-3 align-middle text-zinc-400">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
              <span className="font-extrabold italic text-sm">3pt</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase italic tracking-wider">MARCADOR EXACTO</h4>
              <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider italic">Predices el puntaje exacto de ambos equipos de forma perfecta.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-zinc-800/80 border border-zinc-700/50 rounded-xl flex items-center justify-center text-zinc-400 shrink-0">
              <span className="font-extrabold italic text-sm">1pt</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase italic tracking-wider">RESULTADO/GANADOR</h4>
              <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider italic">Aciertas quién gana o si hay empate, pero no el resultado exacto.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-zinc-800/40 border border-transparent rounded-xl flex items-center justify-center text-zinc-650 shrink-0">
              <span className="font-extrabold italic text-sm">0pt</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-white/50 uppercase italic tracking-wider">OTRO CASO</h4>
              <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-wider italic">Si no aciertas ni el ganador ni el marcador final del partido.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main List View */}
      <AnimatePresence mode="wait">
        {activeTab === 'COMMUNITY' ? (
          <motion.div
            key="community-wall"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="pt-2"
          >
            <CommunityBoard />
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Match Cards */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="lg:col-span-8 space-y-12"
            >
              {Object.keys(groupedMatches).length > 0 ? (
                (Object.entries(groupedMatches) as [string, Match[]][]).map(([date, dateMatches]) => (
                  <div key={date} className="space-y-6">
                    {/* Date Heading Indicator */}
                    <div className="flex items-center gap-4 px-2">
                      <div className="w-1.5 h-8 bg-orange-500 rounded-full" />
                      <div>
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">{date}</h3>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] italic">Día de competición</p>
                      </div>
                    </div>

                    {/* Matches Cards List */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {dateMatches.map(match => {
                        const prediction = userPredictions[match.id] || { home_score: 0, away_score: 0, hasPrediction: false };
                        const isLocked = match.status !== 'pending';
                        const isUnsaved = hasChanges(match.id);
                        
                        return (
                          <div 
                            key={match.id}
                            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden transition-all flex flex-col justify-between hover:border-zinc-750 gap-6"
                          >
                            {/* Top Info Banner inside Card */}
                            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic bg-zinc-800 px-3 py-1.5 rounded-lg">
                                {match.phase === 'group' ? `GRUPO ${cleanGroupName(match.group_name)}` : match.phase.toUpperCase()}
                              </span>
                              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black italic">
                                <Clock size={12} className="text-orange-500/70" />
                                <span>{match.start_at ? new Date(match.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hora TBD'}</span>
                              </div>
                            </div>

                            {/* Teams with Interactive Prediction Dial */}
                            <div className="flex items-center justify-between relative py-2">
                              {/* Home Team */}
                              <div className="flex flex-col items-center gap-3 w-[35%] text-center">
                                <div className="w-16 h-11 rounded-lg overflow-hidden border border-zinc-800 bg-black shadow-lg">
                                  {match.homeTeam?.flag_url || match.home_team?.flag_url ? (
                                    <img 
                                      src={match.homeTeam?.flag_url || match.home_team?.flag_url} 
                                      alt={match.homeTeam?.name || match.home_team?.name} 
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-zinc-600">TBD</div>
                                  )}
                                </div>
                                <span className="text-sm font-black italic uppercase tracking-tight text-white line-clamp-1">
                                  {match.homeTeam?.name || match.home_team?.name || 'TBD'}
                                </span>
                              </div>

                              {/* Center Predictions Editor */}
                              <div className="flex flex-col items-center justify-center w-[30%]">
                                {isLocked ? (
                                  /* Locked view: results are official, prediction is locked */
                                  <div className="space-y-4 text-center">
                                    {/* Score visualization */}
                                    <div className="flex items-center justify-center gap-3 font-mono">
                                      <div className="w-10 h-10 bg-zinc-950/60 border border-zinc-850 rounded-xl flex items-center justify-center font-black text-zinc-400 text-sm">
                                        {prediction.hasPrediction ? prediction.home_score : '-'}
                                      </div>
                                      <span className="text-[10px] text-zinc-700 font-extrabold italic">PRED</span>
                                      <div className="w-10 h-10 bg-zinc-950/60 border border-zinc-850 rounded-xl flex items-center justify-center font-black text-zinc-400 text-sm">
                                        {prediction.hasPrediction ? prediction.away_score : '-'}
                                      </div>
                                    </div>
                                    
                                    {/* Real score indicator */}
                                    {match.status === 'finished' ? (
                                      <div className="space-y-2">
                                        <p className="text-[8px] font-black text-zinc-550 uppercase tracking-widest italic">REAL</p>
                                        <div className="px-3 py-1 bg-zinc-950 text-white font-black text-xs rounded-lg border border-zinc-850">
                                          {match.home_score} - {match.away_score}
                                        </div>
                                        
                                        {/* Point Tag Badge */}
                                        <div className="pt-1">
                                          {prediction.points_earned === 3 ? (
                                            <span className="px-2 py-1.5 bg-orange-500/10 border border-orange-500/30 text-[8px] font-black tracking-widest text-orange-500 rounded-lg flex items-center justify-center gap-1">
                                              🏆 PERFECTO (+3)
                                            </span>
                                          ) : prediction.points_earned === 1 ? (
                                            <span className="px-2 py-1.5 bg-zinc-800 border border-zinc-750 text-[8px] font-black tracking-widest text-zinc-400 rounded-lg flex items-center justify-center gap-1">
                                              ✓ GANADOR (+1)
                                            </span>
                                          ) : (
                                            <span className="px-2 py-1.5 bg-zinc-900 border border-transparent text-[8px] font-bold tracking-widest text-zinc-600 rounded-lg flex items-center justify-center">
                                              ❌ 0 PTS
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="px-2 py-1 bg-zinc-800 text-[8px] text-zinc-400 font-black tracking-widest rounded-lg flex items-center justify-center gap-1">
                                        <Lock size={10} /> JUGANDO
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  /* Interactive dial editor */
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      {/* Home Prediction Selector */}
                                      <div className="flex flex-col items-center gap-1">
                                        <button 
                                          type="button"
                                          onClick={() => handleScoreChange(match.id, 'home', 'increment')}
                                          className="p-1 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-lg text-zinc-400 transition-colors"
                                        >
                                          <Plus size={12} strokeWidth={3} />
                                        </button>
                                        <div className="w-10 h-10 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-center font-black text-xl italic text-white select-none">
                                          {prediction.home_score}
                                        </div>
                                        <button 
                                          type="button"
                                          disabled={prediction.home_score <= 0}
                                          onClick={() => handleScoreChange(match.id, 'home', 'decrement')}
                                          className="p-1 bg-zinc-800 disabled:opacity-30 hover:bg-zinc-700 hover:text-white rounded-lg text-zinc-400 transition-colors"
                                        >
                                          <Minus size={12} strokeWidth={3} />
                                        </button>
                                      </div>

                                      <span className="text-zinc-700 font-black italic text-sm select-none">VS</span>

                                      {/* Away Prediction Selector */}
                                      <div className="flex flex-col items-center gap-1">
                                        <button 
                                          type="button"
                                          onClick={() => handleScoreChange(match.id, 'away', 'increment')}
                                          className="p-1 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-lg text-zinc-400 transition-colors"
                                        >
                                          <Plus size={12} strokeWidth={3} />
                                        </button>
                                        <div className="w-10 h-10 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-center font-black text-xl italic text-white select-none">
                                          {prediction.away_score}
                                        </div>
                                        <button 
                                          type="button"
                                          disabled={prediction.away_score <= 0}
                                          onClick={() => handleScoreChange(match.id, 'away', 'decrement')}
                                          className="p-1 bg-zinc-800 disabled:opacity-30 hover:bg-zinc-700 hover:text-white rounded-lg text-zinc-400 transition-colors"
                                        >
                                          <Minus size={12} strokeWidth={3} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="flex flex-col items-center gap-3 w-[35%] text-center">
                                <div className="w-16 h-11 rounded-lg overflow-hidden border border-zinc-800 bg-black shadow-lg">
                                  {match.awayTeam?.flag_url || match.away_team?.flag_url ? (
                                    <img 
                                      src={match.awayTeam?.flag_url || match.away_team?.flag_url} 
                                      alt={match.awayTeam?.name || match.away_team?.name} 
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-zinc-650">TBD</div>
                                  )}
                                </div>
                                <span className="text-sm font-black italic uppercase tracking-tight text-white line-clamp-1">
                                  {match.awayTeam?.name || match.away_team?.name || 'TBD'}
                                </span>
                              </div>
                            </div>

                            {/* Save Trigger Banner under Card */}
                            {!isLocked && (
                              <div className="pt-2 border-t border-zinc-800/40">
                                {isUnsaved ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSavePrediction(match.id)}
                                    disabled={savingId === match.id}
                                    className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-black font-black uppercase italic tracking-widest text-[9px] rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                  >
                                    {savingId === match.id ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <Save size={12} />
                                    )}
                                    Confirmar Pronóstico
                                  </button>
                                ) : prediction.hasPrediction ? (
                                  <div className="py-2.5 bg-zinc-950/40 border border-zinc-850 rounded-xl text-[9px] font-black text-emerald-500 uppercase tracking-widest italic flex items-center justify-center gap-1.5 select-none">
                                    <CheckCircle2 size={13} strokeWidth={2.5} /> Guardado Exitoso
                                  </div>
                                ) : (
                                  <div className="py-2.5 text-zinc-550 border border-dashed border-zinc-800 rounded-xl text-[8px] font-black uppercase tracking-widest italic flex items-center justify-center select-none">
                                    Introduce goles y confirma
                                  </div>
                                )}
                              </div>
                            )}

                            {isAdmin && (
                              <div className="pt-2 border-t border-zinc-800/40">
                                <button
                                  type="button"
                                  onClick={() => setResolveModalMatch(match)}
                                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black uppercase italic tracking-widest text-[8px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                                >
                                  ⚡ Simular Resultado Real (Admin)
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-24 bg-zinc-900 border border-zinc-850 rounded-[2.5rem] space-y-4">
                  <p className="text-zinc-500 font-black uppercase italic tracking-widest text-xs">No se encontraron partidos</p>
                  <p className="text-[10px] text-zinc-650 font-bold uppercase tracking-widest italic">Intenta con otro filtro de búsqueda</p>
                </div>
              )}
            </motion.div>

            {/* Right Column: User's confirmed predictions */}
            <div className="lg:col-span-4 bg-zinc-900 border border-zinc-850 rounded-[2.5rem] p-6 lg:sticky lg:top-24 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black italic uppercase tracking-tighter text-white">MIS APUESTAS / PRODE</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">Historial de pronósticos</p>
                </div>
                <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-550/25 rounded-lg text-orange-500 text-[10px] font-black italic">
                  {savedPredictionsList.length} Jugados
                </span>
              </div>

              {savedPredictionsList.length === 0 ? (
                <div className="text-center py-10 space-y-2 border border-dashed border-zinc-800 rounded-2xl">
                  <p className="text-zinc-650 text-[10px] font-black uppercase tracking-widest italic">Aún no has guardado apuestas</p>
                  <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest leading-normal italic px-4">
                    Selecciona los goles en los partidos de la izquierda y haz clic en "Confirmar Pronóstico"
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 scrollbar-none">
                  {savedPredictionsList.map(({ match, prediction }) => {
                    const isFinished = match.status === 'finished';
                    const homeName = match.homeTeam?.name || match.home_team?.name || 'TBD';
                    const awayName = match.awayTeam?.name || match.away_team?.name || 'TBD';
                    const homeFlag = match.homeTeam?.flag_url || match.home_team?.flag_url;
                    const awayFlag = match.awayTeam?.flag_url || match.away_team?.flag_url;

                    return (
                      <div 
                        key={`sidebar-${match.id}`}
                        className="bg-zinc-950/40 hover:bg-zinc-950/90 border border-zinc-850 rounded-2xl p-4 transition-all flex flex-col gap-2.5 group"
                      >
                        {/* Entry header */}
                        <div className="flex items-center justify-between text-[8px] font-bold text-zinc-550 uppercase tracking-widest">
                          <span className="truncate max-w-[120px] italic">
                            {match.phase === 'group' ? `Grupo ${cleanGroupName(match.group_name)}` : match.phase}
                          </span>
                          {isFinished ? (
                            <span className={`px-1.5 py-0.5 rounded ${
                              prediction.points_earned === 3 
                                ? 'bg-orange-500/15 border border-orange-500/30 text-orange-500 font-extrabold' 
                                : prediction.points_earned === 1 
                                ? 'bg-zinc-800 border border-zinc-750 text-zinc-400 font-semibold' 
                                : 'bg-red-500/10 text-red-500'
                            }`}>
                              {prediction.points_earned === 3 ? '🏆 PERFECTO' : prediction.points_earned === 1 ? '✨ GANADOR' : '❌ 0 PTS'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-500 font-black">
                              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Confirmado
                            </span>
                          )}
                        </div>

                        {/* Teams predictions display */}
                        <div className="flex items-center justify-between">
                          {/* Home team mini indicator */}
                          <div className="flex items-center gap-2 w-[42%]">
                            <div className="w-6 h-4 rounded overflow-hidden border border-zinc-850 shrink-0 bg-black">
                              {homeFlag ? (
                                <img src={homeFlag} alt={homeName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-zinc-900" />
                              )}
                            </div>
                            <span className="text-[10px] font-black text-white italic truncate tracking-tight">{match.homeTeam?.code || match.home_team?.code || homeName}</span>
                          </div>

                          {/* Prediction scores badge in the center */}
                          <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 text-center font-mono font-black italic rounded-lg text-[11px] text-orange-500 w-[16%]">
                            {prediction.home_score}-{prediction.away_score}
                          </div>

                          {/* Away team mini indicator */}
                          <div className="flex items-center gap-2 justify-end w-[42%] text-right font-bold">
                            <span className="text-[10px] font-black text-white italic truncate tracking-tight">{match.awayTeam?.code || match.away_team?.code || awayName}</span>
                            <div className="w-6 h-4 rounded overflow-hidden border border-zinc-850 shrink-0 bg-black">
                              {awayFlag ? (
                                <img src={awayFlag} alt={awayName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-zinc-900" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Real match scores if finished spacer */}
                        {isFinished && (
                          <div className="pt-2 border-t border-zinc-905 flex items-center justify-between text-[8px] font-bold text-zinc-550 uppercase tracking-widest italic">
                            <span>Resultado Real:</span>
                            <span className="text-white font-black">{match.home_score} - {match.away_score}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
      
      <ResolveMatchModal
        isOpen={!!resolveModalMatch}
        onClose={() => setResolveModalMatch(null)}
        onConfirm={(homeScore, awayScore) => {
          if (resolveModalMatch) {
            handleResolveMatch(resolveModalMatch.id, homeScore, awayScore);
          }
        }}
        match={resolveModalMatch}
      />
    </div>
  );
};
