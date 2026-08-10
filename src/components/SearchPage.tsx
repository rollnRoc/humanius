import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search, User, Calendar, CreditCard, X, Zap,
  Hash, Mail, Phone, MapPin, Briefcase, Tag, Layers,
  UserCog, ChevronRight, SlidersHorizontal, Bell,
  Clock, GraduationCap, Target, Shield, Layout, BookOpen, LogOut, Lock,
} from 'lucide-react';
import type { Employee, View } from '../types';
import type { IzinTalebi } from '../types/izin';
import type { BordroItem } from '../types/bordro';
import { useAuth } from '../contexts/AuthContext';
import { canAccessView } from '../auth/roles';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SearchPageProps {
  employees: Employee[];
  izinTalepleri: IzinTalebi[];
  bordrolar: BordroItem[];
  onEmployeeClick: (emp: Employee) => void;
  onNavigate: (view: View) => void;
  companyLogoUrl?: string | null;
}

type Category = 'personel' | 'izin' | 'bordro' | 'sayfa';

/** One logical entity (person / leave request / payroll / page) */
interface EntityResult {
  id: string;
  title: string;
  subtitle: string;
  category: Category;
  /** All key-value pairs that matched the query (for display) */
  matchedFields: { label: string; value: string }[];
  /** Full text blob used for matching */
  allText: string;
  /** Score: higher = more relevant */
  score: number;
  navigateTo: View;
  openDrawer?: () => void;
}

// ─── Static page index ───────────────────────────────────────────────────────

const PAGES: { id: View; label: string; icon: string; keywords: string[] }[] = [
  { id: 'personel',               label: 'Şirket ve Personel',      icon: '👥', keywords: ['personel', 'çalışan', 'liste', 'yönetim', 'kadro', 'employee', 'şirket', 'kullanıcı'] },
  { id: 'bordro',                 label: 'Bordro',        icon: '💳', keywords: ['bordro', 'maaş', 'hesaplama', 'ücret', 'net', 'brüt', 'payroll'] },
  { id: 'izin',                   label: 'İzin Yönetimi',           icon: '📅', keywords: ['izin', 'talep', 'takvim', 'yıllık', 'mazeret', 'leave'] },
  { id: 'raporlar',               label: 'Raporlar',                icon: '📊', keywords: ['rapor', 'istatistik', 'analiz', 'report'] },
  { id: 'uyari',                  label: 'Uyarılar Takvimi',        icon: '🔔', keywords: ['uyarı', 'takvim', 'etkinlik', 'hatırlatma', 'calendar', 'duyuru', 'tatil', 'toplu uyarı'] },
  { id: 'ayar',                   label: 'Kanunlar ve Kurallar', icon: '⚖️', keywords: ['kanun', 'kural', 'mevzuat', 'izin', 'çalışma', 'ayarlar', 'sistem', 'yapılandırma'] },
  { id: 'gorev-tanimi',           label: 'Görev Tanımı',            icon: '📋', keywords: ['görev', 'tanım', 'rol', 'iş tanımı', 'job'] },
  { id: 'is-akisi',               label: 'İş Akışı Panosu',         icon: '⏰', keywords: ['is akisi', 'iş akışı', 'kanban', 'süreç', 'pano', 'durum', 'operasyon', 'ik süreçleri', 'gösterim'] },
  { id: 'pdks-devam',             label: 'Devam Kontrolü (PDKS)',   icon: '⏰', keywords: ['pdks', 'devam', 'mesai', 'giriş', 'çıkış', 'vardiya', 'takip', 'checkin', 'checkout', 'saat', 'kontrol'] },
  { id: 'performans',             label: 'Performans & Değerlendirme', icon: '🎯', keywords: ['performans', 'değerlendirme', 'geri bildirim', 'feedback', 'performance', '360'] },
  { id: 'egitim',                 label: 'Eğitim & Gelişim (LMS)',  icon: '🎓', keywords: ['eğitim', 'lms', 'gelişim', 'kurs', 'sertifika', 'training', 'öğrenme'] },
  { id: 'kullanicilar',           label: 'Kullanıcı Hesapları',      icon: '👤', keywords: ['kullanıcılar', 'yetki', 'hesap', 'üye', 'users', 'roller', 'permission'] },
  { id: 'zimmet',                 label: 'Zimmet Yönetimi',         icon: '💼', keywords: ['zimmet', 'demirbaş', 'cihaz', 'bilgisayar', 'telefon', 'eşya', 'inventory', 'assets'] },
  { id: 'okr',                    label: 'OKR Hedefler',            icon: '🎯', keywords: ['okr', 'hedef', 'key results', 'objectives', 'plan', 'vizyon'] },
  { id: 'yetkinlik',              label: 'Yetkinlik Matrisi',       icon: '📊', keywords: ['yetkinlik', 'beceri', 'matris', 'skills', 'competency'] },
  { id: 'yan-haklar',             label: 'Esnek Yan Haklar',        icon: '💳', keywords: ['yan haklar', 'esnek yan haklar', 'bütçe', 'benefits', 'hak'] },
  { id: 'org-sema',               label: 'Organizasyon Şeması',      icon: '📊', keywords: ['organizasyon şeması', 'şema', 'hiyerarşi', 'organizasyon', 'org chart'] },
  { id: 'kvkk',                   label: 'KVKK Uyumluluk',          icon: '🛡️', keywords: ['kvkk', 'veri', 'güvenlik', 'politika', 'gdpr', 'gizlilik'] },
  { id: 'form-builder',           label: 'Dinamik Form Builder',    icon: '📋', keywords: ['form builder', 'form oluşturucu', 'anket', 'talep formu', 'survey'] },
  { id: 'kullanim-kilavuzu',      label: 'Kullanım Kılavuzu & Rehber', icon: '📖', keywords: ['rehber', 'kılavuz', 'yardım', 'kullanım kılavuzu', 'tutorial', 'nasıl kullanılır', 'help', 'onboarding'] },
];

const IZIN_TURU: Record<string, string> = {
  yillik: 'Yıllık İzin', mazeret: 'Mazeret İzni', hastalik: 'Hastalık İzni',
  dogum: 'Doğum İzni', babalik: 'Babalık İzni', evlilik: 'Evlilik İzni',
  olum: 'Ölüm İzni', askerlik: 'Askerlik İzni', ucretsiz: 'Ücretsiz İzin',
};

const DURUM: Record<string, string> = {
  beklemede: 'Beklemede', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi',
};

const DURUM_COLOR: Record<string, string> = {
  beklemede: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  onaylandi: 'bg-green-100 text-green-700 border-green-200',
  reddedildi: 'bg-red-100 text-red-700 border-red-200',
};

const CAT_STYLE: Record<Category, { bg: string; border: string; text: string; dot: string; hoverBg: string }> = {
  personel: { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500',    hoverBg: 'hover:bg-blue-100/60'    },
  izin:     { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-100/60' },
  bordro:   { bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-700',  dot: 'bg-purple-500',  hoverBg: 'hover:bg-purple-100/60'  },
  sayfa:    { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  dot: 'bg-orange-400',  hoverBg: 'hover:bg-orange-100/60'  },
};

const CAT_ORDER: Category[] = ['personel', 'izin', 'bordro', 'sayfa'];
const CAT_LABEL: Record<Category, string> = {
  personel: 'Personel', izin: 'İzin Talepleri', bordro: 'Bordro', sayfa: 'Sayfalar',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRx(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function safe(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function normalizeTurkish(str: string): string {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function makeTurkishRegexPattern(word: string): string {
  return escapeRx(word)
    .replace(/[gğ]/gi, '[gğ]')
    .replace(/[uü]/gi, '[uü]')
    .replace(/[sş]/gi, '[sş]')
    .replace(/[iıİI]/gi, '[iıİI]')
    .replace(/[oö]/gi, '[oö]')
    .replace(/[cç]/gi, '[cç]');
}

/** Returns true if ALL query words appear somewhere in text (Turkish normalization friendly) */
function matchesAll(words: string[], text: string): boolean {
  const normalizedText = normalizeTurkish(text);
  return words.every(w => normalizedText.includes(normalizeTurkish(w)));
}

/** Highlight all query words in text (Turkish normalization friendly) */
function HighlightMulti({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const pattern = words.map(makeTurkishRegexPattern).join('|');
  const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        words.some(w => normalizeTurkish(p) === normalizeTurkish(w))
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic font-semibold">{p}</mark>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

const BlueHLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = "w-10 h-10", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={`${className} select-none`} style={style}>
    <rect width="100" height="100" rx="20" fill="#2563eb" />
    <path d="M30 25 V75 M70 25 V75 M30 50 H70" stroke="white" stroke-width="14" stroke-linecap="round" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const SearchPage: React.FC<SearchPageProps> = ({
  employees, izinTalepleri, bordrolar, onEmployeeClick, onNavigate, companyLogoUrl,
}) => {
  const { appRole, signOut } = useAuth();
  const effectiveRole = appRole || 'employee';

  const QUICK_APPROVAL_QUERY = 'personel onay ve doğrulama şifresi al';
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Category | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const [showAlertNotification, setShowAlertNotification] = useState(() => {
    try {
      return localStorage.getItem('humanius_new_alert_notification') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        setShowAlertNotification(localStorage.getItem('humanius_new_alert_notification') === 'true');
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);



  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Build entity index ──────────────────────────────────────────────────────
  const entityIndex = useMemo<EntityResult[]>(() => {
    const results: EntityResult[] = [];

    // ── Personel ──────────────────────────────────────────────────────────────
    employees.forEach(emp => {
      const statusLabel = emp.status === 'active' ? 'Aktif' : emp.status === 'onLeave' ? 'İzinde' : 'Pasif';
      const typeLabel   = emp.employeeType === 'emekli' ? 'Emekli' : 'Normal';
      const allFields: { label: string; value: string }[] = [
        { label: 'Ad Soyad',  value: safe(emp.name) },
        { label: 'Departman', value: safe(emp.department) },
        { label: 'Pozisyon',  value: safe(emp.position) },
        { label: 'E-posta',   value: safe(emp.email) },
        { label: 'Telefon',   value: safe(emp.phone) },
        { label: 'Adres',     value: safe(emp.address) },
        { label: 'Sicil No',  value: safe(emp.sicil_no) },
        { label: 'TC No',     value: safe(emp.tc_no) },
        { label: 'Durum',     value: statusLabel },
        { label: 'Tür',       value: typeLabel },
        ...(emp.skills ?? []).map(s => ({ label: 'Yetkinlik', value: safe(s) })),
      ].filter(f => f.value.length > 0);

      const allText = allFields.map(f => f.value).join(' ');
      results.push({
        id: `emp-${emp.id}`,
        title: emp.name,
        subtitle: [emp.position, emp.department].filter(Boolean).join(' · '),
        category: 'personel',
        matchedFields: allFields,
        allText,
        score: 0,
        navigateTo: 'personel',
        openDrawer: () => onEmployeeClick(emp),
      });
    });

    // ── İzin talepleri ────────────────────────────────────────────────────────
    izinTalepleri.forEach(talep => {
      const empName    = safe(talep.employeeName) || 'Personel';
      const izinTuruLbl = IZIN_TURU[talep.izinTuru] || talep.izinTuru;
      const durumLbl   = DURUM[talep.durum] || talep.durum;
      const allFields  = [
        { label: 'Çalışan',   value: empName },
        { label: 'İzin Türü', value: izinTuruLbl },
        { label: 'Durum',     value: durumLbl },
        { label: 'Başlangıç', value: safe(talep.baslangicTarihi) },
        { label: 'Bitiş',     value: safe(talep.bitisTarihi) },
        { label: 'Süre',      value: talep.gunSayisi ? `${talep.gunSayisi} gün` : '' },
        { label: 'Açıklama',  value: safe(talep.aciklama) },
        { label: 'Departman', value: safe(talep.department) },
      ].filter(f => f.value.length > 0);

      const allText = allFields.map(f => f.value).join(' ');
      results.push({
        id: `izin-${talep.id}`,
        title: empName,
        subtitle: `${izinTuruLbl} · ${talep.baslangicTarihi} – ${talep.bitisTarihi}`,
        category: 'izin',
        matchedFields: allFields,
        allText,
        score: 0,
        navigateTo: 'izin',
      });
    });

    // ── Bordro ────────────────────────────────────────────────────────────────
    bordrolar.forEach(b => {
      const empName = safe(b.employees?.name) || 'Personel';
      const allFields = [
        { label: 'Çalışan',   value: empName },
        { label: 'Dönem',     value: safe(b.period) },
        { label: 'Sicil No',  value: safe(b.sicil_no) },
        { label: 'TC No',     value: safe(b.tc_no) },
        { label: 'Net Maaş',  value: b.net_maas  ? `${b.net_maas.toLocaleString('tr-TR')} ₺`  : '' },
        { label: 'Brüt Maaş', value: b.brut_maas ? `${b.brut_maas.toLocaleString('tr-TR')} ₺` : '' },
        { label: 'Departman', value: safe(b.employees?.department) },
      ].filter(f => f.value.length > 0);

      const allText = allFields.map(f => f.value).join(' ');
      results.push({
        id: `bordro-${b.id}`,
        title: empName,
        subtitle: safe(b.period),
        category: 'bordro',
        matchedFields: allFields,
        allText,
        score: 0,
        navigateTo: 'bordro',
      });
    });

    // ── Sayfalar ──────────────────────────────────────────────────────────────
    PAGES.forEach(page => {
      if (!canAccessView(effectiveRole, page.id)) return;
      const allText = [page.label, ...page.keywords].join(' ');
      results.push({
        id: `page-${page.id}`,
        title: page.label,
        subtitle: page.keywords.slice(0, 4).join(', '),
        category: 'sayfa',
        matchedFields: [{ label: 'Anahtar Kelimeler', value: page.keywords.join(', ') }],
        allText,
        score: 0,
        navigateTo: page.id,
      });
    });

    return results;
  }, [employees, izinTalepleri, bordrolar, onEmployeeClick, effectiveRole]);

  // ── Search logic ─────────────────────────────────────────────────────────────
  const words = useMemo(
    () => query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0),
    [query],
  );

  const searchResults = useMemo<EntityResult[]>(() => {
    if (!words.length) return [];

    return entityIndex
      .filter(e => matchesAll(words, e.allText))
      .map(e => {
        // Score: +3 for each word matching in title, +1 for other fields
        let score = 0;
        const titleLo = e.title.toLowerCase();
        words.forEach(w => {
          if (titleLo.includes(w)) score += 3;
          else score += 1;
        });
        // Exact full-query title match = bonus
        if (titleLo.includes(words.join(' '))) score += 5;
        return { ...e, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [words, entityIndex]);

  // ── Category tab counts ───────────────────────────────────────────────────
  const catCounts = useMemo(() => {
    const c: Partial<Record<Category | 'all', number>> = { all: searchResults.length };
    CAT_ORDER.forEach(cat => {
      c[cat] = searchResults.filter(r => r.category === cat).length;
    });
    return c;
  }, [searchResults]);

  const visibleResults = useMemo(
    () => activeTab === 'all' ? searchResults : searchResults.filter(r => r.category === activeTab),
    [searchResults, activeTab],
  );

  // Reset tab when query changes
  useEffect(() => { setActiveTab('all'); }, [query]);

  // ── Icons ──────────────────────────────────────────────────────────────────
  const FIELD_ICON: Record<string, React.ReactNode> = {
    'E-posta':          <Mail      className="w-3 h-3 shrink-0" />,
    'Telefon':          <Phone     className="w-3 h-3 shrink-0" />,
    'Adres':            <MapPin    className="w-3 h-3 shrink-0" />,
    'Pozisyon':         <Briefcase className="w-3 h-3 shrink-0" />,
    'Yetkinlik':        <Tag       className="w-3 h-3 shrink-0" />,
    'Sicil No':         <Hash      className="w-3 h-3 shrink-0" />,
    'TC No':            <Hash      className="w-3 h-3 shrink-0" />,
    'Anahtar Kelimeler':<Layers    className="w-3 h-3 shrink-0" />,
  };

  const CAT_ICON: Record<Category, React.ReactNode> = {
    personel: <User       className="w-4 h-4" />,
    izin:     <Calendar   className="w-4 h-4" />,
    bordro:   <CreditCard className="w-4 h-4" />,
    sayfa:    <Zap        className="w-4 h-4" />,
  };

  const PAGE_ICON: Record<string, React.ReactNode> = {
    personel:                 <User       className="w-4 h-4" />,
    kullanicilar:             <UserCog    className="w-4 h-4" />,
    bordro:                   <CreditCard className="w-4 h-4" />,
    izin:                     <Calendar   className="w-4 h-4" />,
    raporlar:                 <Layers     className="w-4 h-4" />,
    uyari:                    <Zap        className="w-4 h-4" />,
    ayar:                     <SlidersHorizontal className="w-4 h-4" />,
    'gorev-tanimi':           <Briefcase  className="w-4 h-4" />,
    'is-akisi':               <Clock      className="w-4 h-4" />,
    'pdks-devam':             <Clock      className="w-4 h-4" />,
    performans:               <Target     className="w-4 h-4" />,
    egitim:                   <GraduationCap className="w-4 h-4" />,
    zimmet:                   <Briefcase  className="w-4 h-4" />,
    okr:                      <Target     className="w-4 h-4" />,
    yetkinlik:                <Layers     className="w-4 h-4" />,
    'yan-haklar':             <CreditCard className="w-4 h-4" />,
    'org-sema':               <Layers     className="w-4 h-4" />,
    kvkk:                     <Shield     className="w-4 h-4" />,
    'form-builder':           <Layout     className="w-4 h-4" />,
    'kullanim-kilavuzu':      <BookOpen   className="w-4 h-4" />,
  };

  // ── Entry renderer ─────────────────────────────────────────────────────────
  const renderResult = (e: EntityResult) => {
    const cs = CAT_STYLE[e.category];

    // Pick up to 3 fields that contain any query word
    const highlightedFields = e.matchedFields
      .filter(f => words.some(w => f.value.toLowerCase().includes(w)))
      .slice(0, 3);

    // For "Durum" field — show badge
    const durumField = highlightedFields.find(f => f.label === 'Durum');
    const durumKey = durumField
      ? Object.keys(DURUM).find(k => DURUM[k] === durumField.value) ?? ''
      : '';

    return (
      <button
        key={e.id}
        onClick={() => { e.openDrawer?.(); if (!e.openDrawer) onNavigate(e.navigateTo); }}
        className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border ${cs.bg} ${cs.border} ${cs.hoverBg} transition-all text-left group`}
      >
        {/* Category dot */}
        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${cs.dot}`} />

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${cs.bg} ${cs.text} ${cs.border}`}>
              {CAT_LABEL[e.category]}
            </span>
            <span className="font-semibold text-gray-900 text-sm">
              <HighlightMulti text={e.title} words={words} />
            </span>
            {e.subtitle && (
              <span className="text-xs text-gray-400 truncate max-w-xs">
                <HighlightMulti text={e.subtitle} words={words} />
              </span>
            )}
          </div>

          {/* Matched fields */}
          {highlightedFields.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              {highlightedFields.map(f => (
                <div key={f.label} className="flex items-center gap-1 text-xs text-gray-400">
                  {FIELD_ICON[f.label] ?? null}
                  <span className="text-gray-500">{f.label}:</span>
                  {f.label === 'Durum' && durumKey
                    ? <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${DURUM_COLOR[durumKey]}`}>{f.value}</span>
                    : <span className="text-gray-700"><HighlightMulti text={f.value} words={words} /></span>
                  }
                </div>
              ))}
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 self-center transition-colors" />
      </button>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex flex-col">

      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto space-y-3 pt-8">

          {/* Employee Header */}
          {appRole && (
            <div className="flex items-center justify-end pb-3 border-b border-gray-100 mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('sifre-degistir')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all shrink-0 font-medium"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Şifre Değiştir</span>
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            </div>
          )}

          {/* Notification Banner */}
          {showAlertNotification && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900 text-sm">Yeni Etkinlik & Duyuru!</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Takviminizde yeni etkinlikler veya güncel duyurular bulunmaktadır. Lütfen kontrol ediniz.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                <button
                  onClick={() => {
                    onNavigate('uyari');
                    try {
                      localStorage.setItem('humanius_new_alert_notification', 'false');
                      window.dispatchEvent(new Event('storage'));
                    } catch {}
                  }}
                  className="w-full sm:w-auto text-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Takvimi Görüntüle
                </button>
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('humanius_new_alert_notification', 'false');
                      window.dispatchEvent(new Event('storage'));
                    } catch {}
                  }}
                  className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors text-amber-800 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="relative">
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border-2 border-gray-200 focus-within:border-blue-400 hover:border-blue-300 shadow-sm transition-all">
              <Search className="w-5 h-5 text-blue-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Aramak istediğinizi yazın: 'Ahmet yıllık izin'..."
                className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-300 bg-transparent"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          {words.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {(['all', ...CAT_ORDER] as const).map(tab => {
                const count = catCounts[tab] ?? 0;
                const isActive = activeTab === tab;
                const cs = tab !== 'all' ? CAT_STYLE[tab as Category] : null;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    disabled={tab !== 'all' && count === 0}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                      ${isActive
                        ? cs
                          ? `${cs.bg} ${cs.text} ${cs.border}`
                          : 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                  >
                    {tab === 'all' ? 'Tümü' : CAT_LABEL[tab as Category]}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                      ${isActive
                        ? cs ? `${cs.text} bg-white/60` : 'text-gray-900 bg-white/20'
                        : 'bg-gray-100 text-gray-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* No query — quick access */}
        {!words.length && (
          <>
            {/* Rehber Tanıtım Kartı */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-30" />
              <div className="space-y-1 relative z-10">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-200" /> Humanius Kullanım Rehberi
                </h4>
                <p className="text-xs text-blue-100 leading-relaxed max-w-xl">
                  Sistemi en verimli şekilde kullanmanız için rolünüze özel ({effectiveRole === 'superadmin' || effectiveRole === 'admin' || effectiveRole === 'hr' ? 'Yönetici / İK' : effectiveRole === 'manager' ? 'Departman Müdürü' : 'Çalışan'}) hazırlanmış adım adım kontrol listesini ve rehberi görüntüleyin.
                </p>
              </div>
              <button
                onClick={() => onNavigate('kullanim-kilavuzu')}
                className="w-full sm:w-auto text-center px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-xl shadow-md transition-colors whitespace-nowrap shrink-0 relative z-10"
              >
                Rehberi İncele
              </button>
            </div>

            <section>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Hızlı Erişim
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PAGES.filter(page => canAccessView(effectiveRole, page.id)).slice(0, 6).map(page => {
                  const cs = page.id === 'kullanicilar' ? CAT_STYLE.sayfa
                    : page.id.startsWith('bordro') ? CAT_STYLE.bordro
                    : page.id === 'izin' ? CAT_STYLE.izin
                    : page.id === 'personel' ? CAT_STYLE.personel
                    : CAT_STYLE.sayfa;
                  return (
                    <button
                      key={page.id}
                      onClick={() => onNavigate(page.id)}
                      className={`bg-white border border-gray-200 rounded-xl px-4 py-3 text-left hover:${cs.border} ${cs.hoverBg} transition-all group flex items-start gap-3 w-full`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${cs.bg} ${cs.text} flex items-center justify-center shrink-0 mt-0.5`}>
                        {PAGE_ICON[page.id] ?? <Layers className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold text-sm text-gray-800 group-hover:${cs.text} transition-colors break-words leading-tight`}>{page.label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{page.keywords.slice(0, 3).join(', ')}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {['superadmin', 'admin', 'hr', 'manager'].includes(effectiveRole) ? (
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { label: 'Personel', count: employees.length, cat: 'personel' as Category },
                  {
                    label: 'Bekleyen İzin Talebi',
                    count: (izinTalepleri || []).filter(t => t.durum === 'beklemede' || (t as any).durum === 'onay-bekliyor').length,
                    cat: 'izin' as Category
                  },
                  { label: 'Bordro', count: bordrolar.length, cat: 'bordro' as Category },
                ].map(item => {
                  const cs = CAT_STYLE[item.cat];
                  return (
                    <button
                      key={item.label}
                      onClick={() => onNavigate(item.cat === 'izin' ? 'izin' : item.cat === 'bordro' ? 'bordro' : 'personel')}
                      className={`${cs.bg} border ${cs.border} rounded-2xl px-4 py-4 text-center ${cs.hoverBg} transition-all cursor-pointer shadow-sm hover:shadow-md`}
                    >
                      <p className={`text-3xl font-extrabold ${cs.text}`}>{item.count}</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">{item.label}</p>
                    </button>
                  );
                })}
              </section>
            ) : (
              <section className="flex justify-center max-w-sm mx-auto w-full">
                {[
                  {
                    label: 'Bekleyen İzin Talebi',
                    count: (izinTalepleri || []).filter(t => t.durum === 'beklemede' || (t as any).durum === 'onay-bekliyor').length,
                    cat: 'izin' as Category
                  },
                ].map(item => {
                  const cs = CAT_STYLE[item.cat];
                  return (
                    <button
                      key={item.label}
                      onClick={() => onNavigate('izin')}
                      className={`w-full ${cs.bg} border ${cs.border} rounded-2xl px-6 py-5 text-center ${cs.hoverBg} transition-all shadow-sm hover:shadow-md cursor-pointer`}
                    >
                      <p className={`text-4xl font-extrabold ${cs.text}`}>{item.count}</p>
                      <p className="text-sm font-semibold text-gray-600 mt-1">{item.label}</p>
                    </button>
                  );
                })}
              </section>
            )}

            <div className="text-center text-sm text-gray-400 py-4">
              <Search className="w-5 h-5 mx-auto mb-2 opacity-30" />
              <p>Aramak istediğiniz kelimeyi veya cümleyi yazın</p>
              <p className="text-xs mt-1 text-gray-300">Çok kelimeli arama desteklenir: "Ahmet yıllık", "Mart bordro"</p>
            </div>
          </>
        )}

        {/* Results */}
        {words.length > 0 && visibleResults.length > 0 && (
          <>
            {/* Show grouped by category when "all" tab, flat list otherwise */}
            {activeTab === 'all'
              ? CAT_ORDER.filter(cat => searchResults.some(r => r.category === cat)).map(cat => {
                  const catResults = searchResults.filter(r => r.category === cat);
                  const cs = CAT_STYLE[cat];
                  return (
                    <section key={cat}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${cs.bg} ${cs.text}`}>
                          {CAT_ICON[cat]}
                        </div>
                        <h2 className="font-bold text-gray-800 text-sm">{CAT_LABEL[cat]}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${cs.bg} ${cs.text}`}>
                          {catResults.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {catResults.map(renderResult)}
                      </div>
                    </section>
                  );
                })
              : (
                <section>
                  <p className="text-xs text-gray-400 mb-3">{visibleResults.length} sonuç</p>
                  <div className="space-y-2">
                    {visibleResults.map(renderResult)}
                  </div>
                </section>
              )
            }
          </>
        )}

        {/* Empty state */}
        {words.length > 0 && visibleResults.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 text-lg font-medium">"{query}" için sonuç bulunamadı</p>
            <p className="text-gray-400 text-sm mt-1">
              {words.length > 1
                ? 'Tüm kelimeler aynı anda eşleşmedi — daha az kelime deneyin'
                : 'Farklı bir kelime veya ad deneyin'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};