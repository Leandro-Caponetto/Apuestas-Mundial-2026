import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  TrendingUp, 
  Wallet, 
  Clock, 
  ChevronRight, 
  Download, 
  Trash2, 
  DollarSign, 
  ChevronLeft,
  ArrowRightLeft,
  LayoutDashboard,
  ListOrdered,
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  PlusCircle,
  X
} from 'lucide-react';
import { WORLD_CUP_TEAMS } from '../lib/constants';
import { TournamentBracket } from './TournamentBracket';
import { CommunityBoard } from './CommunityBoard';
import { formatDate } from '@/lib/utils';
import { dbService } from '@/services/dbService';
import { Match, Profile } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface BetOption {
  id: string;
  matchId: string;
  matchTeams: string;
  selection: string;
  odds: number;
}

interface MatchBetting {
  id: string;
  home: typeof WORLD_CUP_TEAMS[0];
  away: typeof WORLD_CUP_TEAMS[0];
  date: string;
  time: string;
  venue: string;
  city: string;
  round: string;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
}

const CITIES = ['New York/NJ', 'Dallas', 'Kansas City', 'Houston', 'Atlanta', 'Los Angeles', 'Philadelphia', 'Seattle', 'San Francisco', 'Boston', 'Miami', 'Mexico City', 'Monterrey', 'Guadalajara', 'Vancouver', 'Toronto'];
const STADIUMS = ['MetLife Stadium', 'AT&T Stadium', 'Arrowhead Stadium', 'NRG Stadium', 'Mercedes-Benz Stadium', 'SoFi Stadium', 'Lincoln Financial Field', 'Lumen Field', 'Levi\'s Stadium', 'Gillette Stadium', 'Hard Rock Stadium', 'Estadio Azteca', 'Estadio BBVA', 'Estadio Akron', 'BC Place', 'BMO Field'];

export const BettingZone: React.FC = () => {
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [betSlip, setBetSlip] = useState<BetOption[]>([]);
  const [betAmount, setBetAmount] = useState('2000');
  const [selectedMatch, setSelectedMatch] = useState<MatchBetting | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'BRACKET'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('TODO');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBets, setUserBets] = useState<any[]>([]);

  // Recharge Modal State
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeValue, setRechargeValue] = useState('2000');
  const [isRecharging, setIsRecharging] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let subProfile: (() => void) | undefined;
    let subBets: (() => void) | undefined;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Subscribe to profile for real-time balance
        subProfile = dbService.subscribeProfile(session.user.id, (p) => {
          setProfile(p);
          setBalance(p.balance || 0);
        });

        // Subscribe to bets for real-time history
        subBets = dbService.subscribeAllBets((allBets) => {
          const userOnly = allBets.filter((b: any) => b.user_id === session.user.id);
          setUserBets(userOnly);
        });
      }

      // Matches don't change often but let's keep them static for now as they were
      const mData = await dbService.getMatches();
      setMatches(mData);
      
      setLoading(false);
    };

    init();

    return () => {
      if (subProfile) subProfile();
      if (subBets) subBets();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    
    if (paymentStatus === 'success') {
      toast.success('¡Pago procesado con éxito! Tu saldo se actualizará en breve.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'failure') {
      toast.error('El pago no pudo completarse. Intenta nuevamente.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleRecharge = async () => {
    if (!profile) return;
    const amount = parseFloat(rechargeValue);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setIsRecharging(true);
    try {
      // Call our backend to create a Mercado Pago preference
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, userId: profile.id })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Falla al crear preferencia de Mercado Pago');
      }

      const { init_point } = await response.json();

      // Redirect to Mercado Pago Checkout
      toast.loading('Redirigiendo a Mercado Pago...', { duration: 2000 });
      window.location.href = init_point;
    } catch (err: any) {
      toast.error('Error: ' + (err.message || 'Error al conectar con Mercado Pago'));
      console.error(err);
      
      // Fallback for demo if MP is not configured
      if (err.message.includes('not configured')) {
        toast('Modo Demo: Se aplicará recarga directa bypassando Mercado Pago', { icon: 'ℹ️' });
        const newBal = await dbService.addCredits(profile.id, amount);
        setBalance(newBal);
        setIsRechargeModalOpen(false);
        toast.success(`¡Créditos cargados! Nuevo saldo: $${newBal}`);
      }
    } finally {
      setIsRecharging(false);
    }
  };

  const handleSyncMatches = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Sincronizando con Football-Data.org...');
    try {
      const res = await fetch('/api/sync-matches', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sincronización exitosa: ${data.count} partidos procesados`, { id: toastId });
        const mData = await dbService.getMatches();
        setMatches(mData);
      } else {
        toast.error('Error: ' + (data.error || 'Fallo desconocido'), { id: toastId });
      }
    } catch (err: any) {
      toast.error('Error de red al sincronizar', { id: toastId });
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetBalance = async () => {
    if (!profile) return;
    if (!confirm('¿Seguro que quieres resetear tu balance a $50.000?')) return;

    try {
      const newBal = await dbService.resetBalance(profile.id, 50000);
      setBalance(newBal);
      toast.success('¡Billetera reseteada correctamente!');
    } catch (err: any) {
      toast.error('Error al resetear');
      console.error(err);
    }
  };

  const allMatches = useMemo(() => {
    return matches.map(m => ({
      id: m.id,
      home: m.homeTeam || { name: 'TBD', flag_url: '', code: 'TBD' } as any,
      away: m.awayTeam || { name: 'TBD', flag_url: '', code: 'TBD' } as any,
      date: m.start_at ? formatDate(m.start_at) : 'TBD',
      time: m.start_at ? new Date(m.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD',
      venue: 'Estadio Mundialista',
      city: m.group_name ? `Grupo ${m.group_name}` : 'Sede oficial',
      round: m.phase === 'group' ? `Grupo ${m.group_name}` : m.phase,
      odds: {
        home: 1.5 + Math.random() * 2,
        draw: 3.1 + Math.random() * 1.2,
        away: 1.9 + Math.random() * 2.8
      }
    })) as MatchBetting[];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return allMatches.filter(m => {
      const matchesSearch = 
        m.home.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.away.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (activeFilter === 'TODO') return matchesSearch;
      return matchesSearch && m.round.includes(activeFilter);
    });
  }, [allMatches, searchTerm, activeFilter]);

  const groupedMatches = useMemo((): { [key: string]: MatchBetting[] } => {
    const groups: { [key: string]: MatchBetting[] } = {};
    filteredMatches.forEach(m => {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);
    });
    return groups;
  }, [filteredMatches]);

  const addToBetSlip = React.useCallback((match: MatchBetting, selection: string, odds: number, market: string = 'Ganador del partido') => {
    const betId = `${match.id}-${selection}-${market}`;
    
    setBetSlip(prev => {
      let nextSlip: BetOption[] = [];
      const exists = prev.find(b => b.id === betId);
      if (exists) {
        // Toggle: Si ya existe exactamente la misma apuesta, la quitamos
        nextSlip = [];
      } else {
        // Como el usuario pidió "solo una a la vez", forzamos el slip a tener solo este item
        nextSlip = [{
          id: betId,
          matchId: match.id,
          matchTeams: `${match.home.name} vs ${match.away.name}`,
          selection: `${selection}`,
          odds
        }];
      }
      slipRef.current = nextSlip;
      return nextSlip;
    });
  }, []);

  const removeFromSlip = React.useCallback((id: string) => {
    setBetSlip(prev => {
      const nextSlip = prev.filter(b => b.id !== id);
      slipRef.current = nextSlip;
      return nextSlip;
    });
  }, []);

  const isPlacingBetRef = React.useRef(false);

  const slipRef = React.useRef<BetOption[]>([]);
  useEffect(() => {
    slipRef.current = betSlip;
  }, [betSlip]);

  const userStats = useMemo(() => {
    const totalWagered = userBets.reduce((acc, b) => acc + (b.amount || 0), 0);
    const winnableAmount = userBets.reduce((acc, b) => acc + (b.potential_win || 0), 0);
    return {
      count: userBets.length,
      totalWagered,
      winnableAmount
    };
  }, [userBets]);

  const handlePlaceBet = async () => {
    if (isPlacingBetRef.current || isPlacingBet) {
      console.log('Bet placement already in progress, ignoring extra click.');
      return;
    }
    
    if (!profile) {
      toast.error('Debes iniciar sesión para apostar');
      return;
    }

    const currentSlip = slipRef.current;
    if (currentSlip.length === 0) {
      toast.error('Selecciona una opción para apostar');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    if (amount < 2000) {
      toast.error('La apuesta mínima es de $2.000');
      return;
    }

    if (amount > balance) {
      toast.error('Saldo insuficiente');
      return;
    }

    // LOCK
    isPlacingBetRef.current = true;
    setIsPlacingBet(true);
    
    const loadingToast = toast.loading('Procesando apuesta única...');
    
    // Capturamos los items actuales y LIMPIAMOS el slip de inmediato de forma atómica
    const itemsToSave = [...currentSlip];
    const totalOddsVal = itemsToSave.reduce((acc, bet) => acc * bet.odds, 1);
    const winVal = amount * totalOddsVal;
    
    // Vaciamos el slip tanto en estado como en el ref para evitar cualquier fuga
    setBetSlip([]);
    slipRef.current = [];

    try {
      // Usamos la función atómica para asegurar que no haya duplicados y el balance sea correcto
      const result = await dbService.placeBetAtomic({
        user_id: profile.id,
        items: itemsToSave,
        amount,
        odds: totalOddsVal,
        potential_win: winVal
      });

      if (result && result.new_balance !== undefined) {
        setBalance(result.new_balance);
        // Refresh bets
        const bets = await dbService.getAllBets();
        const userOnly = bets.filter((b: any) => b.user_id === profile.id);
        setUserBets(userOnly);
      }
      
      toast.success(`¡Apuesta de $${amount} confirmada! ⚽`, { id: loadingToast });
    } catch (err: any) {
      // Si falla, devolvemos los items al slip para que el usuario no los pierda
      setBetSlip(itemsToSave);
      slipRef.current = itemsToSave;
      const msg = err.message || 'Error técnico al procesar';
      toast.error(`Atención: ${msg}`, { id: loadingToast });
      console.error('Bet Error:', err);
    } finally {
      // Liberamos el bloqueo después de un pequeño cooldown
      setTimeout(() => {
        setIsPlacingBet(false);
        isPlacingBetRef.current = false;
      }, 1000);
    }
  };

  const handleDeleteBet = async (betId: string, amount: number) => {
    try {
      await dbService.deleteBet(betId);
      
      // Update balance (refund)
      if (profile?.id) {
        const newBalance = await dbService.addCredits(profile.id, amount);
        setBalance(newBalance);
        
        // Refresh local history
        setUserBets(prev => prev.filter(b => b.id !== betId));
        toast.success('Apuesta eliminada y reembolso procesado 💸');
      }
    } catch (error) {
      console.error('Error deleting bet:', error);
      toast.error('No se pudo eliminar la apuesta');
    }
  };

  const totalOdds = betSlip.reduce((acc, bet) => acc * bet.odds, 1);
  const potentialWin = (parseFloat(betAmount) || 0) * totalOdds;

  const dummyRounds = [
    {
      title: 'Octavos de Final',
      matches: matches.slice(0, 8).map(m => ({
        id: m.id,
        homeTeam: m.home,
        awayTeam: m.away,
        homeScore: 0,
        awayScore: 0,
        status: 'PENDING',
        date: m.date
      }))
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6 font-sans">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="text-cyan-500 animate-pulse" size={32} />
          </div>
        </div>
        <div className="space-y-2 text-center">
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">SYSTEM ONLINE</h3>
          <p className="text-[10px] text-cyan-500/50 font-bold uppercase tracking-[0.5em] animate-pulse italic">Iniciando protocolo de apuestas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden pb-40 font-sans">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-amber-500/5 blur-[150px] rounded-full" />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Recharge Modal */}
      <AnimatePresence>
        {isRechargeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRechargeModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12">
                <Wallet size={120} className="text-white" />
              </div>

              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black">
                      <Wallet size={20} />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Cargar Créditos</h3>
                  </div>
                  <button onClick={() => setIsRechargeModalOpen(false)} className="text-white/20 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] italic">INGRESAR MONTO (USD)</p>
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                    <span className="text-3xl font-black italic text-amber-500">$</span>
                    <input 
                      type="number"
                      value={rechargeValue}
                      onChange={(e) => setRechargeValue(e.target.value)}
                      className="w-full bg-transparent border-none text-right text-4xl font-black italic text-white outline-none tabular-nums placeholder:text-white/5"
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {['100', '500', '1000', '5000'].map(val => (
                    <button 
                      key={val}
                      onClick={() => setRechargeValue(val)}
                      className={`py-3 rounded-xl border text-[10px] font-black transition-all ${rechargeValue === val ? 'bg-amber-500 border-amber-500 text-black' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleRecharge}
                  disabled={isRecharging}
                  className="w-full bg-amber-500 text-black py-5 rounded-2xl text-xs font-black italic uppercase tracking-[0.3em] shadow-xl shadow-amber-500/20 hover:bg-white transition-all disabled:opacity-50"
                >
                  {isRecharging ? 'PROCESANDO...' : 'CONFIRMAR CARGA'}
                </button>

                <p className="text-[8px] text-white/10 text-center font-bold uppercase tracking-widest leading-relaxed">
                  * Los créditos se verán reflejados <br/> instantáneamente en tu billetera.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12 space-y-10">
        
        {/* Fututistic Dashboard Header */}
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-linear-to-br from-[#0f172a] via-[#020617] to-[#0f172a] p-10 md:p-16 rounded-[3rem] border border-white/5 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
            
            <div className="relative z-10 space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
              >
                <div className="px-5 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] italic">Red Operativa Mundial</span>
                </div>
                <button 
                  onClick={handleSyncMatches}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-cyan-400 transition-all disabled:opacity-50"
                >
                  <TrendingUp size={12} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sincronizando...' : 'Live Sync API'}
                </button>
                <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic">Est. 2026</div>
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter leading-none">
                  CYBER<br/>
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600">ARENA</span>
                </h1>
                <p className="max-w-xl text-xs font-bold text-white/40 uppercase tracking-widest leading-relaxed ml-2 italic">
                  Plataforma de alta fidelidad para el Mercado de Apuestas de la Copa Mundial FIFA 2026. Datos sincronizados vía satélite en tiempo real.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <button 
                  onClick={() => setViewMode('LIST')}
                  className={`px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] italic transition-all relative overflow-hidden group ${viewMode === 'LIST' ? 'bg-cyan-500 text-black shadow-[0_0_30px_rgba(6,182,212,0.4)]' : 'bg-white/5 border border-white/10 hover:border-cyan-500/50'}`}
                >
                  <span className="relative z-10 flex items-center gap-2 font-black">
                    <ListOrdered size={16} /> Panel de Eventos
                  </span>
                </button>
                <button 
                  onClick={() => setViewMode('BRACKET')}
                  className={`px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] italic transition-all relative overflow-hidden group ${viewMode === 'BRACKET' ? 'bg-purple-600 text-white shadow-[0_0_30px_rgba(147,51,234,0.4)]' : 'bg-white/5 border border-white/10 hover:border-purple-500/50'}`}
                >
                  <span className="relative z-10 flex items-center gap-2 font-black">
                    <LayoutDashboard size={16} /> Visualizador Bracket
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.5em] italic">BILLETERA</p>
                <Wallet className="text-white/10 group-hover:text-cyan-500 transition-colors" size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-5xl font-black text-white italic tabular-nums tracking-tighter">${balance.toLocaleString()}</h4>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest italic">Activo & Verificado</span>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-2 gap-4 border-t border-white/5">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">Apuestas</p>
                  <p className="text-xl font-black text-white italic tabular-nums">{userStats.count}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">Total Jugado</p>
                  <p className="text-xl font-black text-cyan-500 italic tabular-nums">${userStats.totalWagered.toLocaleString()}</p>
                </div>
              </div>

              {userBets.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] italic mb-2">Historial Reciente</p>
                  {userBets.slice(0, 5).map((bet, idx) => (
                    <div key={bet.id || idx} className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between group/bet">
                      <div className="space-y-1">
                        <div className="flex gap-1 overflow-hidden max-w-[120px]">
                          {bet.items?.map((it: any, i: number) => (
                            <span key={i} className="text-[7px] font-black bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded uppercase">
                              {it.selection.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                        <p className="text-[8px] font-bold text-white/40 italic">
                          {new Date(bet.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-white italic">${bet.amount.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-emerald-500 italic">x{bet.odds?.toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteBet(bet.id, bet.amount)}
                        className="ml-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 opacity-0 group-hover/bet:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsRechargeModalOpen(true)}
                className="w-full bg-cyan-500 text-black py-4 rounded-2xl text-[10px] font-black italic uppercase tracking-[0.4em] shadow-xl hover:bg-white transition-all"
              >
                Recargar Fondos
              </motion.button>
              <button 
                onClick={handleResetBalance}
                className="w-full text-center py-2 text-[8px] font-black text-white/20 hover:text-red-500 uppercase tracking-widest italic transition-colors"
              >
                Resetear Cuenta
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Component */}
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-500 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Filtro de búsqueda avanzada..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-sm font-black italic focus:border-cyan-500/50 outline-none transition-all placeholder:text-white/10 uppercase tracking-[0.2em]"
            />
          </div>
          <div className="flex gap-2">
            {['TODO', 'Grupo', 'Final'].map(f => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-8 py-3 rounded-xl text-[9px] font-black italic uppercase tracking-widest border transition-all ${activeFilter === f ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 relative z-10">
          
          {/* Main Matches Area */}
          <div className="lg:col-span-8 space-y-12">
            <AnimatePresence mode="wait">
              {selectedMatch ? (
                /* MATCH DETAIL (CYBER STYLE) */
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="space-y-8"
                >
                  <button 
                    onClick={() => setSelectedMatch(null)}
                    className="flex items-center gap-3 text-cyan-500/40 hover:text-cyan-500 transition-all text-[10px] font-black uppercase tracking-[0.4em] italic mb-4"
                  >
                    <ChevronLeft size={16} /> CERRAR VISTA DETALLADA
                  </button>

                  <div className="bg-[#0f172a] border border-white/5 rounded-[4rem] p-12 md:p-24 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none rotate-12 text-cyan-500">
                      <TrendingUp size={600} />
                    </div>

                    <div className="relative z-10 space-y-20">
                      <div className="flex flex-col items-center gap-6 text-center">
                        <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black italic text-cyan-500 uppercase tracking-[0.4em]">
                           {selectedMatch.venue.toUpperCase()} • {selectedMatch.city.toUpperCase()}
                        </div>
                        <h3 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white/10">{selectedMatch.date} @ {selectedMatch.time}</h3>
                      </div>

                      <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="flex flex-col items-center gap-8 group flex-1">
                           <div className="relative">
                             <div className="absolute -inset-4 bg-cyan-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="w-48 md:w-64 aspect-[4/3] rounded-[2rem] overflow-hidden border-4 border-white/10 relative z-10">
                                <img src={selectedMatch.home.flag_url} className="w-full h-full object-cover" />
                             </div>
                           </div>
                           <h4 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-center">{selectedMatch.home.name}</h4>
                        </div>

                        <div className="flex flex-col items-center">
                           <span className="text-8xl md:text-[10rem] font-black italic text-white/5 leading-none">VS</span>
                        </div>

                        <div className="flex flex-col items-center gap-8 group flex-1">
                           <div className="relative">
                             <div className="absolute -inset-4 bg-purple-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="w-48 md:w-64 aspect-[4/3] rounded-[2rem] overflow-hidden border-4 border-white/10 relative z-10">
                                <img src={selectedMatch.away.flag_url} className="w-full h-full object-cover" />
                             </div>
                           </div>
                           <h4 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-center">{selectedMatch.away.name}</h4>
                        </div>
                      </div>

                      {/* Odds Selection in detail */}
                      <div className="grid md:grid-cols-3 gap-6 pt-10">
                         {[
                           { l: selectedMatch.home.name, o: selectedMatch.odds.home, t: selectedMatch.home.name },
                           { l: 'EMPATE', o: selectedMatch.odds.draw, t: 'EMPATE' },
                           { l: selectedMatch.away.name, o: selectedMatch.odds.away, t: selectedMatch.away.name }
                         ].map(opt => (
                           <button
                             key={opt.l}
                             onClick={() => addToBetSlip(selectedMatch, opt.l, opt.o, '1X2')}
                             className={`p-10 rounded-[2.5rem] border transition-all flex flex-col items-center gap-3 relative overflow-hidden group/opt ${
                               betSlip.find(b => b.id === `${selectedMatch.id}-${opt.l}-1X2`)
                                 ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_40px_rgba(6,182,212,0.3)]'
                                 : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                             }`}
                           >
                             <span className={`text-[9px] font-black uppercase tracking-[0.4em] italic mb-2 ${betSlip.find(b => b.id === `${selectedMatch.id}-${opt.l}-1X2`) ? 'text-black/60' : 'text-white/20'}`}>
                               {opt.t}
                             </span>
                             <span className="text-4xl font-black italic tracking-tighter tabular-nums">{opt.o.toFixed(2)}</span>
                             <span className={`text-[10px] font-black uppercase italic ${betSlip.find(b => b.id === `${selectedMatch.id}-${opt.l}-1X2`) ? 'text-black' : 'text-cyan-500'}`}>
                               SELECCIONAR
                             </span>
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : viewMode === 'BRACKET' ? (
                /* BRACKET VIEW */
                <motion.div
                  key="bracket"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <TournamentBracket 
                    rounds={dummyRounds} 
                    onMatchClick={(bracketMatch) => {
                      // Map bracket match back to a betting match
                      const mockMatch: MatchBetting = {
                        id: bracketMatch.id,
                        home: bracketMatch.homeTeam || WORLD_CUP_TEAMS[0],
                        away: bracketMatch.awayTeam || WORLD_CUP_TEAMS[1],
                        date: bracketMatch.date || 'TBD',
                        time: '20:00',
                        venue: 'ESTADIO MUNDIALISTA',
                        city: 'CIUDAD ANFITRIONA',
                        round: 'Eliminatorias',
                        odds: { home: 2.1, draw: 3.4, away: 2.8 }
                      };
                      setSelectedMatch(mockMatch);
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="space-y-16"
                >
                  {(Object.entries(groupedMatches) as [string, MatchBetting[]][]).map(([date, dateMatches]) => (
                    <div key={date} className="space-y-6">
                      <div className="flex items-center gap-6 px-4">
                        <div className="w-1.5 h-12 bg-linear-to-b from-cyan-500 to-purple-600 rounded-full" />
                        <div>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">{date}</h3>
                          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em] italic">Cronograma oficial de competencia</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {dateMatches.map(match => (
                          <motion.div 
                            key={match.id} 
                            whileHover={{ scale: 1.01, x: 10 }}
                            onClick={(e) => {
                              if (!(e.target as HTMLElement).closest('button')) {
                                setSelectedMatch(match);
                              }
                            }}
                            className="bg-[#0f172a]/40 border border-white/5 rounded-3xl p-8 hover:bg-[#0f172a]/80 transition-all group cursor-pointer shadow-xl relative overflow-hidden"
                          >
                            {/* Card Decoration */}
                            <div className="absolute top-0 right-10 bottom-0 w-px bg-linear-to-b from-transparent via-cyan-500/20 to-transparent" />
                            
                            <div className="flex flex-col xl:flex-row items-center gap-10">
                              <div className="flex-1 w-full xl:w-auto">
                                <div className="flex items-center gap-4 mb-6">
                                  <div className="px-3 py-1 bg-white/5 rounded-md text-[8px] font-black italic text-white/30 uppercase tracking-[0.3em] border border-white/5">
                                    LIVE FEED
                                  </div>
                                  <span className="text-[10px] font-black text-cyan-500 italic uppercase tabular-nums">{match.time}</span>
                                </div>
                                
                                <div className="space-y-6">
                                  <div className="flex items-center justify-between group/home">
                                    <div className="flex items-center gap-5">
                                      <div className="w-12 h-8 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                        <img src={match.home.flag_url} className="w-full h-full object-cover" />
                                      </div>
                                      <span className="text-xl font-black italic uppercase tracking-tight group-hover/home:text-cyan-400 transition-colors">{match.home.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-white/10 group-hover/home:text-white/40 transition-colors">{match.home.code}</span>
                                  </div>
                                  <div className="flex items-center justify-between group/away">
                                    <div className="flex items-center gap-5">
                                      <div className="w-12 h-8 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                        <img src={match.away.flag_url} className="w-full h-full object-cover" />
                                      </div>
                                      <span className="text-xl font-black italic uppercase tracking-tight group-hover/away:text-purple-400 transition-colors">{match.away.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-white/10 group-hover/away:text-white/40 transition-colors">{match.away.code}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3 w-full xl:w-[450px]">
                                {[
                                  { label: match.home.name, code: match.home.name, odds: match.odds.home },
                                  { label: 'EMPATE', code: 'EMPATE', odds: match.odds.draw },
                                  { label: match.away.name, code: match.away.name, odds: match.odds.away }
                                ].map(opt => (
                                  <button
                                    key={opt.label}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToBetSlip(match, opt.label, opt.odds, '1X2');
                                    }}
                                    className={`py-8 rounded-3xl border transition-all flex flex-col items-center justify-center gap-2 group/btn ${
                                      betSlip.find(b => b.id === `${match.id}-${opt.label}-1X2`)
                                        ? 'bg-cyan-500 border-cyan-500 text-black font-black shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                                        : 'bg-white/5 border-white/5 hover:border-cyan-500/50'
                                    }`}
                                  >
                                    <span className={`text-[8px] font-black uppercase italic tracking-widest ${betSlip.find(b => b.id === `${match.id}-${opt.label}-1X2`) ? 'text-black/60' : 'text-white/20 group-hover/btn:text-cyan-500'}`}>
                                      {opt.code}</span>
                                    <span className="text-2xl font-black italic tabular-nums tracking-tighter">{opt.odds.toFixed(2)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Community Board Section */}
            <div className="pt-20 border-t border-white/5">
              <CommunityBoard 
                onBetDeleted={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session?.user) {
                    const p = await dbService.getProfile(session.user.id);
                    if (p) {
                      setProfile(p);
                      setBalance(p.balance || 0);
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* New Cyber Bet Slip */}
          <div className="lg:col-span-4 h-fit lg:sticky lg:top-8">
            <div className="bg-[#0f172a] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none rotate-45 text-cyan-500">
                 <Trophy size={300} />
               </div>

               <div className="relative z-10 flex flex-col gap-10">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-cyan-500 text-black rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        <DollarSign size={28} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">SLIP</h3>
                        <p className="text-[9px] font-bold text-cyan-500/50 uppercase tracking-[0.4em] italic mt-1">OPERATIVO 24/7</p>
                      </div>
                    </div>
                    {betSlip.length > 0 && (
                      <button 
                        onClick={() => {
                          setBetSlip([]);
                          slipRef.current = [];
                        }}
                        className="text-[9px] font-black uppercase text-white/20 hover:text-red-500 transition-colors italic tracking-widest"
                      >
                        Limpiar Todo
                      </button>
                    )}
                 </div>

                 <div className="space-y-4 min-h-[100px] max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                    <AnimatePresence mode="popLayout">
                      {betSlip.length === 0 ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-16 text-center space-y-6"
                        >
                           <Download className="mx-auto text-white/5 -rotate-90 animate-bounce" size={48} />
                           <p className="text-[10px] font-black text-white/10 uppercase italic tracking-[0.5em] leading-relaxed">
                             SISTEMA EN ESPERA<br/>SELECCIONE UN EVENTO
                           </p>
                        </motion.div>
                      ) : (
                        betSlip.map(bet => (
                          <motion.div 
                            key={bet.id}
                            initial={{ opacity: 0, x: 30, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -50, scale: 0.9, transition: { duration: 0.2 } }}
                            className="bg-white/5 border border-white/5 rounded-[2rem] p-8 relative group/card hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-all"
                          >
                             <button 
                               onClick={() => removeFromSlip(bet.id)}
                               className="absolute top-6 right-6 text-white/10 hover:text-red-500 transition-colors"
                             >
                               <Trash2 size={18} />
                             </button>
                             <div className="space-y-6">
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic">{bet.matchTeams}</p>
                                  <h4 className="text-xl font-black italic uppercase text-white tracking-widest">{bet.selection}</h4>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                   <span className="text-[9px] font-black text-cyan-500 uppercase italic tracking-widest">CUOTA</span>
                                   <span className="text-2xl font-black italic text-cyan-400 tabular-nums">{bet.odds.toFixed(2)}</span>
                                </div>
                             </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                 </div>

                 {betSlip.length > 0 && (
                   <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8 pt-8 border-t border-white/5"
                   >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase italic tracking-widest text-white/30">
                          <span>Importe de Apuesta</span>
                          <span>Billetera: ${balance.toLocaleString()}</span>
                        </div>
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 flex items-center justify-between group-focus-within:border-cyan-500/50 transition-all">
                           <span className="text-3xl font-black text-white/20 italic">$</span>
                           <input 
                             type="number"
                             value={betAmount}
                             onChange={(e) => setBetAmount(e.target.value)}
                             className="w-full bg-transparent border-none text-right text-4xl font-black italic text-white outline-none tabular-nums"
                           />
                        </div>
                        <div className="flex gap-2">
                           {['2000', '5000', '10000', 'MAX'].map(v => (
                             <button
                               key={v}
                               onClick={() => setBetAmount(v === 'MAX' ? balance.toString() : v)}
                               className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-[8px] font-black italic hover:bg-white/10 hover:border-white/10 transition-all"
                             >
                               {v === 'MAX' ? 'TODO' : `$${v}`}
                             </button>
                           ))}
                        </div>
                      </div>

                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-3xl p-8 space-y-4">
                        <div className="flex items-center justify-between text-[10px] font-black text-white/40 uppercase italic tracking-[0.2em]">
                           <span>Probabilidad Final</span>
                           <span className="text-white text-lg">x{totalOdds.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-xs font-black text-cyan-500 uppercase italic tracking-widest">RETORNO ESTIMADO</span>
                           <span className="text-3xl font-black text-cyan-500 italic tabular-nums">${potentialWin.toFixed(2)}</span>
                        </div>
                      </div>

                      <button 
                        onClick={handlePlaceBet}
                        disabled={isPlacingBet || parseFloat(betAmount) < 2000 || parseFloat(betAmount) > balance}
                        className="w-full bg-cyan-500 text-black py-7 rounded-[2rem] text-sm font-black italic uppercase tracking-[0.6em] shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:bg-white hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50 disabled:grayscale cursor-pointer group/betbtn"
                      >
                         <span className="group-hover/betbtn:scale-110 block transition-transform">
                           {isPlacingBet ? 'PROCESANDO...' : 'CONFIRMAR JUGADA'}
                         </span>
                      </button>
                   </motion.div>
                 )}
               </div>
            </div>

            <p className="mt-12 text-[10px] text-white/10 text-center italic font-black uppercase tracking-[0.5em]">
              * TRANSMISIÓN SEGURA • ENCRIPTADO AES-256 • FIFA 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
