import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Building2, 
  Key, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  LogOut, 
  ChevronDown, 
  RefreshCw, 
  Check, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { translateErrorMessage } from '../utils/errorTranslator';
import { companyService } from '../services/companyService';
import type { View } from '../types';

interface UserNavMenuProps {
  onNavigate?: (view: View) => void;
}

const getRoleBadge = (role?: string) => {
  switch (role) {
    case 'superadmin':
      return { 
        label: 'Süper Yönetici', 
        bg: 'bg-purple-50', 
        text: 'text-purple-700', 
        border: 'border-purple-200',
        dot: 'bg-purple-500'
      };
    case 'admin':
      return { 
        label: 'Şirket Yöneticisi', 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        dot: 'bg-blue-500'
      };
    case 'hr':
      return { 
        label: 'İK Yöneticisi', 
        bg: 'bg-emerald-50', 
        text: 'text-emerald-700', 
        border: 'border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'manager':
      return { 
        label: 'Birim Yöneticisi', 
        bg: 'bg-amber-50', 
        text: 'text-amber-700', 
        border: 'border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'employee':
    case 'user':
      return { 
        label: 'Personel', 
        bg: 'bg-slate-50', 
        text: 'text-slate-700', 
        border: 'border-slate-200',
        dot: 'bg-slate-500'
      };
    default:
      return { 
        label: 'Kullanıcı', 
        bg: 'bg-gray-50', 
        text: 'text-gray-700', 
        border: 'border-gray-200',
        dot: 'bg-gray-500'
      };
  }
};

const getInitials = (name: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const UserNavMenu: React.FC<UserNavMenuProps> = ({ onNavigate }) => {
  const { user, profile, appRole, signOut, updatePassword } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  // Company Name resolution
  const [companyName, setCompanyName] = useState<string>('');

  // Password Change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // Display information
  const displayName = profile?.full_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Kullanıcı');
  const userEmail = profile?.email || user?.email || '—';
  const roleInfo = getRoleBadge(appRole || profile?.role);

  // Resolve company name
  useEffect(() => {
    let resolved = (profile as any)?.company_name;
    if (!resolved) {
      try {
        const remembered = localStorage.getItem('humanius_remembered_account');
        if (remembered) {
          const parsed = JSON.parse(remembered);
          if (parsed?.companyName) resolved = parsed.companyName;
        }
      } catch {}
    }

    if (resolved) {
      setCompanyName(resolved);
      return;
    }

    if (profile?.company_id && !profile.company_id.startsWith('demo-')) {
      companyService.getById(profile.company_id)
        .then(comp => {
          if (comp?.name) setCompanyName(comp.name);
        })
        .catch(() => {});
    } else if (appRole === 'superadmin') {
      setCompanyName('Humanius Sistem');
    } else {
      setCompanyName('Humanius HRMS');
    }
  }, [profile, appRole]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      setPasswordLoading(false);

      if (error) {
        setPasswordError(translateErrorMessage(error.message));
        return;
      }

      // Sync into known passwords cache so admin/superadmin sees the new password immediately
      const targetEmail = (userEmail || '').toLowerCase().trim();
      if (targetEmail) {
        try {
          const raw = localStorage.getItem('humanius_admin_known_passwords');
          const map = raw ? JSON.parse(raw) : {};
          map[targetEmail] = newPassword;
          if (user?.id) map[user.id] = newPassword;
          if (profile?.id) map[profile.id] = newPassword;
          localStorage.setItem('humanius_admin_known_passwords', JSON.stringify(map));
        } catch {}
      }

      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Şifreniz başarıyla güncellendi! Yeni şifreniz aktif edilmiştir.');
    } catch (err: any) {
      setPasswordLoading(false);
      setPasswordError(translateErrorMessage(err?.message || 'Şifre güncellenirken bir hata oluştu.'));
    }
  };

  const handleOpenPasswordTab = () => {
    setPasswordMessage('');
    setPasswordError('');
    setActiveTab('password');
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 relative" ref={menuRef}>
      {/* ── Trigger: User Button ── */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setPasswordMessage('');
          setPasswordError('');
        }}
        className={`flex items-center gap-2 sm:gap-2.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all text-xs sm:text-sm font-semibold select-none group ${
          isOpen
            ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-2 ring-blue-500/20'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Kullanıcı Bilgileri ve Şifre Değiştirme Menüsü"
      >
        {/* Avatar Circle with initials */}
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ring-1 ring-white">
          {getInitials(displayName)}
        </div>

        {/* User Name & Role label */}
        <div className="flex flex-col text-left leading-tight max-w-[110px] sm:max-w-[150px]">
          <span className="font-bold text-slate-800 group-hover:text-blue-600 truncate transition-colors">
            {displayName}
          </span>
          <span className="text-[10px] font-medium text-slate-500 truncate">
            {roleInfo.label}
          </span>
        </div>

        <ChevronDown 
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`} 
        />
      </button>

      {/* ── Navbar Standalone Çıkış Yap Button (Always accessible) ── */}
      <button
        type="button"
        onClick={() => signOut()}
        className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all shadow-xs border border-rose-200/80 shrink-0"
        title="Güvenli Çıkış Yap"
      >
        <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-rose-500" />
        <span className="hidden sm:inline">Çıkış Yap</span>
      </button>

      {/* ── Dropdown Popover ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 ring-1 ring-slate-900/10 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          
          {/* Header Card */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3.5 relative z-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-400 text-white font-black text-base flex items-center justify-center shadow-md ring-2 ring-white/20">
                  {getInitials(displayName)}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" title="Aktif Oturum" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white truncate leading-snug">
                  {displayName}
                </h3>
                <p className="text-xs text-slate-300 truncate mt-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{userEmail}</span>
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`} />
                    {roleInfo.label}
                  </span>
                  {companyName && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full truncate max-w-[160px]">
                      <Building2 className="w-3 h-3 shrink-0 text-slate-400" />
                      <span className="truncate">{companyName}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('info');
                setPasswordMessage('');
                setPasswordError('');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'info'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Kullanıcı Bilgileri</span>
            </button>
            <button
              type="button"
              onClick={handleOpenPasswordTab}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Şifre Değiştir</span>
            </button>
          </div>

          {/* ── TAB 1: KULLANICI BİLGİLERİ ── */}
          {activeTab === 'info' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="space-y-2.5">
                {/* Ad Soyad */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Ad Soyad</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 text-right truncate max-w-[180px]">
                    {displayName}
                  </span>
                </div>

                {/* E-Posta */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>E-Posta</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 text-right truncate max-w-[180px]">
                    {userEmail}
                  </span>
                </div>

                {/* Yetki / Rol */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                    <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Yetki / Rol</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}>
                    {roleInfo.label}
                  </span>
                </div>

                {/* Şirket */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Şirket</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 text-right truncate max-w-[180px]">
                    {companyName || 'Belirtilmemiş'}
                  </span>
                </div>

                {/* Durum */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Hesap Durumu</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Aktif Oturum
                  </span>
                </div>
              </div>

              {/* Action Buttons in Info Tab */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleOpenPasswordTab}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  <Key className="w-4 h-4" />
                  <span>Şifremi Değiştir</span>
                </button>

                <div className="flex items-center gap-2">
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onNavigate('sifre-degistir');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                      title="Detaylı Güvenlik Sayfasına Git"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tam Sayfada Aç</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all border border-rose-200"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: ŞİFRE DEĞİŞTİR ── */}
          {activeTab === 'password' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Giriş Şifresini Değiştir</h4>
                    <p className="text-[11px] text-slate-500">Yeni şifrenizi girerek anında güncelleyin.</p>
                  </div>
                </div>
              </div>

              {/* Success Notification */}
              {passwordMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5 animate-in zoom-in-95 duration-150">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-emerald-950">Başarıyla Güncellendi!</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">{passwordMessage}</p>
                  </div>
                </div>
              )}

              {/* Error Notification */}
              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-in zoom-in-95 duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-rose-950">Hata Oluştu</p>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">{passwordError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                {/* Yeni Şifre */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Yeni Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="En az 6 karakter"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-3 pr-9 py-2 text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium placeholder:text-slate-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Yeni Şifre Tekrar */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Yeni Şifre Tekrar
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifreyi tekrar giriniz"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Kurallar / Doğrulama Durumu */}
                <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${newPassword.length >= 6 ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                    <Check className={`w-3.5 h-3.5 ${newPassword.length >= 6 ? 'text-emerald-600 stroke-[3]' : 'text-slate-300'}`} />
                    <span>En az 6 karakter uzunluğunda</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${newPassword && confirmPassword && newPassword === confirmPassword ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                    <Check className={`w-3.5 h-3.5 ${newPassword && confirmPassword && newPassword === confirmPassword ? 'text-emerald-600 stroke-[3]' : 'text-slate-300'}`} />
                    <span>Şifreler birbiriyle eşleşiyor</span>
                  </div>
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('info');
                      setPasswordError('');
                      setPasswordMessage('');
                    }}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={
                      passwordLoading ||
                      !newPassword ||
                      !confirmPassword ||
                      newPassword.length < 6 ||
                      newPassword !== confirmPassword
                    }
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Şifreyi Güncelle</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default UserNavMenu;
