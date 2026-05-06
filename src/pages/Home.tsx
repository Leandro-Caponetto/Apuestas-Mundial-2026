import React, { useState, useEffect } from 'react';
import { MatchCard } from '@/components/MatchCard';
import { GroupGrid } from '@/components/GroupGrid';
import { TeamExplorer } from '@/components/TeamExplorer';
import { PredictionCenter } from '@/components/PredictionCenter';
import { Match, Team, Profile } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Calendar, LayoutGrid, Award, Search, Info, DollarSign, LogIn, LogOut, Database, User as UserIcon, Camera, Edit2, Loader2, ListOrdered, ChevronRight, Settings as SettingsIcon, X } from 'lucide-react';
import { TournamentBracket } from '@/components/TournamentBracket';
import { CountdownTimer } from '@/components/CountdownTimer';
import { MOCK_MATCHES } from '@/lib/mockData';
import { GROUPS, WORLD_CUP_TEAMS } from '@/lib/constants';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { dbService } from '@/services/dbService';
import { toast } from 'react-hot-toast';

type Tab = 'partidos' | 'grupos' | 'bracket' | 'ranking';

// Use standard path for public assets in Vite
const logo = '/assets/logo.svg';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('partidos');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ranking, setRanking] = useState<Profile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  // Bracket State
  const [bracketRounds, setBracketRounds] = useState<any[]>([]);

  const loadProfile = async (userId: string) => {
    const prof = await dbService.getProfile(userId);
    setProfile(prof);
  };

  const loadRanking = async () => {
    const data = await dbService.getRanking();
    setRanking(data);
  };

  useEffect(() => {
    // Auth Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      setIsAdmin(session?.user?.email === 'caponettopeppers@gmail.com');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      setIsAdmin(session?.user?.email === 'caponettopeppers@gmail.com');
    });

    loadRanking();

    // Data Subscriptions
    const unsubscribeBracket = dbService.subscribeBracket((rounds) => {
      setBracketRounds(rounds);
    });

    const unsubscribeMatches = dbService.subscribeMatches((newMatches) => {
      if (newMatches && newMatches.length > 0) {
        setMatches(newMatches);
        setLoading(false);
      } else {
        setMatches(MOCK_MATCHES);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeBracket();
      unsubscribeMatches();
    };
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage('Iniciando sesión...');
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    if (error) {
      setLoginMessage('Error: ' + error.message);
    } else {
      setLoginMessage('');
      setEmail('');
      setPassword('');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginMessage('Introduce email y contraseña');
      return;
    }
    setLoginMessage('Creando cuenta...');
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setLoginMessage('Error: ' + error.message);
    } else {
      setLoginMessage('¡Cuenta creada! Revisa tu email para confirmar.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande (máx 2MB)');
      return;
    }

    try {
      setIsUploading(true);
      const { url, error } = await dbService.uploadAvatar(user.id, file);
      
      if (error) {
        const errorLower = error.toLowerCase();
        if (errorLower.includes('bucket not found')) {
          toast.error('Configuración: Crea el bucket "avatars" en Supabase Storage y hazlo PÚBLICO.', { duration: 8000 });
        } else if (errorLower.includes('security policy') || errorLower.includes('row-level security') || errorLower.includes('rls')) {
          toast.error('Permisos: Ejecuta el SQL de RLS para el bucket "avatars" en tu panel de Supabase.', { duration: 10000 });
        } else {
          toast.error(`Error de Supabase: ${error}`);
        }
        return;
      }

      if (url) {
        const finalUrl = `${url}?t=${Date.now()}`;
        await dbService.updateProfile(user.id, { avatar_url: finalUrl });
        await loadProfile(user.id);
        await loadRanking();
        toast.success('¡Foto actualizada!', { icon: '📸' });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!user || !usernameInput.trim()) return;
    
    const loadingToast = toast.loading('Actualizando nombre...');
    try {
      await dbService.updateProfile(user.id, { username: usernameInput.trim() });
      await loadProfile(user.id);
      await loadRanking();
      setUsernameInput('');
      setShowProfileModal(false);
      toast.success('Nombre actualizado', { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar nombre', { id: loadingToast });
    }
  };

  const handleUpdateBracketScore = async (roundName: string, matchId: string, side: 'home' | 'away', value: string) => {
    // Optimistic update locally
    const nextRounds = [...bracketRounds];
    const rIdx = nextRounds.findIndex(r => r.name === roundName);
    if (rIdx === -1) return;

    const updatedMatches = nextRounds[rIdx].matches.map((m: any) => {
      if (m.id !== matchId) return m;
      return { ...m, [side === 'home' ? 'homeScore' : 'awayScore']: value };
    });

    nextRounds[rIdx] = { ...nextRounds[rIdx], matches: updatedMatches };

    // Auto-promote logic
    const currentMatch = updatedMatches.find((m: any) => m.id === matchId);
    if (currentMatch && rIdx < nextRounds.length - 1) {
      const homeScoreNum = parseInt(currentMatch.homeScore as string);
      const awayScoreNum = parseInt(currentMatch.awayScore as string);

      if (!isNaN(homeScoreNum) && !isNaN(awayScoreNum) && homeScoreNum !== awayScoreNum) {
        const winner = homeScoreNum > awayScoreNum ? currentMatch.homeTeam : currentMatch.awayTeam;
        if (winner) {
          const currentMatchIdx = updatedMatches.indexOf(currentMatch);
          const nextMatchIdx = Math.floor(currentMatchIdx / 2);
          const nextTeamSlot = currentMatchIdx % 2 === 0 ? 'homeTeam' : 'awayTeam';
          
          const nextRound = { ...nextRounds[rIdx + 1] };
          nextRound.matches = nextRound.matches.map((nm: any, idx: number) => {
            if (idx !== nextMatchIdx) return nm;
            return { ...nm, [nextTeamSlot]: winner };
          });
          nextRounds[rIdx + 1] = nextRound;
        }
      }
    }

    setBracketRounds(nextRounds);
    
    // Save to Firestore if admin
    if (isAdmin) {
      await dbService.saveBracket(nextRounds);
    }
  };

  const handleSetWinnerAtSlot = async (roundName: string, matchId: string, team: Team) => {
    const nextRounds = bracketRounds.map(round => {
      if (round.name !== roundName) return round;
      return {
        ...round,
        matches: round.matches.map((m: any) => {
          if (m.id !== matchId) return m;
          if (!m.homeTeam) return { ...m, homeTeam: team };
          if (m.homeTeam.id === team.id) return m;
          return { ...m, awayTeam: team };
        })
      };
    });

    setBracketRounds(nextRounds);
    if (isAdmin) {
      await dbService.saveBracket(nextRounds);
    }
  };

  const handleSeed = async () => {
    if (!isAdmin) return;
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
      alert('¡Base de datos inicializada correctamente! Refresca la página si no ves los cambios.');
      window.location.reload();
    } catch (err) {
      alert('Error al inicializar: Asegúrate de haber ejecutado el SQL en Supabase y tener permisos.');
      console.error(err);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Header */}
      <header className="relative pt-12 pb-16 px-8 rounded-[3rem] overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(249,115,22,0.15),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-orange-500/50 to-transparent" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-6 text-center md:text-left max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest italic"
            >
              <Award size={12} /> Road to 2026
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase italic leading-[0.9] text-glow"
            >
              Copa del <br /> <span className="text-orange-500">Mundo 2026</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="py-4"
            >
              <CountdownTimer />
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-zinc-400 text-lg md:text-xl font-medium max-w-lg leading-relaxed"
            >
              Predice cada resultado del torneo más grande de la historia. Juega contra el mundo y gana el ranking.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link 
                to="/"
                onClick={() => setActiveTab('partidos')}
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-linear-to-r from-orange-500 to-amber-500 rounded-2xl text-black font-black uppercase italic tracking-widest text-sm shadow-[0_10px_30px_rgba(249,115,22,0.3)] hover:shadow-[0_15px_40px_rgba(249,115,22,0.4)] transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <DollarSign size={20} className="relative z-10" />
                <span className="relative z-10">ZONA DE PREEDICCIÓN</span>
              </Link>

              {user ? (
                <div className="flex flex-wrap items-center gap-6 p-2 pr-6 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="flex items-center gap-4">
                    <div 
                      className="relative w-14 h-14 rounded-2xl bg-zinc-950 border border-orange-500/20 overflow-hidden flex items-center justify-center text-orange-500 font-black italic cursor-pointer group/avatar-nav"
                      onClick={() => {
                        setUsernameInput(profile?.username || '');
                        setShowProfileModal(true);
                      }}
                    >
                      {profile?.avatar_url ? (
                         <img src={profile.avatar_url} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">{user.email?.[0].toUpperCase()}</span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar-nav:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={16} className="text-white" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black italic text-lg tracking-tighter uppercase">
                          {profile?.username || user.email.split('@')[0]}
                        </span>
                        {isAdmin && (
                          <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none">
                          {profile?.points || 0} PTS
                        </span>
                        <div className="w-1 h-1 rounded-full bg-zinc-800" />
                        <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest leading-none">
                          RANK #{ranking.findIndex(r => r.id === user.id) + 1 || '---'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
                    {isAdmin && (
                      <button 
                        onClick={handleSeed}
                        className="p-3 bg-zinc-800 hover:bg-orange-500 text-zinc-500 hover:text-black rounded-xl transition-all border border-zinc-700/50"
                        title="Inicializar Base de Datos"
                      >
                        <Database size={16} />
                      </button>
                    )}
                    <button 
                      onClick={handleSignOut}
                      className="p-3 bg-zinc-800 hover:bg-red-500 text-zinc-500 hover:text-white rounded-xl transition-all border border-zinc-700/50"
                      title="Cerrar Sesión"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-md w-full mx-auto md:mx-0">
                  <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-b from-orange-500/5 to-transparent opacity-50" />
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-orange-500 transition-colors">
                            {isRegistering ? <UserIcon size={24} /> : <LogIn size={24} />}
                          </div>
                          <div className="text-left">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                              {isRegistering ? 'Registro' : 'Acceso'}
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic leading-none opacity-40">Mundial 2026</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsRegistering(!isRegistering)}
                          className="bg-zinc-800/30 hover:bg-zinc-800 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all border border-zinc-700/30"
                        >
                          {isRegistering ? 'YA TENGO CUENTA' : 'REGISTRARME'}
                        </button>
                      </div>
                      
                      <form onSubmit={isRegistering ? handleSignUp : handleSignIn} className="space-y-3">
                        <div className="space-y-2">
                          <input 
                            type="email"
                            placeholder="TU EMAIL"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-950/30 border border-zinc-800 rounded-2xl px-6 py-4 text-[10px] font-black italic tracking-widest text-white uppercase outline-none focus:border-orange-500/50 transition-all placeholder:text-zinc-700 shadow-inner"
                            required
                          />
                          <input 
                            type="password"
                            placeholder="TU CONTRASEÑA"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-950/30 border border-zinc-800 rounded-2xl px-6 py-4 text-[10px] font-black italic tracking-widest text-white uppercase outline-none focus:border-orange-500/50 transition-all placeholder:text-zinc-700 shadow-inner"
                            required
                          />
                        </div>
                        
                        <button 
                          type="submit"
                          className="w-full py-4 bg-white hover:bg-orange-500 text-black font-black uppercase italic tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center justify-center gap-3"
                        >
                          {isRegistering ? 'COMPLETAR REGISTRO' : 'ENTRAR AL JUEGO'}
                          <ChevronRight size={16} />
                        </button>
                      </form>
                      {loginMessage && (
                        <div className={`p-4 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-center border ${
                          loginMessage.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                        }`}>
                          {loginMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              rotate: 0,
              y: [0, -15, 0]
            }}
            transition={{ 
              duration: 0.8,
              y: {
                repeat: Infinity,
                duration: 4,
                ease: "easeInOut"
              }
            }}
            className="relative w-full md:w-[450px] aspect-square flex items-center justify-center pt-8 md:pt-0"
          >
            <div className="absolute inset-0 bg-white/5 blur-[120px] rounded-full" />
            <img 
              src={logo}
              className="w-full h-full object-contain relative z-10"
              alt="FIFA World Cup 2026 Official Logo"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';

                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-msg')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'fallback-msg absolute inset-0 flex flex-col items-center justify-center text-center z-10';

                  fallback.innerHTML = `
                    <span class="text-8xl md:text-9xl font-black text-white italic tracking-tighter leading-none select-none">
                      20<span class="text-orange-500">26</span>
                    </span>
                    <span class="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-white/20 mt-6 italic border-t border-white/5 pt-4">
                      Copa del Mundo
                    </span>
                  `;

                  parent.appendChild(fallback);
                }
              }}
            />
          </motion.div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 sticky top-6 z-40">
        <div className="p-1 glass rounded-full flex items-center gap-1 shadow-2xl">
          {[
            { id: 'partidos', label: 'Fixture', icon: Calendar },
            { id: 'grupos', label: 'Grupos', icon: LayoutGrid },
            { id: 'bracket', label: 'Eliminatorias', icon: Trophy },
            { id: 'ranking', label: 'Ranking', icon: ListOrdered },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase italic tracking-tighter transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <section className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'partidos' && (
            <motion.div 
              key="partidos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-64 bg-zinc-900/50 animate-pulse rounded-[2.5rem] border border-zinc-800" />
                  ))}
                </div>
              ) : (
                <PredictionCenter matches={matches} />
              )}

              {/* API Integration Section */}
              <TeamExplorer />
            </motion.div>
          )}

          {activeTab === 'grupos' && (
            <motion.div 
              key="grupos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              {/* Group Stage Header */}
              <div className="flex flex-col md:flex-row items-end justify-between gap-6 px-4">
                <div className="space-y-2">
                  <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter">
                    Fase de <span className="text-orange-500">Grupos</span>
                  </h2>
                  <div className="flex items-center gap-3 text-xs font-black text-zinc-500 uppercase tracking-widest italic">
                    <LayoutGrid size={14} className="text-orange-500" />
                    48 Equipos • 12 Grupos • 104 Partidos
                  </div>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Configuración Histórica</p>
                  <p className="text-xs font-bold text-white/40 italic">La mayor Copa del Mundo de la historia</p>
                </div>
              </div>

              {/* Opening Matches / Featured Section */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 px-4">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] italic whitespace-nowrap">Partidos Inaugurales</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { id: 'opening-1', home: 'MEX', away: 'A2', location: 'Estadio Azteca, CDMX', date: '11 JUN', stadium: 'Apertura A' },
                    { id: 'opening-2', home: 'CAN', away: 'B2', location: 'Toronto Stadium', date: '12 JUN', stadium: 'Apertura B' },
                    { id: 'opening-3', home: 'USA', away: 'D2', location: 'SoFi Stadium, LA', date: '12 JUN', stadium: 'Apertura C' },
                  ].map((match) => (
                    <div key={match.id} className="sport-card p-6 border-orange-500/10 group hover:border-orange-500/30 transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <span className="px-2 py-0.5 bg-orange-500 text-black text-[9px] font-black uppercase italic rounded">{match.stadium}</span>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">{match.date}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="text-center flex-1">
                          <div className="w-12 h-12 bg-white/5 rounded-full mx-auto mb-2 flex items-center justify-center border border-white/10 group-hover:border-orange-500/50 transition-colors">
                             <span className="text-lg font-black text-white italic">{match.home}</span>
                          </div>
                          <p className="text-xs font-black text-white italic">ANFITRIÓN</p>
                        </div>
                        <div className="text-zinc-700 font-black italic text-xl">VS</div>
                        <div className="text-center flex-1">
                          <div className="w-12 h-12 bg-white/5 rounded-full mx-auto mb-2 flex items-center justify-center border border-white/10 border-dashed">
                             <span className="text-lg font-black text-zinc-600 italic">?</span>
                          </div>
                          <p className="text-xs font-black text-zinc-600 italic">POR DEFINIR</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-[9px] font-bold text-zinc-500 uppercase italic">
                        <Info size={10} className="text-orange-500" /> {match.location}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Groups Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {GROUPS.map((group) => (
                  <GroupGrid 
                    key={group} 
                    groupName={group} 
                    teams={WORLD_CUP_TEAMS.filter(t => t.group_name === group).concat(
                      // Fill with placeholders if less than 4 teams
                      WORLD_CUP_TEAMS.filter(t => t.group_name === group).length < 4 
                      ? Array(4 - WORLD_CUP_TEAMS.filter(t => t.group_name === group).length).fill({ id: 'X', name: 'TBD', flag_url: '', code: 'TBD' } as Team)
                      : []
                    ).slice(0, 4)} 
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'bracket' && (
            <motion.div 
              key="bracket"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative left-1/2 -ml-[50vw] w-screen"
            >
              <div className="max-w-7xl mx-auto px-8 mb-12">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
                      Árbol de <span className="text-orange-500 text-glow">Eliminatorias</span>
                    </h2>
                    <div className="flex items-center gap-3 text-xs font-black text-zinc-500 uppercase tracking-widest italic">
                      <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]" /> 
                      Fase Final • FIFA World Cup 2026
                    </div>
                  </div>
                  
                  <div className="hidden lg:flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sedes</p>
                      <p className="text-sm font-black text-white italic">MÉXICO • USA • CANADÁ</p>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <Trophy size={40} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]" />
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <TournamentBracket 
                  rounds={bracketRounds} 
                  onUpdateScore={handleUpdateBracketScore}
                  onSetWinner={handleSetWinnerAtSlot}
                />
              </div>

              <div className="max-w-7xl mx-auto px-8 py-20 text-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Trophy size={80} className="mx-auto text-orange-500 mb-6 drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]" />
                </motion.div>
                <div className="space-y-2">
                  <p className="text-xl font-black text-white italic uppercase tracking-[0.2em]">El camino a la gloria eterna</p>
                  <p className="text-xs font-bold text-zinc-600 uppercase tracking-[0.5em]">Predice el campeón del mundo</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ranking' && (
            <motion.div 
              key="ranking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-[0.3em] italic">
                  <Award size={14} /> Tabla de Posiciones Global
                </div>
                <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none">
                  Ranking <span className="text-orange-500 text-glow">Mundial</span>
                </h1>
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 px-10 py-6 bg-zinc-950/50 border-b border-zinc-800 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 italic">
                   <div className="col-span-1">POS</div>
                   <div className="col-span-7 md:col-span-8">JUGADOR</div>
                   <div className="col-span-4 md:col-span-3 text-right">PUNTAJE</div>
                </div>

                <div className="divide-y divide-zinc-800/20">
                  {ranking.map((row, index) => (
                    <div key={row.id} className={`grid grid-cols-12 px-10 py-8 items-center hover:bg-white/[0.02] transition-all group ${row.id === user?.id ? 'bg-orange-500/5' : ''}`}>
                      <div className="col-span-1">
                         {index === 0 && <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(251,191,36,0.3)]"><Trophy size={16} /></div>}
                         {index > 0 && <span className="text-zinc-600 font-black italic text-xl ml-1">#{index + 1}</span>}
                      </div>
                      <div className="col-span-7 md:col-span-8 flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 p-0.5 overflow-hidden flex items-center justify-center group-hover:border-orange-500/50 transition-colors shadow-2xl">
                          {row.avatar_url ? (
                            <img src={row.avatar_url} alt={row.username} referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <UserIcon size={24} className="text-zinc-800" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-white text-xl md:text-2xl uppercase italic tracking-tighter leading-none group-hover:text-orange-500 transition-colors">
                            {row.username || 'Usuario Nuevo'}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-4 md:col-span-3 text-right">
                        <div className="inline-flex flex-col items-end">
                          <span className="text-3xl md:text-4xl font-black text-white italic leading-none">{row.points}</span>
                          <span className="text-[9px] text-orange-500 font-black uppercase tracking-[0.3em] mt-1">PUNTOS</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUploading && setShowProfileModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.1),transparent_70%)]" />
              
              <div className="relative z-10 space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Editar Perfil</h3>
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest italic">Personaliza tu identidad</p>
                </div>

                <div className="flex flex-col items-center gap-5">
                  <div className="relative group/avatar-modal">
                    <div className="w-24 h-24 rounded-[2rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 flex items-center justify-center text-orange-500 font-black italic overflow-hidden shadow-2xl group-hover:border-orange-500/40 transition-all">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-20">
                          <UserIcon size={28} />
                          <span className="text-[7px] font-black uppercase tracking-widest">SIN FOTO</span>
                        </div>
                      )}
                      
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar-modal:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        {isUploading ? (
                          <Loader2 size={24} className="text-white animate-spin" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                             <Camera size={20} className="text-white" />
                             <span className="text-[7px] font-bold text-white uppercase tracking-widest">CAMBIAR</span>
                          </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                      </label>
                    </div>
                  </div>

                  <div className="w-full space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic ml-3">Nombre de Usuario</label>
                    <input 
                      type="text"
                      placeholder="TU NOMBRE"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-xs font-black italic tracking-widest text-white uppercase outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleUpdateUsername}
                    disabled={isUploading || !usernameInput.trim()}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50 active:scale-95"
                  >
                    GUARDAR CAMBIOS
                  </button>
                  <button 
                    onClick={() => setShowProfileModal(false)}
                    disabled={isUploading}
                    className="w-full py-3 text-zinc-600 hover:text-zinc-400 font-black uppercase italic tracking-widest text-[9px] transition-colors"
                  >
                    CANCELAR
                  </button>
                </div>
              </div>

              <button 
                onClick={() => !isUploading && setShowProfileModal(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
