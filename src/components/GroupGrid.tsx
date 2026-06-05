import React from 'react';
import { Team } from '@/types';
import { motion } from 'motion/react';

interface GroupGridProps {
  teams: Team[];
  groupName: string;
}

const groupColors: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-[#10B981]', text: 'text-white' }, // Emerald
  B: { bg: 'bg-[#EF4444]', text: 'text-white' }, // Red-Pink
  C: { bg: 'bg-[#F59E0B]', text: 'text-white' }, // Amber-Orange
  D: { bg: 'bg-[#3B82F6]', text: 'text-white' }, // Blue
  E: { bg: 'bg-[#6366F1]', text: 'text-white' }, // Indigo
  F: { bg: 'bg-[#84CC16]', text: 'text-black' }, // Lime/Yellow
  G: { bg: 'bg-[#EC4899]', text: 'text-white' }, // Hot Pink
  H: { bg: 'bg-[#0D9488]', text: 'text-white' }, // Teal
  I: { bg: 'bg-[#8B5CF6]', text: 'text-white' }, // Violet
  J: { bg: 'bg-[#0EA5E9]', text: 'text-white' }, // Sky Blue
  K: { bg: 'bg-[#F97316]', text: 'text-white' }, // Orange
  L: { bg: 'bg-[#1E3A8A]', text: 'text-white' }, // Dark Blue
};

export const GroupGrid: React.FC<GroupGridProps> = ({ teams, groupName }) => {
  // Determine if this group belongs to the left column (A to F) or right column (G to L)
  const isLeft = ['A', 'B', 'C', 'D', 'E', 'F'].includes(groupName);
  const colorSpec = groupColors[groupName] || { bg: 'bg-zinc-800', text: 'text-white' };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="sport-card p-4 flex gap-3 bg-zinc-950/90 border border-zinc-800/80 rounded-2xl shadow-xl hover:border-zinc-700/80 transition-all duration-300 h-[190px]"
    >
      {/* If isLeft, vertical bar is on the left */}
      {isLeft && (
        <div className={`w-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-2xl tracking-tighter ${colorSpec.bg} ${colorSpec.text} shadow-lg italic`}>
          {groupName}
        </div>
      )}

      {/* Team rows */}
      <div className="flex-1 flex flex-col justify-between gap-1.5 py-1">
        {teams.map((team) => {
          const isTBD = team.id === 'X' || !team.flag_url;
          return (
            <div 
              key={team.id} 
              className={`flex items-center ${isLeft ? 'justify-start' : 'justify-end'} gap-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700/60 rounded-xl px-3 py-1.5 transition-all duration-200`}
            >
              {isLeft ? (
                <>
                  {/* Flag on left */}
                  <div className="w-7 h-5 bg-zinc-950 rounded border border-zinc-800/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {!isTBD ? (
                      <img src={team.flag_url} alt={team.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[8px] font-black text-zinc-600 italic">TBD</span>
                    )}
                  </div>
                  <span className="text-[11px] font-black text-zinc-200 tracking-tight uppercase truncate">
                    {team.name}
                  </span>
                </>
              ) : (
                <>
                  {/* Text first, Flag on right */}
                  <span className="text-[11px] font-black text-zinc-200 tracking-tight uppercase truncate text-right">
                    {team.name}
                  </span>
                  <div className="w-7 h-5 bg-zinc-950 rounded border border-zinc-800/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {!isTBD ? (
                      <img src={team.flag_url} alt={team.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[8px] font-black text-zinc-600 italic">TBD</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* If isRight, vertical bar is on the right */}
      {!isLeft && (
        <div className={`w-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-2xl tracking-tighter ${colorSpec.bg} ${colorSpec.text} shadow-lg italic`}>
          {groupName}
        </div>
      )}
    </motion.div>
  );
}
