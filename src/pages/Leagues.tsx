import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Users, ShieldCheck, Share2, Search, X, Loader2, Copy, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '@/services/dbService';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function Leagues() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form states
  const [leagueName, setLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete state
  const [leagueToDelete, setLeagueToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ranking state
  const [selectedLeague, setSelectedLeague] = useState<any>(null);
  const [leagueRanking, setLeagueRanking] = useState<any[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchLeagues(user.id);
      }
    };
    init();
  }, []);

  const fetchLeagues = async (userId: string) => {
    setLoading(true);
    try {
      const data = await dbService.getLeagues(userId);
      setLeagues(data);
    } catch (error) {
      console.error('Error fetching leagues:', error);
      toast.error('Error al cargar ligas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!leagueName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setIsCreating(true);
    try {
      await dbService.createLeague(user.id, leagueName);
      toast.success('¡Liga creada con éxito!');
      setIsCreateModalOpen(false);
      setLeagueName('');
      fetchLeagues(user.id);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!inviteCode.trim()) {
      toast.error('El código es obligatorio');
      return;
    }

    setIsJoining(true);
    try {
      await dbService.joinLeague(user.id, inviteCode);
      toast.success('¡Te has unido a la liga!');
      setIsJoinModalOpen(false);
      setInviteCode('');
      fetchLeagues(user.id);
    } catch (error: any) {
      toast.error(error.message || 'Error al unirse a la liga');
    } finally {
      setIsJoining(false);
    }
  };

  const handleDeleteLeague = async (e: React.MouseEvent, leagueId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLeagueToDelete(leagueId);
  };

  const confirmDeleteLeague = async () => {
    if (!leagueToDelete) return;
    
    setIsDeleting(true);
    try {
      await dbService.deleteLeague(leagueToDelete);
      toast.success('Liga eliminada correctamente');
      setLeagueToDelete(null);
      if (user) fetchLeagues(user.id);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Error al eliminar la liga: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Código copiado: ' + code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewRanking = async (league: any) => {
    setSelectedLeague(league);
    setLoadingRanking(true);
    try {
      const data = await dbService.getLeagueRanking(league.id);
      setLeagueRanking(data);
    } catch (error) {
      console.error('Error fetching league ranking:', error);
      toast.error('Error al cargar ranking de la liga');
    } finally {
      setLoadingRanking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white leading-none">
            Ligas <span className="text-orange-500">Privadas</span>
          </h1>
          <p className="text-zinc-500 font-medium uppercase tracking-widest text-sm">
            Compite contra tus amigos y compañeros
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsJoinModalOpen(true)}
            className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-bold uppercase italic tracking-tighter flex items-center gap-2 hover:bg-zinc-800 transition-all"
          >
            <Users size={18} /> Unirse
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-orange-500 text-black rounded-2xl font-bold uppercase italic tracking-tighter flex items-center gap-2 hover:bg-orange-400 transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)]"
          >
            <Plus size={18} /> Crear Liga
          </button>
        </div>
      </div>

      {/* Leagues Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] animate-pulse" />
          ))}
        </div>
      ) : leagues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {leagues.map((league) => (
            <motion.div 
              key={league.id}
              whileHover={{ y: -4 }}
              className="p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] space-y-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                 <Trophy size={120} />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{league.name}</h3>
                  <div className="flex items-center gap-2">
                    {league.created_by === user?.id && (
                      <>
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-500 text-[8px] font-bold rounded-lg border border-orange-500/20">OWNER</span>
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteLeague(e, league.id)}
                          className="relative z-20 p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all"
                          title="Eliminar Liga"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500 italic">
                  <span className="flex items-center gap-1"><Users size={12} /> {league.members || 0} Integrantes</span>
                  <span className="flex items-center gap-1 text-orange-500"><Trophy size={12} /> Código: {league.invite_code}</span>
                </div>
              </div>

              <div className="flex gap-2 relative z-10">
                <button 
                  onClick={() => handleViewRanking(league)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold uppercase italic tracking-widest text-[10px] transition-all border border-zinc-700/50"
                >
                  Ver Tabla / Ranking
                </button>
                <button 
                  onClick={() => copyToClipboard(league.invite_code, league.id)}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-zinc-700/50 flex items-center justify-center"
                >
                  {copiedId === league.id ? <Check size={16} className="text-orange-500" /> : <Share2 size={16} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-zinc-900/30 rounded-[3rem] border border-dashed border-zinc-800 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600 mb-2">
             <Trophy size={32} />
          </div>
          <h4 className="text-xl font-black text-zinc-400 uppercase italic">¿Aún no tienes equipo?</h4>
          <p className="text-zinc-600 max-w-sm text-sm">
            Crea una liga personalizada y comparte el código de invitación con tus amigos para ver quién sabe más de fútbol.
          </p>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {leagueToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLeagueToDelete(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 size={40} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">¿Eliminar Liga?</h3>
                <p className="text-zinc-500 text-sm font-medium">
                  Esta acción es permanente y eliminará todos los miembros y datos de la liga. No se puede deshacer.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={confirmDeleteLeague}
                  disabled={isDeleting}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase italic tracking-widest text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={16} /> : 'SÍ, ELIMINAR LIGA'}
                </button>
                <button 
                  onClick={() => setLeagueToDelete(null)}
                  disabled={isDeleting}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase italic tracking-widest text-xs rounded-2xl transition-all"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedLeague && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLeague(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">{selectedLeague.name}</h3>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] italic">Ranking de la Liga</p>
                </div>
                <button onClick={() => setSelectedLeague(null)} className="text-zinc-500 hover:text-white bg-zinc-800 p-2 rounded-xl">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {loadingRanking ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-orange-500" size={40} />
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Cargando posiciones...</p>
                  </div>
                ) : leagueRanking.length > 0 ? (
                  <div className="space-y-3">
                    {leagueRanking.map((profile, idx) => (
                      <div 
                        key={profile.id}
                        className={`p-4 rounded-2xl flex items-center justify-between border ${profile.id === user?.id ? 'bg-orange-500/5 border-orange-500/20' : 'bg-black/20 border-zinc-800'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic ${idx === 0 ? 'bg-orange-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                            #{idx + 1}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                              {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  <Users size={16} />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-white uppercase italic tracking-tighter">
                                {profile.username || 'USUARIO'}
                                {profile.id === user?.id && <span className="ml-2 text-[8px] text-orange-500">(TÚ)</span>}
                              </span>
                              <span className="text-[10px] font-bold text-zinc-500 uppercase italic">Participante</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-white italic tracking-tighter">{profile.points || 0}</div>
                          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">PUNTOS</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-zinc-500 italic">No hay miembros en esta liga</div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-zinc-800 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-500 uppercase italic tracking-widest">Invita a otros</span>
                  <span className="text-lg font-black text-white italic uppercase tracking-tighter">{selectedLeague.invite_code}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(selectedLeague.invite_code, selectedLeague.id)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold uppercase italic tracking-widest text-[10px] transition-all border border-zinc-700 flex items-center gap-2"
                >
                   <Share2 size={14} /> Compartir Código
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleCreateLeague} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Crear Nueva Liga</h3>
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-zinc-500 hover:text-white">
                    <X size={24} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Nombre de la Liga</label>
                  <input 
                    type="text"
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    placeholder="Ej. Los Amigos del Fútbol"
                    className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-4 px-6 text-white outline-none focus:border-orange-500 transition-all font-bold placeholder:text-zinc-700"
                    autoFocus
                  />
                </div>
                <button 
                  disabled={isCreating}
                  className="w-full py-4 bg-orange-500 text-black font-black uppercase italic tracking-widest text-xs rounded-2xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={16} /> : 'CONFIRMAR CREACIÓN'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleJoinLeague} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Unirse a Liga</h3>
                  <button type="button" onClick={() => setIsJoinModalOpen(false)} className="text-zinc-500 hover:text-white">
                    <X size={24} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Código de Invitación</label>
                  <input 
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Ej. ABCD12"
                    className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-4 px-6 text-white outline-none focus:border-orange-500 transition-all font-bold placeholder:text-zinc-700 uppercase"
                    autoFocus
                  />
                </div>
                <button 
                  disabled={isJoining}
                  className="w-full py-4 bg-white text-black font-black uppercase italic tracking-widest text-xs rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                >
                  {isJoining ? <Loader2 className="animate-spin" size={16} /> : 'UNIRSE AHORA'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
