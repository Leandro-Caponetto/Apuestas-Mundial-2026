import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PlayCircle, Trophy } from 'lucide-react';

interface ResolveMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (homeScore: number, awayScore: number) => void;
  match: {
    id: string;
    phase?: string;
    group_name?: string | null;
    home_team?: { name: string; code: string; flag_url?: string };
    away_team?: { name: string; code: string; flag_url?: string };
    homeTeam?: { name: string; code: string; flag_url?: string };
    awayTeam?: { name: string; code: string; flag_url?: string };
  } | null;
}

export const ResolveMatchModal: React.FC<ResolveMatchModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  match
}) => {
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);

  // Reset scores when opening modal for a new match
  useEffect(() => {
    if (isOpen) {
      setHomeScore(0);
      setAwayScore(0);
    }
  }, [isOpen, match]);

  if (!match) return null;

  const homeName = match.homeTeam?.name || match.home_team?.name || 'Local';
  const awayName = match.awayTeam?.name || match.away_team?.name || 'Visitante';
  const homeFlag = match.homeTeam?.flag_url || match.home_team?.flag_url || '';
  const awayFlag = match.awayTeam?.flag_url || match.away_team?.flag_url || '';
  const homeCode = match.homeTeam?.code || match.home_team?.code || 'LOC';
  const awayCode = match.awayTeam?.code || match.away_team?.code || 'VIS';

  const handleConfirm = () => {
    onConfirm(homeScore, awayScore);
    onClose();
  };

  const incrementHome = () => setHomeScore(prev => prev + 1);
  const decrementHome = () => setHomeScore(prev => Math.max(0, prev - 1));
  const incrementAway = () => setAwayScore(prev => prev + 1);
  const decrementAway = () => setAwayScore(prev => Math.max(0, prev - 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {/* Ambient background glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-10 blur-[80px] bg-orange-500" />

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors rounded-xl hover:bg-zinc-900"
            >
              <X size={20} />
            </button>

            <div className="relative z-10 space-y-8">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center border border-orange-500/20 bg-orange-500/10 text-orange-500">
                  <Trophy size={24} />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                  Simular Resultado Real
                </h3>
                <p className="text-xs font-semibold text-zinc-500 tracking-wider uppercase italic">
                  Panel de Administración
                </p>
              </div>

              {/* Score Input Match Area */}
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-6 flex items-center justify-between gap-4">
                {/* Home Team */}
                <div className="flex-1 flex flex-col items-center text-center space-y-2">
                  {homeFlag ? (
                    <img 
                      src={homeFlag} 
                      alt={homeName} 
                      referrerPolicy="no-referrer"
                      className="w-14 h-10 object-cover rounded-xl shadow-lg border border-zinc-800" 
                    />
                  ) : (
                    <div className="w-14 h-10 bg-zinc-800 rounded-xl" />
                  )}
                  <span className="text-xs font-bold text-white max-w-[90px] truncate">{homeName}</span>
                  
                  {/* Counter */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button 
                      onClick={decrementHome}
                      className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold flex items-center justify-center transition-colors text-[14px]"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      min="0"
                      value={homeScore}
                      onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 text-center bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-black text-orange-500 p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button 
                      onClick={incrementHome}
                      className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold flex items-center justify-center transition-colors text-[14px]"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* VS */}
                <div className="text-center">
                  <span className="text-xs font-black italic text-zinc-600 uppercase tracking-widest">VS</span>
                </div>

                {/* Away Team */}
                <div className="flex-1 flex flex-col items-center text-center space-y-2">
                  {awayFlag ? (
                    <img 
                      src={awayFlag} 
                      alt={awayName} 
                      referrerPolicy="no-referrer"
                      className="w-14 h-10 object-cover rounded-xl shadow-lg border border-zinc-800" 
                    />
                  ) : (
                    <div className="w-14 h-10 bg-zinc-800 rounded-xl" />
                  )}
                  <span className="text-xs font-bold text-white max-w-[90px] truncate">{awayName}</span>

                  {/* Counter */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button 
                      onClick={decrementAway}
                      className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold flex items-center justify-center transition-colors text-[14px]"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      min="0"
                      value={awayScore}
                      onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-10 text-center bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-black text-orange-500 p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button 
                      onClick={incrementAway}
                      className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold flex items-center justify-center transition-colors text-[14px]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-black uppercase italic tracking-widest text-xs rounded-2xl shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <PlayCircle size={16} />
                  Resolver Partido
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="w-full py-4 text-xs font-black italic uppercase tracking-widest text-zinc-400 hover:text-white transition-all border border-zinc-900 bg-transparent rounded-2xl"
                >
                  Cancelar
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
