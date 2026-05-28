import React, { useState, useEffect } from 'react';
import { Match, Prediction } from '@/types';
import { supabase } from '@/lib/supabase';
import { dbService } from '@/services/dbService';
import { formatDate } from '@/lib/utils';
import { motion } from 'motion/react';
import { ShieldCheck, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const cleanGroupName = (group: string | null | undefined): string => {
  if (!group) return '';
  return group.replace(/^(grupo\s+|group\s+|grupo|group|group_)/i, '').trim().toUpperCase();
};

interface MatchCardProps {
  match: Match;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const [homeScore, setHomeScore] = useState<string>('');
  const [awayScore, setAwayScore] = useState<string>('');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const isLive = match.status === 'playing';
  const isFinished = match.status === 'finished';
  const isLocked = new Date(match.start_at) < new Date() || isFinished;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchPrediction(session.user.id);
      }
    });
  }, [match.id]);

  async function fetchPrediction(uid: string) {
    try {
      const preds = await dbService.getPredictions(uid);
      const myPred = (preds as any[]).find(p => p.match_id === match.id);
      if (myPred) {
        setPrediction(myPred);
        setHomeScore(myPred.home_score.toString());
        setAwayScore(myPred.away_score.toString());
      }
    } catch (err) {
      console.error('Error fetching prediction:', err);
    }
  }

  async function savePrediction() {
    if (!userId) {
      toast.error('Debes iniciar sesión');
      return;
    }

    if (homeScore === '' || awayScore === '') {
      toast.error('Ingresa ambos resultados');
      return;
    }

    setSaving(true);
    try {
      await dbService.savePrediction({
        user_id: userId,
        match_id: match.id,
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore)
      });
      
      toast.success('Predicción guardada ⚽');
      setPrediction({
        id: 'temp',
        user_id: userId,
        match_id: match.id,
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
        points_earned: prediction?.points_earned || 0,
        created_at: new Date().toISOString()
      });
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "sport-card p-6 relative overflow-hidden group",
        isLive && "border-red-500/30 glow-orange"
      )}
    >
      {isLive && (
        <div className="absolute top-0 right-0 p-3">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-[8px] font-black uppercase tracking-[0.2em] italic animate-pulse">
            <span className="w-1 h-1 rounded-full bg-white" /> En Vivo
          </span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500 italic">
            {match.phase === 'group' ? `Grupo ${cleanGroupName(match.group_name)}` : match.phase}
          </span>
          <span className="text-[10px] font-bold text-orange-500/80">{formatDate(match.start_at)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-6 mb-10 relative">
        <div className="flex-1 flex flex-col items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-16 h-12 bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 shadow-xl"
          >
             {match.home_team?.flag_url ? (
               <img src={match.home_team.flag_url} alt={match.home_team.name} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center font-bold text-zinc-600">{match.home_team?.code}</div>
             )}
          </motion.div>
          <span className="font-bold text-white text-xs uppercase tracking-tighter line-clamp-1">{match.home_team?.name}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
           <div className="flex items-center gap-2">
             <input
               type="number"
               min="0"
               disabled={isLocked || saving}
               value={homeScore}
               onChange={(e) => setHomeScore(e.target.value)}
               className="w-12 h-14 bg-zinc-800/50 border border-zinc-700 rounded-2xl text-center text-2xl font-black text-white focus:outline-none focus:border-orange-500 focus:glow-orange transition-all disabled:opacity-50"
             />
             <span className="text-zinc-700 font-black italic text-sm">VS</span>
             <input
               type="number"
               min="0"
               disabled={isLocked || saving}
               value={awayScore}
               onChange={(e) => setAwayScore(e.target.value)}
               className="w-12 h-14 bg-zinc-800/50 border border-zinc-700 rounded-2xl text-center text-2xl font-black text-white focus:outline-none focus:border-orange-500 focus:glow-orange transition-all disabled:opacity-50"
             />
           </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-16 h-12 bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 shadow-xl"
          >
            {match.away_team?.flag_url ? (
               <img src={match.away_team.flag_url} alt={match.away_team.name} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center font-bold text-zinc-600">{match.away_team?.code}</div>
             )}
          </motion.div>
          <span className="font-bold text-white text-xs uppercase tracking-tighter line-clamp-1">{match.away_team?.name}</span>
        </div>
      </div>

      <div className="pt-6 border-t border-zinc-800/50">
        {isFinished ? (
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black italic">Finalizado</span>
              <span className="text-2xl font-black text-orange-500 italic leading-none">{match.home_score} - {match.away_score}</span>
            </div>
            {prediction && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "px-4 py-2 rounded-2xl border text-center min-w-[80px]",
                  prediction.points_earned > 0 
                  ? "bg-green-500/10 border-green-500/30 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
                )}
              >
                <div className="text-[8px] font-black uppercase tracking-widest leading-tight">Puntos</div>
                <div className="text-xl font-black italic">+{prediction.points_earned}</div>
              </motion.div>
            )}
          </div>
        ) : (
           <button
             onClick={savePrediction}
             disabled={isLocked || saving}
             className={cn(
               "w-full py-4 rounded-2xl font-black uppercase italic tracking-widest text-[11px] transition-all flex items-center justify-center gap-2",
               isLocked 
               ? "bg-zinc-950/50 border border-zinc-800 text-zinc-600 cursor-not-allowed"
               : "bg-zinc-800 hover:bg-orange-500 hover:text-black border border-zinc-700 hover:border-orange-500 text-white"
             )}
           >
             {isLocked ? (
               <><AlertCircle size={14} /> Predicciones Cerradas</>
             ) : (
               <>{saving ? 'Enviando...' : prediction ? 'Actualizar Predicción' : 'Salvar Predicción'}</>
             )}
           </button>
        )}
        
        {prediction && !isLocked && !isFinished && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-orange-500 uppercase tracking-[0.2em] font-black italic"
          >
            <ShieldCheck size={12} className="animate-pulse" /> Predicción Verificada
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
