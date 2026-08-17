import React, { useState } from 'react';
import { LogIn, Building2, Mail, Lock, CheckCircle, Phone, CreditCard, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { translateErrorMessage } from '../utils/errorTranslator';
import { userManagementService } from '../services/userManagementService';

export default function Login() {
  const { signIn, startDemoSession, startSuperAdminSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [resetTcNo, setResetTcNo] = useState('');
  const [resetPhone, setResetPhone] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await signIn(email.trim().toLowerCase(), password);
      if (signInError) {
        setError(
          signInError.message.includes('Invalid login credentials')
            ? 'E-posta veya parola hatalı.'
            : signInError.message
        );
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id, role')
          .eq('id', user.id)
          .maybeSingle() as { data: { company_id: string | null; role: string | null } | null };

        if (!profile) {
          setError('Kullanıcı profili bulunamadı. Yöneticinizle iletişime geçin.');
          await supabase.auth.signOut();
        } else if (!profile.company_id && profile.role !== 'superadmin') {
          setError('Bu hesap için şirket ataması yok. Yöneticinizle iletişime geçin.');
          await supabase.auth.signOut();
        }
      }
    } catch (err: any) {
      setError(translateErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Lütfen giriş e-postanızı girin.'); return; }
    if (!resetTcNo.trim() || resetTcNo.replace(/\D/g, '').length !== 11) {
      setError('Lütfen 11 haneli TC Kimlik numaranızı girin.');
      return;
    }
    if (!resetPhone.trim() || resetPhone.replace(/\D/g, '').length < 7) {
      setError('Lütfen sistemde kayıtlı telefon numaranızı girin.');
      return;
    }

    setError('');
    setResetLoading(true);

    try {
      await userManagementService.resetPasswordWithTcPhone({
        email: email.trim().toLowerCase(),
        tcNo: resetTcNo.trim(),
        phone: resetPhone.trim(),
      });
      setResetSent(true);
    } catch (err: any) {
      setError(translateErrorMessage(err.message));
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.18),_transparent_28%),linear-gradient(135deg,_#0f172a,_#1e293b_45%,_#111827)] flex items-center justify-center p-4 relative">
      
      {/* Floating Demo Button in the top-right corner */}
      <button
        type="button"
        onClick={startDemoSession}
        className="absolute top-6 right-6 bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer z-50"
      >
        <span>✨</span>
        <span>Demoyu Dene</span>
      </button>

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 rounded-2xl mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Humanius</h1>
          <p className="text-slate-400 text-sm mt-1">İK Yönetim Sistemi</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">

          {resetSent ? (
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-full mb-3">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Parolanız Sıfırlandı!</h2>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Kimlik ve telefon doğrulamanız başarıyla tamamlandı. Parolanız geçici başlangıç şifrenize (<strong className="text-gray-900 font-mono">987654</strong>) sıfırlanmıştır.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
                <p className="text-xs text-amber-800 font-medium">
                  ℹ️ Giriş yaptıktan sonra sistem sizi doğrudan <strong>Yeni Şifre Oluşturma</strong> ekranına yönlendirecektir.
                </p>
              </div>
              <button
                onClick={() => {
                  setPassword('');
                  setResetSent(false);
                  setResetMode(false);
                }}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all text-sm"
              >
                Giriş Ekranına Dön & Oturum Aç
              </button>
            </div>
          ) : resetMode ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-cyan-600" />
                <h2 className="text-xl font-bold text-gray-800">Parola Sıfırla</h2>
              </div>
              <p className="text-gray-500 text-xs mb-6">
                Güvenlik doğrulaması için Giriş E-postası, TC Kimlik No ve Telefon numaranızı girin.
              </p>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Giriş E-postası</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm outline-none"
                      placeholder="adsoyad@humanius.net"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">TC Kimlik No</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      maxLength={11}
                      value={resetTcNo}
                      onChange={(e) => setResetTcNo(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm outline-none"
                      placeholder="11 Haneli TC Kimlik No"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kayıtlı Telefon Numarası</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={resetPhone}
                      onChange={(e) => setResetPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm outline-none"
                      placeholder="05321234567 veya 5321234567"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    * Telefonun başındaki 0 ve boşluklar es geçilir.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-r from-slate-900 via-cyan-700 to-teal-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm mt-2"
                >
                  {resetLoading ? 'Doğrulanıyor...' : 'Parolamı Geçici Şifreye (987654) Sıfırla'}
                </button>

                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError(''); }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
                >
                  ← Giriş ekranına dön
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Giriş Yap</h2>
              <p className="text-gray-500 text-sm mb-6">Hesap bilgilerinizi girin</p>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-posta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                      placeholder="adsoyad@humanius.net"
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Parola</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-slate-900 via-cyan-700 to-teal-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Giriş yapılıyor...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Giriş Yap
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setResetMode(true); setError(''); }}
                    className="text-xs text-gray-400 hover:text-cyan-600 transition-colors"
                  >
                    Parolamı unuttum
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

