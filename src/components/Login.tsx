import React, { useState, useEffect } from 'react';
import { LogIn, Building2, Mail, Lock, CheckCircle, Phone, CreditCard, ShieldCheck, UserCheck, X, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, RememberedAccount } from '../contexts/AuthContext';
import { translateErrorMessage } from '../utils/errorTranslator';
import { userManagementService } from '../services/userManagementService';

function getInitials(name: string): string {
  if (!name) return 'H';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Login() {
  const { signIn, startDemoSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [resetTcNo, setResetTcNo] = useState('');
  const [resetPhone, setResetPhone] = useState('');

  // Hatırlanan hesap state'i
  const [rememberedAccount, setRememberedAccount] = useState<RememberedAccount | null>(null);
  const [showFullForm, setShowFullForm] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('humanius_remembered_account');
      if (saved) {
        const parsed: RememberedAccount = JSON.parse(saved);
        if (parsed && parsed.email && parsed.fullName) {
          setRememberedAccount(parsed);
          setEmail(parsed.email);
        }
      }
    } catch {}
  }, []);

  const handleForgetAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem('humanius_remembered_account');
    } catch {}
    setRememberedAccount(null);
    setShowFullForm(true);
    setEmail('');
    setPassword('');
  };

  async function handleLogin(e: React.FormEvent, targetInput?: string) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const rawInput = (targetInput || email).trim();
    if (!rawInput) {
      setError('Lütfen e-posta veya ad soyadınızı girin.');
      setLoading(false);
      return;
    }

    let loginEmail = rawInput.toLowerCase();

    // If identifier doesn't contain @, resolve to actual profile email
    if (!rawInput.includes('@')) {
      try {
        const { data: resData } = await supabase.functions.invoke('user-management', {
          body: { operation: 'resolve_identifier', identifier: rawInput }
        });
        if (resData && resData.email) {
          loginEmail = resData.email;
        } else {
          const asciiName = rawInput.toLowerCase()
            .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
            .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/\s+/g, '.');
          loginEmail = `${asciiName}@humanius.net`;
        }
      } catch (resErr) {
        console.warn("Identifier resolution error:", resErr);
        const asciiName = rawInput.toLowerCase()
          .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
          .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
          .replace(/\s+/g, '.');
        loginEmail = `${asciiName}@humanius.net`;
      }
    }

    try {
      const { error: signInError } = await signIn(loginEmail, password);
      if (signInError) {
        setError(
          signInError.message.includes('Invalid login credentials')
            ? 'Giriş bilgileri veya parola hatalı.'
            : signInError.message
        );
        return;
      }

      // Giriş başarılı - AuthContext oturumu otomatik yönetecektir
    } catch (err: any) {
      setError(translateErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(targetEmail: string) {
    setError('');
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('user-management', {
        body: { operation: 'quick_login', email: targetEmail }
      });
      if (fnError || !data?.token_hash) {
        throw new Error(data?.error || 'Hızlı giriş işlemi gerçekleştirilemedi.');
      }
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink'
      });
      if (verifyError) {
        throw verifyError;
      }
    } catch (err: any) {
      console.error('Quick login error:', err);
      setError('Hızlı giriş bağlantısı kurulamadı. Lütfen standart parola ile giriş yapın.');
      setShowFullForm(true);
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Humanius</h1>
          <p className="text-slate-400 text-sm mt-1">İK Yönetim Sistemi</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 relative">

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
          ) : rememberedAccount && !showFullForm ? (
            /* ── Hızlı Giriş Kartı (Kayıtlı Kullanıcı) ── */
            <div>
              {/* Cihazdan Unut Butonu */}
              <button
                type="button"
                onClick={handleForgetAccount}
                title="Bu hesabı bu cihazdan kaldır"
                className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-6">
                {/* İsim Baş Harflerinden Oluşan Şık Avatar Rozeti */}
                <div className="relative inline-block mx-auto mb-3">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 via-cyan-600 to-teal-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-cyan-500/25 ring-4 ring-white">
                    {getInitials(rememberedAccount.fullName)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow">
                    <UserCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 leading-snug">
                  {rememberedAccount.fullName}
                </h2>
                
                {rememberedAccount.companyName && (
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold text-slate-700 mt-2">
                    <Building2 className="w-3.5 h-3.5 text-cyan-600" />
                    <span>{rememberedAccount.companyName}</span>
                  </div>
                )}
                
                <p className="text-xs text-gray-400 font-mono mt-1.5">
                  {rememberedAccount.email}
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-3.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin(rememberedAccount.email)}
                  disabled={loading}
                  className="w-full group bg-gradient-to-r from-slate-900 via-cyan-700 to-teal-600 text-white py-3.5 px-5 rounded-2xl font-bold hover:shadow-xl hover:shadow-cyan-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between text-sm active:scale-[0.99] cursor-pointer"
                >
                  {loading ? (
                    <div className="w-full flex items-center justify-center gap-2 py-1">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Oturum Açılıyor...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shadow-inner">
                          <LogIn className="w-4 h-4 text-cyan-200" />
                        </div>
                        <div>
                          <p className="text-[11px] text-cyan-200 font-normal leading-tight">Tek Tıkla Oturum Aç</p>
                          <p className="text-sm font-bold text-white leading-tight mt-0.5">{rememberedAccount.fullName.split(' ')[0]} olarak devam et</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowFullForm(true); setError(''); }}
                    className="text-xs text-slate-500 hover:text-cyan-700 font-semibold transition-colors py-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Farklı bir hesapla giriş yap</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Standart E-posta & Parola Formu ── */
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-posta veya Ad Soyad</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                      placeholder="adsoyad@humanius.net veya Ad Soyad"
                      required
                      autoFocus={!rememberedAccount}
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

                <div className="flex items-center justify-between pt-1">
                  {rememberedAccount ? (
                    <button
                      type="button"
                      onClick={() => { setShowFullForm(false); setError(''); }}
                      className="text-xs text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                    >
                      ← {rememberedAccount.fullName} ile gir
                    </button>
                  ) : <span />}

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

