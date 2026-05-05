import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Trophy, Medal, Star, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

import { MOCK_LEADERBOARD } from '@/lib/mockData';

export default function Leaderboard() {
  const [profiles, setProfiles] = useState<Profile[]>(MOCK_LEADERBOARD);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setProfiles(MOCK_LEADERBOARD);
      setLoading(false);
    }, 500);
  }, []);

  async function fetchLeaderboard() {
    // No-op
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
          Ranking <span className="text-orange-500">Global</span>
        </h1>
        <p className="text-zinc-500 font-medium uppercase tracking-widest text-sm">
          Los mejores pronosticadores del mundo
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
        <div className="grid grid-cols-12 px-8 py-6 bg-zinc-800/50 border-bottom border-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 italic">
           <div className="col-span-1">#</div>
           <div className="col-span-7 md:col-span-8">Usuario</div>
           <div className="col-span-4 md:col-span-3 text-right">Puntos</div>
        </div>

        {loading ? (
          <div className="space-y-4 p-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-zinc-800 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {profiles.map((profile, index) => (
              <motion.div 
                key={profile.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-12 px-8 py-6 items-center hover:bg-zinc-800/30 transition-colors"
              >
                <div className="col-span-1 text-sm font-black italic">
                   {index === 0 && <Medal className="text-yellow-500" size={20} />}
                   {index === 1 && <Medal className="text-zinc-400" size={20} />}
                   {index === 2 && <Medal className="text-amber-700" size={20} />}
                   {index > 2 && <span className="text-zinc-600">{index + 1}</span>}
                </div>
                <div className="col-span-7 md:col-span-8 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={20} className="text-zinc-600" />
                    )}
                  </div>
                  <span className="font-bold text-white text-lg tracking-tight">
                    {profile.full_name || 'Usuario Anónimo'}
                  </span>
                </div>
                <div className="col-span-4 md:col-span-3 text-right">
                  <span className="text-2xl font-black text-orange-500 italic">
                    {profile.points} <span className="text-[10px] text-zinc-600 uppercase tracking-widest ml-1">pts</span>
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
