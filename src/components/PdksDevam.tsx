import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pdksService, VardiyaInsert } from '../services/pdksService';
import { companyService } from '../services/companyService';
import {
  Clock, LogIn, LogOut, Search, Filter, MapPin, Fingerprint,
  Compass, Play, Square, AlertCircle, CheckCircle2, ShieldAlert,
  Sliders, Navigation, CheckCircle, RefreshCw
} from 'lucide-react';
import type { Employee } from '../types';

interface PdksDevamProps {
  employees: Employee[];
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

const PdksDevam: React.FC<PdksDevamProps> = ({ employees }) => {
  const { profile, appRole } = useAuth();
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole);

  const [activeTab, setActiveTab] = useState<'personal' | 'team'>(isManagement ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');

  const currentEmployee = isManagement
    ? (employees.find((emp) => emp.email?.toLowerCase() === profile?.email?.toLowerCase()) || 
       employees.find((emp) => emp.name?.toLowerCase() === profile?.full_name?.toLowerCase()))
    : employees[0];

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
  const [distanceToCompany, setDistanceToCompany] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'success' | 'denied' | 'error'>('pending');
  const [locationErrorMsg, setLocationErrorMsg] = useState('');
  
  // Geolocation watch ID ref
  const watchIdRef = useRef<number | null>(null);

  const [companyDetails, setCompanyDetails] = useState<any>(null);

  // Load state and history from localStorage and database on init
  useEffect(() => {
    // Read local storage for active session
    const savedActiveId = localStorage.getItem('pdks_active_shift_id');
    const savedStart = localStorage.getItem('pdks_active_shift_start');
    
    if (savedActiveId && savedStart) {
      setIsShiftActive(true);
      setShiftStartTime(savedStart);
      setActiveShiftRecordId(savedActiveId);
    }

    // Request initial position
    requestLocation();

    // Load company coordinates from database
    if (profile?.company_id) {
      companyService.getById(profile.company_id).then(comp => {
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
  }, [profile?.company_id]);

  // Load shift history from database when currentEmployee is found
  useEffect(() => {
    const loadShiftHistory = async () => {
      if (currentEmployee?.id) {
        try {
          const allVardiyalar = await pdksService.getVardiyalar();
          // Filter to only include records for the current employee
          const myVardiyalar = allVardiyalar.filter(v => v.employee_id === currentEmployee.id);
          // Map to localHistory format
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
    };
    loadShiftHistory();
  }, [currentEmployee?.id]);

  // Update timer ticks while shift is active
  useEffect(() => {
    let intervalId: any;
    if (isShiftActive && shiftStartTime) {
      const startMs = new Date(shiftStartTime).getTime();
      intervalId = setInterval(() => {
        const diffMs = Date.now() - startMs;
        const totalSecs = Math.floor(diffMs / 1000);
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
        console.error('Location error:', error);
        setLocationStatus('denied');
        setLocationErrorMsg('Konum izni reddedildi. Mesai başlatmak için konum erişimine izin vermelisiniz.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Watch position when shift starts
  const startWatchingLocation = () => {
    if (watchIdRef.current !== null) return;

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("Watch position error:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const stopWatchingLocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Compute distance whenever user coords or company coords change
  useEffect(() => {
    if (userCoords) {
      const dist = getDistance(userCoords.lat, userCoords.lng, companyCoords.lat, companyCoords.lng);
      setDistanceToCompany(Math.round(dist));
    } else {
      setDistanceToCompany(null);
    }
  }, [userCoords, companyCoords]);

  // Handle automatic check-out if user leaves the boundary while shift is active
  useEffect(() => {
    if (isShiftActive && distanceToCompany !== null && distanceToCompany > geofenceRadius) {
      // Auto logout or warning
      console.warn("User has walked outside the geofence boundary!");
      // We automatically end the shift to prevent system manipulation
      handleEndShift(true); // pass true for auto-end due to departure
    }
  }, [distanceToCompany, isShiftActive]);

  // Start Shift Handler
  const handleStartShift = async () => {
    // 1. Double check position
    if (distanceToCompany === null || distanceToCompany > geofenceRadius) {
      alert("Hata: Şirket konumunun dışındasınız. Mesai sadece şirket sınırları içerisindeyken başlatılabilir!");
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
      
      // Calculate delay based on target start 09:00
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const targetMin = 9 * 60; // 09:00 AM
      const isLate = currentMin > targetMin + 15; // 15 mins grace period
      const statusValue = isLate ? 'gec-kaldi' : 'zamaninda';

      // Sync with Supabase if profile is available
      if (profile?.company_id) {
        const payload: VardiyaInsert = {
          company_id: profile.company_id,
          employee_id: empId,
          tarih: dateStr,
          vardiya_tipi: 'tam-gun',
          giris_saati: timeStr,
          cikis_saati: null,
          durum: statusValue,
          notlar: 'Tarayıcı GPS Konum Eşleşti'
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
      
      // 1. Update Database if activeShiftRecordId is valid
      if (activeShiftRecordId) {
        try {
          await pdksService.updateVardiya(activeShiftRecordId, {
            cikis_saati: timeStr,
            notlar: wasAutoEnded 
              ? 'Konumdan uzaklaşıldığı için sistem tarafından otomatik sonlandırıldı'
              : 'GPS Çıkış Eşleşti'
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
    if (userCoords && profile?.company_id && companyDetails) {
      const lat = userCoords.lat;
      const lng = userCoords.lng;
      const parsed = parseCompanyCoords(companyDetails.address);
      const newAddress = formatCompanyAddressWithCoords(lat, lng, parsed.cleanAddress);
      
      try {
        await companyService.update(profile.company_id, { address: newAddress });
        setCompanyCoords({ lat, lng });
        setCompanyDetails({ ...companyDetails, address: newAddress });
        alert(`Şirket lokasyonu tarayıcı konumunuza (${lat.toFixed(5)}, ${lng.toFixed(5)}) eşitlendi ve veritabanına kalıcı olarak kaydedildi! Artık bu şirketteki tüm çalışanlar için giriş doğrulaması bu konuma göre yapılacaktır.`);
      } catch (err) {
        console.error("Error saving company location:", err);
        alert("Şirket konumu kaydedilirken bir hata oluştu.");
      }
    } else if (!userCoords) {
      alert("Mevcut konumunuz henüz alınamadı. Lütfen konum servisinin aktif olmasını bekleyin.");
    }
  };

  // -------------------------------------------------------------
  // TEAM MONITORING (MANAGER VIEW) DATA
  const mockPdksData = employees.map(emp => {
    const isLate = Math.random() > 0.8;
    const isAbsent = Math.random() > 0.95;
    return {
      employee: emp,
      giris: isAbsent ? '-' : (isLate ? '09:15' : '08:50'),
      cikis: isAbsent ? '-' : '18:05',
      durum: isAbsent ? 'Devamsız' : (isLate ? 'Geç Kaldı' : 'Zamanında'),
      mesai: isAbsent ? 0 : 9,
    };
  });

  const filteredData = mockPdksData.filter(d =>
    !searchTerm || d.employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isWithinGeofence = distanceToCompany !== null && distanceToCompany <= geofenceRadius;

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

                {/* Status Indicator */}
                <div className={`p-4 rounded-xl border w-full max-w-sm transition-all flex items-center gap-3 ${
                  isWithinGeofence
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {isWithinGeofence ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wide">
                      {isWithinGeofence ? "ŞİRKET LOKASYONUNDASINIZ" : "ŞİRKET DIŞINDASINIZ"}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {isWithinGeofence 
                        ? `Güvenli alandasınız. Mesainizi başlatabilirsiniz (Uzaklık: ${distanceToCompany}m)`
                        : distanceToCompany !== null 
                          ? `Mesai başlatılamaz. Şirkete olan uzaklığınız ${distanceToCompany} metre (Limit: ${geofenceRadius}m).`
                          : "Konum doğrulanıyor, lütfen bekleyin..."
                      }
                    </p>
                  </div>
                </div>

                {/* Primary Button */}
                <div className="w-full max-w-xs">
                  {isShiftActive ? (
                    <button
                      onClick={() => handleEndShift(false)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-red-100 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
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
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-100 hover:-translate-y-0.5'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
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
                        <td className="px-4 py-3.5 text-center text-gray-600">{item.sure} Saat</td>
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
                      Mesafe: <strong className="text-indigo-600 font-bold">{distanceToCompany !== null ? `${distanceToCompany} metre` : 'Hesaplanıyor...'}</strong>
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${userCoords.lat},${userCoords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Google Maps'te Aç
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

            {/* Şirket Ofis Konumu Settings Panel */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white space-y-4 shadow-md">
              <div className="flex items-center gap-2 border-b border-indigo-700 pb-3">
                <MapPin className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Şirket Ofis Konumu</h3>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-indigo-800 pb-1.5">
                  <span className="text-indigo-200">Enlem (Lat):</span>
                  <span className="font-semibold font-mono">{companyCoords.lat.toFixed(5)}</span>
                </div>
                <div className="flex justify-between border-b border-indigo-800 pb-1.5">
                  <span className="text-indigo-200">Boylam (Lng):</span>
                  <span className="font-semibold font-mono">{companyCoords.lng.toFixed(5)}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-indigo-200">Güvenlik Sınırı:</span>
                  <span className="font-semibold">{geofenceRadius} metre</span>
                </div>
              </div>

              {isManagement && (
                <div className="border-t border-indigo-800 pt-3 mt-1 text-center space-y-2.5">
                  <p className="text-[10px] text-indigo-200 text-left leading-normal">
                    Şirket yöneticisi ve İK olarak, ofisin merkez noktasını mevcut GPS konumunuza eşitleyerek güncelleyebilirsiniz.
                  </p>
                  <button
                    onClick={setOfficeToCurrentLocation}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md transform active:scale-95"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Ofis Konumunu Mevcut Konumuma Eşitle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Team Monitoring Tab (Only visible to Management) */
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Personel ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <Filter className="w-4 h-4" />
              Filtrele
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Personel</th>
                  <th className="px-6 py-4">Departman</th>
                  <th className="px-6 py-4 text-center">Giriş Saati</th>
                  <th className="px-6 py-4 text-center">Çıkış Saati</th>
                  <th className="px-6 py-4 text-center">Çalışma Süresi</th>
                  <th className="px-6 py-4 text-right">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{d.employee.name}</td>
                    <td className="px-6 py-4 text-gray-600">{d.employee.department}</td>
                    <td className="px-6 py-4 text-center font-medium text-gray-800">{d.giris}</td>
                    <td className="px-6 py-4 text-center font-medium text-gray-800">{d.cikis}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{d.mesai} Saat</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        d.durum === 'Zamanında' ? 'bg-green-100 text-green-700' :
                        d.durum === 'Geç Kaldı' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {d.durum}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdksDevam;
