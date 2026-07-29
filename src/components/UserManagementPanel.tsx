import React, { useEffect, useMemo, useState } from 'react';
import { Building2, KeyRound, Shield, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel } from '../auth/roles';
import { companyService } from '../services/companyService';
import { userManagementService } from '../services/userManagementService';
import { supabase } from '../lib/supabase';

interface ManagedProfile {
  id: string;
  email: string;
  full_name: string;
  company_id: string | null;
  role: string;
  created_at: string;
}

interface CompanyRow {
  id: string;
  name: string;
  city?: string;
}

const DEFAULT_PASSWORD = '123456';
const DEFAULT_SUPERADMIN_EMAIL = 'superadmin@humanius.local';

export default function UserManagementPanel() {
  const { profile, appRole, isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [profiles, setProfiles] = useState<ManagedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyCity: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: DEFAULT_PASSWORD,
  });

  const [userForm, setUserForm] = useState({
    companyId: profile?.company_id ?? '',
    fullName: '',
    email: '',
    password: DEFAULT_PASSWORD,
    role: 'user' as 'admin' | 'user',
  });

  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  const loadManagementData = async () => {
    try {
      setLoading(true);
      setError('');

      const companyRows = await companyService.getCompanies();
      setCompanies((companyRows ?? []).map((company: any) => ({
        id: company.id,
        name: company.name,
        city: company.city,
      })));

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, company_id, role, created_at')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      const allProfiles = (data ?? []) as ManagedProfile[];
      setProfiles(
        isSuperAdmin
          ? allProfiles
          : allProfiles.filter((item) => item.company_id === profile?.company_id)
      );
    } catch (loadError: any) {
      setError(loadError.message ?? 'Yönetim verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagementData();
  }, [isSuperAdmin, profile?.company_id]);

  useEffect(() => {
    if (!isSuperAdmin && profile?.company_id) {
      setUserForm((prev) => ({ ...prev, companyId: profile.company_id ?? '' }));
    }
  }, [isSuperAdmin, profile?.company_id]);

  const companyNameById = useMemo(() => {
    return companies.reduce<Record<string, string>>((acc, company) => {
      acc[company.id] = company.name;
      return acc;
    }, {});
  }, [companies]);

  const handleBootstrap = async () => {
    try {
      setBusy('bootstrap');
      setError('');
      setMessage('');

      const response = await userManagementService.bootstrapSuperAdmin({
        email: DEFAULT_SUPERADMIN_EMAIL,
        password: DEFAULT_PASSWORD,
        fullName: 'Süper Admin',
      });

      setMessage(response.message || 'Süper admin hesabı oluşturuldu.');
      await loadManagementData();
    } catch (bootstrapError: any) {
      setError(bootstrapError.message ?? 'Süper admin oluşturulamadı.');
    } finally {
      setBusy(null);
    }
  };

  const handleCreateCompany = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setBusy('company');
      setError('');
      setMessage('');

      const response = await userManagementService.createCompanyWithAdmin(companyForm);
      setMessage(response.message || 'Şirket ve admin kullanıcısı oluşturuldu.');
      setCompanyForm({
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        companyCity: '',
        adminFullName: '',
        adminEmail: '',
        adminPassword: DEFAULT_PASSWORD,
      });
      await loadManagementData();
    } catch (createError: any) {
      setError(createError.message ?? 'Şirket oluşturulamadı.');
    } finally {
      setBusy(null);
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setBusy('user');
      setError('');
      setMessage('');

      const response = await userManagementService.createCompanyUser(userForm);
      setMessage(response.message || 'Kullanıcı oluşturuldu.');
      setUserForm((prev) => ({
        ...prev,
        fullName: '',
        email: '',
        password: DEFAULT_PASSWORD,
        role: isSuperAdmin ? 'user' : prev.role,
      }));
      await loadManagementData();
    } catch (createError: any) {
      setError(createError.message ?? 'Kullanıcı oluşturulamadı.');
    } finally {
      setBusy(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const nextPassword = passwordDrafts[userId] || DEFAULT_PASSWORD;

    try {
      setBusy(userId);
      setError('');
      setMessage('');
      const response = await userManagementService.updateManagedPassword({
        userId,
        newPassword: nextPassword,
      });
      setMessage(response.message || 'Şifre güncellendi.');
    } catch (passwordError: any) {
      setError(passwordError.message ?? 'Şifre güncellenemedi.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-6 h-6 text-slate-700" />
              <h2 className="text-2xl font-bold text-gray-900">Kullanıcı ve Yetki Yönetimi</h2>
            </div>
            <p className="text-sm text-gray-600">
              Aktif rolünüz: <span className="font-semibold text-gray-800">{getRoleLabel(appRole)}</span>
            </p>
          </div>

          {isSuperAdmin && (
            <button
              onClick={handleBootstrap}
              disabled={busy === 'bootstrap'}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-60"
            >
              {busy === 'bootstrap' ? 'Kuruluyor...' : 'Süper Admin Kurulumu'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Süper Admin</p>
            <p className="font-semibold text-slate-900">{DEFAULT_SUPERADMIN_EMAIL}</p>
            <p className="text-sm text-slate-600 mt-1">Varsayılan şifre: {DEFAULT_PASSWORD}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs uppercase tracking-wide text-blue-500 mb-1">Şirket Admin</p>
            <p className="font-semibold text-blue-900">Varsayılan başlangıç şifresi</p>
            <p className="text-sm text-blue-700 mt-1">{DEFAULT_PASSWORD}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-500 mb-1">Kullanıcı</p>
            <p className="font-semibold text-emerald-900">Varsayılan başlangıç şifresi</p>
            <p className="text-sm text-emerald-700 mt-1">{DEFAULT_PASSWORD}</p>
          </div>
        </div>

        {message && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      </div>

      {isSuperAdmin && (
        <form onSubmit={handleCreateCompany} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Yeni Şirket ve Admin Oluştur</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={companyForm.companyName} onChange={(e) => setCompanyForm((prev) => ({ ...prev, companyName: e.target.value }))} placeholder="Şirket adı" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" required />
            <input value={companyForm.companyCity} onChange={(e) => setCompanyForm((prev) => ({ ...prev, companyCity: e.target.value }))} placeholder="Şehir" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            <input value={companyForm.companyEmail} onChange={(e) => setCompanyForm((prev) => ({ ...prev, companyEmail: e.target.value }))} placeholder="Şirket e-postası" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            <input value={companyForm.companyPhone} onChange={(e) => setCompanyForm((prev) => ({ ...prev, companyPhone: e.target.value }))} placeholder="Şirket telefonu" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            <input value={companyForm.adminFullName} onChange={(e) => setCompanyForm((prev) => ({ ...prev, adminFullName: e.target.value }))} placeholder="Admin adı soyadı" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" required />
            <input value={companyForm.adminEmail} onChange={(e) => setCompanyForm((prev) => ({ ...prev, adminEmail: e.target.value }))} placeholder="Admin e-postası" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" type="email" required />
            <input value={companyForm.adminPassword} onChange={(e) => setCompanyForm((prev) => ({ ...prev, adminPassword: e.target.value }))} placeholder="Admin şifresi" className="rounded-xl border border-gray-200 px-4 py-3 text-sm md:col-span-2" minLength={6} required />
          </div>

          <button type="submit" disabled={busy === 'company'} className="rounded-xl bg-blue-600 text-white px-5 py-3 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
            {busy === 'company' ? 'Oluşturuluyor...' : 'Şirketi ve Admini Oluştur'}
          </button>
        </form>
      )}

      <form onSubmit={handleCreateUser} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <UserPlus className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900">Yeni Kullanıcı Oluştur</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isSuperAdmin && (
            <select value={userForm.companyId} onChange={(e) => setUserForm((prev) => ({ ...prev, companyId: e.target.value }))} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium bg-white" required>
              <option value="">— Şirket Seçin —</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          )}
          {isSuperAdmin && (
            <select value={userForm.role} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium bg-white">
              <option value="user">Kullanıcı (Personel)</option>
              <option value="hr">İnsan Kaynakları (İK)</option>
              <option value="manager">Departman Müdürü</option>
              <option value="admin">Şirket Yöneticisi (Admin)</option>
            </select>
          )}
          <input value={userForm.fullName} onChange={(e) => setUserForm((prev) => ({ ...prev, fullName: e.target.value }))} placeholder="Ad soyad" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" required />
          <input value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="E-posta" type="email" className="rounded-xl border border-gray-200 px-4 py-3 text-sm" required />
          <input value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Başlangıç şifresi" minLength={6} className="rounded-xl border border-gray-200 px-4 py-3 text-sm md:col-span-2" required />
        </div>

        <button type="submit" disabled={busy === 'user'} className="rounded-xl bg-emerald-600 text-white px-5 py-3 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60">
          {busy === 'user' ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
        </button>
      </form>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Mevcut Kullanıcılar</h3>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-gray-500">Kullanıcılar yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kullanıcı</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Şirket</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Yeni Şifre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profiles.map((managed) => (
                  <tr key={managed.id}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{managed.full_name}</p>
                        <p className="text-sm text-gray-500">{managed.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{managed.role}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{managed.company_id ? (companyNameById[managed.company_id] || managed.company_id) : 'Sistem geneli'}</td>
                    <td className="px-6 py-4">
                      <input
                        value={passwordDrafts[managed.id] ?? DEFAULT_PASSWORD}
                        onChange={(e) => setPasswordDrafts((prev) => ({ ...prev, [managed.id]: e.target.value }))}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm w-full max-w-[220px]"
                        minLength={6}
                        type="text"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleResetPassword(managed.id)}
                        disabled={busy === managed.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        <KeyRound className="w-4 h-4" />
                        {busy === managed.id ? 'Güncelleniyor...' : 'Şifre Değiştir'}
                      </button>
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">Gösterilecek kullanıcı bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}