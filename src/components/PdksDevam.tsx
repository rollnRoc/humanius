import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pdksService, VardiyaInsert } from '../services/pdksService';
import { companyService, BIGSAFER_COMPANY_ID, MICI_COMPANY_ID, normalizeCompanyId } from '../services/companyService';
import { notificationService } from '../services/notificationService';
import { shiftService, CompanyShift, VARSAYILAN_VARDIYALAR, SaturdayWorkConfig, DEFAULT_SATURDAY_CONFIG, isNotSaturdayShift, inferOfficeForShift, isShiftMatchingOffice } from '../services/shiftService';
import { VardiyaYonetimiModal } from './VardiyaYonetimiModal';
import { printPdksDevamRaporuPdf, exportPdksToCsv, PdksReportRecord } from '../utils/pdksReportPdf';
import {
  Clock, LogIn, LogOut, Search, Filter, MapPin, Fingerprint,
  Compass, Play, Square, AlertCircle, CheckCircle2, ShieldAlert,
  Sliders, Navigation, CheckCircle, RefreshCw, Trash2,
  Building2, Plus, Edit2, Check, X, Bell, BellRing, Users,
  Printer, FileText, Download, CalendarCheck, ArrowUpDown
} from 'lucide-react';
import type { Employee, CompanyOfficeLocation } from '../types';
import { getDevamKontroluIzinLabel } from '../utils/izinCalculations';
import iller, { type IlIlceItem } from '../lib/illce';
import { matchEmployeeToUser, getTodayYYYYMMDD } from '../utils/sanitize';


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
  shiftStartIso: string | null,
  cikisTimeStr: string = '18:00',
  isOvertimeAuthorized: boolean = false,
  gracePeriodMinutes: number = 0
): { isExpired: boolean; autoCloseTime: string } {
  if (!shiftStartIso) return { isExpired: true, autoCloseTime: cikisTimeStr };
  const startMs = new Date(shiftStartIso).getTime();
  if (isNaN(startMs)) return { isExpired: true, autoCloseTime: cikisTimeStr };
  
  const now = new Date();
  const startDate = new Date(shiftStartIso);
  
  // 1. If start date is a previous calendar day (e.g. yesterday or earlier) -> Expired
  const startYMD = startDate.getFullYear() * 10000 + (startDate.getMonth() + 1) * 100 + startDate.getDate();
  const nowYMD = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  if (nowYMD > startYMD) {
    return { isExpired: true, autoCloseTime: cikisTimeStr };
  }

  // 2. If overtime is authorized by manager, don't auto-expire at shift end
  if (isOvertimeAuthorized) {
    const elapsedSecs = (now.getTime() - startMs) / 1000;
    return { isExpired: elapsedSecs >= 18 * 3600, autoCloseTime: cikisTimeStr };
  }

  // 3. Shift End Window Calculation (e.g. Tarsus 15:00)
  const [cH, cM] = cikisTimeStr.split(':').map(Number);
  if (!isNaN(cH) && !isNaN(cM)) {
    const shiftEnd = new Date(startDate);
    shiftEnd.setHours(cH, cM, 0, 0);
    // Handle overnight shifts if end time is before start time
    if (shiftEnd.getTime() <= startDate.getTime()) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }
    
    // Deadline: Shift End + Grace Window (0 by default)
    const deadline = new Date(shiftEnd.getTime() + gracePeriodMinutes * 60 * 1000);
    
    if (now.getTime() >= deadline.getTime()) {
      // Shift end time reached without overtime authorization:
      // Auto-expire and register exit time as the scheduled shift end time (e.g. 15:00)
      return { isExpired: true, autoCloseTime: cikisTimeStr };
    }
  }

  // 4. Failsafe: Only auto-expire if duration exceeds 18 hours (e.g. forgotten overnight shifts)
  const elapsedSecs = (now.getTime() - startMs) / 1000;
  if (elapsedSecs >= 18 * 3600) {
    return { isExpired: true, autoCloseTime: cikisTimeStr };
  }

  return { isExpired: false, autoCloseTime: cikisTimeStr };
}

// "vardıyada ne yazıyosa ona göre cıkış yapılsın"
// Personelin tanımlı vardiyası (Tarsus 15:00 vb.) varsa her zaman o vardiyanın çıkış saati esastır.
// Sadece özel vardiyası olmayan genel personel için Cumartesi erken çıkış (16:00) uygulanır.
function getTargetCikisTime(
  activeShift: { end_time?: string; id?: string } | null | undefined,
  defaultShiftId: string | undefined,
  isSaturday: boolean,
  satConfig: any
): string {
  if (activeShift?.end_time && activeShift.end_time !== '00:00') {
    if (activeShift.end_time !== '18:00' || (activeShift.id && defaultShiftId && activeShift.id !== defaultShiftId)) {
      return activeShift.end_time;
    }
  }
  if (isSaturday && satConfig?.isSaturdayWork) {
    return satConfig.endTime || '16:00';
  }
  return activeShift?.end_time || '18:00';
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

  const [overtimeAuthMap, setOvertimeAuthMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('humanius_pdks_overtime_auth');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleOvertimeAuth = (empId: string) => {
    setOvertimeAuthMap((prev) => {
      const next = { ...prev, [empId]: !prev[empId] };
      localStorage.setItem('humanius_pdks_overtime_auth', JSON.stringify(next));
      return next;
    });
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
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<CompanyOfficeLocation | null>(null);
  
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
    if (isHrOrAdmin) {
      return officeLocations;
    }
    const userCity = currentEmployee?.il?.trim();
    if (!userCity) {
      return officeLocations;
    }
    const userCityNorm = userCity.toLocaleLowerCase('tr-TR').replace(/[\s-]/g, '');
    const cityOffices = officeLocations.filter((loc) => {
      if (!loc.il || !loc.il.trim()) return false;
      const locCityNorm = loc.il.trim().toLocaleLowerCase('tr-TR').replace(/[\s-]/g, '');
      return locCityNorm === userCityNorm;
    });

    // Eğer personelin olduğu şehirde kayıtlı ofis(ler) varsa SADECE onları göster;
    // Eğer personelin olduğu şehirde hiçbir ofis yoksa personeli engellememek için tüm ofisleri göster.
    if (cityOffices.length > 0) {
      return cityOffices;
    }
    return officeLocations;
  }, [isHrOrAdmin, officeLocations, currentEmployee?.il]);

  // Visible office değiştiğinde (şehir filtresine göre) seçili ofisi güncelle
  useEffect(() => {
    if (visibleOfficeLocations && visibleOfficeLocations.length > 0) {
      setSelectedOfficeId((prev) => {
        if (prev && visibleOfficeLocations.some((l) => l.id === prev)) return prev;
        const def = visibleOfficeLocations.find((l) => l.is_default) || visibleOfficeLocations[0];
        return def.id;
      });
    }
  }, [visibleOfficeLocations]);
  
  // Edit Employee PDKS Modal states
  const [editEmpModal, setEditEmpModal] = useState<any | null>(null);
  const [editGiris, setEditGiris] = useState('');
  const [editCikis, setEditCikis] = useState('');
  const [editOfficeName, setEditOfficeName] = useState('');
  const [adminOverrides, setAdminOverrides] = useState<Record<string, any>>({});

  // Company Work Hours & Multi-Shift States
  const [showVardiyaModal, setShowVardiyaModal] = useState(false);
  const [allCompanyShifts, setAllCompanyShifts] = useState<CompanyShift[]>(VARSAYILAN_VARDIYALAR);
  const [allShiftAssignments, setAllShiftAssignments] = useState<Record<string, string>>({});
  const [activeUserShift, setActiveUserShift] = useState<CompanyShift>(VARSAYILAN_VARDIYALAR[0]);
  const [saturdayConfig, setSaturdayConfig] = useState<SaturdayWorkConfig>(DEFAULT_SATURDAY_CONFIG);

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
        setActiveUserShift(userShift || defaultShift);
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
  }, [resolvedCompanyId, currentEmployee?.id]);
  
  // Ofise bağlı vardiya filtrelemesi:
  // - İK ve Şirket Yöneticisi (superadmin, admin, hr) şirketin tüm vardiyalarını görür.
  // - Normal personel için:
  //   1. Personelin seçili/bulunduğu ofise ait vardiyalar varsa SADECE onlar gösterilir.
  //   2. Eğer personelin ofisine özel hiçbir vardiya tanımlı değilse, şirket geneli vardiyalar gösterilir.
  const visibleShiftsForEmployee = useMemo(() => {
    if (isHrOrAdmin) {
      return allCompanyShifts;
    }

    if (selectedOfficeId) {
      // 1. Önce bu ofise özel/eşleşen vardiyaları filtrele
      const officeShifts = allCompanyShifts.filter((shift) =>
        isShiftMatchingOffice(shift, selectedOfficeId, officeLocations, false)
      );
      if (officeShifts.length > 0) {
        return officeShifts;
      }
    }

    // 2. Ofise özel vardiya yoksa genel (herhangi bir ofise ait olmayan) vardiyaları göster
    const generalShifts = allCompanyShifts.filter(
      (s) => !inferOfficeForShift(s, officeLocations)
    );
    return generalShifts.length > 0 ? generalShifts : allCompanyShifts;
  }, [isHrOrAdmin, allCompanyShifts, selectedOfficeId, officeLocations]);

  // Ofis veya vardiya listesi değiştiğinde aktif vardiya görünür listede yoksa varsayılana geç
  useEffect(() => {
    if (visibleShiftsForEmployee && visibleShiftsForEmployee.length > 0 && !isShiftActive) {
      const exists = visibleShiftsForEmployee.some((s) => s.id === activeUserShift?.id);
      if (!exists) {
        const def = visibleShiftsForEmployee.find((s) => s.is_default) || visibleShiftsForEmployee[0];
        setActiveUserShift(def);
      }
    }
  }, [visibleShiftsForEmployee, isShiftActive]);

  // Geolocation watch ID ref
  const watchIdRef = useRef<number | null>(null);

  const [companyDetails, setCompanyDetails] = useState<any>(null);

  // Load state and history from localStorage and database on init
  useEffect(() => {
    // Read local storage for active session
    const savedActiveId = localStorage.getItem('pdks_active_shift_id');
    const savedStart = localStorage.getItem('pdks_active_shift_start');
    const isTodaySaturday = new Date().getDay() === 6;
    const targetCikisTime = getTargetCikisTime(activeUserShift, undefined, isTodaySaturday, saturdayConfig);
    const isOvertimeAuthorized = Boolean(currentEmployee?.id && overtimeAuthMap[currentEmployee.id]);
    
    if (savedActiveId && savedStart) {
      const { isExpired, autoCloseTime } = checkIsShiftExpired(savedStart, targetCikisTime, isOvertimeAuthorized, 0);
      if (isExpired) {
        pdksService.updateVardiya(savedActiveId, {
          cikis_saati: autoCloseTime,
          notlar: `Vardiya çıkış saati (${autoCloseTime}) dolduğu için sistem tarafından otomatik tamamlandı`
        }).catch(err => console.warn("Auto-close expired shift DB warning:", err));

        localStorage.removeItem('pdks_active_shift_id');
        localStorage.removeItem('pdks_active_shift_start');
        setIsShiftActive(false);
        setShiftStartTime(null);
        setActiveShiftRecordId(null);
      } else {
        setIsShiftActive(true);
        setShiftStartTime(savedStart);
        setActiveShiftRecordId(savedActiveId);
        startWatchingLocation();
      }
    } else if (savedStart && !savedActiveId) {
      const { isExpired } = checkIsShiftExpired(savedStart, targetCikisTime, isOvertimeAuthorized, 0);
      if (isExpired) {
        localStorage.removeItem('pdks_active_shift_start');
        setIsShiftActive(false);
        setShiftStartTime(null);
      }
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

  // Load office locations for the company
  const loadOfficeLocations = React.useCallback(async () => {
    try {
      const locs = await companyService.getOfficeLocations(resolvedCompanyId);
      setOfficeLocations(locs);
      if (locs && locs.length > 0) {
        setSelectedOfficeId((prev) => {
          if (prev && locs.some((l) => l.id === prev)) return prev;
          const def = locs.find((l) => l.is_default) || locs[0];
          return def.id;
        });
      }
    } catch (e) {
      console.error("Error loading office locations:", e);
    }
  }, [resolvedCompanyId]);

  useEffect(() => {
    loadOfficeLocations();
  }, [loadOfficeLocations]);

  // Load shift history from database when currentEmployee is found and sync shift status
  const loadShiftHistory = React.useCallback(async () => {
    if (currentEmployee?.id) {
      try {
        const allVardiyalar = await pdksService.getVardiyalar();
        setAllShiftRecords(allVardiyalar || []);
        // Filter to only include records for the current employee
        const myVardiyalar = (allVardiyalar || []).filter(v => v.employee_id === currentEmployee.id);

        // Check today's shift status in DB to synchronize with personal screen
        const todayStr = getTodayYYYYMMDD();
        const todayRec = myVardiyalar.find(v => v.tarih === todayStr);

        if (todayRec && todayRec.cikis_saati && todayRec.cikis_saati !== '00:00:00' && todayRec.cikis_saati !== '00:00') {
          // Exit was completed (either by employee or by manager/HR)
          localStorage.removeItem('pdks_active_shift_id');
          localStorage.removeItem('pdks_active_shift_start');
          setIsShiftActive(false);
          setShiftStartTime(null);
          setActiveShiftRecordId(null);
        } else if (todayRec && todayRec.giris_saati && (!todayRec.cikis_saati || todayRec.cikis_saati === '00:00:00' || todayRec.cikis_saati === '00:00')) {
          // Check if shift has reached exit time according to employee's vardiya
          const startIso = todayRec.created_at || `${todayRec.tarih}T${todayRec.giris_saati}`;
          const isTodaySaturday = new Date().getDay() === 6;
          const targetCikisTime = getTargetCikisTime(activeUserShift, undefined, isTodaySaturday, saturdayConfig);
          const isOvertimeAuthorized = Boolean(currentEmployee?.id && overtimeAuthMap[currentEmployee.id]);
          const { isExpired, autoCloseTime } = checkIsShiftExpired(startIso, targetCikisTime, isOvertimeAuthorized, 0);

          if (isExpired) {
            pdksService.updateVardiya(todayRec.id, {
              cikis_saati: autoCloseTime,
              notlar: `Vardiya çıkış saati (${autoCloseTime}) dolduğu için sistem tarafından otomatik tamamlandı`
            }).catch(err => console.warn("Auto-close expired shift DB warning:", err));

            localStorage.removeItem('pdks_active_shift_id');
            localStorage.removeItem('pdks_active_shift_start');
            setIsShiftActive(false);
            setShiftStartTime(null);
            setActiveShiftRecordId(null);
          } else {
            setActiveShiftRecordId(todayRec.id);
            localStorage.setItem('pdks_active_shift_id', todayRec.id);
            setShiftStartTime(startIso);
            localStorage.setItem('pdks_active_shift_start', startIso);
            setIsShiftActive(true);
          }
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
            const diffMin = cMinutes - gMinutes;
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
      } catch (error) {
        console.error("Failed to load shift history from database:", error);
        // Fallback to local storage
        const savedHistory = localStorage.getItem('pdks_personal_history');
        if (savedHistory) {
          setLocalHistory(JSON.parse(savedHistory));
        }
      }
    } else {
      // Fallback to local storage if no currentEmployee yet
      const savedHistory = localStorage.getItem('pdks_personal_history');
      if (savedHistory) {
        setLocalHistory(JSON.parse(savedHistory));
      }
    }
  }, [currentEmployee?.id]);

  useEffect(() => {
    loadShiftHistory();
    window.addEventListener('humanius_shifts_updated', loadShiftHistory);
    window.addEventListener('storage', loadShiftHistory);
    return () => {
      window.removeEventListener('humanius_shifts_updated', loadShiftHistory);
      window.removeEventListener('storage', loadShiftHistory);
    };
  }, [loadShiftHistory]);

  // Update timer ticks while shift is active
  useEffect(() => {
    let intervalId: any;
    if (isShiftActive && shiftStartTime) {
      const isTodaySaturday = new Date().getDay() === 6;
      const targetCikisTime = getTargetCikisTime(activeUserShift, undefined, isTodaySaturday, saturdayConfig);
      const startMs = new Date(shiftStartTime).getTime();
      
      intervalId = setInterval(() => {
        const now = new Date();
        const diffMs = now.getTime() - startMs;
        const totalSecs = Math.floor(diffMs / 1000);

        const isOvertimeAuthorized = Boolean(currentEmployee?.id && overtimeAuthMap[currentEmployee.id]);
        const { isExpired, autoCloseTime } = checkIsShiftExpired(shiftStartTime, targetCikisTime, isOvertimeAuthorized, 0);

        if (isExpired) {
          if (activeShiftRecordId) {
            pdksService.updateVardiya(activeShiftRecordId, {
              cikis_saati: autoCloseTime,
              notlar: `Vardiya çıkış saati (${autoCloseTime}) dolduğu için sistem tarafından otomatik tamamlandı`
            }).catch(err => console.warn("Auto-end shift error:", err));
          }
          localStorage.removeItem('pdks_active_shift_id');
          localStorage.removeItem('pdks_active_shift_start');
          setIsShiftActive(false);
          setShiftStartTime(null);
          setActiveShiftRecordId(null);
          setTimerText('00:00:00');
          stopWatchingLocation();
          return;
        }

        const hours = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
        const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
        const secs = (totalSecs % 60).toString().padStart(2, '0');
        setTimerText(`${hours}:${mins}:${secs}`);
      }, 1000);
    } else {
      setTimerText('00:00:00');
    }
    return () => clearInterval(intervalId);
  }, [isShiftActive, shiftStartTime, activeUserShift?.end_time, activeShiftRecordId, currentEmployee?.id, overtimeAuthMap, saturdayConfig]);

  // Periodic Shift & Tolerance Push Notification Monitor
  useEffect(() => {
    const checkShiftNotifications = () => {
      if (!notificationService.isSupported() || notificationService.getPermission() !== 'granted') {
        return;
      }

      const now = new Date();
      const isTodaySaturday = now.getDay() === 6;
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const shiftStartStr = (activeUserShift?.start_time && activeUserShift.start_time !== '00:00')
        ? activeUserShift.start_time
        : (isTodaySaturday && saturdayConfig?.isSaturdayWork ? (saturdayConfig.startTime || '08:30') : '08:30');
      const shiftEndStr = getTargetCikisTime(activeUserShift, undefined, isTodaySaturday, saturdayConfig);
      const toleranceMin = (activeUserShift?.tolerance_minutes !== undefined && activeUserShift?.tolerance_minutes !== null)
        ? Math.max(0, Number(activeUserShift.tolerance_minutes))
        : (isTodaySaturday && saturdayConfig?.isSaturdayWork ? Math.max(0, Number(saturdayConfig.toleranceMinutes ?? 15)) : 15);

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
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationErrorMsg('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }

    setLocationStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocationStatus('success');
      },
      (error) => {
        if (error.code === 1) {
          console.warn('Konum izni verilmedi (Kullanıcı tercihi).');
        } else {
          console.warn('Konum uyarısı:', error.message);
        }
        setLocationStatus('denied');
        setLocationErrorMsg('Konum izni verilmedi. İşleminize konum bilgisi eklenmeden devam edilebilir.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
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

  // Active selected office
  const activeOffice = React.useMemo<CompanyOfficeLocation>(() => {
    const listToUse = visibleOfficeLocations.length > 0 ? visibleOfficeLocations : officeLocations;
    if (listToUse.length > 0) {
      const found = listToUse.find((l) => l.id === selectedOfficeId);
      if (found) return found;
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
  }, [visibleOfficeLocations, officeLocations, selectedOfficeId, companyDetails, companyCoords, geofenceRadius, resolvedCompanyId]);

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
    if (!window.confirm(`"${name}" konumunu silmek istediğinize emin misiniz?`)) return;
    try {
      await companyService.deleteOfficeLocation(locId, resolvedCompanyId);
      await loadOfficeLocations();
      alert(`"${name}" konumu silindi.`);
    } catch (err: any) {
      console.error(err);
      alert('Silme sırasında hata oluştu: ' + (err?.message || err));
    }
  };

  // Start Shift Handler
  const handleStartShift = async () => {
    // 1. Double check position against selected active office
    if (distanceToSelectedOffice === null || distanceToSelectedOffice > (activeOffice?.radius_meters || geofenceRadius)) {
      alert(`Hata: Seçili ofis (${activeOffice?.name || 'Şirket'}) konumunun dışındasınız. Mesai sadece bulunduğunuz ofis sınırları içerisindeyken başlatılabilir!`);
      return;
    }

    const empId = currentEmployee?.id;
    if (!empId) {
      alert("Personel kaydınız sistemde bulunamadı. Lütfen İK yöneticinizle iletişime geçin.");
      return;
    }

    try {
      const now = new Date();
      const startIso = now.toISOString();
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
      const dateStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
      
      // Calculate delay based on selected shift's start time and tolerance
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const [sH, sM] = (activeUserShift?.start_time || '08:30').split(':').map(Number);
      const shiftTargetMin = (!isNaN(sH) && !isNaN(sM)) ? (sH * 60 + sM) : (9 * 60);
      const shiftTolerance = activeUserShift?.tolerance_minutes ?? 15;
      const isLate = currentMin > shiftTargetMin + shiftTolerance;
      const statusValue = isLate ? 'gec-kaldi' : 'zamaninda';
      const officeName = activeOffice?.name || 'Ofis';

      // Sync with Supabase if company is available
      const shiftCompId = currentEmployee?.company_id || resolvedCompanyId || profile?.company_id;
      if (shiftCompId) {
        const payload: VardiyaInsert = {
          company_id: shiftCompId,
          employee_id: empId,
          tarih: dateStr,
          vardiya_tipi: 'tam-gun',
          giris_saati: timeStr,
          cikis_saati: null,
          durum: statusValue,
          notlar: `Tarayıcı GPS Doğrulandı: ${officeName} • Vardiya: ${activeUserShift?.name || 'Vardiya'} (${activeUserShift?.start_time || '08:30'}-${activeUserShift?.end_time || '18:00'})`
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

      setIsShiftActive(true);
      setShiftStartTime(startIso);
      localStorage.setItem('pdks_active_shift_start', startIso);
      
      // Start watching user location actively during the shift
      startWatchingLocation();
      
    } catch (err) {
      console.error("Mesai başlatma hatası:", err);
      alert("Mesai başlatılırken bir hata oluştu.");
    }
  };

  // End Shift Handler
  const handleEndShift = async (wasAutoEnded = false) => {
    if (!isShiftActive || !shiftStartTime) return;

    try {
      const now = new Date();
      const endIso = now.toISOString();
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
      const officeName = activeOffice?.name || 'Ofis';
      
      // 1. Update Database if activeShiftRecordId is valid
      if (activeShiftRecordId) {
        try {
          await pdksService.updateVardiya(activeShiftRecordId, {
            cikis_saati: timeStr,
            notlar: wasAutoEnded 
              ? `Konumdan uzaklaşıldığı için sistem tarafından otomatik sonlandırıldı (${officeName})`
              : `GPS Çıkış Eşleşti: ${officeName}`
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
              const diffMin = cMinutes - gMinutes;
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

      if (wasAutoEnded) {
        alert("Mesainiz konum sınırından uzaklaştığınız için otomatik olarak sonlandırıldı.");
      } else {
        alert("Mesainiz başarıyla sonlandırıldı (Çıkış yapıldı). İyi günler!");
      }
      
    } catch (err) {
      console.error("Mesai bitirme hatası:", err);
      alert("Mesai sonlandırılırken bir hata oluştu.");
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
    const isTodaySaturday = new Date().getDay() === 6;
    const cleanShifts = allCompanyShifts.filter(isNotSaturdayShift);
    const defaultShift = cleanShifts.find((s) => s.is_default) || cleanShifts[0] || VARSAYILAN_VARDIYALAR[0];

    const uncompletedToday = allShiftRecords.filter(r => 
      r.tarih === todayStr && 
      r.giris_saati && 
      (!r.cikis_saati || r.cikis_saati === '00:00:00' || r.cikis_saati === '00:00')
    );

    if (uncompletedToday.length === 0) {
      alert('Bugün için çıkış saati bekleyen aktif mesai kaydı bulunamadı.');
      return;
    }

    if (!window.confirm(`Bugün (${todayStr}) giriş yapmış ancak henüz çıkışı yapılmamış ${uncompletedToday.length} personelin mesaisi tanımlı vardiyalarına göre (Tarsus: 15:00 vb.) otomatik sonlandırılsın mı?`)) {
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

        const targetCikis = getTargetCikisTime(empShift, defaultShift?.id, isTodaySaturday, saturdayConfig);
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
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultOfficeName = officeLocations.find(l => l.is_default)?.name || officeLocations[0]?.name || 'Merkez Ofis';
    
    return employees.map(emp => {
      const extractOfficeName = (notes?: string | null) => {
        if (!notes) return defaultOfficeName;
        const match = notes.match(/(?:Doğrulandı|Eşleşti|Girişi|sonlandırıldı \()(?::\s*|\s*)([^,\)\.\n]+)/i);
        if (match && match[1]) {
          return match[1].trim();
        }
        if (notes.includes('Tarayıcı GPS') || notes.includes('GPS')) {
          return defaultOfficeName;
        }
        return notes;
      };

      // Resolve employee assigned shift (strictly isolate Saturday vs Weekday)
      const isTodaySaturday = new Date().getDay() === 6;
      const assignedShiftId = allShiftAssignments[emp.id] || ((emp as any).user_id && allShiftAssignments[(emp as any).user_id]);
      const cleanShifts = allCompanyShifts.filter(isNotSaturdayShift);
      const defaultShift = cleanShifts.find((s) => s.is_default) || cleanShifts[0] || VARSAYILAN_VARDIYALAR[0];
      let baseShift = assignedShiftId ? cleanShifts.find((s) => s.id === assignedShiftId) : null;

      // Eşleştirme: ID ile doğrudan atanmamışsa ofis / şube / departman / il / ilçe adına göre eşleştir (Örn: Tarsus)
      if (!baseShift) {
        const empLoc = emp.department || emp.ilce || emp.il || (emp as any).branch || (emp as any).city || (emp as any).office_name || '';
        if (empLoc) {
          baseShift = cleanShifts.find(s => 
            s.name.toLowerCase().includes(empLoc.toLowerCase()) || 
            (s.office_name && s.office_name.toLowerCase().includes(empLoc.toLowerCase()))
          );
        }
      }
      if (!baseShift) {
        baseShift = defaultShift;
      }

      // "vardıyada ne yazıyosa ona göre cıkış yapılsın"
      const targetCikis = getTargetCikisTime(baseShift, defaultShift?.id, isTodaySaturday, saturdayConfig);
      const isSaturdayOverride = isTodaySaturday && saturdayConfig?.isSaturdayWork && targetCikis === (saturdayConfig.endTime || '16:00');

      const empShift = isSaturdayOverride
        ? {
            ...baseShift,
            name: 'Cumartesi Mesaisi',
            start_time: saturdayConfig.startTime || '08:30',
            end_time: targetCikis,
            break_minutes: Number(saturdayConfig.breakMinutes ?? 30),
            tolerance_minutes: Number(saturdayConfig.toleranceMinutes ?? 15),
            color: '#f59e0b',
          }
        : {
            ...baseShift,
            end_time: targetCikis,
          };

      // 0. Check admin override first (in memory or localStorage)
      const memOverride = adminOverrides[emp.id];
      const savedOverride = memOverride || (() => {
        try {
          const s = localStorage.getItem(`humanius_pdks_override_${emp.id}`);
          return s ? JSON.parse(s) : null;
        } catch { return null; }
      })();

      if (savedOverride) {
        return {
          employee: emp,
          giris: savedOverride.giris || '-',
          cikis: savedOverride.cikis || '-',
          durum: savedOverride.durum || 'Zamanında',
          mesai: savedOverride.mesai || 0,
          officeName: savedOverride.officeName || (savedOverride.giris !== '-' ? defaultOfficeName : '-'),
          shift: empShift,
        };
      }

      // 1. Try to find a real record in allShiftRecords for today
      const realRecord = allShiftRecords.find(r => r.employee_id === emp.id && r.tarih === todayStr);
      
      if (realRecord) {
        const checkIn = realRecord.giris_saati;
        const checkOut = realRecord.cikis_saati;
        const officeName = checkIn ? extractOfficeName(realRecord.notlar) : '-';
        
        let status = 'Zamanında';
        if (!checkOut && checkIn) {
          status = 'Mesai Devam Ediyor';
        } else if (checkIn && checkOut) {
          const [hours, minutes] = checkIn.split(':').map(Number);
          const [sH, sM] = empShift.start_time.split(':').map(Number);
          const shiftStartTotal = sH * 60 + sM + empShift.tolerance_minutes;
          if (hours * 60 + minutes > shiftStartTotal) {
            status = 'Geç Kaldı';
          } else {
            status = 'Zamanında';
          }
        }
        
        let mesai = 0;
        if (checkIn && checkOut) {
          const [gH, gM] = checkIn.split(':').map(Number);
          const [cH, cM] = checkOut.split(':').map(Number);
          mesai = parseFloat(((cH * 60 + cM - (gH * 60 + gM)) / 60).toFixed(1));
          if (mesai < 0) mesai = 0;
        } else if (checkIn) {
          const [gH, gM] = checkIn.split(':').map(Number);
          const now = new Date();
          const curMin = now.getHours() * 60 + now.getMinutes();
          const diff = curMin - (gH * 60 + gM);
          if (diff > 0) {
            mesai = parseFloat((diff / 60).toFixed(1));
          }
        }
        
        return {
          employee: emp,
          giris: checkIn || '-',
          cikis: checkOut || '-',
          durum: status,
          mesai,
          officeName,
          shift: empShift,
        };
      }
      
      // 2. Try to find if they are on approved leave today
      const activeLeave = (izinTalepleri || []).find((t: any) => {
        if (t.employeeId !== emp.id || t.durum !== 'onaylandi') return false;
        const startStr = t.baslangicTarihi ? t.baslangicTarihi.split('T')[0] : '';
        const endStr = t.bitisTarihi ? t.bitisTarihi.split('T')[0] : '';
        return Boolean(startStr && endStr && todayStr >= startStr && todayStr <= endStr);
      });

      if (activeLeave) {
        const leaveTitle = getDevamKontroluIzinLabel(activeLeave.izinTuru || activeLeave.izin_turu, resolvedCompanyId);
        return {
          employee: emp,
          giris: '-',
          cikis: '-',
          durum: leaveTitle,
          isLeave: true,
          mesai: 0,
          officeName: '-',
          shift: empShift,
        };
      }
      
      // 3. For employees without today entry: display real empty values '-'
      return {
        employee: emp,
        giris: '-',
        cikis: '-',
        durum: 'Giriş Yapılmadı',
        mesai: 0,
        officeName: '-',
        shift: empShift,
      };
    });
  }, [employees, allShiftRecords, izinTalepleri, officeLocations, allCompanyShifts, allShiftAssignments, adminOverrides, saturdayConfig]);

  const filteredData = mockPdksData
    .filter((d) => {
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

    const companyName = companyDetails?.name || profile?.company_name || 'Humanius HRMS';
    printPdksDevamRaporuPdf({
      companyName,
      reportTitle: 'GÜNLÜK PERSONEL PDKS DEVAM VE VARDİYA ÇİZELGESİ',
      dateStr: new Date().toLocaleDateString('tr-TR'),
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

    const companyName = companyDetails?.name || profile?.company_name || 'Humanius';
    exportPdksToCsv(companyName, new Date().toLocaleDateString('tr-TR'), records);
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
              onClick={handleAutoEndShifts}
              className="flex items-center gap-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Bugün giriş yapmış personellerin mesaisini vardiya saatlerine göre (Tarsus 15:00 vb.) otomatik tamamla"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Mesaileri Kapat
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
                  {isShiftActive && shiftStartTime && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Başlangıç Saati: {new Date(shiftStartTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {/* Today's Completed Shift Summary (if shift is completed) */}
                {(() => {
                  const todayStr = getTodayYYYYMMDD();
                  const todayRec = (allShiftRecords || []).find(
                    (r) => r.employee_id === currentEmployee?.id && r.tarih === todayStr
                  );
                  if (!isShiftActive && todayRec?.giris_saati && todayRec?.cikis_saati) {
                    const [gH, gM] = todayRec.giris_saati.split(':').map(Number);
                    const [cH, cM] = todayRec.cikis_saati.split(':').map(Number);
                    const diffMin = (cH * 60 + cM) - (gH * 60 + gM);
                    const durationStr = diffMin > 0 ? `${parseFloat((diffMin / 60).toFixed(1))} saat` : '-';
                    return (
                      <div className="w-full max-w-sm bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 text-left shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-950">Bugünkü Mesainiz Tamamlandı</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Çıkış Yapıldı
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-700 bg-white/90 p-2.5 rounded-xl border border-emerald-100 text-center">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-medium">Giriş</span>
                            <span className="font-mono font-bold text-gray-800">{todayRec.giris_saati.substring(0, 5)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 block font-medium">Çıkış</span>
                            <span className="font-mono font-bold text-emerald-700">{todayRec.cikis_saati.substring(0, 5)}</span>
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
                        value={activeUserShift?.id || ''}
                        onChange={(e) => {
                          const selected = visibleShiftsForEmployee.find((s) => s.id === e.target.value);
                          if (selected) {
                            setActiveUserShift(selected);
                            if (currentEmployee?.id) {
                              shiftService.assignShift(resolvedCompanyId || 'default', currentEmployee.id, selected.id);
                            }
                          }
                        }}
                        className="w-full bg-white border border-indigo-200 hover:border-indigo-400 focus:border-indigo-600 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 outline-none transition-all shadow-xs cursor-pointer"
                      >
                        {visibleShiftsForEmployee.map((s) => {
                          const off = inferOfficeForShift(s, officeLocations);
                          const offName = s.office_name || off?.office_name;
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name} {offName ? `[📍 ${offName}]` : ''} ({s.start_time} - {s.end_time}) • Mola: {s.break_minutes}dk
                            </option>
                          );
                        })}
                      </select>
                      <div className="flex items-center justify-between text-[11px] text-indigo-900/80 px-1 font-medium">
                        <span>Mola: <strong>{activeUserShift.break_minutes} dk</strong></span>
                        <span>•</span>
                        <span>Tolerans: <strong>{activeUserShift.tolerance_minutes} dk</strong></span>
                        <span>•</span>
                        <span className="font-mono font-bold text-indigo-700">{activeUserShift.start_time} - {activeUserShift.end_time}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: activeUserShift.color || '#3b82f6' }}
                        />
                        <div>
                          <p className="text-xs font-bold text-indigo-950">
                            {activeUserShift.name}{' '}
                            {(() => {
                              const off = inferOfficeForShift(activeUserShift, officeLocations);
                              const offName = activeUserShift.office_name || off?.office_name;
                              return offName ? `[📍 ${offName}]` : '';
                            })()}
                          </p>
                          <p className="text-[11px] font-mono text-indigo-700 font-medium">
                            {activeUserShift.start_time} - {activeUserShift.end_time}
                          </p>
                        </div>
                      </div>
                      <div className="text-[10px] text-indigo-800 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {activeUserShift.break_minutes} dk mola
                      </div>
                    </div>
                  )}
                </div>

                {/* Office Location Selector */}
                <div className="w-full max-w-sm bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Bulunduğunuz Ofis / Şube:
                    </label>
                    {!isHrOrAdmin && currentEmployee?.il ? (
                      <span className="text-[11px] bg-white text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-200 shadow-xs flex items-center gap-1">
                        {hasCityOffices
                          ? `📍 ${currentEmployee.il} (${visibleOfficeLocations.length} Ofis)`
                          : `📍 ${currentEmployee.il} (Şehirde Ofis Yok • Tüm Ofisler)`}
                      </span>
                    ) : isHrOrAdmin && isManagement ? (
                      <button
                        onClick={handleOpenNewOffice}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-xs"
                      >
                        <Plus className="w-3 h-3" /> Yeni Ofis Ekle
                      </button>
                    ) : null}
                  </div>
                  <select
                    value={selectedOfficeId}
                    onChange={(e) => setSelectedOfficeId(e.target.value)}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
                  >
                    {visibleOfficeLocations.map((loc) => {
                      const dist = userCoords ? Math.round(getDistance(userCoords.lat, userCoords.lng, loc.lat, loc.lng)) : null;
                      const distStr = dist !== null ? (dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`) : '';
                      const inRange = dist !== null && dist <= loc.radius_meters;
                      const locInfo = loc.il ? `[${loc.il}${loc.ilce ? ` / ${loc.ilce}` : ''}] ` : '';
                      return (
                        <option key={loc.id} value={loc.id}>
                          🏢 {loc.name} {locInfo}{distStr ? `(${distStr} • ${inRange ? '✅ Ofis İçi' : '❌ Alan Dışı'})` : ''}
                        </option>
                      );
                    })}
                    {visibleOfficeLocations.length === 0 && (
                      <option value="default">
                        🏢 {currentEmployee?.il ? `${currentEmployee.il} Bölgesi Ofisi Bulunamadı` : `${companyDetails?.name || 'Şirket'} Ana Ofisi`}
                      </option>
                    )}
                  </select>
                </div>

                {/* Status Indicator */}
                <div className={`p-4 rounded-2xl border w-full max-w-sm transition-all flex items-center gap-3 ${
                  isWithinGeofence
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  {isWithinGeofence ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wide">
                      {isWithinGeofence ? `${activeOffice.name.toUpperCase()} LOKASYONUNDASINIZ` : "OFİS ALANI DIŞINDASINIZ"}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                      {isWithinGeofence 
                        ? `GPS Doğrulaması Başarılı • ${activeOffice.name}${activeOffice.il ? ` (${activeOffice.il}${activeOffice.ilce ? ` / ${activeOffice.ilce}` : ''})` : ''} (Uzaklık: ${distanceToSelectedOffice}m • Sınır: ${activeOffice.radius_meters}m)`
                        : distanceToSelectedOffice !== null 
                          ? `"${activeOffice.name}${activeOffice.il ? ` (${activeOffice.il}${activeOffice.ilce ? ` / ${activeOffice.ilce}` : ''})` : ''}" konumuna uzaklığınız ${distanceToSelectedOffice >= 1000 ? `${(distanceToSelectedOffice / 1000).toFixed(1)} km` : `${distanceToSelectedOffice} metre`} (İzin verilen sınır: ${activeOffice.radius_meters}m). Farklı bir ofisteyseniz lütfen yukarıdan ofisinizi seçiniz.`
                          : "Konum doğrulanıyor, lütfen tarayıcınızdan konum izni veriniz..."
                      }
                    </p>
                  </div>
                </div>

                {/* Primary Button */}
                <div className="w-full max-w-xs">
                  {isShiftActive ? (
                    <button
                      onClick={() => handleEndShift(false)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-red-100 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <Square className="w-5 h-5 fill-white" />
                      Mesaiyi Bitir (Çıkış)
                    </button>
                  ) : (
                    <button
                      onClick={handleStartShift}
                      disabled={!isWithinGeofence}
                      className={`w-full font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all transform ${
                        isWithinGeofence
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-100 hover:-translate-y-0.5 cursor-pointer'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-80'
                      }`}
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Mesaiyi Başlat (Giriş)
                    </button>
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

            {/* Şirket Ofis & Şube Konumları Panel (Sadece Yöneticilere / Yetkililere Gösterilir) */}
            {isManagement && (
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-2xl p-5 text-white space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="font-bold text-sm">Şirket Ofis & Şubeleri</h3>
                      {!isHrOrAdmin && currentEmployee?.il ? (
                        <p className="text-[10px] text-indigo-300">
                          {hasCityOffices
                            ? `📍 ${currentEmployee.il} Bölgesi (${visibleOfficeLocations.length} Ofis)`
                            : `📍 ${currentEmployee.il} (Şehirde Ofis Yok • Tüm Ofisler - ${visibleOfficeLocations.length})`}
                        </p>
                      ) : (
                        <p className="text-[10px] text-indigo-300">Tüm Şirket Ofisleri ({officeLocations.length})</p>
                      )}
                    </div>
                  </div>
                  {isHrOrAdmin && (
                    <button
                      onClick={handleOpenNewOffice}
                      className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Plus className="w-3 h-3" /> Ofis Ekle
                    </button>
                  )}
                </div>
                
                {/* Registered Offices List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {visibleOfficeLocations.map((loc) => {
                    const dist = userCoords ? Math.round(getDistance(userCoords.lat, userCoords.lng, loc.lat, loc.lng)) : null;
                    const isSelected = loc.id === selectedOfficeId;
                    const inRange = dist !== null && dist <= loc.radius_meters;

                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedOfficeId(loc.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-800/60 border-indigo-400 shadow-sm' 
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
                                className="p-1 text-indigo-300 hover:text-white hover:bg-indigo-700/50 rounded"
                                title="Düzenle"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteOffice(loc.id, loc.name)}
                                className="p-1 text-red-400 hover:text-red-200 hover:bg-red-900/40 rounded"
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
              <button
                onClick={() => setShowVardiyaModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Sliders className="w-4 h-4" />
                Vardiyalar & Personel Atamaları
              </button>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Personel ara (Ad, Soyad, TC, Departman, Pozisyon)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="flex items-center gap-1.5 border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title={sortOrder === 'asc' ? 'A → Z Sıralı (Tersine çevirmek için tıklayın: Z → A)' : 'Z → A Sıralı (Düz çevirmek için tıklayın: A → Z)'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>{sortOrder === 'asc' ? 'A → Z Sırala' : 'Z → A Sırala'}</span>
                </button>
                {onNavigateToPuantaj && (
                  <button
                    onClick={onNavigateToPuantaj}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    title="Aylık Personel Puantaj ve Çalışma Cetveline Git"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-200" />
                    Aylık Puantaj Cetveli ➡️
                  </button>
                )}
                <button
                  onClick={handlePrintPdf}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Tüm Personellerin Günlük PDKS Devam ve Vardiya Çizelgesini PDF Olarak Çıktı Al"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  PDKS Çıktısı Al (PDF)
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

            {/* Şirket Seçici (Çoklu Şirket Yönetimi) - Yalnızca Süper Yöneticilere Gösterilir */}
            {isSuperAdmin && companies && companies.length > 0 && onCompanyChange && (
              <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100 flex-wrap">
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
              <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-gray-100">
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
                    <td className="px-6 py-4 text-center font-mono font-medium text-gray-800">{d.giris}</td>
                    <td className="px-6 py-4 text-center font-mono font-medium text-gray-800">{d.cikis}</td>
                    <td className="px-6 py-4 text-center">
                      {d.giris !== '-' && d.officeName && d.officeName !== '-' ? (
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
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        d.durum === 'Zamanında' ? 'bg-green-100 text-green-700' :
                        d.durum === 'Geç Kaldı' ? 'bg-yellow-100 text-yellow-700' :
                        d.durum === 'Mesai Devam Ediyor' ? 'bg-indigo-100 text-indigo-700' :
                        d.durum === 'Giriş Yapılmadı' || d.durum === 'Devamsız' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {d.durum}
                      </span>
                    </td>
                    {isManagement && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setEditEmpModal(d);
                            setEditGiris(d.giris === '-' ? (d.shift?.start_time || '08:30').substring(0, 5) : d.giris.substring(0, 5));
                            setEditCikis(d.cikis === '-' ? (d.shift?.end_time || '18:00').substring(0, 5) : d.cikis.substring(0, 5));
                            setEditOfficeName(d.officeName !== '-' ? d.officeName : (officeLocations.find(l => l.is_default)?.name || officeLocations[0]?.name || 'Merkez Ofis'));
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
                  onChange={(e) => setEditOfficeName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {(isHrOrAdmin ? officeLocations : visibleOfficeLocations).map((l) => (
                    <option key={l.id} value={l.name}>
                      🏢 {l.name} {l.il ? `(${l.il}${l.ilce ? ` / ${l.ilce}` : ''})` : ''}
                    </option>
                  ))}
                  {(isHrOrAdmin ? officeLocations : visibleOfficeLocations).length === 0 && (
                    <option value="Merkez Ofis">🏢 Merkez Ofis</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Giriş Saati</label>
                  <input
                    type="time"
                    value={editGiris}
                    onChange={(e) => setEditGiris(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Çıkış Saati</label>
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
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!editEmpModal) return;
                  const cleanGiris = editGiris ? editGiris.substring(0, 5) : '08:30';
                  const todayStr = getTodayYYYYMMDD();
                  const targetCompanyId = normalizeCompanyId(editEmpModal.employee.company_id || resolvedCompanyId);

                  const overrideObj = {
                    giris: cleanGiris,
                    cikis: null,
                    durum: 'Mesai Devam Ediyor',
                    mesai: 0,
                    officeName: editOfficeName || 'Merkez Ofis',
                  };

                  localStorage.setItem(`humanius_pdks_override_${editEmpModal.employee.id}`, JSON.stringify(overrideObj));
                  setAdminOverrides((prev) => ({ ...prev, [editEmpModal.employee.id]: overrideObj }));

                  try {
                    const rawPuantajOverrides = localStorage.getItem('humanius_puantaj_overrides');
                    const pOverrides = rawPuantajOverrides ? JSON.parse(rawPuantajOverrides) : {};
                    delete pOverrides[`${editEmpModal.employee.id}_${todayStr}`];
                    localStorage.setItem('humanius_puantaj_overrides', JSON.stringify(pOverrides));
                  } catch (e) {}

                  let savedDbRecord: any = null;
                  if (targetCompanyId && editEmpModal.employee.id) {
                    try {
                      savedDbRecord = await pdksService.createVardiya({
                        company_id: targetCompanyId,
                        employee_id: editEmpModal.employee.id,
                        tarih: todayStr,
                        giris_saati: cleanGiris,
                        cikis_saati: null,
                        vardiya_tipi: 'tam-gun',
                        durum: 'zamaninda',
                        notlar: `Yönetici Girişi (Mesai Açık): ${editOfficeName || 'Merkez Ofis'}`
                      });
                    } catch (e) {
                      console.error("Vardiya veritabanı çıkış sıfırlama hatası:", e);
                    }
                  }

                  const newRecord = savedDbRecord || {
                    id: `v-edit-${Date.now()}`,
                    company_id: targetCompanyId,
                    employee_id: editEmpModal.employee.id,
                    tarih: todayStr,
                    giris_saati: cleanGiris,
                    cikis_saati: null,
                    vardiya_tipi: 'tam-gun',
                    durum: 'zamaninda',
                    notlar: `Yönetici Girişi (Mesai Açık): ${editOfficeName || 'Merkez Ofis'}`
                  };

                  setAllShiftRecords(prev => {
                    const idx = prev.findIndex(r => r.employee_id === editEmpModal.employee.id && r.tarih === todayStr);
                    if (idx >= 0) {
                      const next = [...prev];
                      next[idx] = newRecord;
                      return next;
                    }
                    return [newRecord, ...prev];
                  });

                  setEditEmpModal(null);
                  setEditGiris('08:30');
                  setEditCikis('');
                  window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
                  window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                title="Çıkış saatini tamamen kaldırarak (NULL) personeli mesai devam ediyor durumuna getirir"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Çıkış Saatini Sıfırla (Mesaiye Döndür / NULL Yap)
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditEmpModal(null)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!editEmpModal) return;
                    const cleanGiris = editGiris ? editGiris.substring(0, 5) : '08:30';
                    const cleanCikis = (editCikis && editCikis.trim() !== '') ? editCikis.substring(0, 5) : null;

                    // Calculate new status
                    const [gH, gM] = cleanGiris.split(':').map(Number);
                    const empShift = editEmpModal.shift || activeUserShift;
                    const [sGh, sGm] = (empShift.start_time || '08:30').split(':').map(Number);
                    
                    const actualMin = gH * 60 + gM;
                    const shiftMin = sGh * 60 + sGm;
                    const lateDiff = actualMin - shiftMin;
                    const tolerance = empShift.tolerance_minutes ?? 15;
                    
                    const newDurum = lateDiff > tolerance ? 'Geç Kaldı' : 'Zamanında';
                    let diffHours = 0;
                    if (cleanCikis) {
                      const [cH, cM] = cleanCikis.split(':').map(Number);
                      diffHours = parseFloat((((cH * 60 + cM) - actualMin) / 60).toFixed(1));
                    }

                    const todayStr = getTodayYYYYMMDD();
                    const overrideObj = {
                      giris: cleanGiris,
                      cikis: cleanCikis,
                      durum: cleanCikis ? newDurum : 'Mesai Devam Ediyor',
                      mesai: diffHours > 0 ? diffHours : 0,
                      officeName: editOfficeName || 'Merkez Ofis',
                    };

                    localStorage.setItem(`humanius_pdks_override_${editEmpModal.employee.id}`, JSON.stringify(overrideObj));
                    setAdminOverrides((prev) => ({ ...prev, [editEmpModal.employee.id]: overrideObj }));

                    // Puantaj Cetveli Manuel Düzeltmelerine (humanius_puantaj_overrides) Doğrudan Senkronize Et
                    try {
                      const rawPuantajOverrides = localStorage.getItem('humanius_puantaj_overrides');
                      const pOverrides = rawPuantajOverrides ? JSON.parse(rawPuantajOverrides) : {};
                      if (cleanCikis) {
                        pOverrides[`${editEmpModal.employee.id}_${todayStr}`] = {
                          kod: 'Ç',
                          giris: cleanGiris,
                          cikis: cleanCikis,
                          notlar: `Yönetici Girişi: ${editOfficeName || 'Merkez Ofis'}`,
                          kodAciklama: `Fiili Çalışma (${cleanGiris}-${cleanCikis})`
                        };
                      } else {
                        delete pOverrides[`${editEmpModal.employee.id}_${todayStr}`];
                      }
                      localStorage.setItem('humanius_puantaj_overrides', JSON.stringify(pOverrides));
                    } catch (e) {
                      console.error('Puantaj override senkronizasyon hatası:', e);
                    }

                  const targetCompanyId = normalizeCompanyId(editEmpModal.employee.company_id || resolvedCompanyId);

                  // Always record shift to pdksService and Supabase
                  let savedDbRecord: any = null;
                  if (targetCompanyId && editEmpModal.employee.id) {
                    try {
                      savedDbRecord = await pdksService.createVardiya({
                        company_id: targetCompanyId,
                        employee_id: editEmpModal.employee.id,
                        tarih: todayStr,
                        giris_saati: cleanGiris,
                        cikis_saati: cleanCikis,
                        vardiya_tipi: 'tam-gun',
                        durum: newDurum === 'Zamanında' ? 'zamaninda' : 'gec-kaldi',
                        notlar: `Yönetici Girişi: ${editOfficeName || 'Merkez Ofis'}`
                      });
                    } catch (e) {
                      console.error("Vardiya veritabanı kayıt hatası:", e);
                    }
                  }

                  const newRecord = savedDbRecord || {
                    id: `v-edit-${Date.now()}`,
                    company_id: targetCompanyId,
                    employee_id: editEmpModal.employee.id,
                    tarih: todayStr,
                    giris_saati: cleanGiris,
                    cikis_saati: cleanCikis,
                    vardiya_tipi: 'tam-gun',
                    durum: newDurum === 'Zamanında' ? 'zamaninda' : 'gec-kaldi',
                    notlar: `Yönetici Girişi: ${editOfficeName || 'Merkez Ofis'}`
                  };
                  setAllShiftRecords((prev) => [newRecord, ...prev.filter(r => !(r.employee_id === editEmpModal.employee.id && r.tarih === todayStr))]);

                  // Puantaj cetveli ve diğer bileşenlerin anında güncellenmesi için custom event fırlat
                  window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
                  window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));

                  setEditEmpModal(null);
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm"
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
