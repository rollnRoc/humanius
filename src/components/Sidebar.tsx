import React, { useState } from 'react';
import { Search, Users, Calendar, FileText, CreditCard, Bell, Edit2, SearchIcon, LogOut, BookOpen, Clock, GraduationCap, Shield, Gift, ChevronDown, UserCircle, Settings, Layout, Lock } from 'lucide-react';
import { View } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LogoEditor, { LogoConfig } from './LogoEditor';
import { canAccessView, getRoleLabel } from '../auth/roles';
import { companyService } from '../services/companyService';

const DEFAULT_LOGO_SRC = '/humanius-original.png';
const LEGACY_LOGO_SRCS = ['/14.png', '/humanius-logo.svg'];

const safeReadLocalStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeWriteLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const BlueHLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = "w-10 h-10", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={`${className} select-none`} style={style}>
    <rect width="100" height="100" rx="20" fill="#2563eb" />
    <path d="M30 25 V75 M70 25 V75 M30 50 H70" stroke="white" stroke-width="14" stroke-linecap="round" />
  </svg>
);

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  searchTerm,
  onSearchChange
}) => {
  const { t } = useLanguage();
  const { user, profile, appRole, signOut } = useAuth();
  const effectiveRole = user ? appRole : 'admin';
  const [openSections, setOpenSections] = useState<View[]>([]);
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const [showAlertDot, setShowAlertDot] = React.useState(() => {
    try {
      return localStorage.getItem('humanius_new_alert_notification') === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    const handleStorage = () => {
      try {
        setShowAlertDot(localStorage.getItem('humanius_new_alert_notification') === 'true');
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const companyIdKey = profile?.company_id ? `_${profile.company_id}` : '';
  const logoSrcKey = `logoSrc${companyIdKey}`;
  const logoConfigKey = `logoConfig${companyIdKey}`;

  const [logoSrc, setLogoSrc] = useState(DEFAULT_LOGO_SRC);
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({
    width: 225,
    height: 75,
    x: 0,
    y: 0,
    rotation: 0
  });

  const handleLogoSave = (config: LogoConfig) => {
    setLogoConfig(config);
    safeWriteLocalStorage(logoConfigKey, JSON.stringify(config));
  };

  const handleLogoSelect = async (nextLogoSrc: string) => {
    setLogoSrc(nextLogoSrc);
    safeWriteLocalStorage(logoSrcKey, nextLogoSrc);
    
    if (profile?.company_id) {
      try {
        await companyService.update(profile.company_id, { logo_url: nextLogoSrc });
      } catch (err) {
        console.error("Error saving company logo to database:", err);
      }
    }
  };

  React.useEffect(() => {
    const loadCompanyLogo = async () => {
      if (profile?.company_id) {
        try {
          const comp = await companyService.getById(profile.company_id);
          if (comp?.logo_url) {
            setLogoSrc(comp.logo_url);
            return;
          }
        } catch (err) {
          console.error("Error loading company logo:", err);
        }
      }
      
      const savedLogoSrc = safeReadLocalStorage(logoSrcKey);
      if (savedLogoSrc && !LEGACY_LOGO_SRCS.includes(savedLogoSrc)) {
        setLogoSrc(savedLogoSrc);
      } else {
        setLogoSrc(DEFAULT_LOGO_SRC);
      }
    };

    loadCompanyLogo();

    const saved = safeReadLocalStorage(logoConfigKey);
    if (!saved) {
      setLogoConfig({
        width: 225,
        height: 75,
        x: 0,
        y: 0,
        rotation: 0
      });
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<LogoConfig>;
      const migratedWidth = parsed.width === 180 ? 225 : parsed.width;
      const migratedHeight = parsed.height === 60 ? 75 : parsed.height;

      setLogoConfig((prev) => ({
        ...prev,
        ...(typeof migratedWidth === 'number' ? { width: migratedWidth } : {}),
        ...(typeof migratedHeight === 'number' ? { height: migratedHeight } : {}),
        ...(typeof parsed.x === 'number' ? { x: parsed.x } : {}),
        ...(typeof parsed.y === 'number' ? { y: parsed.y } : {}),
        ...(typeof parsed.rotation === 'number' ? { rotation: parsed.rotation } : {}),
      }));
    } catch {
      try {
        localStorage.removeItem(logoConfigKey);
      } catch {
        // ignore storage cleanup failures
      }
    }
  }, [profile?.company_id, logoSrcKey, logoConfigKey]);

  const uygulamalarIds: View[] = ['kvkk', 'kullanim-kilavuzu'];

  const rawNavItems = [
    { id: 'arama' as View, label: 'Arama', icon: SearchIcon },
    { id: 'personel' as View, label: 'Şirket Yönetimi', icon: Users, children: [
      { id: 'personel' as View, label: 'Personel Listesi' },
      { id: 'org-sema' as View, label: 'Organizasyon Şeması' },
      { id: 'zimmet' as View, label: 'Tüm Zimmetler Listesi' },
      { id: 'kullanicilar' as View, label: 'Kullanıcılar' },
      { id: 'offboarding' as View, label: 'İşten Çıkış (Offboarding)' },
      { id: 'ayar' as View, label: 'Personel ve Şirket Yönetimi' },
    ]},
    { id: 'ozluk-dosyasi' as View, label: 'Personel Yönetimi', icon: UserCircle, children: [
      { id: 'ozluk-dosyasi' as View, label: 'Personel Kartı ve Özlük' },
      { id: 'gorev-tanimi' as View, label: 'Görev Tanımı' },
    ]},
    { id: 'bordro' as View, label: 'Bordro ve İcmal', icon: CreditCard, children: [
      { id: 'bordro' as View, label: 'Bordro' },
      { id: 'yan-haklar' as View, label: 'Esnek Yan Haklar' },
      { id: 'bordro-icmal' as View, label: 'Bordro İcmal Raporu' },
    ]},
    { id: 'izin' as View, label: 'İzin Yönetimi', icon: Calendar, children: [
      { id: 'izin' as View, label: 'İzin Talepleri' },
      { id: 'izin-cakisma' as View, label: 'İzin Çakışma Kontrolü' },
      { id: 'izin-tanimlari' as View, label: 'İzin Türleri Tanımları' },
      { id: 'izin-listesi' as View, label: 'İzinli Kişiler Listesi' },
    ]},
    { id: 'is-akisi-menu' as View, label: 'İş Akışı ve PDKS', icon: Clock, children: [
      { id: 'is-akisi' as View, label: 'İş Akışı Panosu' },
      { id: 'pdks-devam' as View, label: 'Devam Kontrolü' },
      { id: 'egitim-girisi' as View, label: 'Eğitim Girişi' },
      { id: 'analitik' as View, label: 'Veri Analitiği' },
    ]},
    { id: 'uyari' as View, label: 'Uyarılar Takvimi', icon: Bell },
    { id: 'egitim' as View, label: 'Eğitim & Gelişim (LMS)', icon: GraduationCap, children: [
      { id: 'egitim' as View, label: 'Eğitim Kataloğu & LMS' },
      { id: 'yetkinlik' as View, label: 'Yetkinlik Matrisi' },
    ]},
    { id: 'performans' as View, label: 'Performans & Geri Bildirim', icon: Layout, children: [
      { id: 'performans' as View, label: 'Performans ve Geri Bildirim' },
      { id: 'okr' as View, label: 'OKR Hedefler' },
    ]},
    { id: 'form-builder' as View, label: 'Dinamik Form', icon: FileText },
    { id: 'kullanim-kilavuzu' as View, label: 'Kullanım Kılavuzu', icon: BookOpen },
  ];

  const navItems = rawNavItems.map(item => {
    if (item.children) {
      return { ...item, children: item.children.filter(child => canAccessView(effectiveRole, child.id)) };
    }
    return item;
  }).filter(item => {
    const explicitlyAccessible = canAccessView(effectiveRole, item.id);
    const hasVisibleChildren = item.children && item.children.length > 0;
    return explicitlyAccessible || hasVisibleChildren;
  });

  const uygulamalarNavItems = [
    { id: 'kvkk' as View, label: 'KVKK / GDPR Uyumluluk', icon: Shield },
    { id: 'kullanim-kilavuzu' as View, label: 'Kullanım Kılavuzu', icon: BookOpen },
  ].filter((item) => canAccessView(effectiveRole, item.id));

  const mainNavItems = navItems.filter((item) => !uygulamalarIds.includes(item.id));

  React.useEffect(() => {
    const currentParent = mainNavItems.find(
      (item) => item.children && item.children.some((child) => child.id === currentView)
    );

    if (!currentParent) return;

    setOpenSections((prev) => {
      if (prev.includes(currentParent.id)) return prev;
      return [...prev, currentParent.id];
    });
  }, [currentView, mainNavItems]);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-5 sticky top-0 h-screen overflow-y-auto shadow-sm z-40">
      {/* Brand */}
      <div className="relative group mb-5">
        <div className="flex items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-200">
          {effectiveRole === 'superadmin' || !logoSrc || logoSrc === DEFAULT_LOGO_SRC ? (
            <div className="flex items-center gap-3">
              <BlueHLogo className="w-12 h-12" />
              <span className="text-xl font-bold text-gray-800 tracking-tight">Humanius</span>
            </div>
          ) : (
            <img
              src={logoSrc}
              alt="Logo"
              style={{
                width: `${logoConfig.width}px`,
                height: `${logoConfig.height}px`,
                transform: `rotate(${logoConfig.rotation}deg)`,
                maxWidth: '100%',
                objectFit: 'contain'
              }}
              className="transition-transform"
            />
          )}
        </div>
        {effectiveRole !== 'superadmin' && (
          <button
            onClick={() => setShowLogoEditor(true)}
            className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
            title="Logo'yu Düzenle"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="text-sm font-semibold text-gray-800">{profile?.full_name || 'Demo Kullanıcı'}</p>
        <p className="mt-0.5 text-xs text-gray-400">{profile?.company_id ? '' : 'Humanius Demo Şirketi'}</p>
        <p className="mt-1 text-xs text-gray-500">{getRoleLabel(effectiveRole)}</p>
      </div>

      {showLogoEditor && (
        <LogoEditor
          logoSrc={logoSrc}
          onClose={() => setShowLogoEditor(false)}
          onSave={handleLogoSave}
          onLogoSelect={handleLogoSelect}
          initialConfig={logoConfig}
        />
      )}


      {/* Navigation */}
      <nav className="space-y-1">
        {mainNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const hasChildren = item.children && item.children.length > 0;
          const hasActiveChild = Boolean(hasChildren && item.children.some((child) => child.id === currentView));
          const isSectionOpen = openSections.includes(item.id);
          const isHighlighted = isActive || hasActiveChild;

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasChildren) {
                    setOpenSections((prev) =>
                      prev.includes(item.id)
                        ? prev.filter((sectionId) => sectionId !== item.id)
                        : [...prev, item.id]
                    );
                    return;
                  }

                  onViewChange(item.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isHighlighted
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-transparent'
                }`}
              >
                {isHighlighted && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                <Icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
                {item.id === 'uyari' && showAlertDot && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                )}
                {hasChildren && (
                  <ChevronDown
                    className={`ml-auto h-4 w-4 transition-transform ${isSectionOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              {hasChildren && isSectionOpen && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map(child => {
                    const isChildActive = currentView === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onViewChange(child.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          isChildActive
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Uygulamalar Bölümü */}
        {uygulamalarNavItems.length > 0 && (
          <>
            {uygulamalarNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-transparent'
                  }`}
                >
                  {isActive && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </>
        )}
      </nav>



      {/* Logout & Settings */}
      {user && (
        <div className="mt-3 space-y-1">
          <button
            onClick={() => onViewChange('sifre-degistir')}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all border ${
              currentView === 'sifre-degistir'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-transparent hover:border-gray-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span className="font-medium">Şifre Değiştir</span>
          </button>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Çıkış Yap</span>
          </button>
        </div>
      )}

      {/* Version */}
      <div className="mt-4 text-xs text-gray-400 text-center font-medium">
        Humanius 1.0
      </div>
    </aside>
  );
};

export default Sidebar;