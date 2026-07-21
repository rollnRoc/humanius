import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DemoBanner() {
  const { isDemo, signOut } = useAuth();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!isDemo) return;

    const startTime = parseInt(localStorage.getItem('humanius_demo_start_time') || '0', 10);
    if (!startTime) return;

    const updateTimer = () => {
      const duration = 2 * 24 * 60 * 60 * 1000; // 48 saat
      const elapsed = Date.now() - startTime;
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
        // Otomatik temizleme yapalım ve ekranı kilitleyelim
        localStorage.setItem('humanius_demo_mode', 'false');
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  if (!isDemo) return null;

  // Zamanı formatla
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  if (isExpired) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-cyan-100 transform scale-100 transition-all duration-300">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 text-red-500 rounded-2xl mb-4 shadow-sm animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Demo Süreniz Doldu</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Humanius HRM demo sürümü için ayrılan 48 saatlik süreniz sona ermiştir. Oluşturduğunuz test verileri güvenlik gereği silinmiştir.
          </p>
          <div className="space-y-3">
            <a
              href="mailto:destek@humanius.com.tr?subject=Humanius%20Full%20Sürüm%20Hakkında"
              className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:shadow-lg text-white py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              Satış Ekibiyle İletişime Geç
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => signOut()}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-medium text-sm transition-all"
            >
              Giriş Ekranına Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-900 text-white px-6 py-2.5 flex items-center justify-between shadow-md border-b border-cyan-800/30 text-xs sm:text-sm font-medium z-[40]">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <span className="flex-shrink-0 inline-flex items-center justify-center bg-cyan-500/20 text-cyan-400 p-1.5 rounded-lg border border-cyan-500/30">
          <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
        </span>
        <p className="truncate text-slate-300 leading-tight">
          <span className="font-bold text-white">✨ Humanius Demo Modu:</span> Tüm özellikler açık, verileriniz tarayıcınızda saklanıyor.
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
        <div className="bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 font-mono text-cyan-400 shadow-inner">
          Kalan Süre: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>
        
        <button
          onClick={() => signOut()}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 font-semibold text-xs shadow-sm cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Demoyu Sonlandır
        </button>
      </div>
    </div>
  );
}
