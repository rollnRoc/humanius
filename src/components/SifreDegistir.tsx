import React, { useState } from 'react';
import { ShieldAlert, Key, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { translateErrorMessage } from '../utils/errorTranslator';

export default function SifreDegistir() {
  const { updatePassword } = useAuth();
  
  // Giriş Şifresi States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Şifre tekrarı eşleşmiyor.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
          is_first_login: false,
          password_customized: true
        }
      });
      setPasswordLoading(false);

      if (error) {
        setPasswordError(translateErrorMessage(error.message));
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('✅ Şifreniz başarıyla güncellendi.');
    } catch (err: any) {
      setPasswordLoading(false);
      setPasswordError(translateErrorMessage(err?.message || 'Bir hata oluştu'));
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Şifre Ayarları</h2>
        <p className="text-sm text-gray-500">Hesap giriş şifrenizi buradan yönetebilirsiniz.</p>
      </div>

      {/* PANEL: GİRİŞ ŞİFRESİ */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
          <Key className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-gray-800 text-base">Giriş Şifresi Güncelleme</h3>
        </div>
        
        {passwordMessage && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-3 font-semibold animate-in fade-in">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{passwordMessage}</span>
          </div>
        )}

        {passwordError && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="font-medium">{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Yeni Şifre</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl pl-3 pr-10 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm"
                placeholder="En az 6 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Yeni Şifre Tekrar</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm"
              placeholder="Şifreyi onaylayın"
            />
          </div>

          {/* Kurallar Özeti */}
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5 text-xs text-gray-500">
            <div className={`flex items-center gap-1.5 ${newPassword.length >= 6 ? 'text-emerald-600 font-semibold' : ''}`}>
              <span className="text-sm">•</span>
              <span>En az 6 karakter uzunluğunda</span>
            </div>
            <div className={`flex items-center gap-1.5 ${newPassword && confirmPassword && newPassword === confirmPassword ? 'text-emerald-600 font-semibold' : ''}`}>
              <span className="text-sm">•</span>
              <span>Şifreler birbiriyle eşleşiyor</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordLoading || !newPassword || !confirmPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {passwordLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                'Giriş Şifresini Güncelle'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
