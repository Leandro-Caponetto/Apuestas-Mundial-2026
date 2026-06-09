import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile as ProfileType } from '@/types';
import { User, LogOut, Shield, Award, Settings, Camera, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { dbService } from '@/services/dbService';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Profile Edit states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande (máx 2MB)');
      return;
    }

    try {
      setIsUploading(true);
      const { url, error } = await dbService.uploadAvatar(user.id, file);
      
      if (error) {
        const errorLower = error.toLowerCase();
        if (errorLower.includes('bucket not found')) {
          toast.error('Configuración: Crea el bucket "avatars" en Supabase Storage y hazlo PÚBLICO.', { duration: 8000 });
        } else if (errorLower.includes('security policy') || errorLower.includes('row-level security') || errorLower.includes('rls')) {
          toast.error('Permisos: Ejecuta el SQL de RLS para el bucket "avatars" en tu panel de Supabase.', { duration: 10000 });
        } else {
          toast.error(`Error de Supabase: ${error}`);
        }
        return;
      }

      if (url) {
        const finalUrl = `${url}?t=${Date.now()}`;
        await dbService.updateProfile(user.id, { avatar_url: finalUrl });
        const updated = await dbService.getProfile(user.id);
        if (updated) setProfile(updated);
        toast.success('¡Foto de perfil actualizada!', { icon: '📸' });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    if (!usernameInput.trim()) {
      toast.error('El nombre de usuario es obligatorio');
      return;
    }
    
    const loadingToast = toast.loading('Actualizando perfil...');
    try {
      await dbService.updateProfile(user.id, { 
        username: usernameInput.trim(),
        full_name: fullNameInput.trim() || undefined
      });
      const updated = await dbService.getProfile(user.id);
      if (updated) setProfile(updated);
      setShowProfileModal(false);
      toast.success('Perfil actualizado correctamente', { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar el perfil', { id: loadingToast });
    }
  };

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
              {profile?.full_name || 'Sin nombre cargado'}
            </h1>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs italic">
              {profile?.username ? `@${profile.username}` : '@sin_usuario'}
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
            <button 
              onClick={() => {
                setUsernameInput(profile?.username || '');
                setFullNameInput(profile?.full_name || '');
                setShowProfileModal(true);
              }}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold uppercase italic tracking-widest transition-all flex items-center justify-center gap-3 border border-zinc-700/50 cursor-pointer"
            >
              <Settings size={18} /> Editar Perfil
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-transparent hover:bg-red-500/10 text-red-500 rounded-2xl font-bold uppercase italic tracking-widest transition-all flex items-center justify-center gap-3 border border-red-500/20 cursor-pointer"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Dynamic Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUploading && setShowProfileModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.1),transparent_70%)]" />
              
              <div className="relative z-10 space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Editar Perfil</h3>
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest italic">Personaliza tu identidad</p>
                </div>

                <div className="flex flex-col items-center gap-5">
                  <div className="relative group/avatar-modal">
                    <div className="w-24 h-24 rounded-[2rem] bg-orange-500/5 border-2 border-dashed border-orange-500/20 flex items-center justify-center text-orange-500 font-black italic overflow-hidden shadow-2xl group-hover:border-orange-500/40 transition-all">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-20">
                          <User size={28} />
                          <span className="text-[7px] font-black uppercase tracking-widest">SIN FOTO</span>
                        </div>
                      )}
                      
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar-modal:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        {isUploading ? (
                          <Loader2 size={24} className="text-white animate-spin" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                             <Camera size={20} className="text-white" />
                             <span className="text-[7px] font-bold text-white uppercase tracking-widest">CAMBIAR</span>
                          </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                      </label>
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-650 uppercase tracking-widest italic ml-3">Nombre de Usuario (@username)</label>
                      <input 
                        type="text"
                        placeholder="Nombre de Usuario"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-xs font-black italic tracking-widest text-white uppercase outline-none focus:border-orange-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-650 uppercase tracking-widest italic ml-3">Nombre Completo</label>
                      <input 
                        type="text"
                        placeholder="Tu Nombre"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-xs font-black italic tracking-widest text-white uppercase outline-none focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={isUploading || !usernameInput.trim()}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    GUARDAR CAMBIOS
                  </button>
                  <button 
                    onClick={() => setShowProfileModal(false)}
                    disabled={isUploading}
                    className="w-full py-3 text-zinc-600 hover:text-zinc-400 font-black uppercase italic tracking-widest text-[9px] transition-colors cursor-pointer"
                  >
                    CANCELAR
                  </button>
                </div>
              </div>

              <button 
                onClick={() => !isUploading && setShowProfileModal(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
