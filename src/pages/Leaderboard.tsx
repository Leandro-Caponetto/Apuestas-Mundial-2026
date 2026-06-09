import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Trophy, Medal, Star, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { dbService } from '@/services/dbService';

export default function Leaderboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await dbService.getRanking();
        setProfiles(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest italic">
          <Medal size={12} /> COMPETENCIA GLOBAL 2026
        </div>
        <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none">
          Salón de <br /> la <span className="text-orange-500 text-glow">Gloria</span>
        </h1>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] italic">
          Los mejores pronosticadores del mundo
        </p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-10 py-6 bg-zinc-950/50 border-b border-zinc-800 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 italic">
           <div className="col-span-1">POS</div>
           <div className="col-span-7 md:col-span-8">JUGADOR</div>
           <div className="col-span-4 md:col-span-3 text-right">PUNTAJE</div>
        </div>

        {loading ? (
          <div className="space-y-4 p-10">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-zinc-950/50 animate-pulse rounded-2xl border border-zinc-900" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/20">
            {profiles.map((profile, index) => (
              <motion.div 
                key={profile.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="grid grid-cols-12 px-10 py-8 items-center hover:bg-white/[0.02] transition-all group"
              >
                <div className="col-span-1">
                   {index === 0 && <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-300 to-amber-600 flex items-center justify-center text-black shadow-[0_0_20px_rgba(251,191,36,0.3)]"><Trophy size={16} /></div>}
                   {index === 1 && <div className="w-8 h-8 rounded-lg bg-linear-to-br from-zinc-300 to-zinc-500 flex items-center justify-center text-black"><Trophy size={16} /></div>}
                   {index === 2 && <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-700 to-amber-900 flex items-center justify-center text-white"><Trophy size={16} /></div>}
                   {index > 2 && <span className="text-zinc-600 font-black italic text-xl ml-1">#{index + 1}</span>}
                </div>
                <div className="col-span-7 md:col-span-8 flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 p-0.5 overflow-hidden flex items-center justify-center group-hover:border-orange-500/50 transition-colors shadow-2xl">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.username} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-xl" 
                      />
                    ) : (
                      <UserIcon size={24} className="text-zinc-800" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-white text-xl md:text-2xl uppercase italic tracking-tighter leading-none group-hover:text-orange-500 transition-colors">
                      {profile.username || 'Usuario Nuevo'}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">NIVEL PROIN</span>
                  </div>
                </div>
                <div className="col-span-4 md:col-span-3 text-right">
                  <div className="inline-flex flex-col items-end">
                    <span className="text-3xl md:text-4xl font-black text-white italic leading-none">
                      {profile.points}
                    </span>
                    <span className="text-[9px] text-orange-500 font-black uppercase tracking-[0.3em] mt-1">PUNTOS TOTALES</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
