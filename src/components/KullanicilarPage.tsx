import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Building2,
  Mail,
  Calendar,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Crown,
  UserCheck,
  User,
  RefreshCw,
  KeyRound,
  PenTool,
  ArrowUpDown,
  Eye,
  EyeOff,
  Copy,
  Lock,
} from 'lucide-react';
import { userService, type UserProfile } from '../services/userService';
import { userManagementService } from '../services/userManagementService';
import { companyService } from '../services/companyService';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel, canManageUsers, canDeleteUsers, canAssignUserRoles, type AppRole } from '../auth/roles';
import { supabase } from '../lib/supabase';

// ─── Password Storage & Helpers ──────────────────────────────────────────────

const DEFAULT_SYSTEM_PASSWORD = '987654';
const KNOWN_PASSWORDS_KEY = 'humanius_admin_known_passwords';

function getKnownPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KNOWN_PASSWORDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') {
          const lk = k.toLowerCase().trim();
          // Eski hatalı '123456' varsayılanını temizle ve gerçek sistem şifresi olan 987654'e çevir
          if (v === '123456' && !lk.startsWith('superadmin@') && lk !== 'superadmin@humanius.net' && lk !== 'superadmin@humanius.local') {
            cleaned[lk] = '987654';
          } else {
            cleaned[lk] = v;
          }
        }
      }
      return cleaned;
    }
  } catch {}
  return {
    'muhammed.gur@humanius.net': '97370012',
    'superadmin@humanius.net': '123456',
    'superadmin@humanius.local': '123456',
  };
}

function saveKnownPassword(identifier: string, password: string) {
  try {
    const current = getKnownPasswords();
    if (identifier) {
      current[identifier.toLowerCase().trim()] = password;
      localStorage.setItem(KNOWN_PASSWORDS_KEY, JSON.stringify(current));
    }
  } catch {}
}

function resolvePasswordForUser(user: UserProfile, knownMap: Record<string, string>): string {
  const emailKey = (user.email || '').toLowerCase().trim();
  const isSuperadminAccount = user.role === 'superadmin' || emailKey.startsWith('superadmin@');

  if (emailKey === 'muhammed.gur@humanius.net') return '97370012';
  if (isSuperadminAccount) return knownMap[emailKey] || knownMap[user.id] || '123456';

  const knownVal = knownMap[emailKey] || knownMap[user.id];
  // Kullanıcı için bilinen özel bir şifre varsa ve eski varsayılan 123456 değilse onu döndür
  if (knownVal && knownVal !== '123456') {
    return knownVal;
  }

  return DEFAULT_SYSTEM_PASSWORD; // '987654'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'admin',      label: 'Şirket Yöneticisi', icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'hr',         label: 'İK Uzmanı', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'manager',    label: 'Birim / Departman Amiri', icon: UserCheck, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'employee',   label: 'Personel', icon: User, color: 'text-gray-600 bg-gray-50 border-gray-200' },
];

function getRoleConfig(role: string) {
  if (role === 'superadmin') {
    return { value: 'superadmin', label: 'Süper Yönetici', icon: Crown, color: 'text-violet-600 bg-violet-50 border-violet-200' };
  }
  return ROLE_OPTIONS.find((r) => r.value === role) ?? ROLE_OPTIONS[3];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const cfg = getRoleConfig(role);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
};

// ─── Signature Canvas ────────────────────────────────────────────────────────
interface SignatureCanvasProps {
  onChange: (value: string) => void;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4c1d95';
  }, []);

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
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
    onChange('');
  };

  return (
    <div className="rounded-lg border border-purple-200 bg-white p-2">
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
        className="w-full rounded-md border border-dashed border-purple-300 bg-purple-50/30 touch-none"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={clearCanvas}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Temizle
        </button>
      </div>
    </div>
  );
};

// ─── Security Modal ──────────────────────────────────────────────────────────
interface SecurityModalProps {
  user: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}

const SecurityModal: React.FC<SecurityModalProps> = ({ user, onClose, onSuccess }) => {
  const [securityPasscode, setSecurityPasscode] = useState('');
  const [securitySignature, setSecuritySignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const settings = await userService.getUserSecuritySettings(user);
        setSecurityPasscode(settings.approvalPasscode ?? '');
        setSecuritySignature(settings.approvalSignature ?? '');
      } catch (err: any) {
        setError(err.message ?? 'Güvenlik ayarları yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (securityPasscode && securityPasscode.length < 4) {
      setError('Onay şifresi en az 4 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      await userService.updateUserSecuritySettings(user, {
        approvalPasscode: securityPasscode.trim() || null,
        approvalSignature: securitySignature.trim() || null,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? 'Ayarlar kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
              <KeyRound size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">İmza & Onay Şifresi</h2>
              <p className="text-xs text-gray-500">{user.full_name} • {user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Onay Şifresi</label>
              <input
                type="text"
                value={securityPasscode}
                onChange={(e) => setSecurityPasscode(e.target.value)}
                placeholder="Örn: 1234"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setSecurityPasscode(Math.floor(100000 + Math.random() * 900000).toString())}
                className="w-full py-2.5 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <KeyRound size={13} />
                Şifre Oluştur
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Dijital İmza</label>
            <SignatureCanvas onChange={setSecuritySignature} />
            {securitySignature.startsWith('data:image') && (
              <div className="mt-2 rounded-xl border border-gray-150 p-2 bg-gray-50/50">
                <p className="mb-1 text-[10px] font-bold text-gray-500">İmza Önizleme</p>
                <img src={securitySignature} alt="İmza Önizleme" className="h-12 rounded border border-gray-200 bg-white" />
              </div>
            )}
            <p className="mt-2 text-[10px] text-gray-400">İsterseniz metin olarak da imza kaydı girebilirsiniz.</p>
            <textarea
              value={securitySignature}
              onChange={(e) => setSecuritySignature(e.target.value)}
              rows={2}
              placeholder="İmza adı veya dijital imza verisi"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── New / Edit User Modal ────────────────────────────────────────────────────

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  company_id: string;
}

interface UserModalProps {
  mode: 'create' | 'edit';
  initial?: UserProfile | null;
  companies: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: string;
  isSuperAdmin?: boolean;
  onPasswordSaved?: (email: string, pass: string) => void;
}

const UserModal: React.FC<UserModalProps> = ({
  mode,
  initial,
  companies,
  onClose,
  onSuccess,
  currentUserId,
  isSuperAdmin = false,
  onPasswordSaved,
}) => {
  const { profile: creatorProfile } = useAuth();
  const creatorRole = creatorProfile?.role ?? 'employee';
  const [form, setForm] = useState<UserFormData>({
    email:      initial?.email      ?? '',
    password:   '',
    full_name:  initial?.full_name  ?? '',
    role:       initial?.role       ?? 'employee',
    company_id: initial?.company_id ?? '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  const set = (field: keyof UserFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!form.full_name.trim()) { setError('Ad Soyad zorunludur'); return; }
    if (!form.email.trim())     { setError('Email zorunludur'); return; }
    if (mode === 'create' && form.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır'); return;
    }
    if (mode === 'edit' && form.password && form.password.trim().length < 6) {
      setError('Şifre en az 6 karakter olmalıdır'); return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        await userManagementService.createCompanyUser({
          fullName:  form.full_name.trim(),
          email:     form.email.trim(),
          password:  form.password,
          role:      form.role as 'admin' | 'manager' | 'employee' | 'hr' | 'user',
          companyId: form.company_id || undefined,
        });
        if (form.password) {
          saveKnownPassword(form.email.trim(), form.password);
          onPasswordSaved?.(form.email.trim(), form.password);
        }
        onSuccess();
      } else if (mode === 'edit' && initial) {
        const trimmedEmail = form.email.trim().toLowerCase();
        const oldEmail = (initial.email || '').trim().toLowerCase();

        // 1. Profil, Auth (Sistem Giriş Kullanıcı Adı) ve Personel kartını tam senkronize güncelle
        await userService.updateProfile(
          initial.id,
          {
            full_name:   form.full_name.trim(),
            role:        form.role,
            company_id:  form.company_id || null,
            email:       trimmedEmail || initial.email,
            oldEmail:    oldEmail,
            oldFullName: initial.full_name,
          },
          currentUserId,
        );

        // 2. Yeni şifre girildiyse
        if (form.password && form.password.trim().length >= 6) {
          const pass = form.password.trim();
          await userManagementService.directResetPassword({
            userId: initial.id,
            email: trimmedEmail || oldEmail,
            newPassword: pass,
            fullName: form.full_name.trim(),
          });
          saveKnownPassword(trimmedEmail || oldEmail, pass);
          saveKnownPassword(initial.id, pass);
          onPasswordSaved?.(trimmedEmail || oldEmail, pass);
        }
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message ?? 'İşlem başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              {mode === 'create'
                ? <UserPlus size={18} className="text-white" />
                : <Edit2 size={18} className="text-white" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {mode === 'create' ? 'Yeni Kullanıcı Ekle' : 'Kullanıcıyı Düzenle'}
              </h2>
              <p className="text-xs text-gray-500">
                {mode === 'create' ? 'Sisteme yeni kullanıcı tanımla' : initial?.email}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-2.5 rounded-xl">
              <Check size={15} className="mt-0.5 shrink-0" />
              <span>{info}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ad Soyad *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={set('full_name')}
              placeholder="Örn: Ahmet Yılmaz"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">Sistem Giriş Kullanıcı Adı (Giriş E-postası) *</label>
              {mode === 'edit' && isSuperAdmin && (
                <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                  Değiştirilebilir
                </span>
              )}
            </div>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              disabled={mode === 'edit' && !isSuperAdmin}
              placeholder="adsoyad@humanius.net"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 font-mono"
              required
            />
          </div>

          {(mode === 'create' || isSuperAdmin) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  {mode === 'create' ? 'Giriş Şifresi *' : '🔑 Giriş Şifresini Güncelle'}
                </label>
                {mode === 'edit' && (
                  <span className="text-[11px] text-purple-600 font-medium">Boş bırakılırsa mevcut şifre korunur</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder={mode === 'create' ? 'En az 6 karakter' : 'Yeni şifre belirlemek için girin...'}
                  minLength={form.password ? 6 : undefined}
                  className="w-full border border-gray-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required={mode === 'create'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  title={showPassword ? 'Gizle' : 'Göster'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rol *</label>
            <select
              value={form.role}
              onChange={set('role')}
              disabled={initial?.role === 'superadmin' && creatorRole !== 'superadmin'}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
            >
              {(form.role === 'superadmin' || initial?.role === 'superadmin') && (
                <option value="superadmin">👑 Süper Yönetici</option>
              )}
              {ROLE_OPTIONS
                .filter((opt) => {
                  if (creatorRole === 'superadmin') return true;
                  if (opt.value === 'admin' && creatorRole !== 'superadmin') return false;
                  if (opt.value === 'admin' && creatorRole === 'hr') return false;
                  return true;
                })
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Şirket</label>
            <select
              value={form.role === 'superadmin' ? '' : form.company_id}
              onChange={set('company_id')}
              disabled={form.role === 'superadmin'}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">
                {form.role === 'superadmin' ? '— Şirketsiz (Tüm Şirketlere Yetkili) —' : '— Şirket Seçin —'}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : mode === 'create' ? 'Kullanıcı Oluştur' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Quick Password Change Modal ──────────────────────────────────────────────

interface QuickPasswordModalProps {
  user: UserProfile;
  currentPassword?: string;
  onClose: () => void;
  onSuccess: (newPassword: string) => void;
}

const QuickPasswordModal: React.FC<QuickPasswordModalProps> = ({
  user,
  currentPassword,
  onClose,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await userManagementService.directResetPassword({
        userId: user.id,
        email: user.email,
        newPassword: newPassword.trim(),
        fullName: user.full_name,
      });
      saveKnownPassword(user.email, newPassword.trim());
      saveKnownPassword(user.id, newPassword.trim());
      onSuccess(newPassword.trim());
    } catch (err: any) {
      setError(err.message || 'Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-purple-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm">
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Şifre Değiştir</h2>
              <p className="text-xs text-gray-500 font-mono truncate max-w-[240px]">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Kullanıcı:</span>
              <span className="font-semibold text-slate-800">{user.full_name}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Mevcut Bilinen Şifre:</span>
              <span className="font-mono font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded border border-purple-200/60">
                {currentPassword || '987654'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Yeni Şifre *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifreyi girin (en az 6 karakter)"
                className="w-full border border-gray-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewPassword('987654')}
              className="flex-1 py-1.5 text-xs font-medium border border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 rounded-lg text-gray-700 transition-colors"
            >
              Varsayılan (987654)
            </button>
            <button
              type="button"
              onClick={() => setNewPassword(Math.floor(100000 + Math.random() * 900000).toString())}
              className="flex-1 py-1.5 text-xs font-medium border border-gray-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 rounded-lg text-gray-700 transition-colors"
            >
              🎲 6 Haneli Üret
            </button>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || newPassword.length < 6}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : 'Şifreyi Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete Confirm ───────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  user: UserProfile;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ user, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Trash2 size={18} className="text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Kullanıcıyı Sil</h3>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-5">
        <strong>{user.full_name}</strong> adlı kullanıcı silinecek. Bu işlem geri alınamaz.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Vazgeç
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : 'Evet, Sil'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const KullanicilarPage: React.FC = () => {
  const { user: currentUser, appRole, profile } = useAuth();
  const [users, setUsers]               = useState<UserProfile[]>([]);
  const [companies, setCompanies]       = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [totalEmployeesCount, setTotalEmployeesCount] = useState<number>(0);
  const [syncing, setSyncing]           = useState<boolean>(false);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [roleFilter, setRoleFilter]     = useState('all');
  type SortField = 'name' | 'role' | 'company' | 'date';
  const [sortField, setSortField]       = useState<SortField>('name');
  const [sortOrder, setSortOrder]       = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const [modalMode, setModalMode]       = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget]     = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast]               = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [securityTargetUser, setSecurityTargetUser] = useState<UserProfile | null>(null);

  // Süper Yönetici Şifre Yönetim State'leri
  const [knownPasswords, setKnownPasswords] = useState<Record<string, string>>(() => getKnownPasswords());
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState<boolean>(false);
  const [passwordTarget, setPasswordTarget] = useState<UserProfile | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const copyToClipboard = (text: string, key: string, label: string = 'Panoya kopyalandı!') => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      showToast('success', label);
    } catch {
      showToast('error', 'Kopyalama başarısız oldu');
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const toggleShowAllPasswords = () => {
    setShowAllPasswords((prev) => !prev);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const isSuper = profile?.role === 'superadmin';
      const targetCompanyId = isSuper ? undefined : (profile?.company_id || undefined);

      const [usersData, companiesData, empsData] = await Promise.all([
        userService.getAll(),
        companyService.getCompanies(),
        employeeService.getAll(targetCompanyId),
      ]);
      
      setUsers(usersData);
      setCompanies((companiesData ?? []).map((c: any) => ({ id: c.id, name: c.name })));
      const empCount = empsData?.length ?? 0;
      setTotalEmployeesCount(empCount);

      if (empsData && Array.isArray(empsData)) {
        setKnownPasswords((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const emp of empsData) {
            const em = (emp.email || '').toLowerCase().trim();
            if (emp.approval_passcode && typeof emp.approval_passcode === 'string' && emp.approval_passcode.length < 25 && !emp.approval_passcode.startsWith('$2')) {
              if (em && next[em] !== emp.approval_passcode) {
                next[em] = emp.approval_passcode;
                changed = true;
              }
              if (emp.id && next[emp.id] !== emp.approval_passcode) {
                next[emp.id] = emp.approval_passcode;
                changed = true;
              }
            }
          }
          if (changed) {
            try {
              localStorage.setItem(KNOWN_PASSWORDS_KEY, JSON.stringify(next));
            } catch {}
          }
          return next;
        });
      }
    } catch (err: any) {
      showToast('error', `Veriler yüklenemedi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [profile?.role, profile?.company_id]);

  const handleSyncWithEmployees = async () => {
    setSyncing(true);
    try {
      const res = await userManagementService.syncAllAccountsToNet();
      showToast('success', res?.message || 'Tüm personel ve kullanıcı hesapları eşitlendi.');
      await loadData();
    } catch (err: any) {
      showToast('error', `Senkronizasyon hatası: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('kullanicilar-page-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await userManagementService.deleteUserAndEmployee({
        userId: deleteTarget.id,
        email: deleteTarget.email,
      });
      showToast('success', 'Kullanıcı hesabı ve bağlı personel kartı başarıyla silindi.');
      await loadData();
    } catch (err: any) {
      showToast('error', `Silme işlemi başarısız: ${err.message}`);
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const isSuper = profile?.role === 'superadmin' || appRole === 'superadmin';
  const companyUsers = users.filter((u) => {
    if (!isSuper && profile?.company_id) {
      return u.company_id === profile.company_id;
    }
    if (selectedCompanyId !== 'all') {
      return u.company_id === selectedCompanyId;
    }
    return true;
  });

  // Stats
  const totalUsers      = companyUsers.length;
  const superadmins     = companyUsers.filter((u) => u.role === 'superadmin').length;
  const admins          = companyUsers.filter((u) => u.role === 'admin').length;
  const regularUsers    = companyUsers.filter((u) => !['superadmin', 'admin'].includes(u.role)).length;

  const companyNameMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  const filtered = companyUsers
    .filter((u) => {
      const matchSearch =
        !searchTerm ||
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.full_name || '').localeCompare(b.full_name || '', 'tr');
          break;
        case 'role': {
          const roleA = getRoleConfig(a.role).label;
          const roleB = getRoleConfig(b.role).label;
          cmp = roleA.localeCompare(roleB, 'tr');
          break;
        }
        case 'company': {
          const compA = a.company_id ? (companyNameMap[a.company_id] || '') : '';
          const compB = b.company_id ? (companyNameMap[b.company_id] || '') : '';
          cmp = compA.localeCompare(compB, 'tr');
          break;
        }
        case 'date':
          cmp = (a.created_at || '').localeCompare(b.created_at || '');
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
            ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
        >
          {toast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">Sisteme kayıtlı tüm kullanıcıları ve erişim hesaplarını yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageUsers(appRole) && (
            <button
              onClick={() => { setEditTarget(null); setModalMode('create'); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Yeni Kullanıcı Ekle</span>
            </button>
          )}
          <button
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            title="Yenile"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Toplam Kullanıcı',   value: totalUsers,            color: 'bg-blue-50 text-blue-700',      icon: Users },
          { label: 'Yönetici Hesabı',    value: admins + superadmins,  color: 'bg-emerald-50 text-emerald-700', icon: Shield },
          { label: 'Personel Hesabı',    value: regularUsers,          color: 'bg-gray-50 text-gray-700',      icon: User },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-2xl p-4 ${stat.color} border border-current/10`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold">{stat.value}</span>
                <Icon size={20} className="opacity-60" />
              </div>
              <p className="text-xs font-medium opacity-70">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Süper Yönetici Şifre ve Giriş Bilgileri Yönetim Paneli */}
      {isSuper && (
        <div className="flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r from-purple-50 via-indigo-50/40 to-blue-50 border border-purple-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <KeyRound size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-purple-950">Süper Yönetici Giriş & Şifre Kontrolü</h3>
                <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-100/90 border border-purple-200 px-2 py-0.5 rounded-full">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-purple-800/80 mt-0.5">
                Tüm kullanıcıların e-posta (kullanıcı adı) ve şifrelerini aşağıdaki tablodan görebilir, kopyalayabilir veya anahtar simgesi ile anında değiştirebilirsiniz.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleShowAllPasswords}
              className="px-3.5 py-2 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-100/60 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Tüm şifrelerin maskelemesini aç/kapat"
            >
              {showAllPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showAllPasswords ? 'Tüm Şifreleri Gizle' : 'Tüm Şifreleri Göster'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="İsim veya email ara..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {companies.length > 1 && (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Şirketler ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Roller</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1.5 border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer shrink-0"
            title={sortOrder === 'asc' ? 'A → Z Sıralı (Tersine çevirmek için tıklayın: Z → A)' : 'Z → A Sıralı (Düz çevirmek için tıklayın: A → Z)'}
          >
            <ArrowUpDown size={15} className="text-blue-600" />
            <span>{sortOrder === 'asc' ? 'A → Z Sırala' : 'Z → A Sırala'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Kullanıcı bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th
                    onClick={() => handleSort('name')}
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    title={sortField === 'name' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'Kullanıcı adına göre sırala'}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Kullanıcı</span>
                      {sortField === 'name' ? (
                        <>
                          <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-300 text-xs">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('role')}
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    title={sortField === 'role' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'Role göre sırala'}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Rol</span>
                      {sortField === 'role' ? (
                        <>
                          <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-300 text-xs">↕</span>
                      )}
                    </div>
                  </th>
                  {isSuper && (
                    <th className="text-left px-5 py-3 text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-100/50 border-x border-purple-200/50">
                      <div className="flex items-center gap-1.5">
                        <KeyRound size={13} className="text-purple-600" />
                        <span>Kullanıcı Adı & Şifre</span>
                      </div>
                    </th>
                  )}
                  <th
                    onClick={() => handleSort('company')}
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    title={sortField === 'company' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'Şirkete göre sırala'}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Şirket</span>
                      {sortField === 'company' ? (
                        <>
                          <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-300 text-xs">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('date')}
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    title={sortField === 'date' ? (sortOrder === 'asc' ? 'Eskiden Yeniye' : 'Yeniden Eskiye') : 'Kayıt tarihine göre sırala'}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Kayıt Tarihi</span>
                      {sortField === 'date' ? (
                        <>
                          <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {sortOrder === 'asc' ? '0-9' : '9-0'}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-300 text-xs">↕</span>
                      )}
                    </div>
                  </th>
                  {canManageUsers(appRole) && (
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => {
                  const initials = u.full_name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();
                  const isCurrentUser = u.id === currentUser?.id;
                  const cfg = getRoleConfig(u.role);
                  const avatarColors = [
                    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
                    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
                  ];
                  const colorIdx = u.email.charCodeAt(0) % avatarColors.length;
                  const userPassword = resolvePasswordForUser(u, knownPasswords);
                  const isPassVisible = showAllPasswords || visiblePasswords[u.id];

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50/80 transition-colors ${isCurrentUser ? 'bg-blue-50/40' : ''}`}
                    >
                      {/* User info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl ${avatarColors[colorIdx]} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                          >
                            {initials || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-gray-900">{u.full_name}</span>
                              {isCurrentUser && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Sen</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Mail size={10} />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5">
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Superadmin Credentials Column */}
                      {isSuper && (
                        <td className="px-5 py-3.5 bg-purple-50/30 border-x border-purple-100/70">
                          <div className="space-y-1.5 min-w-[225px]">
                            {/* Kullanıcı Adı (Email) */}
                            <div className="flex items-center justify-between gap-1.5 bg-white border border-purple-100/90 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
                              <span className="font-mono text-gray-700 truncate max-w-[160px]" title={u.email}>
                                {u.email}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(u.email, `email-${u.id}`, 'Kullanıcı adı kopyalandı!')}
                                className="text-gray-400 hover:text-purple-700 p-0.5 transition-colors shrink-0 cursor-pointer"
                                title="Kullanıcı adını (e-posta) kopyala"
                              >
                                {copiedKey === `email-${u.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              </button>
                            </div>

                            {/* Şifre */}
                            <div className="flex items-center justify-between gap-1.5 bg-purple-50/90 border border-purple-200/90 rounded-lg px-2.5 py-1 text-xs">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="text-[10px] uppercase font-bold text-purple-600 shrink-0">ŞİFRE:</span>
                                <span className="font-mono font-bold text-purple-950 tracking-wider">
                                  {isPassVisible ? userPassword : '••••••••'}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(u.id)}
                                  className="text-purple-400 hover:text-purple-800 p-1 rounded hover:bg-purple-100 transition-colors cursor-pointer"
                                  title={isPassVisible ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                                >
                                  {isPassVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(userPassword, `pass-${u.id}`, 'Şifre kopyalandı!')}
                                  className="text-purple-400 hover:text-purple-800 p-1 rounded hover:bg-purple-100 transition-colors cursor-pointer"
                                  title="Şifreyi Kopyala"
                                >
                                  {copiedKey === `pass-${u.id}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPasswordTarget(u)}
                                  className="text-purple-700 hover:text-white hover:bg-purple-600 p-1 rounded transition-colors ml-0.5 border border-purple-200 hover:border-purple-600 cursor-pointer shadow-2xs"
                                  title="Şifreyi Hızlı Değiştir"
                                >
                                  <KeyRound size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Company */}
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        {u.company_id ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Building2 size={13} className="text-gray-400" />
                            <span>{companyNameMap[u.company_id] ?? '—'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar size={11} />
                          <span>{formatDate(u.created_at)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      {canManageUsers(appRole) && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isSuper && (
                              <button
                                onClick={() => setPasswordTarget(u)}
                                className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                title="Giriş Şifresini Değiştir"
                              >
                                <KeyRound size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => { setEditTarget(u); setModalMode('edit'); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Kullanıcı ve Giriş Bilgilerini Düzenle"
                            >
                              <Edit2 size={14} />
                            </button>
                            {!isCurrentUser && canDeleteUsers(appRole) && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Kullanıcıyı Sil"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
            {filtered.length} kullanıcı gösteriliyor
            {filtered.length !== users.length && ` (toplam ${users.length})`}
          </div>
        )}
      </div>

      {/* Modals */}
      {modalMode && (
        <UserModal
          mode={modalMode}
          initial={editTarget}
          companies={companies}
          currentUserId={currentUser?.id ?? ''}
          isSuperAdmin={isSuper}
          onPasswordSaved={(email, pass) => {
            setKnownPasswords((prev) => ({ ...prev, [email.toLowerCase().trim()]: pass }));
          }}
          onClose={() => { setModalMode(null); setEditTarget(null); }}
          onSuccess={() => {
            setModalMode(null);
            setEditTarget(null);
            showToast('success', modalMode === 'create' ? 'Kullanıcı başarıyla oluşturuldu!' : 'Kullanıcı ve giriş bilgileri güncellendi!');
            loadData();
          }}
        />
      )}

      {passwordTarget && (
        <QuickPasswordModal
          user={passwordTarget}
          currentPassword={resolvePasswordForUser(passwordTarget, knownPasswords)}
          onClose={() => setPasswordTarget(null)}
          onSuccess={(newPassword) => {
            setKnownPasswords((prev) => ({
              ...prev,
              [passwordTarget.email.toLowerCase().trim()]: newPassword,
              [passwordTarget.id]: newPassword,
            }));
            setPasswordTarget(null);
            showToast('success', `${passwordTarget.full_name} için yeni şifre tanımlandı: ${newPassword}`);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}


    </div>
  );
};

export default KullanicilarPage;