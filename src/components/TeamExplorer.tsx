import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Trophy, Users, Star, LayoutGrid, List, Radio, Activity, RefreshCw, Globe, Server } from 'lucide-react';
import { WORLD_CUP_TEAMS } from '../lib/constants';

const cleanGroupName = (group: string | null | undefined): string => {
  if (!group) return '';
  return group.replace(/^(grupo\s+|group\s+|grupo|group|group_)/i, '').trim().toUpperCase();
};

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
  // Navigation for API modes
  const [subSection, setSubSection] = useState<'teams' | 'live' | 'rapidTeams'>('teams');

  // Search & view mode for original explorer
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<keyof ExtendedTeam>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // API Football States
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [showDemoMatches, setShowDemoMatches] = useState(false);

  const [rapidTeams, setRapidTeams] = useState<any[]>([]);
  const [rapidTeamsLoading, setRapidTeamsLoading] = useState(false);
  const [rapidTeamsError, setRapidTeamsError] = useState('');

  // Fetch functions
  const fetchLiveMatches = async () => {
    setLiveLoading(true);
    setLiveError('');
    try {
      const response = await fetch('/api/rapidapi/live-matches');
      if (!response.ok) {
        let errorMsg = `Error de red (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.error) {
            errorMsg = `${errData.error}`;
            if (errData.details) {
              try {
                const parsedDetails = JSON.parse(errData.details);
                if (parsedDetails.message) {
                  errorMsg = `${errData.error}: ${parsedDetails.message}`;
                } else {
                  errorMsg = `${errData.error}: ${errData.details}`;
                }
              } catch (_) {
                errorMsg = `${errData.error}: ${errData.details}`;
              }
            }
          }
        } catch (_) {
          errorMsg = `Error en el servidor: ${response.statusText || response.status}`;
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.response && data.response.length > 0) {
        setLiveMatches(data.response);
        setShowDemoMatches(false);
      } else {
        setLiveMatches([]);
        // Si la respuesta viene vacía (común fuera de horarios de partidos de ligas principales o mundial), activamos demo por defecto
        setShowDemoMatches(true);
      }
    } catch (err: any) {
      console.error(err);
      setLiveError(err.message || 'Error al conectar con la API proxy de RapidAPI.');
      setShowDemoMatches(true); // Activar demostración para que el usuario pueda visualizar la UI decorada
    } finally {
      setLiveLoading(false);
    }
  };

  const fetchRapidTeams = async () => {
    setRapidTeamsLoading(true);
    setRapidTeamsError('');
    try {
      // Copa del Mundo League ID en API-Football es generalmente 1. Traemos la temporada 2022 para asegurar datos reales
      const response = await fetch('/api/rapidapi/teams?league=1&season=2022');
      if (!response.ok) {
        let errorMsg = `Error de red (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.error) {
            errorMsg = `${errData.error}`;
            if (errData.details) {
              try {
                const parsedDetails = JSON.parse(errData.details);
                if (parsedDetails.message) {
                  errorMsg = `${errData.error}: ${parsedDetails.message}`;
                } else {
                  errorMsg = `${errData.error}: ${errData.details}`;
                }
              } catch (_) {
                errorMsg = `${errData.error}: ${errData.details}`;
              }
            }
          }
        } catch (_) {
          errorMsg = `Error del servidor: ${response.statusText || response.status}`;
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.response && data.response.length > 0) {
        setRapidTeams(data.response);
      } else {
        throw new Error('La respuesta de la API no contiene selecciones de equipos reales.');
      }
    } catch (err: any) {
      console.error(err);
      setRapidTeamsError(err.message || 'Error al obtener selecciones desde RapidAPI.');
      
      // Graciously fallback to displaying our curated local teams formatted as RapidAPI teams
      const mappedLocalTeams = WORLD_CUP_TEAMS.map((t, idx) => ({
        team: {
          id: 1000 + idx,
          name: t.name,
          logo: t.flag_url,
          code: t.code
        }
      }));
      setRapidTeams(mappedLocalTeams);
    } finally {
      setRapidTeamsLoading(false);
    }
  };

  // Carga inicial según sección
  useEffect(() => {
    if (subSection === 'live') {
      fetchLiveMatches();
    } else if (subSection === 'rapidTeams' && rapidTeams.length === 0) {
      fetchRapidTeams();
    }
  }, [subSection]);

  // Demo Matches para poder probar la UI si la API está sin partidos en tiempo real o sin cuotas de llamadas
  const DEMO_LIVE_MATCHES = useMemo(() => [
    {
      fixture: {
        id: 9901,
        status: { elapsed: 74, short: '2H', long: 'Segundo Tiempo' },
        venue: { name: 'Estadio Azteca, CDMX', city: 'Ciudad de México' }
      },
      league: { name: 'Copa del Mundo FIFA' },
      teams: {
        home: { name: 'Argentina', logo: 'https://media.api-sports.io/football/teams/26.png' },
        away: { name: 'México', logo: 'https://media.api-sports.io/football/teams/16.png' }
      },
      goals: { home: 2, away: 1 }
    },
    {
      fixture: {
        id: 9902,
        status: { elapsed: 35, short: '1H', long: 'Primer Tiempo' },
        venue: { name: 'SoFi Stadium, Los Ángeles', city: 'California' }
      },
      league: { name: 'Copa del Mundo FIFA' },
      teams: {
        home: { name: 'España', logo: 'https://media.api-sports.io/football/teams/1.png' },
        away: { name: 'Francia', logo: 'https://media.api-sports.io/football/teams/2.png' }
      },
      goals: { home: 1, away: 1 }
    },
    {
      fixture: {
        id: 9903,
        status: { elapsed: 12, short: '1H', long: 'Primer Tiempo' },
        venue: { name: 'MetLife Stadium, East Rutherford', city: 'Nueva Jersey' }
      },
      league: { name: 'Copa del Mundo FIFA' },
      teams: {
        home: { name: 'Uruguay', logo: 'https://media.api-sports.io/football/teams/1029.png' },
        away: { name: 'Brasil', logo: 'https://media.api-sports.io/football/teams/6.png' }
      },
      goals: { home: 0, away: 2 }
    }
  ], []);

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
      {/* Sub-Sección API Navigation */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setSubSection('teams')}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            subSection === 'teams'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-zinc-900/30 text-white/50 border border-zinc-800 hover:text-white'
          }`}
        >
          Explorador Local
        </button>
        <button
          onClick={() => setSubSection('live')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            subSection === 'live'
              ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
              : 'bg-zinc-900/30 text-white/50 border border-zinc-800 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Partidos En Vivo
        </button>
        <button
          onClick={() => setSubSection('rapidTeams')}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            subSection === 'rapidTeams'
              ? 'bg-blue-500 text-black shadow-lg shadow-blue-500/20'
              : 'bg-zinc-900/30 text-white/50 border border-zinc-800 hover:text-white'
          }`}
        >
          Equipos RapidAPI
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: EXPLORADOR LOCAL DE SELECCIONES */}
        {subSection === 'teams' && (
          <motion.div
            key="teams"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                  Explorador de <span className="text-amber-500">Selecciones</span>
                </h2>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] italic">Análisis táctico y datos de selecciones</p>
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
              {viewMode === 'table' ? (
                <div className="overflow-x-auto scrollbar-hide bg-zinc-900/40 border border-white/5 rounded-[2.5rem] shadow-2xl">
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
                        <tr key={team.id} className="group hover:bg-white/5 transition-all">
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
                              {cleanGroupName(team.group_name)}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredTeams.map((team) => (
                    <div
                      key={team.id}
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
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-black italic border border-amber-500/20">GRUPO {cleanGroupName(team.group_name)}</span>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: PARTIDOS EN VIVO CON API-FOOTBALL (RAPIDAPI) */}
        {subSection === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header / Info bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl">
              <div>
                <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                  <Radio size={24} className="text-orange-500 animate-pulse" />
                  Marcadores <span className="text-orange-500">En Vivo</span>
                </h3>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] italic mt-1">
                  Conexión directa a través de RapidAPI API-Football proxy
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchLiveMatches}
                  disabled={liveLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest hover:bg-orange-400 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw size={14} className={`${liveLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>
            </div>

            {/* Live Indicator Banner */}
            {showDemoMatches && (
              <div className="p-4 bg-amber-500/15 border border-amber-500/20 rounded-2xl text-amber-400 text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 py-3">
                <Activity size={16} />
                <span>Modo Demostración Activo: No hay partidos internacionales disputándose en este momento.</span>
              </div>
            )}

            {liveLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((n) => (
                  <div key={n} className="h-44 bg-zinc-900/50 rounded-[2rem] border border-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(showDemoMatches ? DEMO_LIVE_MATCHES : liveMatches).map((match) => {
                  const isLive = match.fixture.status.short !== 'FT';
                  return (
                    <div
                      key={match.fixture.id}
                      className="bg-zinc-900/40 border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between group hover:border-orange-500/20 transition-all hover:bg-zinc-900/60"
                    >
                      {/* Arena details & League */}
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[8px] font-black uppercase tracking-wider text-white/30 italic">
                          {match.league.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-wider text-white/30 italic truncate max-w-[150px]">
                            {match.fixture.venue.name || 'Estadio FIFA'}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                          <span className="text-[10px] font-black italic uppercase text-orange-500 animate-pulse">
                            {match.fixture.status.elapsed}' Min
                          </span>
                        </div>
                      </div>

                      {/* Main Matchup Render */}
                      <div className="grid grid-cols-5 items-center my-2">
                        {/* Home Team */}
                        <div className="col-span-2 flex flex-col items-center text-center gap-2">
                          <div className="w-16 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                            <img src={match.teams.home.logo} className="w-full h-full object-contain" alt={match.teams.home.name} referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-sm font-black italic uppercase text-white truncate max-w-[110px]">
                            {match.teams.home.name}
                          </span>
                        </div>

                        {/* Score Board */}
                        <div className="col-span-1 flex flex-col items-center justify-center">
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-3xl font-black italic text-white tabular-nums leading-none">
                              {match.goals.home ?? 0}
                            </span>
                            <span className="text-zinc-600 font-extrabold italic text-sm">-</span>
                            <span className="text-3xl font-black italic text-white tabular-nums leading-none">
                              {match.goals.away ?? 0}
                            </span>
                          </div>
                          
                          {/* Live signal badge */}
                          <div className="mt-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase italic flex items-center gap-1 ${
                              isLive ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                              {isLive ? 'EN VIVO' : 'FINAL'}
                            </span>
                          </div>
                        </div>

                        {/* Away Team */}
                        <div className="col-span-2 flex flex-col items-center text-center gap-2">
                          <div className="w-16 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                            <img src={match.teams.away.logo} className="w-full h-full object-contain" alt={match.teams.away.name} referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-sm font-black italic uppercase text-white truncate max-w-[110px]">
                            {match.teams.away.name}
                          </span>
                        </div>
                      </div>

                      {/* Footer Info line */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                          Id del partido: {match.fixture.id}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest italic bg-zinc-950/40 px-2 py-1 rounded-md border border-white/5">
                            {match.fixture.status.long}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Error or connectivity details */}
            {liveError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold text-center">
                Nota de conexión: {liveError}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: EQUIPOS DESDE RAPIDAPI */}
        {subSection === 'rapidTeams' && (
          <motion.div
            key="rapidTeams"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header with fetch description */}
            <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                  <Globe size={24} className="text-blue-500" />
                  Selecciones <span className="text-blue-500">API-Football</span>
                </h3>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] italic mt-1">
                  Listado oficial obtenido directamente de API-Football mundialista (Mundial 2022)
                </p>
              </div>
              <button
                onClick={fetchRapidTeams}
                disabled={rapidTeamsLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-500 text-black text-xs font-black uppercase tracking-widest hover:bg-blue-400 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={14} className={`${rapidTeamsLoading ? 'animate-spin' : ''}`} />
                Sincronizar
              </button>
            </div>

            {rapidTeamsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="h-32 bg-zinc-900/50 rounded-2xl border border-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div>
                {rapidTeamsError && (
                  <div className="p-6 text-center bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-3xl mb-6">
                    <p className="font-extrabold uppercase italic tracking-widest mb-1 text-xs text-amber-400">Modo Sandbox / Local Fallback Activado</p>
                    <p className="text-[10px] text-zinc-400 max-w-xl mx-auto mb-3">
                      Sincronización fallback activada con los Equipos oficiales. El servidor detectó que la clave default de RapidAPI falló, está sin cuotas, o no se encuentra configurada ({rapidTeamsError}).
                    </p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">
                      Para usar una conexión Real directa, configura tu clave <code className="text-white bg-zinc-800 px-1.5 py-0.5 rounded">RAPIDAPI_FOOTBALL_KEY</code> en tu panel de control o archivo .env.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {rapidTeams.map((item) => (
                    <div
                      key={item.team.id}
                      className="bg-zinc-900/40 border border-white/5 p-5 rounded-3xl flex flex-col items-center justify-between text-center group hover:border-blue-500/20 transition-all hover:bg-zinc-900/60"
                    >
                      <div className="w-16 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center p-2 mb-3">
                        <img src={item.team.logo} className="w-full h-full object-contain" alt={item.team.name} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black italic uppercase text-white truncate max-w-[120px]">
                          {item.team.name}
                        </p>
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic bg-zinc-950/40 px-2 py-0.5 rounded-full border border-white/5">
                          {item.team.code || 'FIFA'}
                        </p>
                      </div>
                      <span className="text-[7px] text-zinc-600 uppercase tracking-widest mt-2">
                        Id: {item.team.id}
                      </span>
                    </div>
                  ))}
                </div>

                {rapidTeams.length === 0 && !rapidTeamsError && (
                  <div className="p-20 text-center space-y-4">
                    <Server size={48} className="mx-auto text-white/10 animate-pulse" />
                    <p className="text-zinc-500/80 font-black italic uppercase tracking-widest text-xs">
                      Presiona "Sincronizar" para obtener y listar los equipos oficiales de RapidAPI
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
