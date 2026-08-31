import React, { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, AlertCircle, MapPin, Upload, CheckCircle } from 'lucide-react';
import { Employee } from '../types';
import { IzinTalebi, IzinHakki, IzinTuru } from '../types/izin';
import { calculateWorkingDays, izinTuruLabels, getMaxIzinSureleri, validateIzinTuru } from '../utils/izinCalculations';
import { useScrollLock } from '../hooks/useScrollLock';

interface TopluIzinFormProps {
  employees: Employee[];
  onSubmit: (talepler: Partial<IzinTalebi>[]) => void;
  onClose: () => void;
}

const TopluIzinForm: React.FC<TopluIzinFormProps> = ({
  employees,
  onSubmit,
  onClose
}) => {
  useScrollLock(true);

  const [formData, setFormData] = useState({
    employeeIds: [] as string[],
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
  const [validationError, setValidationError] = useState<string>('');
  const [belgeDosyasi, setBelgeDosyasi] = useState<File | null>(null);
  const [belgeYuklendi, setBelgeYuklendi] = useState(false);

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

  // Tarih değiştiğinde gün sayısını hesapla
  useEffect(() => {
    if (formData.baslangicTarihi && formData.bitisTarihi) {
      const days = calculateWorkingDays(formData.baslangicTarihi, formData.bitisTarihi);
      setGunSayisi(days);
      
      // İzin süresi validasyonu
      if (days > 0) {
        const toplamGun = days + (formData.yolIzniTalep ? formData.yolIzniGun : 0);

        if (formData.izinTuru === 'yillik' && formData.kismiYillik && (days < 1 || days > 10)) {
          setValidationError('Kısmi yıllık izin 1 ile 10 iş günü arasında olmalıdır.');
          return;
        }

        const maxInfo = getMaxIzinSureleri(formData.izinTuru);
        if (maxInfo && toplamGun > maxInfo.maxGun) {
           setValidationError(`İzin süresi maksimum ${maxInfo.label} olabilir.`);
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
  }, [formData.baslangicTarihi, formData.bitisTarihi, formData.izinTuru, formData.kismiYillik, formData.yolIzniTalep, formData.yolIzniGun]);

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
      formData.employeeIds.length === 0 ||
      !formData.baslangicTarihi ||
      !formData.bitisTarihi
    ) {
      alert('Lütfen personelleri ve tüm zorunlu alanları doldurun!');
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

    const talepler = formData.employeeIds.map(empId => ({
      ...formData,
      employeeId: empId,
      bitisTarihi: formData.bitisTarihi,
      gunSayisi,
      belgeDosyasi: belgeDosyasi
    }));

    onSubmit(talepler);
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
            <h2 className="text-xl font-bold text-gray-800">Toplu İzin Talebi (Birden Fazla Kişi)</h2>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Personeller *</label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-white space-y-2">
                <label className="flex items-center gap-2 pb-2 border-b border-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.employeeIds.length === employees.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, employeeIds: employees.map(emp => emp.id) });
                      } else {
                        setFormData({ ...formData, employeeIds: [] });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-800">Tümünü Seç</span>
                </label>
                {employees.map(employee => (
                  <label key={employee.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={formData.employeeIds.includes(employee.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, employeeIds: [...formData.employeeIds, employee.id] });
                        } else {
                          setFormData({ ...formData, employeeIds: formData.employeeIds.filter(id => id !== employee.id) });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{employee.name} - {employee.department}</span>
                  </label>
                ))}
              </div>
            </div>
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
                    : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Toplam İzin Günü:</span>
                  <span className={`text-sm font-bold ${
                    validationError ? 'text-red-600' : 'text-gray-800'
                  }`}>{gunSayisi} gün</span>
                  {formData.yolIzniTalep && (
                    <>
                      <span className="text-sm text-gray-600">+ Yol İzni:</span>
                      <span className="text-sm font-bold text-blue-600">{formData.yolIzniGun} gün</span>
                    </>
                  )}
                  <span className="text-xs text-gray-500">(Hafta sonları hariç)</span>
                  <span className="text-xs text-gray-500">
                    / Maks: {effectiveMaxLabel}{formData.yolIzniTalep ? ' + 4 gün yol izni' : ''}
                  </span>
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
              disabled={!!validationError || formData.employeeIds.length === 0 || !formData.baslangicTarihi || !formData.bitisTarihi}
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

export default TopluIzinForm;
