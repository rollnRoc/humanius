import React, { useState } from 'react';
import { BookOpen, CheckCircle2, X, Sparkles, ArrowRight, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel } from '../auth/roles';
import type { AppRole } from '../auth/roles';

interface OnboardingModalProps {
  onClose: () => void;
  onStartGuide: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose, onStartGuide }) => {
  const { profile, appRole } = useAuth();
  const effectiveRole = appRole || 'employee';
  const [showSkippedNotice, setShowSkippedNotice] = useState(false);

  const getRoleFeatures = (role: AppRole): { title: string; desc: string; steps: string[] } => {
    switch (role) {
      case 'superadmin':
      case 'admin':
      case 'hr':
        return {
          title: 'İnsan Kaynakları & Yönetim Rehberi',
          desc: 'Humanius portalında şirketinizin tüm İK operasyonlarını kolayca yönetebilirsiniz. İlk olarak şu adımları kontrol etmenizi öneririz:',
          steps: [
            'Şirket Yönetimi altından personel kayıtlarınızı doğrulayın.',
            'Kullanıcılar menüsünden ekibinize giriş hesapları oluşturun.',
            'Maaş dönemlerinde Bordro hesaplayıp çalışan onayı isteyin.',
            'Bekleyen İzin Taleplerini inceleyip onay verin.',
            'Toplu Duyurular yayınlayarak tüm ekibe bildirim gönderin.'
          ]
        };
      case 'manager':
        return {
          title: 'Yönetici Rehberi',
          desc: 'Departmanınızdaki ekibi ve süreçleri yönetmek için kullanabileceğiniz araçlar:',
          steps: [
            'Ekip üyelerinizin bekleyen İzin Taleplerini onaylayın.',
            'Ekip performans değerlendirmelerini ve geri bildirimleri yapın.',
            'OKR panelinden departman ve bireysel hedefleri güncelleyin.',
            'Uyarılar Takvimi üzerinden önemli tarihleri takip edin.'
          ]
        };
      default:
        return {
          title: 'Çalışan Kullanım Rehberi',
          desc: 'Humanius portalı üzerinden tüm kişisel İK süreçlerinizi takip edebilir ve hızlıca talep oluşturabilirsiniz:',
          steps: [
            'Özlük Bilgileri sekmesinden kişisel evraklarınızı kontrol edin.',
            'Maaş dönemlerinde size iletilen Bordronuzu şifrenizle onaylayın.',
            'İzin Talebi formu ile saniyeler içinde yeni izin talebi gönderin.',
            'Eğitim & Gelişim alanından size atanan eğitimleri tamamlayın.',
            'İş Akışı ve PDKS ile günlük mesai giriş-çıkış takibinizi yapın.'
          ]
        };
    }
  };

  const info = getRoleFeatures(effectiveRole);

  const handleSkip = () => {
    setShowSkippedNotice(true);
  };

  const handleCloseNotice = () => {
    onClose();
  };

  if (showSkippedNotice) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden transform transition-all p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Rehber Kaydedildi!</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Kullanım Rehberi'ne dilediğiniz zaman sol menüdeki <strong>"Kullanım Kılavuzu"</strong> sekmesinden veya Arama sayfasında <strong>"rehber"</strong> yazarak ulaşabilirsiniz.
          </p>
          <button
            onClick={handleCloseNotice}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-md"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
        {/* Banner header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-30" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold w-fit backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>Hoş Geldiniz</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight mt-2">Humanius'a Hoş Geldiniz!</h2>
              <p className="text-blue-100 text-xs mt-1">
                Sayın <span className="font-semibold text-white">{profile?.full_name || 'Kullanıcı'}</span> — {profile?.email}
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
              {info.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">{info.desc}</p>
          </div>

          <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hızlı Kontrol Listesi:</h4>
            <div className="space-y-2.5">
              {info.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 font-medium leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            Daha Sonra / Geç
          </button>
          <button
            onClick={onStartGuide}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            Rehberi Başlat
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
