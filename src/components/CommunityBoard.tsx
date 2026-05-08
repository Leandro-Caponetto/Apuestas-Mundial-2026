import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Match, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Info, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { ConfirmationModal } from './ConfirmationModal';

interface CommunityBoardProps {
  onBetDeleted?: () => void;
}

export const CommunityBoard: React.FC<CommunityBoardProps> = ({ onBetDeleted }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [betToDelete, setBetToDelete] = useState<any>(null);

  // Initial load for session and static data
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setCurrentUser(session?.user || null);

        const [m, p] = await Promise.all([
          dbService.getMatches(),
          dbService.getAllProfiles(),
        ]);
        setMatches(m);
        setProfiles(p);
      } catch (err) {
        console.error('Error in CommunityBoard init:', err);
      }
    };
    init();
  }, []);

  // Subscriptions for dynamic data (Bets and Predictions)
  useEffect(() => {
    setLoading(true);
    
    // Predicciones
    const subPredictions = dbService.subscribeAllPredictions((newPreds) => {
      setPredictions(newPreds);
    });

    // Apuestas
    const subBets = dbService.subscribeAllBets((newBets) => {
      // Deduplicar por ID y REMOVER los que están marcados como eliminados localmente
      const uniqueBets = newBets
        .filter((bet) => !deletingIds.has(bet.id))
        .filter((bet, index, self) => 
          index === self.findIndex((t) => t.id === bet.id)
        );
      setBets(uniqueBets);
      setLoading(false); // Only stop loading when we have the first set of bets
    });

    return () => {
      subPredictions();
      subBets();
    };
  }, [deletingIds]);

  const handleDeleteBet = (bet: any) => {
    if (!currentUser || currentUser.id !== bet.user_id) {
      toast.error('No tienes permiso para borrar esta apuesta');
      return;
    }
    setBetToDelete(bet);
  };

  const confirmDelete = async () => {
    if (!betToDelete) return;

    const betId = betToDelete.id;
    const userId = betToDelete.user_id;
    const amount = betToDelete.amount;

    // Marcamos como eliminado localmente de forma inmediata
    setDeletingIds(prev => new Set(prev).add(betId));
    setBets(prev => prev.filter(b => b.id !== betId));

    const loadingToast = toast.loading('Cancelando apuesta...');
    try {
      // 1. Reintegrar dinero
      await dbService.addCredits(userId, amount);
      
      // 2. Borrar el registro de la apuesta
      await dbService.deleteBet(betId);
      
      toast.success('¡Apuesta cancelada con éxito!', { id: loadingToast });
      onBetDeleted?.();
    } catch (err: any) {
      // Si falla, lo quitamos de la lista de eliminados para que reaparezca
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(betId);
        return next;
      });
      toast.error('Error al cancelar la apuesta', { id: loadingToast });
      console.error(err);
    } finally {
      setBetToDelete(null);
    }
  };

  const getPrediction = (userId: string, matchId: string) => {
    const pred = predictions.find(p => p.user_id === userId && p.match_id === matchId);
    if (!pred) return null;
    return `${pred.home_score} - ${pred.away_score}`;
  };

  const getUserBetsForMatch = (userId: string, matchId: string) => {
    // Find all bets by this user that contain this match
    const userSelections: { selection: string; amount: number }[] = [];
    bets.forEach(bet => {
      if (bet.user_id === userId && bet.items) {
        bet.items.forEach((item: any) => {
          if (item.matchId === matchId) {
            userSelections.push({
              selection: item.selection,
              amount: bet.amount
            });
          }
        });
      }
    });
    return userSelections;
  };

  if (loading) return (
    <div className="p-12 text-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-zinc-500 font-bold uppercase italic tracking-widest text-[10px]">Cargando Muro de Predicciones...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 border border-orange-500/20">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter">MURO DE PREDICCIONES</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1 italic">Todas las jugadas en tiempo real</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[9px] font-black text-zinc-500 uppercase tracking-widest">
          <ShieldCheck size={12} className="text-emerald-500" />
          Transparencia Total
        </div>
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-zinc-800 bg-zinc-950/50 backdrop-blur-xl shadow-2xl relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="p-6 sticky left-0 bg-zinc-950 z-20 min-w-[200px]">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">PARTICIPANTE</span>
              </th>
              {matches.map(match => (
                <th key={match.id} className="p-6 text-center min-w-[140px] border-l border-zinc-800/50">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1">
                      <img src={match.homeTeam?.flag_url} className="w-6 h-4 object-cover rounded-sm" />
                      <span className="text-[10px] font-black text-white italic">{match.homeTeam?.code}</span>
                    </div>
                    <div className="text-[8px] font-black text-zinc-600">VS</div>
                    <div className="flex items-center gap-1">
                      <img src={match.awayTeam?.flag_url} className="w-6 h-4 object-cover rounded-sm" />
                      <span className="text-[10px] font-black text-white italic">{match.awayTeam?.code}</span>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map(profile => (
              <tr key={profile.id} className="border-b border-zinc-800/50 hover:bg-white/5 transition-colors group">
                <td className="p-6 sticky left-0 bg-zinc-950/80 group-hover:bg-zinc-900/80 backdrop-blur-md z-20 border-r border-zinc-800 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-black text-orange-500 italic">{profile.username?.[0] || '?'}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white uppercase italic tracking-tighter truncate w-32">{profile.username || 'Anónimo'}</span>
                      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-1">{profile.points || 0} PTS</span>
                    </div>
                  </div>
                </td>
                {matches.map(match => {
                  const prediction = getPrediction(profile.id, match.id);
                  const userBets = getUserBetsForMatch(profile.id, match.id);
                  
                  return (
                    <td key={match.id} className="p-6 text-center border-l border-zinc-800/20">
                      <div className="flex flex-col items-center gap-2">
                        {prediction ? (
                          <div className="text-xs font-black italic tracking-widest text-zinc-400">
                            {prediction}
                          </div>
                        ) : null}
                        
                        {userBets.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1">
                            {userBets.map((bet, idx) => (
                              <div 
                                key={idx}
                                title={`Apostado: $${bet.amount}`}
                                className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[7px] font-black text-emerald-500 uppercase italic tracking-tighter"
                              >
                                {bet.selection}
                              </div>
                            ))}
                          </div>
                        )}

                        {!prediction && userBets.length === 0 && (
                          <span className="text-zinc-800 font-black">-</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center justify-center gap-2 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
         <Info size={14} className="text-orange-500" />
         <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest italic">
           Las predicciones y apuestas son visibles para todos una vez realizadas.
         </p>
      </div>

      {/* MURO DE APUESTAS RECIENTES */}
      <div className="space-y-6 pt-12">
        <div className="flex items-center gap-4 px-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <span className="font-black italic text-lg">$</span>
          </div>
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">ÚLTIMAS APUESTAS</h3>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest leading-none mt-1 italic">Mercado en vivo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {bets.slice(0, 12).map((bet) => (
              <motion.div 
                key={`bet-${bet.id}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all"
              >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-4xl font-black italic">$</span>
              </div>
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                    {bet.profiles?.avatar_url ? (
                      <img src={bet.profiles.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-white italic">{bet.profiles?.username?.[0] || '?'}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase italic tracking-tighter truncate w-32">{bet.profiles?.username || 'ANÓNIMO'}</p>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">
                      {new Date(bet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="ml-auto text-right flex flex-col items-end gap-2">
                    <div>
                      <p className="text-xs font-black text-emerald-500 italic tabular-nums">${bet.amount}</p>
                      <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">APOSTADO</p>
                    </div>
                    
                    {currentUser && currentUser.id === bet.user_id && (
                      <button 
                        onClick={() => handleDeleteBet(bet)}
                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all group/trash"
                        title="Cancelar apuesta y recuperar dinero"
                      >
                        <Trash2 size={12} className="group-hover/trash:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="py-3 border-y border-zinc-800/50 space-y-2">
                  {bet.items?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase italic tracking-tighter truncate w-32">{item.matchTeams}</span>
                      <span className="text-[9px] font-black text-white italic uppercase">{item.selection}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">CUOTA TOTAL</p>
                    <p className="text-xs font-black text-white italic tracking-widest">{bet.odds?.toFixed(2) || '1.00'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">POSIBLE GANANCIA</p>
                    <p className="text-sm font-black text-emerald-500 italic tabular-nums">${bet.potential_win?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
          {bets.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest italic">Aún no hay apuestas registradas</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal 
        isOpen={!!betToDelete}
        onClose={() => setBetToDelete(null)}
        onConfirm={confirmDelete}
        title="CANCELAR APUESTA"
        message={betToDelete ? `¿Estás seguro de cancelar esta apuesta? Se te devolverá el monto de $${betToDelete.amount} a tu balance.` : ''}
        confirmText="SÍ, CANCELAR"
        cancelText="NO, MANTENER"
        variant="danger"
      />
    </div>
  );
};
