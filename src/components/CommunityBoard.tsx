import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Match, Profile } from '../types';
import { motion } from 'motion/react';
import { Users, Info, ShieldCheck, Trophy, Target, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const CommunityBoard: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [m, p, preds] = await Promise.all([
          dbService.getMatches(),
          dbService.getAllProfiles(),
          dbService.getAllPredictions()
        ]);
        
        // Sort profiles by score (rankings)
        const sortedProfiles = [...p].sort((a, b) => (b.points || 0) - (a.points || 0));
        
        setMatches(m);
        setProfiles(sortedProfiles);
        setPredictions(preds);
        setLoading(false);
      } catch (err) {
        console.error('Error in CommunityBoard init:', err);
        setLoading(false);
      }
    };
    init();
  }, []);

  // Listen to live database updates for predictions and profiles
  useEffect(() => {
    const channelPredictions = supabase
      .channel('live-board-predictions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, async () => {
        const preds = await dbService.getAllPredictions();
        setPredictions(preds);
      })
      .subscribe();

    const channelProfiles = supabase
      .channel('live-board-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
        const p = await dbService.getAllProfiles();
        const sortedProfiles = [...p].sort((a, b) => (b.points || 0) - (a.points || 0));
        setProfiles(sortedProfiles);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelPredictions);
      supabase.removeChannel(channelProfiles);
    };
  }, []);

  const getPrediction = (userId: string, matchId: string) => {
    return predictions.find(p => p.user_id === userId && p.match_id === matchId);
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-500 font-bold uppercase italic tracking-widest text-[10px]">Cargando Muro de Predicciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Table Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 border border-orange-500/20">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter">MURO DE COMPARACIÓN</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1 italic">Todos los pronósticos del torneo cara a cara</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">
          <ShieldCheck size={12} className="text-emerald-500" />
          Transparencia PRODE Total
        </div>
      </div>

      {/* Grid Table Canvas */}
      <div className="overflow-x-auto rounded-[2rem] border border-zinc-850 bg-zinc-950/60 backdrop-blur-xl shadow-2xl relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/40">
              <th className="p-6 sticky left-0 bg-zinc-950 z-20 min-w-[220px]">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">PARTICIPANTE</span>
              </th>
              {matches.map(match => (
                <th key={match.id} className="p-6 text-center min-w-[150px] border-l border-zinc-800/40">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md">
                      <img src={match.homeTeam?.flag_url || match.home_team?.flag_url} className="w-5 h-3 object-cover rounded-xs" />
                      <span className="text-[9px] font-black text-white italic">{match.homeTeam?.code || match.home_team?.code}</span>
                    </div>
                    <div className="text-[7px] font-black text-zinc-650 uppercase tracking-widest">VS</div>
                    <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md">
                      <img src={match.awayTeam?.flag_url || match.away_team?.flag_url} className="w-5 h-3 object-cover rounded-xs" />
                      <span className="text-[9px] font-black text-white italic">{match.awayTeam?.code || match.away_team?.code}</span>
                    </div>
                    {match.status === 'finished' && (
                      <span className="text-[8px] font-black text-orange-500 italic mt-1 font-mono">
                        ({match.home_score} - {match.away_score})
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile, index) => (
              <tr key={profile.id} className="border-b border-zinc-805 border-zinc-900/40 hover:bg-white/3 transition-colors group">
                <td className="p-6 sticky left-0 bg-zinc-950/90 group-hover:bg-zinc-900/90 backdrop-blur-md z-20 border-r border-zinc-850 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-black text-orange-500 italic">#{index + 1}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white uppercase italic tracking-tighter truncate w-32">{profile.username || 'Anónimo'}</span>
                      <span className="text-[8px] font-extrabold text-orange-500 uppercase tracking-widest leading-none mt-1">
                        🏆 {profile.points || 0} PTS <span className="text-zinc-550">· #{index + 1}</span>
                      </span>
                    </div>
                  </div>
                </td>
                {matches.map(match => {
                  const pred = getPrediction(profile.id, match.id);
                  const isFinished = match.status === 'finished';
                  
                  // Calculate dynamic badges based on scorepoints
                  let bgClass = "text-zinc-600";
                  let pointsTag = "";
                  if (pred && isFinished) {
                    if (pred.points_earned === 3) {
                      bgClass = "bg-orange-500/10 border border-orange-500/30 text-orange-500 font-extrabold shadow-[inset_0_0_10px_rgba(249,115,22,0.1)]";
                      pointsTag = "🏆";
                    } else if (pred.points_earned === 1) {
                      bgClass = "bg-zinc-800 border border-zinc-750 text-zinc-350 font-semibold";
                      pointsTag = "✨";
                    } else {
                      bgClass = "bg-zinc-900/50 border border-transparent text-zinc-600";
                    }
                  } else if (pred) {
                    bgClass = "text-zinc-300 font-black";
                  }

                  return (
                    <td key={match.id} className="p-6 text-center border-l border-zinc-800/20">
                      <div className="flex flex-col items-center justify-center">
                        {pred ? (
                          <div className={`px-4 py-2 rounded-xl text-xs font-mono select-none flex items-center gap-1 ${bgClass}`}>
                            <span>{pred.home_score} - {pred.away_score}</span>
                            {pointsTag && <span className="text-[10px]">{pointsTag}</span>}
                          </div>
                        ) : (
                          <span className="text-zinc-850 font-extrabold select-none">-</span>
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
      
      <div className="flex items-center justify-center gap-2 p-5 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
         <Info size={14} className="text-orange-500 shrink-0" />
         <p className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest italic">
           Las predicciones son completamente públicas una vez guardadas para garantizar la transparencia de la tabla general y privada.
         </p>
      </div>
    </div>
  );
};
