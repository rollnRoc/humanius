import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pdksService, VardiyaInsert } from '../services/pdksService';
import { companyService, BIGSAFER_COMPANY_ID, MICI_COMPANY_ID, normalizeCompanyId, getDefaultOfficesForCompany } from '../services/companyService';
import { notificationService } from '../services/notificationService';
import { shiftService, CompanyShift, VARSAYILAN_VARDIYALAR, SaturdayWorkConfig, DEFAULT_SATURDAY_CONFIG, isNotSaturdayShift, inferOfficeForShift, isShiftMatchingOffice, resolveOfficeForShift, normalizeTr, getShiftOfficeMeta } from '../services/shiftService';
import { VardiyaYonetimiModal } from './VardiyaYonetimiModal';
import { printPdksDevamRaporuPdf, exportPdksToCsv, PdksReportRecord } from '../utils/pdksReportPdf';
import { systemDataService } from '../services/systemDataService';
import {
  Clock, LogIn, LogOut, Search, Filter, MapPin, Fingerprint,
  Compass, Play, Square, AlertCircle, CheckCircle2, ShieldAlert,
  Sliders, Navigation, CheckCircle, RefreshCw, Trash2, RotateCcw,
  Building2, Plus, Edit2, Check, X, Bell, BellRing, Users,
  Printer, FileText, Download, CalendarCheck, ArrowUpDown, ChevronDown,
  MessageSquare
} from 'lucide-react';
import { VardiyaSmsModal } from './VardiyaSmsModal';
import { smsService } from '../services/smsService';
import type { Employee, CompanyOfficeLocation } from '../types';
import { getDevamKontroluIzinLabel, getDevamKontroluIzinKisaltma } from '../utils/izinCalculations';
import iller, { type IlIlceItem } from '../lib/illce';
import { matchEmployeeToUser, getTodayYYYYMMDD } from '../utils/sanitize';
import { confirmShiftStart, confirmShiftEnd, showConfirm, showSuccess, showError, showWarning, showInfo } from '../utils/swal';


interface PdksDevamProps {
  employees: Employee[];
  izinTalepleri?: any[];
  departments?: any[];
  onNavigateToPuantaj?: () => void;
  selectedCompany?: string;
  onCompanyChange?: (company: string) => void;
  companies?: any[];
  selectedDepartment?: string;
  onDepartmentChange?: (dept: string) => void;
}

// Haversine formula to compute distance between two coordinates in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

function parseCompanyCoords(address: string | null): { lat: number; lng: number; cleanAddress: string } {
  const defaultCoords = { lat: 39.92077, lng: 32.85411, cleanAddress: address || '' };
  if (!address) return defaultCoords;
  
  const match = address.match(/^\[([\d.-]+),\s*([\d.-]+)\]\s*(.*)$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const cleanAddress = match[3];
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, cleanAddress };
    }
  }
  return defaultCoords;
}

function formatCompanyAddressWithCoords(lat: number, lng: number, addressText: string): string {
  return `[${lat},${lng}] ${addressText || ''}`.trim();
}

function checkIsShiftExpired(
  _shiftStartIso: string | null,
  cikisTimeStr: string = '18:00',
  _isOvertimeAuthorized: boolean = false,
  _gracePeriodMinutes: number = 0,
  _shiftStartTimeStr?: string
): { isExpired: boolean; autoCloseTime: string } {
  // Kullanıcı talebi: Otomatik mesai sonlandırma tamamen devre dışı bırakıldı.
  // Her çalışan kendi mesaisini "Mesaiyi Bitir" butonuyla kendisi sonlandırmalıdır.
  return { isExpired: false, autoCloseTime: cikisTimeStr };
}

// "vardıyada ne yazıyosa ona göre cıkış yapılsın"
// Personelin tanımlı vardiyası (Tarsus 15:00 vb.) varsa her zaman o vardiyanın çıkış saati esastır.
// Sadece özel vardiyası olmayan genel personel için Cumartesi erken çıkış (16:00) uygulanır.
function getTargetCikisTime(
  activeShift: { end_time?: string; id?: string; saturday_end_time?: string; is_default?: boolean } | null | undefined,
  defaultShiftId: string | undefined,
  isWeekend: boolean,
  satConfig: any
): string {
  if (isWeekend && satConfig?.isSaturdayWork) {
    if (activeShift?.saturday_end_time && activeShift.saturday_end_time !== '00:00') {
      return activeShift.saturday_end_time;
    }
    const isDefault = activeShift?.is_default || (defaultShiftId && activeShift?.id === defaultShiftId);
    if (isDefault) {
      return satConfig?.endTime || '16:00';
    }
    if (activeShift?.end_time && activeShift.end_time !== '00:00') {
      return activeShift.end_time;
    }
    return satConfig?.endTime || '16:00';
  }
  if (activeShift?.end_time && activeShift.end_time !== '00:00') {
    return activeShift.end_time;
  }
  return isWeekend ? (satConfig?.endTime || '16:00') : '18:00';
}

const PdksDevam: React.FC<PdksDevamProps> = ({
  employees,
  izinTalepleri = [],
  departments = [],
  onNavigateToPuantaj,
  selectedCompany = 'all',
  onCompanyChange,
  companies = [],
  selectedDepartment: propSelectedDepartment,
  onDepartmentChange,
}) => {
  const { profile, appRole, user } = useAuth();
  const isSuperAdmin = appRole === 'superadmin' || profile?.role === 'superadmin';
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole);
  const isHrOrAdmin = ['superadmin', 'admin', 'hr'].includes(appRole);

  const [activeTab, setActiveTab] = useState<'personal' | 'team'>(isManagement ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [localDepartment, setLocalDepartment] = useState<string>('all');
  const selectedDepartment = propSelectedDepartment ?? localDepartment;
  const setSelectedDepartment = onDepartmentChange ?? setLocalDepartment;

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  type PdksSortField = 'name' | 'department' | 'shift' | 'giris' | 'cikis' | 'office' | 'mesai' | 'durum';
  const [sortField, setSortField] = useState<PdksSortField>('name');

  const handleSort = (field: PdksSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const deptList = React.useMemo(() => {
    if (departments && departments.length > 0) {
      return departments.map((d: any) => (typeof d === 'string' ? d : d.name)).filter(Boolean);
    }
    return Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[];
  }, [departments, employees]);

  const currentEmployee = useMemo(() => {
    const matched = matchEmployeeToUser(employees, profile, user);
    if (matched) return matched;
    if (employees && employees.length === 1) return employees[0];
    if (isManagement && employees && employees.length > 0) return employees[0];
    return employees?.[0] || null;
  }, [employees, profile, user, isManagement]);

  const resolvedCompanyId = React.useMemo(() => {
    // 1. If superadmin selected a specific company in the dropdown:
    if (selectedCompany && selectedCompany !== 'all') {
      const normalized = normalizeCompanyId(selectedCompany);
      if (normalized) return normalized;
      const targetLower = selectedCompany.toLowerCase().trim();
      const matchedEmp = employees.find(
        (e) => (e.company || '').toLowerCase().trim() === targetLower
      );
      if (matchedEmp?.company_id) return matchedEmp.company_id;
    }

    // 2. Personal tab / employee profile company
    if (currentEmployee?.company_id) {
      return currentEmployee.company_id;
    }

    // 3. User profile company
    if (profile?.company_id && profile.company_id !== 'demo-company-id-9999') {
      return profile.company_id;
    }

    // 4. Employee list fallback
    const firstEmpWithComp = employees.find((e) => e.company_id)?.company_id;
    if (firstEmpWithComp) {
      return firstEmpWithComp;
    }

    return BIGSAFER_COMPANY_ID;
  }, [selectedCompany, currentEmployee?.company_id, profile?.company_id, employees]);

  const effectiveCompanyId = resolvedCompanyId;

  const [overtimeAuthMap, setOvertimeAuthMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const loadOvertimeAuth = async () => {
      const data = await systemDataService.getCompanyData<Record<string, boolean>>(
        effectiveCompanyId,
        'pdks_overtime_auth',
        {}
      );
      if (isMounted && data && typeof data === 'object') {
        setOvertimeAuthMap(data);
      }
    };
    loadOvertimeAuth();

    const handleUpdate = (e: any) => {
      if (e.detail?.companyId === effectiveCompanyId && e.detail?.key === 'pdks_overtime_auth') {
        setOvertimeAuthMap(e.detail.value || {});
      }
    };
    window.addEventListener('humanius_system_data_updated', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('humanius_system_data_updated', handleUpdate);
    };
  }, [effectiveCompanyId]);

  const toggleOvertimeAuth = async (empId: string) => {
    const next = { ...overtimeAuthMap, [empId]: !overtimeAuthMap[empId] };
    setOvertimeAuthMap(next);
    await systemDataService.saveCompanyData(
      effectiveCompanyId,
      'pdks_overtime_auth',
      next,
      'PDKS Fazla Mesai Yetkileri'
    );
  };

  // -------------------------------------------------------------
  // PERSONAL SHIFT TRACKING (MESAI BASLAT/BITIR) STATES
  // -------------------------------------------------------------
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState<string | null>(null);
  const [timerText, setTimerText] = useState('00:00:00');
  const [activeShiftRecordId, setActiveShiftRecordId] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  // Geolocation & Geofencing configuration
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Default Company Coordinates (e.g. Kızılay, Ankara, Turkey)
  const [companyCoords, setCompanyCoords] = useState({ lat: 39.92077, lng: 32.85411 });
  const [geofenceRadius, setGeofenceRadius] = useState(200); // 200 meters geofence
  const [locationStatus, setLocationStatus] = useState<'pending' | 'success' | 'denied' | 'error'>('pending');
  const [locationErrorMsg, setLocationErrorMsg] = useState('');
  const [allShiftRecords, setAllShiftRecords] = useState<any[]>([]);

  // Multi-office locations state
  const [officeLocations, setOfficeLocations] = useState<CompanyOfficeLocation[]>([]);
  const [allCompanyOfficesMap, setAllCompanyOfficesMap] = useState<Record<string, CompanyOfficeLocation[]>>({});
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(() => {
    try {
      const cId = currentEmployee?.id;
      if (cId) {
        return localStorage.getItem(`humanius_emp_selected_office_${cId}`) || '';
      }
    } catch {}
    return '';
  });
  const [adminOverrides, setAdminOverrides] = useState<Record<string, any>>({});
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<CompanyOfficeLocation | null>(null);

  // Company Work Hours & Multi-Shift States
  const [showVardiyaModal, setShowVardiyaModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [todaySmsCount, setTodaySmsCount] = useState<number>(() => {
    return smsService.getLogs(getTodayYYYYMMDD()).length;
  });

  useEffect(() => {
    const handleSmsUpdate = () => {
      setTodaySmsCount(smsService.getLogs(getTodayYYYYMMDD()).length);
    };
    window.addEventListener('humanius_sms_updated', handleSmsUpdate);
    return () => window.removeEventListener('humanius_sms_updated', handleSmsUpdate);
  }, []);

  const [allCompanyShifts, setAllCompanyShifts] = useState<CompanyShift[]>(VARSAYILAN_VARDIYALAR);
  const [allShiftAssignments, setAllShiftAssignments] = useState<Record<string, string>>({});
  const [activeUserShift, setActiveUserShift] = useState<CompanyShift>(VARSAYILAN_VARDIYALAR[0]);
  const [saturdayConfig, setSaturdayConfig] = useState<SaturdayWorkConfig>(DEFAULT_SATURDAY_CONFIG);

  // 1. Personelin atanmış olduğu vardiya (Vardiyalar / Vardiya Atamaları sekmesinden)
  const employeeAssignedShift = useMemo(() => {
    const empId = currentEmployee?.id;
    const empUserId = (currentEmployee as any)?.user_id;
    const assignedId = (empId && allShiftAssignments[empId]) || (empUserId && allShiftAssignments[empUserId]);
    if (assignedId) {
      const found = allCompanyShifts.find((s) => s.id === assignedId);
      if (found) return found;
    }
    // Personel lokasyonu veya departman eşleşmesi fallback
    if (currentEmployee) {
      const empLoc = currentEmployee.department || currentEmployee.ilce || currentEmployee.il || (currentEmployee as any).city || '';
      if (empLoc) {
        const matched = allCompanyShifts.find(
          (s) =>
            s.name.toLowerCase().includes(empLoc.toLowerCase()) ||
            (s.office_name && s.office_name.toLowerCase().includes(empLoc.toLowerCase()))
        );
        if (matched) return matched;
      }
    }
    return null;
  }, [currentEmployee, allShiftAssignments, allCompanyShifts]);

  // Helper to resolve the correct office for any employee across companies
  const resolveEmployeeOfficeName = React.useCallback((
    emp: any,
    shift?: any,
    notes?: string | null
  ): string => {
    const empCompId = normalizeCompanyId(emp?.company_id || (emp as any)?.company);
    const compOffices = (allCompanyOfficesMap && allCompanyOfficesMap[empCompId] && allCompanyOfficesMap[empCompId].length > 0)
      ? allCompanyOfficesMap[empCompId]
      : (empCompId === resolvedCompanyId && officeLocations.length > 0)
      ? officeLocations
      : getDefaultOfficesForCompany(empCompId);

    const defaultOffice = compOffices.find((o) => o.is_default) || compOffices[0];
    const defaultOfficeName = defaultOffice?.name || 'Merkez Ofis';

    // 1. If real check-in / check-out note exists (Single Source of Truth from actual punch-in)
    if (notes) {
      // 1.0. Açık [OFİS:...] veya [OFIS:...] etiketi kontrolü (en yüksek öncelik)
      const ofisTagMatch = notes.match(/\[(?:OFİS|OFIS):\s*([^\]]+)\]/i);
      if (ofisTagMatch && ofisTagMatch[1]) {
        const tagVal = ofisTagMatch[1].trim();
        const found = compOffices.find(o => normalizeTr(o.name) === normalizeTr(tagVal));
        if (found) return found.name;
        return tagVal;
      }

      // 1.1. Extract from pattern like "Tarayıcı GPS Doğrulandı: [Office] • ..."
      const match = notes.match(/(?:Doğrulandı|Eşleşti|Girişi|sonlandırıldı \()(?::\s*|\s*)([^,\)\.\n•|]+)/i);
      if (match && match[1]) {
        const candidate = match[1].trim();
        const normCand = normalizeTr(candidate);
        const found = compOffices.find(
          (o) => normalizeTr(o.name) === normCand || normalizeTr(o.name).includes(normCand) || normCand.includes(normalizeTr(o.name))
        );
        if (found) return found.name;
        return candidate;
      }

      // 1.2. Not metninde geçen ofis adları (Vardiya adıyla karışmaması için SADECE vardiya öncesi taranır)
      const preShiftNote = notes.split(/•\s*Vardiya/i)[0];
      const normPreNote = normalizeTr(preShiftNote);
      const sortedOffices = [...compOffices].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
      for (const off of sortedOffices) {
        if (normPreNote.includes(normalizeTr(off.name))) {
          return off.name;
        }
      }
    }

    // 2. Admin müdahalesi (override) varsa
    if (emp?.id && adminOverrides[emp.id]?.officeName) {
      return adminOverrides[emp.id].officeName;
    }

    // 2.5. Personelin bizzat seçtiği ofis (Local-First kalıcı seçim)
    if (emp?.id) {
      try {
        const savedOffId = localStorage.getItem(`humanius_emp_selected_office_${emp.id}`);
        if (savedOffId) {
          const found = compOffices.find(o => o.id === savedOffId);
          if (found) return found.name;
        }
      } catch {}
    }

    // 3. Atanmış vardiyada ofis açıkça tanımlıysa (Yalnızca vardiyada açık office_id veya office_name varsa)
    if (shift && (shift.office_id || shift.office_name)) {
      const shiftOff = resolveOfficeForShift(shift, compOffices);
      if (shiftOff && !shiftOff.is_default) return shiftOff.name;
    }

    // 4. Personelin departman / il / ilçe bilgisine göre ofis eşleştir
    const dept = normalizeTr(emp?.department || '');
    const city = normalizeTr(emp?.il || (emp as any)?.city || '');
    const ilce = normalizeTr(emp?.ilce || '');
    const branch = normalizeTr((emp as any)?.branch || '');
    const fullText = `${dept} ${branch} ${city} ${ilce}`;

    // A. Doğrudan ofis adı eşleşmesi
    for (const off of compOffices) {
      const offNorm = normalizeTr(off.name);
      if (offNorm && fullText.includes(offNorm)) return off.name;
    }

    // B. İlçe eşleşmesi
    for (const off of compOffices) {
      if (off.ilce && off.ilce.trim().length >= 3) {
        const offIlceNorm = normalizeTr(off.ilce);
        if (fullText.includes(offIlceNorm)) return off.name;
      }
    }

    return defaultOfficeName;
  }, [allCompanyOfficesMap, officeLocations, resolvedCompanyId, adminOverrides]);

  // 2. Personelin kendi mevcut ofisi (Doğrudan başlangıç seçimi)
  const employeeAssignedOffice = useMemo<CompanyOfficeLocation | null>(() => {
    if (officeLocations.length === 0) return null;

    // 0. Öncelik: Personelin bizzat seçtiği ve kaydettiği ofis (Local-first)
    if (currentEmployee?.id) {
      try {
        const savedOfficeId = localStorage.getItem(`humanius_emp_selected_office_${currentEmployee.id}`);
        if (savedOfficeId) {
          const found = officeLocations.find((o) => o.id === savedOfficeId);
          if (found) return found;
        }
      } catch {}
    }

    // 1. Admin müdahalesi
    if (currentEmployee?.id && adminOverrides[currentEmployee.id]?.officeName) {
      const adminOffName = normalizeTr(adminOverrides[currentEmployee.id].officeName);
      const found = officeLocations.find((o) => normalizeTr(o.name) === adminOffName);
      if (found) return found;
    }

    // 2. Atanmış vardiyada ofis açıkça tanımlıysa (Yalnızca vardiyada açık office_id veya office_name varsa)
    if (employeeAssignedShift && (employeeAssignedShift.office_id || employeeAssignedShift.office_name)) {
      const off = resolveOfficeForShift(employeeAssignedShift, officeLocations);
      if (off && !off.is_default) return off;
    }

    // 3. Personelin departman veya il/ilçe/şube bilgisine göre ofis eşleştir
    if (currentEmployee) {
      const offName = resolveEmployeeOfficeName(currentEmployee, employeeAssignedShift, null);
      const found = officeLocations.find((o) => normalizeTr(o.name) === normalizeTr(offName));
      if (found) return found;
    }

    // 4. Varsayılan ofis
    return officeLocations.find((o) => o.is_default) || officeLocations[0] || null;
  }, [employeeAssignedShift, officeLocations, currentEmployee, resolveEmployeeOfficeName, adminOverrides]);
  
  // Location Modal Form state
  const [locName, setLocName] = useState('');
  const [locLat, setLocLat] = useState<string>('');
  const [locLng, setLocLng] = useState<string>('');
  const [locRadius, setLocRadius] = useState<number>(200);
  const [locAddress, setLocAddress] = useState('');
  const [locIl, setLocIl] = useState('');
  const [locIlce, setLocIlce] = useState('');
  const [locIsDefault, setLocIsDefault] = useState(false);
  const [isSavingLoc, setIsSavingLoc] = useState(false);

  // 81 ilin alfabetik sıralı listesi
  const sortedIller = useMemo(() => {
    return [...iller].sort((a, b) => a.il.localeCompare(b.il, 'tr'));
  }, []);

  // Seçilen ile ait ilçe listesi
  const selectedLocIlData = useMemo(() => {
    if (!locIl) return null;
    return iller.find((item) => item.il.toLowerCase() === locIl.toLowerCase()) || null;
  }, [locIl]);

  const availableLocIlceler = useMemo(() => {
    if (!selectedLocIlData) return [];
    return [...selectedLocIlData.ilceleri].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [selectedLocIlData]);

  // Şehir bazlı ofis filtrelemesi:
  // - İK ve Şirket Yöneticisi (superadmin, admin, hr) şirketin tüm ofislerini görür.
  // - Normal personel için:
  //   1. Personelin ili seçiliyse, SADECE kendi ilindeki ofis(ler)i görür.
  //   2. Eğer personelin bulunduğu şehirde hiçbir ofis yoksa veya şehir seçili değilse, tüm ofisleri görür.
  const hasCityOffices = useMemo(() => {
    if (isHrOrAdmin) return false;
    const userCityNorm = currentEmployee?.il ? currentEmployee.il.trim().toLocaleLowerCase('tr-TR').replace(/[\s-]/g, '') : '';
    if (!userCityNorm) return false;
    return officeLocations.some((loc) => {
      const locCityNorm = loc.il ? loc.il.trim().toLocaleLowerCase('tr-TR').replace(/[\s-]/g, '') : '';
      return locCityNorm === userCityNorm;
    });
  }, [isHrOrAdmin, currentEmployee?.il, officeLocations]);

  const visibleOfficeLocations = useMemo(() => {
    if (!officeLocations || officeLocations.length === 0) return [];

    // Tüm şirket ofisleri seçilebilir olmalıdır (isteyen ofisini değiştirebilsin).
    // Personelin kendi ofisi (Kendi Ofisiniz) daima en üstte (1. sırada), ardından iline uyan ofisler, varsayılan merkez ofis ve diğerleri sıralanır.
    const assignedId = employeeAssignedOffice?.id;
    const userCityNorm = currentEmployee?.il ? normalizeTr(currentEmployee.il) : '';

    return [...officeLocations].sort((a, b) => {
      // 1. Personelin kendi ofisi en başta
      if (assignedId) {
        if (a.id === assignedId) return -1;
        if (b.id === assignedId) return 1;
      }
      // 2. Personelin iliyle eşleşen ofisler
      if (userCityNorm) {
        const aCity = a.il ? normalizeTr(a.il) : '';
        const bCity = b.il ? normalizeTr(b.il) : '';
        if (aCity === userCityNorm && bCity !== userCityNorm) return -1;
        if (bCity === userCityNorm && aCity !== userCityNorm) return 1;
      }
      // 3. Şirket varsayılan merkez ofisi
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      // 4. Alfabetik
      return a.name.localeCompare(b.name, 'tr-TR');
    });
  }, [officeLocations, employeeAssignedOffice, currentEmployee?.il]);

  // Efektif seçili ofis ID'si (Kullanıcının kendi atanmış ofisi doğrudan seçili gelir)
  const effectiveSelectedOfficeId = useMemo(() => {
    if (selectedOfficeId && visibleOfficeLocations.some((l) => l.id === selectedOfficeId)) {
      return selectedOfficeId;
    }
    if (employeeAssignedOffice?.id && visibleOfficeLocations.some((l) => l.id === employeeAssignedOffice.id)) {
      return employeeAssignedOffice.id;
    }
    return visibleOfficeLocations[0]?.id || '';
  }, [selectedOfficeId, visibleOfficeLocations, employeeAssignedOffice]);

  // Otomatik seçim: Sayfa açıldığında personelin mevcut ofisi otomatik seçili gelir,
  // personel mesai başlatma kartında başka bir ofis seçtiğinde kullanıcının seçimi korunur.
  useEffect(() => {
    if (!officeLocations || officeLocations.length === 0) return;

    setSelectedOfficeId((prev) => {
      // 1. Zaten bu oturumda seçilmiş ve listede mevcut bir ofis varsa koru
      if (prev && officeLocations.some((l) => l.id === prev)) {
        return prev;
      }

      // 1.5 Local storage'da kayıtlı seçilmiş ofis varsa
      if (currentEmployee?.id) {
        try {
          const saved = localStorage.getItem(`humanius_emp_selected_office_${currentEmployee.id}`);
          if (saved && officeLocations.some((l) => l.id === saved)) {
            return saved;
          }
        } catch {}
      }

      // 2. Personelin kendi mevcut ofisi doğrudan seçili gelsin
      if (employeeAssignedOffice && officeLocations.some((l) => l.id === employeeAssignedOffice.id)) {
        return employeeAssignedOffice.id;
      }

      // 3. Varsayılan merkez ofis veya ilk ofis
      const def = officeLocations.find((l) => l.is_default) || officeLocations[0];
      return def ? def.id : '';
    });
  }, [officeLocations, employeeAssignedOffice, currentEmployee?.id]);

  // Personel değiştiğinde (ör. oturum açıldığında veya personel değişiminde) personelin mevcut ofisini doğrudan seçili yap
  useEffect(() => {
    if (employeeAssignedOffice?.id) {
      setSelectedOfficeId(employeeAssignedOffice.id);
    }
  }, [employeeAssignedOffice?.id, currentEmployee?.id]);
  
  // Edit Employee PDKS Modal states
  const [editEmpModal, setEditEmpModal] = useState<any | null>(null);
  const [editGiris, setEditGiris] = useState('');
  const [editCikis, setEditCikis] = useState('');
  const [editOfficeName, setEditOfficeName] = useState('');
  const [editShiftId, setEditShiftId] = useState('');

  // Seçilen Tarih (Varsayılan: Bugün) - PDKS Devam ve Vardiya Denetimi
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayYYYYMMDD());
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Aylık Puantaj Cetveli Manuel Düzeltmeleri (HT, AT, İzinler vb.) Senkronizasyonu
  const [puantajOverrides, setPuantajOverrides] = useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem('humanius_puantaj_overrides');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Puantaj veya vardiya güncellendiğinde puantajOverrides state'ini otomatik tazele
  useEffect(() => {
    const handleSyncPuantaj = () => {
      try {
        const raw = localStorage.getItem('humanius_puantaj_overrides');
        setPuantajOverrides(raw ? JSON.parse(raw) : {});
      } catch {}
    };

    window.addEventListener('humanius_puantaj_updated', handleSyncPuantaj);
    window.addEventListener('humanius_shifts_updated', handleSyncPuantaj);
    window.addEventListener('storage', handleSyncPuantaj);

    return () => {
      window.removeEventListener('humanius_puantaj_updated', handleSyncPuantaj);
      window.removeEventListener('humanius_shifts_updated', handleSyncPuantaj);
      window.removeEventListener('storage', handleSyncPuantaj);
    };
  }, []);

  // Load shifts and assignments from database & sync active shift
  useEffect(() => {
    let isMounted = true;
    const targetCompanyId = resolvedCompanyId;
    const empId = currentEmployee?.id;

    const refreshShifts = async () => {
      try {
        const [fetchedShifts, fetchedAssignments, fetchedSat] = await Promise.all([
          shiftService.getShifts(targetCompanyId),
          shiftService.getAssignments(targetCompanyId),
          shiftService.getSaturdayConfig(targetCompanyId),
        ]);
        if (!isMounted) return;
        const cleanShifts = fetchedShifts.filter(isNotSaturdayShift);
        setAllCompanyShifts(cleanShifts);
        setAllShiftAssignments(fetchedAssignments);
        setSaturdayConfig(fetchedSat);

        const defaultShift = cleanShifts.find((s) => s.is_default) || cleanShifts[0] || VARSAYILAN_VARDIYALAR[0];
        const empUserId = (currentEmployee as any)?.user_id;
        const assignedId = (empId && fetchedAssignments[empId]) || (empUserId && fetchedAssignments[empUserId]);
        let userShift = assignedId ? cleanShifts.find((s) => s.id === assignedId) : null;
        if (!userShift && currentEmployee) {
          const empLoc = currentEmployee.department || currentEmployee.ilce || currentEmployee.il || (currentEmployee as any).city || '';
          if (empLoc) {
            userShift = cleanShifts.find(s => 
              s.name.toLowerCase().includes(empLoc.toLowerCase()) || 
              (s.office_name && s.office_name.toLowerCase().includes(empLoc.toLowerCase()))
            );
          }
        }
        const effectiveShift = userShift || defaultShift;
        setActiveUserShift(effectiveShift);

        // Atanmış vardiyanın ofisini bulup seçili ofis henüz ayarlanmamışsa senkronize et
        if (effectiveShift && officeLocations.length > 0) {
          const shiftOff = resolveOfficeForShift(effectiveShift, officeLocations);
          if (shiftOff?.id) {
            setSelectedOfficeId((prev) => {
              if (prev && officeLocations.some((l) => l.id === prev)) return prev;
              return shiftOff.id;
            });
          }
        }
      } catch (err) {
        console.warn('Error loading shifts:', err);
      }
    };

    refreshShifts();

    const handleShiftsUpdated = () => {
      refreshShifts();
    };
    const handleSatUpdated = (e: any) => {
      if (e.detail?.config) {
        setSaturdayConfig(e.detail.config);
      } else {
        shiftService.getSaturdayConfig(targetCompanyId).then((c) => {
          if (isMounted) setSaturdayConfig(c);
        });
      }
    };

    window.addEventListener('humanius_shifts_updated', handleShiftsUpdated);
    window.addEventListener('humanius_saturday_updated', handleSatUpdated);
    window.addEventListener('humanius_izin_turleri_updated', handleShiftsUpdated);
    window.addEventListener('storage', handleShiftsUpdated);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshShifts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('humanius_shifts_updated', handleShiftsUpdated);
      window.removeEventListener('humanius_saturday_updated', handleSatUpdated);
      window.removeEventListener('humanius_izin_turleri_updated', handleShiftsUpdated);
      window.removeEventListener('storage', handleShiftsUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resolvedCompanyId, currentEmployee?.id, officeLocations]);
  
  // Ofise bağlı vardiya filtrelemesi:
  // - İK ve Şirket Yöneticisi (superadmin, admin, hr) şirketin tüm vardiyalarını görür.
  // - Normal personel için:
  //   1. Personelin bizzat seçtiği ofis (veya atanmış olduğu ofis) belirlenir.
  //   2. O OFİSİN vardiyaları listelenir ve personel o ofisin vardiyaları arasında seçim yapabilir.
  //   3. Personelin atanmış olduğu vardiya da daima listede yer alır.
  //   4. Eğer ofise özel başka hiçbir vardiya yoksa genel vardiyalar gösterilir.
  // Seçili ofise kayıtlı vardiyaları filtreleme yardımcı fonksiyonu:
  // Herhangi bir ofis seçildiğinde SADECE o ofise ait vardiyalar listelenir.
  const getShiftsForSpecificOffice = React.useCallback((
    targetOfficeId: string,
    shiftsList: CompanyShift[],
    locations: CompanyOfficeLocation[]
  ): CompanyShift[] => {
    if (!targetOfficeId || shiftsList.length === 0) return [];

    const targetOff = locations.find((o) => o.id === targetOfficeId);

    // 1. Bu ofise doğrudan veya eşleşme kuralıyla kayıtlı olan vardiyalar
    const matched = shiftsList.filter((shift) => {
      // A. Doğrudan office_id eşleşmesi
      if (shift.office_id && shift.office_id === targetOfficeId) return true;

      // B. Local metadata office_id eşleşmesi
      if (shift.id) {
        const meta = getShiftOfficeMeta(shift.id);
        if (meta?.office_id && meta.office_id === targetOfficeId) return true;
      }

      // C. resolveOfficeForShift eşleşmesi
      const resolved = resolveOfficeForShift(shift, locations);
      if (resolved && resolved.id === targetOfficeId) return true;

      // D. inferOfficeForShift eşleşmesi
      const inferred = inferOfficeForShift(shift, locations);
      if (inferred && inferred.office_id === targetOfficeId) return true;

      // E. Hedef ofis adı ile doğrudan metin eşleşmesi
      if (targetOff) {
        const normTargetName = normalizeTr(targetOff.name);
        const normShiftName = normalizeTr(shift.name);
        const normOfficeName = normalizeTr(shift.office_name || '');

        if (normOfficeName && (normOfficeName === normTargetName || normTargetName.includes(normOfficeName) || normOfficeName.includes(normTargetName))) {
          return true;
        }
        if (normShiftName && normShiftName.includes(normTargetName)) {
          return true;
        }
        // Ofis adındaki belirleyici anahtar kelimeler (örn: suzuki, mg)
        const targetParts = normTargetName.split(/[\s\/\-_]+/).filter(p => p.length >= 2 && !['ofis', 'sube', 'merkez', 'ofisi', 'subesi'].includes(p));
        if (targetParts.some(p => normShiftName.includes(p) || normOfficeName.includes(p))) {
          return true;
        }
      }

      return false;
    });

    if (matched.length > 0) {
      return matched;
    }

    // 2. Eğer bu ofise özel hiçbir vardiya tanımlanmamışsa (Örn: Suzuki / Mg):
    // Başka bir spesifik şubeye ait olan vardiyalar (Sixt Adana, Tarsus vb.) KESİNLİKLE EKLENMEZ.
    // Doğrudan şirketin genel / standart vardiyaları (1. Vardiya Standart, Sabah, Akşam, Gece) sunulur!
    const otherOffices = locations.filter(l => l.id !== targetOfficeId && !l.is_default);
    const unassignedShifts = shiftsList.filter((s) => {
      if (s.office_id && s.office_id !== targetOfficeId) return false;
      const resolved = resolveOfficeForShift(s, locations);
      if (resolved && resolved.id !== targetOfficeId && !resolved.is_default) return false;

      const normShiftName = normalizeTr(s.name || '');
      const normOfficeName = normalizeTr(s.office_name || '');
      for (const other of otherOffices) {
        const otherNorm = normalizeTr(other.name);
        if (normOfficeName && (normOfficeName === otherNorm || otherNorm.includes(normOfficeName))) return false;
        const otherParts = otherNorm.split(/[\s\/\-_]+/).filter(p => p.length >= 3 && !['ofis', 'sube', 'merkez', 'ofisi', 'subesi'].includes(p));
        if (otherParts.some(p => normShiftName.includes(p))) return false;
      }
      return true;
    });

    return unassignedShifts.length > 0 ? unassignedShifts : shiftsList;
  }, []);

  // Mesai Başlatma kartında seçili ofise kayıtlı vardiyaların listesi:
  // - Seçilen ofise kayıtlı vardiyalar SADECE gösterilir (diğer ofislerin vardiyaları sızmaz).
  // - Personelin atanmış olduğu vardiya bu ofise aitse en başta listelenir.
  const visibleShiftsForEmployee = useMemo(() => {
    const targetOfficeId = effectiveSelectedOfficeId || employeeAssignedOffice?.id;
    if (!targetOfficeId) return allCompanyShifts;

    const officeShifts = getShiftsForSpecificOffice(targetOfficeId, allCompanyShifts, officeLocations);

    return [...officeShifts].sort((a, b) => {
      if (employeeAssignedShift) {
        if (a.id === employeeAssignedShift.id) return -1;
        if (b.id === employeeAssignedShift.id) return 1;
      }
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.name.localeCompare(b.name, 'tr-TR');
    });
  }, [effectiveSelectedOfficeId, employeeAssignedOffice?.id, allCompanyShifts, officeLocations, employeeAssignedShift, getShiftsForSpecificOffice]);

  // Efektif seçili vardiya ID'si
  const effectiveSelectedShiftId = useMemo(() => {
    if (activeUserShift?.id && visibleShiftsForEmployee.some((s) => s.id === activeUserShift.id)) {
      return activeUserShift.id;
    }
    if (employeeAssignedShift?.id && visibleShiftsForEmployee.some((s) => s.id === employeeAssignedShift.id)) {
      return employeeAssignedShift.id;
    }
    return visibleShiftsForEmployee[0]?.id || '';
  }, [activeUserShift, visibleShiftsForEmployee, employeeAssignedShift]);

  // Ofis veya vardiya listesi değiştiğinde aktif vardiyayı personelin atanmış vardiyasına veya seçili ofisin vardiyasına senkronize et
  useEffect(() => {
    if (isShiftActive) return;
    if (!visibleShiftsForEmployee || visibleShiftsForEmployee.length === 0) return;

    // Aktif vardiya zaten seçili ofisin vardiyaları arasındaysa korunur
    const exists = visibleShiftsForEmployee.some((s) => s.id === activeUserShift?.id);
    if (exists) return;

    // Personelin atanmış vardiyası bu seçili ofisin vardiyaları içindeyse onu seç
    const matchingAssigned = employeeAssignedShift && visibleShiftsForEmployee.find((s) => s.id === employeeAssignedShift.id);
    if (matchingAssigned) {
      setActiveUserShift(matchingAssigned);
      if (currentEmployee?.id) {
        try {
          localStorage.setItem(`humanius_emp_selected_shift_${currentEmployee.id}`, matchingAssigned.id);
        } catch {}
      }
      return;
    }

    // Aksi halde seçili ofisin varsayılan veya ilk vardiyasını otomatik seç
    const def = visibleShiftsForEmployee.find((s) => s.is_default) || visibleShiftsForEmployee[0];
    if (def) {
      setActiveUserShift(def);
      if (currentEmployee?.id) {
        try {
          localStorage.setItem(`humanius_emp_selected_shift_${currentEmployee.id}`, def.id);
        } catch {}
      }
    }
  }, [visibleShiftsForEmployee, isShiftActive, employeeAssignedShift, activeUserShift?.id, currentEmployee?.id]);

  // Geolocation watch ID ref
  const watchIdRef = useRef<number | null>(null);

  const [companyDetails, setCompanyDetails] = useState<any>(null);

  // Load state and history from localStorage and database on init
  useEffect(() => {
    // Read local storage for active session
    const savedActiveId = localStorage.getItem('pdks_active_shift_id');
    const savedStart = localStorage.getItem('pdks_active_shift_start');
    const nowInit = new Date();
    const isTodayWeekend = nowInit.getDay() === 6 || nowInit.getDay() === 0;
    const targetCikisTime = getTargetCikisTime(activeUserShift, undefined, isTodayWeekend, saturdayConfig);
    const isOvertimeAuthorized = Boolean(currentEmployee?.id && overtimeAuthMap[currentEmployee.id]);
    
    if (savedActiveId && savedStart) {
      // KULLANICI KESİN TALİMATI: Gün aşsa bile (gece vardiyası veya açık kalan mesai)
      // mesai ASLA otomatik kapatılmaz ve silinmez. Personel kendi kapatana kadar aktif kalır.
      setIsShiftActive(true);
      setShiftStartTime(savedStart);
      setActiveShiftRecordId(savedActiveId);
      startWatchingLocation();
    } else if (savedStart && !savedActiveId) {
      setIsShiftActive(true);
      setShiftStartTime(savedStart);
      startWatchingLocation();
    }

    // Request initial position
    requestLocation();

    // Load company coordinates from database
    if (resolvedCompanyId) {
      companyService.getById(resolvedCompanyId).then(comp => {
        if (comp) {
          setCompanyDetails(comp);
          const parsed = parseCompanyCoords(comp.address);
          setCompanyCoords({ lat: parsed.lat, lng: parsed.lng });
        }
      });
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [resolvedCompanyId, activeUserShift?.end_time]);

  // Load office locations for the company & all companies
  const loadOfficeLocations = React.useCallback(async () => {
    try {
      const [locs, allMap] = await Promise.all([
        companyService.getOfficeLocations(resolvedCompanyId),
        companyService.getAllOfficeLocations()
      ]);
      setOfficeLocations(locs);
      setAllCompanyOfficesMap(allMap);
      if (locs && locs.length > 0) {
        setSelectedOfficeId((prev) => {
          if (prev && locs.some((l) => l.id === prev)) return prev;
          if (employeeAssignedOffice && locs.some((l) => l.id === employeeAssignedOffice.id)) {
            return employeeAssignedOffice.id;
          }
          const def = locs.find((l) => l.is_default) || locs[0];
          return def ? def.id : '';
        });
      }
    } catch (e) {
      console.error("Error loading office locations:", e);
    }
  }, [resolvedCompanyId, employeeAssignedOffice, currentEmployee?.id]);

  useEffect(() => {
    loadOfficeLocations();
    const handleOfficeUpdate = () => {
      loadOfficeLocations();
    };
    window.addEventListener('humanius_office_locations_updated', handleOfficeUpdate);
    return () => {
      window.removeEventListener('humanius_office_locations_updated', handleOfficeUpdate);
    };
  }, [loadOfficeLocations]);

  // Load shift history from database and sync shift status
  const loadShiftHistory = React.useCallback(async () => {
    try {
      const allVardiyalar = await pdksService.getVardiyalar();
      setAllShiftRecords(allVardiyalar || []);

      if (currentEmployee?.id) {
        // Filter to only include records for the current employee
        const myVardiyalar = (allVardiyalar || []).filter(v => v.employee_id === currentEmployee.id);

        // KULLANICI KESİN TALİMATI: Gün bitse dahi (gece vardiyası veya açık kalan mesai)
        // mesai ASLA otomatik kapatılmaz. Personel kendi "Mesaiyi Bitir" ile kapatana kadar mesai açık kalır.
        // En güncel açık olan vardiyayı bul (tarih ve saate göre sıralı)
        const openShift = myVardiyalar
          .filter(v => v.giris_saati && (!v.cikis_saati || v.cikis_saati === '00:00:00' || v.cikis_saati === '00:00' || v.cikis_saati === '-'))
          .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '') || (b.giris_saati || '').localeCompare(a.giris_saati || ''))[0];

        // Otomatik vardiya sonlandırma notlarını ve sahte çıkışlarını temizle
        if (openShift && openShift.cikis_saati && openShift.notlar && (openShift.notlar.includes('Otomatik vardiya sonlandırma') || openShift.notlar.includes('otomatik sonlandırıldı'))) {
          try {
            await pdksService.updateVardiya(openShift.id, {
              cikis_saati: null,
              notlar: (openShift.notlar || '').replace(/Otomatik vardiya sonlandırma[^•\n]*/, '').replace(/\[OFİS:[^\]]+\]\s*\[VARDIYA:[^\]]+\]\s*\[VARDIYA_ID:[^\]]+\]\s*Konumdan uzaklaşıldığı için sistem tarafından otomatik sonlandırıldı[^\n]*/, '').trim()
            });
            openShift.cikis_saati = null;
          } catch (e) {
            console.warn('Otomatik çıkış geri alma hatası:', e);
          }
        }

        if (openShift) {
          // Açık bir mesai var (bugünden veya dün gece 23:00'ten gelen gece vardiyası veya açık unutulan mesai)
          const cleanGiris = openShift.giris_saati.substring(0, 5);
          const startIso = `${openShift.tarih}T${cleanGiris}:00`;

          setActiveShiftRecordId(openShift.id);
          localStorage.setItem('pdks_active_shift_id', openShift.id);
          setShiftStartTime(startIso);
          localStorage.setItem('pdks_active_shift_start', startIso);
          setIsShiftActive(true);
        } else {
          // Açık mesai yok, en son mesai tamamlanmış
          localStorage.removeItem('pdks_active_shift_id');
          localStorage.removeItem('pdks_active_shift_start');
          setIsShiftActive(false);
          setShiftStartTime(null);
          setActiveShiftRecordId(null);
        }

        // Map to localHistory format
        const mappedHistory = myVardiyalar.map(v => {
          const dateObj = new Date(v.tarih);
          const girisClean = v.giris_saati ? v.giris_saati.substring(0, 5) : '-';
          const cikisClean = v.cikis_saati ? v.cikis_saati.substring(0, 5) : '-';
          
          let totalHoursStr = '0 Saat';
          if (v.giris_saati && v.cikis_saati) {
            const [gH, gM] = v.giris_saati.split(':').map(Number);
            const [cH, cM] = v.cikis_saati.split(':').map(Number);
            const gMinutes = gH * 60 + gM;
            const cMinutes = cH * 60 + cM;
            let diffMin = cMinutes - gMinutes;
            if (diffMin < 0) {
              diffMin += 24 * 60; // Gece vardiyası (ör. 23:00 - 07:00)
            }
            if (diffMin > 0) {
              totalHoursStr = `${parseFloat((diffMin / 60).toFixed(2))} Saat`;
            }
          }

          return {
            id: v.id,
            tarih: dateObj.toLocaleDateString('tr-TR'),
            giris: girisClean,
            cikis: cikisClean,
            sure: totalHoursStr,
            durum: v.durum === 'zamaninda' ? 'Zamanında' : v.durum === 'gec-kaldi' ? 'Geç Kaldı' : 'Otomatik Çıkış',
            notlar: v.notlar || ''
          };
        });
        setLocalHistory(mappedHistory);
      } else {
        // Fallback to local storage if no currentEmployee yet
        const savedHistory = localStorage.getItem('pdks_personal_history');
        if (savedHistory) {
          setLocalHistory(JSON.parse(savedHistory));
        }
      }
    } catch (error) {
      console.error("Failed to load shift history from database:", error);
      // Fallback to local storage
      const savedHistory = localStorage.getItem('pdks_personal_history');
      if (savedHistory) {
        setLocalHistory(JSON.parse(savedHistory));
      }
    }
  }, [currentEmployee?.id, activeUserShift, overtimeAuthMap, saturdayConfig]);

  useEffect(() => {
    loadShiftHistory();
    window.addEventListener('humanius_shifts_updated', loadShiftHistory);
    window.addEventListener('humanius_puantaj_updated', loadShiftHistory);
    window.addEventListener('storage', loadShiftHistory);
    return () => {
      window.removeEventListener('humanius_shifts_updated', loadShiftHistory);
      window.removeEventListener('humanius_puantaj_updated', loadShiftHistory);
      window.removeEventListener('storage', loadShiftHistory);
    };
  }, [loadShiftHistory]);

  // Update timer ticks while shift is active
  useEffect(() => {
    let intervalId: any;
    if (isShiftActive && shiftStartTime) {
      const startMs = new Date(shiftStartTime).getTime();
      
      intervalId = setInterval(() => {
        const now = new Date();
        const diffMs = now.getTime() - startMs;
        const totalSecs = Math.floor(diffMs / 1000);

        // Otomatik kapatma yok: Çalışan kendi mesaisini "Mesaiyi Bitir" ile kapatana kadar sayaç akar
        const hours = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
        const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
        const secs = (totalSecs % 60).toString().padStart(2, '0');
        setTimerText(`${hours}:${mins}:${secs}`);
      }, 1000);
    } else {
      setTimerText('00:00:00');
    }
    return () => clearInterval(intervalId);
  }, [isShiftActive, shiftStartTime]);

  // Periodic Shift & Tolerance Push Notification Monitor
  useEffect(() => {
    const checkShiftNotifications = () => {
      if (!notificationService.isSupported() || notificationService.getPermission() !== 'granted') {
        return;
      }

      const now = new Date();
      const isTodayWeekend = now.getDay() === 6 || now.getDay() === 0;
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const shiftStartStr = (isTodayWeekend && saturdayConfig?.isSaturdayWork)
        ? (activeUserShift?.saturday_start_time || saturdayConfig?.startTime || activeUserShift?.start_time || '08:30')
        : (activeUserShift?.start_time || '08:30');
      const shiftEndStr = getTargetCikisTime(activeUserShift, undefined, isTodayWeekend, saturdayConfig);
      const toleranceMin = (activeUserShift?.tolerance_minutes !== undefined && activeUserShift?.tolerance_minutes !== null)
        ? Math.max(0, Number(activeUserShift.tolerance_minutes))
        : 15;

      // 1. Shift Start & Late Tolerance Alerts (If user has not started shift yet)
      if (!isShiftActive && shiftStartStr) {
        const [sGh, sGm] = shiftStartStr.split(':').map(Number);
        if (!isNaN(sGh) && !isNaN(sGm)) {
          const shiftStartMin = sGh * 60 + sGm;

          if (toleranceMin > 0) {
            // A) Exact shift start time reached
            if (currentMin >= shiftStartMin && currentMin < shiftStartMin + toleranceMin) {
              notificationService.sendShiftStartReminder(shiftStartStr);
            }
            // B) Tolerance window passed
            else if (currentMin >= shiftStartMin + toleranceMin && currentMin < shiftStartMin + 240) {
              notificationService.sendShiftLateToleranceAlert(toleranceMin, shiftStartStr);
            }
          } else {
            // Tolerance is 0: Alert immediately upon shift time
            if (currentMin >= shiftStartMin && currentMin < shiftStartMin + 240) {
              notificationService.sendShiftLateToleranceAlert(0, shiftStartStr);
            }
          }
        }
      }

      // 2. Shift End Reminder (If user is currently working)
      if (isShiftActive && shiftEndStr) {
        const [cH, cM] = shiftEndStr.split(':').map(Number);
        if (!isNaN(cH) && !isNaN(cM)) {
          const shiftEndMin = cH * 60 + cM;
          if (currentMin >= shiftEndMin && currentMin < shiftEndMin + 60) {
            notificationService.sendShiftEndReminder(shiftEndStr);
          }
        }
      }
    };

    checkShiftNotifications();
    const intervalId = setInterval(checkShiftNotifications, 10000); // Check every 10 seconds
    return () => clearInterval(intervalId);
  }, [isShiftActive, activeUserShift?.start_time, activeUserShift?.end_time, activeUserShift?.tolerance_minutes]);

  // Request browser location once
  // Request browser location with multi-stage fallback (GPS -> Network/Wi-Fi)
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationErrorMsg('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }

    setLocationStatus('pending');

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setUserCoords({ lat: latitude, lng: longitude });
      setLocationStatus('success');
      setLocationErrorMsg('');

      // Akıllı ofis eşleştirme: Kullanıcının GPS koordinatına en yakın şirket şubesini tespit et
      const availableOffices = visibleOfficeLocations.length > 0 ? visibleOfficeLocations : officeLocations;
      if (availableOffices.length > 0) {
        let closest = availableOffices[0];
        let minD = getDistance(latitude, longitude, closest.lat, closest.lng);
        for (let i = 1; i < availableOffices.length; i++) {
          const d = getDistance(latitude, longitude, availableOffices[i].lat, availableOffices[i].lng);
          if (d < minD) {
            minD = d;
            closest = availableOffices[i];
          }
        }
        // Eğer en yakın ofis yakın bir mesafedeyse (şube sınırları veya 2 km civarı), otomatik seç
        if (closest && minD <= Math.max(2500, (closest.radius_meters || 200) * 3)) {
          setSelectedOfficeId(closest.id);
        }
      }
    };

    // 1. Aşama: Yüksek hassasiyetli GPS (15 saniye zaman aşımı, son 1 dakikalık önbelleğe izin)
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (error) => {
        console.warn('Yüksek hassasiyetli GPS zaman aşımı/uyarısı, ağ tabanlı standart konuma geçiliyor:', error.message);
        // 2. Aşama: Kapalı alanlar ve mobil cihazlar için düşük hassasiyetli (Wi-Fi/Hücresel) fallback
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (lowAccError) => {
            console.warn('Standart konum uyarısı:', lowAccError.message);
            setLocationStatus('denied');
            setLocationErrorMsg('Konum tam doğrulanamadı. Mesainizi onaylayarak devam edebilirsiniz.');
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 180000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  // Watch position when shift starts
  function startWatchingLocation() {
    if (watchIdRef.current !== null) return;

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.warn("Watch position warning:", error.message);
        },
        { enableHighAccuracy: true }
      );
    }
  }

  function stopWatchingLocation() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  // Active selected office (Kullanıcının seçimi birincil önceliklidir, isteyen değiştirebilir)
  const activeOffice = React.useMemo<CompanyOfficeLocation>(() => {
    const listToUse = visibleOfficeLocations.length > 0 ? visibleOfficeLocations : officeLocations;
    if (listToUse.length > 0) {
      // 1. Birincil öncelik: Seçili ofis (veya personelin kendi atanmış ofisi)
      if (effectiveSelectedOfficeId) {
        const found = listToUse.find((l) => l.id === effectiveSelectedOfficeId);
        if (found) return found;
      }
      // 2. İkincil öncelik: Personelin kendi atanmış ofisi
      if (employeeAssignedOffice) {
        const found = listToUse.find((l) => l.id === employeeAssignedOffice.id);
        if (found) return found;
      }
      // 3. Varsayılan merkez ofis veya ilk ofis
      return listToUse.find((l) => l.is_default) || listToUse[0];
    }
    return {
      id: 'default',
      company_id: resolvedCompanyId || '',
      name: companyDetails?.name ? `${companyDetails.name} Ana Ofisi` : 'Şirket Merkez Ofisi',
      lat: companyCoords.lat,
      lng: companyCoords.lng,
      radius_meters: geofenceRadius,
      address: companyDetails?.address || '',
      is_default: true,
    };
  }, [effectiveSelectedOfficeId, employeeAssignedOffice, visibleOfficeLocations, officeLocations, companyDetails, companyCoords, geofenceRadius, resolvedCompanyId]);

  // Distance to selected active office
  const distanceToSelectedOffice = React.useMemo(() => {
    if (!userCoords || !activeOffice) return null;
    return Math.round(getDistance(userCoords.lat, userCoords.lng, activeOffice.lat, activeOffice.lng));
  }, [userCoords, activeOffice]);

  // Geofence check against selected office
  const isWithinGeofence = React.useMemo(() => {
    if (distanceToSelectedOffice === null || !activeOffice) return false;
    return distanceToSelectedOffice <= (activeOffice.radius_meters || geofenceRadius);
  }, [distanceToSelectedOffice, activeOffice, geofenceRadius]);

  // Office Location Management Handlers
  const handleOpenNewOffice = () => {
    setEditingLocation(null);
    setLocName('');
    setLocLat(userCoords ? userCoords.lat.toFixed(5) : '');
    setLocLng(userCoords ? userCoords.lng.toFixed(5) : '');
    setLocRadius(200);
    setLocAddress('');
    setLocIl('');
    setLocIlce('');
    setLocIsDefault(officeLocations.length === 0);
    setShowLocationModal(true);
  };

  const handleOpenEditOffice = (loc: CompanyOfficeLocation) => {
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocLat(String(loc.lat));
    setLocLng(String(loc.lng));
    setLocRadius(loc.radius_meters || 200);
    setLocAddress(loc.address || '');
    setLocIl(loc.il || '');
    setLocIlce(loc.ilce || '');
    setLocIsDefault(Boolean(loc.is_default));
    setShowLocationModal(true);
  };

  const handleUseCurrentCoordsForForm = () => {
    if (userCoords) {
      setLocLat(userCoords.lat.toFixed(5));
      setLocLng(userCoords.lng.toFixed(5));
    } else {
      requestLocation();
      alert('Konum alınıyor, lütfen birkaç saniye sonra tekrar deneyin.');
    }
  };

  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) {
      alert('Lütfen ofis/şube adını girin (Örn: Düzce Ofisi, Bolu Şubesi, İstanbul Genel Merkez).');
      return;
    }
    const latNum = parseFloat(String(locLat));
    const lngNum = parseFloat(String(locLng));
    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('Lütfen geçerli enlem ve boylam koordinatları girin veya "Mevcut Konumumu Al" butonunu kullanın.');
      return;
    }

    try {
      setIsSavingLoc(true);
      const targetCompanyId = resolvedCompanyId || 'demo-company-id-9999';
      const saved = await companyService.saveOfficeLocation({
        id: editingLocation?.id,
        company_id: targetCompanyId,
        name: locName.trim(),
        lat: latNum,
        lng: lngNum,
        radius_meters: Number(locRadius) || 200,
        address: locAddress.trim(),
        il: locIl.trim(),
        ilce: locIlce.trim(),
        is_default: locIsDefault,
      });

      if (!saved) {
        throw new Error('Ofis kaydedilemedi. Lütfen bilgileri kontrol edip tekrar deneyin.');
      }

      await loadOfficeLocations();
      if (saved?.id) {
        setSelectedOfficeId(saved.id);
      }
      setShowLocationModal(false);
      setEditingLocation(null);
      alert(`"${locName}" konumu başarıyla kaydedildi!`);
    } catch (err: any) {
      console.error(err);
      alert('Ofis kaydedilirken hata oluştu: ' + (err?.message || err));
    } finally {
      setIsSavingLoc(false);
    }
  };

  const handleDeleteOffice = async (locId: string, name: string) => {
    const ok = await showConfirm({
      title: 'Konumu Silmek İstiyor Musunuz?',
      text: `"${name}" konumunu silmek istediğinize emin misiniz?`,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'Vazgeç',
      isDanger: true,
    });
    if (!ok) return;
    try {
      await companyService.deleteOfficeLocation(locId, resolvedCompanyId);
      await loadOfficeLocations();
      showSuccess('Konum Silindi', `"${name}" konumu başarıyla silindi.`);
    } catch (err: any) {
      console.error(err);
      showError('Hata', 'Silme sırasında hata oluştu: ' + (err?.message || err));
    }
  };

  // Start Shift Handler
  const handleStartShift = async () => {
    const empId = currentEmployee?.id;
    if (!empId) {
      showError(
        'Personel Kaydı Bulunamadı',
        'Personel kaydınız sistemde bulunamadı. Lütfen İK yöneticinizle iletişime geçin.'
      );
      return;
    }

    const now = new Date();
    const startIso = now.toISOString();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
    const dateStr = getTodayYYYYMMDD();
    
    // Calculate delay based on selected shift's start time and tolerance (Cumartesi ve Pazar dahil)
    const dayOfWeek = now.getDay();
    const isTodayWeekend = dayOfWeek === 6 || dayOfWeek === 0;
    const isWeekendActive = isTodayWeekend && saturdayConfig?.isSaturdayWork;

    const shiftStart = isWeekendActive
      ? (activeUserShift?.saturday_start_time || saturdayConfig?.startTime || activeUserShift?.start_time || '08:30')
      : (activeUserShift?.start_time || '08:30');
    const shiftEnd = isWeekendActive
      ? (activeUserShift?.saturday_end_time || saturdayConfig?.endTime || (saturdayConfig?.isSaturdayWork ? '16:00' : (activeUserShift?.end_time || '18:00')))
      : (activeUserShift?.end_time || '18:00');
    const toleranceMinutes = (activeUserShift?.tolerance_minutes !== undefined && activeUserShift?.tolerance_minutes !== null)
      ? Number(activeUserShift.tolerance_minutes)
      : (isWeekendActive && saturdayConfig?.toleranceMinutes != null ? Number(saturdayConfig.toleranceMinutes) : 15);
    const breakMinutes = isWeekendActive
      ? (activeUserShift?.saturday_break_minutes !== undefined ? Number(activeUserShift.saturday_break_minutes) : Number(saturdayConfig?.breakMinutes ?? 30))
      : (activeUserShift?.break_minutes ?? 60);

    const currentMin = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = shiftStart.split(':').map(Number);
    const shiftTargetMin = (!isNaN(sH) && !isNaN(sM)) ? (sH * 60 + sM) : (9 * 60);
    const diffFromStartMinutes = currentMin - shiftTargetMin;
    const isOneHourEarly = diffFromStartMinutes < -60;
    const isOneHourLate = diffFromStartMinutes > 60;
    const isLate = currentMin > shiftTargetMin + toleranceMinutes;
    const statusValue = isLate ? 'gec-kaldi' : 'zamaninda';
    const officeName = activeOffice?.name || 'Ofis';

    // Prominent SweetAlert2 Confirmation Dialog
    const confirmed = await confirmShiftStart({
      officeName,
      isWithinGeofence: isWithinGeofence,
      shiftName: activeUserShift?.name || 'Standart Vardiya',
      shiftStart,
      shiftEnd,
      toleranceMinutes,
      breakMinutes,
      shiftColor: activeUserShift?.color || '#3b82f6',
      isLate,
      isOneHourEarly,
      isOneHourLate,
      currentTimeStr: timeStr,
      currentDateStr: now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
    });

    if (!confirmed) return;

    try {
      // Sync with Supabase if company is available
      const targetCompanyId = resolvedCompanyId || currentEmployee?.company_id || effectiveCompanyId;
      if (targetCompanyId) {
        const gpsStatus = isWithinGeofence
          ? `Tarayıcı GPS Doğrulandı: ${officeName}`
          : (distanceToSelectedOffice !== null
              ? `Konum Dışı/Personel Teyitli (${distanceToSelectedOffice}m): ${officeName}`
              : `Konum Alınamadı/Personel Teyitli: ${officeName}`);
        const noteText = `[OFİS:${officeName}] [VARDIYA:${activeUserShift?.name || 'Vardiya'}] [VARDIYA_ID:${activeUserShift?.id || ''}] ${gpsStatus} • Vardiya: ${activeUserShift?.name || 'Vardiya'} (${shiftStart}-${shiftEnd})`;
        const payload: VardiyaInsert = {
          company_id: targetCompanyId,
          employee_id: empId,
          tarih: dateStr,
          vardiya_tipi: 'tam-gun',
          giris_saati: timeStr,
          cikis_saati: null,
          durum: statusValue,
          notlar: noteText
        };
        
        try {
          const res = await pdksService.createVardiya(payload);
          if (res && res.id) {
            setActiveShiftRecordId(res.id);
            localStorage.setItem('pdks_active_shift_id', res.id);
          }
        } catch (dbError) {
          console.error("Database check-in failed, storing locally:", dbError);
        }
      }

      try {
        localStorage.setItem(`humanius_daily_shift_${empId}_${dateStr}`, JSON.stringify({
          officeId: activeOffice?.id,
          officeName,
          shiftId: activeUserShift?.id,
          shiftName: activeUserShift?.name || 'Vardiya',
          startTime: shiftStart,
          endTime: shiftEnd,
        }));
        if (activeOffice?.id) {
          localStorage.setItem(`humanius_emp_selected_office_${empId}`, activeOffice.id);
        }
        if (activeUserShift?.id) {
          localStorage.setItem(`humanius_emp_selected_shift_${empId}`, activeUserShift.id);
        }
      } catch {}

      setIsShiftActive(true);
      setShiftStartTime(startIso);
      localStorage.setItem('pdks_active_shift_start', startIso);
      
      // Start watching user location actively during the shift
      startWatchingLocation();

      showSuccess(
        'Mesainiz Başlatıldı! 🚀',
        `<strong>${officeName}</strong> lokasyonunda mesainiz kaydedildi. İyi çalışmalar dileriz!`
      );
      
    } catch (err) {
      console.error("Mesai başlatma hatası:", err);
      showError("Mesai Başlatılamadı", "Mesai başlatılırken bir hata oluştu.");
    }
  };

  // End Shift Handler
  const handleEndShift = async (wasAutoEnded = false) => {
    if (!isShiftActive || !shiftStartTime) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
    const officeName = activeOffice?.name || 'Ofis';

    if (!wasAutoEnded) {
      const dayOfWeek = now.getDay();
      const isTodayWeekend = dayOfWeek === 6 || dayOfWeek === 0;
      const isWeekendActive = isTodayWeekend && saturdayConfig?.isSaturdayWork;

      const shiftStart = isWeekendActive
        ? (activeUserShift?.saturday_start_time || saturdayConfig?.startTime || activeUserShift?.start_time || '08:30')
        : (activeUserShift?.start_time || '08:30');
      const shiftEnd = isWeekendActive
        ? (activeUserShift?.saturday_end_time || saturdayConfig?.endTime || (saturdayConfig?.isSaturdayWork ? '16:00' : (activeUserShift?.end_time || '18:00')))
        : (activeUserShift?.end_time || '18:00');
      
      const currentHM = timeStr;
      let isEarlyExit = currentHM < shiftEnd;
      if (shiftEnd < shiftStart) {
        // Gece vardiyası (ör. 23:00 - 07:00)
        if (currentHM >= shiftStart) {
          isEarlyExit = true;
        } else if (currentHM < shiftEnd) {
          isEarlyExit = true;
        } else {
          isEarlyExit = false;
        }
      }
      
      let formattedDuration = timerText || '00:00:00';
      if (shiftStartTime) {
        const startD = new Date(shiftStartTime);
        const diffMs = now.getTime() - startD.getTime();
        if (diffMs > 0) {
          const totalSecs = Math.floor(diffMs / 1000);
          const h = Math.floor(totalSecs / 3600);
          const m = Math.floor((totalSecs % 3600) / 60);
          const s = totalSecs % 60;
          formattedDuration = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
      }

      const confirmed = await confirmShiftEnd({
        officeName,
        shiftName: activeUserShift?.name || 'Standart Vardiya',
        shiftHours: `${shiftStart} - ${shiftEnd}`,
        startTimeStr: shiftStartTime ? new Date(shiftStartTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-',
        currentTimeStr: timeStr,
        durationText: formattedDuration,
        isEarlyExit,
        targetEndTime: shiftEnd
      });

      if (!confirmed) return;
    }

    try {
      // 1. Update Database if activeShiftRecordId is valid (or find most recent unclosed shift)
      let targetShiftId = activeShiftRecordId || localStorage.getItem('pdks_active_shift_id');
      if (!targetShiftId && currentEmployee?.id) {
        const allV = await pdksService.getVardiyalar();
        const openV = (allV || [])
          .filter(v => v.employee_id === currentEmployee.id && v.giris_saati && (!v.cikis_saati || v.cikis_saati === '00:00:00' || v.cikis_saati === '00:00' || v.cikis_saati === '-'))
          .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '') || (b.giris_saati || '').localeCompare(a.giris_saati || ''))[0];
        if (openV) {
          targetShiftId = openV.id;
        }
      }

      if (targetShiftId) {
        try {
          await pdksService.updateVardiya(targetShiftId, {
            cikis_saati: timeStr,
            notlar: wasAutoEnded 
              ? `[OFİS:${officeName}] [VARDIYA:${activeUserShift?.name || 'Vardiya'}] [VARDIYA_ID:${activeUserShift?.id || ''}] Konumdan uzaklaşıldığı için sistem tarafından otomatik sonlandırıldı (${officeName})`
              : `[OFİS:${officeName}] [VARDIYA:${activeUserShift?.name || 'Vardiya'}] [VARDIYA_ID:${activeUserShift?.id || ''}] GPS Çıkış Eşleşti: ${officeName}`
          });
        } catch (dbError) {
          console.error("Database check-out update failed:", dbError);
        }
      }

      // 2. Refresh shift history from database
      if (currentEmployee?.id) {
        try {
          const allVardiyalar = await pdksService.getVardiyalar();
          const myVardiyalar = allVardiyalar.filter(v => v.employee_id === currentEmployee.id);
          const mappedHistory = myVardiyalar.map(v => {
            const dateObj = new Date(v.tarih);
            const girisStr = v.giris_saati || '-';
            const cikisStr = v.cikis_saati || '-';
            
            let totalHoursStr = '0 Saat';
            if (v.giris_saati && v.cikis_saati) {
              const [gH, gM] = v.giris_saati.split(':').map(Number);
              const [cH, cM] = v.cikis_saati.split(':').map(Number);
              const gMinutes = gH * 60 + gM;
              const cMinutes = cH * 60 + cM;
              let diffMin = cMinutes - gMinutes;
              if (diffMin < 0) diffMin += 24 * 60; // Gece vardiyası
              if (diffMin > 0) {
                totalHoursStr = `${parseFloat((diffMin / 60).toFixed(2))} Saat`;
              }
            }

            return {
              id: v.id,
              tarih: dateObj.toLocaleDateString('tr-TR'),
              giris: girisStr,
              cikis: cikisStr,
              sure: totalHoursStr,
              durum: v.durum === 'zamaninda' ? 'Zamanında' : v.durum === 'gec-kaldi' ? 'Geç Kaldı' : 'Otomatik Çıkış',
              notlar: v.notlar || ''
            };
          });
          setLocalHistory(mappedHistory);
        } catch (error) {
          console.error("Failed to refresh shift history from database:", error);
        }
      }

      // 3. Clear active shift storage
      setIsShiftActive(false);
      setShiftStartTime(null);
      setActiveShiftRecordId(null);
      localStorage.removeItem('pdks_active_shift_id');
      localStorage.removeItem('pdks_active_shift_start');
      stopWatchingLocation();

      // Trigger custom events so all components and views update immediately
      window.dispatchEvent(new Event('humanius_shifts_updated'));
      window.dispatchEvent(new Event('humanius_puantaj_updated'));

      if (wasAutoEnded) {
        showWarning("Mesai Otomatik Sonlandırıldı", "Mesainiz konum sınırından uzaklaştığınız için otomatik olarak sonlandırıldı.");
      } else {
        showSuccess("Mesainiz Tamamlandı! ✨", `<strong>${officeName}</strong> konumundaki mesainiz başarıyla sonlandırıldı. İyi günler!`);
      }
      
    } catch (err) {
      console.error("Mesai bitirme hatası:", err);
      showError("Mesai Sonlandırılamadı", "Mesai sonlandırılırken bir hata oluştu.");
    }
  };

  // Synchronize company coordinates to current location
  const setOfficeToCurrentLocation = async () => {
    if (!userCoords) {
      requestLocation();
      alert("Mevcut konumunuz henüz alınamadı. Konum izni isteniyor, lütfen tarayıcınızdan konum izni veriniz.");
      return;
    }

    const lat = userCoords.lat;
    const lng = userCoords.lng;

    // Update local state immediately (works for demo mode & production)
    setCompanyCoords({ lat, lng });

    // Update active office or default office in DB
    const targetCompanyId = resolvedCompanyId || 'demo-company-id-9999';
    try {
      await companyService.saveOfficeLocation({
        id: activeOffice?.id !== 'default' ? activeOffice?.id : undefined,
        company_id: targetCompanyId,
        name: activeOffice?.name || 'Merkez Ofis',
        lat,
        lng,
        radius_meters: activeOffice?.radius_meters || 200,
        address: activeOffice?.address || '',
        is_default: true,
      });
      await loadOfficeLocations();
    } catch (err) {
      console.warn("Error updating office location:", err);
    }

    if (resolvedCompanyId && companyDetails) {
      const parsed = parseCompanyCoords(companyDetails.address);
      const newAddress = formatCompanyAddressWithCoords(lat, lng, parsed.cleanAddress);
      try {
        await companyService.update(resolvedCompanyId, { address: newAddress });
        setCompanyDetails({ ...companyDetails, address: newAddress });
      } catch (err) {
        console.warn("Error updating company address in DB:", err);
      }
    }

    alert(`Seçili ofis lokasyonu (${activeOffice?.name || 'Şirket'}) tarayıcı konumunuza (${lat.toFixed(5)}, ${lng.toFixed(5)}) eşitlendi!`);
  };

  const handleAutoEndShifts = async () => {
    const todayStr = getTodayYYYYMMDD();
    const todayDay = new Date().getDay();
    const isTodayWeekend = todayDay === 6 || todayDay === 0;
    const cleanShifts = allCompanyShifts.filter(isNotSaturdayShift);
    const defaultShift = cleanShifts.find((s) => s.is_default) || cleanShifts[0] || VARSAYILAN_VARDIYALAR[0];

    const uncompletedToday = allShiftRecords.filter(r => 
      r.tarih === todayStr && 
      r.giris_saati && 
      (!r.cikis_saati || r.cikis_saati === '00:00:00' || r.cikis_saati === '00:00')
    );

    if (uncompletedToday.length === 0) {
      showInfo('Mesai Kaydı Bulunamadı', 'Bugün için çıkış saati bekleyen aktif mesai kaydı bulunamadı.');
      return;
    }

    const ok = await showConfirm({
      title: 'Toplu Mesai Sonlandırma',
      text: `Bugün (${todayStr}) giriş yapmış ancak henüz çıkışı yapılmamış ${uncompletedToday.length} personelin mesaisi tanımlı vardiyalarına göre otomatik sonlandırılsın mı?`,
      confirmButtonText: 'Evet, Sonlandır',
      cancelButtonText: 'İptal',
      icon: 'question'
    });
    if (!ok) {
      return;
    }

    try {
      for (const rec of uncompletedToday) {
        const emp = employees.find(e => e.id === rec.employee_id || (e as any).user_id === rec.employee_id);
        const assignedShiftId = emp ? (allShiftAssignments[emp.id] || ((emp as any).user_id && allShiftAssignments[(emp as any).user_id])) : undefined;
        let empShift = assignedShiftId ? cleanShifts.find(s => s.id === assignedShiftId) : null;
        if (!empShift && emp) {
          const empLoc = emp.department || emp.ilce || emp.il || (emp as any).branch || (emp as any).city || (emp as any).office_name || '';
          if (empLoc) {
            empShift = cleanShifts.find(s => 
              s.name.toLowerCase().includes(empLoc.toLowerCase()) || 
              (s.office_name && s.office_name.toLowerCase().includes(empLoc.toLowerCase()))
            );
          }
        }
        if (!empShift) empShift = defaultShift;

        const targetCikis = getTargetCikisTime(empShift, defaultShift?.id, isTodayWeekend, saturdayConfig);
        await pdksService.updateVardiya(rec.id, {
          cikis_saati: targetCikis + ':00',
          notlar: `Otomatik vardiya sonlandırma (${targetCikis}) - Vardiya: ${empShift?.name || 'Standart'}`
        });
      }

      window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
      await loadShiftHistory();
      alert(`İşlem Başarılı: ${uncompletedToday.length} personelin çıkışı kendi vardiya saatlerine göre kaydedildi.`);
    } catch (err: any) {
      console.error(err);
      alert('Mesailer kapatılırken hata oluştu: ' + (err?.message || err));
    }
  };


  // -------------------------------------------------------------
  // TEAM MONITORING (MANAGER VIEW) DATA
  const mockPdksData = React.useMemo(() => {
    const todayStr = getTodayYYYYMMDD();
    const targetDate = selectedDate || todayStr;

    // Seçilen tarihin gününü hesapla (0 = Pazar, 6 = Cumartesi)
    const [tYear, tMonth, tDay] = targetDate.split('-').map(Number);
    const targetDateObj = new Date(tYear, tMonth - 1, tDay);
    const targetDayOfWeek = targetDateObj.getDay();
    const isTargetSunday = targetDayOfWeek === 0;
    const isTargetSaturday = targetDayOfWeek === 6;
    
    return employees.map(emp => {
      const cleanShifts = allCompanyShifts.filter(isNotSaturdayShift);
      const defaultShift = cleanShifts.find((s) => s.is_default) || cleanShifts[0] || VARSAYILAN_VARDIYALAR[0];

      // 1. ÖNCELİK: Canlı Veritabanı PDKS ve Puantaj Kayıtları (allShiftRecords - Single Source of Truth)
      const realRecord = allShiftRecords.find(r => (r.employee_id === emp.id || (emp as any).user_id === r.employee_id) && r.tarih === targetDate);

      // Bu gün için kaydedilmiş günlük vardiya ve ofis tespiti
      let recordShift: CompanyShift | null = null;
      let recordOffice: string = '';

      const localDailyMeta = (() => {
        try {
          const raw = localStorage.getItem(`humanius_daily_shift_${emp.id}_${targetDate}`);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();

      if (realRecord?.notlar) {
        // [VARDIYA_ID:...] veya [VARDIYA:...] etiketi
        const vIdMatch = realRecord.notlar.match(/\[VARDIYA_ID:\s*([^\]]+)\]/i);
        if (vIdMatch && vIdMatch[1]) {
          recordShift = cleanShifts.find(s => s.id === vIdMatch[1].trim()) || null;
        }
        if (!recordShift) {
          const vNameMatch = realRecord.notlar.match(/\[VARDIYA:\s*([^\]]+)\]/i) || realRecord.notlar.match(/•\s*Vardiya:\s*([^(\n•]+)/i);
          if (vNameMatch && vNameMatch[1]) {
            const cleanVName = normalizeTr(vNameMatch[1].trim());
            const hasSuzukiMgInRecord = realRecord.notlar ? (normalizeTr(realRecord.notlar).includes('suzuki') || normalizeTr(realRecord.notlar).includes('mg')) : false;
            // Suzuki / Mg çalışanına Sixt Adana vardiyası sızmasını kesin olarak engelle
            if (!(hasSuzukiMgInRecord && cleanVName.includes('sixt'))) {
              recordShift = cleanShifts.find(s => normalizeTr(s.name) === cleanVName || normalizeTr(s.name).includes(cleanVName) || cleanVName.includes(normalizeTr(s.name))) || null;
            }
          }
        }
        // [OFİS:...] etiketi
        const ofisTagMatch = realRecord.notlar.match(/\[(?:OFİS|OFIS):\s*([^\]]+)\]/i);
        if (ofisTagMatch && ofisTagMatch[1]) {
          recordOffice = ofisTagMatch[1].trim();
        }
      }

      if (!recordShift && localDailyMeta?.shiftId) {
        recordShift = cleanShifts.find(s => s.id === localDailyMeta.shiftId) || null;
      }
      if (!recordOffice && localDailyMeta?.officeName) {
        recordOffice = localDailyMeta.officeName;
      }

      // Resolve employee assigned shift (strictly isolate Saturday vs Weekday)
      const assignedShiftId = allShiftAssignments[emp.id] || ((emp as any).user_id && allShiftAssignments[(emp as any).user_id]);
      let baseShift: CompanyShift | null = recordShift;

      // Eğer mevcut kullanıcı ise ve oturumda aktif bir vardiya seçtiyse
      if (!baseShift && emp.id === currentEmployee?.id && activeUserShift) {
        baseShift = activeUserShift;
      }

      // Local storage'da kayıtlı seçilmiş vardiya
      if (!baseShift) {
        try {
          const savedShiftId = localStorage.getItem(`humanius_emp_selected_shift_${emp.id}`);
          if (savedShiftId) {
            baseShift = cleanShifts.find(s => s.id === savedShiftId) || null;
          }
        } catch {}
      }

      // Atanmış vardiya ID eşleşmesi
      if (!baseShift && assignedShiftId) {
        baseShift = cleanShifts.find((s) => s.id === assignedShiftId) || null;
      }

      // Eşleştirme: ID ile doğrudan atanmamışsa ofis / şube / departman adına göre eşleştir (İl hariç!)
      if (!baseShift) {
        const empLoc = emp.department || (emp as any).branch || (emp as any).office_name || '';
        if (empLoc) {
          baseShift = cleanShifts.find(s => 
            s.name.toLowerCase().includes(empLoc.toLowerCase()) || 
            (s.office_name && s.office_name.toLowerCase().includes(empLoc.toLowerCase()))
          ) || null;
        }
      }
      if (!baseShift) {
        baseShift = defaultShift;
      }

      // Eğer personelin ofisi Suzuki / Mg ise ve baseShift Sixt Adana ise, varsayılan genel vardiyaya geçir
      const effectiveOffName = recordOffice || resolveEmployeeOfficeName(emp, baseShift, realRecord?.notlar);
      const normEffOff = normalizeTr(effectiveOffName);
      if ((normEffOff.includes('suzuki') || normEffOff.includes('mg')) && baseShift && normalizeTr(baseShift.name).includes('sixt')) {
        baseShift = defaultShift;
      }

      // "vardıyada ne yazıyosa ona göre cıkış yapılsın"
      const isTargetWeekend = isTargetSaturday || isTargetSunday;
      const targetCikis = getTargetCikisTime(baseShift, defaultShift?.id, isTargetWeekend, saturdayConfig);
      const isWeekendActive = isTargetWeekend && saturdayConfig?.isSaturdayWork;

      const empShift = isWeekendActive
        ? {
            ...baseShift,
            start_time: baseShift.saturday_start_time || saturdayConfig?.startTime || baseShift.start_time || '08:30',
            end_time: targetCikis,
            break_minutes: baseShift.saturday_break_minutes != null ? Number(baseShift.saturday_break_minutes) : Number(saturdayConfig.breakMinutes ?? 30),
            tolerance_minutes: Number(baseShift.tolerance_minutes ?? 15),
          }
        : {
            ...baseShift,
            start_time: baseShift.start_time || '08:30',
            end_time: (baseShift.end_time && baseShift.end_time !== '00:00') ? baseShift.end_time : targetCikis,
          };

      if (realRecord) {
        const notlar = realRecord.notlar || '';
        const puantajMatch = notlar.match(/\[PUANTAJ:([A-ZÇĞİÖŞÜ]+)\]/i);
        const pKod = puantajMatch ? puantajMatch[1].toUpperCase() : '';
        const isLeaveOrAbsenceCode = Boolean(pKod && pKod !== 'Ç');
        const isExplicitLeaveOrAbsence = isLeaveOrAbsenceCode || ((realRecord.durum === 'izinli' || realRecord.durum === 'gelmedi') && !realRecord.giris_saati && !realRecord.cikis_saati && pKod !== 'Ç');

        if (isExplicitLeaveOrAbsence) {
          let effKod = pKod;
          if (!effKod) {
            if (realRecord.durum === 'gelmedi' || notlar.includes('Devamsız')) effKod = 'D';
            else if (notlar.includes('HT') || notlar.includes('Hafta Tatili')) effKod = 'HT';
            else if (notlar.includes('AT') || notlar.includes('Akdi Tatil')) effKod = 'AT';
            else if (notlar.includes('Yİ') || notlar.includes('YI') || notlar.includes('Yıllık')) effKod = 'Yİ';
            else if (notlar.includes('RP') || notlar.includes('Rapor') || notlar.includes('İstirahat')) effKod = 'RP';
            else effKod = 'İZİN';
          }

          const leaveTitle = effKod === 'HT' ? 'Haftalık Tatil'
            : effKod === 'AT' ? 'Akdi Tatil'
            : effKod === 'D' ? 'Devamsız'
            : effKod === 'Yİ' ? 'Yıllık İzin'
            : effKod === 'RP' ? 'Raporlu'
            : effKod === 'UBGT' ? 'Resmi Tatil'
            : effKod === 'EG' ? 'Eğitim İzni'
            : effKod === 'Üİ' ? 'Ücretsiz İzin'
            : effKod === 'Mİ' ? 'Mazeret İzni'
            : (notlar.replace(/\[PUANTAJ:[^\]]+\]/g, '').trim() || 'İzinli');

          return {
            employee: emp,
            giris: effKod,
            cikis: effKod,
            durum: leaveTitle,
            isLeave: effKod !== 'D',
            mesai: 0,
            officeName: '-',
            shift: empShift,
          };
        }

        if (realRecord.giris_saati || realRecord.cikis_saati || pKod === 'Ç') {
          let checkIn = realRecord.giris_saati ? realRecord.giris_saati.substring(0, 5) : null;
          let checkOut = realRecord.cikis_saati ? realRecord.cikis_saati.substring(0, 5) : null;

          // Eğer bugün için sistem otomatik sonlandırma yaptıysa (16:00 vb.), bunu iptal et ve mesaiyi devam ettir!
          if (targetDate === todayStr && checkOut && realRecord.notlar && (realRecord.notlar.includes('Otomatik vardiya sonlandırma') || realRecord.notlar.includes('otomatik sonlandırıldı'))) {
            checkOut = null;
          }

          // Eğer puantajdan Ç (Fiili Çalışma) seçilmişse ve giriş saati null ise,
          // notlardan veya atanmış vardiyanın başlama saatinden al (örn: 08:30)
          if (!checkIn && pKod === 'Ç') {
            const timeRangeMatch = notlar.match(/\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2}|Devam)\)/i);
            if (timeRangeMatch && timeRangeMatch[1]) {
              checkIn = timeRangeMatch[1];
              if (!checkOut && timeRangeMatch[2] && timeRangeMatch[2].toLowerCase() !== 'devam') {
                checkOut = timeRangeMatch[2];
              }
            } else {
              checkIn = empShift.start_time || '08:30';
            }
          }
          if (!checkOut && pKod === 'Ç') {
            const timeRangeMatch = notlar.match(/\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)/i);
            if (timeRangeMatch && timeRangeMatch[2] && timeRangeMatch[2].toLowerCase() !== 'devam') {
              checkOut = timeRangeMatch[2];
            }
          }

          const officeName = checkIn
            ? (recordOffice || resolveEmployeeOfficeName(emp, empShift, realRecord.notlar))
            : '-';
          const isTimeStr = (s?: string | null) => Boolean(s && /^\d{1,2}:\d{2}/.test(s));

          let status = 'Zamanında';
          let effectiveCheckOut = checkOut;

          if (!checkOut && checkIn) {
            // KULLANICI KESİN TALİMATI: Gün bitse bile vardiya ASLA otomatik kapatılmaz!
            // Gece 23'te başlatılan mesai ya da sabahtan açık unutulan mesai kapatılmaz, personel kendi kapatır.
            effectiveCheckOut = null;
            status = targetDate === todayStr ? 'Mesai Devam Ediyor' : 'Mesai Kapatılmadı (Açık)';
          } else if (checkIn && checkOut) {
            if (isTimeStr(checkIn)) {
              const [hours, minutes] = checkIn.split(':').map(Number);
              const [sH, sM] = (empShift.start_time || '08:30').split(':').map(Number);
              let delayMin = (hours * 60 + minutes) - (sH * 60 + sM);
              if (delayMin < -720) delayMin += 1440;
              const tol = (empShift.tolerance_minutes ?? 15);
              if (delayMin > tol) {
                status = 'Geç Kaldı';
              } else {
                status = 'Zamanında';
              }
            }
          }

          let mesai = 0;
          if (checkIn && effectiveCheckOut && isTimeStr(checkIn) && isTimeStr(effectiveCheckOut)) {
            const [gH, gM] = checkIn.split(':').map(Number);
            const [cH, cM] = effectiveCheckOut.split(':').map(Number);
            if (!isNaN(gH) && !isNaN(gM) && !isNaN(cH) && !isNaN(cM)) {
              let diffMins = (cH * 60 + cM) - (gH * 60 + gM);
              if (diffMins < 0) diffMins += 24 * 60;
              mesai = parseFloat((diffMins / 60).toFixed(1));
              if (mesai < 0) mesai = 0;
            }
          } else if (checkIn && isTimeStr(checkIn)) {
            // Mesai çıkışı henüz yapılmamış (bugün veya dünden devreden mesai)
            const [gH, gM] = checkIn.split(':').map(Number);
            if (!isNaN(gH) && !isNaN(gM)) {
              const now = new Date();
              const checkInDate = new Date(`${targetDate}T${checkIn.substring(0, 5)}:00`);
              if (!isNaN(checkInDate.getTime())) {
                const diffMs = now.getTime() - checkInDate.getTime();
                const elapsedMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
                if (elapsedMins > 0 && elapsedMins <= 16 * 60) {
                  // Son 16 saatte başlatılmış aktif vardiya (ör. gece vardiyası veya bugünkü mesai)
                  mesai = parseFloat((elapsedMins / 60).toFixed(1));
                } else {
                  // 16 saatten eski açık unutulmuş mesai: 22 saat gösterme, normal vardiya süresi baz alınır
                  const [sH, sM] = (empShift.start_time || '08:30').split(':').map(Number);
                  const [eH, eM] = (empShift.end_time || '18:00').split(':').map(Number);
                  let shiftDiff = (eH * 60 + eM) - (sH * 60 + sM);
                  if (shiftDiff < 0) shiftDiff += 1440;
                  const breakM = empShift.break_minutes || 60;
                  mesai = parseFloat((Math.max(0, shiftDiff - breakM) / 60).toFixed(1));
                }
              }
            }
          }

          return {
            employee: emp,
            giris: checkIn || '-',
            cikis: effectiveCheckOut || '-',
            durum: status,
            isLeave: false,
            mesai,
            officeName,
            shift: empShift,
          };
        }
      }

      // 2. ÖNCELİK: Onaylanmış İzin Talebi Kontrolü (izinTalepleri)
      const activeLeave = (izinTalepleri || []).find((t: any) => {
        const tEmpId = t.employeeId || t.employee_id;
        if (!tEmpId || tEmpId !== emp.id) return false;
        const tDurum = String(t.durum || '').toLowerCase();
        if (tDurum !== 'onaylandi' && tDurum !== 'onaylandı') return false;
        const startStr = (t.baslangicTarihi || t.baslangic_tarihi || '').split('T')[0];
        const endStr = (t.bitisTarihi || t.bitis_tarihi || '').split('T')[0];
        return Boolean(startStr && endStr && targetDate >= startStr && targetDate <= endStr);
      });

      if (activeLeave) {
        const leaveTitle = getDevamKontroluIzinLabel(activeLeave.izinTuru || activeLeave.izin_turu, resolvedCompanyId);
        const leaveCode = getDevamKontroluIzinKisaltma(activeLeave.izinTuru || activeLeave.izin_turu, resolvedCompanyId);
        return {
          employee: emp,
          giris: leaveCode,
          cikis: leaveCode,
          durum: leaveTitle,
          isLeave: true,
          mesai: 0,
          officeName: '-',
          shift: empShift,
        };
      }



      // 4. ÖNCELİK: Kayıt Bulunmayan Durumlarda Günün Niteliği (Pazar / Cumartesi Hafta Tatili)
      // Pazar günleri yasal hafta tatilidir (Madde 46)
      if (isTargetSunday) {
        return {
          employee: emp,
          giris: 'HT',
          cikis: 'HT',
          durum: 'Haftalık Tatil',
          isLeave: true,
          mesai: 0,
          officeName: '-',
          shift: empShift,
        };
      }

      // Cumartesi günleri (Cumartesi çalışma düzeni aktif değilse)
      if (isTargetSaturday) {
        const hasSatWork = Boolean(saturdayConfig?.isSaturdayWork);
        if (!hasSatWork) {
          return {
            employee: emp,
            giris: 'HT',
            cikis: 'HT',
            durum: 'Haftalık Tatil',
            isLeave: true,
            mesai: 0,
            officeName: '-',
            shift: empShift,
          };
        }
      }

      // 5. Normal hafta içi gün olup fiili giriş yapılmamışsa
      return {
        employee: emp,
        giris: '-',
        cikis: '-',
        durum: 'Giriş Yapılmadı',
        isLeave: false,
        mesai: 0,
        officeName: '-',
        shift: empShift,
      };
    });
  }, [employees, allShiftRecords, izinTalepleri, officeLocations, allCompanyOfficesMap, resolveEmployeeOfficeName, allCompanyShifts, allShiftAssignments, adminOverrides, puantajOverrides, saturdayConfig, selectedDate]);

  // Durum Özet İstatistikleri (Seçili Gün ve Filtrelere Göre)
  const teamStats = useMemo(() => {
    const scopedList = mockPdksData.filter((d) => {
      if (!isSuperAdmin) {
        if (resolvedCompanyId) {
          const empCompId = (d.employee.company_id || '').trim();
          if (empCompId && empCompId !== resolvedCompanyId) return false;
        }
      } else if (selectedCompany && selectedCompany !== 'all') {
        const target = selectedCompany.toLowerCase().trim();
        const empCompName = (d.employee.company || '').toLowerCase().trim();
        const empCompId = (d.employee.company_id || '').toLowerCase().trim();
        const isMatch = empCompName === target || empCompId === target || empCompId === resolvedCompanyId;
        if (!isMatch) return false;
      }
      return selectedDepartment === 'all' || d.employee.department === selectedDepartment;
    });

    const total = scopedList.length;
    const calisan = scopedList.filter(d => d.durum === 'Zamanında' || d.durum === 'Geç Kaldı').length;
    const mesaiDevam = scopedList.filter(d => d.durum === 'Mesai Devam Ediyor').length;
    const haftalikTatil = scopedList.filter(d => d.durum === 'Haftalık Tatil' || d.durum === 'Hafta Tatili' || d.durum === 'Akdi Tatil').length;
    const izinli = scopedList.filter(d => d.isLeave && !(d.durum === 'Haftalık Tatil' || d.durum === 'Hafta Tatili' || d.durum === 'Akdi Tatil')).length;
    const girisYok = scopedList.filter(d => d.durum === 'Giriş Yapılmadı' || d.durum === 'Devamsız').length;

    return { total, calisan, mesaiDevam, haftalikTatil, izinli, girisYok };
  }, [mockPdksData, isSuperAdmin, resolvedCompanyId, selectedCompany, selectedDepartment]);

  // Tarih İşlem Fonksiyonları
  const handlePrevDay = () => {
    const [y, m, d] = (selectedDate || getTodayYYYYMMDD()).split('-').map(Number);
    const dt = new Date(y, m - 1, d - 1);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    const [y, m, d] = (selectedDate || getTodayYYYYMMDD()).split('-').map(Number);
    const dt = new Date(y, m - 1, d + 1);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayYYYYMMDD());
  };

  const formattedSelectedDateText = useMemo(() => {
    try {
      const [y, m, d] = (selectedDate || getTodayYYYYMMDD()).split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const filteredData = mockPdksData
    .filter((d) => {
      // Hızlı Durum Filtresi
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'calisan' && !(d.durum === 'Zamanında' || d.durum === 'Geç Kaldı')) {
          return false;
        }
        if (selectedStatusFilter === 'mesai-devam' && d.durum !== 'Mesai Devam Ediyor') {
          return false;
        }
        if (selectedStatusFilter === 'haftalik-tatil' && !(d.durum === 'Haftalık Tatil' || d.durum === 'Hafta Tatili' || d.durum === 'Akdi Tatil')) {
          return false;
        }
        if (selectedStatusFilter === 'izinli' && (!d.isLeave || (d.durum === 'Haftalık Tatil' || d.durum === 'Hafta Tatili' || d.durum === 'Akdi Tatil'))) {
          return false;
        }
        if (selectedStatusFilter === 'giris-yapilmadi' && !(d.durum === 'Giriş Yapılmadı' || d.durum === 'Devamsız')) {
          return false;
        }
      }

      // Multi-tenant company isolation
      if (!isSuperAdmin) {
        if (resolvedCompanyId) {
          const empCompId = (d.employee.company_id || '').trim();
          if (empCompId && empCompId !== resolvedCompanyId) {
            return false;
          }
        }
      } else if (selectedCompany && selectedCompany !== 'all') {
        const target = selectedCompany.toLowerCase().trim();
        const empCompName = (d.employee.company || '').toLowerCase().trim();
        const empCompId = (d.employee.company_id || '').toLowerCase().trim();
        const isMatch = empCompName === target || empCompId === target || empCompId === resolvedCompanyId;
        if (!isMatch) return false;
      }

      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        d.employee.name.toLowerCase().includes(term) ||
        (d.employee.tcNo && d.employee.tcNo.includes(term)) ||
        (d.employee.position && d.employee.position.toLowerCase().includes(term)) ||
        (d.employee.department && d.employee.department.toLowerCase().includes(term)) ||
        (d.durum && d.durum.toLowerCase().includes(term));
      const matchesDept = selectedDepartment === 'all' || d.employee.department === selectedDepartment;
      return matchesSearch && matchesDept;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.employee.name || '').localeCompare(b.employee.name || '', 'tr');
          break;
        case 'department':
          cmp = (a.employee.department || 'Genel').localeCompare(b.employee.department || 'Genel', 'tr');
          break;
        case 'shift': {
          const sA = `${a.shift?.name || ''} ${a.shift?.start_time || ''}`;
          const sB = `${b.shift?.name || ''} ${b.shift?.start_time || ''}`;
          cmp = sA.localeCompare(sB, 'tr');
          break;
        }
        case 'giris': {
          const gA = a.giris === '-' ? '' : (a.giris || '');
          const gB = b.giris === '-' ? '' : (b.giris || '');
          cmp = gA.localeCompare(gB);
          break;
        }
        case 'cikis': {
          const cA = a.cikis === '-' ? '' : (a.cikis || '');
          const cB = b.cikis === '-' ? '' : (b.cikis || '');
          cmp = cA.localeCompare(cB);
          break;
        }
        case 'office': {
          const oA = a.officeName === '-' ? '' : (a.officeName || '');
          const oB = b.officeName === '-' ? '' : (b.officeName || '');
          cmp = oA.localeCompare(oB, 'tr');
          break;
        }
        case 'mesai':
          cmp = (a.mesai || 0) - (b.mesai || 0);
          break;
        case 'durum':
          cmp = (a.durum || '').localeCompare(b.durum || '', 'tr');
          break;
        default:
          cmp = (a.employee.name || '').localeCompare(b.employee.name || '', 'tr');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const handlePrintPdf = () => {
    const records: PdksReportRecord[] = filteredData.map((d) => ({
      employeeName: d.employee.name,
      tcNo: d.employee.tcNo,
      department: d.employee.department || 'Genel',
      position: d.employee.position || '-',
      shiftName: d.shift?.name || 'Standart Vardiya',
      shiftHours: d.shift ? `${d.shift.start_time} - ${d.shift.end_time}` : '08:30 - 18:00',
      checkIn: d.giris,
      checkOut: d.cikis,
      officeName: d.officeName || 'Merkez Ofis',
      durum: d.durum,
      mesaiSaat: d.mesai || 0,
    }));

    const companyName = companyDetails?.name || (profile as any)?.company_name || 'Humanius HRMS';
    printPdksDevamRaporuPdf({
      companyName,
      reportTitle: `GÜNLÜK PERSONEL PDKS DEVAM VE VARDİYA ÇİZELGESİ (${formattedSelectedDateText})`,
      dateStr: formattedSelectedDateText,
      records,
    });
  };

  const handleExportCsv = () => {
    const records: PdksReportRecord[] = filteredData.map((d) => ({
      employeeName: d.employee.name,
      tcNo: d.employee.tcNo,
      department: d.employee.department || 'Genel',
      position: d.employee.position || '-',
      shiftName: d.shift?.name || 'Standart Vardiya',
      shiftHours: d.shift ? `${d.shift.start_time} - ${d.shift.end_time}` : '08:30 - 18:00',
      checkIn: d.giris,
      checkOut: d.cikis,
      officeName: d.officeName || 'Merkez Ofis',
      durum: d.durum,
      mesaiSaat: d.mesai || 0,
    }));

    const companyName = companyDetails?.name || (profile as any)?.company_name || 'Humanius';
    exportPdksToCsv(companyName, selectedDate || new Date().toLocaleDateString('tr-TR'), records);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Devam Kontrolü ve Konum Doğrulama (PDKS)</h2>
          <p className="text-sm text-gray-500 mt-1">
            GPS konum doğrulama destekli personel giriş, çıkış ve çalışma süresi takibi.
          </p>
        </div>

        {isManagement && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadShiftHistory}
              className="flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Tüm personellerin canlı mesai ve vardiya durumunu yenile"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Verileri Yenile
            </button>

            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Tüm Personellerin Günlük PDKS Devam ve Vardiya Çizelgesini PDF Olarak Çıktı Al"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              PDKS Raporu Al (PDF)
            </button>

            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('personal')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'personal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Kişisel Mesai Paneli
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Tüm Çalışanların Durumu
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'personal' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-gray-800 text-sm">Giriş / Çıkış Terminali</h3>
                </div>
                {isShiftActive && (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Mesai Devam Ediyor
                  </span>
                )}
              </div>

              <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                {/* Clock / Timer display */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
                    {isShiftActive ? "ÇALIŞMA SÜRESİ" : "SİSTEM SAATİ"}
                  </p>
                  <p className="text-5xl font-black text-gray-800 font-mono tracking-tight">
                    {isShiftActive ? timerText : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                  {isShiftActive && (
                    <p className="text-[11px] text-gray-500 font-medium mt-1">
                      Başlangıç Saati: <strong className="text-gray-700 font-mono">{(() => {
                        const openRec = (allShiftRecords || []).find(
                          (r) => r.id === activeShiftRecordId || (r.employee_id === currentEmployee?.id && r.giris_saati && (!r.cikis_saati || r.cikis_saati === '00:00:00' || r.cikis_saati === '00:00' || r.cikis_saati === '-'))
                        );
                        if (openRec?.giris_saati) {
                          const timePart = openRec.giris_saati.substring(0, 5);
                          const isYesterday = openRec.tarih !== getTodayYYYYMMDD();
                          return isYesterday ? `${timePart} (${new Date(openRec.tarih).toLocaleDateString('tr-TR')})` : timePart;
                        }
                        if (shiftStartTime) {
                          if (/^\d{1,2}:\d{2}/.test(shiftStartTime)) return shiftStartTime.substring(0, 5);
                          try {
                            const d = new Date(shiftStartTime);
                            if (!isNaN(d.getTime())) {
                              return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                            }
                          } catch {}
                        }
                        return activeUserShift?.start_time || '08:30';
                      })()}</strong>
                    </p>
                  )}
                </div>

                {/* Today's Completed Shift Summary (if shift is completed) */}
                {(() => {
                  const todayStr = getTodayYYYYMMDD();
                  const isTimeStr = (s?: string) => Boolean(s && /^\d{1,2}:\d{2}/.test(s));
                  const latestCompletedRec = (allShiftRecords || [])
                    .filter((r) => r.employee_id === currentEmployee?.id && r.giris_saati && r.cikis_saati && isTimeStr(r.giris_saati) && isTimeStr(r.cikis_saati))
                    .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '') || (b.cikis_saati || '').localeCompare(a.cikis_saati || ''))[0];

                  if (!isShiftActive && latestCompletedRec && (latestCompletedRec.tarih === todayStr || Math.abs(new Date().getTime() - new Date(`${latestCompletedRec.tarih}T${latestCompletedRec.cikis_saati.substring(0, 5)}:00`).getTime()) < 24 * 3600 * 1000)) {
                    const [gH, gM] = latestCompletedRec.giris_saati.split(':').map(Number);
                    const [cH, cM] = latestCompletedRec.cikis_saati.split(':').map(Number);
                    let diffMin = (cH * 60 + cM) - (gH * 60 + gM);
                    if (diffMin < 0) diffMin += 24 * 60;
                    const durationStr = diffMin > 0 ? `${parseFloat((diffMin / 60).toFixed(1))} saat` : '-';
                    return (
                      <div className="w-full max-w-sm bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 text-left shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-950">
                              {latestCompletedRec.tarih === todayStr ? 'Bugünkü Mesainiz Tamamlandı' : 'Vardiyanız Tamamlandı'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Çıkış Yapıldı
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-700 bg-white/90 p-2.5 rounded-xl border border-emerald-100 text-center">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-medium">Giriş</span>
                            <span className="font-mono font-bold text-gray-800">{latestCompletedRec.giris_saati.substring(0, 5)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 block font-medium">Çıkış</span>
                            <span className="font-mono font-bold text-emerald-700">{latestCompletedRec.cikis_saati.substring(0, 5)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-medium">Süre</span>
                            <span className="font-bold text-gray-800">{durationStr}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Personalized Active Shift Card & Selector */}
                <div className="w-full max-w-sm bg-gradient-to-r from-indigo-50/90 to-blue-50/90 border border-indigo-200/80 rounded-2xl p-4 text-left shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <label className="text-xs font-bold text-indigo-950">
                        {isShiftActive ? 'Aktif Vardiyanız' : 'Çalışacağınız Vardiya:'}
                      </label>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-indigo-700 border border-indigo-100 shadow-2xs">
                      {isShiftActive ? '🔴 Mesai Sürüyor' : 'Vardiya Seçin'}
                    </span>
                  </div>

                  {!isShiftActive ? (
                    <div className="space-y-2">
                      <select
                        value={effectiveSelectedShiftId}
                        onChange={(e) => {
                          const selected = visibleShiftsForEmployee.find((s) => s.id === e.target.value);
                          if (selected) {
                            setActiveUserShift(selected);
                            if (currentEmployee?.id) {
                              try {
                                shiftService.assignShift(resolvedCompanyId || 'default', currentEmployee.id, selected.id);
                                localStorage.setItem(`humanius_emp_selected_shift_${currentEmployee.id}`, selected.id);
                              } catch {}
                            }
                          }
                        }}
                        className="w-full bg-white border border-indigo-200 hover:border-indigo-400 focus:border-indigo-600 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 outline-none transition-all shadow-xs cursor-pointer"
                      >
                        {visibleShiftsForEmployee.map((s) => {
                          const off = inferOfficeForShift(s, officeLocations);
                          const offName = s.office_name || off?.office_name;
                          const isAssigned = employeeAssignedShift?.id === s.id;
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name} {offName ? `[📍 ${offName}]` : ''} {isAssigned ? '★ (Atandığınız Vardiya) ' : ''}({s.start_time} - {s.end_time}) • Mola: {s.break_minutes}dk
                            </option>
                          );
                        })}
                        {visibleShiftsForEmployee.length === 0 && (
                          <option value="" disabled>
                            ⚠️ Bu ofise kayıtlı vardiya bulunamadı
                          </option>
                        )}
                      </select>
                      <div className="flex items-center justify-between text-[11px] text-indigo-900/80 px-1 font-medium">
                        <span>Mola: <strong>{(new Date().getDay() === 6 || new Date().getDay() === 0) && saturdayConfig?.isSaturdayWork ? (activeUserShift?.saturday_break_minutes ?? saturdayConfig?.breakMinutes ?? 30) : (activeUserShift?.break_minutes ?? 60)} dk</strong></span>
                        <span>•</span>
                        <span>Tolerans: <strong>{(new Date().getDay() === 6 || new Date().getDay() === 0) && saturdayConfig?.toleranceMinutes != null ? Number(saturdayConfig.toleranceMinutes) : (activeUserShift?.tolerance_minutes ?? 15)} dk</strong></span>
                        <span>•</span>
                        <span className="font-mono font-bold text-indigo-700">
                          {(new Date().getDay() === 6 || new Date().getDay() === 0) && saturdayConfig?.isSaturdayWork
                            ? `${activeUserShift?.saturday_start_time || saturdayConfig?.startTime || activeUserShift?.start_time || '08:30'} - ${activeUserShift?.saturday_end_time || saturdayConfig?.endTime || '16:00'}`
                            : `${activeUserShift?.start_time || '08:30'} - ${activeUserShift?.end_time || '18:00'}`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: activeUserShift?.color || '#3b82f6' }}
                        />
                        <div>
                          <p className="text-xs font-bold text-indigo-950">
                            {activeUserShift?.name || 'Vardiya'}{' '}
                            {(() => {
                              const off = inferOfficeForShift(activeUserShift, officeLocations);
                              const offName = activeUserShift?.office_name || off?.office_name;
                              return offName ? `[📍 ${offName}]` : '';
                            })()}
                          </p>
                          <p className="text-[11px] font-mono text-indigo-700 font-medium">
                            {(new Date().getDay() === 6 || new Date().getDay() === 0) && saturdayConfig?.isSaturdayWork
                              ? `${activeUserShift?.saturday_start_time || saturdayConfig?.startTime || activeUserShift?.start_time || '08:30'} - ${activeUserShift?.saturday_end_time || saturdayConfig?.endTime || '16:00'} (${new Date().getDay() === 6 ? 'Cumartesi' : 'Pazar'})`
                              : `${activeUserShift?.start_time || '08:30'} - ${activeUserShift?.end_time || '18:00'}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-[10px] text-indigo-800 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {(new Date().getDay() === 6 || new Date().getDay() === 0) && saturdayConfig?.isSaturdayWork
                          ? (activeUserShift?.saturday_break_minutes ?? saturdayConfig?.breakMinutes ?? 30)
                          : (activeUserShift?.break_minutes ?? 60)} dk mola
                      </div>
                    </div>
                  )}
                </div>

                {/* Bulunduğunuz Ofis / Şube Seçim Alanı */}
                <div className="w-full max-w-sm bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-left space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pdks-office-select" className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Bulunduğunuz Ofis / Şube:
                    </label>
                    <div className="flex items-center gap-1">
                      {activeOffice?.is_default && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
                          🏢 Merkez
                        </span>
                      )}
                      {isHrOrAdmin && (
                        <button
                          type="button"
                          onClick={handleOpenNewOffice}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-xs cursor-pointer hover:bg-indigo-50 transition-colors"
                          title="Yeni Ofis / Şube Konumu Ekle"
                        >
                          <Plus className="w-3 h-3" /> Yeni Ofis
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ofis Seçim Açılır Menüsü (Dropdown) */}
                  <div className="relative">
                    <select
                      id="pdks-office-select"
                      value={effectiveSelectedOfficeId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedOfficeId(newId);
                        if (currentEmployee?.id) {
                          try {
                            localStorage.setItem(`humanius_emp_selected_office_${currentEmployee.id}`, newId);
                          } catch {}
                        }
                        // Seçilen ofise kayıtlı vardiyaları anında senkronize et
                        const newOfficeShifts = getShiftsForSpecificOffice(newId, allCompanyShifts, officeLocations);
                        if (newOfficeShifts.length > 0) {
                          const alreadyValid = newOfficeShifts.some((s) => s.id === activeUserShift?.id);
                          if (!alreadyValid) {
                            const matchingAssigned = employeeAssignedShift && newOfficeShifts.find((s) => s.id === employeeAssignedShift.id);
                            const nextShift = matchingAssigned || newOfficeShifts.find((s) => s.is_default) || newOfficeShifts[0];
                            if (nextShift) {
                              setActiveUserShift(nextShift);
                              if (currentEmployee?.id) {
                                try {
                                  localStorage.setItem(`humanius_emp_selected_shift_${currentEmployee.id}`, nextShift.id);
                                } catch {}
                              }
                            }
                          }
                        }
                      }}
                      className="w-full bg-white border border-indigo-200/90 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-xs cursor-pointer appearance-none pr-8 transition-all"
                    >
                      {visibleOfficeLocations.map((loc) => {
                        const dist = userCoords ? Math.round(getDistance(userCoords.lat, userCoords.lng, loc.lat, loc.lng)) : null;
                        const distStr = dist !== null ? (dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`) : '';
                        const inRange = dist !== null && dist <= loc.radius_meters;
                        const locInfo = loc.il ? `[${loc.il}${loc.ilce ? ` / ${loc.ilce}` : ''}] ` : '';
                        const isAssigned = employeeAssignedOffice?.id === loc.id;
                        return (
                          <option key={loc.id} value={loc.id}>
                            🏢 {loc.name} {locInfo}{isAssigned ? '★ (Mevcut Ofisiniz) ' : ''}{distStr ? `(${distStr} • ${inRange ? '✅ Ofis İçi' : '❌ Alan Dışı'})` : ''}
                          </option>
                        );
                      })}
                      {visibleOfficeLocations.length === 0 && (
                        <option value="default">
                          🏢 {companyDetails?.name || 'Şirket'} Merkez Ofisi
                        </option>
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-indigo-500">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Salt Okunur Ofis Bilgisi Görünümü */}
                  <div className="w-full bg-white border border-indigo-200/80 rounded-xl px-3.5 py-2.5 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 leading-tight truncate">
                          {activeOffice?.name || companyDetails?.name || 'Merkez Ofis'}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5 truncate">
                          {activeOffice?.il ? `📍 ${activeOffice.il}${activeOffice.ilce ? ` / ${activeOffice.ilce}` : ''}` : 'Ana Şirket Yerleşkesi'}
                          {activeOffice?.address ? ` • ${activeOffice.address.substring(0, 30)}` : ''}
                        </p>
                      </div>
                    </div>

                    {distanceToSelectedOffice !== null && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0 ${
                        isWithinGeofence
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isWithinGeofence ? '✅ Ofis İçi' : `${distanceToSelectedOffice}m`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className={`p-4 rounded-2xl border w-full max-w-sm transition-all flex items-start gap-3 ${
                  isWithinGeofence
                    ? 'bg-green-50/90 border-green-200 text-green-900 shadow-sm'
                    : 'bg-amber-50/90 border-amber-200 text-amber-950 shadow-sm'
                }`}>
                  {isWithinGeofence ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide truncate">
                        {isWithinGeofence 
                          ? `${activeOffice.name.toUpperCase()} LOKASYONUNDASINIZ` 
                          : (locationStatus === 'pending' ? 'KONUM ARANIYOR...' : 'OFİS ALANI DIŞI / TEYİTLİ')}
                      </p>
                      <button
                        type="button"
                        onClick={requestLocation}
                        disabled={locationStatus === 'pending'}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white/80 hover:bg-white px-2 py-0.5 rounded-md border border-indigo-200 shrink-0 flex items-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        title="GPS Konumunu Yenile"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${locationStatus === 'pending' ? 'animate-spin text-indigo-500' : ''}`} />
                        <span>{locationStatus === 'pending' ? 'Taranıyor' : 'Yenile'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                      {isWithinGeofence 
                        ? `GPS Doğrulaması Başarılı • ${activeOffice.name}${activeOffice.il ? ` (${activeOffice.il}${activeOffice.ilce ? ` / ${activeOffice.ilce}` : ''})` : ''} (Mesafe: ${distanceToSelectedOffice}m • Sınır: ${activeOffice.radius_meters}m)`
                        : distanceToSelectedOffice !== null 
                          ? `"${activeOffice.name}${activeOffice.il ? ` (${activeOffice.il}${activeOffice.ilce ? ` / ${activeOffice.ilce}` : ''})` : ''}" konumuna mesafeniz ${distanceToSelectedOffice >= 1000 ? `${(distanceToSelectedOffice / 1000).toFixed(1)} km` : `${distanceToSelectedOffice}m`} (Sınır: ${activeOffice.radius_meters}m). Aşağıdaki butona dokunarak teyitli mesai başlatabilirsiniz.`
                          : locationStatus === 'pending'
                            ? "Telefonunuzun GPS ve hücresel konumu taranıyor... Dilerseniz beklemeden hemen teyitli mesai başlatabilirsiniz."
                            : "Konum alınamadı. 'Yenile'ye dokunabilir veya doğrudan aşağıdaki butonla teyitli mesai başlatabilirsiniz."
                      }
                    </p>
                  </div>
                </div>

                {/* Primary Button */}
                <div className="w-full max-w-xs">
                  {isShiftActive ? (
                    <button
                      onClick={() => handleEndShift(false)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-red-100 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    >
                      <Square className="w-5 h-5 fill-white" />
                      Mesaiyi Bitir (Çıkış)
                    </button>
                  ) : (
                    <div className="flex flex-col items-center w-full">
                      <button
                        onClick={handleStartShift}
                        className={`w-full font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-lg ${
                          isWithinGeofence
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                            : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-amber-200'
                        }`}
                      >
                        <Play className="w-5 h-5 fill-current" />
                        {isWithinGeofence ? 'Mesaiyi Başlat (Ofis İçi Giriş)' : 'Mesaiyi Başlat (Ofis Dışı / Teyitli)'}
                      </button>
                      {!isWithinGeofence && (
                        <p className="text-[11px] text-amber-700 mt-2 font-medium text-center">
                          ℹ️ Konum teyitli olarak kaydedilecek ve puantajınıza yansıtılacaktır.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="font-bold text-gray-800 text-sm">Son Giriş / Çıkış Hareketlerim</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-gray-500 font-semibold uppercase">Tarih</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-semibold uppercase">Giriş Saati</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-semibold uppercase">Çıkış Saati</th>
                      <th className="px-4 py-3 text-center text-gray-500 font-semibold uppercase">Toplam Süre</th>
                      <th className="px-4 py-3 text-right text-gray-500 font-semibold uppercase">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {localHistory.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3.5 font-medium text-gray-800">{item.tarih}</td>
                        <td className="px-4 py-3.5 text-center text-gray-700 font-medium">{item.giris}</td>
                        <td className="px-4 py-3.5 text-center text-gray-700 font-medium">{item.cikis || '-'}</td>
                        <td className="px-4 py-3.5 text-center text-gray-600">{item.sure}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.durum.includes('Zamanında') || item.durum === 'Normal'
                              ? 'bg-green-50 text-green-700' 
                              : item.durum === 'Otomatik Çıkış'
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-red-50 text-red-700'
                          }`}>
                            {item.durum}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {localHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Henüz hiçbir mesai kaydınız bulunmamaktadır.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Location details and simulation side panel */}
          <div className="space-y-6">
            {/* GPS Map Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-gray-800 text-sm">Mevcut Konumunuz</h3>
                </div>
                <button 
                  onClick={requestLocation}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  title="Konumu Yenile"
                >
                  <RefreshCw className="w-3 h-3" /> Yenile
                </button>
              </div>
              
              {userCoords ? (
                <div className="space-y-3">
                  <div className="w-full h-44 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative bg-gray-50">
                    <iframe
                      title="Kullanıcı Konumu"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      src={`https://maps.google.com/maps?q=${userCoords.lat},${userCoords.lng}&z=16&output=embed`}
                    ></iframe>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-500 font-medium">
                      Seçili Ofise Mesafe: <strong className="text-indigo-600 font-bold">{distanceToSelectedOffice !== null ? (distanceToSelectedOffice < 1000 ? `${distanceToSelectedOffice} metre` : `${(distanceToSelectedOffice / 1000).toFixed(1)} km`) : 'Hesaplanıyor...'}</strong>
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${userCoords.lat},${userCoords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Haritada Aç
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-44 bg-gray-50 rounded-xl border border-gray-200 border-dashed text-gray-400 text-xs p-4">
                  <Compass className="w-8 h-8 text-gray-300 animate-spin mb-2" />
                  Konum doğrulanıyor...
                </div>
              )}
            </div>

            {/* Şirket Ofis & Şube Konumları Paneli (Sadece Yönetici / İK personeli görebilir, normal personele gözükmez) */}
            {isManagement && (
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-2xl p-5 text-white space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="font-bold text-sm">Şirket Ofis & Şubeleri</h3>
                      <p className="text-[10px] text-indigo-300">
                        Tıklayarak mesai yapacağınız ofisi seçebilirsiniz ({visibleOfficeLocations.length} Ofis)
                      </p>
                    </div>
                  </div>
                  {isHrOrAdmin && (
                    <button
                      onClick={handleOpenNewOffice}
                      className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Ofis Ekle
                    </button>
                  )}
                </div>
                
                {/* Registered Offices List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {visibleOfficeLocations.map((loc) => {
                    const dist = userCoords ? Math.round(getDistance(userCoords.lat, userCoords.lng, loc.lat, loc.lng)) : null;
                    const isSelected = loc.id === effectiveSelectedOfficeId;
                    const inRange = dist !== null && dist <= loc.radius_meters;
                    const isAssigned = employeeAssignedOffice?.id === loc.id;

                    return (
                      <div
                        key={loc.id}
                        onClick={() => {
                          setSelectedOfficeId(loc.id);
                          const newOfficeShifts = getShiftsForSpecificOffice(loc.id, allCompanyShifts, officeLocations);
                          if (newOfficeShifts.length > 0) {
                            const matchingAssigned = employeeAssignedShift && newOfficeShifts.find((s) => s.id === employeeAssignedShift.id);
                            const nextShift = matchingAssigned || newOfficeShifts.find((s) => s.is_default) || newOfficeShifts[0];
                            if (nextShift) {
                              setActiveUserShift(nextShift);
                            }
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-800/80 border-indigo-400 shadow-md ring-2 ring-indigo-400/50' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm">🏢</span>
                            <span className="font-bold text-xs text-white">{loc.name}</span>
                            {(loc.il || loc.ilce) && (
                              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded font-medium border border-indigo-400/20">
                                📍 {loc.il}{loc.ilce ? ` / ${loc.ilce}` : ''}
                              </span>
                            )}
                            {isAssigned && (
                              <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-bold border border-emerald-400/30">
                                ⭐ Mevcut Ofisiniz
                              </span>
                            )}
                            {loc.is_default && (
                              <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold border border-amber-400/30">
                                Merkez
                              </span>
                            )}
                          </div>
                          {isHrOrAdmin && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenEditOffice(loc)}
                                className="p-1 text-indigo-300 hover:text-white hover:bg-indigo-700/50 rounded cursor-pointer"
                                title="Düzenle"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteOffice(loc.id, loc.name)}
                                className="p-1 text-red-400 hover:text-red-200 hover:bg-red-900/40 rounded cursor-pointer"
                                title="Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-indigo-200 mt-1.5">
                          <span className="font-mono text-[10px] text-gray-300">
                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)} ({loc.radius_meters}m)
                          </span>
                          <span className={`font-semibold text-[10px] px-1.5 py-0.5 rounded ${
                            inRange ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {dist !== null ? (dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`) : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {visibleOfficeLocations.length === 0 && (
                    <div className="p-3 bg-white/5 rounded-xl text-center text-xs text-indigo-200">
                      {currentEmployee?.il
                        ? `${currentEmployee.il} bölgesinde kayıtlı şube bulunmuyor.`
                        : 'Henüz kayıtlı şube bulunmuyor. Merkez ofis varsayılan olarak kullanılmaktadır.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Team Monitoring Tab (Only visible to Management) */
        <div className="space-y-4">
          {/* Company Shift Config Banner */}
          <div className="bg-gradient-to-r from-indigo-50/90 to-blue-50/90 border border-indigo-200 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                ⏰
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-indigo-950">Vardiya & Çalışma Saatleri</h4>
                  <span className="bg-indigo-100 text-indigo-800 text-[11px] font-extrabold px-2 py-0.5 rounded-md">
                    {allCompanyShifts.length} Tanımlı Vardiya
                  </span>
                </div>
                <p className="text-xs text-indigo-700 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Varsayılan: <strong>{activeUserShift.name} ({activeUserShift.start_time} - {activeUserShift.end_time})</strong></span>
                  <span>•</span>
                  <span>Mola: <strong>{activeUserShift.break_minutes} dk</strong></span>
                  <span>•</span>
                  <span>Tolerans: <strong>{activeUserShift.tolerance_minutes} dk</strong></span>
                </p>
              </div>
            </div>
            {isManagement && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowSmsModal(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all"
                  title="Vardiya SMS Bildirimleri (Verimor Entegrasyonu)"
                >
                  <MessageSquare className="w-4 h-4" />
                  SMS Bildirimleri
                  {todaySmsCount > 0 && (
                    <span className="bg-emerald-800 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {todaySmsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowVardiyaModal(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  <Sliders className="w-4 h-4" />
                  Vardiyalar & Personel Atamaları
                </button>
              </div>
            )}
          </div>

          {/* Tarih Seçimi ve Denetim Kontrol Çubuğu */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200/80 text-indigo-950 px-3.5 py-1.5 rounded-xl">
                  <CalendarCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold font-sans">
                    {formattedSelectedDateText}
                  </span>
                  {selectedDate === getTodayYYYYMMDD() && (
                    <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md ml-1 shadow-2xs">
                      Bugün
                    </span>
                  )}
                  {(() => {
                    const [y, m, d] = (selectedDate || getTodayYYYYMMDD()).split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    if (dt.getDay() === 0) {
                      return (
                        <span className="text-[10px] font-extrabold bg-purple-600 text-white px-2 py-0.5 rounded-md ml-1 shadow-2xs">
                          Pazar (Hafta Tatili)
                        </span>
                      );
                    }
                    if (dt.getDay() === 6) {
                      return (
                        <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-md ml-1 shadow-2xs">
                          Cumartesi
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    className="px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-white hover:shadow-2xs rounded-lg transition-all cursor-pointer"
                    title="Önceki Gün"
                  >
                    ◀ Önceki
                  </button>
                  <button
                    type="button"
                    onClick={handleSetToday}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedDate === getTodayYYYYMMDD()
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-gray-700 hover:bg-white hover:shadow-2xs'
                    }`}
                  >
                    Bugün
                  </button>
                  <button
                    type="button"
                    onClick={handleNextDay}
                    className="px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-white hover:shadow-2xs rounded-lg transition-all cursor-pointer"
                    title="Sonraki Gün"
                  >
                    Sonraki ▶
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-200 bg-gray-50 hover:bg-white rounded-xl px-2.5 py-1 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    title="Farklı Bir Tarih Seç"
                  />
                </div>
              </div>

              {/* Hızlı Kısayollar ve Çıktı Butonları */}
              <div className="flex items-center gap-2 flex-wrap">
                {onNavigateToPuantaj && (
                  <button
                    onClick={onNavigateToPuantaj}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    title="Aylık Personel Puantaj ve Çalışma Cetveline Git"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-200" />
                    Aylık Puantaj Cetveli ➡️
                  </button>
                )}
                <button
                  onClick={handlePrintPdf}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Seçili Günün PDKS Devam ve Vardiya Çizelgesini PDF Olarak Çıktı Al"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  PDF Çıktısı Al
                </button>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="PDKS Çizelgesini Excel / CSV Olarak İndir"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Excel / CSV
                </button>
              </div>
            </div>

            {/* Durum KPI Hızlı Filtre Sayaçları (Haftalık Tatil & İzin Vurgulu) */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedStatusFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Tüm Personeller</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  selectedStatusFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-white text-slate-800'
                }`}>
                  {teamStats.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusFilter('calisan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedStatusFilter === 'calisan'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span>🟢 Zamanında / Gelen</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  selectedStatusFilter === 'calisan' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-800'
                }`}>
                  {teamStats.calisan}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusFilter('mesai-devam')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedStatusFilter === 'mesai-devam'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <span>⚡ Mesai Devam Eden</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  selectedStatusFilter === 'mesai-devam' ? 'bg-indigo-700 text-white' : 'bg-white text-indigo-800'
                }`}>
                  {teamStats.mesaiDevam}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusFilter('haftalik-tatil')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedStatusFilter === 'haftalik-tatil'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                }`}
                title="Hafta Tatili (HT) ve Akdi Tatil olan personeller"
              >
                <span>🏖️ Haftalık Tatil</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  selectedStatusFilter === 'haftalik-tatil' ? 'bg-purple-700 text-white' : 'bg-white text-purple-800'
                }`}>
                  {teamStats.haftalikTatil}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusFilter('izinli')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedStatusFilter === 'izinli'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                }`}
                title="Yıllık İzin, Raporlu ve Mazeret İzinli olan personeller"
              >
                <span>📋 İzinli / Raporlu</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  selectedStatusFilter === 'izinli' ? 'bg-sky-700 text-white' : 'bg-white text-sky-800'
                }`}>
                  {teamStats.izinli}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusFilter('giris-yapilmadi')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedStatusFilter === 'giris-yapilmadi'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
                title="Mesaiye gelmemiş veya giriş kaydı bulunmayan personeller"
              >
                <span>🔴 Giriş Yapılmadı</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  selectedStatusFilter === 'giris-yapilmadi' ? 'bg-rose-700 text-white' : 'bg-white text-rose-800'
                }`}>
                  {teamStats.girisYok}
                </span>
              </button>
            </div>

            {/* Arama Çubuğu ve Sıralama */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-gray-100">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Personel ara (Ad, Soyad, TC, Departman, Pozisyon, Durum)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="flex items-center gap-1.5 border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title={sortOrder === 'asc' ? 'A → Z Sıralı (Tersine çevirmek için tıklayın: Z → A)' : 'Z → A Sıralı (Düz çevirmek için tıklayın: A → Z)'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>{sortOrder === 'asc' ? 'A → Z Sırala' : 'Z → A Sırala'}</span>
                </button>
              </div>
            </div>

            {/* Şirket Seçici (Çoklu Şirket Yönetimi) - Yalnızca Süper Yöneticilere Gösterilir */}
            {isSuperAdmin && companies && companies.length > 0 && onCompanyChange && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 shadow-xs">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs text-gray-500 font-medium">Şirket:</span>
                  <select
                    value={selectedCompany || 'all'}
                    onChange={(e) => onCompanyChange(e.target.value)}
                    className="bg-transparent text-gray-800 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="all">Tüm Şirketler (BigSafer)</option>
                    {companies.map((c) => {
                      const cName = typeof c === 'string' ? c : c.name;
                      return (
                        <option key={cName} value={cName}>
                          {cName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* Departman / Birim Filtre Butonları */}
            {deptList.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedDepartment('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedDepartment === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  Tümü
                </button>
                {deptList.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedDepartment === dept
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold text-gray-700"
                    title={sortField === 'name' && sortOrder === 'asc' ? 'Z → A Sırala' : 'A → Z Sırala'}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Personel</span>
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
                    onClick={() => handleSort('department')}
                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold text-gray-700"
                    title={sortField === 'department' && sortOrder === 'asc' ? 'Z → A Sırala' : 'A → Z Sırala'}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Departman</span>
                      {sortField === 'department' ? (
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
                    onClick={() => handleSort('shift')}
                    className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold text-gray-700"
                    title={sortField === 'shift' && sortOrder === 'asc' ? 'Z → A Sırala' : 'A → Z Sırala'}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Atanmış Vardiya</span>
                      {sortField === 'shift' ? (
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
                    onClick={() => handleSort('giris')}
                    className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold text-gray-700"
                    title={sortField === 'giris' && sortOrder === 'asc' ? 'Geçten Erken Sırala' : 'Erkenden Geçe Sırala'}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Giriş Saati</span>
                      {sortField === 'giris' ? (
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
                    onClick={() => handleSort('cikis')}
                    className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold text-gray-700"
                    title={sortField === 'cikis' && sortOrder === 'asc' ? 'Geçten Erken Sırala' : 'Erkenden Geçe Sırala'}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Çıkış Saati</span>
                      {sortField === 'cikis' ? (
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
                    onClick={() => handleSort('office')}
                    className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold text-gray-700"
                    title={sortField === 'office' && sortOrder === 'asc' ? 'Z → A Sırala' : 'A → Z Sırala'}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Mesai Yapılan Ofis</span>
                      {sortField === 'office' ? (
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
                  {isManagement && (
                    <th
                      onClick={() => handleSort('mesai')}
                      className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold text-gray-700"
                      title={sortField === 'mesai' && sortOrder === 'asc' ? 'Büyükten Küçüğe Sırala' : 'Küçükten Büyüğe Sırala'}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Fazla Mesai</span>
                        {sortField === 'mesai' ? (
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
                  )}
                  <th
                    onClick={() => handleSort('durum')}
                    className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold text-gray-700"
                    title={sortField === 'durum' && sortOrder === 'asc' ? 'Z → A Sırala' : 'A → Z Sırala'}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Durum</span>
                      {sortField === 'durum' ? (
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
                  {isManagement && <th className="px-6 py-4 text-right">İşlemler</th>}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{d.employee.name}</td>
                    <td className="px-6 py-4 text-gray-600">{d.employee.department || 'Genel'}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs"
                        style={{
                          backgroundColor: (d.shift?.color || '#3b82f6') + '15',
                          color: d.shift?.color || '#3b82f6',
                          borderColor: (d.shift?.color || '#3b82f6') + '40',
                        }}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{d.shift?.name} ({d.shift?.start_time}-{d.shift?.end_time})</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-medium text-gray-800">
                      {d.giris === 'HT' || d.giris === 'AT' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                          {d.giris}
                        </span>
                      ) : d.giris === 'Ç' ? (
                        d.shift?.start_time || '08:30'
                      ) : d.isLeave && d.giris !== '-' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs">
                          {d.giris}
                        </span>
                      ) : d.giris === 'D' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs">
                          D
                        </span>
                      ) : (
                        d.giris
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-medium text-gray-800">
                      {d.cikis === 'HT' || d.cikis === 'AT' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                          {d.cikis}
                        </span>
                      ) : d.cikis === 'Ç' ? (
                        d.shift?.end_time || '18:00'
                      ) : d.isLeave && d.cikis !== '-' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs">
                          {d.cikis}
                        </span>
                      ) : d.cikis === 'D' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs">
                          D
                        </span>
                      ) : (
                        d.cikis
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {d.giris !== '-' && !d.isLeave && d.officeName && d.officeName !== '-' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{d.officeName}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">-</span>
                      )}
                    </td>
                    {isManagement && (
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const now = new Date();
                          const currentHM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                          const isShiftActiveTime = currentHM < (d.shift?.end_time || '18:00');
                          const empId = d.employee.id;
                          const isGranted = Boolean(overtimeAuthMap[empId]);

                          if (isShiftActiveTime) {
                            return (
                              <button
                                onClick={() => toggleOvertimeAuth(empId)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all shadow-sm cursor-pointer ${
                                  isGranted
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800 border border-slate-200'
                                }`}
                                title="Mesai bitimine kadar tıklanırsa çalışan mesai sonrasında kalabilir"
                              >
                                <span>{isGranted ? '🟢' : '⚡'}</span>
                                <span>{isGranted ? 'Onaylandı' : 'Onayla'}</span>
                              </button>
                            );
                          }

                          if (isGranted) {
                            return (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                <span>🟢</span> FM Onaylı
                              </span>
                            );
                          }

                          return (
                            <span className="text-xs text-gray-400 font-medium">
                              ⚪ Mesai Bitti
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs ${
                        d.durum === 'Zamanında' || d.durum === 'Fiili Çalışma' || d.durum.includes('Fiili Çalışma')
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : d.durum === 'Geç Kaldı'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : d.durum === 'Mesai Devam Ediyor'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : d.durum === 'Haftalık Tatil' || d.durum === 'Hafta Tatili' || d.durum === 'Akdi Tatil'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : d.isLeave || d.durum.includes('İzin') || d.durum.includes('Rapor')
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : d.durum === 'Giriş Yapılmadı' || d.durum === 'Devamsız'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {(d.durum === 'Haftalık Tatil' || d.durum === 'Hafta Tatili' || d.durum === 'Akdi Tatil') && (
                          <span className="text-xs">🏖️</span>
                        )}
                        {(d.isLeave || d.durum.includes('İzin') || d.durum.includes('Rapor')) && !(d.durum.includes('Tatil')) && !(d.durum.includes('Fiili Çalışma')) && (
                          <span className="text-xs">📋</span>
                        )}
                        {d.durum === 'Fiili Çalışma' || d.durum.includes('Fiili Çalışma') ? 'Zamanında' : d.durum}
                      </span>
                    </td>
                    {isManagement && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            const isTimeStr = (s?: string) => Boolean(s && /^\d{1,2}:\d{2}/.test(s));
                            setEditEmpModal(d);
                            setEditGiris(isTimeStr(d.giris) ? d.giris.substring(0, 5) : (d.shift?.start_time || '08:30').substring(0, 5));
                            const hasExplicitExit = isTimeStr(d.cikis) && d.durum !== 'Mesai Devam Ediyor';
                            setEditCikis(hasExplicitExit ? (d.cikis as string).substring(0, 5) : '');
                            setEditOfficeName(d.officeName !== '-' ? d.officeName : resolveEmployeeOfficeName(d.employee, d.shift, null));
                            setEditShiftId(d.shift?.id || '');
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                        >
                          ✏️ Düzenle
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Individual Employee Shift Modal */}
      {editEmpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Giriş / Çıkış Saati Düzenle</h3>
              <button onClick={() => setEditEmpModal(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {editEmpModal.employee.name} ({editEmpModal.employee.department || 'Genel'})
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Çalışılan Ofis / Şube</label>
                <select
                  value={editOfficeName}
                  onChange={(e) => {
                    const newOffName = e.target.value;
                    setEditOfficeName(newOffName);
                    const modalEmpCompId = normalizeCompanyId(editEmpModal.employee?.company_id || editEmpModal.employee?.company);
                    const modalOffices = (allCompanyOfficesMap[modalEmpCompId] && allCompanyOfficesMap[modalEmpCompId].length > 0)
                      ? allCompanyOfficesMap[modalEmpCompId]
                      : (modalEmpCompId === resolvedCompanyId && officeLocations.length > 0)
                      ? officeLocations
                      : getDefaultOfficesForCompany(modalEmpCompId);
                    const targetOff = modalOffices.find(o => o.name === newOffName);
                    if (targetOff) {
                      const offShifts = getShiftsForSpecificOffice(targetOff.id, allCompanyShifts, modalOffices);
                      if (offShifts.length > 0 && !offShifts.some(s => s.id === editShiftId)) {
                        setEditShiftId(offShifts[0].id);
                      }
                    }
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {(() => {
                    const modalEmpCompId = normalizeCompanyId(editEmpModal.employee?.company_id || editEmpModal.employee?.company);
                    const modalOffices = (allCompanyOfficesMap[modalEmpCompId] && allCompanyOfficesMap[modalEmpCompId].length > 0)
                      ? allCompanyOfficesMap[modalEmpCompId]
                      : (modalEmpCompId === resolvedCompanyId && officeLocations.length > 0)
                      ? officeLocations
                      : getDefaultOfficesForCompany(modalEmpCompId);

                    return (
                      <>
                        {modalOffices.map((l) => (
                          <option key={l.id} value={l.name}>
                            🏢 {l.name} {l.il ? `(${l.il}${l.ilce ? ` / ${l.ilce}` : ''})` : ''}
                          </option>
                        ))}
                        {modalOffices.length === 0 && (
                          <option value="Merkez Ofis">🏢 Merkez Ofis</option>
                        )}
                      </>
                    );
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Vardiya / Çalışma Düzeni</label>
                <select
                  value={editShiftId}
                  onChange={(e) => setEditShiftId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {(() => {
                    const modalEmpCompId = normalizeCompanyId(editEmpModal.employee?.company_id || editEmpModal.employee?.company);
                    const modalOffices = (allCompanyOfficesMap[modalEmpCompId] && allCompanyOfficesMap[modalEmpCompId].length > 0)
                      ? allCompanyOfficesMap[modalEmpCompId]
                      : (modalEmpCompId === resolvedCompanyId && officeLocations.length > 0)
                      ? officeLocations
                      : getDefaultOfficesForCompany(modalEmpCompId);
                    const chosenOffice = modalOffices.find(o => o.name === editOfficeName) || modalOffices[0];
                    const officeShifts = chosenOffice 
                      ? getShiftsForSpecificOffice(chosenOffice.id, allCompanyShifts, modalOffices)
                      : allCompanyShifts;
                    
                    const shiftOptions = officeShifts.length > 0 ? officeShifts : allCompanyShifts;
                    return shiftOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        ⏰ {s.name} ({s.start_time} - {s.end_time})
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Giriş Saati</label>
                    {editGiris && (
                      <button
                        type="button"
                        onClick={() => setEditGiris('')}
                        className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold cursor-pointer"
                        title="Giriş saatini temizler"
                      >
                        Girişi Sıfırla
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={editGiris}
                    onChange={(e) => setEditGiris(e.target.value)}
                    placeholder="--:--"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Çıkış Saati {(!editCikis || editEmpModal.durum === 'Mesai Devam Ediyor') && <span className="text-[10px] text-emerald-600 font-normal ml-1">(Mesai Devam Ediyor)</span>}
                    </label>
                    {editCikis && (
                      <button
                        type="button"
                        onClick={() => setEditCikis('')}
                        className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                        title="Çıkış saatini kaldırır ve personelin mesaisini açık/devam ediyor yapar"
                      >
                        Çıkışı Sıfırla
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={editCikis}
                    onChange={(e) => setEditCikis(e.target.value)}
                    placeholder="--:--"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {!editCikis && (
                    <p className="text-[10px] text-gray-400 mt-0.5">Boş bırakılırsa mesai devam ediyor olarak korunur.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  if (!editEmpModal) return;
                  const activeRecordDate = selectedDate || getTodayYYYYMMDD();
                  const existingRecord = allShiftRecords.find(
                    r => (r.employee_id === editEmpModal.employee.id || (editEmpModal.employee as any).user_id === r.employee_id) && r.tarih === activeRecordDate
                  );

                  try {
                    if (existingRecord?.id) {
                      await pdksService.deleteVardiya(existingRecord.id);
                    }
                    await pdksService.deleteVardiyaByEmployeeAndDate(editEmpModal.employee.id, activeRecordDate);
                  } catch (e) {
                    console.error("Vardiya giriş kaydı silme hatası:", e);
                  }

                  setAllShiftRecords(prev => prev.filter(r => !(r.employee_id === editEmpModal.employee.id && r.tarih === activeRecordDate)));
                  setEditEmpModal(null);
                  setEditGiris('08:30');
                  setEditCikis('');
                  window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
                  window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));
                  await loadShiftHistory();
                }}
                className="w-full py-2 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                title="Giriş saatini ve kaydını tamamen silerek personeli 'Giriş Yapılmadı' durumuna geri döndürür"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Giriş Saatini Sıfırla (Giriş Yapılmadı / Kaydı Sil)
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!editEmpModal) return;
                  const isTimeStr = (s?: string) => Boolean(s && /^\d{1,2}:\d{2}/.test(s));
                  const cleanGiris = editGiris && isTimeStr(editGiris)
                    ? editGiris.substring(0, 5)
                    : (editEmpModal.giris && isTimeStr(editEmpModal.giris)
                        ? editEmpModal.giris.substring(0, 5)
                        : (editEmpModal.shift?.start_time || '08:30').substring(0, 5));
                  const activeRecordDate = selectedDate || getTodayYYYYMMDD();
                  const targetCompanyId = normalizeCompanyId(editEmpModal.employee.company_id || resolvedCompanyId);

                  const selectedShiftObj = allCompanyShifts.find(s => s.id === editShiftId) || editEmpModal.shift || activeUserShift;
                  const chosenShiftName = selectedShiftObj?.name || 'Standart Vardiya';
                  const chosenShiftId = selectedShiftObj?.id || '';

                  const noteText = `[OFİS:${editOfficeName || 'Merkez Ofis'}] [VARDIYA:${chosenShiftName}] [VARDIYA_ID:${chosenShiftId}] [PUANTAJ:Ç] Fiili Çalışma (${cleanGiris}-Devam) - Yönetici Girişi (Mesai Açık): ${editOfficeName || 'Merkez Ofis'}`;

                  let savedDbRecord: any = null;
                  if (targetCompanyId && editEmpModal.employee.id) {
                    try {
                      savedDbRecord = await pdksService.createVardiya({
                        company_id: targetCompanyId,
                        employee_id: editEmpModal.employee.id,
                        tarih: activeRecordDate,
                        giris_saati: cleanGiris,
                        cikis_saati: null,
                        vardiya_tipi: 'tam-gun',
                        durum: 'zamaninda',
                        notlar: noteText
                      });
                    } catch (e) {
                      console.error("Vardiya veritabanı çıkış sıfırlama hatası:", e);
                    }
                  }

                  const newRecord = savedDbRecord || {
                    id: `v-edit-${Date.now()}`,
                    company_id: targetCompanyId,
                    employee_id: editEmpModal.employee.id,
                    tarih: activeRecordDate,
                    giris_saati: cleanGiris,
                    cikis_saati: null,
                    vardiya_tipi: 'tam-gun',
                    durum: 'zamaninda',
                    notlar: noteText
                  };

                  setAllShiftRecords(prev => {
                    const filtered = prev.filter(r => !(r.employee_id === editEmpModal.employee.id && r.tarih === activeRecordDate));
                    return [newRecord, ...filtered];
                  });

                  try {
                    const modalEmpCompId = normalizeCompanyId(editEmpModal.employee?.company_id || editEmpModal.employee?.company);
                    const modalOffices = (allCompanyOfficesMap[modalEmpCompId] && allCompanyOfficesMap[modalEmpCompId].length > 0)
                      ? allCompanyOfficesMap[modalEmpCompId]
                      : (modalEmpCompId === resolvedCompanyId && officeLocations.length > 0)
                      ? officeLocations
                      : getDefaultOfficesForCompany(modalEmpCompId);
                    const targetOff = modalOffices.find(o => o.name === editOfficeName);

                    localStorage.setItem(`humanius_daily_shift_${editEmpModal.employee.id}_${activeRecordDate}`, JSON.stringify({
                      officeId: targetOff?.id,
                      officeName: editOfficeName,
                      shiftId: chosenShiftId,
                      shiftName: chosenShiftName,
                      startTime: cleanGiris,
                      endTime: selectedShiftObj?.end_time || '18:00',
                    }));

                    if (targetOff?.id) {
                      localStorage.setItem(`humanius_emp_selected_office_${editEmpModal.employee.id}`, targetOff.id);
                    }
                    if (chosenShiftId) {
                      localStorage.setItem(`humanius_emp_selected_shift_${editEmpModal.employee.id}`, chosenShiftId);
                      shiftService.assignShift(targetCompanyId || 'default', editEmpModal.employee.id, chosenShiftId);
                    }
                  } catch {}

                  setAdminOverrides(prev => ({
                    ...prev,
                    [editEmpModal.employee.id]: {
                      officeName: editOfficeName,
                      shiftId: chosenShiftId
                    }
                  }));

                  setEditEmpModal(null);
                  setEditGiris('08:30');
                  setEditCikis('');
                  window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
                  window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));
                  await loadShiftHistory();
                }}
                className="w-full py-2 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                title="Çıkış saatini tamamen kaldırarak (NULL) personeli mesai devam ediyor durumuna getirir"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Çıkış Saatini Sıfırla (Mesaiye Döndür / NULL Yap)
              </button>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditEmpModal(null)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!editEmpModal) return;
                    const activeRecordDate = selectedDate || getTodayYYYYMMDD();
                    const isTimeStr = (s?: string) => Boolean(s && /^\d{1,2}:\d{2}/.test(s));
                    const cleanGiris = (editGiris && isTimeStr(editGiris.trim())) ? editGiris.substring(0, 5) : null;
                    const cleanCikis = (editCikis && isTimeStr(editCikis.trim())) ? editCikis.substring(0, 5) : null;

                    // Eğer hem giriş hem çıkış boşaltıldıysa kaydı sil (Giriş Yapılmadı)
                    if (!cleanGiris && !cleanCikis) {
                      try {
                        const existingRecord = allShiftRecords.find(
                          r => (r.employee_id === editEmpModal.employee.id || (editEmpModal.employee as any).user_id === r.employee_id) && r.tarih === activeRecordDate
                        );
                        if (existingRecord?.id) {
                          await pdksService.deleteVardiya(existingRecord.id);
                        }
                        await pdksService.deleteVardiyaByEmployeeAndDate(editEmpModal.employee.id, activeRecordDate);
                      } catch (e) {
                        console.error("Vardiya kaydı silme hatası:", e);
                      }
                      setAllShiftRecords(prev => prev.filter(r => !(r.employee_id === editEmpModal.employee.id && r.tarih === activeRecordDate)));
                      setEditEmpModal(null);
                      window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
                      window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));
                      await loadShiftHistory();
                      return;
                    }

                    const selectedShiftObj = allCompanyShifts.find(s => s.id === editShiftId) || editEmpModal.shift || activeUserShift;
                    const chosenShiftName = selectedShiftObj?.name || 'Standart Vardiya';
                    const chosenShiftId = selectedShiftObj?.id || '';

                    // Calculate new status
                    const [gH, gM] = (cleanGiris || '08:30').split(':').map(Number);
                    const empShift = selectedShiftObj;
                    const [sGh, sGm] = (empShift.start_time || '08:30').split(':').map(Number);
                    
                    const actualMin = gH * 60 + gM;
                    const shiftMin = sGh * 60 + sGm;
                    const lateDiff = actualMin - shiftMin;
                    const tolerance = empShift.tolerance_minutes ?? 15;
                    
                    const newDurum = lateDiff > tolerance ? 'gec-kaldi' : 'zamaninda';
                    const targetCompanyId = normalizeCompanyId(editEmpModal.employee.company_id || resolvedCompanyId);

                    const noteText = cleanCikis
                      ? `[OFİS:${editOfficeName || 'Merkez Ofis'}] [VARDIYA:${chosenShiftName}] [VARDIYA_ID:${chosenShiftId}] [PUANTAJ:Ç] Fiili Çalışma (${cleanGiris}-${cleanCikis}) - Yönetici Girişi: ${editOfficeName || 'Merkez Ofis'}`
                      : `[OFİS:${editOfficeName || 'Merkez Ofis'}] [VARDIYA:${chosenShiftName}] [VARDIYA_ID:${chosenShiftId}] [PUANTAJ:Ç] Fiili Çalışma (${cleanGiris}-Devam) - Yönetici Girişi (Mesai Açık): ${editOfficeName || 'Merkez Ofis'}`;

                    // Always record shift to pdksService and Supabase
                    let savedDbRecord: any = null;
                    if (targetCompanyId && editEmpModal.employee.id) {
                      try {
                        savedDbRecord = await pdksService.createVardiya({
                          company_id: targetCompanyId,
                          employee_id: editEmpModal.employee.id,
                          tarih: activeRecordDate,
                          giris_saati: cleanGiris,
                          cikis_saati: cleanCikis,
                          vardiya_tipi: 'tam-gun',
                          durum: newDurum,
                          notlar: noteText
                        });
                      } catch (e) {
                        console.error("Vardiya veritabanı kayıt hatası:", e);
                      }
                    }

                    const newRecord = savedDbRecord || {
                      id: `v-edit-${Date.now()}`,
                      company_id: targetCompanyId,
                      employee_id: editEmpModal.employee.id,
                      tarih: activeRecordDate,
                      giris_saati: cleanGiris,
                      cikis_saati: cleanCikis,
                      vardiya_tipi: 'tam-gun',
                      durum: newDurum,
                      notlar: noteText
                    };
                    setAllShiftRecords((prev) => [newRecord, ...prev.filter(r => !(r.employee_id === editEmpModal.employee.id && r.tarih === activeRecordDate))]);

                    try {
                      const modalEmpCompId = normalizeCompanyId(editEmpModal.employee?.company_id || editEmpModal.employee?.company);
                      const modalOffices = (allCompanyOfficesMap[modalEmpCompId] && allCompanyOfficesMap[modalEmpCompId].length > 0)
                        ? allCompanyOfficesMap[modalEmpCompId]
                        : (modalEmpCompId === resolvedCompanyId && officeLocations.length > 0)
                        ? officeLocations
                        : getDefaultOfficesForCompany(modalEmpCompId);
                      const targetOff = modalOffices.find(o => o.name === editOfficeName);

                      localStorage.setItem(`humanius_daily_shift_${editEmpModal.employee.id}_${activeRecordDate}`, JSON.stringify({
                        officeId: targetOff?.id,
                        officeName: editOfficeName,
                        shiftId: chosenShiftId,
                        shiftName: chosenShiftName,
                        startTime: cleanGiris,
                        endTime: cleanCikis || selectedShiftObj?.end_time || '18:00',
                      }));

                      if (targetOff?.id) {
                        localStorage.setItem(`humanius_emp_selected_office_${editEmpModal.employee.id}`, targetOff.id);
                      }
                      if (chosenShiftId) {
                        localStorage.setItem(`humanius_emp_selected_shift_${editEmpModal.employee.id}`, chosenShiftId);
                        shiftService.assignShift(targetCompanyId || 'default', editEmpModal.employee.id, chosenShiftId);
                      }
                    } catch {}

                    setAdminOverrides(prev => ({
                      ...prev,
                      [editEmpModal.employee.id]: {
                        officeName: editOfficeName,
                        shiftId: chosenShiftId
                      }
                    }));

                    // Puantaj cetveli ve diğer bileşenlerin anında güncellenmesi için custom event fırlat
                    window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
                    window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));

                    setEditEmpModal(null);
                    await loadShiftHistory();
                  }}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
          </div>
        </div>
      </div>
    )}

      {/* Multi-Shift & Employee Assignment Management Modal */}
      <VardiyaYonetimiModal
        isOpen={showVardiyaModal}
        onClose={async () => {
          setShowVardiyaModal(false);
          const [fetchedShifts, fetchedAssignments] = await Promise.all([
            shiftService.getShifts(resolvedCompanyId),
            shiftService.getAssignments(resolvedCompanyId),
          ]);
          setAllCompanyShifts(fetchedShifts);
          setAllShiftAssignments(fetchedAssignments);
        }}
        employees={employees}
        companyId={resolvedCompanyId}
      />

      {/* Vardiya SMS Bildirimleri Yönetim Modalı */}
      <VardiyaSmsModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        employees={employees}
        companyId={resolvedCompanyId}
      />

      {/* Add / Edit Office Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-800">
                  {editingLocation ? 'Ofis / Şube Konumunu Düzenle' : 'Yeni Ofis / Şube Konumu Ekle'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowLocationModal(false);
                  setEditingLocation(null);
                }} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOffice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ofis / Şube Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Düzce Ofisi, Bolu Şubesi, İstanbul Genel Merkez"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* İl ve İlçe Seçimi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    İl
                  </label>
                  <select
                    value={locIl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocIl(val);
                      setLocIlce('');
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer font-medium"
                  >
                    <option value="">İl Seçiniz</option>
                    {sortedIller.map((item) => (
                      <option key={item.il} value={item.il}>
                        {item.il}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    İlçe
                  </label>
                  <select
                    value={locIlce}
                    onChange={(e) => setLocIlce(e.target.value)}
                    disabled={!locIl}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">{locIl ? 'İlçe Seçiniz' : 'Önce İl Seçiniz'}</option>
                    {availableLocIlceler.map((ilceName) => (
                      <option key={ilceName} value={ilceName}>
                        {ilceName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    GPS Koordinatları <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentCoordsForForm}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" /> Mevcut GPS Konumumu Al
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block mb-0.5">Enlem (Latitude)</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Örn: 40.8438"
                      value={locLat}
                      onChange={(e) => setLocLat(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block mb-0.5">Boylam (Longitude)</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Örn: 31.1565"
                      value={locLng}
                      onChange={(e) => setLocLng(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Güvenlik Çemberi / Tolerans (Metre)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    value={locRadius}
                    onChange={(e) => setLocRadius(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Önerilen: 200 - 300m</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Varsayılan Merkez
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={locIsDefault}
                      onChange={(e) => setLocIsDefault(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-700 font-medium">Varsayılan Ana Ofis</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Adres / Şehir / Not (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Düzce Merkez, Bolu Sanayi Bölgesi"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowLocationModal(false);
                    setEditingLocation(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSavingLoc}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingLoc ? 'Kaydediliyor...' : editingLocation ? 'Güncellemeleri Kaydet' : 'Ofisi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdksDevam;
