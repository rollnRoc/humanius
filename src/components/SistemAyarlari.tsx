import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Settings, Shield, Calculator, GraduationCap, FileText, Building, Building2, 
  AlertTriangle, CheckCircle, Clock, Users, Calendar, DollarSign, TrendingUp, 
  Plus, Pencil, Trash2, X, KeyRound, PenTool,
  MapPin, Phone, Mail, Copy, Check, ExternalLink, ShieldCheck, Globe, Hash, Sparkles,
  MessageSquare, UserCheck, Award, Briefcase, Layers, ArrowRight, User
} from 'lucide-react';
import { VARSAYILAN_SISTEM_AYARLARI, SISTEM_PARAMETRELERI } from '../data/sistemAyarlari';
import { SistemAyarlari as ISistemAyarlari, SistemParametresi, ParametreKategorisi } from '../types/sistemAyarlari';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel } from '../auth/roles';
import { companyService } from '../services/companyService';
import { userService, type UserProfile } from '../services/userService';
import { userManagementService } from '../services/userManagementService';
import { demoService } from '../services/demoService';
import { shiftService, type SaturdayWorkConfig, DEFAULT_SATURDAY_CONFIG } from '../services/shiftService';
import { smsService } from '../services/smsService';
import { leaveApprovalService, type LeaveApprovalConfig, DEFAULT_LEAVE_APPROVAL_CONFIG } from '../services/leaveApprovalService';
import { showSuccess, showError } from '../utils/swal';

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

interface SistemAyarlariProps {
  defaultTab?: ParametreKategorisi;
  mode?: 'kanunlar' | 'sirket';
}

const SistemAyarlari: React.FC<SistemAyarlariProps> = ({ defaultTab, mode }) => {
  const { user, profile, appRole, updatePassword } = useAuth();
  
  const isSirketMode = mode === 'sirket' || defaultTab === 'sirket_bilgileri' || defaultTab === 'sirketler';
  const effectiveDefaultTab = defaultTab || (isSirketMode ? 'sirket_bilgileri' : 'is_kanunu');

  const [activeTab, setActiveTab] = useState<ParametreKategorisi>(effectiveDefaultTab);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Kullanıcı yönetimi: superadmin + admin + hr
  const canManage = appRole === 'superadmin' || appRole === 'admin' || appRole === 'hr';
  // Şirket oluşturma/düzenleme/silme: yalnızca superadmin
  const canManageCompanies = appRole === 'superadmin';

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    } else if (isSirketMode) {
      setActiveTab('sirket_bilgileri');
    } else {
      setActiveTab('is_kanunu');
    }
  }, [defaultTab, isSirketMode]);
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
  const [companySmsActive, setCompanySmsActive] = useState(false);
  const [smsRefreshKey, setSmsRefreshKey] = useState(0);

  useEffect(() => {
    const handleSmsChange = () => setSmsRefreshKey(k => k + 1);
    window.addEventListener('humanius_sms_company_updated', handleSmsChange);
    return () => window.removeEventListener('humanius_sms_company_updated', handleSmsChange);
  }, []);

  const [companyForm, setCompanyForm] = useState({
    name: '',
    city: '',
    address: '',
    tax_number: '',
    sgk_sicil_no: '',
    phone: '',
    email: '',
  });

  // Şirket Çalışma Düzeni (Puantaj / Cumartesi Ayarı)
  const [saturdayConfig, setSaturdayConfig] = useState<SaturdayWorkConfig>(DEFAULT_SATURDAY_CONFIG);
  const [isSavingSatConfig, setIsSavingSatConfig] = useState(false);
  const [satConfigSuccess, setSatConfigSuccess] = useState(false);

  useEffect(() => {
    const targetCompId = profile?.company_id || companies[0]?.id || 'default';
    shiftService.getSaturdayConfig(targetCompId).then(cfg => {
      if (cfg) setSaturdayConfig(cfg);
    }).catch(err => console.error('Error loading saturday config:', err));
  }, [profile?.company_id, companies]);

  const handleToggleSaturdayWork = async (isSatWork: boolean) => {
    setIsSavingSatConfig(true);
    const targetCompId = profile?.company_id || companies[0]?.id || 'default';
    const nextConfig: SaturdayWorkConfig = {
      ...saturdayConfig,
      isSaturdayWork: isSatWork,
    };
    try {
      await shiftService.saveSaturdayConfig(targetCompId, nextConfig);
      setSaturdayConfig(nextConfig);
      setSatConfigSuccess(true);
      window.dispatchEvent(new CustomEvent('humanius_saturday_updated'));
      window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));
      setTimeout(() => setSatConfigSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving saturday work config:', err);
    } finally {
      setIsSavingSatConfig(false);
    }
  };

  // İzin Talebi Onay Aşamaları Ayarı (Birim Amiri, İK, Şirket Yöneticisi)
  const [leaveApprovalConfig, setLeaveApprovalConfig] = useState<LeaveApprovalConfig>(DEFAULT_LEAVE_APPROVAL_CONFIG);
  const [isSavingLeaveApproval, setIsSavingLeaveApproval] = useState(false);
  const [leaveApprovalSuccess, setLeaveApprovalSuccess] = useState(false);
  const [workflowSimulationStep, setWorkflowSimulationStep] = useState<number>(1);

  // Onay akışı için seçilen aktif aşamalar listesi
  const activeApprovalSteps = useMemo(() => {
    const list: {
      id: 'manager' | 'hr' | 'admin';
      stepNum: number;
      label: string;
      roleTitle: string;
      desc: string;
      icon: any;
    }[] = [];
    let counter = 1;
    if (leaveApprovalConfig.stages.manager) {
      list.push({
        id: 'manager',
        stepNum: counter++,
        label: '1. Aşama: Birim Amiri',
        roleTitle: 'Departman Sorumlusu',
        desc: 'İlk değerlendirme ve birim ön onayı',
        icon: Users,
      });
    }
    if (leaveApprovalConfig.stages.hr) {
      list.push({
        id: 'hr',
        stepNum: counter++,
        label: '2. Aşama: İK Uzmanı',
        roleTitle: 'İnsan Kaynakları',
        desc: 'Mevzuat uygunluğu ve hak ediş denetimi',
        icon: Award,
      });
    }
    if (leaveApprovalConfig.stages.admin) {
      list.push({
        id: 'admin',
        stepNum: counter++,
        label: '3. Aşama: Şirket Yöneticisi',
        roleTitle: 'Genel Müdür / Üst Yönetim',
        desc: 'Nihai yönetim tasdiki',
        icon: Briefcase,
      });
    }
    return list;
  }, [leaveApprovalConfig.stages]);

  useEffect(() => {
    const targetCompId = profile?.company_id || companies[0]?.id || 'default';
    leaveApprovalService.getConfig(targetCompId).then(cfg => {
      if (cfg) setLeaveApprovalConfig(cfg);
    }).catch(err => console.error('Error loading leave approval config:', err));
  }, [profile?.company_id, companies]);

  const handleToggleApprovalStage = async (stage: 'manager' | 'hr' | 'admin') => {
    const currentEnabled = leaveApprovalConfig.stages[stage];
    const newStages = {
      ...leaveApprovalConfig.stages,
      [stage]: !currentEnabled,
    };

    // En az bir aşama açık kalmalı
    const activeCount = Object.values(newStages).filter(Boolean).length;
    if (activeCount === 0) {
      showError('İşlem İptal Edildi', 'İzin onay sürecinde en az bir onay kademesinin açık olması zorunludur. Tüm aşamalar aynı anda kapatılamaz.');
      return;
    }

    const nextConfig: LeaveApprovalConfig = {
      ...leaveApprovalConfig,
      stages: newStages,
    };

    setIsSavingLeaveApproval(true);
    const targetCompId = profile?.company_id || companies[0]?.id || 'default';
    try {
      await leaveApprovalService.saveConfig(targetCompId, nextConfig, profile?.email);
      setLeaveApprovalConfig(nextConfig);
      setLeaveApprovalSuccess(true);
      setTimeout(() => setLeaveApprovalSuccess(false), 2500);
    } catch (err: any) {
      console.error('Error saving leave approval config:', err);
      showError('Hata', err?.message || 'Onay aşamaları kaydedilemedi.');
    } finally {
      setIsSavingLeaveApproval(false);
    }
  };

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    company_id: '',
  });

  const kategoriler = isSirketMode
    ? [
        { id: 'sirket_bilgileri', label: 'Şirket Bilgileri & Profil', icon: Building2, color: 'blue' },
        ...(canManageCompanies ? [{ id: 'sirketler', label: 'Tüm Şirketler & Kiracı Yönetimi', icon: Building, color: 'purple' }] : [])
      ]
    : [
        { id: 'is_kanunu', label: 'İş Kanunu', icon: Shield, color: 'blue' },
        { id: 'bordro_sgk', label: 'Bordro & SGK', icon: Calculator, color: 'green' },
        { id: 'vergi_sigorta', label: 'Vergi & Sigorta', icon: DollarSign, color: 'teal' },
        { id: 'egitim', label: 'Eğitim & Gelişim', icon: GraduationCap, color: 'orange' },
        { id: 'belge_kurallari', label: 'Belge Kuralları', icon: FileText, color: 'red' },
        { id: 'sistem_kurallari', label: 'Sistem Kuralları', icon: Settings, color: 'gray' },
      ];

  const filteredParametreler = parametreler.filter(p => p.kategori === activeTab);

  const getKategoriRengi = (color: string) => {
    const renkler = {
      blue: 'bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-xs ring-1 ring-blue-500/20',
      green: 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold shadow-xs ring-1 ring-emerald-500/20',
      teal: 'bg-teal-50 border-teal-300 text-teal-700 font-bold shadow-xs ring-1 ring-teal-500/20',
      orange: 'bg-amber-50 border-amber-300 text-amber-700 font-bold shadow-xs ring-1 ring-amber-500/20',
      red: 'bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-xs ring-1 ring-rose-500/20',
      gray: 'bg-slate-100 border-slate-300 text-slate-800 font-bold shadow-xs ring-1 ring-slate-400/20',
      cyan: 'bg-cyan-50 border-cyan-300 text-cyan-700 font-bold shadow-xs ring-1 ring-cyan-500/20',
      purple: 'bg-purple-50 border-purple-300 text-purple-700 font-bold shadow-xs ring-1 ring-purple-500/20',
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
    setCompanySmsActive(false); // Varsayılan: TÜM FİRMALARDA KAPALI
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

  useEffect(() => {
    const isPureDemo = (demoService.isDemoActive() && localStorage.getItem('humanius_superadmin_session') !== 'true') || profile?.company_id === 'demo-company-id-9999';
    if (isPureDemo) {
      setSistemAyarlari(prev => ({
        ...prev,
        sirketBilgileri: {
          ad: 'Humanius Demo Şirketi',
          adres: '',
          vergiNo: '',
          sgkSicilNo: '',
          telefon: '',
          email: 'demo@humanius.net',
          bulunduguIl: 'İstanbul',
        }
      }));
      return;
    }

    if (companies.length > 0) {
      const myCompany = companies.find(c => c.id === profile?.company_id) || companies[0];
      if (myCompany) {
        setSistemAyarlari(prev => ({
          ...prev,
          sirketBilgileri: {
            ad: myCompany.name ?? prev.sirketBilgileri.ad,
            adres: myCompany.address ?? prev.sirketBilgileri.adres,
            vergiNo: myCompany.tax_number ?? prev.sirketBilgileri.vergiNo,
            sgkSicilNo: myCompany.sgk_sicil_no ?? prev.sirketBilgileri.sgkSicilNo,
            telefon: myCompany.phone ?? prev.sirketBilgileri.telefon,
            email: myCompany.email ?? prev.sirketBilgileri.email,
            bulunduguIl: myCompany.city ?? prev.sirketBilgileri.bulunduguIl,
          }
        }));
      }
    }
  }, [companies, profile?.company_id]);

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
        smsService.setCompanySmsEnabled(editingCompanyId, companySmsActive, companyForm.name.trim());
        setManageMessage('Şirket bilgisi ve SMS ayarı güncellendi.');
      } else {
        const createdComp = await companyService.create({
          name: companyForm.name.trim(),
          city: companyForm.city.trim(),
          address: companyForm.address.trim(),
          tax_number: companyForm.tax_number.trim(),
          sgk_sicil_no: companyForm.sgk_sicil_no.trim(),
          phone: companyForm.phone.trim(),
          email: companyForm.email.trim(),
        });
        if (createdComp?.id) {
          smsService.setCompanySmsEnabled(createdComp.id, companySmsActive, companyForm.name.trim());
        }
        setManageMessage('Yeni şirket eklendi.');
      }
      resetCompanyForm();
      setShowCompanyForm(false);
      await loadManageData();
    } catch (err: any) {
      setManageError(err.message ?? 'Şirket kaydedilemedi.');
    }
  };

  const handleToggleCompanySms = (c: CompanyRow) => {
    if (!canManageCompanies) {
      showError('Vardiya SMS servisini yalnızca Süper Yönetici açıp kapatabilir.');
      return;
    }
    const current = smsService.isCompanySmsEnabled(c.id, true);
    const next = !current;
    smsService.setCompanySmsEnabled(c.id, next, c.name);
    setSmsRefreshKey(prev => prev + 1);
    if (next) {
      showSuccess(`"${c.name}" firması için Vardiya SMS servisi başarıyla AÇILDI.`);
    } else {
      showSuccess(`"${c.name}" firması için Vardiya SMS servisi KAPATILDI.`);
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
    setCompanySmsActive(smsService.isCompanySmsEnabled(company.id, true));
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

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            {isSirketMode ? (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-blue-100">
                <Building2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-blue-100">
                <Settings className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                {isSirketMode ? 'Şirket Bilgileri & Yönetimi' : 'Kanunlar ve Kurallar'}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isSirketMode
                  ? 'Kurumsal profil, genel merkez lokasyonu, vergi ve SGK sicil bilgileri'
                  : '4857 sayılı İş Kanunu parametreleri, çalışma saatleri ve yasal mevzuat kuralları'}
              </p>
            </div>
          </div>

          {isSirketMode && canManageCompanies && (
            <button
              onClick={() => {
                resetCompanyForm();
                setShowCompanyForm(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Şirket Ekle</span>
            </button>
          )}
        </div>

        {/* Uyarı Mesajı (Yalnızca Kanunlar ve Kurallar sayfasında gösterilir) */}
        {!isSirketMode && (
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
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        {kategoriler.length > 1 && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {kategoriler.map(kategori => {
                const Icon = kategori.icon;
                const isActive = activeTab === kategori.id;
                return (
                  <button
                    key={kategori.id}
                    onClick={() => setActiveTab(kategori.id as ParametreKategorisi)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
                      isActive
                        ? getKategoriRengi(kategori.color)
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 bg-white shadow-xs'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {kategori.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

              {/* Emekli Bordro Parametreleri Tablosu */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Emekli Bordro Hesaplama Parametreleri</h3>
                    <p className="text-xs text-gray-600">2026 yılı aylık bordro hesaplama oranları ve SGK tavanları</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Sabit Oranlar */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Sabit Oranlar</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                        <div className="text-xs text-blue-600 font-medium mb-1">SGK İşçi Payı</div>
                        <div className="text-xl font-bold text-blue-700">
                          %{(sistemAyarlari.emeклiBordroParametreleri.sgkIsciPayiOrani * 100).toFixed(0)}
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
                        <div className="text-xs text-green-600 font-medium mb-1">İşsizlik İşçi</div>
                        <div className="text-xl font-bold text-green-700">
                          %{(sistemAyarlari.emeклiBordroParametreleri.issizlikIsciPayiOrani * 100).toFixed(0)}
                        </div>
                      </div>
                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5">
                        <div className="text-xs text-teal-600 font-medium mb-1">Damga Vergisi</div>
                        <div className="text-xl font-bold text-teal-700">
                          %{(sistemAyarlari.emeклiBordroParametreleri.damgaVergisiOrani * 100).toFixed(3)}
                        </div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5">
                        <div className="text-xs text-orange-600 font-medium mb-1">SGK İşveren</div>
                        <div className="text-xl font-bold text-orange-700">
                          %{(sistemAyarlari.emeклiBordroParametreleri.sgkIsverenPayiOrani * 100).toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
                        <div className="text-xs text-red-600 font-medium mb-1">İşsizlik İşveren</div>
                        <div className="text-xl font-bold text-red-700">
                          %{(sistemAyarlari.emeклiBordroParametreleri.issizlikIsverenPayiOrani * 100).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SGK Tavanları & Gelir Vergisi Dilimleri */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* SGK Tavanları */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">2026 Yılı Aylık SGK Tavanları</h4>
                      <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3.5 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">Ay</th>
                              <th className="px-3.5 py-2.5 text-right font-semibold text-gray-700 border-b border-gray-200">SGK Tavanı (₺)</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {Object.entries(sistemAyarlari.emeклiBordroParametreleri.sgkTavanlari).map(([ay, tutar], index) => (
                              <tr key={ay} className={index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                                <td className="px-3.5 py-2 font-medium text-gray-800 capitalize">
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
                                <td className="px-3.5 py-2 font-bold text-gray-900 text-right">
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
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">2026 Gelir Vergisi Dilimleri</h4>
                      <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3.5 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">Dilim</th>
                              <th className="px-3.5 py-2.5 text-right font-semibold text-gray-700 border-b border-gray-200">Matrah (₺)</th>
                              <th className="px-3.5 py-2.5 text-right font-semibold text-gray-700 border-b border-gray-200">Vergi Oranı</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.map((dilim, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                                <td className="px-3.5 py-2 font-medium text-gray-800">
                                  {index + 1}. Dilim
                                </td>
                                <td className="px-3.5 py-2 font-bold text-gray-900 text-right">
                                  {index === 0 ? '0' : sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri[index - 1].matrah.toLocaleString('tr-TR')} - {dilim.matrah.toLocaleString('tr-TR')} ₺
                                </td>
                                <td className="px-3.5 py-2 font-bold text-blue-700 text-right">
                                  %{(dilim.oran * 100).toFixed(0)}
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td className="px-3.5 py-2 font-medium text-gray-800">
                                {sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.length + 1}. Dilim
                              </td>
                              <td className="px-3.5 py-2 font-bold text-gray-900 text-right">
                                {sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri[sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.length - 1].matrah.toLocaleString('tr-TR')} ₺ ve üzeri
                              </td>
                              <td className="px-3.5 py-2 font-bold text-blue-700 text-right">
                                %{(sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri[sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.length - 1].oran * 100).toFixed(0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
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
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              
              {/* 1. Kurumsal Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
                {/* Background Ambient Glows */}
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                    {/* Logo / Initials Avatar */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg ring-4 ring-white/10 shrink-0">
                      {sistemAyarlari.sirketBilgileri.ad ? (
                        sistemAyarlari.sirketBilgileri.ad.slice(0, 2).toUpperCase()
                      ) : (
                        <Building2 className="w-10 h-10" />
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight truncate">
                          {sistemAyarlari.sirketBilgileri.ad || 'Şirket Tanımlanmamış'}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Aktif Şirket
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs sm:text-sm text-slate-300 flex-wrap">
                        {sistemAyarlari.sirketBilgileri.bulunduguIl && (
                          <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl">
                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                            <span>{sistemAyarlari.sirketBilgileri.bulunduguIl}, Türkiye</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Kurumsal Mükellef</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => {
                        const isDemoSession = (demoService.isDemoActive() && localStorage.getItem('humanius_superadmin_session') !== 'true') || profile?.company_id === 'demo-company-id-9999';
                        const myCompany = isDemoSession
                          ? { id: 'demo-company-id-9999', name: 'Humanius Demo Şirketi', address: '', tax_number: '', sgk_sicil_no: '', phone: '', email: 'demo@humanius.net', city: 'İstanbul' } as CompanyRow
                          : (companies.find(c => c.id === profile?.company_id) || companies[0]);
                        if (myCompany) {
                          startEditCompany(myCompany);
                        } else {
                          resetCompanyForm();
                          setShowCompanyForm(true);
                        }
                      }}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm backdrop-blur-md border border-white/20 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Pencil className="w-4 h-4 text-blue-300" />
                      <span>Şirket Bilgilerini Düzenle</span>
                    </button>
                    {canManageCompanies && (
                      <button
                        onClick={() => {
                          resetCompanyForm();
                          setShowCompanyForm(true);
                          setActiveTab('sirketler');
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Yeni Şirket</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 1. AYAR KARTI: RESMİ ŞİRKET BİLGİLERİ (KURUMSAL MAVİ TEMA)                */}
              {/* ========================================================================= */}
              <div className="bg-white rounded-3xl border-2 border-blue-200/90 shadow-md hover:shadow-lg transition-all overflow-hidden">
                {/* Üst Renk Vurgu Şeridi */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />
                
                <div className="p-6 sm:p-7 space-y-6">
                  {/* Başlık & Kimlik Alanı */}
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-blue-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs border border-blue-200/80">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 tracking-wide uppercase">
                            1. Ayar: Şirket Bilgileri
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Resmi Kayıtlar Faal & Onaylı
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">
                          Resmi Şirket Bilgileri & Kurumsal Kayıtlar
                        </h3>
                        <p className="text-xs text-slate-500">
                          Vergi dairesi kayıtları, SGK işyeri sicil numarası, genel merkez adresi ve resmi iletişim kanalları
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hızlı Metrik / Kopyalama Şeridi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Vergi No */}
                    <div className="bg-slate-50/70 rounded-2xl border-2 border-slate-200 hover:border-blue-400 p-4 shadow-2xs hover:shadow-xs transition-all relative group">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-blue-600" />
                          Vergi Numarası
                        </span>
                        <button
                          onClick={() => handleCopy(sistemAyarlari.sirketBilgileri.vergiNo, 'vergiNo')}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="Kopyala"
                        >
                          {copiedField === 'vergiNo' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="text-base font-extrabold text-slate-800 tracking-wide font-mono">
                        {sistemAyarlari.sirketBilgileri.vergiNo || '—'}
                      </div>
                      {copiedField === 'vergiNo' && (
                        <span className="absolute bottom-2 right-4 text-[10px] text-emerald-600 font-bold animate-in fade-in">
                          Kopyalandı!
                        </span>
                      )}
                    </div>

                    {/* SGK Sicil No */}
                    <div className="bg-slate-50/70 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 p-4 shadow-2xs hover:shadow-xs transition-all relative group">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          SGK Sicil Numarası
                        </span>
                        <button
                          onClick={() => handleCopy(sistemAyarlari.sirketBilgileri.sgkSicilNo, 'sgkSicilNo')}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-50 transition-colors"
                          title="Kopyala"
                        >
                          {copiedField === 'sgkSicilNo' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="text-base font-extrabold text-slate-800 tracking-wide font-mono truncate">
                        {sistemAyarlari.sirketBilgileri.sgkSicilNo || '—'}
                      </div>
                      {copiedField === 'sgkSicilNo' && (
                        <span className="absolute bottom-2 right-4 text-[10px] text-emerald-600 font-bold animate-in fade-in">
                          Kopyalandı!
                        </span>
                      )}
                    </div>

                    {/* Telefon */}
                    <div className="bg-slate-50/70 rounded-2xl border-2 border-slate-200 hover:border-emerald-400 p-4 shadow-2xs hover:shadow-xs transition-all">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          Santral Telefon
                        </span>
                      </div>
                      <div className="text-base font-bold text-slate-800 truncate">
                        {sistemAyarlari.sirketBilgileri.telefon ? (
                          <a href={`tel:${sistemAyarlari.sirketBilgileri.telefon}`} className="hover:text-emerald-600 hover:underline transition-colors">
                            {sistemAyarlari.sirketBilgileri.telefon}
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>

                    {/* E-Posta */}
                    <div className="bg-slate-50/70 rounded-2xl border-2 border-slate-200 hover:border-cyan-400 p-4 shadow-2xs hover:shadow-xs transition-all relative group">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-cyan-600" />
                          Kurumsal E-posta
                        </span>
                        <button
                          onClick={() => handleCopy(sistemAyarlari.sirketBilgileri.email, 'email')}
                          className="text-slate-400 hover:text-cyan-600 p-1 rounded-md hover:bg-cyan-50 transition-colors"
                          title="Kopyala"
                        >
                          {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="text-base font-bold text-slate-800 truncate">
                        {sistemAyarlari.sirketBilgileri.email ? (
                          <a href={`mailto:${sistemAyarlari.sirketBilgileri.email}`} className="hover:text-cyan-600 hover:underline transition-colors">
                            {sistemAyarlari.sirketBilgileri.email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                      {copiedField === 'email' && (
                        <span className="absolute bottom-2 right-4 text-[10px] text-emerald-600 font-bold animate-in fade-in">
                          Kopyalandı!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bento Grid: Sol Yasal Kayıtlar & Sağ Genel Merkez */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Sol Kart: Yasal & Resmi Kayıtlar */}
                    <div className="bg-slate-50/70 rounded-2xl border-2 border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          <Building className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Yasal & Resmi Kayıt Bilgileri</h4>
                          <p className="text-[11px] text-slate-500">Mevzuat, vergi dairesi ve SGK işyeri kayıtları</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-white border border-slate-300/80 shadow-xs">
                          <div className="text-[11px] font-semibold text-slate-500 mb-1">Resmi Şirket Unvanı</div>
                          <div className="text-sm font-bold text-slate-900 leading-snug">
                            {sistemAyarlari.sirketBilgileri.ad || 'Belirtilmemiş'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3.5 rounded-xl bg-white border border-slate-300/80 shadow-xs">
                            <div className="text-[11px] font-semibold text-slate-500 mb-1">Vergi Numarası</div>
                            <div className="text-sm font-bold text-slate-800 font-mono">
                              {sistemAyarlari.sirketBilgileri.vergiNo || '—'}
                            </div>
                          </div>
                          <div className="p-3.5 rounded-xl bg-white border border-slate-300/80 shadow-xs">
                            <div className="text-[11px] font-semibold text-slate-500 mb-1">Mükellefiyet Durumu</div>
                            <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4" />
                              <span>Faal & Onaylı</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white border border-slate-300/80 shadow-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-slate-500">SGK İşyeri Sicil Numarası</span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              e-Bildirge Aktif
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-800 font-mono">
                            {sistemAyarlari.sirketBilgileri.sgkSicilNo || '—'}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            Aylık prim ve hizmet bildirgeleri (APHB) ve muhtasar beyanname eşleşmesinde resmi sicil olarak doğrulanır.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sağ Kart: İletişim & Lokasyon */}
                    <div className="bg-slate-50/70 rounded-2xl border-2 border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <MapPin className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Genel Merkez & İletişim</h4>
                          <p className="text-[11px] text-slate-500">Adres, şehir ve resmi iletişim kanalları</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-white border border-slate-300/80 shadow-xs">
                          <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>Genel Merkez Adresi</span>
                          </div>
                          <div className="text-sm font-medium text-slate-800 leading-relaxed">
                            {sistemAyarlari.sirketBilgileri.adres || 'Adres bilgisi girilmemiştir.'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3.5 rounded-xl bg-white border border-slate-300/80 shadow-xs">
                            <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>Telefon</span>
                            </div>
                            <div className="text-sm font-bold text-slate-800">
                              {sistemAyarlari.sirketBilgileri.telefon || '—'}
                            </div>
                          </div>
                          <div className="p-3.5 rounded-xl bg-white border border-slate-300/80 shadow-xs">
                            <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>E-posta</span>
                            </div>
                            <div className="text-sm font-bold text-slate-800 truncate">
                              {sistemAyarlari.sirketBilgileri.email || '—'}
                            </div>
                          </div>
                        </div>

                        {/* Bulunduğu İl ve Yol İzni Vurgusu */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-900 shadow-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                            <h5 className="text-xs font-bold text-amber-950">
                              Mevzuat Lokasyonu: {sistemAyarlari.sirketBilgileri.bulunduguIl || 'İstanbul'}
                            </h5>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                            Bu şehir bilgisi, personellerin 4857 sayılı İş Kanunu kapsamındaki 
                            <strong> yol izni taleplerinde</strong> (il dışı seyahatlerde +4 güne kadar ücretsiz yol izni hakkı) referans lokasyon olarak doğrulanır.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 2. AYAR KARTI: ÇALIŞMA DÜZENİ & MESAİ POLİTİKASI (ZÜMRÜT / TEAL TEMA)     */}
              {/* ========================================================================= */}
              <div className="bg-white rounded-3xl border-2 border-emerald-200/90 shadow-md hover:shadow-lg transition-all overflow-hidden">
                {/* Üst Renk Vurgu Şeridi */}
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-400" />
                
                <div className="p-6 sm:p-7 space-y-6">
                  {/* Başlık & Kimlik Alanı */}
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-emerald-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs border border-emerald-200/80">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 tracking-wide uppercase">
                            2. Ayar: Çalışma Düzeni
                          </span>
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            saturdayConfig.isSaturdayWork
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            {saturdayConfig.isSaturdayWork ? '✓ Aktif: 6 Günlük Düzen (Pzt-Cmt)' : '✓ Aktif: 5 Günlük Düzen (Pzt-Cum)'}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">
                          Haftalık Çalışma Düzeni & Mesai Politikası
                        </h3>
                        <p className="text-xs text-slate-500">
                          Şirket geneli haftalık çalışma düzeni (5 gün / 6 gün), Cumartesi mesai statüsü ve puantaj cetveli hesaplama kuralları
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {satConfigSuccess && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 animate-in fade-in flex items-center gap-1.5 shadow-xs">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Ayarlar Kaydedildi!
                        </span>
                      )}
                      {isSavingSatConfig && (
                        <span className="text-xs font-bold text-emerald-700">Kaydediliyor...</span>
                      )}
                    </div>
                  </div>

                  {/* 5 Günlük vs 6 Günlük Seçenek Kartları */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 5 Günlük Çalışma Düzeni */}
                    <div
                      onClick={() => handleToggleSaturdayWork(false)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                        !saturdayConfig.isSaturdayWork
                          ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">5 Günlük Çalışma Düzeni</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            Pazartesi – Cuma
                          </span>
                        </div>
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          !saturdayConfig.isSaturdayWork ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white'
                        }`}>
                          {!saturdayConfig.isSaturdayWork && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        Cumartesi günü <strong>Akdi Tatil (AT)</strong> kabul edilir. Personeller için hafta tatilidir; çalışıldığında tam gün fazla mesai (%100 zamlı) tahakkuk eder.
                      </p>

                      <div className="mt-3.5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Haftalık Yasal Süre: 45 Saat</span>
                        <span className="text-emerald-800 font-bold">Ofis & Genel Merkez Standardı</span>
                      </div>
                    </div>

                    {/* 6 Günlük Çalışma Düzeni */}
                    <div
                      onClick={() => handleToggleSaturdayWork(true)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                        saturdayConfig.isSaturdayWork
                          ? 'border-amber-600 bg-amber-50/40 shadow-md ring-2 ring-amber-500/20'
                          : 'border-slate-300 hover:border-amber-400 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">6 Günlük Çalışma Düzeni</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                            Pazartesi – Cumartesi
                          </span>
                        </div>
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          saturdayConfig.isSaturdayWork ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-400 bg-white'
                        }`}>
                          {saturdayConfig.isSaturdayWork && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        Cumartesi günü <strong>Fiili Çalışma (Ç)</strong> günüdür. Çalışma saatleri personelin bağlı olduğu vardiyasından otomatik alınır. Gelmeyen personele Devamsız (D) işlenir.
                      </p>

                      <div className="mt-3.5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Haftalık Yasal Süre: 45 Saat (6 Gün)</span>
                        <span className="text-amber-900 font-bold">Saha, Mağaza & Üretim Düzeni</span>
                      </div>
                    </div>
                  </div>

                  {/* Bilgilendirme Notu */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 text-xs text-emerald-950 flex items-center justify-between gap-3 shadow-xs">
                    <span className="leading-relaxed font-medium">
                      💡 Burada yapılan düzenleme şirket puantaj cetveline, aylık bordro icmallerine ve mesai hesaplamalarına anında uygulanır.
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 3. AYAR KARTI: İZİN TALEBİ ONAY SÜRECİ & AŞAMA AYARLARI (MOR / VIOLET)     */}
              {/* ========================================================================= */}
              <div className="bg-white rounded-3xl border-2 border-purple-200/90 shadow-md hover:shadow-lg transition-all overflow-hidden">
                {/* Üst Renk Vurgu Şeridi */}
                <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-500" />
                
                <div className="p-6 sm:p-7 space-y-6">
                  {/* Başlık & Kimlik Alanı */}
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-purple-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-xs border border-purple-200/80">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 tracking-wide uppercase">
                            3. Ayar: İzin Talep Onayı
                          </span>
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                            {leaveApprovalService.getActiveStagesCount(leaveApprovalConfig)} Kademeli Onay Aktif
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">
                          İzin Talebi Onay Süreç & Aşama Ayarları
                        </h3>
                        <p className="text-xs text-slate-500">
                          İzin taleplerinin kaç aşamalı onaydan geçeceğini belirleyin. İstediğiniz aşamaları açıp kapatabilirsiniz (1, 2 veya 3 kademeli onay).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {leaveApprovalSuccess && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 animate-in fade-in flex items-center gap-1.5 shadow-xs">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Ayarlar Kaydedildi!
                        </span>
                      )}
                      {isSavingLeaveApproval && (
                        <span className="text-xs font-bold text-purple-600">Kaydediliyor...</span>
                      )}
                    </div>
                  </div>

                  {/* Görsel Süreç Akış Çizgisi (Stepper & Canlı Aşama Durumu) */}
                  <div className="bg-gradient-to-br from-purple-50/60 via-indigo-50/40 to-white border-2 border-purple-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                    {/* Üst Başlık & Simülasyon Durum Seçicisi */}
                    <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-purple-200/70">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-black text-purple-950 uppercase tracking-wider">
                            Onay Akışı Sıralaması & Canlı Süreç Durumu
                          </span>
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                            Seçilen {activeApprovalSteps.length} Kademeli Akış
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Seçilen kademelere göre izin talebinin geçtiği, bulunduğu ve bekleyen aşamaları görsel olarak aşağıda listelenmiştir.
                        </p>
                      </div>

                      {/* Aşama Simülasyonu Seçici */}
                      <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-purple-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 px-1.5">Örnek Durum:</span>
                        {activeApprovalSteps.map((step) => (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => setWorkflowSimulationStep(step.stepNum)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                              workflowSimulationStep === step.stepNum
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {workflowSimulationStep === step.stepNum && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                            <span>{step.stepNum}. Kademede</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setWorkflowSimulationStep(activeApprovalSteps.length + 1)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                            workflowSimulationStep > activeApprovalSteps.length
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {workflowSimulationStep > activeApprovalSteps.length && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          )}
                          <span>✓ Tamamlandı</span>
                        </button>
                      </div>
                    </div>

                    {/* Akış Adımları (Grid / Flex - Kompakt Tasarım) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-stretch">
                      {/* 0. Adım: Çalışan Talebi (Her zaman Geçilen Aşama) */}
                      <div className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50/90 shadow-2xs flex flex-col justify-between transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                              <CheckCircle className="w-2.5 h-2.5" /> Geçildi
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800">Başlangıç</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-[11px] font-bold text-emerald-950 truncate">Çalışan Talebi</h5>
                              <p className="text-[10px] text-emerald-700 truncate">Talep Oluşturuldu</p>
                            </div>
                          </div>
                        </div>
                        <div className="pt-1.5 mt-1 border-t border-emerald-200/80 flex items-center justify-between text-[10px] font-bold text-emerald-800">
                          <span>Durum:</span>
                          <span>✓ Oluşturuldu</span>
                        </div>
                      </div>

                      {/* Dinamik Aktif Onay Kademeleri */}
                      {activeApprovalSteps.map((step) => {
                        const isPassed = step.stepNum < workflowSimulationStep;
                        const isCurrent = step.stepNum === workflowSimulationStep;
                        const isPending = step.stepNum > workflowSimulationStep;
                        const StepIcon = step.icon;

                        return (
                          <div
                            key={step.id}
                            className={`p-3 rounded-xl border-2 flex flex-col justify-between transition-all ${
                              isPassed
                                ? 'border-emerald-500 bg-emerald-50/90 shadow-2xs'
                                : isCurrent
                                ? 'border-blue-600 bg-blue-50/95 shadow-sm ring-2 ring-blue-500/25 relative scale-[1.01]'
                                : 'border-dashed border-slate-300 bg-slate-50/60 text-slate-500 opacity-70'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                {isPassed && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                                    <CheckCircle className="w-2.5 h-2.5" /> Geçildi
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs animate-pulse">
                                    <Clock className="w-2.5 h-2.5" /> Şu Anki Aşama
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600">
                                    ⚪ Sırada
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold ${
                                  isPassed ? 'text-emerald-800' : isCurrent ? 'text-blue-800' : 'text-slate-400'
                                }`}>
                                  {step.stepNum}. Kademe
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isPassed
                                    ? 'bg-emerald-600 text-white'
                                    : isCurrent
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-200 text-slate-400 border border-slate-300'
                                }`}>
                                  <StepIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className={`text-[11px] font-bold truncate leading-snug ${
                                    isPassed ? 'text-emerald-950' : isCurrent ? 'text-blue-950 font-black' : 'text-slate-600'
                                  }`}>
                                    {step.label}
                                  </h5>
                                  <p className={`text-[10px] truncate ${
                                    isPassed ? 'text-emerald-700' : isCurrent ? 'text-blue-700 font-semibold' : 'text-slate-400'
                                  }`}>
                                    {step.roleTitle}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className={`pt-1.5 mt-1 border-t flex items-center justify-between text-[10px] font-bold ${
                              isPassed
                                ? 'border-emerald-200/80 text-emerald-800'
                                : isCurrent
                                ? 'border-blue-200 text-blue-900'
                                : 'border-slate-200 text-slate-400'
                            }`}>
                              <span>Durum:</span>
                              <span className="flex items-center gap-1">
                                {isPassed && '✓ Onaylandı'}
                                {isCurrent && '⏳ Onay Bekliyor'}
                                {isPending && '⚪ Sırada'}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Son Adım: Bordro & Puantaj İşlendi */}
                      {(() => {
                        const isFinished = workflowSimulationStep > activeApprovalSteps.length;
                        return (
                          <div className={`p-3 rounded-xl border-2 flex flex-col justify-between transition-all ${
                            isFinished
                              ? 'border-emerald-500 bg-emerald-50/90 shadow-2xs'
                              : 'border-dashed border-slate-300 bg-slate-50/60 text-slate-500 opacity-70'
                          }`}>
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                {isFinished ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                                    <CheckCircle className="w-2.5 h-2.5" /> Tamamlandı
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600">
                                    ⚪ Sırada
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold ${isFinished ? 'text-emerald-800' : 'text-slate-400'}`}>
                                  Sonuç
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isFinished ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400 border border-slate-300'
                                }`}>
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className={`text-[11px] font-bold truncate leading-snug ${isFinished ? 'text-emerald-950' : 'text-slate-600'}`}>
                                    Bordro & Puantaj
                                  </h5>
                                  <p className={`text-[10px] truncate ${isFinished ? 'text-emerald-700' : 'text-slate-400'}`}>
                                    Sisteme İşlendi
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className={`pt-1.5 mt-1 border-t flex items-center justify-between text-[10px] font-bold ${
                              isFinished ? 'border-emerald-200/80 text-emerald-800' : 'border-slate-200 text-slate-400'
                            }`}>
                              <span>Durum:</span>
                              <span>{isFinished ? '✓ İzin Onaylandı' : '⚪ Onaylar Bitince'}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 3 Onay Aşaması Seçenek Kartları (Kompakt Tasarım) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* 1. Aşama: Birim Amiri */}
                    <div
                      onClick={() => handleToggleApprovalStage('manager')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                        leaveApprovalConfig.stages.manager
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                          : 'border-slate-300 hover:border-blue-300 bg-slate-50/50 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-xs ${
                              leaveApprovalConfig.stages.manager ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 border border-slate-300'
                            }`}>
                              1
                            </div>
                            <div>
                              <span className="font-extrabold text-xs text-slate-900 block">1. Aşama: Birim Amiri</span>
                              <span className="text-[10px] font-semibold text-slate-500">Departman Sorumlusu</span>
                            </div>
                          </div>

                          {/* Toggle Pill */}
                          <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                            leaveApprovalConfig.stages.manager ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                          }`}>
                            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                          Çalışanın bağlı olduğu departmanın birim amiri ilk değerlendirmeyi ve <strong>ön onayı</strong> yapar.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Aşama Statüsü:</span>
                        <span className={`font-bold ${leaveApprovalConfig.stages.manager ? 'text-blue-700' : 'text-slate-400'}`}>
                          {leaveApprovalConfig.stages.manager ? '✓ Açık (Zorunlu Kademe)' : '✗ Kapalı (Atlanır)'}
                        </span>
                      </div>
                    </div>

                    {/* 2. Aşama: İK Uzmanı */}
                    <div
                      onClick={() => handleToggleApprovalStage('hr')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                        leaveApprovalConfig.stages.hr
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20'
                          : 'border-slate-300 hover:border-indigo-300 bg-slate-50/50 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-xs ${
                              leaveApprovalConfig.stages.hr ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 border border-slate-300'
                            }`}>
                              2
                            </div>
                            <div>
                              <span className="font-extrabold text-xs text-slate-900 block">2. Aşama: İK Uzmanı</span>
                              <span className="text-[10px] font-semibold text-slate-500">Mevzuat & Bakiye Denetimi</span>
                            </div>
                          </div>

                          {/* Toggle Pill */}
                          <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                            leaveApprovalConfig.stages.hr ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                          }`}>
                            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                          İzin hak edişi, 4857 İş Kanunu uygunluğu ve resmi evrak süreci <strong>İK Uzmanı</strong> tarafından denetlenip onaylanır.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Aşama Statüsü:</span>
                        <span className={`font-bold ${leaveApprovalConfig.stages.hr ? 'text-indigo-700' : 'text-slate-400'}`}>
                          {leaveApprovalConfig.stages.hr ? '✓ Açık (Zorunlu Kademe)' : '✗ Kapalı (Atlanır)'}
                        </span>
                      </div>
                    </div>

                    {/* 3. Aşama: Şirket Yöneticisi */}
                    <div
                      onClick={() => handleToggleApprovalStage('admin')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                        leaveApprovalConfig.stages.admin
                          ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-1 ring-purple-500/20'
                          : 'border-slate-300 hover:border-purple-300 bg-slate-50/50 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-xs ${
                              leaveApprovalConfig.stages.admin ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500 border border-slate-300'
                            }`}>
                              3
                            </div>
                            <div>
                              <span className="font-extrabold text-xs text-slate-900 block">3. Aşama: Şirket Yöneticisi</span>
                              <span className="text-[10px] font-semibold text-slate-500">Genel Müdür / Üst Yönetim</span>
                            </div>
                          </div>

                          {/* Toggle Pill */}
                          <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                            leaveApprovalConfig.stages.admin ? 'bg-purple-600 justify-end' : 'bg-slate-300 justify-start'
                          }`}>
                            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                          Üst yönetim veya şirket yöneticisi tarafından verilen <strong>nihai onay</strong> kademesidir.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Aşama Statüsü:</span>
                        <span className={`font-bold ${leaveApprovalConfig.stages.admin ? 'text-purple-700' : 'text-slate-400'}`}>
                          {leaveApprovalConfig.stages.admin ? '✓ Açık (Zorunlu Kademe)' : '✗ Kapalı (Atlanır)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Esneklik Kuralı Bilgilendirmesi */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200/90 text-xs text-purple-950 flex items-start sm:items-center gap-3 shadow-xs">
                    <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5 sm:mt-0" />
                    <div className="leading-relaxed font-medium">
                      <strong>Esnek Onay Politikası:</strong> Yukarıdaki 3 kademeden herhangi 2 tanesini kapatıp <strong>yalnızca 1 onay</strong> açık bırakabilir, <strong>2 onay</strong> isteyebilir veya <strong>3 aşamalı tam akış</strong> çalıştırabilirsiniz. Kapalı olan kademeler izin onay sürecinde otomatik olarak atlanır.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Tüm Şirketler & Ekleme */}
          {activeTab === 'sirketler' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-purple-950">Tüm Şirketler & Yönetim</h3>
                      <p className="text-xs text-purple-700">Sistemde tanımlı tüm şirketleri listeleyin veya yeni şirket ekleyin</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      resetCompanyForm();
                      setShowCompanyForm(true);
                    }}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Yeni Şirket Ekle
                  </button>
                </div>

                {manageError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                    {manageError}
                  </div>
                )}
                {manageMessage && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
                    {manageMessage}
                  </div>
                )}

                {/* Şirketler Listesi Tablosu */}
                <div className="overflow-x-auto bg-white border border-purple-100 rounded-xl shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-50 border-b border-purple-100 text-purple-900 text-xs font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Şirket Adı</th>
                        <th className="px-4 py-3 text-left">Şehir</th>
                        <th className="px-4 py-3 text-left">Vergi No</th>
                        <th className="px-4 py-3 text-left">SGK Sicil No</th>
                        <th className="px-4 py-3 text-left">Telefon</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-center">Vardiya SMS Servisi</th>
                        <th className="px-4 py-3 text-center">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {companies.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                            Henüz kayıtlı şirket bulunmamaktadır.
                          </td>
                        </tr>
                      ) : (
                        companies.map((c, idx) => {
                          const isSmsOn = smsService.isCompanySmsEnabled(c.id, true);
                          return (
                            <tr key={c.id} className="hover:bg-purple-50/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-500">{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                              <td className="px-4 py-3 text-gray-600">{c.city || '-'}</td>
                              <td className="px-4 py-3 text-gray-600">{c.tax_number || '-'}</td>
                              <td className="px-4 py-3 text-gray-600">{c.sgk_sicil_no || '-'}</td>
                              <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                              <td className="px-4 py-3 text-gray-600">{c.email || '-'}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCompanySms(c)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-xs ${
                                    isSmsOn
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
                                  }`}
                                  title={
                                    isSmsOn
                                      ? 'Vardiya SMS Servisini Kapatmak İçin Tıklayın'
                                      : 'Vardiya SMS Servisini Açmak İçin Tıklayın (Süper Yönetici)'
                                  }
                                >
                                  <MessageSquare className={`w-3.5 h-3.5 ${isSmsOn ? 'text-emerald-600' : 'text-slate-400'}`} />
                                  <span>{isSmsOn ? 'SMS Açık' : 'SMS Kapalı'}</span>
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      isSmsOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                    }`}
                                  />
                                </button>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => startEditCompany(c)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Düzenle"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCompany(c)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Sil"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Emekli Bordro Parametreleri Tablosu (Sadece Kanunlar ve Kurallar Sayfasında) */}
      {!isSirketMode && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Emekli Bordro Hesaplama Parametreleri</h3>
              <p className="text-xs text-gray-600">2026 yılı aylık bordro hesaplama oranları, SGK tavanları ve gelir vergisi dilimleri</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Sabit Oranlar */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Sabit Oranlar</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                  <div className="text-xs text-blue-600 font-medium mb-1">SGK İşçi Payı</div>
                  <div className="text-xl font-bold text-blue-700">
                    %{(sistemAyarlari.emeклiBordroParametreleri.sgkIsciPayiOrani * 100).toFixed(0)}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
                  <div className="text-xs text-green-600 font-medium mb-1">İşsizlik İşçi</div>
                  <div className="text-xl font-bold text-green-700">
                    %{(sistemAyarlari.emeклiBordroParametreleri.issizlikIsciPayiOrani * 100).toFixed(0)}
                  </div>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5">
                  <div className="text-xs text-teal-600 font-medium mb-1">Damga Vergisi</div>
                  <div className="text-xl font-bold text-teal-700">
                    %{(sistemAyarlari.emeклiBordroParametreleri.damgaVergisiOrani * 100).toFixed(3)}
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5">
                  <div className="text-xs text-orange-600 font-medium mb-1">SGK İşveren</div>
                  <div className="text-xl font-bold text-orange-700">
                    %{(sistemAyarlari.emeклiBordroParametreleri.sgkIsverenPayiOrani * 100).toFixed(2)}
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
                  <div className="text-xs text-red-600 font-medium mb-1">İşsizlik İşveren</div>
                  <div className="text-xl font-bold text-red-700">
                    %{(sistemAyarlari.emeклiBordroParametreleri.issizlikIsverenPayiOrani * 100).toFixed(0)}
                  </div>
                </div>
              </div>
            </div>

            {/* SGK Tavanları & Gelir Vergisi Dilimleri */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SGK Tavanları */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">2026 Yılı Aylık SGK Tavanları</h4>
                <div className="overflow-x-auto max-h-72 border border-gray-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">Ay</th>
                        <th className="px-3.5 py-2.5 text-right font-semibold text-gray-700 border-b border-gray-200">SGK Tavanı (₺)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {Object.entries(sistemAyarlari.emeклiBordroParametreleri.sgkTavanlari).map(([ay, tutar], index) => (
                        <tr key={ay} className={index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                          <td className="px-3.5 py-2 font-medium text-gray-800 capitalize">
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
                          <td className="px-3.5 py-2 font-bold text-gray-900 text-right">
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
                <h4 className="text-sm font-semibold text-gray-700 mb-3">2026 Gelir Vergisi Dilimleri</h4>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">Dilim</th>
                        <th className="px-3.5 py-2.5 text-right font-semibold text-gray-700 border-b border-gray-200">Matrah (₺)</th>
                        <th className="px-3.5 py-2.5 text-right font-semibold text-gray-700 border-b border-gray-200">Vergi Oranı</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.map((dilim, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                          <td className="px-3.5 py-2 font-medium text-gray-800">
                            {index + 1}. Dilim
                          </td>
                          <td className="px-3.5 py-2 font-bold text-gray-900 text-right">
                            {index === 0 ? '0' : sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri[index - 1].matrah.toLocaleString('tr-TR')} - {dilim.matrah.toLocaleString('tr-TR')} ₺
                          </td>
                          <td className="px-3.5 py-2 font-bold text-blue-700 text-right">
                            %{(dilim.oran * 100).toFixed(0)}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-3.5 py-2 font-medium text-gray-800">
                          {sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.length + 1}. Dilim
                        </td>
                        <td className="px-3.5 py-2 font-bold text-gray-900 text-right">
                          {sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri[sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.length - 1].matrah.toLocaleString('tr-TR')} ₺ ve üzeri
                        </td>
                        <td className="px-3.5 py-2 font-bold text-blue-700 text-right">
                          %{(sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri[sistemAyarlari.emeклiBordroParametreleri.gelirVergisiDilimleri.length - 1].oran * 100).toFixed(0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Şirket Ekle / Düzenle Modal */}
      {showCompanyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {editingCompanyId ? 'Şirketi Düzenle' : 'Yeni Şirket Tanımla'}
                  </h2>
                  <p className="text-xs text-gray-500">Sisteme yeni şirket ve kurum kaydedin</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCompanyForm(false);
                  resetCompanyForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCompanySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Şirket Unvanı *</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="Örn: Humanius Teknoloji A.Ş."
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bulunduğu İl</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    placeholder="Örn: İstanbul / Sakarya"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    placeholder="Örn: 0212 555 0000"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vergi Numarası</label>
                  <input
                    type="text"
                    value={companyForm.tax_number}
                    onChange={(e) => setCompanyForm({ ...companyForm, tax_number: e.target.value })}
                    placeholder="10 haneli VKN"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">SGK Sicil No</label>
                  <input
                    type="text"
                    value={companyForm.sgk_sicil_no}
                    onChange={(e) => setCompanyForm({ ...companyForm, sgk_sicil_no: e.target.value })}
                    placeholder="SGK İşyeri Sicil"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Şirket E-Posta</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  placeholder="info@sirket.com"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Adres</label>
                <textarea
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  rows={2}
                  placeholder="Tam şirket adresi..."
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Firma Bazlı SMS Servisi Açma / Kapama (Sadece Süper Yönetici) */}
              <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50/60 rounded-xl border border-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      companySmsActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">Vardiya SMS Servisi</span>
                    <span className="text-[11px] text-gray-500 block">
                      Varsayılan: Kapalı. Yalnızca Süper Yönetici açabilir.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCompanySmsActive(!companySmsActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                    companySmsActive
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      companySmsActive ? 'bg-white animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  {companySmsActive ? 'SMS Açık' : 'SMS Kapalı'}
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompanyForm(false);
                    resetCompanyForm();
                  }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  {editingCompanyId ? 'Güncelle' : 'Şirketi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SistemAyarlari;