import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  TrendingUp, 
  Wallet, 
  Clock, 
  ChevronRight, 
  Download, 
  Trash2, 
  DollarSign, 
  ChevronLeft,
  ArrowRightLeft,
  LayoutDashboard,
  ListOrdered,
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { WORLD_CUP_TEAMS } from '../lib/constants';
import { TournamentBracket } from './TournamentBracket';

interface BetOption {
  id: string;
  matchId: string;
  matchTeams: string;
  selection: string;
  odds: number;
}

interface MatchBetting {
  id: string;
  home: typeof WORLD_CUP_TEAMS[0];
  away: typeof WORLD_CUP_TEAMS[0];
  date: string;
  time: string;
  venue: string;
  city: string;
  round: string;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
}

const CITIES = ['New York/NJ', 'Dallas', 'Kansas City', 'Houston', 'Atlanta', 'Los Angeles', 'Philadelphia', 'Seattle', 'San Francisco', 'Boston', 'Miami', 'Mexico City', 'Monterrey', 'Guadalajara', 'Vancouver', 'Toronto'];
const STADIUMS = ['MetLife Stadium', 'AT&T Stadium', 'Arrowhead Stadium', 'NRG Stadium', 'Mercedes-Benz Stadium', 'SoFi Stadium', 'Lincoln Financial Field', 'Lumen Field', 'Levi\'s Stadium', 'Gillette Stadium', 'Hard Rock Stadium', 'Estadio Azteca', 'Estadio BBVA', 'Estadio Akron', 'BC Place', 'BMO Field'];

export const BettingZone: React.FC = () => {
  const [balance, setBalance] = useState(2500.50);
  const [betSlip, setBetSlip] = useState<BetOption[]>([]);
  const [betAmount, setBetAmount] = useState('100');
  const [selectedMatch, setSelectedMatch] = useState<MatchBetting | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'BRACKET'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('TODO');

  const allMatches = useMemo(() => {
    const generated: MatchBetting[] = [];
    // Generate matches based on all teams in constants
    for (let i = 0; i < WORLD_CUP_TEAMS.length; i += 2) {
      const cityIndex = (i / 2) % CITIES.length;
      const day = (Math.floor(i / 16) + 11);
      const hour = 13 + (i % 8);
      
      generated.push({
        id: `mb-${i}`,
        home: WORLD_CUP_TEAMS[i],
        away: WORLD_CUP_TEAMS[i + 1] || WORLD_CUP_TEAMS[0], // Fallback
        date: `${day} JUN 2026`,
        time: `${hour}:00`,
        venue: STADIUMS[cityIndex],
        city: CITIES[cityIndex],
        round: `Grupo ${WORLD_CUP_TEAMS[i].group_name}`,
        odds: {
          home: 1.5 + Math.random() * 2,
          draw: 3.1 + Math.random() * 1.2,
          away: 1.9 + Math.random() * 2.8
        }
      });
    }
    return generated;
  }, []);

  const filteredMatches = useMemo(() => {
    return allMatches.filter(m => {
      const matchesSearch = 
        m.home.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.away.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (activeFilter === 'TODO') return matchesSearch;
      return matchesSearch && m.round.includes(activeFilter);
    });
  }, [allMatches, searchTerm, activeFilter]);

  const groupedMatches = useMemo((): { [key: string]: MatchBetting[] } => {
    const groups: { [key: string]: MatchBetting[] } = {};
    filteredMatches.forEach(m => {
      if (!groups[m.date]) groups[m.date] = [];
      groups[m.date].push(m);
    });
    return groups;
  }, [filteredMatches]);

  const dummyRounds = useMemo(() => {
    const generateMatches = (count: number) => Array.from({ length: count }, (_, i) => ({
      id: `bracket-${count}-${i}`,
      homeTeam: WORLD_CUP_TEAMS[Math.floor(Math.random() * WORLD_CUP_TEAMS.length)],
      awayTeam: WORLD_CUP_TEAMS[Math.floor(Math.random() * WORLD_CUP_TEAMS.length)],
      status: 'pending' as const,
      date: 'JULIO 2026',
      location: 'ESTADIO AZTECA'
    }));

    return [
      { name: 'R32', matches: generateMatches(16) },
      { name: 'R16', matches: generateMatches(8) },
      { name: 'CUARTOS', matches: generateMatches(4) },
      { name: 'SEMIFINAL', matches: generateMatches(2) },
      { name: 'FINAL', matches: generateMatches(1) },
    ];
  }, []);

  const addToBetSlip = (match: MatchBetting, selection: string, odds: number, market: string = 'Ganador del partido') => {
    const betId = `${match.id}-${selection}-${market}`;
    if (betSlip.find(b => b.id === betId)) {
      setBetSlip(prev => prev.filter(b => b.id !== betId));
    } else {
      setBetSlip(prev => [...prev, {
        id: betId,
        matchId: match.id,
        matchTeams: `${match.home.name} vs ${match.away.name}`,
        selection: `${selection}`,
        odds
      }]);
    }
  };

  const removeFromSlip = (id: string) => {
    setBetSlip(prev => prev.filter(b => b.id !== id));
  };

  const totalOdds = betSlip.reduce((acc, bet) => acc * bet.odds, 1);
  const potentialWin = (parseFloat(betAmount) || 0) * totalOdds;

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden pb-40 font-sans">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-amber-500/5 blur-[150px] rounded-full" />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12 space-y-10">
        
        {/* Superior Elite Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-linear-to-br from-[#0f172a] to-black p-8 lg:p-14 rounded-[3rem] border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <div className="space-y-6 relative z-10">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500"
            >
              <TrendingUp size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Mercado Global FIFA 2026</span>
            </motion.div>
            
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.8] mb-4">
              ULTIMATE<br/>
              <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-orange-600">STAKES</span>
            </h2>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setViewMode('LIST')}
                className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest italic transition-all ${viewMode === 'LIST' ? 'bg-[#ffd700] text-[#002244]' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
              >
                <ListOrdered size={16} /> Calendario
              </button>
              <button 
                onClick={() => setViewMode('BRACKET')}
                className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest italic transition-all ${viewMode === 'BRACKET' ? 'bg-[#ffd700] text-[#002244]' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
              >
                <LayoutDashboard size={16} /> Bracket View
              </button>
            </div>
          </div>
          
          <div className="bg-linear-to-b from-white/10 to-transparent p-10 rounded-3xl border-t border-white/20 backdrop-blur-xl flex flex-col md:flex-row items-center gap-10 shadow-inner">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mb-3 italic">TU BILLETERA</p>
              <h4 className="text-5xl font-black text-[#ffd700] italic tabular-nums tracking-tighter">${balance.toLocaleString()}</h4>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              className="bg-amber-500 hover:bg-amber-600 p-5 rounded-2xl shadow-xl shadow-amber-500/20 text-white"
            >
              <Download size={28} />
            </motion.button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group max-w-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Buscar país, equipo o estadio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-sm font-black italic focus:border-amber-500/50 outline-none transition-all placeholder:text-white/20 uppercase tracking-widest"
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-8 relative z-10">
          
          {/* Main Matches Area */}
          <div className="lg:col-span-8 space-y-12">
            <AnimatePresence mode="wait">
              {selectedMatch ? (
                /* REDESIGNED MATCH DETAIL VIEW */
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-8"
                >
                  <button 
                    onClick={() => setSelectedMatch(null)}
                    className="flex items-center gap-3 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.4em] italic mb-4"
                  >
                    <ChevronLeft size={16} /> Regresar al Calendario
                  </button>

                  <div className="bg-linear-to-b from-[#0f172a] to-black border border-white/10 rounded-[3rem] p-10 md:p-20 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-45 text-amber-500">
                      <Trophy size={400} />
                    </div>

                    <div className="relative z-10 space-y-16">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="flex items-center gap-6 text-amber-500 font-black italic tracking-[0.6em] uppercase text-xs">
                          <MapPin size={14} /> {selectedMatch.city} • {selectedMatch.venue}
                        </div>
                        <h3 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white/20">{selectedMatch.date} • {selectedMatch.time}</h3>
                      </div>

                      <div className="flex items-center justify-center gap-8 md:gap-16">
                        <div className="flex flex-col items-center gap-8 flex-1 max-w-[280px]">
                           <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 ring-4 ring-amber-500/20">
                              <img src={selectedMatch.home.flag_url} className="w-full h-full object-cover" />
                           </div>
                           <span className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-center leading-none">
                              {selectedMatch.home.name}
                           </span>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                           <div className="text-7xl md:text-9xl font-black text-white/5 italic select-none">VS</div>
                        </div>

                        <div className="flex flex-col items-center gap-8 flex-1 max-w-[280px]">
                           <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 ring-4 ring-amber-500/20">
                              <img src={selectedMatch.away.flag_url} className="w-full h-full object-cover" />
                           </div>
                           <span className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-center leading-none">
                              {selectedMatch.away.name}
                           </span>
                        </div>
                      </div>

                      {/* Detail Markets */}
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                           <h4 className="text-xs font-black uppercase italic tracking-widest text-amber-500">MERCADOS PRINCIPALES</h4>
                           <div className="grid grid-cols-1 gap-3">
                              {[
                                { l: selectedMatch.home.name, o: selectedMatch.odds.home },
                                { l: 'EMPATE', o: selectedMatch.odds.draw },
                                { l: selectedMatch.away.name, o: selectedMatch.odds.away }
                              ].map(opt => (
                                <button
                                  key={opt.l}
                                  onClick={() => addToBetSlip(selectedMatch, opt.l, opt.o, '1X2')}
                                  className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
                                    betSlip.find(b => b.id === `${selectedMatch.id}-${opt.l}-1X2`)
                                      ? 'bg-amber-400 border-amber-400 text-black font-black'
                                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  <span className="text-sm font-black italic uppercase">{opt.l}</span>
                                  <span className="text-xl font-black italic">{opt.o.toFixed(2)}</span>
                                </button>
                              ))}
                           </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                           <h4 className="text-xs font-black uppercase italic tracking-widest text-white/40">MARCADOR EXACTO</h4>
                           <div className="grid grid-cols-2 gap-3">
                              {[
                                { s: '1-0', o: 6.50 }, { s: '2-0', o: 8.00 },
                                { s: '2-1', o: 7.50 }, { s: '0-0', o: 10.0 },
                                { s: '1-1', o: 5.50 }, { s: '0-1', o: 9.00 }
                              ].map(opt => (
                                <button
                                  key={opt.s}
                                  onClick={() => addToBetSlip(selectedMatch, opt.s, opt.o, 'Score')}
                                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                    betSlip.find(b => b.id === `${selectedMatch.id}-${opt.s}-Score`)
                                      ? 'bg-amber-400 border-amber-400 text-black'
                                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  <span className="text-xs font-black italic">{opt.s}</span>
                                  <span className="text-base font-black italic">{opt.o.toFixed(2)}</span>
                                </button>
                              ))}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : viewMode === 'BRACKET' ? (
                /* BRACKET VIEW */
                <motion.div
                  key="bracket"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <TournamentBracket 
                    rounds={dummyRounds} 
                    onMatchClick={(bracketMatch) => {
                      // Map bracket match back to a betting match
                      const mockMatch: MatchBetting = {
                        id: bracketMatch.id,
                        home: bracketMatch.homeTeam || WORLD_CUP_TEAMS[0],
                        away: bracketMatch.awayTeam || WORLD_CUP_TEAMS[1],
                        date: bracketMatch.date || 'TBD',
                        time: '20:00',
                        venue: 'ESTADIO MUNDIALISTA',
                        city: 'CIUDAD ANFITRIONA',
                        round: 'Eliminatorias',
                        odds: { home: 2.1, draw: 3.4, away: 2.8 }
                      };
                      setSelectedMatch(mockMatch);
                    }}
                  />
                </motion.div>
              ) : (
                /* GROUPED LIST VIEW */
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  {(Object.entries(groupedMatches) as [string, MatchBetting[]][]).map(([date, dateMatches]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border-l-4 border-amber-500 backdrop-blur-xl">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                          <CalendarIcon size={20} className="text-amber-500" />
                          {date}
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {dateMatches.map(match => (
                          <div 
                            key={match.id} 
                            onClick={(e) => {
                              // Only navigate if not clicking a button
                              if (!(e.target as HTMLElement).closest('button')) {
                                setSelectedMatch(match);
                              }
                            }}
                            className="bg-[#0f172a]/60 border border-white/5 rounded-2xl p-6 hover:bg-[#0f172a]/90 transition-all group shadow-lg cursor-pointer"
                          >
                            <div className="grid grid-cols-12 gap-6 items-center">
                              {/* Info & Teams */}
                              <div className="col-span-12 xl:col-span-4 space-y-4">
                                <div className="flex items-center gap-3 text-[9px] font-black uppercase text-white/20 italic tracking-widest">
                                   <span>COPA DEL MUNDO-2026</span>
                                   <span className="text-amber-500/50">•</span>
                                   <span>{match.time}</span>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-4">
                                    <img src={match.home.flag_url} className="w-8 h-5 object-cover rounded shadow-sm" />
                                    <span className="text-sm font-bold uppercase truncate">{match.home.name}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <img src={match.away.flag_url} className="w-8 h-5 object-cover rounded shadow-sm" />
                                    <span className="text-sm font-bold uppercase truncate">{match.away.name}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Markets Container */}
                              <div className="col-span-12 xl:col-span-8 grid grid-cols-5 gap-3">
                                {/* Market 1: Ganador */}
                                <div className="col-span-3 space-y-2">
                                  <span className="text-[10px] font-black uppercase text-white/20 italic tracking-widest pl-2">GANADOR DEL PARTIDO</span>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[
                                      { label: match.home.name, code: '1', odds: match.odds.home },
                                      { label: 'EMPATE', code: 'X', odds: match.odds.draw },
                                      { label: match.away.name, code: '2', odds: match.odds.away }
                                    ].map(opt => (
                                      <button
                                        key={opt.code}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addToBetSlip(match, opt.label, opt.odds, '1X2');
                                        }}
                                        className={`py-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                                          betSlip.find(b => b.id === `${match.id}-${opt.label}-1X2`)
                                            ? 'bg-amber-400 border-amber-400 text-black shadow-lg shadow-amber-500/20 scale-[1.02]'
                                            : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                                        }`}
                                      >
                                        <span className="text-[8px] font-black opacity-40 uppercase truncate px-1">{opt.label}</span>
                                        <span className="text-base font-black italic">{opt.odds.toFixed(2)}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Market 2: Total Goles */}
                                <div className="col-span-2 space-y-2">
                                  <span className="text-[10px] font-black uppercase text-white/20 italic tracking-widest pl-2">TOTAL GOLES (2.5)</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { label: 'MÁS DE 2.5', odds: 1.85 },
                                      { label: 'MENOS DE 2.5', odds: 1.95 }
                                    ].map(opt => (
                                      <button
                                        key={opt.label}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addToBetSlip(match, opt.label, opt.odds, 'Goles');
                                        }}
                                        className={`py-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                                          betSlip.find(b => b.id === `${match.id}-${opt.label}-Goles`)
                                            ? 'bg-amber-400 border-amber-400 text-black shadow-lg shadow-amber-500/20 scale-[1.02]'
                                            : 'bg-white/5 border-white/5 hover:border-white/20'
                                        }`}
                                      >
                                        <span className="text-[8px] font-black opacity-40 uppercase">{opt.label.split(' ')[0]}</span>
                                        <span className="text-base font-black italic">{opt.odds.toFixed(2)}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bet Slip Sidebar */}
          <div className="lg:col-span-4 h-fit lg:sticky lg:top-8">
            <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12">
                 <Trophy size={180} />
               </div>

               <div className="flex items-center justify-between mb-10 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                       <DollarSign size={24} className="text-black" />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">BOLETA</h3>
                  </div>
                  <span className="bg-white text-black text-xs font-black px-4 py-2 rounded-xl shadow-xl">{betSlip.length}</span>
               </div>

               {/* Selections List */}
               <div className="space-y-4 mb-10 relative z-10 scrollbar-hide max-h-[400px] overflow-y-auto pr-2">
                 <AnimatePresence mode='popLayout'>
                  {betSlip.length === 0 ? (
                    <div className="py-20 text-center opacity-20 space-y-4">
                       <Download size={40} className="mx-auto -rotate-90" />
                       <p className="text-xs font-black uppercase italic tracking-widest">Sin apuestas seleccionadas</p>
                    </div>
                  ) : (
                    betSlip.map(bet => (
                      <motion.div 
                        key={bet.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="bg-white/5 border border-white/5 rounded-2xl p-5 group hover:bg-white/10 transition-all relative"
                      >
                         <button 
                          onClick={() => removeFromSlip(bet.id)}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl"
                         >
                            <Trash2 size={14} />
                         </button>
                         
                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-black text-white/40 uppercase italic tracking-widest leading-tight w-2/3">{bet.matchTeams}</span>
                               <span className="text-lg font-black text-amber-500 italic tabular-nums">{bet.odds.toFixed(2)}</span>
                            </div>
                            <p className="text-base font-black italic uppercase tracking-tight">{bet.selection}</p>
                         </div>
                      </motion.div>
                    ))
                  )}
                 </AnimatePresence>
               </div>

               {betSlip.length > 0 && (
                 <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between border-t border-white/5 pt-8">
                       <span className="text-xs font-black text-white/30 uppercase italic">Multiplicador</span>
                       <span className="text-3xl font-black text-[#ffd700] italic tabular-nums">@{totalOdds.toFixed(2)}</span>
                    </div>

                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-white/30 uppercase italic tracking-widest">MONTO DE APUESTA</p>
                       <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                          <span className="text-2xl font-black italic text-amber-500">$</span>
                          <input 
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            className="w-full bg-transparent border-none text-right text-3xl font-black italic text-white outline-none placeholder:text-white/10 tabular-nums"
                            placeholder="0.00"
                          />
                       </div>
                    </div>

                    <div className="bg-linear-to-br from-amber-500/10 to-transparent p-6 rounded-3xl border border-amber-500/20 space-y-2">
                       <span className="text-[10px] font-black text-white/30 uppercase italic tracking-widest">PAGO POTENCIAL</span>
                       <p className="text-4xl font-black italic tabular-nums text-amber-500">
                         ${potentialWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </p>
                    </div>

                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-amber-500 text-black py-6 rounded-2xl text-[14px] font-black italic uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(255,191,36,0.2)] hover:bg-white transition-all"
                    >
                      REALIZAR APUESTA
                    </motion.button>
                 </div>
               )}
            </div>

            <p className="mt-6 text-[9px] text-white/20 text-center italic font-bold">
              * JUEGO RESPONSABLE • SOLO RECREATIVO • FIFA 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
