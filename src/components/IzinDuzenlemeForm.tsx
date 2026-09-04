import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, CheckCircle, Clock, XCircle, Ban, Trash2, Save, ShieldAlert, Sparkles, User } from 'lucide-react';
import type { Employee } from '../types';
import type { IzinTalebi, IzinTuru, IzinDurum } from '../types/izin';
import { calculateWorkingDays, getCompanyIzinTurleri } from '../utils/izinCalculations';
import { leaveTypeService } from '../services/leaveTypeService';
import { useScrollLock } from '../hooks/useScrollLock';
import { useAuth } from '../contexts/AuthContext';

interface IzinDuzenlemeFormProps {
  talep: IzinTalebi;
  employee: Employee;
  onSubmit: (updatedTalep: Partial<IzinTalebi>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const IZIN_DURUMLARI = [
  { id: 'onaylandi', label: 'Onaylandı', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'beklemede', label: 'Onay Bekliyor', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'reddedildi', label: 'Reddedildi', color: 'bg-red-100 text-red-800 border-red-300' },
  { id: 'iptal', label: 'İptal Edildi', color: 'bg-gray-100 text-gray-800 border-gray-300' },
];

const IzinDuzenlemeForm: React.FC<IzinDuzenlemeFormProps> = ({
  talep,
  employee,
  onSubmit,
  onDelete,
  onClose
}) => {
  useScrollLock(true);
  const { isSuperAdmin, isAdmin } = useAuth();

  const [izinTuru, setIzinTuru] = useState<IzinTuru>(talep.izinTuru || 'yillik');
  const [baslangicTarihi, setBaslangicTarihi] = useState(talep.baslangicTarihi || '');
  const [bitisTarihi, setBitisTarihi] = useState(talep.bitisTarihi || '');
  const [gunSayisi, setGunSayisi] = useState<number>(talep.gunSayisi || 1);
  const [durum, setDurum] = useState<IzinDurum>(talep.durum || 'onaylandi');
  const [aciklama, setAciklama] = useState(talep.aciklama || '');
  
  const [yolIzniTalep, setYolIzniTalep] = useState(Boolean(talep.yolIzniTalep));
  const [yolIzniGun, setYolIzniGun] = useState<number>(talep.yolIzniGun || 0);
  const [seyahatYeri, setSeyahatYeri] = useState(talep.seyahatYeri || '');
  const [ilDisiSeyahat, setIlDisiSeyahat] = useState(Boolean(talep.ilDisiSeyahat));

  const [autoCalculate, setAutoCalculate] = useState(false);

  const targetCompanyId = employee?.company_id || talep?.companyId;
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState<Array<{ id: string; ad: string }>>(() => {
    return getCompanyIzinTurleri(targetCompanyId);
  });

  useEffect(() => {
    leaveTypeService.getLeaveTypes(targetCompanyId).then((types) => {
      if (types && types.length > 0) {
        setAvailableLeaveTypes(types);
      }
    });

    const handleUpdate = () => {
      leaveTypeService.getLeaveTypes(targetCompanyId).then((types) => {
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
  }, [targetCompanyId]);

  // Tarih değiştiğinde otomatik gün hesabı (istenirse)
  useEffect(() => {
    if (autoCalculate && baslangicTarihi && bitisTarihi) {
      const calcDays = calculateWorkingDays(baslangicTarihi, bitisTarihi);
      if (calcDays > 0) setGunSayisi(calcDays);
    }
  }, [baslangicTarihi, bitisTarihi, autoCalculate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baslangicTarihi || !bitisTarihi) {
      alert('Lütfen başlangıç ve bitiş tarihlerini giriniz.');
      return;
    }
    if (gunSayisi <= 0) {
      alert('Gün sayısı en az 1 olmalıdır.');
      return;
    }

    onSubmit({
      ...talep,
      izinTuru,
      baslangicTarihi,
      bitisTarihi,
      gunSayisi: Number(gunSayisi),
      durum,
      aciklama,
      yolIzniTalep,
      yolIzniGun: yolIzniTalep ? (Number(yolIzniGun) || 4) : 0,
      seyahatYeri: yolIzniTalep ? seyahatYeri : '',
      ilDisiSeyahat: yolIzniTalep ? ilDisiSeyahat : false
    });
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(talep.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Calendar className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">İzin Kaydını Düzenle / Yönet</h3>
                <span className="text-[10px] uppercase font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Yönetici Yetkisi
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">Önceden kullanılmış veya onaylanmış izin kayıtlarını düzenleme ve kaldırma</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Personel Bilgi Kartı */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                {employee?.name ? employee.name.slice(0, 2).toUpperCase() : 'PE'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{employee?.name || talep.employeeName || 'Personel'}</h4>
                <p className="text-xs text-gray-500">{employee?.department || 'Departman'} · {employee?.position || 'Pozisyon'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-gray-400 block">Talep Tarihi</span>
              <span className="text-xs font-semibold text-gray-700">{talep.talepTarihi || talep.createdAt?.split('T')[0] || '-'}</span>
            </div>
          </div>

          {/* İzin Türü Seçimi */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              İzin Türü <span className="text-red-500">*</span>
            </label>
            <select
              value={izinTuru}
              onChange={(e) => setIzinTuru(e.target.value as IzinTuru)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
            >
              {availableLeaveTypes.map((tur) => (
                <option key={tur.id} value={tur.id}>
                  {tur.ad}
                </option>
              ))}
            </select>
          </div>

          {/* Tarih Aralığı & Gün Sayısı */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Başlangıç Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={baslangicTarihi}
                onChange={(e) => {
                  setBaslangicTarihi(e.target.value);
                  setAutoCalculate(true);
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Bitiş Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={bitisTarihi}
                onChange={(e) => {
                  setBitisTarihi(e.target.value);
                  setAutoCalculate(true);
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Gün Sayısı <span className="text-red-500">*</span>
                </label>
              </div>
              <input
                type="number"
                min="1"
                max="365"
                value={gunSayisi}
                onChange={(e) => {
                  setAutoCalculate(false);
                  setGunSayisi(Math.max(1, parseInt(e.target.value) || 1));
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-blue-700 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* İzin Durumu */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              İzin Onay / Geçerlilik Durumu <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {IZIN_DURUMLARI.map((d) => {
                const isSelected = durum === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDurum(d.id as IzinDurum)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? `${d.color} ring-2 ring-blue-500/20 shadow-xs`
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {d.id === 'onaylandi' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                    {d.id === 'beklemede' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                    {d.id === 'reddedildi' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                    {d.id === 'iptal' && <Ban className="w-3.5 h-3.5 text-gray-600" />}
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              * Durum "Onaylandı" olduğunda çalışanın yıllık izin kotasından düşülür; "İptal" veya "Reddedildi" olduğunda bakiye personelin hesabına iade edilir.
            </p>
          </div>

          {/* Yol İzni Bölümü */}
          <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={yolIzniTalep}
                  onChange={(e) => setYolIzniTalep(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-blue-900">🚗 Yol İzni Dahil Edilsin</span>
              </label>
              {yolIzniTalep && (
                <span className="text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                  +{yolIzniGun || 4} Gün Yol İzni
                </span>
              )}
            </div>

            {yolIzniTalep && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Yol İzni Gün Sayısı</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={yolIzniGun || 4}
                    onChange={(e) => setYolIzniGun(Math.min(4, Math.max(1, parseInt(e.target.value) || 0)))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Seyahat Yeri / Şehir</label>
                  <input
                    type="text"
                    value={seyahatYeri}
                    onChange={(e) => setSeyahatYeri(e.target.value)}
                    placeholder="Örn: Ankara, İzmir"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Açıklama / Yönetici Notu
            </label>
            <textarea
              rows={2}
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="İzin gerekçesi veya yönetici düzenleme notu..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold text-xs transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Bu İzni Kalıcı Olarak Sil</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Değişiklikleri Kaydet</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default IzinDuzenlemeForm;
