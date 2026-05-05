import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Trophy, Home, User, Settings, LogOut, LayoutDashboard, ListOrdered, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Profile } from '@/types';

import { MOCK_USER } from '@/lib/mockData';

export function Navbar() {
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(MOCK_USER);

  useEffect(() => {
    // Simulating user data
    setProfile(MOCK_USER);
  }, []);

  async function fetchProfile() {
    // No-op
  }

  const navItems = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'Apuestas', href: '/betting', icon: DollarSign },
    { name: 'Ranking', href: '/leaderboard', icon: ListOrdered },
    { name: 'Liga Privada', href: '/leagues', icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-2 rounded-full z-50 flex items-center gap-1 shadow-2xl md:top-6 md:bottom-auto">
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold tracking-tighter uppercase italic transition-all ${
            location.pathname === item.href
              ? 'bg-orange-500 text-black'
              : 'text-zinc-500 hover:text-white'
          }`}
        >
          <item.icon size={18} />
          <span className="hidden md:inline">{item.name}</span>
        </Link>
      ))}
      <div className="w-[1px] h-6 bg-zinc-800 mx-1" />
      <Link
        to="/profile"
        className="flex items-center gap-2 pl-2 pr-4 py-2 rounded-full hover:bg-zinc-800 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" />
          ) : (
            <User size={16} className="text-zinc-500" />
          )}
        </div>
        <span className="text-white text-xs font-black uppercase italic hidden md:inline">
          {profile?.points || 0} PTS
        </span>
      </Link>
    </nav>
  );
}
