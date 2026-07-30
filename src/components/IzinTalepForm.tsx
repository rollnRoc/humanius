import React, { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, AlertCircle, MapPin, Upload, CheckCircle } from 'lucide-react';
import { Employee } from '../types';
import { IzinTalebi, IzinHakki, IzinTuru } from '../types/izin';
import { calculateWorkingDays, izinTuruLabels, getMaxIzinSureleri, validateIzinTuru } from '../utils/izinCalculations';
import { useScrollLock } from '../hooks/useScrollLock';

interface IzinTalepFormProps {
  employees: Employee[];
  izinHaklari: IzinHakki[];
  izinTalepleri?: IzinTalebi[];
  onSubmit: (talep: Partial<IzinTalebi>) => void;
  onClose: () => void;
}

const IzinTalepForm: React.FC<IzinTalepFormProps> = ({
  employees,
  izinHaklari,
  izinTalepleri = [],
  onSubmit,
  onClose
}) => {
  useScrollLock(true);

  const [formData, setFormData] = useState({
    employeeId: '',
    izinTuru: 'yillik' as IzinTuru,
    kismiYillik: false,
    baslangicTarihi: '',
    bitisTarihi: '',
    aciklama: '',
    yolIzniTalep: false,
    yolIzniGun: 0,
    seyahatYeri: '',
    ilDisiSeyahat: false
  });

  const [gunSayisi, setGunSayisi] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [izinHakki, setIzinHakki] = useState<IzinHakki | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [belgeDosyasi, setBelgeDosyasi] = useState<File | null>(null);
  const [belgeYuklendi, setBelgeYuklendi] = useState(false);
  const [clashingLeaves, setClashingLeaves] = useState<(IzinTalebi & { employee?: Employee })[]>([]);

  // Seçili izin türü için maksimum süre bilgisi
  const maxSureInfo = getMaxIzinSureleri(formData.izinTuru);
  const toplamTalepGun = gunSayisi + (formData.yolIzniTalep ? formData.yolIzniGun : 0);
  const effectiveMaxGun = formData.izinTuru === 'yillik' && formData.kismiYillik
    ? 10
    : maxSureInfo.maxGun;
  const effectiveMaxLabel = formData.izinTuru === 'yillik' && formData.kismiYillik
    ? '10 gün'
    : maxSureInfo.label;
  const effectiveMaxAciklama = formData.izinTuru === 'yillik' && formData.kismiYillik
    ? 'Kısmi yıllık izin talepleri en az 1, en fazla 10 iş günü olabilir.'
    : maxSureInfo.aciklama;

  // Personel seçildiğinde izin hakkını bul
  useEffect(() => {
    if (formData.employeeId) {
      const employee = employees.find(e => e.id === formData.employeeId);
      const hakki = izinHaklari.find(h => h.employeeId === formData.employeeId);
      setSelectedEmployee(employee || null);
      setIzinHakki(hakki || null);
    }
  }, [formData.employeeId, employees, izinHaklari]);

  // Eğer personeller dizisinde sadece 1 kişi varsa (örneğin employee/user rolüyle giren biri için veriler filtrelendiyse), 
  // form açılışında onu otomatik seç.
  useEffect(() => {
    if (employees.length === 1 && !formData.employeeId) {
      setFormData(prev => ({ ...prev, employeeId: employees[0].id }));
    }
  }, [employees, formData.employeeId]);

  // Tarih değiştiğinde gün sayısını hesapla
  useEffect(() => {
    if (formData.baslangicTarihi && formData.bitisTarihi) {
      const days = calculateWorkingDays(formData.baslangicTarihi, formData.bitisTarihi);
      setGunSayisi(days);
      
      // İzin süresi validasyonu
      if (selectedEmployee && days > 0) {
        const toplamGun = days + (formData.yolIzniTalep ? formData.yolIzniGun : 0);

        if (formData.izinTuru === 'yillik' && formData.kismiYillik && (days < 1 || days > 10)) {
          setValidationError('Kısmi yıllık izin 1 ile 10 iş günü arasında olmalıdır.');
          return;
        }

        const validation = validateIzinTuru(formData.izinTuru, toplamGun, selectedEmployee);

        if (!validation.isValid) {
          setValidationError(validation.message || 'İzin doğrulaması başarısız.');
          return;
        }

        if (formData.izinTuru === 'yillik' && izinHakki && toplamGun > (izinHakki.kalanIzin || 0)) {
          setValidationError(`Yetersiz yıllık izin bakiyesi. Kalan: ${izinHakki.kalanIzin} gün.`);
          return;
        }

        if (formData.izinTuru === 'mazeret' && izinHakki && days > (izinHakki.kalanIzin || 0)) {
          setValidationError(`Mazeret izni süresi kalan yıllık izin süresinden fazla olamaz. Kalan yıllık izin: ${izinHakki.kalanIzin} gün.`);
          return;
        }

        setValidationError('');
      } else {
        setValidationError('');
      }
    } else {
      setGunSayisi(0);
      setValidationError('');
    }

    // Çakışma kontrolü
    if (formData.baslangicTarihi && formData.bitisTarihi && selectedEmployee) {
      const start = new Date(formData.baslangicTarihi).getTime();
      const end = new Date(formData.bitisTarihi).getTime();

      const clashes = izinTalepleri.filter(t => {
        if (t.durum !== 'onaylandi') return false; // Sadece onaylı izinleri kontrol et
        if (t.employeeId === selectedEmployee.id) return false; // Kendisi hariç

        const emp = employees.find(e => e.id === t.employeeId);
        if (!emp || emp.department !== selectedEmployee.department) return false; // Sadece aynı departman

        const tStart = new Date(t.baslangicTarihi).getTime();
        const tEnd = new Date(t.bitisTarihi).getTime();

        return (start <= tEnd && end >= tStart);
      }).map(t => ({
        ...t,
        employee: employees.find(e => e.id === t.employeeId)
      }));

      setClashingLeaves(clashes);
    } else {
      setClashingLeaves([]);
    }
  }, [formData.baslangicTarihi, formData.bitisTarihi, formData.izinTuru, formData.kismiYillik, formData.yolIzniTalep, formData.yolIzniGun, selectedEmployee, izinHakki, izinTalepleri, employees]);

  useEffect(() => {
    if (!formData.kismiYillik) return;

    setFormData((prev) => ({
      ...prev,
      izinTuru: 'yillik',
      yolIzniTalep: false,
      yolIzniGun: 0,
    }));
  }, [formData.kismiYillik]);

  // Yol izni değiştiğinde kontroller
  useEffect(() => {
    if (formData.yolIzniTalep) {
      setFormData(prev => ({ ...prev, yolIzniGun: prev.yolIzniGun || 4 }));
    } else {
      setFormData(prev => ({ ...prev, yolIzniGun: 0, seyahatYeri: '', ilDisiSeyahat: false }));
      setBelgeDosyasi(null);
      setBelgeYuklendi(false);
    }
  }, [formData.yolIzniTalep]);

  // Belge yükleme
  const handleBelgeYukle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Dosya türü kontrolü
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Sadece PDF, JPG, PNG dosyaları yükleyebilirsiniz.');
        return;
      }

      // Dosya boyutu kontrolü (5MB)
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

    if (
      !formData.employeeId ||
      !formData.baslangicTarihi ||
      !formData.bitisTarihi
    ) {
      alert('Lütfen tüm zorunlu alanları doldurun!');
      return;
    }

    if (new Date(formData.baslangicTarihi) > new Date(formData.bitisTarihi)) {
      alert('Başlangıç tarihi bitiş tarihinden sonra olamaz!');
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
    if (validationError) {
      alert(validationError);
      return;
    }

    const talepData = {
      ...formData,
      bitisTarihi: formData.bitisTarihi,
      gunSayisi,
      belgeDosyasi: belgeDosyasi
    };

    onSubmit(talepData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Minimum tarih (bugün)
  const minDate = new Date().toISOString().split('T')[0];

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
                <h4 className="text-sm font-medium text-blue-800 mb-2">İzin Hakkı Bilgileri</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Toplam Yıllık İzin:</span>
                    <span className="text-blue-800 ml-2 font-medium">{izinHakki.toplamHak} gün</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Kalan İzin:</span>
                    <span className="text-blue-800 ml-2 font-medium">{izinHakki.kalanIzin} gün</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Çalışma Yılı:</span>
                    <span className="text-blue-800 ml-2 font-medium">{izinHakki.calismaYili} yıl</span>
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
                {Object.entries(izinTuruLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              {/* Maksimum süre bilgisi */}
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    <strong>Maksimum Süre:</strong> {effectiveMaxGun} gün
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{effectiveMaxAciklama}</p>
              </div>

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

            {/* Gün Sayısı Gösterimi */}
            {(gunSayisi > 0 || formData.yolIzniTalep) && (
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
                    (Cumartesi ve Pazar günleri izin süresinden düşülmez)
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

                              <input
                                type="file"
                                onChange={handleBelgeYukle}
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-100 file:text-yellow-800 hover:file:bg-yellow-200"
                              />

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
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={formData.aciklama}
                onChange={(e) => handleInputChange('aciklama', e.target.value)}
                rows={3}
                placeholder="İzin talebiniz hakkında ek bilgiler..."
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
              disabled={!!validationError || !formData.employeeId || !formData.baslangicTarihi || !formData.bitisTarihi}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              Talebi Gönder
            </button>
          </div>
        </div>
      </div>
    </div>


    </>
  );
};

export default IzinTalepForm;