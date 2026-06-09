import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Trophy, Home, User as UserIcon, Settings, LogOut, LayoutDashboard, ListOrdered, CheckSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Profile } from '@/types';
import { dbService } from '@/services/dbService';

export function Navbar() {
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        dbService.getProfile(session.user.id).then(setProfile);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        dbService.getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    // Subscripción a cambios en el perfil
    let profileSubscription: any = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        profileSubscription = supabase
          .channel(`profile:${session.user.id}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
          }, (payload) => {
            setProfile(payload.new as Profile);
          })
          .subscribe();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) supabase.removeChannel(profileSubscription);
    };
  }, []);

  const navItems = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'PRODE', href: '/betting', icon: CheckSquare },
    { name: 'Ranking', href: '/leaderboard', icon: ListOrdered },
    { name: 'Liga', href: '/leagues', icon: Trophy },
    ...(user?.email === 'caponettopeppers@gmail.com' ? [{ name: 'Admin', href: '/admin', icon: Settings }] : []),
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800 p-2 rounded-full z-50 flex items-center gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:top-6 md:bottom-auto md:h-fit">
      <div className="flex items-center gap-1 px-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black tracking-[0.2em] uppercase italic transition-all duration-300 ${
              location.pathname === item.href
                ? 'bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <item.icon size={16} strokeWidth={3} />
            <span className="hidden md:inline">{item.name}</span>
          </Link>
        ))}
      </div>
      
      {user && (
        <>
          <div className="w-[1px] h-6 bg-zinc-800 mx-2" />
          <Link
            to="/profile"
            className="flex items-center gap-3 pl-1.5 pr-6 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-full transition-all group lg:min-w-[120px]"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-orange-500/0 group-hover:border-orange-500/50 overflow-hidden flex items-center justify-center transition-all">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={18} className="text-zinc-500" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-white text-xs font-black uppercase italic tracking-tighter leading-none">
                {profile?.points || 0} <span className="text-[10px] text-orange-500">PTS</span>
              </span>
            </div>
          </Link>
        </>
      )}
    </nav>
  );
}
