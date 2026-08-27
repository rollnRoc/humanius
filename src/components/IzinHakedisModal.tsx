import React, { useState, useEffect } from 'react';
import { X, PlusCircle, ShieldCheck, UserCheck, Sparkles, Info } from 'lucide-react';
import type { Employee } from '../types';
import type { IzinHakki } from '../types/izin';

interface IzinHakedisModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  izinHaklari: IzinHakki[];
  initialEmployeeId?: string | null;
  onSubmit: (params: {
    employeeId: string;
    izinTuru: string;
    gunSayisi: number;
    islemTipi: 'ekle' | 'belirle';
    yil: number;
    aciklama: string;
  }) => Promise<void>;
}

export const IzinHakedisModal: React.FC<IzinHakedisModalProps> = ({
  isOpen,
  onClose,
  employees,
  izinHaklari,
  initialEmployeeId,
  onSubmit,
}) => {
  const currentYear = new Date().getFullYear();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId || '');
  const [islemTipi, setIslemTipi] = useState<'ekle' | 'belirle'>('ekle');
  const [gunSayisi, setGunSayisi] = useState<number>(14);
  const [yil, setYil] = useState<number>(currentYear);
  const [aciklama, setAciklama] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedEmpId(initialEmployeeId);
    } else if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].id);
    }
  }, [initialEmployeeId, employees]);

  if (!isOpen) return null;

  const activeEmployees = employees.filter((e) => e.status === 'active' || e.status === 'onLeave');
  const selectedEmp = employees.find((e) => e.id === selectedEmpId) || activeEmployees[0];
  const empHak = selectedEmp ? izinHaklari.find((h) => h.employeeId === selectedEmp.id && (h.yil === yil || !h.yil)) : null;

  const currentHak = empHak ? (empHak.toplamHak || 14) : 14;
  const currentUsed = empHak ? (empHak.kullanilanIzin || 0) : 0;
  const currentRemaining = Math.max(0, currentHak - currentUsed);

  // Calculate new expected hak
  const finalHak = islemTipi === 'ekle' ? currentHak + (Number(gunSayisi) || 0) : (Number(gunSayisi) || 0);
  const finalRemaining = Math.max(0, finalHak - currentUsed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      setErrorMsg('Lütfen bir personel seçiniz.');
      return;
    }
    if (gunSayisi <= 0) {
      setErrorMsg('Lütfen geçerli bir gün sayısı giriniz.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await onSubmit({
        employeeId: selectedEmpId,
        izinTuru: 'yillik',
        gunSayisi: Number(gunSayisi),
        islemTipi,
        yil: Number(yil),
        aciklama: aciklama.trim() || `${yil} yılı yıllık izin hak ediş güncellemesi`
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'İzin hakedişi kaydedilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const quickDays = [1, 2, 3, 5, 10, 14, 20];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Yıllık İzin Hak Edişi Tanımla</h3>
              <p className="text-xs text-blue-100 mt-0.5">Personel yıllık izin hakkı ekleme ve bakiye belirleme paneli</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Personel Seçimi */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Personel Seçimi <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            >
              {activeEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.department} ({emp.position})
                </option>
              ))}
            </select>
          </div>

          {/* Seçili Personel Mevcut Durum Özeti */}
          {selectedEmp && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>{selectedEmp.name}</span>
                </div>
                <p className="text-gray-500 mt-0.5">
                  {selectedEmp.department} · İşe Giriş: {selectedEmp.joinDate || 'Belirtilmedi'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-center">
                  <span className="text-[10px] text-gray-400 block">Mevcut Hak</span>
                  <span className="font-bold text-gray-800">{currentHak} Gün</span>
                </div>
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-center">
                  <span className="text-[10px] text-gray-400 block">Kullanılan</span>
                  <span className="font-bold text-amber-600">{currentUsed} Gün</span>
                </div>
                <div className="bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-600 block font-semibold">Kalan Bakiye</span>
                  <span className="font-extrabold text-emerald-700">{currentRemaining} Gün</span>
                </div>
              </div>
            </div>
          )}

          {/* İzin Türü Bilgisi */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-blue-900">🌴 İzin Türü:</span>
              <span className="text-xs font-semibold text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                Yıllık İzin (Ücretli İzin Hakkı)
              </span>
            </div>
            <span className="text-[11px] text-blue-600 font-medium">Bakiye ve hakedişe dahil edilir</span>
          </div>

          {/* İşlem Tipi & Yıl */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                İşlem Tipi
              </label>
              <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setIslemTipi('ekle')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    islemTipi === 'ekle'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ➕ Hak İlave Et (+)
                </button>
                <button
                  type="button"
                  onClick={() => setIslemTipi('belirle')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    islemTipi === 'belirle'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎯 Net Hak Belirle (=)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Geçerlilik Yılı
              </label>
              <select
                value={yil}
                onChange={(e) => setYil(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value={currentYear}>{currentYear} Yılı</option>
                <option value={currentYear + 1}>{currentYear + 1} Yılı</option>
                <option value={currentYear - 1}>{currentYear - 1} Yılı</option>
              </select>
            </div>
          </div>

          {/* Gün Sayısı & Hızlı Butonlar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {islemTipi === 'ekle' ? 'Eklenecek Gün Sayısı' : 'Yeni Toplam Gün Sayısı'} <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-blue-600 font-semibold">
                {islemTipi === 'ekle' ? `Mevcut ${currentHak} + ${gunSayisi} = ${finalHak} Gün` : `Toplam: ${finalHak} Gün`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="120"
                value={gunSayisi}
                onChange={(e) => setGunSayisi(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-28 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-base font-extrabold text-gray-800 text-center focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {quickDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setGunSayisi(d)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      gunSayisi === d
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {islemTipi === 'ekle' ? `+${d}` : `${d}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Açıklama / Gerekçe */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Açıklama / Dayanak Notu
            </label>
            <input
              type="text"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Örn: 2026 yılı hak edişi, Kıdem/Performans ek izni, Yönetim kurulu kararı"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          {/* Önizleme Kartı */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-950 block">Hakediş Sonrası Yeni Bakiye</span>
                <span className="text-[11px] text-blue-700 font-medium">
                  {selectedEmp?.name} için {yil} yılı toplam hak: <b>{finalHak} gün</b>
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-blue-600 block">Kullanılabilir Bakiye</span>
              <span className="text-lg font-black text-emerald-600">{finalRemaining} Gün</span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Kaydediliyor...</span>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Hak Edişi Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
