import React, { useState, useMemo, useRef } from 'react';
import { Search, Users, Calendar, FileText, CreditCard, Bell, Edit2, SearchIcon, LogOut, BookOpen, Clock, GraduationCap, Shield, Gift, ChevronDown, UserCircle, Settings, Layout, Lock, Home } from 'lucide-react';
import { View } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LogoEditor, { LogoConfig } from './LogoEditor';
import { canAccessView, getRoleLabel } from '../auth/roles';
import { companyService } from '../services/companyService';

const DEFAULT_LOGO_SRC = '/humanius-original.png';
const LEGACY_LOGO_SRCS = ['/14.png', '/humanius-logo.svg'];

const isInvalidLogo = (url: string | null | undefined): boolean => {
  if (!url) return true;
  if (url === DEFAULT_LOGO_SRC) return false;
  if (LEGACY_LOGO_SRCS.includes(url)) return true;
  if (url.toLowerCase().includes('toyota')) return true;
  return false;
};

const safeReadLocalStorage = (key: string) => {
  try {
    const val = localStorage.getItem(key);
    if (val && isInvalidLogo(val)) {
      localStorage.removeItem(key);
      return null;
    }
    return val;
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
    <path d="M30 25 V75 M70 25 V75 M30 50 H70" stroke="white" strokeWidth="14" strokeLinecap="round" />
  </svg>
);

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const UYGULAMALAR_IDS: View[] = ['kvkk', 'kullanim-kilavuzu'];

const RAW_NAV_ITEMS = [
  { id: 'arama' as View, label: 'Ana Sayfa', icon: Home },
  { id: 'personel' as View, label: 'Şirket Yönetimi', icon: Users, children: [
    { id: 'personel' as View, label: 'Personel Listesi' },
    { id: 'org-sema' as View, label: 'Organizasyon Şeması' },
    { id: 'zimmet' as View, label: 'Tüm Zimmetler Listesi' },
    { id: 'kullanicilar' as View, label: 'Kullanıcılar' },
    { id: 'offboarding' as View, label: 'İşten Çıkış (Offboarding)' },
    { id: 'sirket-bilgileri' as View, label: 'Şirket Bilgileri & Yönetimi' },
    { id: 'ayar' as View, label: 'Kanunlar ve Kurallar' },
  ]},
  { id: 'ozluk-dosyasi' as View, label: 'Personel Yönetimi', icon: UserCircle, children: [
    { id: 'ozluk-dosyasi' as View, label: 'Personel Kartı ve Özlük' },
    { id: 'gorev-tanimi' as View, label: 'Görev Tanımı' },
    { id: 'tazminat-hesaplama' as View, label: 'Tazminat & Bilirkişi Hesaplama' },
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
  { id: 'kullanim-kilavuzu' as View, label: 'Kullanım Kılavuzu', icon: BookOpen },
];

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  searchTerm,
  onSearchChange
}) => {
  const { t } = useLanguage();
  const { user, profile, appRole, signOut } = useAuth();
  const effectiveRole = user ? appRole : 'admin';
  const prevViewRef = useRef<View>(currentView);
  const [openSections, setOpenSections] = useState<View[]>(() => {
    const parent = RAW_NAV_ITEMS.find(
      (item) => item.children && item.children.some((child) => child.id === currentView)
    );
    return parent ? [parent.id] : [];
  });
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

  // Synchronously initialize logoSrc on frame 0 to prevent F5 flicker
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    try {
      if (profile?.company_id) {
        const compSaved = safeReadLocalStorage(`logoSrc_${profile.company_id}`);
        if (compSaved && !isInvalidLogo(compSaved)) return compSaved;
      }
      const savedLogoSrc = safeReadLocalStorage('logoSrc');
      if (savedLogoSrc && !isInvalidLogo(savedLogoSrc)) return savedLogoSrc;

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('logoSrc')) {
          const val = localStorage.getItem(k);
          if (val && !isInvalidLogo(val)) return val;
        }
      }
    } catch {}
    return DEFAULT_LOGO_SRC;
  });

  const [logoConfig, setLogoConfig] = useState<LogoConfig>(() => {
    try {
      const saved = safeReadLocalStorage(logoConfigKey) || safeReadLocalStorage('logoConfig');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<LogoConfig>;
        return {
          width: parsed.width === 180 ? 225 : (parsed.width || 225),
          height: parsed.height === 60 ? 75 : (parsed.height || 75),
          x: parsed.x || 0,
          y: parsed.y || 0,
          rotation: parsed.rotation || 0
        };
      }
    } catch {}
    return { width: 225, height: 75, x: 0, y: 0, rotation: 0 };
  });

  const handleLogoSave = (config: LogoConfig) => {
    setLogoConfig(config);
    safeWriteLocalStorage(logoConfigKey, JSON.stringify(config));
  };

  const handleLogoSelect = async (nextLogoSrc: string) => {
    setLogoSrc(nextLogoSrc);
    safeWriteLocalStorage(logoSrcKey, nextLogoSrc);
    safeWriteLocalStorage('logoSrc', nextLogoSrc);
    
    if (profile?.company_id && profile.company_id !== 'demo-company-id-9999' && !profile.company_id.startsWith('demo-')) {
      try {
        await companyService.update(profile.company_id, { logo_url: nextLogoSrc });
      } catch (err) {
        console.error("Error saving company logo to database:", err);
      }
    }
  };

  React.useEffect(() => {
    const loadCompanyLogo = async () => {
      if (profile?.company_id && profile.company_id !== 'demo-company-id-9999' && !profile.company_id.startsWith('demo-')) {
        try {
          const comp = await companyService.getById(profile.company_id);
          if (comp?.logo_url) {
            if (isInvalidLogo(comp.logo_url)) {
              // Reset legacy/toyota logo in DB to DEFAULT_LOGO_SRC
              setLogoSrc(DEFAULT_LOGO_SRC);
              safeWriteLocalStorage(logoSrcKey, DEFAULT_LOGO_SRC);
              safeWriteLocalStorage('logoSrc', DEFAULT_LOGO_SRC);
              await companyService.update(profile.company_id, { logo_url: DEFAULT_LOGO_SRC });
            } else {
              setLogoSrc(comp.logo_url);
              safeWriteLocalStorage(logoSrcKey, comp.logo_url);
              safeWriteLocalStorage('logoSrc', comp.logo_url);
            }
            return;
          }
        } catch (err) {
          console.error("Error loading company logo:", err);
        }
      }
      
      const savedLogoSrc = safeReadLocalStorage(logoSrcKey) || safeReadLocalStorage('logoSrc');
      if (savedLogoSrc && !isInvalidLogo(savedLogoSrc)) {
        setLogoSrc(savedLogoSrc);
      } else {
        setLogoSrc(DEFAULT_LOGO_SRC);
      }
    };

    loadCompanyLogo();
  }, [profile?.company_id, logoSrcKey, logoConfigKey]);

  const mainNavItems = useMemo(() => {
    const navItems = RAW_NAV_ITEMS.map(item => {
      if (item.children) {
        return { ...item, children: item.children.filter(child => canAccessView(effectiveRole, child.id)) };
      }
      return item;
    }).filter(item => {
      const explicitlyAccessible = canAccessView(effectiveRole, item.id);
      const hasVisibleChildren = item.children && item.children.length > 0;
      return explicitlyAccessible || hasVisibleChildren;
    });

    return navItems.filter((item) => !UYGULAMALAR_IDS.includes(item.id));
  }, [effectiveRole]);

  const uygulamalarNavItems = useMemo(() => {
    return [
      { id: 'kvkk' as View, label: 'KVKK / GDPR Uyumluluk', icon: Shield },
      { id: 'kullanim-kilavuzu' as View, label: 'Kullanım Kılavuzu', icon: BookOpen },
    ].filter((item) => canAccessView(effectiveRole, item.id));
  }, [effectiveRole]);

  React.useEffect(() => {
    if (prevViewRef.current !== currentView) {
      prevViewRef.current = currentView;
      const currentParent = mainNavItems.find(
        (item) => item.children && item.children.some((child) => child.id === currentView)
      );

      if (!currentParent) return;

      setOpenSections((prev) => {
        if (prev.includes(currentParent.id)) return prev;
        return [...prev, currentParent.id];
      });
    }
  }, [currentView, mainNavItems]);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-5 sticky top-0 h-screen overflow-y-auto shadow-sm z-40">
      {/* Brand */}
      <div className="relative group mb-5">
        <div className="flex items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-200">
          {effectiveRole === 'superadmin' || !logoSrc || logoSrc === DEFAULT_LOGO_SRC || isInvalidLogo(logoSrc) ? (
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
                aria-label={item.label}
                aria-expanded={hasChildren ? isSectionOpen : undefined}
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
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                  isHighlighted
                    ? 'bg-blue-50 border border-blue-200 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-transparent font-medium'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left text-sm leading-tight">{item.label}</span>
                {item.id === 'uyari' && showAlertDot && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 ml-1" />
                )}
                {hasChildren && (
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${isSectionOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              {hasChildren && isSectionOpen && (
                <div className="ml-5 pl-3 border-l border-gray-100 my-1 space-y-0.5">
                  {item.children.map(child => {
                    const isChildActive = currentView === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onViewChange(child.id)}
                        className={`w-full flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          isChildActive
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'
                        }`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className={`w-3.5 h-3.5 ${isChildActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                        <span className="flex-1 text-left leading-snug">{child.label}</span>
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-transparent font-medium'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left text-sm leading-tight">{item.label}</span>
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
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all border ${
              currentView === 'sifre-degistir'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-transparent hover:border-gray-200'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <span className="font-medium">Şifre Değiştir</span>
          </button>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-200"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
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