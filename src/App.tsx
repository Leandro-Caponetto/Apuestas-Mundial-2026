/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { Settings } from 'lucide-react';
import Home from '@/pages/Home';
import Leaderboard from '@/pages/Leaderboard';
import Auth from '@/pages/Auth';
import Profile from '@/pages/Profile';
import Leagues from '@/pages/Leagues';
import Admin from '@/pages/Admin';
import { BettingZone } from '@/components/BettingZone';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [missingKeys, setMissingKeys] = useState(false);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      setMissingKeys(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (missingKeys) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 p-10 rounded-[3rem] text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.1),transparent_70%)]" />
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto text-red-500 animate-pulse">
            <Settings size={40} />
          </div>
          <div className="space-y-2 relative z-10">
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Faltan Credenciales</h1>
            <p className="text-zinc-500 text-sm font-bold uppercase italic tracking-widest leading-relaxed">
              Ve a <span className="text-white">SETTINGS</span> y añade <br/>
              <code className="text-red-400 block mt-2 text-[10px] bg-red-500/5 py-2 rounded-lg">VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code>
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-white text-black font-black uppercase italic tracking-widest text-xs rounded-2xl hover:bg-zinc-200 transition-all relative z-10"
          >
            REINTENTAR CONEXIÓN
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-black uppercase italic tracking-widest animate-pulse text-xs">Conectando con el Mundial...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-orange-500 selection:text-black">
        <Toaster position="top-center" toastOptions={{
          style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #27272a',
            borderRadius: '1rem',
            fontStyle: 'italic',
            fontWeight: 'bold',
          }
        }} />
        
        {session && <Navbar />}

        <main className="max-w-7xl mx-auto px-6 pb-32 pt-6 md:pt-24">
          <Routes>
            <Route path="/" element={session ? <Home /> : <Navigate to="/auth" />} />
            <Route path="/leaderboard" element={session ? <Leaderboard /> : <Navigate to="/auth" />} />
            <Route path="/profile" element={session ? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/leagues" element={session ? <Leagues /> : <Navigate to="/auth" />} />
            <Route path="/admin" element={session ? <Admin /> : <Navigate to="/auth" />} />
            <Route path="/betting" element={session ? <BettingZone /> : <Navigate to="/auth" />} />
            <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
