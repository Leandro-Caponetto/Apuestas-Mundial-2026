import React, { useState } from 'react';
import { MatchCard } from './MatchCard';
import { Match } from '@/types';
import { motion } from 'motion/react';
import { TrendingUp, Filter, ListFilter, SlidersHorizontal } from 'lucide-react';

interface PredictionCenterProps {
  matches: Match[];
}

export const PredictionCenter: React.FC<PredictionCenterProps> = ({ matches = [] }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'finished'>('all');

  const filteredMatches = (matches || []).filter(m => {
    if (!m) return false;
    if (filter === 'all') return true;
    return m.status === filter;
  });

  return (
    <div className="space-y-10">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-zinc-800/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-500 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.4)]">
             <TrendingUp size={24} className="text-black" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Pick'em <span className="text-orange-500 italic">Center</span></h2>
            <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mt-1">Saca tu boleto ganador</p>
          </div>
        </div>

        <div className="flex items-center gap-2 glass p-1.5 rounded-2xl">
          {[
            { id: 'all', label: 'Todos', icon: ListFilter },
            { id: 'pending', label: 'Abiertos', icon: SlidersHorizontal },
            { id: 'finished', label: 'Finalizados', icon: Filter },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all ${
                filter === item.id
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              <item.icon size={12} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMatches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <div className="py-20 text-center glass rounded-[3rem] border-dashed">
          <p className="text-zinc-500 uppercase font-black italic tracking-widest">No hay partidos filtrados</p>
        </div>
      )}
    </div>
  );
};
