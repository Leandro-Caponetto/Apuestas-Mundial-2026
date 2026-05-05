import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer: React.FC = () => {
  const calculateTimeLeft = (): TimeLeft => {
    const targetDate = new Date('2026-06-11T00:00:00').getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const TimeUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <motion.div 
        className="bg-orange-500 text-black px-4 py-2 rounded-xl text-3xl font-black italic shadow-lg shadow-orange-500/20"
      >
        {value.toString().padStart(2, '0')}
      </motion.div>
      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-2">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-4">
      <div className="hidden md:block mr-2">
        <p className="text-white/20 font-black uppercase italic tracking-widest text-xs">La acción comienza en:</p>
      </div>
      <div className="flex items-center gap-3">
        <TimeUnit value={timeLeft.days} label="Días" />
        <span className="text-2xl font-black text-orange-500 mb-6">:</span>
        <TimeUnit value={timeLeft.hours} label="Horas" />
        <span className="text-2xl font-black text-orange-500 mb-6">:</span>
        <TimeUnit value={timeLeft.minutes} label="Minutos" />
        <span className="text-2xl font-black text-orange-500 mb-6 hidden sm:inline">:</span>
        <div className="hidden sm:block">
          <TimeUnit value={timeLeft.seconds} label="Segundos" />
        </div>
      </div>
    </div>
  );
};
