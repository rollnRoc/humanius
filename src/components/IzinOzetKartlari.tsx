import React, { useState, useMemo } from 'react';
import { Users, Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Sparkles, PlusCircle, Edit2, Trash2, ArrowUpDown, Search } from 'lucide-react';
import type { Employee } from '../types';
import type { IzinTalebi, IzinHakki } from '../types/izin';
import { useAuth } from '../contexts/AuthContext';
import { formatIzinTuru, calculateCompletedYears, calculateYillikIzinHakki, hasCompletedOneYear, getYillikIzinHakEdisTarihi, formatDate } from '../utils/izinCalculations';

interface IzinOzetKartlariProps {
  employees: Employee[];
  izinTalepleri: IzinTalebi[];
  izinHaklari: IzinHakki[];
  onUpdateHak?: (employeeId: string, toplamHak: number, mazeretHak: number, hakId?: string) => void;
  onOpenHakedisModal?: (employeeId?: string) => void;
  onEditIzin?: (talep: IzinTalebi) => void;
  onDeleteIzin?: (id: string) => void;
  viewMode?: 'all' | 'kpi' | 'table';
  onNavigateToPending?: () => void;
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

const UCRETLI_IZIN_TURLERI = new Set(['yillik', 'mazeret', 'hastalik', 'dogum', 'babalik', 'evlilik', 'olum']);

const getInitials = (name?: string) => {
  const safe = String(name || '').trim();
  if (!safe) return '?';
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
};

export const IzinOzetKartlari: React.FC<IzinOzetKartlariProps> = ({
  employees,
  izinTalepleri,
  izinHaklari,
  onUpdateHak,
  onOpenHakedisModal,
  onEditIzin,
  onDeleteIzin,
  viewMode = 'all',
  onNavigateToPending,
}) => {
  const { isSuperAdmin, isAdmin, isHR } = useAuth();
  const isAuthorized = isSuperAdmin || isAdmin || isHR;

  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [editingHakEmpId, setEditingHakEmpId] = useState<string | null>(null);
  const [inputToplamHak, setInputToplamHak] = useState<number>(14);
  const [inputMazeretHak, setInputMazeretHak] = useState<number>(5);
  type SortField = 'name' | 'department' | 'kullanilan' | 'kalan' | 'toplam';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

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

      const kullanilanYillikFromTalepler = onaylanan
        .filter((t) => {
          const ty = new Date(t.baslangicTarihi).getFullYear();
          return t.izinTuru === 'yillik' && ty === yil;
        })
        .reduce((sum, t) => sum + (t.gunSayisi || 0), 0);

      const kullanilanYillik = (hak && typeof hak.kullanilanIzin === 'number' && hak.kullanilanIzin > 0)
        ? Math.max(kullanilanYillikFromTalepler, hak.kullanilanIzin)
        : kullanilanYillikFromTalepler;

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

      // ── Dynamic Fallback (4857 Sayılı İş Kanunu Madde 53/54) ─────────────────
      const joinDateStr = emp.joinDate || (emp as any).join_date || (emp as any).ise_giris_tarihi || (emp as any).created_at;
      const calismaYili = calculateCompletedYears(joinDateStr);
      const has1Year = calismaYili >= 1;
      const calculatedToplamHak = calculateYillikIzinHakki(calismaYili);

      const toplamHak = (hak && hak.toplamHak !== undefined && hak.toplamHak !== null) ? hak.toplamHak : calculatedToplamHak;
      const kalanYillik = (hak && typeof hak.kalanIzin === 'number')
        ? hak.kalanIzin
        : Math.max(0, toplamHak - kullanilanYillik);
      const pct = toplamHak > 0 ? Math.min(100, Math.max(0, Math.round((kullanilanYillik / toplamHak) * 100))) : 0;

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
        calismaYili,
        has1Year,
        joinDateStr,
      };
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.emp.name || '').localeCompare(b.emp.name || '', 'tr');
          break;
        case 'department':
          cmp = (a.emp.department || '').localeCompare(b.emp.department || '', 'tr');
          break;
        case 'kullanilan':
          cmp = a.kullanilanUcretliToplam - b.kullanilanUcretliToplam;
          break;
        case 'kalan':
          cmp = a.kalanYillik - b.kalanYillik;
          break;
        case 'toplam':
          cmp = a.toplamHak - b.toplamHak;
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const departments = Array.from(
    new Set(
      employees
        .map((e) => e.department)
        .filter((d): d is string => Boolean(d && d.trim()))
    )
  ).sort((a, b) => a.localeCompare(b, 'tr'));

  const filteredEmpSummaries = useMemo(() => {
    return empSummaries.filter(({ emp }) => {
      const rawTerm = searchTerm.trim();
      const matchesDept = selectedDepartment === 'all' || emp.department === selectedDepartment;
      if (!matchesDept) return false;

      if (!rawTerm) return true;

      const termLower = rawTerm.toLowerCase();
      const termTr = rawTerm.toLocaleLowerCase('tr-TR');

      const name = (emp.name || '').toLowerCase();
      const nameTr = (emp.name || '').toLocaleLowerCase('tr-TR');
      const dept = (emp.department || '').toLowerCase();
      const deptTr = (emp.department || '').toLocaleLowerCase('tr-TR');
      const pos = (emp.position || '').toLowerCase();
      const posTr = (emp.position || '').toLocaleLowerCase('tr-TR');
      const sicil = String((emp as any).sicil_no || (emp as any).sicilNo || '').toLowerCase();
      const tc = String((emp as any).tc_no || (emp as any).tcNo || '').toLowerCase();

      return (
        name.includes(termLower) ||
        nameTr.includes(termTr) ||
        dept.includes(termLower) ||
        deptTr.includes(termTr) ||
        pos.includes(termLower) ||
        posTr.includes(termTr) ||
        sicil.includes(termLower) ||
        tc.includes(termLower)
      );
    });
  }, [empSummaries, searchTerm, selectedDepartment]);

  const toggle = (id: string) => setExpandedEmp((prev) => (prev === id ? null : id));

  const showKpi = viewMode === 'all' || viewMode === 'kpi';
  const showTable = viewMode === 'all' || viewMode === 'table';

  return (
    <div className="space-y-6">
      {/* ── Üst stat kartları & Hızlı Özet ── */}
      {showKpi && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm ring-1 ring-slate-900/[0.04] p-5 flex items-center gap-4 hover:border-slate-300 transition-all">
              <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 leading-tight">Aktif Personel</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{employees.filter((e) => e.status === 'active' || e.status === 'onLeave').length}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-blue-200/90 shadow-sm ring-1 ring-blue-900/[0.04] p-5 flex items-center gap-4 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 leading-tight">Bugün İzinli</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{bugünIzinli}</p>
              </div>
            </div>

            <div 
              onClick={() => {
                if (onNavigateToPending && bekleyenTalep > 0) onNavigateToPending();
              }}
              className={`bg-white rounded-2xl border-2 border-amber-200/90 shadow-sm ring-1 ring-amber-900/[0.04] p-5 flex items-center gap-4 transition-all ${
                onNavigateToPending && bekleyenTalep > 0 ? 'cursor-pointer hover:border-amber-400 hover:shadow-md hover:bg-amber-50/20' : ''
              }`}
              title={onNavigateToPending && bekleyenTalep > 0 ? 'Onay bekleyen talepleri görmek için tıklayın' : undefined}
            >
              <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 leading-tight">Bekleyen Talep</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-black text-amber-700">{bekleyenTalep}</p>
                  {onNavigateToPending && bekleyenTalep > 0 && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                      İncele →
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-emerald-200/90 shadow-sm ring-1 ring-emerald-900/[0.04] p-5 flex items-center gap-4 hover:border-emerald-300 transition-all">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 leading-tight">Bu Yıl Kullanılan</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{buYilKullanilanToplamGun} <span className="text-xs font-semibold text-slate-500">gün</span></p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-cyan-200/90 shadow-sm ring-1 ring-cyan-900/[0.04] p-5 flex items-center gap-4 hover:border-cyan-300 transition-all">
              <div className="w-12 h-12 bg-cyan-50 border border-cyan-100 rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle className="w-6 h-6 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 leading-tight">Toplam Ücretli Bakiye</p>
                <p className="text-2xl font-black text-cyan-700 mt-1">{toplamUcretliIzinBakiyesi} <span className="text-xs font-semibold text-slate-500">gün</span></p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-violet-200/90 shadow-sm ring-1 ring-violet-900/[0.04] p-5 flex items-center gap-4 hover:border-violet-300 transition-all">
              <div className="w-12 h-12 bg-violet-50 border border-violet-100 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-6 h-6 text-violet-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 leading-tight">Kullanılan Ücretli</p>
                <p className="text-2xl font-black text-violet-700 mt-1">{buYilKullanilanUcretliIzin} <span className="text-xs font-semibold text-slate-500">gün</span></p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-rose-200/90 shadow-sm ring-1 ring-rose-900/[0.04] p-5 flex items-center gap-4 hover:border-rose-300 transition-all">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                <XCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 leading-tight">Ücretsiz İzin</p>
                <p className="text-2xl font-black text-rose-700 mt-1">{buYilKullanilanUcretsizIzin} <span className="text-xs font-semibold text-slate-500">gün</span></p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-sm ring-1 ring-indigo-900/[0.04] p-5 flex items-center gap-4 hover:border-indigo-300 transition-all">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                <AlertCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 leading-tight">Yaklaşan İzin</p>
                <p className="text-2xl font-black text-indigo-700 mt-1">{yaklasanIzinler}</p>
              </div>
            </div>
          </div>

          {/* ── Belirgin Arama ve Filtreleme Alanı ── */}
          <div className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm ring-1 ring-slate-900/[0.04] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Personel İzin Özetleri</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {filteredEmpSummaries.length === empSummaries.length
                      ? `Toplam ${empSummaries.length} personel listeleniyor`
                      : `${empSummaries.length} personelden kriterlere uyan ${filteredEmpSummaries.length} kişi listeleniyor`}
                  </p>
                </div>
              </div>

              {/* Hızlı Sayaç Rozetleri */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  Toplam: {empSummaries.length}
                </span>
                {bugünIzinli > 0 && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    Bugün İzinde: {bugünIzinli}
                  </span>
                )}
                {bekleyenTalep > 0 && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                    Bekleyen Talep: {bekleyenTalep}
                  </span>
                )}
              </div>
            </div>

            {/* Arama Inputu ve Departman Filtresi */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Personel adı, departman veya unvana göre ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-11 py-3.5 text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-900 placeholder-slate-400 shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-sm font-bold cursor-pointer"
                    title="Aramayı Temizle"
                  >
                    ×
                  </button>
                )}
              </div>

              {departments.length > 0 && (
                <div className="w-full sm:w-auto min-w-[220px]">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full py-3.5 px-4 text-sm bg-slate-50/70 hover:bg-slate-100/70 border-2 border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 cursor-pointer transition-all shadow-2xs"
                  >
                    <option value="all">Tüm Departmanlar ({departments.length})</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Personel Kartları Grid'i */}
          {filteredEmpSummaries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-gray-100">
                <Search className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-gray-900">
                Aramanıza Uygun Personel Bulunamadı
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                {searchTerm
                  ? `"${searchTerm}" aramasıyla eşleşen aktif personel kaydı bulunamadı.`
                  : 'Seçili filtre kriterlerine uygun personel kaydı bulunamadı.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartment('all');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Filtreleri Temizle</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredEmpSummaries.map(({ emp, toplamHak, kullanilanUcretliToplam, kalanYillik, kullanilanUcretsiz, siradakiIzin, bekleyen, bugunIzinde }) => (
                <div
                  key={`ozet-${emp.id}`}
                  className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-400 transition-all p-6 flex flex-col justify-between gap-5 ring-1 ring-slate-900/[0.04]"
                >
                  {/* Başlık ve Rozetler */}
                  <div>
                    <div className="flex items-center justify-between gap-3.5 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {emp.avatar_url ? (
                          <img
                            src={emp.avatar_url}
                            alt={emp.name}
                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm tracking-wider ring-2 ring-blue-100 shrink-0 shadow-2xs">
                            {getInitials(emp.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-slate-900 truncate leading-snug">
                            {emp.name}
                          </h4>
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {emp.department || 'Departmansız'} <span className="text-slate-300">•</span> {emp.position || 'Görevsiz'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-center gap-1.5 shrink-0">
                        {bugunIzinde && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/90 px-2.5 py-0.5 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                            İzinde
                          </span>
                        )}
                        {bekleyen.length > 0 && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 px-2.5 py-0.5 text-[10px] font-bold">
                            {bekleyen.length} Bekliyor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* İzin İstatistik Kutuları */}
                    <div className="mt-4 grid grid-cols-3 gap-2.5">
                      <div className="rounded-xl bg-slate-50/90 border border-slate-200 p-3 text-center flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Toplam Hak</span>
                        <span className="mt-1 text-base font-extrabold text-slate-900 leading-tight">
                          {toplamHak} <span className="text-[10px] font-normal text-slate-500">gün</span>
                        </span>
                      </div>
                      <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 text-center flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Kullanılan</span>
                        <span className="mt-1 text-base font-extrabold text-blue-950 leading-tight">
                          {kullanilanUcretliToplam} <span className="text-[10px] font-normal text-blue-600">gün</span>
                        </span>
                      </div>
                      <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3 text-center flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Kalan İzin</span>
                        <span className="mt-1 text-base font-extrabold text-emerald-900 leading-tight">
                          {kalanYillik} <span className="text-[10px] font-normal text-emerald-600">gün</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sıradaki İzin Bölümü */}
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2 font-semibold text-slate-600 shrink-0">
                        <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span>Sıradaki İzin:</span>
                      </div>
                      {siradakiIzin ? (
                        <span className="font-bold text-blue-700 truncate text-right">
                          {formatIzinTuru(siradakiIzin.izinTuru)} ({siradakiIzin.gunSayisi} gün)
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Planlı izin yok</span>
                      )}
                    </div>
                    {siradakiIzin && (
                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-medium text-slate-400">Tarih Aralığı:</span>
                        <span className="font-semibold text-slate-700">
                          {formatDate(siradakiIzin.baslangicTarihi)} — {formatDate(siradakiIzin.bitisTarihi)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Personel İzin Durumu Tablosu ── */}
      {showTable && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-base font-bold text-gray-900">Personel İzin Durumu — {yil}</h3>
                <p className="text-xs text-gray-500">Çalışanların yıllık ve mazeret hak edişleri, kullanılan ve kalan bakiyeleri</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Arama Inputu */}
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Personel ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Departman Filtresi */}
              {departments.length > 0 && (
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium text-gray-700"
                >
                  <option value="all">Tüm Departmanlar ({departments.length})</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              )}

              {/* Sıralama Ölçütü */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 font-semibold text-gray-700 cursor-pointer"
              >
                <option value="name">Ada Göre</option>
                <option value="department">Departmana Göre</option>
                <option value="kalan">Kalan İzne Göre</option>
                <option value="kullanilan">Kullanılan İzne Göre</option>
                <option value="toplam">Toplam Hakka Göre</option>
              </select>

              {/* A → Z Sıralama Butonu */}
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="flex items-center gap-1.5 border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title={sortOrder === 'asc' ? 'A → Z / 0-9 Sıralı' : 'Z → A / 9-0 Sıralı'}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                <span>{sortOrder === 'asc' ? 'A-Z / 0-9' : 'Z-A / 9-0'}</span>
              </button>

              {isAuthorized && onOpenHakedisModal && (
                <button
                  onClick={() => onOpenHakedisModal()}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Hak Ediş Tanımla</span>
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredEmpSummaries.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">
                  {searchTerm || selectedDepartment !== 'all'
                    ? 'Filtre kriterlerine uygun personel bulunamadı.'
                    : 'Henüz personel verisi yok.'}
                </p>
                {(searchTerm || selectedDepartment !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedDepartment('all');
                    }}
                    className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            )}

            {filteredEmpSummaries.map(({ emp, hak, bekleyen, kullanilanYillik, kullanilanMazeret, kullanilanHastalik, kullanilanUcretsiz, toplamHak, kalanYillik, pct, bugunIzinde, talepleri, has1Year }) => {
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
                          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                            <span>Yıllık <b className="text-gray-800">{kullanilanYillik}</b>/{toplamHak} gün</span>
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">{kalanYillik} kalan</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/60" title={`Kullanılan: %${pct} (${kullanilanYillik}/${toplamHak} gün) • Kalan: ${kalanYillik} gün`}>
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : pct > 0 ? 'bg-blue-600' : 'bg-transparent'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                            />
                          </div>
                        </>
                      ) : !has1Year ? (
                        <div className="text-right">
                          <span className="inline-block text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                            1 Yıl Dolmadı (0 Gün)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">0 gün hak</span>
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
                        {!has1Year && (
                          <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                            Kıdem: 1 yıldan az (Kanuni Hak: 0 Gün)
                          </span>
                        )}
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
      )}
    </div>
  );
};

export default IzinOzetKartlari;
