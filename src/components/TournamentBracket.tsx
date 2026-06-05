import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Team } from '@/types';
import { Trophy, MapPin, Calendar, Search, X, CheckCircle2 } from 'lucide-react';
import { WORLD_CUP_TEAMS } from '@/lib/constants';

interface BracketMatch {
  id: string;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeScore?: number | string;
  awayScore?: number | string;
  status: 'pending' | 'finished';
  date?: string;
  location?: string;
  homePlaceholder?: string;
  awayPlaceholder?: string;
}

interface Round {
  name: string;
  matches: BracketMatch[];
}

interface TournamentBracketProps {
  rounds: Round[];
  onUpdateScore?: (roundName: string, matchId: string, side: 'home' | 'away', value: string) => void;
  onSetWinner?: (roundName: string, matchId: string, team: Team) => void;
  onMatchClick?: (match: any) => void;
}

const TeamSelector: React.FC<{ 
  onSelect: (team: Team) => void; 
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const filtered = WORLD_CUP_TEAMS.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.code.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <>
      {/* Fixed Backdrop - Covers entire screen */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[999]"
      />
      
      {/* Fixed Modal - Centered in viewport */}
      <div className="fixed inset-0 flex items-center justify-center z-[1000] pointer-events-none p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="pointer-events-auto w-full max-w-sm bg-zinc-950 border-2 border-amber-500/50 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,1),0_0_30px_rgba(251,191,36,0.15)] overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Trophy size={20} className="text-black" />
              </div>
              <span className="text-sm font-black text-white uppercase italic tracking-[0.2em]">Elegir Equipo</span>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
              <X size={20}/>
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 group-focus-within:scale-110 transition-transform" />
              <input 
                autoFocus
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-bold placeholder:text-zinc-600 uppercase tracking-widest"
                placeholder="BUSCAR SELECCIÓN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-amber-500/20">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-amber-500/10 rounded-2xl transition-all group border border-transparent hover:border-amber-500/20"
                >
                  <div className="shrink-0 w-12 h-8 rounded-lg overflow-hidden shadow-md border border-white/10 ring-2 ring-transparent group-hover:ring-amber-500/30 transition-all">
                    <img src={t.flag_url} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-xs font-black text-zinc-400 group-hover:text-white truncate uppercase italic tracking-tighter block">{t.name}</span>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase group-hover:text-amber-500/50">{t.code}</span>
                  </div>
                  <CheckCircle2 size={16} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-20 text-center opacity-20 italic text-[10px] uppercase font-black">Equipo no encontrado</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
};

const MatchNode: React.FC<{ 
  roundName: string;
  match: BracketMatch; 
  side: 'left' | 'right' | 'center'; 
  delay: number; 
  isTop?: boolean; 
  hasConnector?: boolean;
  connectorHeight?: string;
  onUpdateScore?: TournamentBracketProps['onUpdateScore'];
  onSetWinner?: TournamentBracketProps['onSetWinner'];
  onMatchClick?: TournamentBracketProps['onMatchClick'];
}> = ({ roundName, match, side, delay, isTop, hasConnector, connectorHeight = 'h-[250%]', onUpdateScore, onSetWinner, onMatchClick }) => {
  const [selectingTeam, setSelectingTeam] = useState<'home' | 'away' | null>(null);
  const isCenter = side === 'center';
  const isLeft = side === 'left';
  const isRight = side === 'right';

  const handleDragStart = (e: React.DragEvent, team: Team | null, sourceSlot: 'home' | 'away') => {
    if (!team) return;
    e.dataTransfer.setData('team', JSON.stringify(team));
    e.dataTransfer.setData('sourceMatchId', match.id);
    e.dataTransfer.setData('sourceRoundName', roundName);
    e.dataTransfer.setData('sourceSlot', sourceSlot);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, _teamSide: 'home' | 'away') => {
    e.preventDefault();
    const teamData = e.dataTransfer.getData('team');
    if (!teamData || !onSetWinner) return;
    try {
      const team = JSON.parse(teamData);
      onSetWinner(roundName, match.id, team);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const isMatchCompleted = match.homeScore !== '' && match.awayScore !== '' && match.homeScore !== undefined && match.awayScore !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: isLeft ? -20 : isRight ? 20 : 0 }}
      whileInView={{ opacity: 1, scale: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      onClick={(e) => {
        // Only trigger onMatchClick if not clicking score inputs or team selectors
        const target = e.target as HTMLElement;
        if (!target.closest('input') && !target.closest('.team-clickable')) {
          onMatchClick && onMatchClick(match);
        }
      }}
      className={`relative cursor-pointer group ${isCenter ? 'w-84' : 'w-42 lg:w-52'}`}
    >
      {/* Horizontal Connector to next round */}
      {hasConnector && (
        <div className={`absolute top-1/2 -translate-y-1/2 w-10 lg:w-16 h-[3px] transition-all duration-700 overflow-hidden ${isLeft ? '-right-10 lg:-right-16 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : '-left-10 lg:-left-16 shadow-[0_0_10px_rgba(255,255,255,0.1)]'} ${isMatchCompleted ? 'bg-amber-400' : 'bg-white/10'}`}>
          {isMatchCompleted && (
            <motion.div 
              initial={{ x: isLeft ? '-100%' : '100%' }}
              animate={{ x: isLeft ? '100%' : '-100%' }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-80 shadow-[0_0_15px_rgba(255,255,255,1)]"
            />
          )}
        </div>
      )}

      {/* Vertical Connector for pairs */}
      {hasConnector && (
        <div className={`absolute top-1/2 ${isLeft ? '-right-10 lg:-right-16' : '-left-10 lg:-left-16'} w-[3px] transition-all duration-700 bg-white/10 ${connectorHeight} ${isTop ? 'translate-y-0' : '-translate-y-full'} hidden sm:block shadow-[0_0_10px_rgba(255,255,255,0.05)]`}>
          <motion.div 
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.3, duration: 1 }}
            className={`w-full h-1/2 origin-${isTop ? 'top' : 'bottom'} relative top-${isTop ? '0' : '1/2'} transition-all duration-700 ${isMatchCompleted ? 'bg-amber-400 shadow-[0_0_25px_rgba(251,191,36,1)]' : 'bg-white/10'}`}
          >
            {isMatchCompleted && (
               <motion.div 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-white blur-[2px]"
               />
            )}
          </motion.div>
        </div>
      )}

      {/* Date/Location Label */}
      {!isCenter && (
        <div className={`absolute -top-5 w-full flex items-center gap-1.5 text-[7px] font-black uppercase tracking-widest text-[#ffd700] italic ${isRight ? 'flex-row-reverse' : ''}`}>
          {match.date && <span className="drop-shadow-sm">{match.date}</span>}
          {match.location && <span className="text-white/40">{match.location}</span>}
        </div>
      )}

      <div className={`bg-[#002244]/95 backdrop-blur-xl border-[2.5px] rounded-2xl p-3 transition-all shadow-2xl group ${isCenter ? 'border-amber-400 scale-125 shadow-amber-400/30' : 'border-white/10 hover:border-amber-400 hover:scale-[1.08]'}`}>
        <div className="space-y-2">
          {/* Home Team */}
          <div 
            className={`flex items-center justify-between px-2 py-1.5 rounded-xl transition-all duration-300 ${isRight ? 'flex-row-reverse' : ''} ${match.homeTeam ? 'bg-white/[0.03] border border-white/5' : 'bg-transparent border border-dashed border-white/10 hover:border-amber-400/50'}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'home')}
          >
            <motion.div 
              whileHover={{ x: isLeft ? 3 : isRight ? -3 : 0 }}
              draggable={!!match.homeTeam}
              onDragStart={(e) => handleDragStart(e, match.homeTeam, 'home')}
              onClick={() => setSelectingTeam('home')}
              className={`flex items-center gap-3 cursor-pointer active:cursor-grabbing team-clickable ${isRight ? 'flex-row-reverse' : ''}`}
            >
              <div className="w-9 h-6 bg-[#001a33] rounded-md shadow-inner overflow-hidden border border-white/10 flex items-center justify-center group-hover:border-amber-400/50 transition-colors">
                {match.homeTeam?.flag_url ? (
                  <img src={match.homeTeam.flag_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] font-black italic text-white/20 tracking-normal bg-linear-to-br from-white/10 to-transparent">
                    {match.homePlaceholder || (roundName === 'R32' ? `1${["A","B","C","D","E","F","G","H","I","J","K","L"][parseInt(match.id.split('-')[1]) % 12]}` : 'TBD')}
                  </div>
                )}
              </div>
              <span className={`text-[12px] font-black text-white uppercase italic tracking-tighter truncate ${isCenter ? 'text-[14px]' : 'max-w-[70px] lg:max-w-[100px]'} group-hover:text-amber-400 transition-colors`}>
                {match.homeTeam?.name || match.homePlaceholder || 'TBD'}
              </span>
            </motion.div>
            <AnimatePresence>
              {selectingTeam === 'home' && (
                <TeamSelector 
                  onSelect={(team) => {
                    onSetWinner?.(roundName, match.id, team);
                    setSelectingTeam(null);
                  }} 
                  onClose={() => setSelectingTeam(null)} 
                />
              )}
            </AnimatePresence>
            <input
              type="text"
              placeholder="-"
              className="w-7 h-7 bg-white/95 text-[13px] font-black text-[#002244] text-center rounded-lg outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono placeholder:text-zinc-600 shadow-xl"
              value={match.homeScore ?? ''}
              onChange={(e) => onUpdateScore && onUpdateScore(roundName, match.id, 'home', e.target.value)}
              maxLength={2}
            />
          </div>

          <div className="flex items-center gap-3 px-4">
             <div className="h-[1px] flex-1 bg-white/5 group-hover:bg-amber-400/20 transition-colors" />
             <span className="text-[7px] font-black text-white/5 italic group-hover:text-amber-400/40 transition-colors">VS</span>
             <div className="h-[1px] flex-1 bg-white/5 group-hover:bg-amber-400/20 transition-colors" />
          </div>

          {/* Away Team */}
          <div 
            className={`flex items-center justify-between px-2 py-1.5 rounded-xl transition-all duration-300 ${isRight ? 'flex-row-reverse' : ''} ${match.awayTeam ? 'bg-white/[0.03] border border-white/5' : 'bg-transparent border border-dashed border-white/10 hover:border-amber-400/50'}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'away')}
          >
            <motion.div 
              whileHover={{ x: isLeft ? 3 : isRight ? -3 : 0 }}
              draggable={!!match.awayTeam}
              onDragStart={(e) => handleDragStart(e, match.awayTeam, 'away')}
              onClick={() => setSelectingTeam('away')}
              className={`flex items-center gap-3 cursor-pointer active:cursor-grabbing team-clickable ${isRight ? 'flex-row-reverse' : ''}`}
            >
              <div className="w-9 h-6 bg-[#001a33] rounded-md shadow-inner overflow-hidden border border-white/10 flex items-center justify-center group-hover:border-amber-400/50 transition-colors">
                {match.awayTeam?.flag_url ? (
                  <img src={match.awayTeam.flag_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] font-black italic text-white/20 tracking-normal bg-linear-to-br from-white/10 to-transparent">
                    {match.awayPlaceholder || (roundName === 'R32' ? `2${["A","B","C","D","E","F","G","H","I","J","K","L"][(parseInt(match.id.split('-')[1]) + 1) % 12]}` : 'TBD')}
                  </div>
                )}
              </div>
              <span className={`text-[12px] font-black text-white uppercase italic tracking-tighter truncate ${isCenter ? 'text-[14px]' : 'max-w-[70px] lg:max-w-[100px]'} group-hover:text-amber-400 transition-colors`}>
                {match.awayTeam?.name || match.awayPlaceholder || 'TBD'}
              </span>
            </motion.div>
            <AnimatePresence>
              {selectingTeam === 'away' && (
                <TeamSelector 
                  onSelect={(team) => {
                    onSetWinner?.(roundName, match.id, team);
                    setSelectingTeam(null);
                  }} 
                  onClose={() => setSelectingTeam(null)} 
                />
              )}
            </AnimatePresence>
            <input
              type="text"
              placeholder="-"
              className="w-7 h-7 bg-white/95 text-[13px] font-black text-[#002244] text-center rounded-lg outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono placeholder:text-zinc-600 shadow-xl"
              value={match.awayScore ?? ''}
              onChange={(e) => onUpdateScore && onUpdateScore(roundName, match.id, 'away', e.target.value)}
              maxLength={2}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ rounds, onUpdateScore, onSetWinner, onMatchClick }) => {
  const r32 = rounds.find(r => r.name === 'R32')?.matches || [];
  const r16 = rounds.find(r => r.name === 'R16')?.matches || [];
  const qf = rounds.find(r => r.name === 'CUARTOS')?.matches || [];
  const sf = rounds.find(r => r.name === 'SEMIFINAL')?.matches || [];
  const final = rounds.find(r => r.name === 'FINAL')?.matches[0];

  const Side = ({ side }: { side: 'left' | 'right' }) => {
    const isLeft = side === 'left';
    
    return (
      <div className={`flex items-center gap-10 lg:gap-20 ${isLeft ? 'flex-row' : 'flex-row-reverse'} h-[1000px]`}>
        {/* R32 */}
        <div className="flex flex-col justify-around h-full">
          {r32.slice(isLeft ? 0 : 8, isLeft ? 8 : 16).map((m, i) => (
            <MatchNode key={m.id} roundName="R32" match={m} side={side} delay={(i * 0.05)} hasConnector={true} isTop={i % 2 === 0} connectorHeight="h-[125%]" onUpdateScore={onUpdateScore} onSetWinner={onSetWinner} onMatchClick={onMatchClick} />
          ))}
        </div>
        {/* R16 */}
        <div className="flex flex-col justify-around h-full">
          {r16.slice(isLeft ? 0 : 4, isLeft ? 4 : 8).map((m, i) => (
            <MatchNode key={m.id} roundName="R16" match={m} side={side} delay={(i + 4) * 0.1} hasConnector={true} isTop={i % 2 === 0} connectorHeight="h-[250%]" onUpdateScore={onUpdateScore} onSetWinner={onSetWinner} onMatchClick={onMatchClick} />
          ))}
        </div>
        {/* QF */}
        <div className="flex flex-col justify-around h-full">
          {qf.slice(isLeft ? 0 : 2, isLeft ? 2 : 4).map((m, i) => (
            <MatchNode key={m.id} roundName="CUARTOS" match={m} side={side} delay={(i + 8) * 0.15} hasConnector={true} isTop={i % 2 === 0} connectorHeight="h-[500%]" onUpdateScore={onUpdateScore} onSetWinner={onSetWinner} onMatchClick={onMatchClick} />
          ))}
        </div>
        {/* SF */}
        <div className="flex flex-col justify-around h-full">
          {sf.slice(isLeft ? 0 : 1, isLeft ? 1 : 2).map((m, i) => (
            <MatchNode key={m.id} roundName="SEMIFINAL" match={m} side={side} delay={(i + 12) * 0.2} hasConnector={true} isTop={true} connectorHeight="h-[1000%]" onUpdateScore={onUpdateScore} onSetWinner={onSetWinner} onMatchClick={onMatchClick} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full bg-[#001a33] overflow-x-auto scrollbar-hide py-32">
      {/* Immersive Stadium Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Grass Texture Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {/* Stadium Lights */}
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full" />
        <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-orange-500/10 blur-[150px] rounded-full" />
        
        {/* Center Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05)_0%,transparent_70%)]" />

        {/* Pitch Lines (Subtle) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
           <div className="w-[800px] h-[800px] border-[10px] border-white rounded-full" />
           <div className="absolute inset-y-0 left-1/2 w-2 bg-white -translate-x-1/2" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-start min-w-max gap-20 lg:gap-32 px-40 lg:px-60 h-full">
        {/* Left Side */}
        <Side side="left" />

        {/* Center Section (Final) */}
        <div className="flex flex-col items-center justify-center gap-16 z-10 px-8 min-w-[500px]">
          <div className="text-center space-y-4 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="inline-block px-6 py-2 bg-white/5 border border-white/10 rounded-full mb-4"
            >
              <span className="text-xs font-black text-amber-400 uppercase italic tracking-[0.4em]">Gran Final • 2026</span>
            </motion.div>
            <h3 className="text-8xl font-black text-white italic uppercase tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">FIFA</h3>
            <p className="text-3xl font-black text-white/90 italic uppercase tracking-[0.4em] leading-none text-glow">WORLD CUP</p>
          </div>

          <div className="relative group">
            <motion.div
              animate={{ 
                scale: [1, 1.02, 1],
                rotate: [0, 1, 0, -1, 0]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-20 cursor-help"
            >
              <Trophy size={240} className="text-amber-400 drop-shadow-[0_0_60px_rgba(251,191,36,0.5)] transition-all duration-700 group-hover:scale-110" />
            </motion.div>
            <div className="absolute inset-0 bg-amber-400/20 blur-[100px] rounded-full animate-pulse group-hover:bg-amber-400/30 transition-all" />
            
            {/* Crown/Aura effect */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-10 bg-linear-to-b from-amber-400/40 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
          </div>

          <div className="space-y-12 mt-8 w-full flex flex-col items-center">
            <div className="text-center relative">
               <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse" />
               <div className="relative">
                <span className="text-3xl font-black text-black uppercase italic tracking-[0.4em] bg-linear-to-r from-orange-400 to-amber-500 px-16 py-4 rounded-2xl shadow-2xl skew-x-[-10deg] block border-b-4 border-black/20">FINAL</span>
                <p className="text-xl font-black text-white uppercase tracking-[0.2em] mt-8 italic drop-shadow-md">DOMINGO 19 DE JULIO • NEW JERSEY</p>
              </div>
            </div>
            
            <div className="scale-125 origin-center">
              {final && <MatchNode roundName="FINAL" match={final} side="center" delay={2} onUpdateScore={onUpdateScore} onSetWinner={onSetWinner} onMatchClick={onMatchClick} />}
            </div>

            <div className="pt-24 text-center">
              <div className="text-9xl font-black text-white/[0.03] italic uppercase tracking-tighter select-none leading-none border-t border-white/5 pt-12">WE ARE 26</div>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <Side side="right" />
      </div>

      {/* Navigation Indicator */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.5, y: 0 }}
          className="flex items-center gap-4 bg-black/50 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full"
        >
          <div className="flex gap-1 animate-bounce">
             <div className="w-1 h-1 bg-white rounded-full" />
             <div className="w-1 h-1 bg-white rounded-full opacity-50" />
             <div className="w-1 h-1 bg-white rounded-full opacity-20" />
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Desliza para explorar la eliminatoria</span>
        </motion.div>
      </div>
    </div>
  );
};

