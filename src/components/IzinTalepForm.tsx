import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, User, FileText, AlertCircle, AlertTriangle, MapPin, Upload, CheckCircle, Clock } from 'lucide-react';
import { Employee } from '../types';
import { IzinTalebi, IzinHakki, IzinTuru } from '../types/izin';
import {
  calculateWorkingDays,
  izinTuruLabels,
  getCompanyIzinTurleri,
  getCompanyIzinTuruLabels,
  getMaxIzinSureleri,
  validateIzinTuru,
  formatDate,
  isSaturdayWorkActive,
  calculateCompletedYears,
  hasCompletedOneYear,
  getYillikIzinHakEdisTarihi,
  getYillikIzinKalanGunSayisi,
  calculateHourlyDuration,
  formatHourlyLeaveTag
} from '../utils/izinCalculations';
import { leaveTypeService } from '../services/leaveTypeService';
import { shiftService } from '../services/shiftService';
import { useScrollLock } from '../hooks/useScrollLock';

interface IzinTalepFormProps {
  employees: Employee[];
  izinHaklari: IzinHakki[];
  izinTalepleri?: IzinTalebi[];
  onSubmit: (talep: Partial<IzinTalebi>) => void;
  onClose: () => void;
}

const EMPTY_TALEPLER: IzinTalebi[] = [];

const IzinTalepForm: React.FC<IzinTalepFormProps> = ({
  employees,
  izinHaklari,
  izinTalepleri = EMPTY_TALEPLER,
  onSubmit,
  onClose
}) => {
  useScrollLock(true);

  const [formData, setFormData] = useState(() => ({
    employeeId: employees.length === 1 ? employees[0]?.id || '' : '',
    izinTuru: 'yillik' as IzinTuru,
    kismiYillik: false,
    saatlikMazeret: false,
    baslangicSaati: '14:00',
    bitisSaati: '16:00',
    baslangicTarihi: '',
    bitisTarihi: '',
    aciklama: '',
    yolIzniTalep: false,
    yolIzniGun: 0,
    seyahatYeri: '',
    ilDisiSeyahat: false
  }));

  const [belgeDosyasi, setBelgeDosyasi] = useState<File | null>(null);
  const [belgeYuklendi, setBelgeYuklendi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMazeretTuru = useMemo(() => {
    const tur = String(formData.izinTuru || '').toLowerCase();
    return tur === 'mazeret' || tur.includes('mazeret');
  }, [formData.izinTuru]);

  const isSaatlikMazeretActive = isMazeretTuru && formData.saatlikMazeret;

  const hourlyDuration = useMemo(() => {
    return calculateHourlyDuration(formData.baslangicSaati, formData.bitisSaati);
  }, [formData.baslangicSaati, formData.bitisSaati]);

  // Pure derived state for selected employee and leave rights
  const selectedEmployee = useMemo(() => {
    if (!formData.employeeId) return null;
    return employees.find(e => e.id === formData.employeeId) || null;
  }, [employees, formData.employeeId]);

  const izinHakki = useMemo(() => {
    if (!formData.employeeId) return null;
    return izinHaklari.find(h => h.employeeId === formData.employeeId) || null;
  }, [izinHaklari, formData.employeeId]);

  // Kıdem ve 1 yıl dolum durumu (4857 s.K. Madde 53/54)
  const joinDateStr = selectedEmployee?.joinDate || (selectedEmployee as any)?.join_date || (selectedEmployee as any)?.ise_giris_tarihi;
  const calismaYili = useMemo(() => calculateCompletedYears(joinDateStr), [joinDateStr]);
  const employeeHas1Year = useMemo(() => hasCompletedOneYear(joinDateStr), [joinDateStr]);
  const oneYearCompletionDate = useMemo(() => getYillikIzinHakEdisTarihi(joinDateStr), [joinDateStr]);
  const kalanGunToOneYear = useMemo(() => getYillikIzinKalanGunSayisi(joinDateStr), [joinDateStr]);
  const formattedJoinDate = useMemo(() => (joinDateStr ? formatDate(String(joinDateStr).split('T')[0]) : 'Belirtilmedi'), [joinDateStr]);
  const formattedCompletionDate = useMemo(() => (oneYearCompletionDate ? formatDate(oneYearCompletionDate.toISOString().split('T')[0]) : ''), [oneYearCompletionDate]);

  const targetCompanyId = selectedEmployee?.company_id || employees[0]?.company_id;
  const [isSaturdayWork, setIsSaturdayWork] = useState<boolean>(() => isSaturdayWorkActive(targetCompanyId));

  useEffect(() => {
    const compId = selectedEmployee?.company_id || employees[0]?.company_id;
    setIsSaturdayWork(isSaturdayWorkActive(compId));

    shiftService.getSaturdayConfig(compId).then(cfg => {
      if (cfg && typeof cfg.isSaturdayWork === 'boolean') {
        setIsSaturdayWork(cfg.isSaturdayWork);
      }
    }).catch(() => {});

    const handleSatUpdate = () => {
      setIsSaturdayWork(isSaturdayWorkActive(compId));
    };

    window.addEventListener('humanius_saturday_updated', handleSatUpdate);
    window.addEventListener('storage', handleSatUpdate);
    return () => {
      window.removeEventListener('humanius_saturday_updated', handleSatUpdate);
      window.removeEventListener('storage', handleSatUpdate);
    };
  }, [selectedEmployee?.company_id, employees[0]?.company_id]);

  // Pure derived state for working days calculation (6 günlük çalışma düzeninde Cumartesi de iş günüdür)
  const gunSayisi = useMemo(() => {
    if (isSaatlikMazeretActive) {
      return 0;
    }
    if (formData.baslangicTarihi && formData.bitisTarihi) {
      return calculateWorkingDays(formData.baslangicTarihi, formData.bitisTarihi, isSaturdayWork);
    }
    return 0;
  }, [formData.baslangicTarihi, formData.bitisTarihi, isSaturdayWork, isSaatlikMazeretActive]);

  const [availableLeaveTypes, setAvailableLeaveTypes] = useState<Array<{ id: string; ad: string }>>(() => {
    const compId = employees[0]?.company_id;
    return getCompanyIzinTurleri(compId);
  });

  useEffect(() => {
    const compId = selectedEmployee?.company_id || employees[0]?.company_id;
    leaveTypeService.getLeaveTypes(compId).then((types) => {
      if (types && types.length > 0) {
        setAvailableLeaveTypes(types);
      }
    });

    const handleUpdate = () => {
      leaveTypeService.getLeaveTypes(compId).then((types) => {
        if (types && types.length > 0) {
          setAvailableLeaveTypes(types);
        }
      });
    };
    window.addEventListener('humanius_izin_turleri_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('humanius_izin_turleri_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [selectedEmployee?.company_id, employees[0]?.company_id]);

  // Seçili izin türü için maksimum süre bilgisi
  const maxSureInfo = getMaxIzinSureleri(formData.izinTuru);
  const toplamTalepGun = gunSayisi + (formData.yolIzniTalep ? formData.yolIzniGun : 0);
  const effectiveMaxGun = formData.izinTuru === 'yillik' && formData.kismiYillik
    ? 10
    : maxSureInfo.maxGun;
  const effectiveMaxAciklama = formData.izinTuru === 'yillik' && formData.kismiYillik
    ? 'Kısmi yıllık izin talepleri en az 1, en fazla 10 iş günü olabilir.'
    : maxSureInfo.aciklama;

  // Form açılışında tek personel varsa otomatik seç
  useEffect(() => {
    if (employees.length === 1 && employees[0]?.id) {
      setFormData(prev => prev.employeeId ? prev : ({ ...prev, employeeId: employees[0].id }));
    }
  }, [employees.length, employees[0]?.id]);

  // Pure derived validation error
  const validationError = useMemo(() => {
    // 4857 Sayılı İş Kanunu Madde 53/54 — 1 Yıl Dolum Kontrolü
    if (selectedEmployee && formData.izinTuru === 'yillik' && !employeeHas1Year) {
      return `4857 Sayılı İş Kanunu (Madde 53/54) uyarınca yıllık ücretli izin hakkı işe giriş tarihinden itibaren en az 1 tam yıl çalışıldıktan sonra hak edilir. ${selectedEmployee.name} henüz 1 yılını doldurmadığı için yıllık izin kullanamaz.${formattedCompletionDate ? ` (İşe Giriş: ${formattedJoinDate} • 1 Yıl Dolum: ${formattedCompletionDate}${kalanGunToOneYear > 0 ? ` • Kalan: ${kalanGunToOneYear} gün` : ''})` : ''}`;
    }

    if (isSaatlikMazeretActive) {
      if (!formData.baslangicTarihi) return '';
      if (!hourlyDuration.isValid) {
        return 'Saatlik mazeret izni için bitiş saati başlangıç saatinden sonra olmalıdır.';
      }
      if (hourlyDuration.hours > 8) {
        return 'Saatlik mazeret izni en fazla 8 saat olabilir. Tam gün izin için "Günlük (Tam Gün)" seçeneğini kullanınız.';
      }
      return '';
    }

    if (!formData.baslangicTarihi || !formData.bitisTarihi) {
      return '';
    }

    if (new Date(formData.baslangicTarihi) > new Date(formData.bitisTarihi)) {
      return 'Başlangıç tarihi bitiş tarihinden sonra olamaz.';
    }

    const days = gunSayisi;
    const toplamGun = days + (formData.yolIzniTalep ? formData.yolIzniGun : 0);

    // Hafta tatili kontrolü: Eğer tarihler girildi ama 0 iş günü çıktıysa ve yol izni de yoksa
    if (days === 0 && !formData.yolIzniTalep) {
      return isSaturdayWork
        ? 'Seçilen tarihler hafta tatiline (Pazar günü) denk gelmektedir. Düşülecek iş günü 0 olduğu için izin talebi oluşturulamaz.'
        : 'Seçilen tarihler hafta sonuna denk gelmektedir. Düşülecek iş günü 0 olduğu için izin talebi oluşturulamaz.';
    }

    if (formData.izinTuru === 'yillik' && formData.kismiYillik && (days < 1 || days > 10)) {
      return 'Kısmi yıllık izin 1 ile 10 iş günü arasında olmalıdır.';
    }

    if (selectedEmployee && toplamGun > 0) {
      const validation = validateIzinTuru(formData.izinTuru, toplamGun, selectedEmployee);
      if (!validation.isValid) {
        return validation.message || 'İzin doğrulaması başarısız.';
      }

      if (formData.izinTuru === 'yillik' && izinHakki && toplamGun > (izinHakki.kalanIzin || 0)) {
        return `Yetersiz yıllık izin bakiyesi. Kalan: ${izinHakki.kalanIzin} gün.`;
      }

      if (formData.izinTuru === 'mazeret' && izinHakki && days > (izinHakki.kalanIzin || 0)) {
        return `Mazeret izni süresi kalan yıllık izin süresinden fazla olamaz. Kalan yıllık izin: ${izinHakki.kalanIzin} gün.`;
      }
    }

    return '';
  }, [
    formData.baslangicTarihi,
    formData.bitisTarihi,
    formData.izinTuru,
    formData.kismiYillik,
    formData.yolIzniTalep,
    formData.yolIzniGun,
    gunSayisi,
    selectedEmployee,
    izinHakki,
    employeeHas1Year,
    formattedCompletionDate,
    formattedJoinDate,
    kalanGunToOneYear,
    isSaatlikMazeretActive,
    hourlyDuration,
    isSaturdayWork
  ]);

  // Pure derived conflict detection (çakışan izinler)
  const clashingLeaves = useMemo(() => {
    const effectiveEnd = isSaatlikMazeretActive ? formData.baslangicTarihi : formData.bitisTarihi;
    if (!formData.baslangicTarihi || !effectiveEnd || !selectedEmployee) {
      return [];
    }

    const start = new Date(formData.baslangicTarihi).getTime();
    const end = new Date(effectiveEnd).getTime();

    return (izinTalepleri || []).filter(t => {
      if (t.durum !== 'onaylandi' && t.durum !== 'İK Onayladı' && t.durum !== 'Yönetici Onayladı') return false;
      if (t.employeeId === selectedEmployee.id) return false;

      const emp = employees.find(e => e.id === t.employeeId);
      if (!emp || emp.department !== selectedEmployee.department) return false;

      const tStart = new Date(t.baslangicTarihi).getTime();
      const tEnd = new Date(t.bitisTarihi).getTime();

      return (start <= tEnd && end >= tStart);
    }).map(t => ({
      ...t,
      employee: employees.find(e => e.id === t.employeeId)
    }));
  }, [formData.baslangicTarihi, formData.bitisTarihi, isSaatlikMazeretActive, selectedEmployee, izinTalepleri, employees]);

  // Belge yükleme
  const handleBelgeYukle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Sadece PDF, JPG, PNG dosyaları yükleyebilirsiniz.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
        return;
      }

      setBelgeDosyasi(file);
      setBelgeYuklendi(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveEndDate = isSaatlikMazeretActive ? formData.baslangicTarihi : formData.bitisTarihi;

    if (
      !formData.employeeId ||
      !formData.baslangicTarihi ||
      !effectiveEndDate
    ) {
      alert('Lütfen tüm zorunlu alanları doldurun!');
      return;
    }

    if (isSaatlikMazeretActive) {
      if (!hourlyDuration.isValid) {
        alert('Saatlik mazeret izni için bitiş saati başlangıç saatinden sonra olmalıdır!');
        return;
      }
      if (hourlyDuration.hours > 8) {
        alert('Saatlik mazeret izni en fazla 8 saat olabilir!');
        return;
      }
    } else {
      if (new Date(formData.baslangicTarihi) > new Date(effectiveEndDate)) {
        alert('Başlangıç tarihi bitiş tarihinden sonra olamaz!');
        return;
      }

      if (selectedEmployee && formData.izinTuru === 'yillik' && !employeeHas1Year) {
        alert(`4857 Sayılı İş Kanunu (Madde 53/54) uyarınca yıllık ücretli izin hakkı, işe giriş tarihinden itibaren en az 1 tam yıl çalışıldıktan sonra hak edilir. ${selectedEmployee.name} henüz 1 yılını doldurmadığı için yıllık izin kullanamaz.`);
        return;
      }

      if (formData.izinTuru === 'yillik' && formData.kismiYillik && (gunSayisi < 1 || gunSayisi > 10)) {
        alert('Kısmi yıllık izin 1 ile 10 iş günü arasında seçilmelidir.');
        return;
      }

      if (formData.izinTuru === 'mazeret' && izinHakki && gunSayisi > (izinHakki.kalanIzin || 0)) {
        alert(`Mazeret izni süresi kalan yıllık izin süresinden fazla olamaz. Kalan yıllık izin: ${izinHakki.kalanIzin} gün.`);
        return;
      }

      if (formData.yolIzniTalep && formData.ilDisiSeyahat && !belgeDosyasi) {
        alert('İl dışı seyahat için belge yüklemeniz gereklidir!');
        return;
      }

      if (formData.yolIzniTalep && !formData.seyahatYeri.trim()) {
        alert('Seyahat yeri belirtmeniz gereklidir!');
        return;
      }

      if (gunSayisi <= 0 && !formData.yolIzniTalep) {
        alert(isSaturdayWork
          ? 'Seçilen tarih aralığında iş günü bulunmamaktadır (tarihler hafta tatili olan Pazar gününe denk gelmektedir). Lütfen geçerli bir iş günü aralığı seçiniz.'
          : 'Seçilen tarih aralığında iş günü bulunmamaktadır (tarihler hafta sonuna denk gelmektedir). Lütfen geçerli bir iş günü aralığı seçiniz.'
        );
        return;
      }
    }

    if (validationError) {
      alert(validationError);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const finalAciklama = isSaatlikMazeretActive
      ? `${formatHourlyLeaveTag(formData.baslangicSaati, formData.bitisSaati, hourlyDuration.label)}${formData.aciklama.trim() ? ' ' + formData.aciklama.trim() : ''}`.trim()
      : formData.aciklama;

    const talepData = {
      ...formData,
      bitisTarihi: effectiveEndDate,
      gunSayisi: isSaatlikMazeretActive ? 0 : gunSayisi,
      aciklama: finalAciklama,
      belgeDosyasi: belgeDosyasi
    };

    try {
      onSubmit(talepData);
    } finally {
      setTimeout(() => setIsSubmitting(false), 1000);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'izinTuru') {
        const nextIsMazeret = String(value || '').toLowerCase().includes('mazeret');
        if (!nextIsMazeret) {
          next.saatlikMazeret = false;
        }
      }
      if (field === 'saatlikMazeret' && value === true) {
        if (next.baslangicTarihi) {
          next.bitisTarihi = next.baslangicTarihi;
        }
      }
      if (field === 'baslangicTarihi' && next.saatlikMazeret) {
        next.bitisTarihi = value;
      }
      if (field === 'kismiYillik' && value) {
        next.izinTuru = 'yillik';
        next.yolIzniTalep = false;
        next.yolIzniGun = 0;
      }
      if (field === 'yolIzniTalep') {
        if (value) {
          next.yolIzniGun = next.yolIzniGun || 4;
        } else {
          next.yolIzniGun = 0;
          next.seyahatYeri = '';
          next.ilDisiSeyahat = false;
        }
      }
      return next;
    });

    if (field === 'yolIzniTalep' && !value) {
      setBelgeDosyasi(null);
      setBelgeYuklendi(false);
    }
  };

  // Minimum tarih (bugün)
  const minDate = new Date().toISOString().split('T')[0];

  const isSubmitDisabled =
    isSubmitting ||
    !!validationError ||
    !formData.employeeId ||
    !formData.baslangicTarihi ||
    (!isSaatlikMazeretActive && !formData.bitisTarihi) ||
    (isSaatlikMazeretActive ? !hourlyDuration.isValid : (gunSayisi <= 0 && !formData.yolIzniTalep));

  return (
    <>
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white border-l border-gray-200 transform transition-transform duration-300 translate-x-0 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Yeni İzin Talebi</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Personel Seçimi */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5" />
              Personel Bilgileri
            </h3>

            {employees.length > 1 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Personel *</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => handleInputChange('employeeId', e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="">Personel Seçiniz</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.department}
                    </option>
                  ))}
                </select>
              </div>
            ) : employees.length === 1 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                  {employees[0].name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{employees[0].name}</p>
                  <p className="text-xs text-gray-500">{employees[0].department} • {employees[0].position}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                Personel kaydınız bulunamadı. Lütfen İK veya Sistem Yöneticinize başvurun.
              </div>
            )}

            {/* İzin Çakışma Uyarısı (Kritik Akıl Yürüteç) */}
            {clashingLeaves.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl my-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-bold text-red-800">
                      Kritik Uyarı: İzin Çakışması
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Seçilen tarihlerde {selectedEmployee?.department} departmanından {clashingLeaves.length} kişi daha izinli.
                      </p>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                        {clashingLeaves.map((clash, i) => (
                          <li key={i}>
                            <span className="font-semibold">{clash.employee?.name}</span>
                            <span className="text-gray-500 ml-1">
                              ({new Date(clash.baslangicTarihi).toLocaleDateString()} - {new Date(clash.bitisTarihi).toLocaleDateString()})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* İzin Hakkı Bilgisi */}
            {izinHakki && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-blue-900">İzin Hakkı ve Kıdem Bilgileri</h4>
                  {!employeeHas1Year && (
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                      1 Yılını Doldurmadı
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Toplam Yıllık İzin:</span>
                    <span className="text-blue-800 ml-2 font-bold">{!employeeHas1Year ? 0 : izinHakki.toplamHak} gün</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Kalan İzin:</span>
                    <span className="text-blue-800 ml-2 font-bold">{!employeeHas1Year ? 0 : izinHakki.kalanIzin} gün</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Tamamlanan Kıdem:</span>
                    <span className="text-blue-800 ml-2 font-medium">{calismaYili} yıl {!employeeHas1Year && '(1 yıldan az)'}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Mazeret İzni:</span>
                    <span className="text-blue-800 ml-2 font-medium">{izinHakki.mazeretIzin} gün</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* İzin Detayları */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              İzin Detayları
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">İzin Türü *</label>
              <select
                value={formData.izinTuru}
                onChange={(e) => handleInputChange('izinTuru', e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              >
                {availableLeaveTypes.map((tur) => (
                  <option key={tur.id} value={tur.id}>
                    {tur.id === 'yillik' && selectedEmployee && !employeeHas1Year
                      ? `${tur.ad} (1 Yıl Dolmadı — Kullanılamaz)`
                      : tur.ad}
                  </option>
                ))}
              </select>

              {/* Mazeret İzni İçin: Günlük (Tam Gün) vs Saatlik İzin Seçimi */}
              {isMazeretTuru && (
                <div className="mt-3 p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-orange-600" />
                      Mazeret İzni Kullanım Şekli:
                    </span>
                    <div className="inline-flex rounded-xl bg-white p-1 border border-orange-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleInputChange('saatlikMazeret', false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !formData.saatlikMazeret
                            ? 'bg-orange-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        📅 Günlük (Tam Gün)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('saatlikMazeret', true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          formData.saatlikMazeret
                            ? 'bg-orange-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        ⏱️ Saatlik İzin
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-orange-800 leading-relaxed">
                    {formData.saatlikMazeret
                      ? 'Saatlik mazeret izni (örn. 2 saatlik acil iş/doktor/banka vb.) personelin izin bakiyesinden tam gün olarak düşülmez; Puantaj Cetvelinde ilgili günün açıklama/not kısmına otomatik olarak işlenir.'
                      : 'Tam günlük mazeret izni seçilen tarih aralığındaki iş günleri baz alınarak hesaplanır.'}
                  </p>
                </div>
              )}

              {/* 1 Yıl Dolmadı Uyarısı */}
              {selectedEmployee && formData.izinTuru === 'yillik' && !employeeHas1Year && (
                <div className="mt-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950 text-sm">Yıllık İzin Hakkı Henüz Başlamadı</p>
                    <p className="mt-1 text-amber-800 leading-relaxed">
                      <strong>4857 Sayılı İş Kanunu (Madde 53/54)</strong> gereğince çalışanlar yıllık ücretli izne ancak işe başladıkları günden itibaren <strong>en az 1 tam yıl</strong> çalıştıktan sonra hak kazanırlar. {selectedEmployee.name} henüz 1 yılını doldurmadığı için yıllık izin kullanamaz.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-[11px] text-amber-900">
                      <span>İşe Giriş: <b>{formattedJoinDate}</b></span>
                      <span>•</span>
                      <span>1 Yıl Dolum Tarihi: <b>{formattedCompletionDate}</b></span>
                      {kalanGunToOneYear > 0 && (
                        <>
                          <span>•</span>
                          <span className="bg-amber-100/90 text-amber-900 px-2 py-0.5 rounded-md font-bold">1 Yıla Kalan: {kalanGunToOneYear} Gün</span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-amber-700 italic">
                      💡 Personel için mazeret izni veya ücretsiz izin gibi diğer izin türlerini tercih edebilirsiniz.
                    </p>
                  </div>
                </div>
              )}

              {/* Maksimum süre bilgisi */}
              {!isSaatlikMazeretActive && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">
                      <strong>Maksimum Süre:</strong> {effectiveMaxGun} gün
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{effectiveMaxAciklama}</p>
                </div>
              )}

              {formData.izinTuru === 'yillik' && (
                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <label className="flex items-center gap-2 text-sm font-medium text-indigo-800">
                    <input
                      type="checkbox"
                      checked={formData.kismiYillik}
                      onChange={(e) => handleInputChange('kismiYillik', e.target.checked)}
                      className="w-4 h-4 text-indigo-600"
                    />
                      Kısmi Yıllık İzin (1-10 iş günü)
                  </label>
                  <p className="text-xs text-indigo-700 mt-1">
                      Kısmi yıllık izin talepleri 1 ile 10 iş günü arasında olabilir ve yıllık izin hakkından düşülür.
                  </p>
                </div>
              )}
            </div>

            {/* Tarih ve Saat Seçimi */}
            {isSaatlikMazeretActive ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">İzin Tarihi *</label>
                  <input
                    type="date"
                    value={formData.baslangicTarihi}
                    onChange={(e) => handleInputChange('baslangicTarihi', e.target.value)}
                    min={minDate}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Saati *</label>
                  <input
                    type="time"
                    value={formData.baslangicSaati}
                    onChange={(e) => handleInputChange('baslangicSaati', e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 font-mono font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Saati *</label>
                  <input
                    type="time"
                    value={formData.bitisSaati}
                    onChange={(e) => handleInputChange('bitisSaati', e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 font-mono font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    value={formData.baslangicTarihi}
                    onChange={(e) => handleInputChange('baslangicTarihi', e.target.value)}
                    min={minDate}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi *</label>
                  <input
                    type="date"
                    value={formData.bitisTarihi}
                    onChange={(e) => handleInputChange('bitisTarihi', e.target.value)}
                    min={formData.baslangicTarihi || minDate}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
            )}

            {/* Saatlik İzin Süresi Gösterimi */}
            {isSaatlikMazeretActive && hourlyDuration.isValid && (
              <div className="border rounded-xl p-4 bg-orange-50/70 border-orange-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-semibold text-gray-700">Saatlik İzin Süresi:</span>
                    <span className="text-base font-extrabold text-orange-700">
                      {hourlyDuration.label} ({formData.baslangicSaati} - {formData.bitisSaati})
                    </span>
                  </div>
                  <div className="text-xs text-orange-800 font-semibold bg-white px-2.5 py-1 rounded-lg border border-orange-200">
                    Puantajda &quot;Açıklama / Not&quot; olarak görünür • 0 Gün Düşülür
                  </div>
                </div>
              </div>
            )}

            {/* Gün Sayısı Gösterimi */}
            {!isSaatlikMazeretActive && (gunSayisi > 0 || formData.yolIzniTalep) && (
              <div className={`border rounded-xl p-4 ${
                validationError
                  ? 'bg-red-50 border-red-200'
                  : toplamTalepGun > effectiveMaxGun
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50/60 border-blue-200'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Düşülecek İş Günü:</span>
                    <span className={`text-base font-extrabold ${
                      validationError ? 'text-red-600' : 'text-blue-700'
                    }`}>{gunSayisi} İş Günü</span>
                    {formData.yolIzniTalep && (
                      <>
                        <span className="text-sm text-gray-600">+ Yol İzni:</span>
                        <span className="text-sm font-bold text-amber-600">{formData.yolIzniGun} gün</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {isSaturdayWork
                      ? '(6 günlük çalışma düzeni: Cumartesi ve Pazar günleri izne dahildir)'
                      : '(5 günlük çalışma düzeni: Pazar izne dahildir, Cumartesi tatildir)'}
                  </div>
                </div>
              </div>
            )}

            {/* Hafta tatili bilgilendirmesi (sadece 5 günlükte Cumartesi günü seçildiğinde) */}
            {!isSaatlikMazeretActive && formData.baslangicTarihi && formData.bitisTarihi && gunSayisi === 0 && !formData.yolIzniTalep && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-amber-900">
                    Hafta Sonu Bilgilendirmesi (0 İş Günü)
                  </div>
                  <div className="text-amber-800 mt-1">
                    Seçtiğiniz tarihler ({formatDate(formData.baslangicTarihi)} - {formatDate(formData.bitisTarihi)}) 5 günlük çalışma düzenindeki Akdi Tatil (Cumartesi) gününe denk gelmektedir.
                  </div>
                </div>
              </div>
            )}

            {/* Yol İzni Seçeneği - Sadece Yıllık İzin için */}
            {formData.izinTuru === 'yillik' && (
              <div className="space-y-4">
                <div className="border-2 border-blue-300 rounded-xl p-5 bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h4 className="text-base font-bold text-blue-800">🚗 Yol İzni Ekle (4 Güne Kadar)</h4>
                  </div>

                  <div className="bg-white rounded-lg p-3 mb-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="yolIzni"
                      checked={formData.yolIzniTalep}
                      onChange={(e) => handleInputChange('yolIzniTalep', e.target.checked)}
                      className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="yolIzni" className="text-sm font-medium text-blue-800">
                      ✅ Yıllık iznime ek olarak yol izni kullanmak istiyorum
                    </label>
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                      💡 <strong>Bilgi:</strong> Yol izni, yıllık izninizle birlikte kullanılabilen ek bir izindir.
                      Seyahat için ekstra süre sağlar.
                    </div>
                  </div>
                  
                  {formData.yolIzniTalep && (
                    <div className="space-y-4 border-t-2 border-blue-200 pt-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-green-800 mb-2">Yol İzni Günü</label>
                            <select
                              value={formData.yolIzniGun}
                              onChange={(e) => handleInputChange('yolIzniGun', parseInt(e.target.value))}
                              className="w-full bg-white border border-green-300 text-gray-800 rounded-lg px-3 py-2 outline-none focus:border-green-500"
                            >
                              <option value={1}>1 gün</option>
                              <option value={2}>2 gün</option>
                              <option value={3}>3 gün</option>
                              <option value={4}>4 gün</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-green-800 mb-2">Seyahat Yeri *</label>
                            <input
                              type="text"
                              value={formData.seyahatYeri}
                              onChange={(e) => handleInputChange('seyahatYeri', e.target.value)}
                              placeholder="Örn: İstanbul, Ankara..."
                              className="w-full bg-white border border-green-300 text-gray-800 rounded-lg px-3 py-2 outline-none focus:border-green-500"
                              required={formData.yolIzniTalep}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="ilDisiSeyahat"
                              checked={formData.ilDisiSeyahat}
                              onChange={(e) => handleInputChange('ilDisiSeyahat', e.target.checked)}
                              className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500"
                            />
                            <label htmlFor="ilDisiSeyahat" className="text-sm font-medium text-green-800">
                              🌍 İl dışı seyahat (belge gereklidir)
                            </label>
                          </div>

                          {formData.ilDisiSeyahat && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Upload className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">Destekleyici Belge Yükle</span>
                              </div>

                              <label className="flex items-center gap-3 cursor-pointer py-1">
                                <input
                                  type="file"
                                  onChange={handleBelgeYukle}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                />
                                <span className="bg-yellow-200/70 hover:bg-yellow-200 text-yellow-900 font-semibold px-3.5 py-1.5 rounded-lg text-xs border border-yellow-300 flex items-center gap-1.5 transition-colors shadow-2xs">
                                  <Upload className="w-3.5 h-3.5 text-yellow-800" />
                                  Dosya Seç...
                                </span>
                                <span className="text-xs text-gray-500 truncate max-w-[220px]">
                                  {belgeDosyasi ? belgeDosyasi.name : 'Dosya seçilmedi.'}
                                </span>
                              </label>

                              {belgeYuklendi && (
                                <div className="flex items-center gap-2 mt-2 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-sm">Belge yüklendi: {belgeDosyasi?.name}</span>
                                </div>
                              )}

                              <p className="text-xs text-yellow-600 mt-1">
                                Kabul edilen formatlar: PDF, JPG, PNG (Maks 5MB)
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Açıklama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSaatlikMazeretActive ? 'Mazeret Nedeni / Açıklama' : 'Açıklama'}
              </label>
              <textarea
                value={formData.aciklama}
                onChange={(e) => handleInputChange('aciklama', e.target.value)}
                rows={3}
                placeholder={
                  isSaatlikMazeretActive
                    ? 'Örn: Doktor randevusu, banka işlemi, resmi kurum işi...'
                    : 'İzin talebiniz hakkında ek bilgiler...'
                }
                className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">{validationError}</span>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Talebi Gönder'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default IzinTalepForm;
