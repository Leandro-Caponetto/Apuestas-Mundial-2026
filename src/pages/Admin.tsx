import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Match, Team } from '@/types';
import { toast } from 'react-hot-toast';
import { ShieldAlert, Database, Plus, Trash2, Edit2 } from 'lucide-react';
import { ResolveMatchModal } from '@/components/ResolveMatchModal';
import { CreateMatchModal } from '@/components/CreateMatchModal';
import { EditMatchModal } from '@/components/EditMatchModal';

export default function Admin() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveModalMatch, setResolveModalMatch] = useState<Match | null>(null);
  const [editModalMatch, setEditModalMatch] = useState<Match | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email;
      if (email === 'caponettopeppers@gmail.com') {
        setIsAdminUser(true);
        fetchData();
      } else {
        setIsAdminUser(false);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email;
      if (email === 'caponettopeppers@gmail.com') {
        setIsAdminUser(true);
      } else {
        setIsAdminUser(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchData() {
    const { data: matchesData } = await supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').order('start_at');
    const { data: teamsData } = await supabase.from('teams').select('*');
    
    // Filter duplicates: keeping unique by home_team_id + away_team_id + normalized start_at date
    const uniqueMatches: any[] = [];
    const seen = new Set<string>();
    (matchesData || []).forEach((m: any) => {
      const normDate = m.start_at ? new Date(m.start_at).toISOString().split('.')[0] + 'Z' : '';
      const key = `${m.home_team_id}_${m.away_team_id}_${normDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push(m);
      }
    });

    setMatches(uniqueMatches);
    setTeams(teamsData || []);
    setLoading(false);
  }

  async function resolveMatch(matchId: string, homeScore: number, awayScore: number) {
    try {
      const response = await fetch('/api/admin/resolve-match', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL || '',
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({ matchId, homeScore, awayScore }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Partido resuelto y puntos asignados');
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  }

  async function handleCreateMatch(data: {
    home_team_id: string;
    away_team_id: string;
    start_at: string;
    phase: string;
    group_name: string;
  }) {
    try {
      const response = await fetch('/api/admin/create-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL || '',
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success('¡Partido nuevo guardado con éxito!');
        fetchData();
      } else {
        throw new Error(resData.error || 'No se pudo crear el partido');
      }
    } catch (err: any) {
      toast.error('Error al crear el partido: ' + err.message);
    }
  }

  async function handleEditMatch(data: {
    matchId: string;
    home_team_id: string;
    away_team_id: string;
    start_at: string;
    phase: string;
    group_name: string;
    status?: string;
  }) {
    try {
      const response = await fetch('/api/admin/update-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL || '',
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success('¡Partido actualizado con éxito!');
        fetchData();
      } else {
        throw new Error(resData.error || 'No se pudo actualizar el partido');
      }
    } catch (err: any) {
      toast.error('Error al actualizar el partido: ' + err.message);
    }
  }

  async function handleDeleteMatch(matchId: string) {
    const isConfirmed = window.confirm('¿Seguro de que deseas eliminar este partido? Esta acción removerá también cualquier predicción existente de los usuarios para el mismo.');
    if (!isConfirmed) return;

    try {
      const response = await fetch('/api/admin/delete-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL || '',
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({ matchId }),
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success('Partido eliminado correctamente');
        fetchData();
      } else {
        throw new Error(resData.error || 'No se pudo eliminar el partido');
      }
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
    }
  }

  async function handleResetFixtures() {
    const isConfirmed = window.confirm('¿Seguro de que deseas restablecer el calendario oficial del Mundial de 2026 (EE.UU., México, Canadá)? Esto eliminará todos los partidos actuales y sus predicciones, instalando los 72 partidos de la fase de grupos oficiales.');
    if (!isConfirmed) return;

    try {
      const response = await fetch('/api/admin/reset-fixtures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const resData = await response.json();
      if (resData.success) {
        toast.success(`¡Base de datos restablecida con ${resData.count} partidos oficiales!`);
        fetchData();
      } else {
        throw new Error(resData.error || 'No se pudo restablecer el fixture');
      }
    } catch (err: any) {
      toast.error('Error al restablecer: ' + err.message);
    }
  }

  if (isAdminUser === null || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-500 font-black uppercase italic tracking-widest text-xs">Cargando Panel...</p>
      </div>
    );
  }

  if (isAdminUser === false) {
    return (
      <div className="max-w-md mx-auto text-center p-12 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] mt-12 space-y-6">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto text-xl">
          ⚠️
        </div>
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-white animate-pulse">Acceso Restringido</h2>
        <p className="text-zinc-500 text-sm font-bold uppercase italic tracking-wider leading-relaxed">
          Este panel de control es exclusivo de administradores. Por favor, inicia sesión con la cuenta de administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem]">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
               <ShieldAlert size={32} />
            </div>
            <div>
               <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Panel Admin</h1>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] italic mt-1 font-mono">Acceso de Administrador</p>
            </div>
         </div>
         <div className="flex gap-2">
            <button className="px-4 py-2 bg-zinc-800 text-xs font-bold uppercase italic text-zinc-400 rounded-xl hover:text-white transition-colors">Resguardo</button>
            <button className="px-4 py-2 bg-zinc-800 text-xs font-bold uppercase italic text-zinc-400 rounded-xl hover:text-white transition-colors">Registros</button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                 <Database className="text-orange-500" size={18} /> Gestionar Partidos
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleResetFixtures}
                  className="text-[10px] font-black text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 uppercase italic py-2 px-3 rounded-lg transition-colors cursor-pointer"
                  title="Restablece los fixtures correctos del mundial"
                >
                  🔄 Resetear Fixtures
                </button>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-xs font-black text-orange-500 uppercase italic p-2 rounded-lg hover:bg-orange-500/10 transition-colors cursor-pointer"
                >
                  + Crear Partido
                </button>
              </div>
           </div>

           <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden">
             <div className="divide-y divide-zinc-800/50">
               {matches.length === 0 ? (
                 <p className="p-8 text-center text-zinc-500 font-bold uppercase tracking-wide text-xs">No hay partidos cargados</p>
               ) : (
                 matches.map((match) => (
                   <div key={match.id} className="p-6 flex items-center justify-between gap-6 hover:bg-zinc-800/20 transition-colors">
                      <div className="flex-1 flex items-center gap-4">
                         <span className="text-zinc-500 font-mono text-[10px] w-6">{match.status === 'finished' ? '✅' : '⏳'}</span>
                         <div className="flex flex-col">
                            <span className="font-bold text-white text-sm tracking-tight">{match.home_team?.name} vs {match.away_team?.name}</span>
                            <span className="text-[10px] text-zinc-600 uppercase font-black italic">{new Date(match.start_at).toLocaleString()}</span>
                         </div>
                      </div>

                      <div className="flex items-center gap-2">
                         {match.status === 'finished' ? (
                            <div className="px-4 py-2 bg-zinc-800 rounded-xl border border-zinc-700 text-white font-black italic">
                              {match.home_score} - {match.away_score}
                            </div>
                         ) : (
                            <button 
                              onClick={() => setResolveModalMatch(match)}
                              className="px-4 py-2 bg-orange-500 text-black text-xs font-black uppercase italic rounded-xl hover:bg-orange-400 transition-all cursor-pointer"
                            >
                              Finalizar
                            </button>
                         )}

                         <button
                           onClick={() => handleDeleteMatch(match.id)}
                           className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                           title="Eliminar partido para siempre"
                         >
                           <Trash2 size={16} />
                          </button>

                          <button
                            onClick={() => setEditModalMatch(match)}
                            className="p-2 text-zinc-600 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all cursor-pointer"
                            title="Editar detalles del partido"
                          >
                            <Edit2 size={16} />
                         </button>
                      </div>
                   </div>
                 ))
               )}
             </div>
           </div>
        </div>

        <div className="space-y-6">
           <h2 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-2">
              <Plus className="text-orange-500" size={18} /> Equipos ({teams.length})
           </h2>
           <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 space-y-4 max-h-[600px] overflow-y-auto font-sans">
              {teams.map(team => (
                <div key={team.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                   <div className="w-8 h-6 bg-black rounded flex items-center justify-center overflow-hidden">
                      {team.flag_url ? (
                        <img src={team.flag_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-[10px] font-black">{team.code}</div>
                      )}
                   </div>
                   <span className="text-xs font-bold text-white uppercase italic tracking-tighter">{team.name}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <ResolveMatchModal 
        isOpen={!!resolveModalMatch}
        onClose={() => setResolveModalMatch(null)}
        onConfirm={(homeScore, awayScore) => {
          if (resolveModalMatch) {
            resolveMatch(resolveModalMatch.id, homeScore, awayScore);
          }
        }}
        match={resolveModalMatch}
      />

      <CreateMatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateMatch}
        teams={teams}
      />

      <EditMatchModal
        isOpen={!!editModalMatch}
        onClose={() => setEditModalMatch(null)}
        onConfirm={handleEditMatch}
        match={editModalMatch}
        teams={teams}
      />
    </div>
  );
}
