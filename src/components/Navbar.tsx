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
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-fit bg-zinc-950/95 backdrop-blur-2xl border border-zinc-850 p-1 rounded-full z-50 flex items-center justify-between gap-1 shadow-[0_15px_35px_rgba(0,0,0,0.7)] md:bottom-auto md:top-6 md:h-fit md:p-2">
      <div className="flex items-center gap-0.5 md:gap-1 px-1 overflow-x-auto no-scrollbar scroll-smooth">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 md:px-5 md:py-3 lg:px-6 rounded-full text-[9px] md:text-[10px] font-black tracking-[0.12em] md:tracking-[0.2em] uppercase italic transition-all duration-300 shrink-0 ${
              location.pathname === item.href
                ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <item.icon size={14} strokeWidth={3} className="shrink-0 md:size-4" />
            <span className="hidden sm:inline">{item.name}</span>
          </Link>
        ))}
      </div>
      
      {user && (
        <>
          <div className="w-[1px] h-5 bg-zinc-800/80 mx-1 md:h-7 md:mx-2 shrink-0" />
          <Link
            to="/profile"
            className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/60 rounded-full transition-all group shrink-0 md:pl-1.5 md:pr-4 md:py-1.5"
          >
            <div className="w-7 h-7 rounded-full bg-zinc-950 border-2 border-orange-500/0 group-hover:border-orange-500/50 overflow-hidden flex items-center justify-center transition-all md:w-9 md:h-9">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={12} className="text-zinc-500 md:size-4" />
              )}
            </div>
            <span className="text-white text-[9px] md:text-xs font-black uppercase italic tracking-tighter leading-none pr-1 hidden min-with-350:block min-[380px]:inline-block">
              {profile?.points || 0} <span className="text-[7.5px] md:text-[10px] text-orange-500">PTS</span>
            </span>
          </Link>
        </>
      )}
    </nav>
  );
}
