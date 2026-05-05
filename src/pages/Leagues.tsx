import { useState } from 'react';
import { Trophy, Plus, Users, ShieldCheck, Share2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Leagues() {
  const [leagues] = useState([
    { id: '1', name: 'Oficina Central', members: 12, rank: 3 },
    { id: '2', name: 'Los Galácticos', members: 5, rank: 1 },
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right duration-700">
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
          <button className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-bold uppercase italic tracking-tighter flex items-center gap-2 hover:bg-zinc-800 transition-all">
            <Plus size={18} /> Unirse
          </button>
          <button className="px-6 py-3 bg-orange-500 text-black rounded-2xl font-bold uppercase italic tracking-tighter flex items-center gap-2 hover:bg-orange-400 transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)]">
            <Plus size={18} /> Crear Liga
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {leagues.map((league) => (
          <motion.div 
            key={league.id}
            whileHover={{ y: -4 }}
            className="p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] space-y-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Trophy size={120} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{league.name}</h3>
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500 italic">
                <span className="flex items-center gap-1"><Users size={12} /> {league.members} Integrantes</span>
                <span className="flex items-center gap-1 text-orange-500"><Trophy size={12} /> Rank #{league.rank}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold uppercase italic tracking-widest text-[10px] transition-all border border-zinc-700/50">
                Ver Tabla
              </button>
              <button className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-zinc-700/50">
                <Share2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-12 text-center bg-zinc-900/30 rounded-[3rem] border border-dashed border-zinc-800 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600 mb-2">
           <Trophy size={32} />
        </div>
        <h4 className="text-xl font-black text-zinc-400 uppercase italic">¿Aún no tienes equipo?</h4>
        <p className="text-zinc-600 max-w-sm text-sm">
          Crea una liga personalizada y comparte el código de invitación con tus amigos para ver quién sabe más de fútbol.
        </p>
      </div>
    </div>
  );
}
