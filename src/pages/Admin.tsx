import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Match, Team } from '@/types';
import { toast } from 'react-hot-toast';
import { ShieldAlert, Database, Plus } from 'lucide-react';
import { ResolveMatchModal } from '@/components/ResolveMatchModal';

export default function Admin() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveModalMatch, setResolveModalMatch] = useState<Match | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: matchesData } = await supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').order('start_at');
    const { data: teamsData } = await supabase.from('teams').select('*');
    setMatches(matchesData || []);
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem]">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
               <ShieldAlert size={32} />
            </div>
            <div>
               <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Panel Admin</h1>
               <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] italic mt-1 font-mono">Restricted Access</p>
            </div>
         </div>
         <div className="flex gap-2">
            <button className="px-4 py-2 bg-zinc-800 text-xs font-bold uppercase italic text-zinc-400 rounded-xl hover:text-white transition-colors">Backup DB</button>
            <button className="px-4 py-2 bg-zinc-800 text-xs font-bold uppercase italic text-zinc-400 rounded-xl hover:text-white transition-colors">Logs</button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                 <Database className="text-orange-500" size={18} /> Gestionar Partidos
              </h2>
              <button className="text-xs font-black text-orange-500 uppercase italic p-2 rounded-lg hover:bg-orange-500/10 transition-colors">
                + Crear Partido
              </button>
           </div>

           <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden">
             <div className="divide-y divide-zinc-800/50">
               {matches.map((match) => (
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
                    </div>
                 </div>
               ))}
             </div>
           </div>
        </div>

        <div className="space-y-6">
           <h2 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-2">
              <Plus className="text-orange-500" size={18} /> Equipos ({teams.length})
           </h2>
           <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {teams.map(team => (
                <div key={team.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                   <div className="w-8 h-6 bg-black rounded flex items-center justify-center overflow-hidden">
                      <img src={team.flag_url} className="w-full h-full object-cover" />
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
    </div>
  );
}
