import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Megaphone, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { canApproveLeave, type AppRole } from './auth/roles';
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
import { BordroDuzenlemeModal } from './components/BordroDuzenlemeModal';
import GorevTanimi from './components/GorevTanimi';
import IzinTalepForm from './components/IzinTalepForm';
import TopluIzinForm from './components/TopluIzinForm';
import IzinDuzenlemeForm from './components/IzinDuzenlemeForm';
import { IzinHakedisModal } from './components/IzinHakedisModal';
import IzinRaporlari from './components/IzinRaporlari';
import TakvimYonetimi from './components/TakvimYonetimi';
import SistemAyarlari from './components/SistemAyarlari';
import OzlukDosyasi from './components/OzlukDosyasi';
import { SearchPage } from './components/SearchPage';
import SmartHeader from './components/SmartHeader';
import { GlobalEmployeeHeader } from './components/GlobalEmployeeHeader';
import { ContextualHelp } from './components/ContextualHelp';
import KullanicilarPage from './components/KullanicilarPage';
import SifreDegistir from './components/SifreDegistir';
import IzinOzetKartlari from './components/IzinOzetKartlari';
import IzinYonetimi from './components/IzinYonetimi';
import IzinliKisiler from './components/IzinliKisiler';
import PdksDevam from './components/PdksDevam';
import { VardiyaSmsYonetimi } from './components/VardiyaSmsYonetimi';
import IsAkisi from './components/IsAkisi';
import DemoBanner from './components/DemoBanner';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { notificationService } from './services/notificationService';
import ExcelImportModal from './components/ExcelImportModal';
import EmployeeExportModal from './components/EmployeeExportModal';
import { userService } from './services/userService';
import { showConfirm, showSuccess, showError, showWarning, showPromptDialog } from './utils/swal';

import { Suspense } from 'react';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { formatIzinTuru } from './utils/izinCalculations';
import { leaveTypeService } from './services/leaveTypeService';
import { shiftService } from './services/shiftService';
import AIBrowserPage from './browser/AIBrowserPage';
import GuideContextMenu from './components/GuideContextMenu';
import {
  getEmployeeLocationMeta,
  parseAddressCity,
  parseIsYeriSgkFromAddress,
  getEmployeeIsYeriSgkSicil,
  saveEmployeeLocationMeta,
  saveEmployeeIsYeriSgkSicil,
  formatAddressWithLocationAndSgk,
} from './utils/employeeLocationMeta';
import { normalizeDateForInput } from './utils/dateUtils';

const PDKSYonetimi = lazyWithRetry(() => import('./components/PDKSYonetimi'));
const PerformansYonetimi = lazyWithRetry(() => import('./components/PerformansYonetimi'));
const EgitimLMS = lazyWithRetry(() => import('./components/EgitimLMS'));
const AnalitiKDashboard = lazyWithRetry(() => import('./components/AnalitiKDashboard'));
const KVKKUyumluluk = lazyWithRetry(() => import('./components/KVKKUyumluluk'));
const IzinTanimlari = lazyWithRetry(() => import('./components/IzinTanimlari'));
const OrganizasyonSemasi = lazyWithRetry(() => import('./components/OrganizasyonSemasi'));
const ZimmetYonetimi = lazyWithRetry(() => import('./components/ZimmetYonetimi'));
const OKRYonetimi = lazyWithRetry(() => import('./components/OKRYonetimi'));
const YetkinlikMatrisi = lazyWithRetry(() => import('./components/YetkinlikMatrisi'));
const EsnekYanHaklar = lazyWithRetry(() => import('./components/EsnekYanHaklar'));
const IzinCakismaKontrol = lazyWithRetry(() => import('./components/IzinCakismaKontrol'));
const DinamikFormBuilder = lazyWithRetry(() => import('./components/DinamikFormBuilder'));
const KullanımKilavuzu = lazyWithRetry(() => import('./components/KullanımKilavuzu'));
const TazminatHesaplama = lazyWithRetry(() => import('./components/TazminatHesaplama'));
const PuantajCetveli = lazyWithRetry(() => import('./components/PuantajCetveli'));
import { ForcePasswordChangeModal } from './components/ForcePasswordChangeModal';
import { employeeService } from './services/employeeService';
import { userManagementService } from './services/userManagementService';
import { companyService } from './services/companyService';
import { izinService } from './services/izinService';
import { bordroService } from './services/bordroService';
import { shiftSmsScheduler } from './services/shiftSmsScheduler';
import { leaveApprovalService } from './services/leaveApprovalService';
import { canAccessView, getDefaultViewForRole, canDeleteUsers } from './auth/roles';
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
  const { user, profile, appRole, loading: authLoading, isDemo } = useAuth();
  const effectiveAppRole = user ? appRole : 'admin';
  const isEmployeeOnly = ['employee', 'user'].includes(effectiveAppRole);
  const isSuper = effectiveAppRole === 'superadmin' || profile?.role === 'superadmin' || user?.email === 'superadmin@humanius.net';
  const isManagementRole = ['superadmin', 'admin', 'hr', 'manager'].includes(effectiveAppRole);

  const isForcePasswordChangeRequired = Boolean(
    !isDemo &&
    user &&
    (
      user?.user_metadata?.must_change_password === true ||
      user?.user_metadata?.is_first_login === true ||
      (profile as any)?.must_change_password === true ||
      (profile as any)?.is_first_login === true
    )
  );

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem('humanius_current_view') as View | null;
      if (saved && saved !== 'arama' && saved !== 'chat') {
        return saved;
      }
    } catch {}
    return 'personel';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [employeeSortOrder, setEmployeeSortOrder] = useState<'asc' | 'desc'>('asc');

  const isPopStateRef = useRef(false);

  useEffect(() => {
    // Clean up legacy global logo localStorage keys
    try {
      localStorage.removeItem('logoSrc');
      localStorage.removeItem('logoConfig');
      localStorage.removeItem('logoSrc_undefined');
      localStorage.removeItem('logoConfig_undefined');
      localStorage.removeItem('logoSrc_null');
      localStorage.removeItem('logoConfig_null');
    } catch {}

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
    try {
      if (currentView) {
        localStorage.setItem('humanius_current_view', currentView);
      }
    } catch {}
  }, [currentView]);

  useEffect(() => {
    if (!authLoading && user && !canAccessView(effectiveAppRole, currentView)) {
      setCurrentView('personel');
    }
  }, [authLoading, user, effectiveAppRole, currentView]);

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


  useEffect(() => {
    if (currentView === 'chat') {
      setCurrentView('personel');
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
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [showEmployeeExportModal, setShowEmployeeExportModal] = useState(false);

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
  const [showHakedisModal, setShowHakedisModal] = useState(false);
  const [hakedisEmployeeId, setHakedisEmployeeId] = useState<string | null>(null);
  const [editingIzin, setEditingIzin] = useState<IzinTalebi | null>(null);

  // ── Bordro data ─────────────────────────────────────────────────────────────
  const [bordrolar, setBordrolar] = useState<BordroItem[]>([]);
  const [selectedBordro, setSelectedBordro] = useState<BordroItem | null>(null);
  const [editingBordro, setEditingBordro] = useState<BordroItem | null>(null);


  const isDataLoadingRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const realtimeDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    if (isDataLoadingRef.current) return;
    isDataLoadingRef.current = true;

    // Tüm şirketlerin personel kayıtlarına erişebilmek için şirket filtresiz master veri çek
    const targetCompanyId = undefined;
    const resolvedCompanyId = profile?.company_id || undefined;
    const yil = new Date().getFullYear();

    try {
      // Fire all essential queries in parallel for instant data delivery
      const [
        allComps,
        compData,
        profilesRes,
        empData,
        empStats,
        talepData,
        hakData,
        bordroDataRaw,
        calendarRes,
        notifRes
      ] = await Promise.all([
        companyService.getCompanies().catch(() => []),
        (!isSuper && profile?.company_id) ? companyService.getById(profile.company_id).catch(() => null) : Promise.resolve(null),
        (async () => {
          try {
            const res = await supabase.from('profiles').select('id, email, full_name, role');
            if (res.data && res.data.length > 0) return res;
            const edge = await supabase.functions.invoke('user-management', { body: { operation: 'list_users' } });
            return { data: edge.data?.users || [] };
          } catch {
            return { data: [] };
          }
        })(),
        employeeService.getAll(targetCompanyId).catch(() => []),
        employeeService.getStats(targetCompanyId).catch(() => ({ active: 0, onLeave: 0, inactive: 0 })),
        resolvedCompanyId ? izinService.getAllTalepler(resolvedCompanyId).catch(() => []) : Promise.resolve([]),
        resolvedCompanyId ? izinService.getAllHaklari(resolvedCompanyId, yil).catch(() => []) : Promise.resolve([]),
        (resolvedCompanyId || isSuper) ? bordroService.getAll(isSuper ? undefined : resolvedCompanyId).catch(() => []) : Promise.resolve([]),
        resolvedCompanyId ? (async () => {
          try {
            const res = await supabase.from('takvim_gunleri').select('*').eq('company_id', resolvedCompanyId);
            return res;
          } catch {
            return { data: [] };
          }
        })() : Promise.resolve({ data: [] }),
        (resolvedCompanyId && profile?.id) ? (async () => {
          try {
            const res = await supabase.from('bildirimler').select('*').eq('company_id', resolvedCompanyId).eq('user_id', profile.id).eq('okundu_mu', false).order('created_at', { ascending: false });
            return res;
          } catch {
            return { data: [] };
          }
        })() : Promise.resolve({ data: [] })
      ]);

      const companyMap = new Map<string, string>([
        ['735825a4-f12b-4ee7-959c-a8a29e674617', 'Mıçı Otomotiv'],
        ['11111111-1111-1111-1111-111111111111', 'Bigsafer Teknolojiler A.Ş.'],
        ['87ed6f79-6a54-40ea-b188-8b325513dc41', 'Çavdarlı Otomotiv San. ve Tic. A.Ş.'],
        ['d4be3c56-bc23-4ecd-91e3-78f9625a5cb9', 'Hızel Otomotiv A.Ş.'],
        ['12004fce-050b-4db1-9a56-e414aec14246', 'Bakırcılar Otomotiv'],
        ['c2b6dd6f-317e-41a1-90d8-ac8774249c75', 'Skillbridge'],
        ['71fa880b-c3e2-4967-b121-a2692353aa55', 'BIGsafely Dijital Pazarlama A.Ş'],
        ['aaaaaaaa-0000-0000-0000-000000000001', 'Humanius Demo Şirketi'],
      ]);
      if (allComps && allComps.length > 0) {
        setCompanies(allComps.map((c: any) => c.name));
        allComps.forEach((c: any) => companyMap.set(c.id, c.name));
      } else {
        setCompanies([
          'Mıçı Otomotiv',
          'Bigsafer Teknolojiler A.Ş.',
          'Çavdarlı Otomotiv San. ve Tic. A.Ş.',
          'Hızel Otomotiv A.Ş.',
          'Bakırcılar Otomotiv',
          'Skillbridge',
          'BIGsafely Dijital Pazarlama A.Ş',
          'Humanius Demo Şirketi'
        ]);
      }

      if (compData) {
        companyMap.set(compData.id, compData.name);
        const logo = compData.logo_url && !compData.logo_url.toLowerCase().includes('toyota') ? compData.logo_url : null;
        setCompanyLogoUrl(logo);
      }

      const profileRoleMap = new Map<string, string>();
      const allProfiles = (profilesRes as any)?.data ?? [];
      allProfiles.forEach((p: any) => {
        if (p?.id) profileRoleMap.set(p.id, p.role);
        if (p?.email) profileRoleMap.set(p.email.toLowerCase().trim(), p.role);
        if (p?.full_name) {
          const normName = String(p.full_name).trim().toLocaleLowerCase('tr-TR');
          profileRoleMap.set(normName, p.role);
          const cleanName = normName.replace(/[\s-]/g, '');
          profileRoleMap.set(cleanName, p.role);
        }
      });

      // Map DB rows → frontend Employee shape
      const mapped: Employee[] = (empData ?? []).map((e: any) => {
        const empEmail = (e.email ?? '').toLowerCase().trim();
        const empName = String(e.name ?? '').trim().toLocaleLowerCase('tr-TR');
        const cleanEmpName = empName.replace(/[\s-]/g, '');
        const resolvedCompName = companyMap.get(e.company_id) || (profile?.company_id === e.company_id ? (profile as any)?.company_name : null) || 'Şirket';
        const resolvedRole = profileRoleMap.get(e.id) ?? profileRoleMap.get(empEmail) ?? profileRoleMap.get(empName) ?? profileRoleMap.get(cleanEmpName) ?? e.role ?? 'employee';

        const locMeta = getEmployeeLocationMeta(e.id, empEmail);
        const parsedAddr = parseAddressCity(e.address);
        const resolvedIl = (e.il && String(e.il).trim()) || locMeta.il || parsedAddr.il || '';
        const resolvedIlce = (e.ilce && String(e.ilce).trim()) || locMeta.ilce || parsedAddr.ilce || '';
        const resolvedIsYeriSgk =
          (e.is_yeri_sgk_sicil_no && String(e.is_yeri_sgk_sicil_no).trim()) ||
          ((e as any).isYeriSgkSicilNo && String((e as any).isYeriSgkSicilNo).trim()) ||
          parseIsYeriSgkFromAddress(e.address) ||
          getEmployeeIsYeriSgkSicil(e.id, empEmail) ||
          '';

        return {
          id: e.id,
          company_id: e.company_id,
          name: e.name ?? '',
          tc_no: e.tc_no,
          sicil_no: e.sicil_no,
          is_yeri_sgk_sicil_no: resolvedIsYeriSgk,
          isYeriSgkSicilNo: resolvedIsYeriSgk,
          company: resolvedCompName,
          department: e.department ?? '',
          position: e.position ?? '',
          level: (e.level === 'Junior' || !e.level) ? '' : e.level,
          salary: Number(e.salary ?? 0),
          status: e.status ?? 'active',
          phone: e.phone ?? '',
          email: e.email ?? '',
          contact_email: (e as any).contact_email ?? (e as any).personal_email ?? '',
          role: resolvedRole,
          joinDate: normalizeDateForInput(e.join_date) || '',
          join_date: normalizeDateForInput(e.join_date) || '',
          birthDate: normalizeDateForInput(e.birth_date) || '',
          birth_date: normalizeDateForInput(e.birth_date) || '',
          address: e.address ?? '',
          il: resolvedIl,
          ilce: resolvedIlce,
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
        };
      });

      // Tekil personel listesi: Mükerrer kayıtları temizle
      const seenEmpIds = new Set<string>();
      const seenEmpKeys = new Set<string>();
      const uniqueMapped: Employee[] = [];

      for (const item of mapped) {
        if (!item.id || seenEmpIds.has(item.id)) continue;
        const normEmail = item.email ? item.email.trim().toLowerCase() : '';
        const normTc = item.tc_no ? String(item.tc_no).trim() : '';
        const emailKey = normEmail ? `${item.company_id || ''}::email::${normEmail}` : null;
        const tcKey = normTc ? `${item.company_id || ''}::tc::${normTc}` : null;

        if (emailKey && seenEmpKeys.has(emailKey)) continue;
        if (tcKey && seenEmpKeys.has(tcKey)) continue;

        seenEmpIds.add(item.id);
        if (emailKey) seenEmpKeys.add(emailKey);
        if (tcKey) seenEmpKeys.add(tcKey);
        uniqueMapped.push(item);
      }

      let filteredMapped = uniqueMapped;
      let currentUserEmpId: string | null = null;
      const isManagerRole = effectiveAppRole === 'manager' || profile?.role === 'manager';
      const isEmployeeRole = !isManagementRole && (profile?.role === 'employee' || profile?.role === 'user');

      // Find current user's employee record
      const currentUserEmp = uniqueMapped.find((emp) => {
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
        currentUserEmpId = currentUserEmp.id;
      }

      const managerDepartment = currentUserEmp?.department || (profile as any)?.department || null;

      const effectiveUserCompanyId = profile?.company_id || currentUserEmp?.company_id;

      // Şirket bazlı filtreleme: Süper yönetici değilse kullanıcı sadece kendi şirketindeki personelleri görsün
      if (!isSuper && effectiveUserCompanyId) {
        filteredMapped = uniqueMapped.filter(emp => emp.company_id === effectiveUserCompanyId);
      } else {
        filteredMapped = uniqueMapped;
      }

      filteredMapped.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
      console.log(`✅ loadData: ${filteredMapped.length} personel listelendi. (${isSuper ? 'Süper Yönetici - Tüm Şirketler' : 'Şirket: ' + effectiveUserCompanyId})`);
      setEmployees(filteredMapped);

      // Şirket listesi: Normal kullanıcılar yalnızca kendi şirketini görsün
      if (!isSuper && effectiveUserCompanyId) {
        const myCompName = companyMap.get(effectiveUserCompanyId) || (profile as any)?.company_name || 'Şirketim';
        setCompanies([myCompName as any]);
      } else if (allComps && allComps.length > 0) {
        setCompanies(allComps.map((c: any) => c.name));
      }

      // İstatistikleri şirkete ve personellere göre hesapla
      const calculatedStats = {
        active: filteredMapped.filter(e => e.status === 'active').length,
        onLeave: filteredMapped.filter(e => e.status === 'on_leave' || (e as any).status === 'onLeave').length,
        inactive: filteredMapped.filter(e => e.status === 'inactive' || e.status === 'terminated').length,
      };
      setStats(calculatedStats);

      const depts = isManagerRole && managerDepartment
        ? [managerDepartment]
        : [...new Set(filteredMapped.map((e) => e.department).filter(Boolean))];
      setDepartments(depts);

      // Preload Company Leave Types & Shifts directly from Supabase (non-blocking)
      const targetCompanyForPreload = resolvedCompanyId || filteredMapped[0]?.company_id;
      if (targetCompanyForPreload && targetCompanyForPreload !== 'default' && !targetCompanyForPreload.includes('demo')) {
        leaveTypeService.getLeaveTypes(targetCompanyForPreload).catch(console.warn);
        shiftService.getShifts(targetCompanyForPreload).catch(console.warn);
        shiftService.getAssignments(targetCompanyForPreload).catch(console.warn);
        shiftService.getSaturdayConfig(targetCompanyForPreload).catch(console.warn);
      }

      // İzin talepleri
      let mappedTalepler: IzinTalebi[] = [];
      if (talepData && talepData.length > 0) {
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
        } else if (isManagerRole && managerDepartment) {
          mappedTalepler = mappedTalepler.filter(t => t.department === managerDepartment || t.employeeId === currentUserEmpId);
        }

        setIzinTalepleri(mappedTalepler);
      } else {
        setIzinTalepleri([]);
      }

      // İzin hakları
      if (hakData && hakData.length > 0) {
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

        const approvedAnnualByEmployee = mappedTalepler.reduce<Record<string, number>>((acc, talep) => {
          if (talep.izinTuru === 'yillik' && (talep.durum === 'onaylandi' || talep.durum === 'İK Onayladı' || talep.durum === 'Yönetici Onayladı')) {
            acc[talep.employeeId] = (acc[talep.employeeId] || 0) + Number(talep.gunSayisi || 0);
          }
          return acc;
        }, {});

        const updatedHaklar = mappedHaklar.map((hak) => {
          const usedDays = approvedAnnualByEmployee[hak.employeeId] || 0;
          const remaining = Math.max(0, Number(hak.toplamHak || 0) - usedDays);
          return {
            ...hak,
            kullanilanIzin: usedDays,
            kalanIzin: remaining,
          };
        });

        setIzinHaklari(updatedHaklar);
      } else {
        setIzinHaklari([]);
      }

      // Bordro
      if (bordroDataRaw && bordroDataRaw.length > 0) {
        let bordroData = bordroDataRaw;
        if (!isSuper) {
          bordroData = bordroData.filter(b => {
            const bEmp = (empData || []).find((e: any) => e.id === b.employee_id);
            const bRole = (b as any).role || bEmp?.role;
            const bName = String(b.employeeName || (b as any).employees?.name || '').toLowerCase();
            return bRole !== 'superadmin' && !bName.includes('süper admin') && !bName.includes('bhv test') && !bName.includes('muhammed gür');
          });
        }
        if (isEmployeeRole && currentUserEmpId) {
          bordroData = bordroData.filter(b => b.employee_id === currentUserEmpId && b.approval_status !== 'taslak' && b.approval_status != null);
        } else if (isEmployeeRole && !currentUserEmpId) {
          bordroData = [];
        } else if (isManagerRole && managerDepartment) {
          bordroData = bordroData.filter(b => {
            const bEmp = mapped.find(e => e.id === b.employee_id);
            return bEmp?.department === managerDepartment || b.employee_id === currentUserEmpId;
          });
        }
        setBordrolar(bordroData);
      } else {
        setBordrolar([]);
      }

      // Custom events from takvim_gunleri
      const calendarData = (calendarRes as any)?.data;
      if (calendarData && calendarData.length > 0) {
        const eventsFromDb = calendarData.map((e: any) => ({
          id: e.id,
          baslik: e.ad,
          aciklama: e.aciklama ?? '',
          tarih: e.tarih,
          tur: e.tur === 'firma_ozel' ? 'diger' : e.tur === 'resmi_tatil' ? 'tatil' : 'diger',
          oncelik: 'normal',
          durum: 'beklemede',
        }));
        window.dispatchEvent(new CustomEvent('humanius_calendar_events_loaded', { detail: eventsFromDb }));
      }

      // Notifications
      const notificationsData = (notifRes as any)?.data;
      if (notificationsData && notificationsData.length > 0) {
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
      console.error('Veri yüklenemedi:', err);
    } finally {
      isDataLoadingRef.current = false;
    }
  }, [profile?.company_id, profile?.role, profile?.email, profile?.full_name, effectiveAppRole]);

  useEffect(() => {
    if (user) {
      loadData();

      const debouncedRealtimeSync = () => {
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        realtimeDebounceTimerRef.current = setTimeout(() => {
          loadData();
        }, 400);
      };

      const channel = supabase
        .channel('app-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, debouncedRealtimeSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedRealtimeSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'izin_talepleri' }, debouncedRealtimeSync)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'izin_haklari' }, debouncedRealtimeSync)
        .subscribe();

      const handleIzinSync = () => {
        debouncedRealtimeSync();
      };
      window.addEventListener('humanius_izin_updated', handleIzinSync);
      window.addEventListener('humanius_puantaj_updated', handleIzinSync);

      return () => {
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        supabase.removeChannel(channel);
        window.removeEventListener('humanius_izin_updated', handleIzinSync);
        window.removeEventListener('humanius_puantaj_updated', handleIzinSync);
      };
    }
  }, [user?.id, profile?.company_id, profile?.role]);

  // Hesap değiştirmede önceki kullanıcı verisinin görünmesini engelleyen temizleyici (yalnızca farklı kullanıcıya geçilince)
  useEffect(() => {
    if (user?.id && previousUserIdRef.current && previousUserIdRef.current !== user.id) {
      setSelectedEmployee(null);
      setEmployees([]);
      setBordrolar([]);
      setIzinTalepleri([]);
    }
    if (user?.id) {
      previousUserIdRef.current = user.id;
    }
  }, [user?.id]);

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

  // ── Otomatik Vardiya SMS Bildirim Servisi (Zamanlayıcı) ────────────────────
  useEffect(() => {
    if (user && employees && employees.length > 0) {
      shiftSmsScheduler.startShiftSmsWorker(
        () => employees,
        () => selectedCompany || profile?.company_id || 'default'
      );
    }
    return () => {
      shiftSmsScheduler.stopShiftSmsWorker();
    };
  }, [user, employees.length, selectedCompany, profile?.company_id]);

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredEmployees = employees.filter((emp) => {
    const normalize = (str?: string) =>
      String(str ?? '')
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');

    const searchNorm = normalize(searchTerm);
    const matchSearch =
      !searchTerm ||
      normalize(emp.name).includes(searchNorm) ||
      normalize(emp.email).includes(searchNorm) ||
      normalize((emp as any).contact_email).includes(searchNorm) ||
      normalize(emp.department).includes(searchNorm) ||
      normalize(emp.position).includes(searchNorm) ||
      normalize(emp.mobile).includes(searchNorm) ||
      normalize(emp.phone).includes(searchNorm) ||
      normalize(emp.employee_type).includes(searchNorm) ||
      normalize(emp.status).includes(searchNorm) ||
      normalize(emp.company).includes(searchNorm) ||
      normalize(emp.tc_no).includes(searchNorm) ||
      normalize(emp.sicil_no).includes(searchNorm) ||
      normalize(emp.is_yeri_sgk_sicil_no).includes(searchNorm) ||
      normalize((emp as any).isYeriSgkSicilNo).includes(searchNorm);

    const matchDept =
      selectedDepartment === 'all' || emp.department === selectedDepartment;

    const matchCompany = (() => {
      if (selectedCompany === 'all' || !selectedCompany) return true;
      const target = selectedCompany.toLowerCase().trim();
      const empCompName = (emp.company || '').toLowerCase().trim();
      const empCompId = (emp.company_id || '').toLowerCase().trim();

      if (empCompName === target || empCompId === target) return true;
      if (empCompName && target && (empCompName.includes(target) || target.includes(empCompName))) return true;
      return false;
    })();

    return matchSearch && matchDept && matchCompany;
  }).sort((a, b) => {
    const cmp = (a.name || '').localeCompare(b.name || '', 'tr');
    return employeeSortOrder === 'asc' ? cmp : -cmp;
  });

  const dynamicStats: Stats = {
    active: filteredEmployees.filter((e) => e.status === 'active').length,
    onLeave: filteredEmployees.filter((e) => e.status === 'onLeave' || e.status === 'on_leave' || (e as any).status === 'izinli').length,
    inactive: filteredEmployees.filter((e) => e.status === 'inactive' || e.status === 'terminated' || (e as any).status === 'pasif').length,
  };

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

  const currentEmployeeAllIzinTalepleri = currentEmployeeMatch
    ? izinTalepleri
        .filter((talep) => talep.employeeId === currentEmployeeMatch.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const currentEmployeeIzinTalepleri = currentEmployeeAllIzinTalepleri.slice(0, 3);

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
    const isSuper = effectiveAppRole === 'superadmin' || isSuperAdmin;
    const defaultCompanyName = (selectedCompany && selectedCompany !== 'all')
      ? selectedCompany
      : ((companies && companies.length > 0) ? (typeof companies[0] === 'string' ? companies[0] : (companies[0] as any).name) : '');
    setSelectedEmployee({
      id: '',
      name: '',
      company: defaultCompanyName,
      company_id: (profile?.company_id && !isSuper) ? profile.company_id : '',
      department: '',
      position: '',
      level: '',
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
    try {
      let matched: any = null;
      let targetCompanyId = '';
      let matchedCompName = emp.company || '';

      try {
        const allComps = await companyService.getCompanies();
        const empCompStr = String(emp.company || '').trim().toLowerCase();
        const empCompIdStr = String(emp.company_id || '').trim().toLowerCase();

        if (empCompStr || empCompIdStr) {
          matched = allComps.find(c => {
            const cName = String(c.name || '').trim().toLowerCase();
            const cId = String(c.id || '').trim().toLowerCase();
            return cId === empCompIdStr || cId === empCompStr || cName === empCompStr || cName === empCompIdStr;
          });
        }

        if (!matched && emp.company && emp.company.trim() !== '') {
          try {
            const { data: newComp } = await supabase.from('companies').insert({ name: emp.company.trim() }).select('id, name').single();
            if (newComp) {
              matched = newComp as any;
            }
          } catch {}
        }

        if (matched) {
          targetCompanyId = matched.id;
          matchedCompName = matched.name;
        } else if (emp.company_id && !emp.company_id.includes('-id-') && emp.company_id !== 'default') {
          targetCompanyId = emp.company_id;
        } else if (profile?.company_id) {
          targetCompanyId = profile.company_id;
        } else if (allComps.length > 0) {
          targetCompanyId = allComps[0].id;
          matchedCompName = allComps[0].name;
        }
      } catch {}

      if (!targetCompanyId || targetCompanyId === 'default') {
        targetCompanyId = 'aaaaaaaa-0000-0000-0000-000000000001';
      }

      // E-posta girilmemişse ad.soyad üzerinden otomatik kurumsal e-posta üret
      let targetEmail = emp.email
        ? emp.email.trim().toLowerCase().replace(/\.+@/, '@').replace(/^\.+/, '').replace(/\.{2,}/g, '.')
        : '';
      if (!targetEmail && emp.name) {
        const slug = emp.name
          .toLowerCase()
          .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
          .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
          .replace(/[^a-z0-9]/g, '.')
          .replace(/\.+/g, '.')
          .replace(/^\.+|\.+$/g, '');
        targetEmail = `${slug}@humanius.net`;
      }

      const cleanJoinDate = normalizeDateForInput(emp.joinDate || emp.join_date) || null;
      const cleanBirthDate = normalizeDateForInput((emp as any).birth_date || (emp as any).birthDate || (emp as any).dogum_tarihi) || null;

      const oldEmail = selectedEmployee?.email || (emp as any).oldEmail || emp.email;

      const finalIsYeriSgk = (emp.is_yeri_sgk_sicil_no || (emp as any).isYeriSgkSicilNo || '').trim();
      const fullAddress = formatAddressWithLocationAndSgk(emp.address, emp.il, emp.ilce, finalIsYeriSgk);

      // Yalnızca mevcut personel güncellenirken kullanıcı detaylarını güncelle
      if (!isNewEmployee && (targetEmail || emp.id)) {
        try {
          await userManagementService.updateEmployeeDetails({
            email: targetEmail || emp.email,
            oldEmail: oldEmail || undefined,
            employeeId: emp.id || undefined,
            companyId: targetCompanyId,
            fullName: emp.name,
            role: emp.role,
            level: emp.level || 'Junior',
            position: emp.position,
            department: emp.department,
            phone: emp.phone ?? '',
            salary: emp.salary,
            status: emp.status,
            join_date: cleanJoinDate,
            birth_date: cleanBirthDate,
            tc_no: emp.tc_no ?? '',
            sicil_no: emp.sicil_no ?? '',
            is_yeri_sgk_sicil_no: finalIsYeriSgk,
            isYeriSgkSicilNo: finalIsYeriSgk,
            employee_type: emp.employeeType ?? emp.employee_type ?? 'normal',
            address: fullAddress,
            medeni_durum: (emp as any).medeni_durum ?? undefined,
            cocuk_sayisi: (emp as any).cocuk_sayisi != null ? Number((emp as any).cocuk_sayisi) : undefined,
            engelli_durumu: (emp as any).engelli_durumu ?? undefined,
            avatar_url: emp.avatar_url ?? undefined,
            skills: emp.skills ?? undefined,
          });
        } catch (authErr) {
          console.warn('Oturum detay güncelleme uyarısı:', authErr);
        }
      }

      try {
        const cleanPayload = {
          company_id: targetCompanyId,
          name: emp.name,
          department: emp.department,
          position: emp.position,
          level: emp.level || 'Junior',
          salary: emp.salary,
          status: emp.status,
          phone: emp.phone ?? '',
          email: targetEmail || emp.email,
          address: fullAddress,
          il: emp.il ?? '',
          ilce: emp.ilce ?? '',
          skills: emp.skills ?? [],
          employee_type: emp.employeeType ?? emp.employee_type ?? 'normal',
          tc_no: emp.tc_no ?? '',
          sicil_no: emp.sicil_no ?? '',
          is_yeri_sgk_sicil_no: finalIsYeriSgk,
          isYeriSgkSicilNo: finalIsYeriSgk,
          join_date: cleanJoinDate,
          birth_date: cleanBirthDate,
          medeni_durum: (emp as any).medeni_durum ?? null,
          cocuk_sayisi: (emp as any).cocuk_sayisi != null ? Number((emp as any).cocuk_sayisi) : null,
          engelli_durumu: (emp as any).engelli_durumu ?? null,
          avatar_url: emp.avatar_url ?? null,
          role: emp.role || 'employee',
        };

        if (isNewEmployee) {
          const created = await employeeService.create(cleanPayload as any);
          if (created?.id) emp.id = created.id;
        } else if (!isNewEmployee && emp.id) {
          await employeeService.update(emp.id, cleanPayload as any);

          // Update profiles table safely with email and name (DO NOT touch role)
          try {
            const profPayload: any = {
              full_name: emp.name,
              email: targetEmail || emp.email,
            };
            if (emp.id) {
              await supabase.from('profiles').update(profPayload).eq('id', emp.id);
            }
            if (oldEmail && oldEmail !== (targetEmail || emp.email)) {
              await supabase.from('profiles').update(profPayload).eq('email', oldEmail);
            }
          } catch {}
        }
        if (emp.id) {
          saveEmployeeLocationMeta(emp.id, targetEmail || emp.email, emp.il, emp.ilce);
          saveEmployeeIsYeriSgkSicil(emp.id, targetEmail || emp.email, finalIsYeriSgk);
        }
      } catch (clientEmpErr) {
        console.warn('İstemci personel güncelleme uyarısı:', clientEmpErr);
      }

      // Ekranda değişikliklerin anında görünmesi için local state'i güvenli şekilde güncelle (mükerrer kayıt oluşmasını engelle)
      setEmployees(prev => {
        const fullEmp: Employee = {
          ...emp,
          id: emp.id,
          company: matchedCompName || emp.company || 'Şirket',
          email: targetEmail || emp.email,
          address: fullAddress,
          il: emp.il || '',
          ilce: emp.ilce || '',
          is_yeri_sgk_sicil_no: finalIsYeriSgk,
          isYeriSgkSicilNo: finalIsYeriSgk,
          joinDate: cleanJoinDate || '',
          join_date: cleanJoinDate || '',
          birthDate: cleanBirthDate || '',
          birth_date: cleanBirthDate || '',
          level: emp.level || 'Junior',
        };
        const exists = prev.some(
          item => (fullEmp.id && item.id === fullEmp.id) ||
                  (item.email && fullEmp.email && item.email.toLowerCase().trim() === fullEmp.email.toLowerCase().trim())
        );
        if (exists) {
          return prev.map(item =>
            ((fullEmp.id && item.id === fullEmp.id) || (item.email && fullEmp.email && item.email.toLowerCase().trim() === fullEmp.email.toLowerCase().trim()))
              ? { ...item, ...fullEmp }
              : item
          );
        }
        return [fullEmp, ...prev];
      });

      setDrawerOpen(false);
      await loadData();
    } catch (err) {
      console.error('Personel kaydedilemedi:', err);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!canDeleteUsers(effectiveAppRole)) {
      showError('Yetki Yetersiz', 'Personel ve kullanıcı hesabı silme yetkisi sadece Şirket Yöneticisindedir (Admin).');
      return;
    }
    const targetEmp = employees.find((e) => e.id === id);
    const confirmed = await showConfirm({
      title: 'Personeli Silmek İstiyor Musunuz?',
      text: `${targetEmp?.name || 'Bu personeli'} ve sisteme bağlı kullanıcı hesabını tamamen silmek istediğinize emin misiniz?`,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'Vazgeç',
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      try {
        await userManagementService.deleteUserAndEmployee({
          employeeId: id,
          email: targetEmp?.email,
        });
      } catch (authDeleteErr) {
        console.warn('Oturum hesabı silme uyarısı:', authDeleteErr);
      }

      await employeeService.delete(id);
      setDrawerOpen(false);
      await loadData();
      showSuccess('Personel Silindi', 'Personel ve bağlı kullanıcı hesabı başarıyla silindi.');
    } catch (err) {
      console.error('Personel silinemedi:', err);
      showError('Hata', 'Personel silinirken bir hata oluştu.');
    }
  };

  const handleEmployeeActionSelect = (emp: Employee, action: 'gorev' | 'bordro' | 'izin') => {
    setSelectedEmployee(emp);
    if (action === 'gorev' && canAccessView(effectiveAppRole, 'gorev-tanimi')) setCurrentView('gorev-tanimi');
    else if (action === 'bordro' && canAccessView(effectiveAppRole, 'bordro')) setCurrentView('bordro');
    else if (action === 'izin' && canAccessView(effectiveAppRole, 'izin')) setCurrentView('izin');
  };

  const handleExportCSV = () => {
    try {
      const exportData = filteredEmployees.map((e) => ({
        'Adı Soyadı': e.name || '',
        'TC Kimlik No': e.tc_no || '',
        'Sicil No': e.sicil_no || '',
        'İş Yeri SGK Sicil No': e.is_yeri_sgk_sicil_no || (e as any).isYeriSgkSicilNo || '',
        'Şirket': e.company || '',
        'Departman': e.department || '',
        'Pozisyon': e.position || '',
        'İşe Giriş Tarihi': e.joinDate || e.join_date ? String(e.joinDate || e.join_date).split('T')[0] : '',
        'Kurumsal E-Posta': e.email || '',
        'Telefon': e.phone || '',
        'Adres': e.address || '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Personel Listesi');
      XLSX.writeFile(wb, `Humanius_Personel_Listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Excel dışa aktarma hatası:', err);
    }
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
    if (
      (updatedTalep.durum === 'onaylandi' || updatedTalep.durum === 'reddedildi') &&
      updatedTalep.durum !== editingIzin.durum &&
      !canApproveLeave(effectiveAppRole as AppRole)
    ) {
      alert('İzin durumunu onaylandı veya reddedildi olarak güncelleme yetkisi yalnızca İK ve Şirket Yöneticisine aittir.');
      return;
    }
    try {
      await izinService.updateTalep(editingIzin.id, {
        izin_turu: updatedTalep.izinTuru,
        baslangic_tarihi: updatedTalep.baslangicTarihi,
        bitis_tarihi: updatedTalep.bitisTarihi,
        gun_sayisi: updatedTalep.gunSayisi,
        durum: updatedTalep.durum,
        aciklama: updatedTalep.aciklama,
        yol_izni_talep: updatedTalep.yolIzniTalep,
        yol_izni_gun: updatedTalep.yolIzniGun,
        seyahat_yeri: updatedTalep.seyahatYeri,
        il_disi_seyahat: updatedTalep.ilDisiSeyahat,
      });
      setEditingIzin(null);
      await loadData();
      alert('İzin kaydı başarıyla güncellendi.');
    } catch (err: any) {
      console.error('İzin güncellenemedi:', err);
      alert(`İzin güncellenemedi!${err?.message ? `\nDetay: ${err.message}` : ''}`);
    }
  };

  const handleDeleteIzin = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'İzin Kaydını Silmek İstiyor Musunuz?',
      text: 'Bu izin kaydını kalıcı olarak silmek istediğinize emin misiniz? Kullanılan izin günleri personelin izin bakiyesine otomatik olarak iade edilecektir.',
      confirmButtonText: 'Evet, Sil ve İade Et',
      cancelButtonText: 'Vazgeç',
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      await izinService.deleteTalep(id);
      setEditingIzin(null);
      await loadData();
      showSuccess('İşlem Başarılı', 'İzin kaydı başarıyla silindi ve bakiye iade edildi.');
    } catch (err: any) {
      console.error('İzin silinemedi:', err);
      showError('Hata', `İzin silinemedi! ${err?.message || ''}`);
    }
  };

  const handleIzinOnay = async (id: string) => {
    if (!profile?.id) {
      showError('Hata', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }
    const talep = izinTalepleri.find((t) => t.id === id);
    if (!talep) {
      showError('Hata', 'İzin talebi bulunamadı.');
      return;
    }
    const targetCompId = talep.companyId || profile?.company_id || 'default';
    const approvalCfg = await leaveApprovalService.getConfig(targetCompId);

    const currentStage = leaveApprovalService.getTalepCurrentStage(id, talep.durum, approvalCfg, talep);
    if (currentStage === 'completed') {
      showSuccess('Bilgi', 'Bu izin talebi zaten onaylanmış.');
      return;
    }

    // Rol Kontrolü: Tek aşamalı onay ise şirket yöneticisi de onaylayabilir, çok aşamalıda ilgili kademe yetkilisi onaylar
    const canApproveThisStage = leaveApprovalService.canRoleApproveCurrentStage(effectiveAppRole, currentStage, approvalCfg);
    if (!canApproveThisStage) {
      const requiredRole = leaveApprovalService.getRequiredRoleLabel(currentStage, approvalCfg);
      const stageName = leaveApprovalService.getStageLabel(currentStage);
      showWarning(
        'Onay Yetkisi Kısıtlaması',
        `Bu izin talebi şu an <b>${stageName}</b> kademesindedir.<br/><br/>Onay akışı kurallarına göre yalnızca <b>${requiredRole}</b> rolüne sahip yetkili bu aşamada onay verebilir.`
      );
      return;
    }

    const nextStage = leaveApprovalService.getNextStage(approvalCfg, currentStage);

    try {
      if (nextStage) {
        // Son aşama değil: Bir sonraki aşamaya devret!
        await leaveApprovalService.setTalepCurrentStage(id, nextStage, targetCompId);
        setIzinTalepleri((prev) =>
          prev.map((t) => (t.id === id ? { ...t, currentStage: nextStage } : t))
        );
        const stageLabel = leaveApprovalService.getStageLabel(currentStage);
        const nextStageLabel = leaveApprovalService.getStageLabel(nextStage);
        showSuccess(
          'Kademe Onaylandı',
          `<b>${stageLabel}</b> tamamlandı.<br/>Talep bir sonraki onay kademesine (<b>${nextStageLabel}</b>) iletildi.`
        );
      } else {
        // Son onay kademesi: İzni tamamen onayla!
        await izinService.approveTalep(id, profile.id);
        await leaveApprovalService.setTalepCurrentStage(id, 'completed', targetCompId);
        setIzinTalepleri((prev) =>
          prev.map((t) => (t.id === id ? { ...t, durum: 'onaylandi', onaylayanId: profile.id, currentStage: 'completed' } : t))
        );
        showSuccess('İzin Onaylandı', 'Tüm onay aşamaları başarıyla tamamlandı. İzin kaydı puantaj cetveline ve bordroya işlendi.');
      }
    } catch (error: any) {
      console.error('İzin onaylanamadı:', error);
      showError('Hata', `İzin onaylanırken bir hata oluştu: ${error?.message || ''}`);
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
      showSuccess('Toplu İzin Başarılı', `${newTalepler.length} personelin izin talebi başarıyla eklendi.`);
    } catch (err: any) {
      console.error('Toplu izin talebi eklenemedi:', err);
      showError('Hata', 'Toplu izin eklenirken bir hata oluştu.');
    }
  };

  const handleIzinRed = async (id: string) => {
    if (!profile?.id) {
      showError('Hata', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }
    const talep = izinTalepleri.find((t) => t.id === id);
    if (!talep) {
      showError('Hata', 'İzin talebi bulunamadı.');
      return;
    }
    const targetCompId = talep.companyId || profile?.company_id || 'default';
    const approvalCfg = await leaveApprovalService.getConfig(targetCompId);

    const currentStage = leaveApprovalService.getTalepCurrentStage(id, talep.durum, approvalCfg, talep);
    const canApproveThisStage = currentStage !== 'completed' && leaveApprovalService.canRoleApproveCurrentStage(effectiveAppRole, currentStage, approvalCfg);
    if (!canApproveThisStage) {
      const requiredRole = leaveApprovalService.getRequiredRoleLabel(currentStage, approvalCfg);
      const stageName = leaveApprovalService.getStageLabel(currentStage);
      showWarning(
        'Yetki Kısıtlaması',
        `Bu izin talebi şu an <b>${stageName}</b> kademesindedir.<br/><br/>Yalnızca <b>${requiredRole}</b> rolü bu aşamada işlem yapabilir.`
      );
      return;
    }

    // Şık SweetAlert2 ile red gerekçesi alma
    const neden = await showPromptDialog({
      title: 'İzin Talebini Reddet',
      text: `${talep.employeeName ? talep.employeeName + ' adlı personelin' : ''} izin talebini reddetmek üzeresiniz. Lütfen gerekçenizi belirtiniz:`,
      inputPlaceholder: 'Red gerekçesini yazınız (örn: İlgili tarihlerde nöbet / vardiya yoğunluğu)...',
      confirmButtonText: 'Talebi Reddet',
      cancelButtonText: 'Vazgeç',
      isDanger: true,
    });

    if (neden === null) return; // İptal edildi

    try {
      await izinService.rejectTalep(id, profile.id, neden);
      setIzinTalepleri((prev) =>
        prev.map((t) => (t.id === id ? { ...t, durum: 'reddedildi', onaylayanId: profile.id, redNedeni: neden } : t))
      );
      showSuccess('Talep Reddedildi', 'İzin talebi red gerekçesiyle birlikte işlendi.');
    } catch (error: any) {
      console.error('İzin reddedilemedi:', error);
      showError('Hata', `İzin reddedilirken bir hata oluştu: ${error?.message || ''}`);
    }
  };

  // ── Bordro save ─────────────────────────────────────────────────────────────
  const handleSaveBordro = async (bordro: BordroItem) => {
    const matchedEmp = employees.find(e => e.id === bordro.employee_id || e.name === bordro.employeeName);
    const resolvedName = bordro.employeeName || (bordro as any).employees?.name || matchedEmp?.name || selectedEmployee?.name || 'Personel';
    const resolvedDept = (bordro as any).employees?.department || matchedEmp?.department || selectedEmployee?.department || '';

    const normalizedBordro = {
      ...bordro,
      employeeName: resolvedName,
      brut_maas: bordro.brut_maas ?? (bordro as any).temelKazanc ?? 0,
      net_maas: bordro.net_maas ?? (bordro as any).netMaas ?? 0,
      toplam_kesinti: bordro.toplam_kesinti ?? (bordro as any).toplamKesinti ?? 0,
      employees: {
        name: resolvedName,
        department: resolvedDept,
      },
    } as BordroItem;

    setBordrolar((prev) => {
      const idx = prev.findIndex((item) => item.id === normalizedBordro.id || (item.employee_id === normalizedBordro.employee_id && item.period === normalizedBordro.period));
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
    setEditingBordro(bordro);
  };

  const handleUpdateBordro = async (updatedBordro: Partial<BordroItem>) => {
    if (!updatedBordro.id) return;
    try {
      await bordroService.update(updatedBordro.id, updatedBordro as any);
      setBordrolar((prev) =>
        prev.map((b) => (b.id === updatedBordro.id ? ({ ...b, ...updatedBordro } as BordroItem) : b))
      );
      setEditingBordro(null);
      await loadData();
    } catch (err: any) {
      console.error('Bordro güncellenemedi:', err);
      throw err;
    }
  };

  const handleSendBordroForApproval = async (bordro: BordroItem) => {
    const confirmSend = await showConfirm({
      title: 'Bordroyu Onaya Gönder',
      text: `${bordro.period} dönemi bordrosunu personelin onayına göndermek istediğinize emin misiniz?`,
      confirmButtonText: 'Evet, Onaya Gönder',
      cancelButtonText: 'Vazgeç',
      icon: 'question'
    });
    if (confirmSend) {
      try {
        await bordroService.updateApprovalStatus(bordro.id, 'beklemede');
        await loadData();
        showSuccess('Başarılı', 'Bordro başarıyla personelin onayına gönderildi.');
      } catch (err: any) {
        console.error('Bordro onaya gönderilemedi:', err);
        showError('Hata', `Onaya gönderme işlemi başarısız oldu!\nDetay: ${err.message}`);
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
      showSuccess('Silindi', 'Bordro kaydı başarıyla silindi.');
    } catch (err: any) {
      console.error('Bordro silinemedi:', err);
      showError('Hata', `Bordro silinemedi! ${err?.message || ''}`);
    }
  };

  const handleDeleteIzinTalebi = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'İzin Talebini Sil',
      text: 'Bu izin kaydını silmek istediğinize emin misiniz?',
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'Vazgeç',
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      await izinService.deleteTalep(id);
      await loadData();
      showSuccess('Başarılı', 'İzin kaydı başarıyla silindi.');
    } catch (err: any) {
      console.error('İzin silinirken hata oluştu:', err);
      showError('Hata', 'İzin kaydı silinirken bir hata oluştu.');
    }
  };

  const handleCancelIzinTalebi = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'İzin Talebini İptal Et',
      text: 'Bu izin kaydını iptal etmek istediğinize emin misiniz?',
      confirmButtonText: 'Evet, İptal Et',
      cancelButtonText: 'Vazgeç',
      isDanger: true,
    });
    if (!confirmed) return;
    try {
      await izinService.updateTalep(id, { durum: 'iptal' });
      await loadData();
      showSuccess('Başarılı', 'İzin kaydı başarıyla iptal edildi.');
    } catch (err: any) {
      console.error('İzin iptal edilirken hata oluştu:', err);
      showError('Hata', 'İzin kaydı iptal edilirken bir hata oluştu.');
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

  const handleHakedisSubmit = async (params: {
    employeeId: string;
    izinTuru: string;
    gunSayisi: number;
    islemTipi: 'ekle' | 'belirle';
    yil: number;
    aciklama: string;
  }) => {
    try {
      await izinService.addIzinHakedisi({
        companyId: profile?.company_id,
        employeeId: params.employeeId,
        izinTuru: params.izinTuru,
        gunSayisi: params.gunSayisi,
        islemTipi: params.islemTipi,
        yil: params.yil,
        aciklama: params.aciklama,
        ekleyen: profile?.full_name || 'Şirket Yöneticisi'
      });
      await loadData();
      alert('İzin hak edişi başarıyla tanımlandı ve bakiyelere yansıtıldı.');
    } catch (err: any) {
      console.error('İzin hak edişi kaydedilemedi:', err);
      alert('İzin hak edişi kaydedilirken bir hata oluştu.');
    }
  };

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !authLoading) {
    return <Login />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const renderContent = () => {
    // ── Arama Sayfası — tam ekran ─────
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
      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#f8fafc] relative">
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
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 relative">
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
              onExportCSV={() => setShowEmployeeExportModal(true)}
              onImportExcel={() => setShowExcelImportModal(true)}
              companies={companies}
              departments={departments}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              totalResultCount={filteredEmployees.length}
              sortOrder={employeeSortOrder}
              onToggleSort={() => setEmployeeSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            />
            <StatsCards stats={dynamicStats} />
            <EmployeeTable
              employees={filteredEmployees}
              totalCount={employees.length}
              onResetFilters={() => {
                setSelectedCompany('all');
                setSelectedDepartment('all');
                setSearchTerm('');
              }}
              onEmployeeClick={handleEmployeeClick}
              onDeleteEmployee={handleDeleteEmployee}
              onEmployeeActionSelect={handleEmployeeActionSelect}
              sortOrder={employeeSortOrder}
              onToggleSort={() => setEmployeeSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            />

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
          <IzinYonetimi
            employees={employees}
            izinTalepleri={izinTalepleri}
            izinHaklari={izinHaklari}
            profile={profile}
            currentEmployeeMatch={currentEmployeeMatch}
            currentEmployeeIzinHakki={currentEmployeeIzinHakki}
            currentEmployeeIzinTalepleri={currentEmployeeAllIzinTalepleri}
            effectiveAppRole={effectiveAppRole}
            onNewTalep={() => setShowIzinForm(true)}
            onOpenHakedisModal={(empId?: string) => {
              setHakedisEmployeeId(empId || null);
              setShowHakedisModal(true);
            }}
            onOpenTopluIzin={() => setShowTopluIzinForm(true)}
            onOnay={handleIzinOnay}
            onRed={handleIzinRed}
            onEdit={(talep) => setEditingIzin(talep)}
            onDelete={handleDeleteIzin}
            onUpdateHak={handleUpdateIzinHakki}
          />
        )}

        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
        {/* Raporlar */}
        {currentView === 'raporlar' && (
          <IzinRaporlari
            employees={employees}
            izinTalepleri={izinTalepleri}
            izinHaklari={izinHaklari}
          />
        )}

        {/* İŞ AKIŞI ve Operasyon */}
        {currentView === 'pdks-devam' && (
          <PdksDevam
            employees={employees}
            izinTalepleri={izinTalepleri}
            departments={departments}
            onNavigateToPuantaj={() => setCurrentView('puantaj')}
            selectedCompany={selectedCompany}
            onCompanyChange={setSelectedCompany}
            companies={companies}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
          />
        )}
        {currentView === 'puantaj' && (
          <PuantajCetveli
            employees={employees}
            izinTalepleri={izinTalepleri}
            departments={departments}
            onNavigateToPdks={() => setCurrentView('pdks-devam')}
          />
        )}
        {currentView === 'vardiya-sms' && (
          <VardiyaSmsYonetimi
            employees={employees}
            companyId={profile?.company_id || (employees[0] as any)?.company_id || selectedCompany || 'default'}
          />
        )}
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
        {currentView === 'egitim' && <EgitimLMS employees={employees} companyId={profile?.company_id || user?.user_metadata?.company_id || employees[0]?.company_id} />}

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

        {/* Tazminat & Bilirkişi Hesaplama Motoru */}
        {currentView === 'tazminat-hesaplama' && <TazminatHesaplama />}

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
        {currentView === 'izin-tanimlari' && <IzinTanimlari companyId={profile?.company_id || employees[0]?.company_id} />}

        {/* Organizasyon Şeması */}
        {currentView === 'org-sema' && (
          <OrganizasyonSemasi 
            employees={employees} 
            companies={companies}
            selectedCompany={selectedCompany}
            onCompanyChange={setSelectedCompany}
            userCompanyId={profile?.company_id}
            companyName={selectedCompany !== 'all' ? selectedCompany : (typeof companies[0] === 'string' ? companies[0] : (companies[0] as any)?.name || 'Humanius Şirket Grubu')} 
          />
        )}

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
        {currentView === 'kullanicilar' && (
          appRole === 'superadmin' ? (
            <KullanicilarPage />
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 m-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800">Yetkisiz Erişim</h3>
              <p className="text-sm text-gray-500 mt-1">Bu sayfa yalnızca Süper Yönetici yetkisine sahip kullanıcılar tarafından görüntülenebilir.</p>
            </div>
          )
        )}

        {/* Sistem Ayarları - Kanunlar ve Kurallar */}
        {currentView === 'ayar' && <SistemAyarlari mode="kanunlar" defaultTab="is_kanunu" />}

        {/* Şirket Bilgileri & Yönetimi */}
        {currentView === 'sirket-bilgileri' && <SistemAyarlari mode="sirket" defaultTab="sirket_bilgileri" />}

        {/* Kullanım Kılavuzu */}
        {currentView === 'kullanim-kilavuzu' && <KullanımKilavuzu />}

        {/* Şifre ve Güvenlik Ayarları */}
        {currentView === 'sifre-degistir' && <SifreDegistir />}
        </Suspense>
        </div>
      </main>
    );
  };

  return (
    <GuideContextMenu onNavigate={(v) => setCurrentView(v as View)}>
    <ContextualHelp />
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8fafc]">
      <DemoBanner />
      <NotificationPermissionBanner />
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
          <main className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
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
        isSuperAdmin={effectiveAppRole === 'superadmin' || isSuperAdmin}
      />

      <ExcelImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        onSuccess={() => {
          loadData();
        }}
        activeCompanyId={profile?.company_id}
        activeCompanyName={companies[0]}
      />

      <EmployeeExportModal
        isOpen={showEmployeeExportModal}
        onClose={() => setShowEmployeeExportModal(false)}
        employees={employees}
        companies={companies as any}
        departments={departments as any}
      />

      {editingBordro && (
        <BordroDuzenlemeModal
          bordro={editingBordro}
          employeeName={
            editingBordro.employeeName ??
            (editingBordro as any).employees?.name ??
            employees.find((e) => e.id === editingBordro.employee_id)?.name ??
            'Personel'
          }
          employeeDepartment={
            (editingBordro as any).employees?.department ??
            employees.find((e) => e.id === editingBordro.employee_id)?.department ??
            ''
          }
          onClose={() => setEditingBordro(null)}
          onSave={handleUpdateBordro}
          onDelete={handleDeleteBordro}
        />
      )}

      {selectedBordro && (
        <BordroViewModal
          bordro={selectedBordro}
          employeeId={selectedBordro.employee_id}
          employeeName={
            (selectedBordro as any).employeeName ??
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

                  window.dispatchEvent(new CustomEvent('humanius_new_alert_notification', { detail: newEv }));

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

      {isForcePasswordChangeRequired && (
        <ForcePasswordChangeModal onSuccess={loadData} />
      )}



      {showIzinForm && (
        <IzinTalepForm
          employees={isEmployeeOnly && currentEmployeeMatch ? [currentEmployeeMatch] : employees}
          izinHaklari={izinHaklari}
          izinTalepleri={izinTalepleri}
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

      {showHakedisModal && (
        <IzinHakedisModal
          isOpen={showHakedisModal}
          onClose={() => {
            setShowHakedisModal(false);
            setHakedisEmployeeId(null);
          }}
          employees={employees}
          izinHaklari={izinHaklari}
          initialEmployeeId={hakedisEmployeeId}
          onSubmit={handleHakedisSubmit}
        />
      )}

      {editingIzin && (
        <IzinDuzenlemeForm
          talep={editingIzin}
          employee={employees.find((e) => e.id === editingIzin.employeeId) ?? employees[0]}
          onSubmit={handleIzinUpdate}
          onDelete={handleDeleteIzin}
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
