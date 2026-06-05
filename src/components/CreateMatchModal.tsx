import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, PlusCircle, Award } from 'lucide-react';
import { Team } from '../types';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    home_team_id: string;
    away_team_id: string;
    start_at: string;
    phase: string;
    group_name: string;
  }) => void;
  teams: Team[];
}

export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  teams
}) => {
  const [phase, setPhase] = useState<string>('group');
  const [groupName, setGroupName] = useState<string>('A');
  const [homeTeamId, setHomeTeamId] = useState<string>('');
  const [awayTeamId, setAwayTeamId] = useState<string>('');
  const [startAt, setStartAt] = useState<string>('2026-06-21T18:00');

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setPhase('group');
      setGroupName('A');
      setHomeTeamId('');
      setAwayTeamId('');
      
      // Default date can be sometime in June 2026
      setStartAt('2026-06-21T18:00');
    }
  }, [isOpen]);

  // Dynamically filter teams by group to help user find them easily if it's group phase
  const filteredTeams = teams.filter(t => {
    if (phase !== 'group') return true;
    return t.group_name === groupName;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeamId || !awayTeamId) {
      alert('Por favor selecciona ambos equipos.');
      return;
    }
    if (homeTeamId === awayTeamId) {
      alert('Un equipo no puede jugar contra sí mismo.');
      return;
    }

    // Convert local datetime to ISO Zulu time
    const localDate = new Date(startAt);
    const isoString = localDate.toISOString();

    onConfirm({
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      start_at: isoString,
      phase,
      group_name: phase === 'group' ? groupName : ''
    });
    onClose();
  };

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const phases = [
    { value: 'group', label: 'Fase de Grupos' },
    { value: 'round_16', label: 'Octavos de Final' },
    { value: 'quarter', label: 'Cuartos de Final' },
    { value: 'semi', label: 'Semifinal' },
    { value: 'final', label: 'Gran Final' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/95 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden z-10 my-8"
          >
            {/* Glow design */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-10 blur-[90px] bg-orange-500 pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors rounded-xl hover:bg-zinc-900"
            >
              <X size={20} />
            </button>

            <div className="relative z-10 space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center border border-orange-500/20 bg-orange-500/10 text-orange-500">
                  <Calendar size={24} />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                  Cargar Nuevo Partido
                </h3>
                <p className="text-xs font-semibold text-zinc-500 tracking-wider uppercase italic">
                  Definir fixtures oficiales del mundial
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Phase Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 font-mono">Fase del Torneo</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {phases.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPhase(p.value)}
                        className={`py-2 px-1 text-[10px] font-bold rounded-xl border uppercase transition-all tracking-tight leading-none ${
                          phase === p.value
                            ? 'bg-orange-500 border-orange-500 text-black'
                            : 'bg-zinc-900/65 border-zinc-850 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Group Selector (Only visible if phase === 'group') */}
                {phase === 'group' && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 font-mono">Grupo</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-900/40 border border-zinc-850 rounded-2xl">
                      {groups.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            setGroupName(g);
                            // Reset selected teams when group changes to ensure they are within the new group
                            setHomeTeamId('');
                            setAwayTeamId('');
                          }}
                          className={`w-8 h-8 text-xs font-black rounded-lg uppercase transition-all flex items-center justify-center ${
                            groupName === g
                              ? 'bg-white text-black'
                              : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Date and Time Local */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 font-mono" htmlFor="start_at">
                    Fecha y Hora de Inicio
                  </label>
                  <input
                    id="start_at"
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl p-3 text-xs font-bold uppercase italic tracking-wide focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* 4. Home and Away Teams Select dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Home Team */}
                  <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Equipo Local (Home)</span>
                    <select
                      value={homeTeamId}
                      onChange={(e) => setHomeTeamId(e.target.value)}
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl p-3 text-xs font-black uppercase focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Seleccionar...</option>
                      {filteredTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Away Team */}
                  <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Equipo Visitante (Away)</span>
                    <select
                      value={awayTeamId}
                      onChange={(e) => setAwayTeamId(e.target.value)}
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl p-3 text-xs font-black uppercase focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Seleccionar...</option>
                      {filteredTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex flex-col gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-black uppercase italic tracking-widest text-xs rounded-2xl shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <PlusCircle size={16} />
                    Confirmar y Crear Partido
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClose}
                    className="w-full py-4 text-xs font-black italic uppercase tracking-widest text-zinc-400 hover:text-white transition-all border border-zinc-900 bg-transparent rounded-2xl cursor-pointer"
                  >
                    Cancelar
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
