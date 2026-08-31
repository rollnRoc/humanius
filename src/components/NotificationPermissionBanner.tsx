import React, { useState, useEffect } from 'react';
import { Bell, BellRing, X, CheckCircle2 } from 'lucide-react';
import { notificationService } from '../services/notificationService';

export const NotificationPermissionBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!notificationService.isSupported()) return;

    const isDismissed = sessionStorage.getItem('humanius_notif_banner_dismissed') === 'true';
    const permission = notificationService.getPermission();

    if (permission === 'default' && !isDismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const result = await notificationService.requestPermission();
      if (result === 'granted') {
        setIsSuccess(true);
        await notificationService.sendTestNotification();
        setTimeout(() => {
          setShowBanner(false);
        }, 3000);
      } else {
        setShowBanner(false);
      }
    } catch (e) {
      console.error('Error enabling notifications:', e);
      setShowBanner(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('humanius_notif_banner_dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <aside aria-label="Bildirim İzni" className="relative z-40 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-4 py-2.5 shadow-md border-b border-indigo-700/50 animate-in fade-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <BellRing className="w-4 h-4 text-indigo-300 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">
              {isSuccess ? 'Bildirimler Başarıyla Etkinleştirildi!' : 'PDKS & Mesai Bildirimlerini Etkinleştirin'}
            </p>
            <p className="text-[11px] text-indigo-200 mt-0.5 leading-tight">
              {isSuccess
                ? 'Artık mesai başlangıç ve geç kalma tolerans bildirimleri doğrudan cihazınıza gelecektir.'
                : 'Mesai başlangıç saatinde, geç kalma tolerans süresinde ve çıkışta anlık kilit ekranı uyarısı alın.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSuccess && (
            <>
              <button
                type="button"
                onClick={handleEnableNotifications}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Bell className="w-3.5 h-3.5" />
                {loading ? 'İzin İsteniyor...' : 'Bildirimleri Aç'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-indigo-200 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                Daha Sonra
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-1"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
