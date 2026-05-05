import React from 'react';
import { Team } from '@/types';
import { motion } from 'motion/react';

interface GroupGridProps {
  teams: Team[];
  groupName: string;
}

export const GroupGrid: React.FC<GroupGridProps> = ({ teams, groupName }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="sport-card p-6"
    >
      <div className="flex items-center justify-between mb-4 border-b border-zinc-800/50 pb-3">
        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Grupo <span className="text-orange-500">{groupName}</span></h3>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Primera Fase</span>
      </div>
      
      <div className="space-y-3">
        {teams.map((team, idx) => (
          <div key={team.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-6 bg-zinc-800 rounded overflow-hidden border border-zinc-700 group-hover:border-orange-500/50 transition-colors flex items-center justify-center">
                {team.flag_url ? (
                  <img src={team.flag_url} alt={team.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-[8px] font-black text-zinc-600 italic">TBD</span>
                )}
              </div>
              <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors uppercase tracking-tight">{team.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-600 font-mono tracking-tighter">0 PTS</span>
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
