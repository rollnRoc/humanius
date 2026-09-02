import React, { useState } from 'react';
import { Users, Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Sparkles, PlusCircle, Edit2, Trash2 } from 'lucide-react';
import type { Employee } from '../types';
import type { IzinTalebi, IzinHakki } from '../types/izin';
import { useAuth } from '../contexts/AuthContext';
import { formatIzinTuru } from '../utils/izinCalculations';

interface IzinOzetKartlariProps {
  employees: Employee[];
  izinTalepleri: IzinTalebi[];
  izinHaklari: IzinHakki[];
  onUpdateHak?: (employeeId: string, toplamHak: number, mazeretHak: number, hakId?: string) => void;
  onOpenHakedisModal?: (employeeId?: string) => void;
  onEditIzin?: (talep: IzinTalebi) => void;
  onDeleteIzin?: (id: string) => void;
}

const IZIN_TURU_LABEL: Record<string, string> = {
  yillik: 'Yıllık',
  mazeret: 'Mazeret',
  hastalik: 'Hastalık',
  dogum: 'Doğum',
  babalik: 'Babalık',
  evlilik: 'Evlilik',
  olum: 'Ölüm',
  askerlik: 'Askerlik',
  ucretsiz: 'Ücretsiz',
};

const UCRETLI_IZIN_TURLERI = new Set([
  'yillik',
]);

const IzinOzetKartlari: React.FC<IzinOzetKartlariProps> = ({
  employees,
  izinTalepleri,
  izinHaklari,
  onUpdateHak,
  onOpenHakedisModal,
  onEditIzin,
  onDeleteIzin,
}) => {
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const { profile } = useAuth();
  const userRole = profile?.role || 'employee';
  const isAuthorized = !['employee', 'user'].includes(userRole);

  const [editingHakEmpId, setEditingHakEmpId] = useState<string | null>(null);
  const [inputToplamHak, setInputToplamHak] = useState<number>(14);
  const [inputMazeretHak, setInputMazeretHak] = useState<number>(5);

  const yil = new Date().getFullYear();
  const bugun = new Date().toISOString().split('T')[0];

  // ── Üst istatistikler ────────────────────────────────────────────────────────
  const bugünIzinli = izinTalepleri.filter((t) => {
    return (
      t.durum === 'onaylandi' &&
      t.baslangicTarihi <= bugun &&
      t.bitisTarihi >= bugun
    );
  }).length;

  const bekleyenTalep = izinTalepleri.filter((t) => t.durum === 'beklemede').length;

  const buYilKullanilanToplamGun = izinTalepleri
    .filter((t) => {
      const ty = new Date(t.baslangicTarihi).getFullYear();
      return t.durum === 'onaylandi' && ty === yil;
    })
    .reduce((sum, t) => sum + (t.gunSayisi || 0), 0);

  const toplamUcretliIzinBakiyesi = izinHaklari.reduce((sum, hak) => sum + Number(hak.kalanIzin || 0), 0);

  const buYilKullanilanUcretliIzin = izinTalepleri
    .filter((t) => {
      const ty = new Date(t.baslangicTarihi).getFullYear();
      return t.durum === 'onaylandi' && ty === yil && UCRETLI_IZIN_TURLERI.has(t.izinTuru);
    })
    .reduce((sum, t) => sum + (t.gunSayisi || 0) + (t.yolIzniTalep ? (t.yolIzniGun || 0) : 0), 0);

  const buYilKullanilanUcretsizIzin = izinTalepleri
    .filter((t) => {
      const ty = new Date(t.baslangicTarihi).getFullYear();
      return t.durum === 'onaylandi' && ty === yil && t.izinTuru === 'ucretsiz';
    })
    .reduce((sum, t) => sum + (t.gunSayisi || 0), 0);

  const yaklasanIzinler = izinTalepleri.filter((t) => {
    if (t.durum !== 'onaylandi') return false;
    return t.baslangicTarihi > bugun;
  }).length;

  // ── Personel başına özet ────────────────────────────────────────────────────
  const empSummaries = employees
    .filter((e) => e.status === 'active' || e.status === 'onLeave')
    .map((emp) => {
      const hak = izinHaklari.find((h) => h.employeeId === emp.id);
      const talepleri = izinTalepleri.filter((t) => t.employeeId === emp.id);
      const bekleyen = talepleri.filter((t) => t.durum === 'beklemede');
      const onaylanan = talepleri.filter((t) => t.durum === 'onaylandi');

      const kullanilanYillik = onaylanan
        .filter((t) => {
          const ty = new Date(t.baslangicTarihi).getFullYear();
          return t.izinTuru === 'yillik' && ty === yil;
        })
        .reduce((sum, t) => sum + (t.gunSayisi || 0), 0);

      const kullanilanMazeret = onaylanan
        .filter((t) => t.izinTuru === 'mazeret')
        .reduce((sum, t) => sum + (t.gunSayisi || 0), 0);

      const kullanilanHastalik = onaylanan
        .filter((t) => t.izinTuru === 'hastalik')
        .reduce((sum, t) => sum + (t.gunSayisi || 0), 0);

      const kullanilanUcretsiz = onaylanan
        .filter((t) => t.izinTuru === 'ucretsiz')
        .reduce((sum, t) => sum + (t.gunSayisi || 0), 0);

      const kullanilanUcretliToplam = onaylanan
        .filter((t) => UCRETLI_IZIN_TURLERI.has(t.izinTuru))
        .reduce((sum, t) => sum + (t.gunSayisi || 0) + (t.yolIzniTalep ? (t.yolIzniGun || 0) : 0), 0);

      // ── Dynamic Fallback (4857 Sayılı İş Kanunu Madde 53) ─────────────────
      let calculatedToplamHak = 14;
      let calismaYili = 0;
      const joinDateStr = emp.joinDate || (emp as any).join_date || (emp as any).ise_giris_tarihi || (emp as any).created_at;
      if (joinDateStr) {
        const joinDate = new Date(joinDateStr);
        if (!isNaN(joinDate.getTime())) {
          const now = new Date();
          calismaYili = Math.max(0, now.getFullYear() - joinDate.getFullYear());
          if (calismaYili < 5) calculatedToplamHak = 14;
          else if (calismaYili < 15) calculatedToplamHak = 20;
          else calculatedToplamHak = 26;
        }
      }

      const toplamHak = (hak && hak.toplamHak !== undefined && hak.toplamHak !== null) ? hak.toplamHak : calculatedToplamHak;
      const kalanYillik = Math.max(0, toplamHak - kullanilanYillik);
      const pct = toplamHak > 0 ? Math.round((kullanilanYillik / toplamHak) * 100) : 0;

      const siradakiIzin = onaylanan
        .filter((t) => t.baslangicTarihi > bugun)
        .sort((left, right) => left.baslangicTarihi.localeCompare(right.baslangicTarihi))[0] ?? null;

      const bugunIzinde =
        emp.status === 'onLeave' ||
        onaylanan.some((t) => t.baslangicTarihi <= bugun && t.bitisTarihi >= bugun);

      return {
        emp,
        hak,
        talepleri,
        bekleyen,
        onaylanan,
        kullanilanYillik,
        kullanilanMazeret,
        kullanilanHastalik,
        kullanilanUcretsiz,
        kullanilanUcretliToplam,
        toplamHak,
        kalanYillik,
        pct,
        bugunIzinde,
        siradakiIzin,
      };
    });

  const toggle = (id: string) => setExpandedEmp((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4">
      {/* ── Üst stat kartları ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-tight">Aktif Personel</p>
            <p className="text-2xl font-bold text-gray-900">{employees.filter((e) => e.status === 'active' || e.status === 'onLeave').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-blue-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-tight">Bugün İzinli</p>
            <p className="text-2xl font-bold text-blue-700">{bugünIzinli}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-tight">Bekleyen Talep</p>
            <p className="text-2xl font-bold text-amber-700">{bekleyenTalep}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-tight">Bu Yıl Kullanılan</p>
            <p className="text-2xl font-bold text-emerald-700">{buYilKullanilanToplamGun} <span className="text-sm font-normal text-gray-500">gün</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-cyan-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-tight">Toplam Ücretli Bakiye</p>
            <p className="text-2xl font-bold text-cyan-700">{toplamUcretliIzinBakiyesi} <span className="text-sm font-normal text-gray-500">gün</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-violet-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-tight">Kullanılan Ücretli</p>
            <p className="text-2xl font-bold text-violet-700">{buYilKullanilanUcretliIzin} <span className="text-sm font-normal text-gray-500">gün</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-tight">Ücretsiz İzin</p>
            <p className="text-2xl font-bold text-rose-700">{buYilKullanilanUcretsizIzin} <span className="text-sm font-normal text-gray-500">gün</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-indigo-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-tight">Yaklaşan İzin</p>
            <p className="text-2xl font-bold text-indigo-700">{yaklasanIzinler}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {empSummaries.map(({ emp, kullanilanUcretliToplam, kalanYillik, kullanilanUcretsiz, siradakiIzin, bekleyen }) => (
          <div key={`ozet-${emp.id}`} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{emp.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{emp.department} · {emp.position}</p>
              </div>
              {bekleyen.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">{bekleyen.length} bekliyor</span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                <p className="text-[11px] text-emerald-700">Kullanılan</p>
                <p className="mt-1 text-lg font-bold text-emerald-800">{kullanilanUcretliToplam}</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-[11px] text-blue-700">Kalan Ücretli</p>
                <p className="mt-1 text-lg font-bold text-blue-800">{kalanYillik}</p>
              </div>
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
                <p className="text-[11px] text-rose-700">Ücretsiz</p>
                <p className="mt-1 text-lg font-bold text-rose-800">{kullanilanUcretsiz}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Sıradaki İzin</p>
              {siradakiIzin ? (
                <p className="mt-1 text-sm text-gray-700">
                  {formatIzinTuru(siradakiIzin.izinTuru)} · {siradakiIzin.baslangicTarihi} - {siradakiIzin.bitisTarihi}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-400">Planlı izin görünmüyor.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Personel İzin Durumu ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800">Personel İzin Durumu — {yil}</h3>
          </div>
          {isAuthorized && onOpenHakedisModal && (
            <button
              onClick={() => onOpenHakedisModal()}
              className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>+ İzin Hak Edişi Tanımla</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          {empSummaries.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Henüz personel verisi yok.</p>
          )}

          {empSummaries.map(({ emp, hak, bekleyen, kullanilanYillik, kullanilanMazeret, kullanilanHastalik, kullanilanUcretsiz, toplamHak, kalanYillik, pct, bugunIzinde, talepleri }) => {
            const isExpanded = expandedEmp === emp.id;
            return (
              <div key={emp.id}>
                {/* Satır */}
                <button
                  onClick={() => toggle(emp.id)}
                  className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* İsim */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 truncate">{emp.name}</span>
                        {bugunIzinde && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">Bugün izinli</span>
                        )}
                        {bekleyen.length > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">{bekleyen.length} bekliyor</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{emp.department} · {emp.position}</p>
                    </div>

                    {/* Yıllık hak ilerleme */}
                    <div className="hidden sm:block w-36">
                      {toplamHak > 0 ? (
                        <>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Yıllık {kullanilanYillik}/{toplamHak} gün</span>
                            <span className="font-medium text-gray-700">{kalanYillik} kalan</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-red-400' : pct >= 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Hak tanımlanmamış</span>
                      )}
                    </div>

                    {/* Chevron */}
                    <div className="shrink-0 text-gray-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* Genişletilmiş detay */}
                {isExpanded && (
                  <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs text-gray-500 mb-1">Yıllık İzin Hakkı</p>
                        <p className="text-xl font-bold text-gray-800">{toplamHak} <span className="text-sm font-normal text-gray-500">gün</span></p>
                      </div>
                      <div className="bg-white rounded-lg border border-emerald-200 p-3">
                        <p className="text-xs text-gray-500 mb-1">Kullanılan Yıllık</p>
                        <p className="text-xl font-bold text-emerald-700">{kullanilanYillik} <span className="text-sm font-normal text-gray-500">gün</span></p>
                      </div>
                      <div className="bg-white rounded-lg border border-blue-200 p-3">
                        <p className="text-xs text-gray-500 mb-1">Kalan Yıllık</p>
                        <p className="text-xl font-bold text-blue-700">{kalanYillik} <span className="text-sm font-normal text-gray-500">gün</span></p>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs text-gray-500 mb-1">Mazeret / Hastalık</p>
                        <p className="text-xl font-bold text-gray-800">{kullanilanMazeret} / {kullanilanHastalik} <span className="text-sm font-normal text-gray-500">gün</span></p>
                      </div>
                      <div className="bg-white rounded-lg border border-rose-200 p-3">
                        <p className="text-xs text-gray-500 mb-1">Ücretsiz İzin</p>
                        <p className="text-xl font-bold text-rose-700">{kullanilanUcretsiz} <span className="text-sm font-normal text-gray-500">gün</span></p>
                      </div>
                    </div>

                    {/* Son talepler */}
                    {talepleri.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Son İzin Talepleri</p>
                        <div className="space-y-1.5">
                          {talepleri.slice(0, 5).map((t) => (
                            <div key={t.id} className="flex items-center gap-3 text-sm bg-white rounded-lg border border-gray-100 px-3 py-2">
                              <span className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full ${
                                t.durum === 'onaylandi' ? 'bg-emerald-100' : t.durum === 'beklemede' ? 'bg-amber-100' : 'bg-red-100'
                              }`}>
                                {t.durum === 'onaylandi'
                                  ? <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  : t.durum === 'beklemede'
                                  ? <Clock className="w-3 h-3 text-amber-600" />
                                  : <XCircle className="w-3 h-3 text-red-500" />}
                              </span>
                              <span className="font-semibold text-gray-800 shrink-0">{formatIzinTuru(t.izinTuru)}</span>
                              <span className="text-gray-400 text-xs shrink-0">{t.baslangicTarihi} – {t.bitisTarihi}</span>
                              <span className="ml-auto text-gray-700 font-semibold text-xs shrink-0">{t.gunSayisi} gün</span>
                              
                              {/* Düzenle / Sil */}
                              {isAuthorized && (onEditIzin || onDeleteIzin) && (
                                <div className="flex items-center gap-1 shrink-0 border-l border-gray-100 pl-2">
                                  {onEditIzin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditIzin(t);
                                      }}
                                      title="İzni Düzenle / Değiştir"
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onDeleteIzin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteIzin(t.id);
                                      }}
                                      title="İzni Sil / Kaldır"
                                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* İzin Hakları Düzenleme (İK / Yönetici) */}
                    {isAuthorized && (
                      <div className="mt-4 pt-4 border-t border-gray-150">
                        {editingHakEmpId === emp.id ? (
                          <div className="flex flex-wrap items-center gap-4 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm w-full">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-600">Yıllık Hak:</span>
                              <input
                                type="number"
                                value={inputToplamHak}
                                onChange={(e) => setInputToplamHak(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-16 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-gray-700 text-center"
                              />
                              <span className="text-xs text-gray-400">gün</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-600">Mazeret Hak:</span>
                              <input
                                type="number"
                                value={inputMazeretHak}
                                onChange={(e) => setInputMazeretHak(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-16 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold text-gray-700 text-center"
                              />
                              <span className="text-xs text-gray-400">gün</span>
                            </div>
                            <div className="flex gap-2 ml-auto">
                              <button
                                onClick={() => setEditingHakEmpId(null)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                              >
                                İptal
                              </button>
                              <button
                                onClick={() => {
                                  if (onUpdateHak) {
                                    onUpdateHak(emp.id, inputToplamHak, inputMazeretHak, hak?.id);
                                  }
                                  setEditingHakEmpId(null);
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-colors"
                              >
                                Kaydet
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full flex items-center justify-end gap-2">
                            {onOpenHakedisModal && (
                              <button
                                onClick={() => onOpenHakedisModal(emp.id)}
                                className="px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Yıllık İzin Hak Edişi Ekle / Yönet</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingHakEmpId(emp.id);
                                setInputToplamHak(toplamHak);
                                setInputMazeretHak(hak?.mazeret ?? 5);
                              }}
                              className="px-3.5 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-bold transition-all shadow-xs"
                            >
                              Hızlı Düzenle
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IzinOzetKartlari;
