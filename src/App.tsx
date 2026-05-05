/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
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

  useEffect(() => {
    // Demo Mode: Simulate a session
    setSession({ user: { id: 'u1', email: 'demo@example.com' } });
    setLoading(false);
  }, []);

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
