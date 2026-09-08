import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  History,
  LayoutDashboard,
  Users,
  Calendar,
  Sparkles,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  Edit2,
  Trash2,
  UserCheck,
  Briefcase,
  FileText
} from 'lucide-react';
import type { Employee } from '../types';
import type { IzinTalebi, IzinHakki } from '../types/izin';
import { formatIzinTuru } from '../utils/izinCalculations';
import { IzinWorkflow } from './IzinWorkflow';
import { canApproveLeave } from '../auth/roles';
import IzinOzetKartlari from './IzinOzetKartlari';
import IzinTakvimi from './IzinTakvimi';

export type IzinTabId = 'onay-bekleyen' | 'son-islemler' | 'ozet-paneli' | 'personel-durumu' | 'takvim';

export interface IzinYonetimiProps {
  employees: Employee[];
  izinTalepleri: IzinTalebi[];
  izinHaklari: IzinHakki[];
  profile?: any;
  currentEmployeeMatch?: Employee;
  currentEmployeeIzinHakki?: IzinHakki;
  currentEmployeeIzinTalepleri: IzinTalebi[];
  effectiveAppRole: string;
  onNewTalep: () => void;
  onOpenHakedisModal: (empId?: string) => void;
  onOpenTopluIzin: () => void;
  onOnay: (id: string) => void;
  onRed: (id: string) => void;
  onEdit: (talep: IzinTalebi) => void;
  onDelete: (id: string) => void;
  onUpdateHak: (employeeId: string, toplamHak: number, mazeretHak: number, hakId?: string) => void;
}

function formatDateTR(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      return `${day} ${months[month]} ${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {}
  return dateStr;
}

function formatDateRange(start?: string, end?: string): string {
  if (!start) return '';
  const s = formatDateTR(start);
  const e = formatDateTR(end);
  if (s && e && s !== e) {
    return `${s} — ${e}`;
  }
  return s || e || '';
}

export const IzinYonetimi: React.FC<IzinYonetimiProps> = ({
  employees,
  izinTalepleri,
  izinHaklari,
  profile,
  currentEmployeeMatch,
  currentEmployeeIzinHakki,
  currentEmployeeIzinTalepleri,
  effectiveAppRole,
  onNewTalep,
  onOpenHakedisModal,
  onOpenTopluIzin,
  onOnay,
  onRed,
  onEdit,
  onDelete,
  onUpdateHak,
}) => {
  const isAuthorized = !['employee', 'user'].includes(effectiveAppRole);
  const canApprove = canApproveLeave(effectiveAppRole as any);

  // Normal personel sadece kendisine ait talepleri görebilir, yetkili roller tüm şirket taleplerini görebilir
  const userLeaves = useMemo(() => {
    if (isAuthorized) return izinTalepleri;
    return izinTalepleri.filter((talep) => {
      if (currentEmployeeMatch && talep.employeeId === currentEmployeeMatch.id) return true;
      const profileEmail = String(profile?.email ?? '').trim().toLowerCase();
      const empEmail = String(talep.employees?.email ?? '').trim().toLowerCase();
      if (profileEmail && empEmail && profileEmail === empEmail) return true;
      const profileName = String(profile?.full_name ?? '').trim().toLowerCase();
      const talepEmpName = String(talep.employeeName ?? '').trim().toLowerCase();
      if (profileName && talepEmpName) {
        if (profileName === talepEmpName) return true;
        if (profileName.replace(/[\s-]/g, '') === talepEmpName.replace(/[\s-]/g, '')) return true;
      }
      return false;
    });
  }, [isAuthorized, izinTalepleri, currentEmployeeMatch, profile]);

  // Ayrılmış talepler (personel için yalnızca kendi talepleri)
  const bekleyenler = useMemo(() => {
    return userLeaves.filter((t) => t.durum === 'beklemede');
  }, [userLeaves]);

  const sonIslemler = useMemo(() => {
    return userLeaves
      .filter((t) => t.durum !== 'beklemede')
      .sort((a, b) => (b.baslangicTarihi || '').localeCompare(a.baslangicTarihi || ''));
  }, [userLeaves]);

  // Varsayılan sekme: Normal personelde her zaman 'onay-bekleyen', yöneticide bekleyen varsa 'onay-bekleyen', yoksa 'ozet-paneli'
  const [activeTab, setActiveTab] = useState<IzinTabId>(() => {
    if (!isAuthorized) return 'onay-bekleyen';
    return bekleyenler.length > 0 ? 'onay-bekleyen' : 'ozet-paneli';
  });

  // Güvenlik koruması: Normal personel yetkisiz bir sekmeye erişemez
  useEffect(() => {
    if (!isAuthorized && !['onay-bekleyen', 'son-islemler'].includes(activeTab)) {
      setActiveTab('onay-bekleyen');
    }
  }, [isAuthorized, activeTab]);

  // Tab 2 (Son İşlemler) Filtreleri
  const [sonIslemSearch, setSonIslemSearch] = useState('');
  const [sonIslemStatusFilter, setSonIslemStatusFilter] = useState<'all' | 'onaylandi' | 'reddedildi' | 'iptal'>('all');
  const [sonIslemTurFilter, setSonIslemTurFilter] = useState<string>('all');

  // Tab 1 (Bekleyenler) Arama
  const [bekleyenSearch, setBekleyenSearch] = useState('');

  // Filtrelenmiş bekleyenler
  const filteredBekleyenler = useMemo(() => {
    if (!bekleyenSearch.trim()) return bekleyenler;
    const term = bekleyenSearch.toLowerCase().trim();
    return bekleyenler.filter((t) => {
      const name = (t.employeeName || '').toLowerCase();
      const tur = formatIzinTuru(t.izinTuru).toLowerCase();
      const aciklama = (t.aciklama || '').toLowerCase();
      return name.includes(term) || tur.includes(term) || aciklama.includes(term);
    });
  }, [bekleyenler, bekleyenSearch]);

  // Filtrelenmiş son işlemler
  const filteredSonIslemler = useMemo(() => {
    return sonIslemler.filter((t) => {
      const matchesStatus = sonIslemStatusFilter === 'all' || t.durum === sonIslemStatusFilter;
      const matchesTur = sonIslemTurFilter === 'all' || t.izinTuru === sonIslemTurFilter;
      const term = sonIslemSearch.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (t.employeeName || '').toLowerCase().includes(term) ||
        formatIzinTuru(t.izinTuru).toLowerCase().includes(term) ||
        (t.aciklama || '').toLowerCase().includes(term) ||
        (t.redNedeni || '').toLowerCase().includes(term);
      return matchesStatus && matchesTur && matchesSearch;
    });
  }, [sonIslemler, sonIslemStatusFilter, sonIslemTurFilter, sonIslemSearch]);

  // Benzersiz izin türleri listesi
  const availableIzinTurleri = useMemo(() => {
    const set = new Set<string>();
    userLeaves.forEach((t) => {
      if (t.izinTuru) set.add(t.izinTuru);
    });
    return Array.from(set);
  }, [userLeaves]);

  // Kişisel izin bakiyesi (yedek eşleme ile)
  const effectiveHak = useMemo(() => {
    if (currentEmployeeIzinHakki) return currentEmployeeIzinHakki;
    if (currentEmployeeMatch) {
      return izinHaklari.find((h) => h.employeeId === currentEmployeeMatch.id);
    }
    return undefined;
  }, [currentEmployeeIzinHakki, currentEmployeeMatch, izinHaklari]);

  // Sekmeler: Normal personel için yalnızca 'Bekleyen Taleplerim' ve 'İzin Geçmişim'
  const tabs: { id: IzinTabId; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = useMemo(() => {
    if (!isAuthorized) {
      return [
        {
          id: 'onay-bekleyen',
          label: 'Bekleyen Taleplerim',
          icon: <Clock className="w-4 h-4" />,
          badge: bekleyenler.length,
          badgeColor: bekleyenler.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600',
        },
        {
          id: 'son-islemler',
          label: 'İzin Geçmişim',
          icon: <History className="w-4 h-4" />,
          badge: sonIslemler.length,
          badgeColor: 'bg-slate-100 text-slate-700',
        },
      ];
    }

    return [
      {
        id: 'onay-bekleyen',
        label: 'Onay Bekleyen Talepler',
        icon: <Clock className="w-4 h-4" />,
        badge: bekleyenler.length,
        badgeColor: bekleyenler.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600',
      },
      {
        id: 'son-islemler',
        label: 'Son İşlemler / Kullanılmış İzinler',
        icon: <History className="w-4 h-4" />,
        badge: sonIslemler.length,
        badgeColor: 'bg-slate-100 text-slate-700',
      },
      {
        id: 'ozet-paneli',
        label: 'Özet Paneli',
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
      {
        id: 'personel-durumu',
        label: 'Personel İzin Durumu',
        icon: <Users className="w-4 h-4" />,
        badge: employees.filter((e) => e.status === 'active' || e.status === 'onLeave').length,
        badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      },
      {
        id: 'takvim',
        label: 'İzin Takvimi',
        icon: <Calendar className="w-4 h-4" />,
      },
    ];
  }, [isAuthorized, bekleyenler.length, sonIslemler.length, employees]);

  return (
    <div className="space-y-5">
      {/* ── Üst Başlık ve Aksiyon Butonları ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                {isAuthorized ? 'İzin Yönetimi' : 'İzinlerim ve Taleplerim'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isAuthorized
                  ? 'İzin onay süreçleri, çalışan hak edişleri, özet göstergeler ve takvim planlaması'
                  : 'Kişisel izin bakiyeniz, onay sürecindeki talepleriniz ve geçmiş izin kayıtlarınız'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAuthorized && (
            <>
              <button
                type="button"
                onClick={() => onOpenHakedisModal()}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>İzin Hak Edişi Tanımla</span>
              </button>
              <button
                type="button"
                onClick={onOpenTopluIzin}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Toplu İzin Tanımla</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onNewTalep}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni İzin Talebi</span>
          </button>
        </div>
      </div>

      {/* ── Normal Personel İçin Kişisel İzin Bakiyesi Kartı ── */}
      {!isAuthorized && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                <Briefcase className="w-3.5 h-3.5" />
                Kişisel İzin Bakiyesi
              </span>
              <h3 className="mt-1.5 text-lg font-bold text-gray-900">
                {profile?.full_name || currentEmployeeMatch?.name || 'Personel'}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {currentEmployeeMatch
                  ? `${currentEmployeeMatch.company || ''} ${currentEmployeeMatch.department ? '• ' + currentEmployeeMatch.department : ''} ${currentEmployeeMatch.position ? '• ' + currentEmployeeMatch.position : ''}`
                  : 'Personel Profili'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full sm:w-auto">
              <div className="rounded-xl bg-white p-3 border border-gray-200/80 shadow-2xs">
                <p className="text-[11px] font-semibold text-gray-500">Toplam Hak</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {effectiveHak?.toplamHak ?? 14} <span className="text-xs font-normal text-gray-500">gün</span>
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-gray-200/80 shadow-2xs">
                <p className="text-[11px] font-semibold text-gray-500">Kullanılan İzin</p>
                <p className="text-xl font-bold text-indigo-700 mt-0.5">
                  {effectiveHak?.kullanilanIzin ?? 0} <span className="text-xs font-normal text-gray-500">gün</span>
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-emerald-300 bg-emerald-50/40 shadow-2xs">
                <p className="text-[11px] font-bold text-emerald-800">Kalan İzin</p>
                <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                  {effectiveHak?.kalanIzin ?? 14} <span className="text-xs font-normal text-emerald-600">gün</span>
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-gray-200/80 shadow-2xs">
                <p className="text-[11px] font-semibold text-gray-500">Mazeret İzni</p>
                <p className="text-xl font-bold text-slate-700 mt-0.5">
                  {effectiveHak?.mazeretHak ?? 0} <span className="text-xs font-normal text-gray-500">gün</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TabPane Sekme Çubuğu ── */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-gray-500'}>{tab.icon}</span>
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab 1: Onay Bekleyen Talepler ── */}
      {activeTab === 'onay-bekleyen' && (
        <div className="space-y-4 animate-fade-in">
          {/* İK / Şirket Yöneticisi Yetki Bilgilendirmesi (Müdürler için, normal personele gösterilmez) */}
          {isAuthorized && !canApprove && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start sm:items-center gap-3 text-amber-900 text-xs shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold text-amber-950">Onay Yetkisi Bilgilendirmesi:</span> İzin onaylama ve reddetme yetkisi şirket politikası gereğince yalnızca <strong>İnsan Kaynakları (İK)</strong> ve <strong>Şirket Yöneticisi</strong> rollerine aittir. Birim müdürleri talepleri yalnızca inceleme yetkisine sahiptir.
              </div>
            </div>
          )}

          {/* Workflow Süreci Bilgi Bannerı */}
          <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 rounded-2xl border border-indigo-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-700" />
                <h3 className="text-sm font-bold text-indigo-900">
                  {isAuthorized ? 'Onay Süreci ve Akış Aşamaları' : 'İzin Talep Onay Süreciniz'}
                </h3>
              </div>
              <span className="text-xs font-semibold text-indigo-700 bg-white/80 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {isAuthorized
                  ? `${bekleyenler.length} Talep Onay Bekliyor`
                  : `${bekleyenler.length} Talebiniz Onay Bekliyor`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 max-w-2xl">
              {[
                { label: isAuthorized ? '1. Çalışan Talebi' : '1. Talebiniz', sub: 'Oluşturuldu' },
                { label: isAuthorized ? '2. İK / Şirket Yöneticisi Onayı' : '2. Yönetici Değerlendirmesi', sub: isAuthorized ? 'Onay / Red Bekleniyor' : 'İnceleme ve Karar' },
                { label: '3. Bordro ve Takvim', sub: 'Otomatik Güncellenir' },
              ].map((adim, i, arr) => (
                <React.Fragment key={i}>
                  <div className="text-center flex-1">
                    <p className="text-xs font-bold text-indigo-900">{adim.label}</p>
                    <p className="text-[11px] text-indigo-600">{adim.sub}</p>
                  </div>
                  {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-indigo-300 flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bekleyen Talepler Arama (varsa) */}
          {bekleyenler.length > 1 && (
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isAuthorized ? 'Bekleyen taleplerde personel veya tür ara...' : 'Bekleyen taleplerimde ara...'}
                value={bekleyenSearch}
                onChange={(e) => setBekleyenSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium"
              />
            </div>
          )}

          {/* Talepler Listesi */}
          {filteredBekleyenler.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-gray-900">
                {bekleyenSearch
                  ? 'Aramaya Uygun Onay Bekleyen Talep Bulunamadı'
                  : isAuthorized
                  ? 'Harika! Onay Bekleyen Talep Bulunmuyor'
                  : 'Onay Bekleyen İzin Talebiniz Bulunmuyor'}
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                {bekleyenSearch
                  ? 'Farklı bir arama kelimesi deneyebilir veya aramayı temizleyebilirsiniz.'
                  : isAuthorized
                  ? 'Şu anda değerlendirilmeyi bekleyen herhangi bir izin talebi yok. Yeni bir talep geldiğinde burada listelenecektir.'
                  : 'Şu anda onay sürecinde bekleyen bir izin talebiniz bulunmamaktadır. İhtiyaç halinde yeni izin talebi oluşturabilirsiniz.'}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                {bekleyenSearch && (
                  <button
                    onClick={() => setBekleyenSearch('')}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Aramayı Temizle
                  </button>
                )}
                {!isAuthorized && (
                  <button
                    type="button"
                    onClick={onNewTalep}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-2xs"
                  >
                    + Yeni İzin Talebi
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('son-islemler')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  {isAuthorized ? 'Son İşlemleri İncele →' : 'İzin Geçmişimi İncele →'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBekleyenler.map((talep) => (
                <IzinWorkflow
                  key={talep.id}
                  talep={talep}
                  onOnay={canApprove ? onOnay : undefined}
                  onRed={canApprove ? onRed : undefined}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  talepleri={userLeaves}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Son İşlemler / Kullanılmış Talepler ── */}
      {activeTab === 'son-islemler' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filtre ve Arama Çubuğu */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Durum Butonları */}
              <button
                type="button"
                onClick={() => setSonIslemStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sonIslemStatusFilter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tümü ({sonIslemler.length})
              </button>
              <button
                type="button"
                onClick={() => setSonIslemStatusFilter('onaylandi')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sonIslemStatusFilter === 'onaylandi'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                ✓ Onaylandı / Kullanıldı ({sonIslemler.filter((t) => t.durum === 'onaylandi').length})
              </button>
              <button
                type="button"
                onClick={() => setSonIslemStatusFilter('reddedildi')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sonIslemStatusFilter === 'reddedildi'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                ✗ Reddedildi ({sonIslemler.filter((t) => t.durum === 'reddedildi').length})
              </button>
              <button
                type="button"
                onClick={() => setSonIslemStatusFilter('iptal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sonIslemStatusFilter === 'iptal'
                    ? 'bg-gray-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                İptal ({sonIslemler.filter((t) => t.durum === 'iptal').length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* İzin Türü Seçimi */}
              {availableIzinTurleri.length > 0 && (
                <select
                  value={sonIslemTurFilter}
                  onChange={(e) => setSonIslemTurFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium text-gray-700"
                >
                  <option value="all">Tüm İzin Türleri</option>
                  {availableIzinTurleri.map((tur) => (
                    <option key={tur} value={tur}>
                      {formatIzinTuru(tur)}
                    </option>
                  ))}
                </select>
              )}

              {/* Arama Inputu */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isAuthorized ? "Personel veya açıklama ara..." : "İzin türü veya açıklama ara..."}
                  value={sonIslemSearch}
                  onChange={(e) => setSonIslemSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium"
                />
                {sonIslemSearch && (
                  <button
                    onClick={() => setSonIslemSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Son İşlemler Listesi */}
          {filteredSonIslemler.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
              <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <h4 className="text-base font-bold text-gray-900">
                {isAuthorized ? 'İşlem Kaydı Bulunamadı' : 'Henüz İzin Kaydınız Bulunmuyor'}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {isAuthorized
                  ? 'Filtrelere veya arama kriterlerine uygun tamamlanmış izin işlemi bulunmamaktadır.'
                  : 'Filtrelere uygun onaylanmış, reddedilmiş veya tamamlanmış bir izin kaydınız bulunmuyor.'}
              </p>
              {(sonIslemSearch || sonIslemStatusFilter !== 'all' || sonIslemTurFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSonIslemSearch('');
                    setSonIslemStatusFilter('all');
                    setSonIslemTurFilter('all');
                  }}
                  className="mt-3 text-xs text-blue-600 hover:underline font-bold"
                >
                  Filtreleri Sıfırla
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs divide-y divide-gray-100">
              {filteredSonIslemler.map((talep) => (
                <div
                  key={talep.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">{talep.employeeName}</p>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          talep.durum === 'onaylandi'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : talep.durum === 'reddedildi'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {talep.durum === 'onaylandi'
                          ? '✓ Onaylandı / Kullanıldı'
                          : talep.durum === 'reddedildi'
                          ? '✗ Reddedildi'
                          : 'İptal Edildi'}
                      </span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {talep.gunSayisi} Gün
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 font-medium mt-1">
                      <span className="font-semibold text-slate-700">{formatIzinTuru(talep.izinTuru)}</span> • 📅{' '}
                      {formatDateRange(talep.baslangicTarihi, talep.bitisTarihi)}
                    </p>

                    {talep.aciklama && (
                      <p className="text-xs text-gray-600 mt-1 italic bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 inline-block">
                        &quot;{talep.aciklama}&quot;
                      </p>
                    )}

                    {talep.durum === 'reddedildi' && talep.redNedeni && (
                      <p className="text-xs text-red-700 font-medium mt-1 bg-red-50/80 px-2.5 py-1 rounded-lg border border-red-200 inline-block">
                        <span className="font-bold">Red Nedeni:</span> {talep.redNedeni}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <IzinWorkflow talep={talep} compact talepleri={izinTalepleri} />

                    {isAuthorized && (
                      <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                        <button
                          type="button"
                          onClick={() => onEdit(talep)}
                          title="İzin Kaydını Düzenle"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(talep.id)}
                          title="İzin Kaydını Sil"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Özet Paneli ── */}
      {isAuthorized && activeTab === 'ozet-paneli' && (
        <div className="space-y-5 animate-fade-in">
          {/* Aktif Kullanıcı İzin Özeti Kartı */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Aktif Kullanıcı İzin Özeti</p>
                <h3 className="mt-1 text-lg font-bold text-gray-900">{profile?.full_name || 'Kullanıcı'}</h3>
                <p className="mt-0.5 text-xs text-gray-600">
                  {currentEmployeeMatch
                    ? `${currentEmployeeMatch.department || 'Departman belirtilmedi'} • ${currentEmployeeMatch.position || 'Pozisyon belirtilmedi'}`
                    : 'Personel kaydı eşleşmedi'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 min-w-[240px]">
                <div className="rounded-xl bg-white px-3.5 py-2.5 border border-indigo-100 shadow-xs">
                  <p className="text-[11px] font-semibold text-gray-500">Kullanılan İzin</p>
                  <p className="text-xl font-bold text-indigo-900">{effectiveHak?.kullanilanIzin ?? 0} <span className="text-xs font-normal text-gray-500">gün</span></p>
                </div>
                <div className="rounded-xl bg-white px-3.5 py-2.5 border border-indigo-100 shadow-xs">
                  <p className="text-[11px] font-semibold text-gray-500">Kalan İzin</p>
                  <p className="text-xl font-bold text-emerald-700">{effectiveHak?.kalanIzin ?? 0} <span className="text-xs font-normal text-gray-500">gün</span></p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white border border-indigo-100 p-3.5">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Son İzin Talepleriniz</span>
              </p>
              {currentEmployeeIzinTalepleri.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">Bu kullanıcıya ait izin talebi bulunamadı.</p>
              ) : (
                <div className="space-y-2">
                  {currentEmployeeIzinTalepleri.slice(0, 4).map((talep) => (
                    <div
                      key={talep.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{formatIzinTuru(talep.izinTuru)}</span>
                        <span className="text-gray-400">•</span>
                        <span className="font-semibold text-blue-700">{talep.gunSayisi} gün</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span>{formatDateRange(talep.baslangicTarihi, talep.bitisTarihi)}</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                            talep.durum === 'onaylandi'
                              ? 'bg-emerald-100 text-emerald-800'
                              : talep.durum === 'beklemede'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {talep.durum}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* KPI Stat Kartları ve Hızlı Özet Grid'i */}
          <IzinOzetKartlari
            employees={employees}
            izinTalepleri={izinTalepleri}
            izinHaklari={izinHaklari}
            viewMode="kpi"
            onNavigateToPending={() => setActiveTab('onay-bekleyen')}
          />
        </div>
      )}

      {/* ── Tab 4: Personel İzin Durumu ── */}
      {isAuthorized && activeTab === 'personel-durumu' && (
        <div className="space-y-4 animate-fade-in">
          <IzinOzetKartlari
            employees={employees}
            izinTalepleri={izinTalepleri}
            izinHaklari={izinHaklari}
            onUpdateHak={onUpdateHak}
            onOpenHakedisModal={onOpenHakedisModal}
            onEditIzin={onEdit}
            onDeleteIzin={onDelete}
            viewMode="table"
          />
        </div>
      )}

      {/* ── Tab 5: Takvim ── */}
      {isAuthorized && activeTab === 'takvim' && (
        <div className="space-y-4 animate-fade-in">
          <IzinTakvimi izinTalepleri={izinTalepleri} employees={employees} />
        </div>
      )}
    </div>
  );
};

export default IzinYonetimi;
