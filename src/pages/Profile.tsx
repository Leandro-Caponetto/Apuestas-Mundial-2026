import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile as ProfileType } from '@/types';
import { User, LogOut, Shield, Award, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { dbService } from '@/services/dbService';

import { MOCK_USER } from '@/lib/mockData';

export default function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        dbService.getProfile(session.user.id).then((p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-orange-500 to-transparent" />
        
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-zinc-800 border-4 border-zinc-900 shadow-[0_0_40px_rgba(249,115,22,0.1)] overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-zinc-700" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-orange-500 text-black p-2 rounded-full border-4 border-zinc-900">
              <Award size={20} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
              {profile?.full_name || 'Sin nombre'}
            </h1>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs italic">
              {profile?.username ? `@${profile.username}` : 'Participante Mundial 2026'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-6">
            <div className="p-6 bg-zinc-800/50 rounded-3xl border border-zinc-800 text-center space-y-1">
              <span className="block text-3xl font-black text-orange-500 italic">{profile?.points || 0}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black italic">Puntos Totales</span>
            </div>
            <div className="p-6 bg-zinc-800/50 rounded-3xl border border-zinc-800 text-center space-y-1">
              <span className="block text-3xl font-black text-white italic">#1,234</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black italic">Ranking Global</span>
            </div>
          </div>

          <div className="w-full space-y-3 mt-8">
            <button className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold uppercase italic tracking-widest transition-all flex items-center justify-center gap-3 border border-zinc-700/50">
              <Settings size={18} /> Editar Perfil
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-transparent hover:bg-red-500/10 text-red-500 rounded-2xl font-bold uppercase italic tracking-widest transition-all flex items-center justify-center gap-3 border border-red-500/20"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
