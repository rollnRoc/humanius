import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Key, Eye, EyeOff, Check, X, ShieldCheck, PenTool, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';

interface SignatureCanvasProps {
  onChange: (value: string) => void;
  initialValue?: string | null;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ onChange, initialValue }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4f46e5'; // Indigo

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = initialValue;
    }
  }, [initialValue]);

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSignature(true);
  };

  const getPoint = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const start = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const point = getPoint(event);
    if (!point) return;
    draw(point.x, point.y);
  };

  const move = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getPoint(event);
    if (!point) return;
    draw(point.x, point.y);
  };

  const stop = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.beginPath();
    onChange(canvas.toDataURL('image/png'));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setHasSignature(false);
    onChange('');
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3">
      <canvas
        ref={canvasRef}
        width={520}
        height={150}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={stop}
        className="w-full rounded-lg border border-dashed border-indigo-200 bg-indigo-50/20 touch-none cursor-crosshair"
      />
      <div className="mt-2 flex justify-between items-center">
        <span className="text-[11px] text-gray-400">Fareniz veya dokunmatik ekranınız ile imzalayın.</span>
        <button
          type="button"
          onClick={clearCanvas}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          Temizle
        </button>
      </div>
    </div>
  );
};

export default function SifreDegistir() {
  const { user, profile, updatePassword } = useAuth();
  
  // Giriş Şifresi States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Onay Şifresi & İmza States
  const [securityPasscode, setSecurityPasscode] = useState('');
  const [securitySignature, setSecuritySignature] = useState('');
  const [hasEmployeeRecord, setHasEmployeeRecord] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  // Yükleme sırasında
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      try {
        const settings = await userService.getUserSecuritySettings(profile || (user as any));
        if (settings.employeeId) {
          setHasEmployeeRecord(true);
          setSecurityPasscode(settings.approvalPasscode ?? '');
          setSecuritySignature(settings.approvalSignature ?? '');
        }
      } catch (err: any) {
        console.error("Güvenlik ayarları yüklenemedi:", err);
      } finally {
        setInitialLoading(false);
      }
    };
    loadSettings();
  }, [user, profile]);

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
    const { error } = await updatePassword(newPassword);
    setPasswordLoading(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('Şifreniz başarıyla güncellendi.');
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (securityPasscode && securityPasscode.length < 4) {
      setSecurityError('Onay şifresi en az 4 karakter olmalıdır.');
      return;
    }

    setSecurityLoading(true);
    try {
      await userService.updateUserSecuritySettings(profile || (user as any), {
        approvalPasscode: securityPasscode.trim() || null,
        approvalSignature: securitySignature.trim() || null,
      });
      setSecuritySuccess('İmza ve onay şifresi ayarlarınız başarıyla kaydedildi.');
    } catch (err: any) {
      setSecurityError(err.message ?? 'Güvenlik ayarları güncellenemedi.');
    } finally {
      setSecurityLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-gray-800">Şifre ve Güvenlik Ayarları</h2>
        <p className="text-sm text-gray-500">Hesap giriş şifrenizi, dijital onay imzanızı ve işlem onay şifrenizi buradan yönetebilirsiniz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PANEL 1: GİRİŞ ŞİFRESİ */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <Key className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-800 text-base">Giriş Şifresi Güncelleme</h3>
            </div>
            
            {passwordMessage && (
              <div className="mb-4 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span className="font-medium">{passwordMessage}</span>
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword || !confirmPassword}
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

        {/* PANEL 2: ONAY ŞİFRESİ & İMZA */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <PenTool className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-800 text-base">Dijital Onay Şifresi & İmza</h3>
            </div>

            {!hasEmployeeRecord ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
                  <span className="font-bold">Personel Kartı Bulunamadı</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  İmza ve doğrulama şifresi işlemleri sadece sistemde kayıtlı bir personel kartıyla eşleşen kullanıcı hesaplarında aktiftir. İK departmanınızdan size bir personel kartı atamasını isteyebilirsiniz.
                </p>
              </div>
            ) : (
              <>
                {securitySuccess && (
                  <div className="mb-4 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{securitySuccess}</span>
                  </div>
                )}

                {securityError && (
                  <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span className="font-medium">{securityError}</span>
                  </div>
                )}

                <form onSubmit={handleSecuritySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">İşlem Onay Şifresi (PIN)</label>
                    <div className="relative">
                      <input
                        type={showPasscode ? 'text' : 'password'}
                        value={securityPasscode}
                        onChange={(e) => setSecurityPasscode(e.target.value)}
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl pl-3 pr-24 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-mono tracking-widest"
                        placeholder="••••••"
                        maxLength={12}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowPasscode(!showPasscode)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSecurityPasscode(Math.floor(100000 + Math.random() * 900000).toString())}
                          className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 px-2 py-1 rounded-lg font-bold transition-colors"
                        >
                          Oluştur
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Bordro onayları ve dijital teslim evraklarını imzalarken bu şifreyi kullanacaksınız.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dijital İmzanız</label>
                    <SignatureCanvas
                      onChange={setSecuritySignature}
                      initialValue={securitySignature}
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={securityLoading}
                      className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {securityLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        'İmza ve Onay Şifresini Kaydet'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
