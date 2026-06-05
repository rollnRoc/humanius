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
} from 'lucide-react';
import { userService, type UserProfile } from '../services/userService';
import { userManagementService } from '../services/userManagementService';
import { companyService } from '../services/companyService';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel, canManageUsers } from '../auth/roles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'superadmin', label: 'Süper Yönetici', icon: Crown, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { value: 'admin',      label: 'Şirket Yöneticisi', icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'hr',         label: 'İK Uzmanı', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'manager',    label: 'Müdür', icon: UserCheck, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'employee',   label: 'Personel', icon: User, color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { value: 'user',       label: 'Kullanıcı', icon: User, color: 'text-gray-600 bg-gray-50 border-gray-200' },
];

function getRoleConfig(role: string) {
  return ROLE_OPTIONS.find((r) => r.value === role) ?? ROLE_OPTIONS[4];
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
}

const UserModal: React.FC<UserModalProps> = ({
  mode,
  initial,
  companies,
  onClose,
  onSuccess,
  currentUserId,
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
        onSuccess();
      } else if (mode === 'edit' && initial) {
        await userService.updateProfile(
          initial.id,
          {
            full_name:  form.full_name.trim(),
            role:       form.role,
            company_id: form.company_id || null,
          },
          currentUserId,
        );
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
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Adresi *</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              disabled={mode === 'edit'}
              placeholder="kullanici@sirket.com"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Şifre *</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="En az 6 karakter"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rol *</label>
            <select
              value={form.role}
              onChange={set('role')}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {ROLE_OPTIONS
                .filter((opt) => {
                  // superadmin hiçbir formdan oluşturulamaz
                  if (opt.value === 'superadmin') return false;
                  // admin yalnızca superadmin tarafından atanabilir
                  if (opt.value === 'admin' && creatorRole !== 'superadmin') return false;
                  // hr; admin atayamaz (kendine eşit hr ve altını atayabilir)
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
              value={form.company_id}
              onChange={set('company_id')}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">— Şirket Seçin —</option>
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
  const { user: currentUser, appRole } = useAuth();
  const [users, setUsers]               = useState<UserProfile[]>([]);
  const [companies, setCompanies]       = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [roleFilter, setRoleFilter]     = useState('all');
  const [modalMode, setModalMode]       = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget]     = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast]               = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, companiesData] = await Promise.all([
        userService.getAll(),
        companyService.getCompanies(),
      ]);
      setUsers(usersData);
      setCompanies((companiesData ?? []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch (err: any) {
      showToast('error', `Veriler yüklenemedi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      // Supabase client-side cannot delete auth users — inform user
      showToast('error', 'Kullanıcı silme işlemi Supabase yönetici panelinden yapılabilir.');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  // Stats
  const totalUsers      = users.length;
  const superadmins     = users.filter((u) => u.role === 'superadmin').length;
  const admins          = users.filter((u) => u.role === 'admin').length;
  const regularUsers    = users.filter((u) => !['superadmin', 'admin'].includes(u.role)).length;

  const companyNameMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  const filtered = users.filter((u) => {
    const matchSearch =
      !searchTerm ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">Sisteme kayıtlı tüm kullanıcıları yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            title="Yenile"
          >
            <RefreshCw size={16} />
          </button>
          {canManageUsers(appRole) && (
            <button
              onClick={() => { setEditTarget(null); setModalMode('create'); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <UserPlus size={16} />
              Yeni Kullanıcı
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Kullanıcı', value: totalUsers,   color: 'bg-blue-50 text-blue-700',    icon: Users },
          { label: 'Süper Yönetici',   value: superadmins,  color: 'bg-violet-50 text-violet-700', icon: Crown },
          { label: 'Yönetici',         value: admins,        color: 'bg-emerald-50 text-emerald-700', icon: Shield },
          { label: 'Diğer',            value: regularUsers, color: 'bg-gray-50 text-gray-700',    icon: User },
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Şirket
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Kayıt Tarihi
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
                            <button
                              onClick={() => { setEditTarget(u); setModalMode('edit'); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Düzenle"
                            >
                              <Edit2 size={14} />
                            </button>
                            {!isCurrentUser && appRole === 'superadmin' && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Sil"
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
          onClose={() => { setModalMode(null); setEditTarget(null); }}
          onSuccess={() => {
            setModalMode(null);
            setEditTarget(null);
            showToast('success', modalMode === 'create' ? 'Kullanıcı başarıyla oluşturuldu!' : 'Kullanıcı güncellendi!');
            loadData();
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