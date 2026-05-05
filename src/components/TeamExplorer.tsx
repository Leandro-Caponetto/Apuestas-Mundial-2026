import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Trophy, Users, Star, LayoutGrid, List } from 'lucide-react';
import { WORLD_CUP_TEAMS } from '../lib/constants';

interface ExtendedTeam {
  id: string;
  name: string;
  code: string;
  flag_url: string;
  group_name: string;
  rank: number;
  starPlayer: string;
  titles: number;
  coach: string;
}

// Enriquecemos los datos estáticos para el explorador
const ENRICHED_TEAMS: ExtendedTeam[] = WORLD_CUP_TEAMS.map(team => {
  // Datos simulados realistas basados en el equipo
  const mockData: Record<string, Partial<ExtendedTeam>> = {
    'arg': { rank: 1, starPlayer: 'Lionel Messi', titles: 3, coach: 'Lionel Scaloni' },
    'fra': { rank: 2, starPlayer: 'Kylian Mbappé', titles: 2, coach: 'Didier Deschamps' },
    'esp': { rank: 3, starPlayer: 'Lamine Yamal', titles: 1, coach: 'Luis de la Fuente' },
    'eng': { rank: 4, starPlayer: 'Jude Bellingham', titles: 1, coach: 'Thomas Tuchel' },
    'bra': { rank: 5, starPlayer: 'Vinícius Júnior', titles: 5, coach: 'Dorival Júnior' },
    'bel': { rank: 6, starPlayer: 'Kevin De Bruyne', titles: 0, coach: 'Domenico Tedesco' },
    'ned': { rank: 7, starPlayer: 'Virgil van Dijk', titles: 0, coach: 'Ronald Koeman' },
    'por': { rank: 8, starPlayer: 'Cristiano Ronaldo', titles: 0, coach: 'Roberto Martínez' },
    'ita': { rank: 9, starPlayer: 'Nicolò Barella', titles: 4, coach: 'Luciano Spalletti' },
    'ger': { rank: 11, starPlayer: 'Jamal Musiala', titles: 4, coach: 'Julian Nagelsmann' },
    'uru': { rank: 14, starPlayer: 'Darwin Núñez', titles: 2, coach: 'Marcelo Bielsa' },
    'col': { rank: 10, starPlayer: 'Luis Díaz', titles: 0, coach: 'Néstor Lorenzo' },
    'mex': { rank: 16, starPlayer: 'Santiago Giménez', titles: 0, coach: 'Javier Aguirre' },
    'usa': { rank: 18, starPlayer: 'Christian Pulisic', titles: 0, coach: 'Mauricio Pochettino' },
    'jpn': { rank: 15, starPlayer: 'Takefusa Kubo', titles: 0, coach: 'Hajime Moriyasu' },
    'cro': { rank: 12, starPlayer: 'Luka Modric', titles: 0, coach: 'Zlatko Dalic' },
    'mar': { rank: 13, starPlayer: 'Achraf Hakimi', titles: 0, coach: 'Walid Regragui' },
  };

  const extra = mockData[team.id] || { 
    rank: 20 + Math.floor(Math.random() * 50), 
    starPlayer: 'Capitán Equipo', 
    titles: 0, 
    coach: 'Director Técnico' 
  };

  return { ...team, ...extra } as ExtendedTeam;
});

export const TeamExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<keyof ExtendedTeam>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredTeams = useMemo(() => {
    return ENRICHED_TEAMS.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.group_name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc' 
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [searchTerm, sortBy, sortOrder]);

  const handleSort = (key: keyof ExtendedTeam) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
            Explorador de <span className="text-amber-500">Selecciones</span>
          </h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] italic">Análisis táctico y datos FIFA 2026</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar selección o grupo..."
              className="bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-black text-white focus:outline-none focus:border-amber-500/50 w-full md:w-80 transition-all placeholder:text-white/10 uppercase italic"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-black/40 rounded-2xl border border-white/10 p-1">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'table' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/40 hover:text-white'}`}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/40 hover:text-white'}`}
            >
              <LayoutGrid size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative min-h-[600px]">
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div 
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="overflow-x-auto scrollbar-hide bg-zinc-900/40 border border-white/5 rounded-[2.5rem] shadow-2xl"
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    <th onClick={() => handleSort('rank')} className="p-8 text-[10px] font-black uppercase text-white/30 italic tracking-widest cursor-pointer hover:text-amber-500 transition-colors">
                      Rank {sortBy === 'rank' && (sortOrder === 'asc' ? '↓' : '↑')}
                    </th>
                    <th onClick={() => handleSort('name')} className="p-8 text-[10px] font-black uppercase text-white/30 italic tracking-widest cursor-pointer hover:text-amber-500 transition-colors">
                      Selección {sortBy === 'name' && (sortOrder === 'asc' ? '↓' : '↑')}
                    </th>
                    <th onClick={() => handleSort('group_name')} className="p-8 text-center text-[10px] font-black uppercase text-white/30 italic tracking-widest cursor-pointer hover:text-amber-500 transition-colors">
                      Grupo {sortBy === 'group_name' && (sortOrder === 'asc' ? '↓' : '↑')}
                    </th>
                    <th onClick={() => handleSort('starPlayer')} className="p-8 text-[10px] font-black uppercase text-white/30 italic tracking-widest cursor-pointer hover:text-amber-500 transition-colors">
                      Jugador Estrella
                    </th>
                    <th onClick={() => handleSort('coach')} className="p-8 text-[10px] font-black uppercase text-white/30 italic tracking-widest cursor-pointer hover:text-amber-500 transition-colors">
                      Entrenador
                    </th>
                    <th onClick={() => handleSort('titles')} className="p-8 text-center text-[10px] font-black uppercase text-white/30 italic tracking-widest cursor-pointer hover:text-amber-500 transition-colors">
                      Copas Mundo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTeams.map((team, idx) => (
                    <motion.tr 
                      key={team.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group hover:bg-white/5 transition-all"
                    >
                      <td className="p-8">
                        <span className="text-2xl font-black italic tabular-nums text-white/10 group-hover:text-amber-500 transition-colors">#{team.rank}</span>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-10 rounded-lg overflow-hidden border border-white/10 shadow-xl group-hover:scale-110 transition-transform bg-black/40">
                            <img src={team.flag_url} className="w-full h-full object-cover" alt={team.name} />
                          </div>
                          <div>
                            <p className="text-xl font-black italic uppercase tracking-tighter text-white">{team.name}</p>
                            <p className="text-[9px] font-black text-white/20 uppercase italic tracking-widest">{team.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        <span className="inline-block w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl font-black italic text-amber-500">
                          {team.group_name}
                        </span>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-3">
                          <Star size={14} className="text-amber-500" />
                          <span className="text-sm font-black italic uppercase text-white/80">{team.starPlayer}</span>
                        </div>
                      </td>
                      <td className="p-8 text-white/40 font-bold italic text-xs uppercase tracking-wider">
                        {team.coach}
                      </td>
                      <td className="p-8">
                        <div className="flex flex-wrap justify-center gap-1">
                          {team.titles > 0 ? (
                            Array.from({ length: team.titles }).map((_, i) => (
                              <Trophy key={i} size={16} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            ))
                          ) : (
                            <span className="text-white/10 font-black italic">--</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filteredTeams.length === 0 && (
                <div className="p-20 text-center space-y-4">
                  <Search size={48} className="mx-auto text-white/5" />
                  <p className="text-white/20 font-black italic uppercase tracking-widest">No se encontraron selecciones para "{searchTerm}"</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredTeams.map((team, idx) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-zinc-900/40 border border-white/5 p-6 rounded-[2.5rem] hover:border-amber-500/50 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <Trophy size={120} />
                  </div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-20 h-12 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                      <img src={team.flag_url} className="w-full h-full object-cover" alt={team.name} />
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">FIFA RANK</p>
                      <p className="text-3xl font-black italic text-white tabular-nums leading-none">#{team.rank}</p>
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div>
                      <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">{team.name}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-black italic border border-amber-500/20">GRUPO {team.group_name}</span>
                        <span className="text-white/20 text-[10px] font-black uppercase tracking-widest italic">{team.code}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/40 italic">
                          <Star size={12} className="text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Estrella</span>
                        </div>
                        <span className="text-xs font-black italic text-white/80">{team.starPlayer}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/40 italic">
                          <Users size={12} className="text-blue-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Entrenador</span>
                        </div>
                        <span className="text-[10px] font-black italic text-white/60 truncate max-w-[120px]">{team.coach}</span>
                      </div>
                    </div>

                    <div className="flex gap-1 pt-2">
                      {team.titles > 0 && Array.from({ length: team.titles }).map((_, i) => (
                        <Trophy key={i} size={14} className="text-amber-500" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats Summary Footer */}
      <div className="bg-linear-to-r from-amber-500/10 via-transparent to-black/20 p-8 rounded-[2rem] border border-white/5 flex flex-wrap justify-center md:justify-start gap-12 text-center md:text-left">
        <div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] italic mb-2">SELECCIONES</p>
          <p className="text-4xl font-black italic text-white leading-none tabular-nums">{ENRICHED_TEAMS.length}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] italic mb-2">TOTAL TITULOS</p>
          <p className="text-4xl font-black italic text-amber-500 leading-none tabular-nums">
            {ENRICHED_TEAMS.reduce((acc, t) => acc + t.titles, 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] italic mb-2">ANFITRIONES</p>
          <p className="text-4xl font-black italic text-blue-500 leading-none tabular-nums">3</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
           <Trophy size={40} className="text-amber-500/30" />
           <p className="text-xs font-black italic text-white/10 uppercase tracking-widest leading-tight text-right">
             WORLD CUP 2026<br />NORTH AMERICA
           </p>
        </div>
      </div>
    </div>
  );
};

