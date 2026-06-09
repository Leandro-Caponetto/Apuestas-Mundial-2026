import React, { useState, useEffect } from 'react';
import { MatchCard } from './MatchCard';
import { Match } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Filter, 
  ListFilter, 
  SlidersHorizontal, 
  RefreshCw, 
  Wifi, 
  Flame, 
  Calendar, 
  Info, 
  Zap, 
  Trophy,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dbService } from '@/services/dbService';

interface PredictionCenterProps {
  matches: Match[];
}

export const PredictionCenter: React.FC<PredictionCenterProps> = ({ matches: propMatches = [] }) => {
  const [localMatches, setLocalMatches] = useState<Match[]>(propMatches);
  const [filter, setFilter] = useState<'all' | 'pending' | 'finished'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveSimulationActive, setLiveSimulationActive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  });

  // Sync state with parent matches prop when it updates
  useEffect(() => {
    if (!liveSimulationActive) {
      setLocalMatches(propMatches);
    }
  }, [propMatches, liveSimulationActive]);

  // Extract unique chronological match dates (YYYY-MM-DD format)
  const uniqueDates: string[] = Array.from<string>(
    new Set(
      localMatches
        .map((m) => (m.start_at ? m.start_at.substring(0, 10) : ''))
        .filter((d) => d !== '')
    )
  ).sort();

  // Handle direct RapidAPI Sync
  const handleRapidAPISync = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Sincronizando fixture oficial con la de API-Football (RapidAPI) en tiempo real...');
    try {
      const res = await fetch('/api/sync-matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL || '',
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `¡Fixture sincronizado! ${data.count} partidos actualizados desde ${data.source}.`,
          { id: toastId, duration: 4000 }
        );
        const freshMatches = await dbService.getMatches();
        setLocalMatches(freshMatches);
        setLastSyncTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      } else {
        toast.error(
          `Error de API: ${data.error || 'Fallo desconocido'}. Se utilizó el calendario local offline.`,
          { id: toastId, duration: 5000 }
        );
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error de red al sincronizar con RapidAPI.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Real-time Match simulator loop
  useEffect(() => {
    if (!liveSimulationActive) return;

    const interval = setInterval(() => {
      setLocalMatches((prevMatches) => {
        // Find a pending or playing match and simulate a goal or status change
        const updated = [...prevMatches];
        const indexToUpdate = Math.floor(Math.random() * updated.length);
        const match = { ...updated[indexToUpdate] };

        // Make it live ("playing") or finished, and increment goals randomly
        if (match.status === 'pending') {
          match.status = 'playing';
          match.home_score = 0;
          match.away_score = 0;
          toast.success(`⚽ ¡Comenzó el juego en vivo! ${match.home_team?.name} vs ${match.away_team?.name}`, { duration: 3000 });
        } else if (match.status === 'playing') {
          // 80% chance of score increment, 20% finished match
          if (Math.random() > 0.2) {
            const isHomeGoal = Math.random() > 0.5;
            if (isHomeGoal) {
              match.home_score = (match.home_score || 0) + 1;
              toast(`⚽ GOL de ${match.home_team?.name}! Ahora: ${match.home_score} - ${match.away_score}`, { icon: '🔥' });
            } else {
              match.away_score = (match.away_score || 0) + 1;
              toast(`⚽ GOL de ${match.away_team?.name}! Ahora: ${match.home_score} - ${match.away_score}`, { icon: '🔥' });
            }
          } else {
            match.status = 'finished';
            toast.success(`🏁 Finalizó el partido: ${match.home_team?.name} ${match.home_score} - ${match.away_score} ${match.away_team?.name}`);
          }
        }
        
        updated[indexToUpdate] = match;
        return updated;
      });
    }, 8000); // Trigger live change every 8 seconds for visual real-time stream feedback

    return () => clearInterval(interval);
  }, [liveSimulationActive]);

  // Clean Spanish date formatter for Ribbon tabs
  const formatRibbonDate = (dateString: string) => {
    try {
      const dateParts = dateString.split('-');
      const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), 12, 0, 0);
      const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' });
      const day = d.toLocaleDateString('es-ES', { day: 'numeric' });
      const month = d.toLocaleDateString('es-ES', { month: 'short' });
      return {
        weekday: weekday.replace('.', '').toUpperCase(),
        day,
        month: month.replace('.', '').toUpperCase()
      };
    } catch (_) {
      return { weekday: 'DÍA', day: '??', month: 'JUN' };
    }
  };

  // Spanish date formatter for group headers
  const getSpanishGroupHeader = (dateString: string) => {
    try {
      const dateParts = dateString.split('-');
      const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), 12, 0, 0);
      return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (_) {
      return dateString;
    }
  };

  // Helper to filter matches
  const getFilteredMatches = () => {
    return localMatches.filter((m) => {
      // 1. Filter by Status
      if (filter !== 'all' && m.status !== filter) return false;
      // 2. Filter by Date selection
      if (selectedDate !== 'all') {
        const matchDate = m.start_at ? m.start_at.substring(0, 10) : '';
        if (matchDate !== selectedDate) return false;
      }
      return true;
    });
  };

  const filtered = getFilteredMatches();

  // Group filtered matches chronologically by YYYY-MM-DD for section headers
  const groupedMatches: Record<string, Match[]> = {};
  filtered.forEach((m) => {
    const key = m.start_at ? m.start_at.substring(0, 10) : 'Especial';
    if (!groupedMatches[key]) {
      groupedMatches[key] = [];
    }
    groupedMatches[key].push(m);
  });

  return (
    <div className="space-y-8">
      {/* RapidAPI Connection & Control Dashboard */}
      <div className="p-6 rounded-[2rem] bg-zinc-900/40 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-zinc-850 border border-zinc-700/50 rounded-2xl text-orange-500 shadow-md">
              <Wifi size={24} className={isSyncing ? "animate-bounce" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">
                  Status: Conectado a Servidor Proxy
                </span>
                {liveSimulationActive && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                    <Flame size={10} /> Simulación En Vivo
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tight mt-1">Conector RapidAPI (API-Football)</h3>
              <p className="text-[11px] text-zinc-400 max-w-xl leading-relaxed mt-1">
                La sección de Prode se alimenta directamente de RapidAPI en tiempo real. Sincroniza para traer jornadas oficiales, estatus en vivo y estadísticas de equipos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:self-center">
            {/* Direct Connect Sync Button */}
            <button
              onClick={handleRapidAPISync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-500 text-black font-black uppercase italic tracking-wider text-[10px] transition-all hover:bg-orange-400 active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw size={13} />
                  Sincronizar Fixture
                </>
              )}
            </button>

            {/* Simulated Live Match Stream Toggler */}
            <button
              onClick={() => {
                setLiveSimulationActive(!liveSimulationActive);
                if (!liveSimulationActive) {
                  toast.success('¡Modo de Partidos En Vivo Iniciado! Verás goles simulados en los partidos abiertos.', { icon: '🎮' });
                } else {
                  toast('Retornando al fixture guardado', { icon: 'ℹ️' });
                }
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black uppercase italic tracking-wider text-[10px] transition-all border ${
                liveSimulationActive
                  ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                  : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60'
              }`}
            >
              <Zap size={13} className={liveSimulationActive ? "animate-pulse text-red-400" : "text-orange-500"} />
              {liveSimulationActive ? 'Detener En Vivo' : 'Simular En Vivo'}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800/50 flex flex-wrap items-center justify-between gap-4 text-[10px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Info size={12} className="text-orange-500" />
            <span>Última sincronización con los servidores de API-Football: <strong>{lastSyncTime}</strong></span>
          </div>
          <div>
            <span>Soportado: <strong>Mundial de la FIFA 2026</strong></span>
          </div>
        </div>
      </div>

      {/* Header & Main Search Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/40">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-500 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.3)] text-black">
            <Trophy size={20} className="italic" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">
              FIXTURE Y <span className="text-orange-500 italic">PRODE</span>
            </h2>
            <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mt-1">
              Partidos oficiales organizados detalladamente por fechas
            </p>
          </div>
        </div>

        {/* State Filter Buttons */}
        <div className="flex items-center gap-1 glass p-1 rounded-2xl overflow-x-auto no-scrollbar self-start md:self-auto shrink-0">
          {[
            { id: 'all', label: 'Todos', icon: ListFilter },
            { id: 'pending', label: 'Abiertos', icon: SlidersHorizontal },
            { id: 'finished', label: 'Finalizados', icon: Filter },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase italic tracking-widest shrink-0 transition-all ${
                filter === item.id
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              <item.icon size={11} className="shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Tape Layout for dates Navigation ("partidos por fechas") */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs px-2">
          <span className="font-extrabold uppercase italic text-zinc-400 flex items-center gap-1.5 tracking-wider">
            <Calendar size={13} className="text-orange-500" /> NAVEGADOR POR JORNADA
          </span>
          {selectedDate !== 'all' && (
            <button 
              onClick={() => setSelectedDate('all')} 
              className="text-orange-500 font-extrabold uppercase italic text-[10px] hover:underline"
            >
              [Ver Todos los Días]
            </button>
          )}
        </div>
        
        {/* Date Selector Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth">
          {/* VER TODAS option */}
          <button
            onClick={() => setSelectedDate('all')}
            className={`min-w-[80px] h-16 flex flex-col justify-center items-center rounded-2xl border transition-all uppercase italic shrink-0 ${
              selectedDate === 'all'
                ? 'bg-orange-500 border-orange-500 text-black shadow-lg shadow-orange-500/20 scale-102 font-black'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] tracking-widest font-black leading-none">VER</span>
            <span className="text-lg font-black tracking-tighter leading-none mt-1">TODO</span>
          </button>

          {/* Dynamic Map of Calendar Dates */}
          {uniqueDates.map((dateStr) => {
            const parsed = formatRibbonDate(dateStr);
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-w-[76px] h-16 flex flex-col justify-center items-center rounded-2xl border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-orange-500 border-orange-500 text-black shadow-lg shadow-orange-500/20 scale-102 font-black'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-500 hover:text-white hover:border-zinc-700'
                }`}
              >
                <span className={`text-[8px] font-semibold tracking-wider ${isSelected ? 'text-black' : 'text-zinc-500'}`}>
                  {parsed.weekday}
                </span>
                <span className="text-lg font-black leading-none my-0.5 tracking-tighter">
                  {parsed.day}
                </span>
                <span className={`text-[8px] font-bold tracking-widest ${isSelected ? 'text-black' : 'text-zinc-650'}`}>
                  {parsed.month}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Matches Chronological Feed */}
      <div className="space-y-12">
        {Object.entries(groupedMatches).length > 0 ? (
          Object.entries(groupedMatches)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([dateKey, matchList]) => (
              <div key={dateKey} className="space-y-4">
                {/* Date Header Separator */}
                <div className="flex items-center gap-4">
                  <div className="px-5 py-2.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-black uppercase italic tracking-widest text-orange-500 shadow-md flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {getSpanishGroupHeader(dateKey)}
                  </div>
                  <div className="flex-1 h-px bg-zinc-800/40" />
                  <span className="text-[10px] font-bold uppercase italic text-zinc-550 mr-2">
                    {matchList.length} {matchList.length === 1 ? 'partido' : 'partidos'}
                  </span>
                </div>

                {/* Subgrid of matches for this date */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {matchList.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))
        ) : (
          <div className="py-24 text-center glass rounded-[3.5rem] border-dashed border-zinc-800/80">
            <Trophy size={48} className="mx-auto text-zinc-700 mb-4 animate-pulse" />
            <p className="text-zinc-400 font-extrabold uppercase italic tracking-widest text-sm">
              No hay partidos disponibles
            </p>
            <p className="text-xs text-zinc-550 mt-1 max-w-sm mx-auto leading-relaxed">
              Prueba cambiando la jornada seleccionada en el calendario superior o limpiando los filtros.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
