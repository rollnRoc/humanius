import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings, Shield, Calculator, GraduationCap, FileText, Building, AlertTriangle, CheckCircle, Clock, Users, Calendar, DollarSign, TrendingUp, Plus, Pencil, Trash2, X, KeyRound, PenTool } from 'lucide-react';
import { VARSAYILAN_SISTEM_AYARLARI, SISTEM_PARAMETRELERI } from '../data/sistemAyarlari';
import { SistemAyarlari as ISistemAyarlari, SistemParametresi, ParametreKategorisi } from '../types/sistemAyarlari';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel } from '../auth/roles';
import { companyService } from '../services/companyService';
import { userService, type UserProfile } from '../services/userService';
import { userManagementService } from '../services/userManagementService';

interface CompanyRow {
  id: string;
  name: string;
  city: string;
  address: string;
  tax_number: string;
  sgk_sicil_no: string;
  phone: string;
  email: string;
}

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
          className="rounded-md border border-purple-200 bg-white px-2 py-1 text-[11px] font-semibold text-purple-700"
        >
          İmzayı Temizle
        </button>
      </div>
    </div>
  );
};

const SistemAyarlari: React.FC = () => {
  const { user, profile, appRole, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<ParametreKategorisi>('is_kanunu');
  const [sistemAyarlari, setSistemAyarlari] = useState<ISistemAyarlari>(VARSAYILAN_SISTEM_AYARLARI);
  const [parametreler, setParametreler] = useState<SistemParametresi[]>(SISTEM_PARAMETRELERI);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [manageTab, setManageTab] = useState<'kullanicilar' | 'sirketler'>('kullanicilar');
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageMessage, setManageMessage] = useState('');
  const [showSecurityForm, setShowSecurityForm] = useState(false);
  const [securityTargetUser, setSecurityTargetUser] = useState<UserProfile | null>(null);
  const [securityPasscode, setSecurityPasscode] = useState('');
  const [securitySignature, setSecuritySignature] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);

  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    city: '',
    address: '',
    tax_number: '',
    sgk_sicil_no: '',
    phone: '',
    email: '',
  });

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    company_id: '',
  });

  const kategoriler = [
    { id: 'is_kanunu', label: 'İş Kanunu', icon: Shield, color: 'blue' },
    { id: 'bordro_sgk', label: 'Bordro & SGK', icon: Calculator, color: 'green' },
    { id: 'vergi_sigorta', label: 'Vergi & Sigorta', icon: DollarSign, color: 'teal' },
    { id: 'egitim', label: 'Eğitim & Gelişim', icon: GraduationCap, color: 'orange' },
    { id: 'belge_kurallari', label: 'Belge Kuralları', icon: FileText, color: 'red' },
    { id: 'sistem_kurallari', label: 'Sistem Kuralları', icon: Settings, color: 'gray' },
    { id: 'sirket_bilgileri', label: 'Şirket Bilgileri', icon: Building, color: 'cyan' }
  ];

  const filteredParametreler = parametreler.filter(p => p.kategori === activeTab);

  const getKategoriRengi = (color: string) => {
    const renkler = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      teal: 'bg-teal-50 border-teal-200 text-teal-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
      red: 'bg-red-50 border-red-200 text-red-700',
      gray: 'bg-gray-50 border-gray-200 text-gray-700',
      cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700'
    };
    return renkler[color as keyof typeof renkler] || renkler.gray;
  };

  const getParametreTuru = (deger: string | number | boolean) => {
    if (typeof deger === 'boolean') return 'Boolean';
    if (typeof deger === 'number') return 'Sayı';
    return 'Metin';
  };

  const formatDeger = (deger: string | number | boolean) => {
    if (typeof deger === 'boolean') return deger ? 'Evet' : 'Hayır';
    if (typeof deger === 'number') {
      if (deger < 1) return `%${(deger * 100).toFixed(3)}`;
      return deger.toString();
    }
    return deger;
  };

  const updateParametre = (id: string, yeniDeger: string | number | boolean) => {
    setParametreler(parametreler.map(p => 
      p.id === id 
        ? { ...p, deger: yeniDeger, sonGuncelleme: new Date().toISOString() }
        : p
    ));
  };

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

  // Kullanıcı yönetimi: superadmin + admin + hr
  const canManage = appRole === 'superadmin' || appRole === 'admin' || appRole === 'hr';
  // Şirket oluşturma/düzenleme/silme: yalnızca superadmin
  const canManageCompanies = appRole === 'superadmin';

  // superadmin değilse şirketler sekmesinde takılı kalmayı engelle
  useEffect(() => {
    if (!canManageCompanies && manageTab === 'sirketler') {
      setManageTab('kullanicilar');
    }
  }, [canManageCompanies, manageTab]);

  const clearManageAlerts = () => {
    setManageError('');
    setManageMessage('');
  };

  const resetCompanyForm = () => {
    setCompanyForm({
      name: '',
      city: '',
      address: '',
      tax_number: '',
      sgk_sicil_no: '',
      phone: '',
      email: '',
    });
    setEditingCompanyId(null);
  };

  const resetUserForm = () => {
    setUserForm({
      full_name: '',
      email: '',
      password: '',
      role: 'user',
      company_id: '',
    });
    setEditingUserId(null);
  };

  const loadManageData = useCallback(async () => {
    setManageLoading(true);
    clearManageAlerts();
    try {
      const [companyRows, userRows] = await Promise.all([
        companyService.getCompanies(),
        userService.getAll(),
      ]);
      setCompanies((companyRows ?? []) as CompanyRow[]);
      setUsers(userRows ?? []);
    } catch (err: any) {
      setManageError(err.message ?? 'Şirket ve kullanıcı verileri yüklenemedi.');
    } finally {
      setManageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    loadManageData();
  }, [canManage, loadManageData]);

  const companyNameMap = useMemo(() => {
    return companies.reduce<Record<string, string>>((acc, company) => {
      acc[company.id] = company.name;
      return acc;
    }, {});
  }, [companies]);

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearManageAlerts();
    if (!companyForm.name.trim()) {
      setManageError('Şirket adı zorunludur.');
      return;
    }
    try {
      if (editingCompanyId) {
        await companyService.update(editingCompanyId, {
          name: companyForm.name.trim(),
          city: companyForm.city.trim(),
          address: companyForm.address.trim(),
          tax_number: companyForm.tax_number.trim(),
          sgk_sicil_no: companyForm.sgk_sicil_no.trim(),
          phone: companyForm.phone.trim(),
          email: companyForm.email.trim(),
        });
        setManageMessage('Şirket bilgisi güncellendi.');
      } else {
        await companyService.create({
          name: companyForm.name.trim(),
          city: companyForm.city.trim(),
          address: companyForm.address.trim(),
          tax_number: companyForm.tax_number.trim(),
          sgk_sicil_no: companyForm.sgk_sicil_no.trim(),
          phone: companyForm.phone.trim(),
          email: companyForm.email.trim(),
        });
        setManageMessage('Yeni şirket eklendi.');
      }
      resetCompanyForm();
      setShowCompanyForm(false);
      await loadManageData();
    } catch (err: any) {
      setManageError(err.message ?? 'Şirket kaydedilemedi.');
    }
  };

  const startEditCompany = (company: CompanyRow) => {
    clearManageAlerts();
    setEditingCompanyId(company.id);
    setCompanyForm({
      name: company.name ?? '',
      city: company.city ?? '',
      address: company.address ?? '',
      tax_number: company.tax_number ?? '',
      sgk_sicil_no: company.sgk_sicil_no ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
    });
    setShowCompanyForm(true);
    setManageTab('sirketler');
  };

  const handleDeleteCompany = async (company: CompanyRow) => {
    if (!window.confirm(`${company.name} şirketini silmek istediğinize emin misiniz?`)) return;
    clearManageAlerts();
    try {
      await companyService.delete(company.id);
      setManageMessage('Şirket silindi.');
      await loadManageData();
    } catch (err: any) {
      setManageError(err.message ?? 'Şirket silinemedi.');
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearManageAlerts();

    if (!userForm.full_name.trim() || !userForm.email.trim()) {
      setManageError('Ad soyad ve e-posta zorunludur.');
      return;
    }

    if (!editingUserId && userForm.password.length < 6) {
      setManageError('Yeni kullanıcı için şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      if (editingUserId) {
        if (!user?.id) throw new Error('Oturum bilgisi bulunamadı.');
        await userService.updateProfile(
          editingUserId,
          {
            full_name: userForm.full_name.trim(),
            role: userForm.role,
            company_id: userForm.company_id || null,
          },
          user.id,
        );
        setManageMessage('Kullanıcı güncellendi.');
      } else {
        await userManagementService.createCompanyUser({
          fullName: userForm.full_name.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          role: userForm.role as 'admin' | 'manager' | 'employee' | 'hr' | 'user',
          companyId: userForm.company_id || undefined,
        });
        setManageMessage('Yeni kullanıcı eklendi.');
      }

      resetUserForm();
      setShowUserForm(false);
      await loadManageData();
    } catch (err: any) {
      setManageError(err.message ?? 'Kullanıcı işlemi başarısız.');
    }
  };

  const startEditUser = (targetUser: UserProfile) => {
    clearManageAlerts();
    setEditingUserId(targetUser.id);
    setUserForm({
      full_name: targetUser.full_name ?? '',
      email: targetUser.email ?? '',
      password: '',
      role: targetUser.role ?? 'user',
      company_id: targetUser.company_id ?? '',
    });
    setShowUserForm(true);
    setManageTab('kullanicilar');
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (!user?.id) {
      setManageError('Oturum bilgisi bulunamadı.');
      return;
    }
    if (!window.confirm(`${targetUser.full_name} kullanıcısını silmek istediğinize emin misiniz?`)) return;
    clearManageAlerts();
    try {
      await userService.deleteProfile(targetUser.id, user.id);
      setManageMessage('Kullanıcı profili silindi.');
      await loadManageData();
    } catch (err: any) {
      setManageError(err.message ?? 'Kullanıcı silinemedi.');
    }
  };

  const handleSyncUsersToEmployees = async () => {
    clearManageAlerts();
    setSyncLoading(true);
    try {
      const { created, skipped, failed, warning } = await userService.syncUsersToEmployees();
      if (warning) {
        setManageError(`${warning} (Eklenen: ${created}, Atlanan: ${skipped}, Başarısız: ${failed})`);
      } else {
        setManageMessage(`${created} kullanıcı personel listesine eklendi. ${skipped} kayıt zaten mevcuttu.`);
      }
      await loadManageData();
    } catch (err: any) {
      setManageError(err.message ?? 'Kullanıcı-personel senkronizasyonu başarısız.');
    } finally {
      setSyncLoading(false);
    }
  };

  const openSecurityForm = async (targetUser: UserProfile) => {
    clearManageAlerts();
    setSecurityTargetUser(targetUser);
    setSecurityLoading(true);
    setShowSecurityForm(true);
    try {
      const settings = await userService.getUserSecuritySettings(targetUser);
      setSecurityPasscode(settings.approvalPasscode ?? '');
      setSecuritySignature(settings.approvalSignature ?? '');
    } catch (err: any) {
      setManageError(err.message ?? 'Kullanıcı güvenlik ayarları yüklenemedi.');
    } finally {
      setSecurityLoading(false);
    }
  };

  const closeSecurityForm = () => {
    setShowSecurityForm(false);
    setSecurityTargetUser(null);
    setSecurityPasscode('');
    setSecuritySignature('');
    setSecurityLoading(false);
  };

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityTargetUser) return;
    clearManageAlerts();

    if (securityPasscode && securityPasscode.length < 4) {
      setManageError('Onay şifresi en az 4 karakter olmalıdır.');
      return;
    }

    setSecurityLoading(true);
    try {
      await userService.updateUserSecuritySettings(securityTargetUser, {
        approvalPasscode: securityPasscode.trim() || null,
        approvalSignature: securitySignature.trim() || null,
      });
      setManageMessage('Kullanıcı için imza ve onay şifresi kaydedildi.');
      closeSecurityForm();
    } catch (err: any) {
      setManageError(err.message ?? 'İmza/şifre ayarları kaydedilemedi.');
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Oturum ve Yetki</h2>
            <p className="mt-1 text-sm text-gray-600">Aktif kullanıcı: {profile?.full_name || 'Kullanıcı'} • {getRoleLabel(appRole)}</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Yeni Şifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="En az 6 karakter"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Yeni Şifre Tekrar</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Şifreyi tekrar yazın"
              minLength={6}
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {passwordLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </div>
        </form>

        {passwordError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {passwordError}
          </div>
        )}

        {passwordMessage && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {passwordMessage}
          </div>
        )}

        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Personel ve Şirket Yönetimi</h3>
              <p className="text-sm text-gray-600">Yeni kullanıcı/şirket ekleme, düzenleme ve silme işlemleri</p>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    clearManageAlerts();
                    setManageTab('kullanicilar');
                    resetUserForm();
                    setShowUserForm((v) => !v);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                >
                  {showUserForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {showUserForm ? 'Kullanıcı Formunu Kapat' : 'Yeni Kullanıcı'}
                </button>
                {canManageCompanies && (
                  <button
                    onClick={() => {
                      clearManageAlerts();
                      setManageTab('sirketler');
                      resetCompanyForm();
                      setShowCompanyForm((v) => !v);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700"
                  >
                    {showCompanyForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {showCompanyForm ? 'Şirket Formunu Kapat' : 'Yeni Şirket'}
                  </button>
                )}
                <button
                  onClick={handleSyncUsersToEmployees}
                  disabled={syncLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 disabled:opacity-60"
                >
                  {syncLoading ? 'Aktarılıyor...' : 'Kullanıcıları Personel Listesine Aktar'}
                </button>
              </div>
            )}
          </div>

          {manageError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {manageError}
            </div>
          )}

          {manageMessage && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {manageMessage}
            </div>
          )}

          {!canManage && (
            <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Bu bölüm sadece Süper Yönetici, Şirket Yöneticisi ve İK rolleri için açıktır.
            </div>
          )}

          {canManage && (
            <>
              <div className="mt-5 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                <button
                  onClick={() => setManageTab('kullanicilar')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    manageTab === 'kullanicilar'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Kullanıcılar ({users.length})
                </button>
                {canManageCompanies && (
                  <button
                    onClick={() => setManageTab('sirketler')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      manageTab === 'sirketler'
                        ? 'bg-white text-cyan-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Şirketler ({companies.length})
                  </button>
                )}
              </div>

              {showUserForm && (
                <form onSubmit={handleUserSubmit} className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h4 className="text-sm font-semibold text-blue-800">
                    {editingUserId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
                  </h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={userForm.full_name}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Ad Soyad"
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      required
                    />
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="E-posta"
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      required
                      disabled={Boolean(editingUserId)}
                    />
                    {!editingUserId && (
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Şifre (min 6)"
                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                        minLength={6}
                        required
                      />
                    )}
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      {/* superadmin hiçbir formdan oluşturulamaz */}
                      {profile?.role === 'superadmin' && (
                        <option value="admin">Şirket Yöneticisi</option>
                      )}
                      {profile?.role === 'admin' && (
                        <option value="admin">Şirket Yöneticisi</option>
                      )}
                      <option value="hr">İK</option>
                      <option value="manager">Müdür</option>
                      <option value="employee">Personel</option>
                      <option value="user">Kullanıcı</option>
                    </select>
                    <select
                      value={userForm.company_id}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, company_id: e.target.value }))}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 md:col-span-2"
                    >
                      <option value="">Şirket seçin (opsiyonel)</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                      {editingUserId ? 'Kullanıcıyı Güncelle' : 'Kullanıcı Ekle'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetUserForm();
                        setShowUserForm(false);
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              )}

              {showCompanyForm && (
                <form onSubmit={handleCompanySubmit} className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                  <h4 className="text-sm font-semibold text-cyan-800">
                    {editingCompanyId ? 'Şirket Düzenle' : 'Yeni Şirket Ekle'}
                  </h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Şirket Adı"
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500"
                      required
                    />
                    <input
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Bulunduğu İl"
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500"
                    />
                    <input
                      value={companyForm.tax_number}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, tax_number: e.target.value }))}
                      placeholder="Vergi No"
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500"
                    />
                    <input
                      value={companyForm.sgk_sicil_no}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, sgk_sicil_no: e.target.value }))}
                      placeholder="SGK Sicil No"
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500"
                    />
                    <input
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Telefon"
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500"
                    />
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="E-posta"
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500"
                    />
                    <textarea
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Adres"
                      rows={2}
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-700">
                      {editingCompanyId ? 'Şirketi Güncelle' : 'Şirket Ekle'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetCompanyForm();
                        setShowCompanyForm(false);
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-5 rounded-xl border border-gray-200 bg-white overflow-hidden">
                {manageLoading ? (
                  <div className="px-4 py-6 text-sm text-gray-500">Yönetim verileri yükleniyor...</div>
                ) : manageTab === 'kullanicilar' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ad Soyad</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">E-posta</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Şirket</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((targetUser) => (
                          <tr key={targetUser.id} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{targetUser.full_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{targetUser.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{targetUser.role}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{targetUser.company_id ? (companyNameMap[targetUser.company_id] || '-') : '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => startEditUser(targetUser)}
                                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Düzenle
                                </button>
                                <button
                                  onClick={() => openSecurityForm(targetUser)}
                                  className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700"
                                >
                                  <KeyRound className="h-3.5 w-3.5" /> İmza/Şifre
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(targetUser)}
                                  disabled={targetUser.id === user?.id}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Sil
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Şirket</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">İl</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vergi / SGK</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">İletişim</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((company) => (
                          <tr key={company.id} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{company.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{company.city || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{company.tax_number || '-'} / {company.sgk_sicil_no || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{company.phone || '-'} • {company.email || '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => startEditCompany(company)}
                                  className="inline-flex items-center gap-1 rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Düzenle
                                </button>
                                <button
                                  onClick={() => handleDeleteCompany(company)}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Sil
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {showSecurityForm && securityTargetUser && (
                <form onSubmit={handleSaveSecuritySettings} className="mt-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-purple-800">Kullanıcı İmza ve Şifre İşlemleri</h4>
                      <p className="text-xs text-purple-700 mt-1">{securityTargetUser.full_name} • {securityTargetUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSecurityForm}
                      className="rounded-md border border-purple-200 bg-white px-2 py-1 text-xs font-semibold text-purple-700"
                    >
                      Kapat
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-purple-800">Onay Şifresi</label>
                      <input
                        value={securityPasscode}
                        onChange={(e) => setSecurityPasscode(e.target.value)}
                        placeholder="Örn: 1234"
                        className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => setSecurityPasscode(Math.floor(100000 + Math.random() * 900000).toString())}
                        className="inline-flex items-center gap-2 rounded-lg border border-purple-300 bg-white px-3 py-2 text-xs font-semibold text-purple-700"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Şifre Oluştur
                      </button>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-purple-800">Dijital İmza</label>
                      <SignatureCanvas onChange={setSecuritySignature} />
                      {securitySignature.startsWith('data:image') && (
                        <div className="mt-2 rounded-lg border border-purple-200 bg-white p-2">
                          <p className="mb-1 text-[11px] font-semibold text-purple-700">İmza Önizleme</p>
                          <img src={securitySignature} alt="İmza Önizleme" className="h-16 rounded border border-purple-100" />
                        </div>
                      )}
                      <p className="mt-2 text-[11px] text-purple-700">İsterseniz metin olarak da imza kaydı girebilirsiniz.</p>
                      <textarea
                        value={securitySignature}
                        onChange={(e) => setSecuritySignature(e.target.value)}
                        rows={3}
                        placeholder="İmza adı veya dijital imza verisi"
                        className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={securityLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      {securityLoading ? 'Kaydediliyor...' : 'İmza/Şifreyi Kaydet'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSecurityPasscode('');
                        setSecuritySignature('');
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700"
                    >
                      Temizle
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Sistem Ayarları</h1>
            <p className="text-gray-600">Zorunlu şartlar, süreler ve sistem parametreleri</p>
          </div>
        </div>

        {/* Uyarı Mesajı */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-800">Önemli Uyarı</h3>
              <p className="text-sm text-yellow-700">
                Kırmızı işaretli parametreler İş Kanunu gereği değiştirilemez. 
                Yeşil işaretli parametreler şirket politikasına göre ayarlanabilir.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {kategoriler.map(kategori => {
              const Icon = kategori.icon;
              const isActive = activeTab === kategori.id;
              return (
                <button
                  key={kategori.id}
                  onClick={() => setActiveTab(kategori.id as ParametreKategorisi)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                    isActive
                      ? getKategoriRengi(kategori.color)
                      : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {kategori.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* İş Kanunu */}
          {activeTab === 'is_kanunu' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Yıllık İzin Süreleri */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-800">Yıllık İzin Süreleri</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">1-5 Yıl Çalışan</span>
                        <p className="text-xs text-gray-500">İş Kanunu Madde 53</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">{sistemAyarlari.isKanunu.yillikIzin.birIlaBesYil} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">5-15 Yıl Çalışan</span>
                        <p className="text-xs text-gray-500">İş Kanunu Madde 53</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">{sistemAyarlari.isKanunu.yillikIzin.besIlaOnbesYil} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">15+ Yıl Çalışan</span>
                        <p className="text-xs text-gray-500">İş Kanunu Madde 53</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">{sistemAyarlari.isKanunu.yillikIzin.onbesYilUstunde} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">50+ Yaş Ek İzin</span>
                        <p className="text-xs text-gray-500">İş Kanunu</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">+{sistemAyarlari.isKanunu.yillikIzin.elliYasUstundeEkIzin} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Özel İzin Süreleri */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-800">Özel İzin Süreleri</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Mazeret İzni</span>
                        <p className="text-xs text-gray-500">İş Kanunu Madde 56</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">{sistemAyarlari.isKanunu.ozelIzinler.mazeretIzni} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Doğum İzni</span>
                        <p className="text-xs text-gray-500">İş Kanunu Madde 74</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">{sistemAyarlari.isKanunu.ozelIzinler.dogumIzni} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Babalık İzni</span>
                        <p className="text-xs text-gray-500">İş Kanunu</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">{sistemAyarlari.isKanunu.ozelIzinler.babalikIzni} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Evlilik İzni</span>
                        <p className="text-xs text-gray-500">İş Kanunu</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">{sistemAyarlari.isKanunu.ozelIzinler.evlilikIzni} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Ölüm İzni</span>
                        <p className="text-xs text-gray-500">İş Kanunu</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">{sistemAyarlari.isKanunu.ozelIzinler.olumIzni} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Yol İzni</span>
                        <p className="text-xs text-gray-500">Yıllık izin ile birlikte</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">{sistemAyarlari.isKanunu.ozelIzinler.yolIzni} gün</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Çalışma Süreleri */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-800">Çalışma Süreleri</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-800">Haftalık Çalışma</span>
                      <p className="text-xs text-gray-500">İş Kanunu Madde 63</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-yellow-600">{sistemAyarlari.isKanunu.calismaSureleri.haftalikSaat} saat</span>
                      <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-800">Günlük Çalışma</span>
                      <p className="text-xs text-gray-500">İş Kanunu</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-yellow-600">{sistemAyarlari.isKanunu.calismaSureleri.gunlukSaat} saat</span>
                      <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-800">Fazla Mesai Sınırı</span>
                      <p className="text-xs text-gray-500">İş Kanunu Madde 64</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-yellow-600">{sistemAyarlari.isKanunu.calismaSureleri.fazlaMesaiSiniri} saat/yıl</span>
                      <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bordro & SGK */}
          {activeTab === 'bordro_sgk' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Aylık İşlemler */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calculator className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-800">Aylık İşlemler</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Bordro Hazırlık Süresi</span>
                        <p className="text-xs text-gray-500">Ayın 20-25'i arası</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">{sistemAyarlari.bordroSureleri.bordroHazirlikGunleri} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Bordro Ödeme Süresi</span>
                        <p className="text-xs text-gray-500">Ayın 26-30'u arası</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">{sistemAyarlari.bordroSureleri.bordroOdemeGunleri} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">SGK Bildirimi</span>
                        <p className="text-xs text-gray-500">Son tarih</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">Ayın {sistemAyarlari.bordroSureleri.sgkBildirimiGunu}'ü</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Vergi Beyannamesi</span>
                        <p className="text-xs text-gray-500">Son tarih</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">Ayın {sistemAyarlari.bordroSureleri.vergiBeyannamesiGunu}'sı</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Yıllık İşlemler */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-800">Yıllık İşlemler</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Bordro Kapanışı</span>
                        <p className="text-xs text-gray-500">Önceki yıl kapanışı</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">{sistemAyarlari.bordroSureleri.yillikKapanisTarihi}</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Yıllık Beyanname</span>
                        <p className="text-xs text-gray-500">Gelir vergisi beyannamesi</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">31 Mart</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Asgari Ücret Güncellemesi</span>
                        <p className="text-xs text-gray-500">Yıl ortası değerlendirme</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">1 Temmuz</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vergi & Sigorta */}
          {activeTab === 'vergi_sigorta' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vergi Oranları */}
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="w-6 h-6 text-teal-600" />
                    <h3 className="text-lg font-semibold text-teal-800">Vergi Oranları</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Gelir Vergisi</span>
                        <p className="text-xs text-gray-500">Basitleştirilmiş oran</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-teal-600">%{(sistemAyarlari.vergiOranlari.gelirVergisiOrani * 100).toFixed(0)}</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Damga Vergisi</span>
                        <p className="text-xs text-gray-500">Sabit oran</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-teal-600">%{(sistemAyarlari.vergiOranlari.damgaVergisiOrani * 100).toFixed(3)}</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sigorta Oranları */}
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-cyan-600" />
                    <h3 className="text-lg font-semibold text-cyan-800">Sigorta Oranları</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">SGK İşçi Payı</span>
                        <p className="text-xs text-gray-500">Sosyal güvenlik primi</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-cyan-600">%{(sistemAyarlari.vergiOranlari.sgkIsciPayiOrani * 100).toFixed(0)}</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">SGK İşveren Payı</span>
                        <p className="text-xs text-gray-500">Sosyal güvenlik primi</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-cyan-600">%{(sistemAyarlari.vergiOranlari.sgkIsverenPayiOrani * 100).toFixed(1)}</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">İşsizlik İşçi Payı</span>
                        <p className="text-xs text-gray-500">İşsizlik sigortası</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-cyan-600">%{(sistemAyarlari.vergiOranlari.issizlikIsciPayiOrani * 100).toFixed(0)}</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">İşsizlik İşveren Payı</span>
                        <p className="text-xs text-gray-500">İşsizlik sigortası</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-cyan-600">%{(sistemAyarlari.vergiOranlari.issizlikIsverenPayiOrani * 100).toFixed(0)}</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asgari Ücret */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">Asgari Ücret Bilgileri</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-800">2024 Asgari Ücret</span>
                      <p className="text-xs text-gray-500">Brüt tutar</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-600">{sistemAyarlari.vergiOranlari.asgariUcret.toLocaleString('tr-TR')} ₺</span>
                      <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-800">SGK Tavanı</span>
                      <p className="text-xs text-gray-500">Asgari ücretin 7.5 katı</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-600">{(sistemAyarlari.vergiOranlari.asgariUcret * 7.5).toLocaleString('tr-TR')} ₺</span>
                      <Shield className="w-4 h-4 text-red-500" title="Otomatik hesaplanan" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Eğitim & Gelişim */}
          {activeTab === 'egitim' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Zorunlu Eğitimler */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <GraduationCap className="w-6 h-6 text-orange-600" />
                    <h3 className="text-lg font-semibold text-orange-800">Zorunlu Eğitimler</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">İşe Giriş Eğitimi</span>
                        <p className="text-xs text-gray-500">Yeni personel için</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-orange-600">{sistemAyarlari.egitimSureleri.iseGirisEgitimi} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">İş Sağlığı Eğitimi</span>
                        <p className="text-xs text-gray-500">İSG mevzuatı gereği</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-orange-600">{sistemAyarlari.egitimSureleri.isSagligiEgitimi} saat</span>
                        <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Periyodik İşlemler */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-800">Periyodik İşlemler</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Periyodik Eğitim</span>
                        <p className="text-xs text-gray-500">Tekrar aralığı</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">{sistemAyarlari.egitimSureleri.periyodikEgitimAraligi} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Performans Değerlendirme</span>
                        <p className="text-xs text-gray-500">Yıllık değerlendirme</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">{sistemAyarlari.egitimSureleri.performansDegerlendirmeAraligi} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Kariyer Planlama</span>
                        <p className="text-xs text-gray-500">6 aylık değerlendirme</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">{sistemAyarlari.egitimSureleri.kariyerPlanlamaAraligi} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Belge Kuralları */}
          {activeTab === 'belge_kurallari' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-red-800">Belge Yükleme Kuralları</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-800">Maksimum Dosya Boyutu</span>
                      <p className="text-xs text-gray-500">Yüklenebilecek dosya boyutu</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-red-600">{sistemAyarlari.belgeKurallari.maksimumDosyaBoyutu} MB</span>
                      <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-800">İl Dışı Seyahat Belgesi</span>
                      <p className="text-xs text-gray-500">Yol izni için zorunluluk</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-red-600">
                        {sistemAyarlari.belgeKurallari.ilDisiSeyahatBelgeZorunlu ? 'Zorunlu' : 'İsteğe Bağlı'}
                      </span>
                      <Shield className="w-4 h-4 text-red-500" title="Değiştirilemez" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Kabul Edilen Dosya Türleri:</h4>
                  <div className="flex flex-wrap gap-2">
                    {sistemAyarlari.belgeKurallari.kabulEdilenDosyaTurleri.map((tur, index) => (
                      <span key={index} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        {tur === 'application/pdf' ? 'PDF' : 
                         tur === 'image/jpeg' ? 'JPEG' :
                         tur === 'image/png' ? 'PNG' :
                         tur === 'image/jpg' ? 'JPG' : tur}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sistem Kuralları */}
          {activeTab === 'sistem_kurallari' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* İzin Kuralları */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">İzin Kuralları</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Minimum İzin Süresi</span>
                        <p className="text-xs text-gray-500">En az kaç gün izin alınabilir</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-600">{sistemAyarlari.sistemKurallari.izinTalepMinimumGun} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Maksimum İleri Tarih</span>
                        <p className="text-xs text-gray-500">Kaç gün önceden talep edilebilir</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-600">{sistemAyarlari.sistemKurallari.izinTalepMaksimumIleriTarih} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Uyarı Süreleri */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-yellow-800">Uyarı Süreleri</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Bordro Gecikme Uyarısı</span>
                        <p className="text-xs text-gray-500">Kaç gün önceden uyarı</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-yellow-600">{sistemAyarlari.sistemKurallari.bordroGecikmeUyariGunu} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">SGK Bildirimi Uyarısı</span>
                        <p className="text-xs text-gray-500">Kaç gün önceden uyarı</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-yellow-600">{sistemAyarlari.sistemKurallari.sgkBildirimiUyariGunu} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-800">Performans Uyarısı</span>
                        <p className="text-xs text-gray-500">Değerlendirme öncesi uyarı</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-yellow-600">{sistemAyarlari.sistemKurallari.performansUyariGunu} gün</span>
                        <CheckCircle className="w-4 h-4 text-green-500" title="Değiştirilebilir" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Şirket Bilgileri */}
          {activeTab === 'sirket_bilgileri' && (
            <div className="space-y-6">
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building className="w-6 h-6 text-cyan-600" />
                  <h3 className="text-lg font-semibold text-cyan-800">Şirket Bilgileri</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="p-3 bg-white rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Şirket Adı</label>
                      <input
                        type="text"
                        value={sistemAyarlari.sirketBilgileri.ad}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg px-3 py-2 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        readOnly
                      />
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vergi Numarası</label>
                      <input
                        type="text"
                        value={sistemAyarlari.sirketBilgileri.vergiNo}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg px-3 py-2 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        readOnly
                      />
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">SGK Sicil No</label>
                      <input
                        type="text"
                        value={sistemAyarlari.sirketBilgileri.sgkSicilNo}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg px-3 py-2 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 bg-white rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                      <textarea
                        value={sistemAyarlari.sirketBilgileri.adres}
                        rows={2}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg px-3 py-2 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
                        readOnly
                      />
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                      <input
                        type="text"
                        value={sistemAyarlari.sirketBilgileri.telefon}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg px-3 py-2 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        readOnly
                      />
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={sistemAyarlari.sirketBilgileri.email}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg px-3 py-2 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Önemli Not:</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    <strong>Bulunduğu İl:</strong> {sistemAyarlari.sirketBilgileri.bulunduguIl} - 
                    Bu bilgi yol izni taleplerinde il dışı seyahat kontrolü için kullanılır.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detaylı Parametre Tablosu */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Detaylı Parametre Listesi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parametre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Değer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Güncelleme</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredParametreler.map((parametre) => (
                    <tr key={parametre.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{parametre.ad}</div>
                          <div className="text-xs text-gray-500">{parametre.aciklama}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-gray-800">
                          {formatDeger(parametre.deger)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs">
                          {getParametreTuru(parametre.deger)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {parametre.degistirilebilir ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs text-green-600">Değiştirilebilir</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 text-red-500" />
                              <span className="text-xs text-red-600">Sabit</span>
                            </>
                          )}
                          {parametre.zorunlu && (
                            <span className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs ml-2">
                              Zorunlu
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(parametre.sonGuncelleme).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Emekli Bordro Parametreleri Tablosu */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 p-6 border-b border-gray-200">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Emekli Bordro Hesaplama Parametreleri</h2>
            <p className="text-sm text-gray-600">2026 yılı aylık bordro hesaplama oranları ve tavanları</p>
          </div>
        </div>

        <div className="p-6">
          {/* Sabit Oranlar */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sabit Oranlar</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm text-blue-600 font-medium mb-1">SGK İşçi Payı</div>
                <div className="text-2xl font-bold text-blue-700">
                  %{(sistemAyarlari.emeклiBordroParametreleri.sgkIsciPayiOrani * 100).toFixed(0)}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="text-sm text-green-600 font-medium mb-1">İşsizlik İşçi</div>
                <div className="text-2xl font-bold text-green-700">
                  %{(sistemAyarlari.emeклiBordroParametreleri.issizlikIsciPayiOrani * 100).toFixed(0)}
                </div>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="text-sm text-teal-600 font-medium mb-1">Damga Vergisi</div>
                <div className="text-2xl font-bold text-teal-700">
                  %{(sistemAyarlari.emeклiBordroParametreleri.damgaVergisiOrani * 100).toFixed(3)}
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="text-sm text-orange-600 font-medium mb-1">SGK İşveren</div>
                <div className="text-2xl font-bold text-orange-700">
                  %{(sistemAyarlari.emeклiBordroParametreleri.sgkIsverenPayiOrani * 100).toFixed(2)}
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="text-sm text-red-600 font-medium mb-1">İşsizlik İşveren</div>
                <div className="text-2xl font-bold text-red-700">
                  %{(sistemAyarlari.emeклiBordroParametreleri.issizlikIsverenPayiOrani * 100).toFixed(0)}
                </div>
              </div>
            </div>
          </div>

          {/* SGK Tavanları */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">2026 Yılı Aylık SGK Tavanları</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Ay</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200">SGK Tavanı (₺)</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Object.entries(sistemAyarlari.emeклiBordroParametreleri.sgkTavanlari).map(([ay, tutar], index) => (
                    <tr key={ay} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 border-b border-gray-100 capitalize">
                        {ay === 'ocak' ? 'Ocak' :
                         ay === 'subat' ? 'Şubat' :
                         ay === 'mart' ? 'Mart' :
                         ay === 'nisan' ? 'Nisan' :
                         ay === 'mayis' ? 'Mayıs' :
                         ay === 'haziran' ? 'Haziran' :
                         ay === 'temmuz' ? 'Temmuz' :
                         ay === 'agustos' ? 'Ağustos' :
                         ay === 'eylul' ? 'Eylül' :
                         ay === 'ekim' ? 'Ekim' :
                         ay === 'kasim' ? 'Kasım' :
                         ay === 'aralik' ? 'Aralık' : ay}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 border-b border-gray-100 text-right">
                        {tutar.toLocaleString('tr-TR')} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gelir Vergisi Dilimleri */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">2026 Gelir Vergisi Dilimleri</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Dilim</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200">Matrah (₺)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200">Vergi Oranı</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.map((dilim, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 border-b border-gray-100">
                        {index + 1}. Dilim
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 border-b border-gray-100 text-right">
                        {index === 0 ? '0' : sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri[index - 1].matrah.toLocaleString('tr-TR')} - {dilim.matrah.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-700 border-b border-gray-100 text-right">
                        %{(dilim.oran * 100).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.length + 1}. Dilim
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri[sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.length - 1].matrah.toLocaleString('tr-TR')} ₺ ve üzeri
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-700 text-right">
                      %{(sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri[sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.length - 1].oran * 100).toFixed(0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Yasal Uyarı */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Yasal Uyarı</h3>
        </div>
        <div className="space-y-3 text-sm text-red-700">
          <p>
            <strong>İş Kanunu Uyumluluğu:</strong> Bu sistemdeki tüm süreler ve oranlar
            Türkiye Cumhuriyeti İş Kanunu ve ilgili mevzuata uygun olarak belirlenmiştir.
          </p>
          <p>
            <strong>Değişiklik Yetkisi:</strong> Kırmızı kalkan işaretli parametreler yasal zorunluluk
            gereği değiştirilemez. Yeşil tik işaretli parametreler şirket politikasına göre ayarlanabilir.
          </p>
          <p>
            <strong>Güncelleme Sorumluluğu:</strong> Mevzuat değişikliklerinde sistem parametrelerinin
            güncellenmesi İK departmanının sorumluluğundadır.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SistemAyarlari;