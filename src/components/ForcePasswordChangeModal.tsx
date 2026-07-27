import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldAlert, LogOut, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ForcePasswordChangeModalProps {
  onSuccess?: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ onSuccess }) => {
  const { user, profile, updatePassword, updateProfile, signOut } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Validation rules
  const hasMinLength = newPassword.length >= 6;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferentFromCurrent = currentPassword ? newPassword !== currentPassword : true;

  const isValid = hasMinLength && passwordsMatch && isDifferentFromCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasMinLength) {
      setErrorMessage('Yeni şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Girdiğiniz yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    if (currentPassword && newPassword === currentPassword) {
      setErrorMessage('Yeni şifreniz geçici/eski şifreniz ile aynı olamaz.');
      return;
    }

    setLoading(true);

    try {
      // 1. Supabase Auth password update & metadata flag clear
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (authError) throw authError;

      // 2. Update profile table if must_change_password column exists or update metadata
      if (user?.id) {
        try {
          await supabase
            .from('profiles')
            .update({ must_change_password: false } as any)
            .eq('id', user.id);
        } catch {
          // ignore column missing warning
        }
      }

      setSuccessMessage('Şifreniz başarıyla güncellendi! Yönlendiriliyorsunuz...');

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }, 1200);
    } catch (err: any) {
      console.error('Password change error:', err);
      setErrorMessage(err.message || 'Şifre değiştirilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/20">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <span className="inline-block bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2">
            🔒 İlk Giriş Güvenlik Adımı
          </span>
          <h2 className="text-xl font-black tracking-tight">Yeni Şifrenizi Belirleyin</h2>
          <p className="text-xs text-blue-100/90 mt-1 max-w-xs mx-auto leading-relaxed">
            Hesabınızın güvenliği için varsayılan/geçici şifrenizi değiştirmeniz zorunludur.
          </p>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* User Info Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-800">{profile?.full_name || user?.email}</p>
              <p className="text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md capitalize">
              {profile?.role || 'Kullanıcı'}
            </span>
          </div>

          {/* Geçici / Mevcut Şifre (İsteğe bağlı teyit) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Mevcut (Geçici) Şifreniz
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Size iletilen geçici şifre (örn: 987654)"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Yeni Şifre */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Yeni Güvenli Şifreniz <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakterli yeni şifre"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Yeni Şifre Tekrar */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Yeni Şifreniz (Tekrar) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrar girin"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Validation Indicators */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${hasMinLength ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {hasMinLength ? '✓' : '•'}
              </div>
              <span className={hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                En az 6 karakter uzunluğunda
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${passwordsMatch ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {passwordsMatch ? '✓' : '•'}
              </div>
              <span className={passwordsMatch ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                Şifreler eşleşiyor
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading || !isValid}
              className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                isValid && !loading
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20 active:scale-[0.99]'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Şifremi Değiştir ve Sisteme Giriş Yap
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              Çıkış Yap
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
