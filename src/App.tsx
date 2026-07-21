import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Megaphone } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import StatsCards from './components/StatsCards';
import EmployeeTable from './components/EmployeeTable';
import EmployeeDrawer from './components/EmployeeDrawer';
import BordroMain from './components/BordroMain';
import BordroList from './components/BordroList';
import BordroIcmal from './components/BordroIcmal';
import BordroViewModal from './components/BordroViewModal';
import GorevTanimi from './components/GorevTanimi';
import IzinTalepForm from './components/IzinTalepForm';
import TopluIzinForm from './components/TopluIzinForm';
import IzinDuzenlemeForm from './components/IzinDuzenlemeForm';
import IzinTakvimi from './components/IzinTakvimi';
import IzinRaporlari from './components/IzinRaporlari';
import TakvimYonetimi from './components/TakvimYonetimi';
import SistemAyarlari from './components/SistemAyarlari';
import OzlukDosyasi from './components/OzlukDosyasi';
import UpcomingEvents from './components/UpcomingEvents';
import QuickActions from './components/QuickActions';
import { SearchPage } from './components/SearchPage';
import SmartHeader from './components/SmartHeader';
import { GlobalEmployeeHeader } from './components/GlobalEmployeeHeader';
import { ContextualHelp } from './components/ContextualHelp';
import KullanicilarPage from './components/KullanicilarPage';
import SifreDegistir from './components/SifreDegistir';
import IzinOzetKartlari from './components/IzinOzetKartlari';
import IzinliKisiler from './components/IzinliKisiler';
import PdksDevam from './components/PdksDevam';
import IsAkisi from './components/IsAkisi';
import DemoBanner from './components/DemoBanner';

import { IzinWorkflowListesi } from './components/IzinWorkflow';
import AIBrowserPage from './browser/AIBrowserPage';
import GuideContextMenu from './components/GuideContextMenu';
import PDKSYonetimi from './components/PDKSYonetimi';
import PerformansYonetimi from './components/PerformansYonetimi';
import EgitimLMS from './components/EgitimLMS';
import AnalitiKDashboard from './components/AnalitiKDashboard';
import KVKKUyumluluk from './components/KVKKUyumluluk';
import { OffboardingManager } from './components/OffboardingManager';
import IzinTanimlari from './components/IzinTanimlari';
import OrganizasyonSemasi from './components/OrganizasyonSemasi';
import ZimmetYonetimi from './components/ZimmetYonetimi';
import OKRYonetimi from './components/OKRYonetimi';
import YetkinlikMatrisi from './components/YetkinlikMatrisi';
import OnboardingAkisi from './components/OnboardingAkisi';
import EsnekYanHaklar from './components/EsnekYanHaklar';
import IzinCakismaKontrol from './components/IzinCakismaKontrol';
import DinamikFormBuilder from './components/DinamikFormBuilder';
import KullanımKilavuzu from './components/KullanımKilavuzu';
import { OnboardingModal } from './components/OnboardingModal';
import { employeeService } from './services/employeeService';
import { companyService } from './services/companyService';
import { izinService } from './services/izinService';
import { bordroService } from './services/bordroService';
import { canAccessView, getDefaultViewForRole } from './auth/roles';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import type { Employee, View, Stats, Company, Department } from './types';
import type { IzinTalebi, IzinHakki } from './types/izin';
import type { BordroItem } from './types/bordro';

// ─── Inner app (requires auth context) ───────────────────────────────────────

interface AppSectionErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  resetKey?: string;
}

interface AppSectionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppSectionErrorBoundary extends React.Component<
  AppSectionErrorBoundaryProps,
  AppSectionErrorBoundaryState
> {
  state: AppSectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): AppSectionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    console.error('UI section crashed:', error);
  }

  componentDidUpdate(prevProps: AppSectionErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return (this.props.fallback as any)(this.state.error);
      }
      return this.props.fallback;
    }

    return this.props.children;
  }
}

const AppInner: React.FC = () => {
  const { user, profile, appRole, loading: authLoading } = useAuth();
  const effectiveAppRole = user ? appRole : 'admin';
  const isEmployeeOnly = ['employee', 'user'].includes(effectiveAppRole);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<View>('arama');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');

  const isPopStateRef = useRef(false);

  useEffect(() => {
    // Initial state replace
    window.history.replaceState({ view: currentView }, '', '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        isPopStateRef.current = true;
        setCurrentView(event.state.view);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
    } else {
      window.history.pushState({ view: currentView }, '', '');
    }
  }, [currentView]);

  // ── Global Notification & Toplu Uyarı ────────────────────────────────────────
  const [showAlertNotification, setShowAlertNotification] = useState(() => {
    try {
      return localStorage.getItem('humanius_new_alert_notification') === 'true';
    } catch {
      return false;
    }
  });
  const [activeAlertText, setActiveAlertText] = useState<{ title: string; desc: string } | null>(null);

  const [showTopluUyariModal, setShowTopluUyariModal] = useState(false);
  const [topluUyariTitle, setTopluUyariTitle] = useState('');
  const [topluUyariDesc, setTopluUyariDesc] = useState('');
  const [topluUyariDate, setTopluUyariDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [topluUyariPriority, setTopluUyariPriority] = useState<'dusuk' | 'normal' | 'yuksek' | 'kritik'>('normal');
  const [topluUyariType, setTopluUyariType] = useState('diger');

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        setShowAlertNotification(localStorage.getItem('humanius_new_alert_notification') === 'true');
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (currentView === 'uyari') {
      try {
        localStorage.setItem('humanius_new_alert_notification', 'false');
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  }, [currentView]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      const shownKey = `humanius_onboarding_shown_${profile.id}`;
      const hasShown = localStorage.getItem(shownKey) === 'true';
      if (!hasShown) {
        setShowOnboarding(true);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (currentView === 'chat') {
      setCurrentView('arama');
    }
  }, [currentView]);

  useEffect(() => {
    if (!canAccessView(effectiveAppRole, currentView)) {
      setCurrentView(getDefaultViewForRole(effectiveAppRole));
    }
  }, [effectiveAppRole, currentView]);

  // ── Employee data ───────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<Stats>({ active: 0, onLeave: 0, inactive: 0 });
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  // ── Drawer ──────────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isNewEmployee, setIsNewEmployee] = useState(false);
  const [globalAccessGranted, setGlobalAccessGranted] = useState(false);

  useEffect(() => {
    if (selectedEmployee) {
      setGlobalAccessGranted(!selectedEmployee.approval_passcode);
    } else {
      setGlobalAccessGranted(false);
    }
  }, [selectedEmployee]);

  // ── İzin data ───────────────────────────────────────────────────────────────
  const [izinTalepleri, setIzinTalepleri] = useState<IzinTalebi[]>([]);
  const [izinHaklari, setIzinHaklari] = useState<IzinHakki[]>([]);
  const [showIzinForm, setShowIzinForm] = useState(false);
  const [showTopluIzinForm, setShowTopluIzinForm] = useState(false);
  const [editingIzin, setEditingIzin] = useState<IzinTalebi | null>(null);

  // ── Bordro data ─────────────────────────────────────────────────────────────
  const [bordrolar, setBordrolar] = useState<BordroItem[]>([]);
  const [selectedBordro, setSelectedBordro] = useState<BordroItem | null>(null);


  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!profile?.company_id) return;
    try {
      const [empData, empStats] = await Promise.all([
        employeeService.getAll(profile.company_id),
        employeeService.getStats(profile.company_id),
      ]);

      // Map DB rows → frontend Employee shape
      const mapped: Employee[] = (empData ?? []).map((e: any) => ({
        id: e.id,
        company_id: e.company_id,
        name: e.name ?? '',
        tc_no: e.tc_no,
        sicil_no: e.sicil_no,
        company: e.company_id ?? '',
        department: e.department ?? '',
        position: e.position ?? '',
        level: e.level ?? 'Junior',
        salary: Number(e.salary ?? 0),
        status: e.status ?? 'active',
        phone: e.phone ?? '',
        email: e.email ?? '',
        joinDate: e.join_date,
        join_date: e.join_date,
        address: e.address ?? '',
        avatar_url: e.avatar_url,
        skills: e.skills ?? [],
        medeni_durum: e.medeni_durum,
        cocuk_sayisi: e.cocuk_sayisi,
        engelli_durumu: e.engelli_durumu,
        employeeType: e.employee_type ?? 'normal',
        employee_type: e.employee_type,
        approval_passcode: e.approval_passcode,
        created_at: e.created_at,
        updated_at: e.updated_at,
      }));

      let filteredMapped = mapped;
      let currentUserEmpId: string | null = null;
      const isEmployeeRole = profile?.role === 'employee' || profile?.role === 'user';

      if (isEmployeeRole) {
        const currentUserEmp = mapped.find((emp) => {
          const profileEmail = String(profile?.email ?? '').toLowerCase();
          const empEmail = String(emp.email ?? '').toLowerCase();
          if (profileEmail && empEmail && profileEmail === empEmail) return true;
          const profileName = String(profile?.full_name ?? '').trim().toLocaleLowerCase('tr-TR');
          const empName = String(emp.name ?? '').trim().toLocaleLowerCase('tr-TR');
          if (profileName.length > 0 && profileName === empName) return true;
          
          const normalizedProfileName = profileName.replace(/[\s-]/g, '');
          const normalizedEmpName = empName.replace(/[\s-]/g, '');
          return normalizedProfileName.length > 0 && normalizedProfileName === normalizedEmpName;
        });
        if (currentUserEmp) {
          filteredMapped = [currentUserEmp];
          currentUserEmpId = currentUserEmp.id;
        } else {
          filteredMapped = [];
        }
      }

      setEmployees(filteredMapped);
      setStats(empStats ?? { active: 0, onLeave: 0, inactive: 0 });

      const depts = [...new Set(filteredMapped.map((e) => e.department).filter(Boolean))];
      setDepartments(depts);

      // Şirket listesi — sadece giriş yapan kullanıcının şirketi
      try {
        const compData = await companyService.getById(profile.company_id);
        setCompanies(compData ? [compData.name] : []);
        setCompanyLogoUrl(compData?.logo_url ?? null);
      } catch {}

      // İzin talepleri
      let mappedTalepler: IzinTalebi[] = [];
      try {
        const talepData = await izinService.getAllTalepler(profile.company_id);
        mappedTalepler = (talepData ?? []).map((t: any) => ({
          id: t.id,
          companyId: t.company_id,
          employeeId: t.employee_id,
          izinTuru: t.izin_turu,
          baslangicTarihi: t.baslangic_tarihi,
          bitisTarihi: t.bitis_tarihi,
          gunSayisi: t.gun_sayisi,
          aciklama: t.aciklama ?? '',
          yolIzniTalep: t.yol_izni_talep ?? false,
          yolIzniGun: t.yol_izni_gun ?? 0,
          seyahatYeri: t.seyahat_yeri ?? '',
          ilDisiSeyahat: t.il_disi_seyahat ?? false,
          belgeUrl: t.belge_url,
          durum: t.durum,
          onaylayanId: t.onaylayan_id,
          onayTarihi: t.onay_tarihi,
          redNedeni: t.red_nedeni,
          talepTarihi: t.talep_tarihi,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          employee: t.employees,
          employeeName: t.employees?.name ?? '',
          department: t.employees?.department ?? '',
        }));
        
        if (isEmployeeRole && currentUserEmpId) {
          mappedTalepler = mappedTalepler.filter(t => t.employeeId === currentUserEmpId);
        } else if (isEmployeeRole && !currentUserEmpId) {
          mappedTalepler = [];
        }

        setIzinTalepleri(mappedTalepler);
      } catch {}

      // İzin hakları
      try {
        const yil = new Date().getFullYear();
        const hakData = await izinService.getAllHaklari(profile.company_id, yil);
        const mappedHaklar: IzinHakki[] = (hakData ?? []).map((h: any) => ({
          id: h.id,
          companyId: h.company_id,
          employeeId: h.employee_id,
          yil: h.yil,
          toplamHak: h.toplam_hak,
          kullanilanIzin: h.kullanilan_izin ?? 0,
          kalanIzin: h.kalan_izin ?? 0,
          calismaYili: h.calisma_yili ?? 0,
          iseGirisTarihi: h.ise_giris_tarihi,
          hesaplamaTarihi: h.hesaplama_tarihi,
          mazeretIzin: h.mazeret_izin ?? 0,
          hastalikIzin: h.hastalik_izin ?? 0,
          mazeret: h.mazeret_izin ?? 0,
          createdAt: h.created_at,
          updatedAt: h.updated_at,
        }));

        // Onaylanan yillik izinler yillik haktan dusulur.
        const approvedAnnualByEmployee = mappedTalepler.reduce<Record<string, number>>((acc, talep) => {
          if (talep.durum !== 'onaylandi') return acc;
          if (talep.izinTuru !== 'yillik') return acc;

          const year = new Date(talep.baslangicTarihi).getFullYear();
          if (year !== yil) return acc;

          const used = (talep.gunSayisi || 0) + (talep.yolIzniTalep ? (talep.yolIzniGun || 0) : 0);
          acc[talep.employeeId] = (acc[talep.employeeId] || 0) + used;
          return acc;
        }, {});

        const calculatedHaklar = mappedHaklar.map((hak) => {
          const annualUsed = approvedAnnualByEmployee[hak.employeeId] || 0;
          const kullanilanIzin = annualUsed;
          const kalanIzin = Math.max(0, Number(hak.toplamHak || 0) - annualUsed);
          return {
            ...hak,
            kullanilanIzin,
            kalanIzin,
          };
        });

        let finalHaklar = calculatedHaklar;
        if (isEmployeeRole && currentUserEmpId) {
          finalHaklar = calculatedHaklar.filter(h => h.employeeId === currentUserEmpId);
        } else if (isEmployeeRole && !currentUserEmpId) {
          finalHaklar = [];
        }

        setIzinHaklari(finalHaklar);
      } catch {}

      // Bordro
      try {
        let bordroData = await bordroService.getAll(profile.company_id) ?? [];
        if (isEmployeeRole && currentUserEmpId) {
          bordroData = bordroData.filter(b => b.employee_id === currentUserEmpId && b.approval_status !== 'taslak' && b.approval_status != null);
        } else if (isEmployeeRole && !currentUserEmpId) {
          bordroData = [];
        }
        setBordrolar(bordroData);
      } catch {}

      // Load custom events from takvim_gunleri table
      try {
        const { data: calendarData, error: calErr } = await supabase
          .from('takvim_gunleri')
          .select('*')
          .eq('company_id', profile.company_id);
        if (!calErr && calendarData) {
          const eventsFromDb = calendarData.map((e: any) => ({
            id: e.id,
            baslik: e.ad,
            aciklama: e.aciklama ?? '',
            tarih: e.tarih,
            tur: e.tur === 'firma_ozel' ? 'diger' : e.tur === 'resmi_tatil' ? 'tatil' : 'diger',
            oncelik: 'normal',
            durum: 'beklemede',
          }));
          
          const localSaved = localStorage.getItem('humanius_custom_events');
          const localEvents = localSaved ? JSON.parse(localSaved) : [];
          const dbEventIds = new Set(eventsFromDb.map((e: any) => e.id));
          const uniqueLocalEvents = localEvents.filter((e: any) => !dbEventIds.has(e.id));
          
          const combinedEvents = [...eventsFromDb, ...uniqueLocalEvents];
          localStorage.setItem('humanius_custom_events', JSON.stringify(combinedEvents));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.error('Failed to load custom calendar events:', err);
      }

      // Load unread notifications from bildirimler table
      try {
        const { data: notificationsData, error: notifErr } = await supabase
          .from('bildirimler')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('user_id', profile.id)
          .eq('okundu_mu', false)
          .order('created_at', { ascending: false });

        if (!notifErr && notificationsData && notificationsData.length > 0) {
          const latest = notificationsData[0];
          setActiveAlertText({
            title: latest.baslik,
            desc: latest.mesaj,
          });
          setShowAlertNotification(true);
          localStorage.setItem('humanius_new_alert_notification', 'true');
        } else {
          setActiveAlertText(null);
          setShowAlertNotification(false);
          localStorage.setItem('humanius_new_alert_notification', 'false');
        }
      } catch (err) {
        console.error('Failed to load unread notifications:', err);
      }
    } catch (err) {
      console.error('Veri yüklenemedi:', err);
    }
  }, [profile?.company_id, profile?.role, profile?.email, profile?.full_name]);

  useEffect(() => {
    if (user && profile?.company_id) loadData();
  }, [user, profile?.company_id, loadData]);

  // Automatically select the logged in employee in the profile/details view
  useEffect(() => {
    const isEmployeeRole = ['employee', 'user'].includes(effectiveAppRole);
    if (isEmployeeRole && employees.length > 0) {
      const emp = employees[0];
      if (!selectedEmployee || selectedEmployee.id !== emp.id) {
        setSelectedEmployee(emp);
        setGlobalAccessGranted(true);
      }
    }
  }, [effectiveAppRole, employees, selectedEmployee]);

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredEmployees = employees.filter((emp) => {
    const safeName = String(emp.name ?? '').toLowerCase();
    const safeDepartment = String(emp.department ?? '').toLowerCase();
    const safePosition = String(emp.position ?? '').toLowerCase();
    const normalizedSearch = searchTerm.toLowerCase();
    const matchSearch =
      !searchTerm ||
      safeName.includes(normalizedSearch) ||
      safeDepartment.includes(normalizedSearch) ||
      safePosition.includes(normalizedSearch);
    const matchDept =
      selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchSearch && matchDept;
  });

  const currentEmployeeMatch = employees.find((emp) => {
    const profileEmail = String(profile?.email ?? '').trim().toLowerCase();
    const empEmail = String(emp.email ?? '').trim().toLowerCase();
    if (profileEmail && empEmail && profileEmail === empEmail) return true;

    const profileName = String(profile?.full_name ?? '').trim().toLowerCase();
    const empName = String(emp.name ?? '').trim().toLowerCase();
    if (profileName.length > 0 && profileName === empName) return true;
    
    const normalizedProfileName = profileName.replace(/[\s-]/g, '');
    const normalizedEmpName = empName.replace(/[\s-]/g, '');
    return normalizedProfileName.length > 0 && normalizedProfileName === normalizedEmpName;
  });

  const currentEmployeeIzinHakki = currentEmployeeMatch
    ? izinHaklari.find((hak) => hak.employeeId === currentEmployeeMatch.id)
    : undefined;

  const currentEmployeeIzinTalepleri = currentEmployeeMatch
    ? izinTalepleri
        .filter((talep) => talep.employeeId === currentEmployeeMatch.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
    : [];

  // ── Employee CRUD ───────────────────────────────────────────────────────────
  const handleEmployeeClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsNewEmployee(false);
    setGlobalAccessGranted(true);
    if (effectiveAppRole !== 'employee' && effectiveAppRole !== 'user') {
      setDrawerOpen(true);
    }
  };

  const handleNewEmployee = () => {
    setSelectedEmployee({
      id: '',
      name: '',
      company: '',
      department: '',
      position: '',
      level: 'Junior',
      salary: 0,
      status: 'active',
      phone: '',
      email: '',
      address: '',
      skills: [],
      employeeType: 'normal',
    });
    setIsNewEmployee(true);
    setDrawerOpen(true);
  };

  const handleSaveEmployee = async (emp: Employee) => {
    if (!profile?.company_id) return;
    try {
      if (isNewEmployee) {
        await employeeService.create({
          company_id: profile.company_id,
          name: emp.name,
          department: emp.department,
          position: emp.position,
          level: emp.level,
          salary: emp.salary,
          status: emp.status,
          phone: emp.phone,
          email: emp.email,
          address: emp.address,
          skills: emp.skills,
          employee_type: emp.employeeType ?? 'normal',
          tc_no: emp.tc_no ?? '',
          sicil_no: emp.sicil_no ?? '',
          join_date: emp.joinDate ?? emp.join_date ?? null,
        });
      } else {
        await employeeService.update(emp.id, {
          name: emp.name,
          department: emp.department,
          position: emp.position,
          level: emp.level,
          salary: emp.salary,
          status: emp.status,
          phone: emp.phone,
          email: emp.email,
          address: emp.address,
          skills: emp.skills,
          employee_type: emp.employeeType ?? 'normal',
          tc_no: emp.tc_no ?? '',
          sicil_no: emp.sicil_no ?? '',
          join_date: emp.joinDate ?? emp.join_date ?? null,
        });
      }
      setDrawerOpen(false);
      await loadData();
    } catch (err) {
      console.error('Personel kaydedilemedi:', err);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Bu personeli silmek istediğinize emin misiniz?')) return;
    try {
      await employeeService.delete(id);
      setDrawerOpen(false);
      await loadData();
    } catch (err) {
      console.error('Personel silinemedi:', err);
    }
  };

  const handleEmployeeActionSelect = (emp: Employee, action: 'gorev' | 'bordro' | 'izin') => {
    setSelectedEmployee(emp);
    if (action === 'gorev') setCurrentView('gorev-tanimi');
    else if (action === 'bordro') setCurrentView('bordro');
    else if (action === 'izin') setCurrentView('izin');
  };

  const handleExportCSV = () => {
    const header = ['Ad Soyad', 'Şirket', 'Departman', 'Pozisyon', 'Seviye', 'Ücret', 'Durum', 'Telefon', 'Email'];
    const rows = filteredEmployees.map((e) => [
      e.name, e.company, e.department, e.position, e.level,
      e.salary, e.status, e.phone, e.email,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'personel_listesi.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── İzin CRUD ───────────────────────────────────────────────────────────────
  const handleIzinSubmit = async (talep: Partial<IzinTalebi>) => {
    const resolvedCompanyId =
      profile?.company_id ||
      user?.user_metadata?.company_id ||
      employees.find((emp) => !!emp.company_id)?.company_id ||
      null;

    if (!resolvedCompanyId) {
      alert('İzin talebi oluşturulamadı: şirket bilgisi bulunamadı.');
      return;
    }

    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    const baseTalep: Partial<IzinTalebi> = {
      companyId: resolvedCompanyId,
      employeeId: talep.employeeId ?? '',
      izinTuru: talep.izinTuru ?? 'yillik',
      baslangicTarihi: talep.baslangicTarihi ?? '',
      bitisTarihi: talep.bitisTarihi ?? '',
      gunSayisi: talep.gunSayisi ?? 0,
      aciklama: talep.aciklama ?? '',
      yolIzniTalep: talep.yolIzniTalep ?? false,
      yolIzniGun: talep.yolIzniGun ?? 0,
      seyahatYeri: talep.seyahatYeri ?? '',
      ilDisiSeyahat: talep.ilDisiSeyahat ?? false,
      belgeUrl: talep.belgeUrl ?? null,
      durum: 'beklemede',
      talepTarihi: today,
      createdAt: nowIso,
      updatedAt: nowIso,
      onaylayanId: null,
      onayTarihi: null,
      redNedeni: null,
    };

    try {
      await izinService.createTalep({
        company_id: resolvedCompanyId,
        employee_id: baseTalep.employeeId ?? '',
        izin_turu: baseTalep.izinTuru ?? 'yillik',
        baslangic_tarihi: baseTalep.baslangicTarihi ?? '',
        bitis_tarihi: baseTalep.bitisTarihi ?? '',
        gun_sayisi: baseTalep.gunSayisi ?? 0,
        aciklama: baseTalep.aciklama ?? '',
        yol_izni_talep: baseTalep.yolIzniTalep ?? false,
        yol_izni_gun: baseTalep.yolIzniGun ?? 0,
        seyahat_yeri: baseTalep.seyahatYeri ?? '',
        il_disi_seyahat: baseTalep.ilDisiSeyahat ?? false,
        durum: 'beklemede',
        talep_tarihi: today,
      });
      setShowIzinForm(false);
      await loadData();
    } catch (err: any) {
      console.error('İzin talebi oluşturulamadı:', err);
      const rawMessage = String(err?.message ?? '').toLowerCase();
      const isPermissionLikeError =
        rawMessage.includes('row-level security') ||
        rawMessage.includes('security policy') ||
        rawMessage.includes('permission denied') ||
        rawMessage.includes('not authorized') ||
        rawMessage.includes('rls');

      const localTalep: IzinTalebi = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `local-izin-${Date.now()}`,
        companyId: String(baseTalep.companyId ?? resolvedCompanyId),
        employeeId: String(baseTalep.employeeId ?? ''),
        izinTuru: (baseTalep.izinTuru ?? 'yillik') as IzinTalebi['izinTuru'],
        baslangicTarihi: String(baseTalep.baslangicTarihi ?? ''),
        bitisTarihi: String(baseTalep.bitisTarihi ?? ''),
        gunSayisi: Number(baseTalep.gunSayisi ?? 0),
        aciklama: String(baseTalep.aciklama ?? ''),
        yolIzniTalep: Boolean(baseTalep.yolIzniTalep),
        yolIzniGun: Number(baseTalep.yolIzniGun ?? 0),
        seyahatYeri: String(baseTalep.seyahatYeri ?? ''),
        ilDisiSeyahat: Boolean(baseTalep.ilDisiSeyahat),
        belgeUrl: baseTalep.belgeUrl ?? null,
        durum: 'beklemede',
        onaylayanId: null,
        onayTarihi: null,
        redNedeni: null,
        talepTarihi: String(baseTalep.talepTarihi ?? today),
        createdAt: String(baseTalep.createdAt ?? nowIso),
        updatedAt: String(baseTalep.updatedAt ?? nowIso),
        employeeName: employees.find((emp) => emp.id === baseTalep.employeeId)?.name ?? '',
        department: employees.find((emp) => emp.id === baseTalep.employeeId)?.department ?? '',
      };

      setIzinTalepleri((prev) => [localTalep, ...prev]);
      setShowIzinForm(false);

      if (isPermissionLikeError) {
        alert('İzin talebi yerel olarak eklendi. Veritabanı erişim yetkileri güncellenince otomatik kayıt aktif olacaktır.');
      } else {
        alert(
          `İzin talebi veritabanına kaydedilemedi, yerel olarak eklendi.${err?.message ? `\nDetay: ${err.message}` : ''}`
        );
      }
    }
  };

  const handleIzinUpdate = async (updatedTalep: Partial<IzinTalebi>) => {
    if (!editingIzin) return;
    try {
      await izinService.updateTalep(editingIzin.id, {
        baslangic_tarihi: updatedTalep.baslangicTarihi,
        bitis_tarihi: updatedTalep.bitisTarihi,
        gun_sayisi: updatedTalep.gunSayisi,
        aciklama: updatedTalep.aciklama,
        yol_izni_talep: updatedTalep.yolIzniTalep,
      });
      setEditingIzin(null);
      await loadData();
    } catch (err: any) {
      console.error('İzin güncellenemedi:', err);
      alert(`İzin güncellenemedi!${err?.message ? `\nDetay: ${err.message}` : ''}`);
    }
  };

  const handleIzinOnay = async (id: string) => {
    if (!profile?.id) {
      alert('Kullanıcı bilgisi bulunamadı.');
      return;
    }
    try {
      await izinService.approveTalep(id, profile.id);
      setIzinTalepleri((prev) =>
        prev.map((t) => (t.id === id ? { ...t, durum: 'onaylandi', onaylayanId: profile.id } : t))
      );
    } catch (error: any) {
      console.error('İzin onaylanamadı:', error);
      alert(`İzin onaylanırken bir hata oluştu: ${error?.message || ''}`);
    }
  };

  const handleTopluIzinSubmit = async (talepler: Partial<IzinTalebi>[]) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newTalepler = talepler.map(talep => {
        const emp = employees.find((e) => e.id === talep.employeeId);
        return {
          id: Math.random().toString(36).substr(2, 9),
          employeeId: talep.employeeId || '',
          employeeName: emp?.name || 'Bilinmeyen Personel',
          izinTuru: talep.izinTuru as any,
          baslangicTarihi: talep.baslangicTarihi || '',
          bitisTarihi: talep.bitisTarihi || '',
          gunSayisi: talep.gunSayisi || 0,
          yolIzniTalep: talep.yolIzniTalep,
          yolIzniGun: talep.yolIzniGun,
          seyahatYeri: talep.seyahatYeri,
          ilDisiSeyahat: talep.ilDisiSeyahat,
          aciklama: talep.aciklama || '',
          durum: 'beklemede',
          talep_tarihi: today,
        } as IzinTalebi;
      });

      setIzinTalepleri(prev => [...newTalepler, ...prev]);
      setShowTopluIzinForm(false);
      alert(`${newTalepler.length} personelin izin talebi başarıyla eklendi.`);
    } catch (err: any) {
      console.error('Toplu izin talebi eklenemedi:', err);
      alert('Toplu izin eklenirken bir hata oluştu.');
    }
  };



  const handleIzinRed = async (id: string) => {
    if (!profile?.id) {
      alert('Kullanıcı bilgisi bulunamadı.');
      return;
    }
    const neden = prompt('Red nedenini giriniz (İsteğe bağlı):');
    if (neden === null) return; // İptal edildi
    try {
      await izinService.rejectTalep(id, profile.id, neden);
      setIzinTalepleri((prev) =>
        prev.map((t) => (t.id === id ? { ...t, durum: 'reddedildi', onaylayanId: profile.id, redNedeni: neden } : t))
      );
    } catch (error: any) {
      console.error('İzin reddedilemedi:', error);
      alert(`İzin reddedilirken bir hata oluştu: ${error?.message || ''}`);
    }
  };

  // ── Bordro save ─────────────────────────────────────────────────────────────
  const handleSaveBordro = async (bordro: BordroItem) => {
    const normalizedBordro = {
      ...bordro,
      brut_maas: bordro.brut_maas ?? (bordro as any).temelKazanc ?? 0,
      net_maas: bordro.net_maas ?? (bordro as any).netMaas ?? 0,
      toplam_kesinti: bordro.toplam_kesinti ?? (bordro as any).toplamKesinti ?? 0,
      employees: (bordro as any).employees ?? (selectedEmployee
        ? { name: selectedEmployee.name, department: selectedEmployee.department }
        : undefined),
    } as BordroItem;

    setBordrolar((prev) => {
      const idx = prev.findIndex((item) => item.id === normalizedBordro.id);
      if (idx === -1) return [normalizedBordro, ...prev];

      const next = [...prev];
      next[idx] = { ...next[idx], ...normalizedBordro };
      return next;
    });
  };

  const handleViewBordro = (bordro: BordroItem) => {
    setSelectedBordro(bordro);
  };

  const handleEditBordro = (bordro: BordroItem) => {
    // Edit ekranı henüz ayrı değil; mevcutta detay modalı üzerinden işlem akışını açıyoruz.
    setSelectedBordro(bordro);
  };

  const handleSendBordroForApproval = async (bordro: BordroItem) => {
    const confirmSend = window.confirm(`${bordro.period} dönemi bordrosunu personelin onayına göndermek istediğinize emin misiniz?`);
    if (confirmSend) {
      try {
        await bordroService.updateApprovalStatus(bordro.id, 'beklemede');
        await loadData();
        alert('Bordro başarıyla personelin onayına gönderildi.');
      } catch (err: any) {
        console.error('Bordro onaya gönderilemedi:', err);
        alert(`Onaya gönderme işlemi başarısız oldu!\nDetay: ${err.message}`);
      }
    }
  };

  const handleDeleteBordro = async (id: string) => {
    try {
      await bordroService.delete(id);
      if (selectedBordro?.id === id) {
        setSelectedBordro(null);
      }
      await loadData();
    } catch (err: any) {
      console.error('Bordro silinemedi:', err);
      alert(`Bordro silinemedi!${err?.message ? `\nDetay: ${err.message}` : ''}`);
    }
  };

  const handleDeleteIzinTalebi = async (id: string) => {
    if (!window.confirm('Bu izin kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await izinService.deleteTalep(id);
      await loadData();
      alert('İzin kaydı başarıyla silindi.');
    } catch (err: any) {
      console.error('İzin silinirken hata oluştu:', err);
      alert('İzin kaydı silinirken bir hata oluştu.');
    }
  };

  const handleCancelIzinTalebi = async (id: string) => {
    if (!window.confirm('Bu izin kaydını iptal etmek istediğinize emin misiniz?')) return;
    try {
      await izinService.updateTalep(id, { durum: 'iptal' });
      await loadData();
      alert('İzin kaydı başarıyla iptal edildi.');
    } catch (err: any) {
      console.error('İzin iptal edilirken hata oluştu:', err);
      alert('İzin kaydı iptal edilirken bir hata oluştu.');
    }
  };

  const handleUpdateIzinHakki = async (employeeId: string, toplamHak: number, mazeretHak: number, hakId?: string) => {
    try {
      const yil = new Date().getFullYear();
      await izinService.createOrUpdateHakki({
        id: hakId,
        employee_id: employeeId,
        company_id: profile?.company_id,
        yil,
        toplam_hak: toplamHak,
        mazeret_izin: mazeretHak,
      });
      await loadData();
      alert('İzin hakları başarıyla güncellendi.');
    } catch (err: any) {
      console.error('İzin hakları güncellenemedi:', err);
      alert('İzin hakları güncellenirken bir hata oluştu.');
    }
  };

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const renderContent = () => {
    // ── Arama Sayfası — tam ekran ─────────────────────────────────
    if (currentView === 'arama') {
      return (
        <div className="flex-1 overflow-y-auto">
          <SearchPage
            employees={employees}
            izinTalepleri={izinTalepleri}
            bordrolar={bordrolar}
            onEmployeeClick={(emp) => { handleEmployeeClick(emp); }}
            onNavigate={(view) => setCurrentView(view)}
            companyLogoUrl={companyLogoUrl}
          />
        </div>
      );
    }

    // ── Tüm diğer görünümler ─────────────────────────────────────────────────
    return (
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 relative">
        <SmartHeader currentView={currentView} onNavigate={setCurrentView} />
        
        {!isEmployeeOnly && (
          <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 shrink-0">
            <div className="flex items-center gap-2">
              {companyLogoUrl ? (
                <img src={companyLogoUrl} alt="Logo" className="h-8 object-contain" />
              ) : (
                <>
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">H</div>
                  <h1 className="text-xl font-bold text-gray-800">Humanius</h1>
                </>
              )}
            </div>
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
          </div>
        )}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">
            {showAlertNotification && currentView !== 'uyari' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 text-sm">
                      {activeAlertText?.title || 'Yeni Etkinlik & Duyuru!'}
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {activeAlertText?.desc || 'Takviminizde yeni etkinlikler veya güncel duyurular bulunmaktadır. Lütfen kontrol ediniz.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCurrentView('uyari');
                      try {
                        localStorage.setItem('humanius_new_alert_notification', 'false');
                        window.dispatchEvent(new Event('storage'));
                      } catch {}
                      if (profile?.id) {
                        supabase
                          .from('bildirimler')
                          .update({ okundu_mu: true, okunma_tarihi: new Date().toISOString() })
                          .eq('user_id', profile.id)
                          .eq('okundu_mu', false)
                          .then(() => {
                            setShowAlertNotification(false);
                            setActiveAlertText(null);
                          });
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                  >
                    Takvimi Görüntüle
                  </button>
                  <button
                    onClick={() => {
                      try {
                        localStorage.setItem('humanius_new_alert_notification', 'false');
                        window.dispatchEvent(new Event('storage'));
                      } catch {}
                      if (profile?.id) {
                        supabase
                          .from('bildirimler')
                          .update({ okundu_mu: true, okunma_tarihi: new Date().toISOString() })
                          .eq('user_id', profile.id)
                          .eq('okundu_mu', false)
                          .then(() => {
                            setShowAlertNotification(false);
                            setActiveAlertText(null);
                          });
                      }
                    }}
                    className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors text-amber-800 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          {/* Personel listesi */}
        {currentView === 'personel' && (
          <>
            <Toolbar
              selectedDepartment={selectedDepartment}
              onDepartmentChange={setSelectedDepartment}
              selectedCompany={selectedCompany}
              onCompanyChange={setSelectedCompany}
              onNewEmployee={handleNewEmployee}
              onExportCSV={handleExportCSV}
              companies={companies}
              departments={departments}
            />
            <StatsCards stats={stats} />
            <EmployeeTable
              employees={filteredEmployees}
              onEmployeeClick={handleEmployeeClick}
              onDeleteEmployee={handleDeleteEmployee}
              onEmployeeActionSelect={handleEmployeeActionSelect}
            />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
              <QuickActions
                onBulkLeave={() => setShowTopluIzinForm(true)}
                onBulkAlert={() => setShowTopluUyariModal(true)}
                onUploadPayroll={() => setCurrentView('bordro')}
              />
              <UpcomingEvents />
            </div>
          </>
        )}

        {/* Görev Tanımı */}
        {currentView === 'gorev-tanimi' && <GorevTanimi mode="form" employees={employees} />}

        {/* Özlük Dosyası */}
        {currentView === 'ozluk-dosyasi' && (
          <OzlukDosyasi
            employees={employees}
            selectedEmpId={selectedEmployee?.id}
            isAccessGranted={true}
            izinTalepleri={izinTalepleri}
            izinHaklari={izinHaklari}
            bordrolar={bordrolar}
            onSelectEmployee={(empId) => {
              const emp = employees.find(e => e.id === empId);
              if (emp) {
                setSelectedEmployee(emp);
                setIsNewEmployee(false);
                setGlobalAccessGranted(true);
              }
            }}
          />
        )}

                {/* Bordro */}
        {currentView === 'bordro' && (
          ['employee', 'user'].includes(effectiveAppRole) ? (
            <div className="space-y-6">
              <BordroList
                bordrolar={bordrolar}
                onView={setSelectedBordro}
                isEmployeeView={true}
                onEdit={() => {}}
                onDelete={() => {}}
                onImport={() => {}}
                onSendForApproval={() => {}}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <BordroMain
                employees={employees}
                onSaveBordro={handleSaveBordro}
                bordrolar={bordrolar}
                onEdit={handleEditBordro}
                onDelete={handleDeleteBordro}
                onView={handleViewBordro}
              />
            </div>
          )
        )}
        
        {/* Bordro İcmal Raporu */}
        {currentView === 'bordro-icmal' && (
          <BordroIcmal bordrolar={bordrolar} />
        )}

        {/* İzin Yönetimi */}
        {currentView === 'izin' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h2 className="text-xl font-bold text-gray-800">İzin Yönetimi</h2>
              <div className="flex gap-2">
                {!['employee', 'user'].includes(effectiveAppRole) && (
                  <button
                    onClick={() => setShowTopluIzinForm(true)}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    👥 Toplu İzin Tanımla
                  </button>
                )}
                <button
                  onClick={() => setShowIzinForm(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  + Yeni İzin Talebi
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Aktif Kullanıcı İzin Özeti</p>
                  <h3 className="mt-1 text-lg font-bold text-indigo-900">{profile?.full_name || 'Kullanıcı'}</h3>
                  <p className="mt-1 text-sm text-indigo-800">
                    {currentEmployeeMatch
                      ? `${currentEmployeeMatch.department || 'Departman belirtilmedi'} • ${currentEmployeeMatch.position || 'Pozisyon belirtilmedi'}`
                      : 'Personel kaydı eşleşmedi'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 min-w-[220px]">
                  <div className="rounded-xl bg-white px-3 py-2 border border-indigo-100">
                    <p className="text-[11px] text-indigo-500">Kullanılan</p>
                    <p className="text-lg font-bold text-indigo-900">{currentEmployeeIzinHakki?.kullanilanIzin ?? 0} gün</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 border border-indigo-100">
                    <p className="text-[11px] text-indigo-500">Kalan</p>
                    <p className="text-lg font-bold text-indigo-900">{currentEmployeeIzinHakki?.kalanIzin ?? 0} gün</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white border border-indigo-100 p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Son İzin Talepleri</p>
                {currentEmployeeIzinTalepleri.length === 0 ? (
                  <p className="text-sm text-gray-500">Bu kullanıcıya ait izin talebi bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {currentEmployeeIzinTalepleri.map((talep) => (
                      <div key={talep.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                        <p className="text-sm font-medium text-gray-800">{talep.izinTuru} • {talep.gunSayisi} gün</p>
                        <p className="text-xs text-gray-500">{talep.baslangicTarihi} - {talep.bitisTarihi} • {talep.durum}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Özet kartlar + personel izin durumu */}
            {!['employee', 'user'].includes(effectiveAppRole) && (
              <>
                <IzinWorkflowListesi
                  talepleri={izinTalepleri}
                  onOnay={handleIzinOnay}
                  onRed={handleIzinRed}
                />
                <IzinOzetKartlari
                  employees={employees}
                  izinTalepleri={izinTalepleri}
                  izinHaklari={izinHaklari}
                  onUpdateHak={handleUpdateIzinHakki}
                />
              </>
            )}


            <IzinTakvimi izinTalepleri={izinTalepleri} />
          </div>
        )}

        {/* Raporlar */}
        {currentView === 'raporlar' && (
          <IzinRaporlari
            employees={employees}
            izinTalepleri={izinTalepleri}
            izinHaklari={izinHaklari}
          />
        )}

        {/* İŞ AKIŞI ve Operasyon */}
        {currentView === 'pdks-devam' && <PdksDevam employees={employees} izinTalepleri={izinTalepleri} />}
        {currentView === 'is-akisi' && <IsAkisi companyId={profile?.company_id} />}

        {/* PDKS (Eski) */}
        {currentView === 'pdks' && (
          <PDKSYonetimi
            employees={employees}
            izinTalepleri={izinTalepleri}
          />
        )}

        {/* Performans */}
        {currentView === 'performans' && <PerformansYonetimi employees={employees} userRole={effectiveAppRole} />}

        {/* Eğitim LMS */}
        {currentView === 'egitim' && <EgitimLMS employees={employees} companyId={profile?.company_id} />}

        {/* Analitik Dashboard */}
        {currentView === 'analitik' && (
          <AnalitiKDashboard
            employees={employees}
            izinTalepleri={izinTalepleri}
            izinHaklari={izinHaklari}
            bordrolar={bordrolar}
          />
        )}

        {/* KVKK Uyumluluk */}
        {currentView === 'kvkk' && <KVKKUyumluluk employees={employees} />}

        {/* İşten Çıkış / Offboarding */}
        {currentView === 'offboarding' && (
          <OffboardingManager 
            employees={employees}
            onDataRefresh={loadData}
            companyName={companies[0] || 'Humanius'}
          />
        )}

        {/* İzinli Kişiler Listesi */}
        {currentView === 'izin-listesi' && (
          <IzinliKisiler 
            izinTalepleri={izinTalepleri} 
            employees={employees} 
            departments={departments} 
            onDeleteLeave={handleDeleteIzinTalebi}
            onCancelLeave={handleCancelIzinTalebi}
          />
        )}

        {/* İzin Türleri Tanımları */}
        {currentView === 'izin-tanimlari' && <IzinTanimlari />}

        {/* Organizasyon Şeması */}
        {currentView === 'org-sema' && <OrganizasyonSemasi employees={employees} />}

        {/* Zimmet Yönetimi */}
        {currentView === 'zimmet' && <ZimmetYonetimi employees={employees} />}

        {/* OKR Yönetimi */}
        {currentView === 'okr' && <OKRYonetimi employees={employees} />}

        {/* Yetkinlik Matrisi */}
        {currentView === 'yetkinlik' && <YetkinlikMatrisi employees={employees} />}

        {/* Onboarding Akışı Kaldırıldı */}

        {/* Esnek Yan Haklar */}
        {currentView === 'yan-haklar' && <EsnekYanHaklar employees={employees} />}

        {/* İzin Çakışma Kontrolü */}
        {currentView === 'izin-cakisma' && <IzinCakismaKontrol employees={employees} izinTalepleri={izinTalepleri} />}

        {/* Dinamik Form Builder */}
        {currentView === 'form-builder' && <DinamikFormBuilder />}

        {/* Uyarılar & Takvim */}
        {currentView === 'uyari' && (
          <TakvimYonetimi
            employees={employees}
            izinTalepleri={izinTalepleri}
            bordrolar={bordrolar}
          />
        )}

        {/* Kullanıcı Yönetimi */}
        {currentView === 'kullanicilar' && <KullanicilarPage />}

        {/* Sistem Ayarları */}
        {currentView === 'ayar' && <SistemAyarlari />}

        {/* Kullanım Kılavuzu */}
        {currentView === 'kullanim-kilavuzu' && <KullanımKilavuzu />}

        {/* Şifre ve Güvenlik Ayarları */}
        {currentView === 'sifre-degistir' && <SifreDegistir />}
        </div>
      </main>
    );
  };

  return (
    <GuideContextMenu onNavigate={(v) => setCurrentView(v as View)}>
    <ContextualHelp />
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
            {!isEmployeeOnly && (
        <div className={`md:block ${mobileMenuOpen ? 'block fixed inset-0 z-50' : 'hidden md:relative z-40'}`}>
          {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />}
          <AppSectionErrorBoundary
            resetKey={currentView}
            fallback={
              <aside className="w-64 bg-white border-r border-gray-200 p-5 sticky top-0 h-screen overflow-y-auto shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800">Menü yüklenemedi</h2>
              </aside>
            }
          >
            <div className="relative h-full bg-white w-64 md:w-auto">
              <Sidebar
                currentView={currentView}
                onViewChange={(v) => { setCurrentView(v); setMobileMenuOpen(false); }}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>
          </AppSectionErrorBoundary>
        </div>
      )}

      <AppSectionErrorBoundary
        resetKey={currentView}
        fallback={(err?: Error) => (
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="bg-white border border-red-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-700">Sayfa yüklenirken bir hata oluştu</h2>
              <p className="text-sm text-gray-600 mt-2">Lütfen başka bir menüye geçin veya tekrar deneyin.</p>
              {err && (
                <div className="mt-4 p-4 bg-red-50 text-red-900 rounded-lg overflow-x-auto text-xs font-mono">
                  <strong>{err.name}:</strong> {err.message}
                  <pre className="mt-2 text-red-800">{err.stack}</pre>
                </div>
              )}
            </div>
          </main>
        )}
      >
        {renderContent()}
      </AppSectionErrorBoundary>

      <EmployeeDrawer
        isOpen={drawerOpen}
        employee={selectedEmployee}
        isNew={isNewEmployee}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveEmployee}
        onDelete={handleDeleteEmployee}
        companies={companies}
        departments={departments}
      />

      {selectedBordro && (
        <BordroViewModal
          bordro={selectedBordro}
          employeeId={selectedBordro.employee_id}
          employeeName={
            (selectedBordro as any).employees?.name ??
            employees.find((employee) => employee.id === selectedBordro.employee_id)?.name ??
            'Personel'
          }
          onClose={() => setSelectedBordro(null)}
          isEmployeeView={['employee', 'user'].includes(effectiveAppRole)}
        />
      )}

      {showTopluUyariModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden transform transition-all">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Toplu Uyarı Gönder</h3>
                  <p className="text-xs text-gray-500">Tüm şirket çalışanlarına duyuru gönderin</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTopluUyariModal(false);
                  setTopluUyariTitle('');
                  setTopluUyariDesc('');
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Duyuru Başlığı</label>
                <input
                  type="text"
                  value={topluUyariTitle}
                  onChange={(e) => setTopluUyariTitle(e.target.value)}
                  placeholder="Örn: Yıl Sonu Değerlendirme Toplantısı"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-400 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Duyuru Detayı</label>
                <textarea
                  value={topluUyariDesc}
                  onChange={(e) => setTopluUyariDesc(e.target.value)}
                  placeholder="Çalışanlara iletmek istediğiniz detaylı açıklama..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-400 text-sm min-h-[100px] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tarih</label>
                  <input
                    type="date"
                    value={topluUyariDate}
                    onChange={(e) => setTopluUyariDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Öncelik Derecesi</label>
                  <select
                    value={topluUyariPriority}
                    onChange={(e) => setTopluUyariPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 text-sm transition-all"
                  >
                    <option value="dusuk">Düşük</option>
                    <option value="normal">Normal</option>
                    <option value="yuksek">Yüksek</option>
                    <option value="kritik">Kritik</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Etkinlik Türü</label>
                <select
                  value={topluUyariType}
                  onChange={(e) => setTopluUyariType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 text-sm transition-all"
                >
                  <option value="diger">Duyuru / Diğer</option>
                  <option value="izin">İzin Bildirimi</option>
                  <option value="bordro">Bordro / Maaş Bildirimi</option>
                  <option value="tatil">Resmi Tatil / Kapalı Gün</option>
                  <option value="egitim">Eğitim / Seminer</option>
                  <option value="toplanti">Toplantı / Organizasyon</option>
                  <option value="sgk">SGK İşlemleri</option>
                  <option value="vergi">Vergi Beyanları</option>
                </select>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-3 p-5 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowTopluUyariModal(false);
                  setTopluUyariTitle('');
                  setTopluUyariDesc('');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 text-sm font-semibold transition-colors"
              >
                İptal Et
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!topluUyariTitle) {
                    alert('Lütfen bir başlık girin.');
                    return;
                  }

                  const newEv: any = {
                    id: `custom-${Date.now()}`,
                    baslik: topluUyariTitle,
                    aciklama: topluUyariDesc,
                    tarih: topluUyariDate || new Date().toISOString().split('T')[0],
                    tur: topluUyariType,
                    oncelik: topluUyariPriority,
                    durum: 'beklemede',
                  };

                  // Run DB saves asynchronously so UI doesn't block
                  (async () => {
                    try {
                      // 1. Insert to takvim_gunleri (for calendar)
                      await supabase.from('takvim_gunleri').insert({
                        company_id: profile.company_id,
                        tarih: newEv.tarih,
                        ad: newEv.baslik,
                        tur: 'firma_ozel',
                        aciklama: newEv.aciklama,
                        calisma_gunu_mu: true,
                        yil: new Date(newEv.tarih).getFullYear()
                      });

                      // 2. Fetch all profiles in the company
                      const { data: companyProfiles } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('company_id', profile.company_id);

                      // 3. Insert notification for each company profile
                      if (companyProfiles && companyProfiles.length > 0) {
                        const notifications = companyProfiles.map(p => ({
                          company_id: profile.company_id,
                          user_id: p.id,
                          baslik: newEv.baslik,
                          mesaj: newEv.aciklama,
                          tur: 'uyari',
                          oncelik: newEv.oncelik || 'normal',
                          okundu_mu: false
                        }));
                        await supabase.from('bildirimler').insert(notifications);
                      }
                    } catch (dbErr) {
                      console.error('Failed to sync bulk alert to database:', dbErr);
                    }
                  })();

                  try {
                    const saved = localStorage.getItem('humanius_custom_events');
                    const existingList = saved ? JSON.parse(saved) : [];
                    const updatedList = [...existingList, newEv];
                    localStorage.setItem('humanius_custom_events', JSON.stringify(updatedList));
                    localStorage.setItem('humanius_new_alert_notification', 'true');
                    window.dispatchEvent(new Event('storage'));
                  } catch (e) {
                    console.error('Failed to save bulk alert:', e);
                  }

                  setShowTopluUyariModal(false);
                  setTopluUyariTitle('');
                  setTopluUyariDesc('');
                  setCurrentView('uyari');
                }}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                Gönder ve Yayınla
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal
          onClose={() => {
            if (profile?.id) {
              localStorage.setItem(`humanius_onboarding_shown_${profile.id}`, 'true');
            }
            setShowOnboarding(false);
          }}
          onStartGuide={() => {
            if (profile?.id) {
              localStorage.setItem(`humanius_onboarding_shown_${profile.id}`, 'true');
            }
            setShowOnboarding(false);
            setCurrentView('kullanim-kilavuzu');
          }}
        />
      )}

      {showIzinForm && (
        <IzinTalepForm
          employees={employees}
          izinHaklari={izinHaklari}
          onSubmit={handleIzinSubmit}
          onClose={() => setShowIzinForm(false)}
        />
      )}

      {showTopluIzinForm && (
        <TopluIzinForm
          employees={employees}
          onSubmit={handleTopluIzinSubmit}
          onClose={() => setShowTopluIzinForm(false)}
        />
      )}

      {editingIzin && (
        <IzinDuzenlemeForm
          talep={editingIzin}
          employee={employees.find((e) => e.id === editingIzin.employeeId) ?? employees[0]}
          onSubmit={handleIzinUpdate}
          onClose={() => setEditingIzin(null)}
        />
      )}
      </div>
    </div>
    </GuideContextMenu>
  );
};

// ─── Root (provides contexts) ─────────────────────────────────────────────────

const App: React.FC = () => (
  <AuthProvider>
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  </AuthProvider>
);

export default App;
