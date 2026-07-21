import React, { useState } from 'react';
import { LogIn, Building2, Mail, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { signIn, startDemoSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signInError } = await signIn(email.trim(), password);
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
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Lütfen e-posta adresinizi girin.'); return; }
    setError('');
    setResetLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Sıfırlama maili gönderilemedi.');
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
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-800 mb-2">Mail Gönderildi</h2>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium text-gray-700">{email}</span> adresine parola sıfırlama bağlantısı gönderildi. Gelen kutunuzu kontrol edin.
              </p>
              <button
                onClick={() => { setResetSent(false); setResetMode(false); }}
                className="text-sm text-cyan-600 hover:underline font-medium"
              >
                ← Giriş ekranına dön
              </button>
            </div>
          ) : resetMode ? (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Parola Sıfırla</h2>
              <p className="text-gray-500 text-sm mb-6">E-postanıza sıfırlama bağlantısı gönderilecek.</p>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-posta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                      placeholder="ornek@sirket.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-r from-slate-900 via-cyan-700 to-teal-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Gönderiliyor...' : 'Sıfırlama Maili Gönder'}
                </button>

                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError(''); }}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
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
                      placeholder="ornek@sirket.com"
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
