import React, { useState, useEffect } from 'react';
import { Star, Clock, Zap, Search as SearchIcon, ArrowLeft } from 'lucide-react';
import type { View } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { canAccessView } from '../auth/roles';
import UserNavMenu from './UserNavMenu';

interface SmartHeaderProps {
  onNavigate: (view: View) => void;
  currentView: View;
}

const SmartHeader: React.FC<SmartHeaderProps> = ({ onNavigate, currentView }) => {
  const { appRole } = useAuth();
  const effectiveRole = appRole || 'employee';
  const isEmployeeOnly = ['employee', 'user'].includes(effectiveRole);

  const [favorites, setFavorites] = useState<View[]>(() => {
    const saved = localStorage.getItem('humanius_favorites');
    return saved ? JSON.parse(saved) : ['personel', 'izin', 'bordro'];
  });

  const visibleFavorites = favorites.filter(v => canAccessView(effectiveRole, v));

  const [recent, setRecent] = useState<View[]>(() => {
    const saved = localStorage.getItem('humanius_recent');
    return saved ? JSON.parse(saved) : ['personel'];
  });

  useEffect(() => {
    if (!recent.includes(currentView)) {
      const newRecent = [currentView, ...recent.filter(v => v !== currentView)].slice(0, 5);
      setRecent(newRecent);
      localStorage.setItem('humanius_recent', JSON.stringify(newRecent));
    } else {
      const newRecent = [currentView, ...recent.filter(v => v !== currentView)];
      setRecent(newRecent);
      localStorage.setItem('humanius_recent', JSON.stringify(newRecent));
    }
  }, [currentView]);

  const toggleFavorite = (view: View) => {
    setFavorites(prev => {
      const newFavs = prev.includes(view) ? prev.filter(v => v !== view) : [...prev, view];
      localStorage.setItem('humanius_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const getLabel = (view: View) => {
    const map: Record<string, string> = {
      'personel': 'Personel Listesi',
      'ozluk-dosyasi': 'Personel Kartı',
      'bordro': 'Bordro',
      'bordro-icmal': 'Bordro İcmal',
      'izin': 'İzin Talepleri',
      'izin-cakisma': 'İzin Çakışma',
      'pdks-devam': 'Devam Kontrolü',
      'egitim-girisi': 'Eğitim Girişi',
      'raporlar': 'Raporlar',
      'is-akisi': 'İş Akışı',
      'sifre-degistir': 'Şifre & Güvenlik Ayarları',
      'kvkk': 'KVKK / GDPR Uyumluluk',
      'performans': 'Performans Değerlendirme',
      'okr': 'OKR Hedef',
      'yetkinlik': 'Gap Analizi',
      'sirket-yonetimi': 'Şirket Yönetimi',
      'tazminat-hesaplama': 'Tazminat & Bilirkişi Hesaplama',
    };
    return map[view as string] || view;
  };

  if (isEmployeeOnly) {
    const employeeTitleMap: Record<string, string> = {
      'bordro': 'Bordrolarım',
      'izin': 'İzin Taleplerim',
      'uyari': 'Duyurular & Uyarılar Takvimi',
      'ozluk-dosyasi': 'Özlük Dosyam',
      'pdks-devam': 'Devam Kontrolü (PDKS)',
      'performans': 'Performans Değerlendirmelerim',
      'egitim': 'Eğitim ve Gelişim',
      'zimmet': 'Zimmetli Envanterlerim',
      'okr': 'OKR Hedeflerim',
      'yetkinlik': 'Gap Analizi',
      'yan-haklar': 'Esnek Yan Haklarım',
      'kullanim-kilavuzu': 'Kullanım Kılavuzu',
      'sifre-degistir': 'Şifre & Güvenlik Ayarlarım',
      'kvkk': 'KVKK / GDPR Uyumluluk',
    };
    const title = employeeTitleMap[currentView] || currentView;

    return (
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
        {/* Left: Go back */}
        <button
          onClick={() => onNavigate('arama')}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 sm:px-4 py-2 rounded-xl transition-all shadow-xs shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Ana Sayfa</span>
        </button>

        {/* Center: Title */}
        <h2 className="text-sm sm:text-base font-bold text-gray-800 tracking-wide text-center flex-1 mx-4 truncate">
          {title}
        </h2>

        {/* Right: User Menu & Sign Out */}
        <div className="shrink-0">
          <UserNavMenu onNavigate={onNavigate} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs sticky top-0 z-30 gap-4">
      {/* Favoriler (Sık Kullanılanlar) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {visibleFavorites.map((view, i) => (
            <div key={`fav-${view}-${i}`} className="group relative flex items-center">
              <button
                onClick={() => onNavigate(view)}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${currentView === view ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {getLabel(view)}
              </button>
              <button 
                onClick={() => toggleFavorite(view)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:text-red-500 hover:border-red-500"
              >
                &times;
              </button>
            </div>
          ))}
          {!visibleFavorites.includes(currentView) && canAccessView(effectiveRole, currentView) && (
            <button 
              onClick={() => toggleFavorite(currentView)}
              className="text-xs px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 font-medium whitespace-nowrap"
            >
              <Star className="w-3 h-3" /> Ekle
            </button>
          )}
        </div>
      </div>

      {/* Right: User Menu & Sign Out */}
      <div className="shrink-0">
        <UserNavMenu onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default SmartHeader;
