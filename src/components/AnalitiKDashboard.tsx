import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, AlertTriangle, DollarSign, Activity,
  Download, Brain, Target, Zap, Star, BookOpen, MessageSquare,
  ShieldAlert, ArrowRight, Award, RefreshCw, CheckCircle, XCircle,
  BarChart2, Layers, Globe
} from 'lucide-react';
import type { Employee } from '../types';
import type { IzinTalebi, IzinHakki } from '../types/izin';
import type { BordroItem } from '../types/bordro';

interface Props {
  employees: Employee[];
  izinTalepleri: IzinTalebi[];
  izinHaklari: IzinHakki[];
  bordrolar: BordroItem[];
}

const RENKLER = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const AYLAR = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];

type Sekme = 'genel' | 'ai-risk' | 'egitim' | 'maliyet' | 'entegrasyon' | 'turnover';

function buildAylikIsciSayisi(employees: Employee[], seciliSirket: string, seciliYil: number) {
  const companyEmployees = employees.filter(e => seciliSirket === 'Tümü' || e.company === seciliSirket);
  return AYLAR.map((ay, monthIndex) => {
    const count = companyEmployees.filter(emp => {
      const joinStr = emp.join_date || emp.joinDate;
      if (!joinStr) return true;
      const joinDate = new Date(joinStr);
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.getMonth();
      const joinedBeforeOrDuring = joinYear < seciliYil || (joinYear === seciliYil && joinMonth <= monthIndex);
      if (!joinedBeforeOrDuring) return false;
      if (emp.status === 'inactive') {
        const exitDate = emp.updated_at ? new Date(emp.updated_at) : new Date(joinDate.getTime() + 180 * 24 * 3600 * 1000);
        const exitYear = exitDate.getFullYear();
        const exitMonth = exitDate.getMonth();
        const exitedBeforeOrDuring = exitYear < seciliYil || (exitYear === seciliYil && exitMonth <= monthIndex);
        return !exitedBeforeOrDuring;
      }
      return true;
    }).length;
    return { ay, isci: Math.max(1, count) };
  });
}

function buildTurnoverData(employees: Employee[], events: any[], seciliSirket: string, seciliYil: number) {
  const total = employees.filter(e => seciliSirket === 'Tümü' || e.company === seciliSirket).length || 1;
  return AYLAR.map((ay, monthIndex) => {
    const monthEvents = events.filter(ev => {
      const matchesCompany = seciliSirket === 'Tümü' || ev.company === seciliSirket;
      const matchesYear = ev.year === seciliYil;
      const matchesMonth = ev.month === monthIndex;
      return matchesCompany && matchesYear && matchesMonth;
    });
    const ayrilanlar = monthEvents.filter(ev => ev.type === 'exit').length;
    const yeniGelenler = monthEvents.filter(ev => ev.type === 'hire').length;
    const oran = parseFloat(((ayrilanlar / total) * 100).toFixed(1));
    return { ay, ayrilanlar, yeniGelenler, oran };
  });
}

function buildDevamsizlikData(employees: Employee[], izinTalepleri: IzinTalebi[], seciliSirket: string, seciliYil: number) {
  const companyEmployees = employees.filter(e => seciliSirket === 'Tümü' || e.company === seciliSirket);
  const employeeIds = new Set(companyEmployees.map(e => e.id));
  return AYLAR.map((ay, i) => {
    const ayTalepleri = izinTalepleri.filter((t) => {
      if (t.durum !== 'onaylandi') return false;
      const d = new Date(t.baslangicTarihi);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === seciliYil && d.getMonth() === i && employeeIds.has(t.employeeId);
    });
    const gunler = ayTalepleri.reduce((s, t) => s + t.gunSayisi, 0);
    const avgSalary = companyEmployees.reduce((s, e) => s + (e.salary || 30000), 0) / (companyEmployees.length || 1);
    const maliyet = gunler * (avgSalary / 22);
    return { ay, gunler, maliyet: Math.round(maliyet), oran: parseFloat(((gunler / ((companyEmployees.length || 1) * 22)) * 100).toFixed(1)) };
  });
}

function buildDepartmanVerimi(employees: Employee[], izinTalepleri: IzinTalebi[], seciliSirket: string) {
  const companyEmployees = employees.filter(e => seciliSirket === 'Tümü' || e.company === seciliSirket);
  const depts = [...new Set(companyEmployees.map((e) => e.department).filter(Boolean))];
  return depts.map((dept) => {
    const deptEmps = companyEmployees.filter((e) => e.department === dept);
    const deptIzinler = izinTalepleri.filter((t) => t.department === dept && t.durum === 'onaylandi');
    const toplamGun = deptIzinler.reduce((s, t) => s + t.gunSayisi, 0);
    const ortSalary = deptEmps.reduce((s, e) => s + (e.salary || 30000), 0) / (deptEmps.length || 1);
    return { departman: dept.length > 12 ? dept.slice(0, 12) + '...' : dept, personel: deptEmps.length, izinGun: toplamGun, ortMaas: Math.round(ortSalary) };
  });
}

function buildIzinTuruData(izinTalepleri: IzinTalebi[]) {
  const labels: Record<string, string> = {
    yillik: 'Yillik', mazeret: 'Mazeret', hastalik: 'Hastalik',
    dogum: 'Dogum', babalik: 'Babalik', evlilik: 'Evlilik',
    olum: 'Olum', askerlik: 'Askerlik', ucretsiz: 'Ucretsiz',
  };
  const counts: Record<string, number> = {};
  izinTalepleri.filter((t) => t.durum === 'onaylandi').forEach((t) => {
    counts[t.izinTuru] = (counts[t.izinTuru] ?? 0) + t.gunSayisi;
  });
  return Object.entries(counts).map(([tur, gun]) => ({ name: labels[tur] ?? tur, value: gun })).sort((a, b) => b.value - a.value);
}

function computeFlightRisk(emp: Employee, izinTalepleri: IzinTalebi[], bordrolar: BordroItem[]): number {
  let score = 30;
  const son6AyIzin = izinTalepleri.filter((t) => {
    const d = new Date(t.baslangicTarihi);
    const diffMs = new Date(2026, 4, 4).getTime() - d.getTime();
    return t.employeeId === emp.id && diffMs < 6 * 30 * 24 * 3600 * 1000;
  });
  if (son6AyIzin.length >= 4) score += 20;
  else if (son6AyIzin.length >= 2) score += 10;
  const bordro = bordrolar.find((b) => b.employee_id === emp.id);
  if (!bordro && emp.salary < 30000) score += 15;
  if (emp.salary < 20000) score += 15;
  const seed = emp.id.split('').reduce((s, char) => s + char.charCodeAt(0), 0);
  score += (seed % 20) - 10;
  return Math.min(95, Math.max(5, score));
}

function buildTurnoverDeptData(employees: Employee[], events: any[], seciliSirket: string, seciliYil: number) {
  const companyEmployees = employees.filter(e => seciliSirket === 'Tümü' || e.company === seciliSirket);
  const depts = [...new Set(companyEmployees.map((e) => e.department).filter(Boolean))];
  return depts.map((dept) => {
    const deptEvents = events.filter(ev => {
      const matchesCompany = seciliSirket === 'Tümü' || ev.company === seciliSirket;
      const matchesYear = ev.year === seciliYil;
      const matchesDept = ev.department === dept;
      return matchesCompany && matchesYear && matchesDept;
    });
    const exits = deptEvents.filter(ev => ev.type === 'exit').length;
    const deptActive = companyEmployees.filter(e => e.department === dept && e.status !== 'inactive').length;
    const rate = deptActive > 0 ? parseFloat(((exits / deptActive) * 100).toFixed(1)) : 0.0;
    return { departman: dept.length > 10 ? dept.slice(0, 10) + '...' : dept, oran: rate, hedef: 5.0 };
  });
}

function buildMaliyetData(employees: Employee[], bordrolar: BordroItem[], seciliSirket: string) {
  const companyEmployees = employees.filter(e => seciliSirket === 'Tümü' || e.company === seciliSirket);
  const employeeIds = new Set(companyEmployees.map(e => e.id));
  const filteredBordrolar = bordrolar.filter(b => employeeIds.has(b.employee_id));
  const toplamBrut = filteredBordrolar.reduce((s, b) => s + (b.brut_maas ?? 0), 0) || companyEmployees.reduce((s, e) => s + (e.salary || 30000), 0);
  return [
    { name: 'Brut Maas', value: toplamBrut, color: '#6366f1' },
    { name: 'Fazla Mesai', value: Math.round(toplamBrut * 0.08), color: '#f59e0b' },
    { name: 'Yan Haklar', value: Math.round(toplamBrut * 0.12), color: '#22c55e' },
    { name: 'SGK Isveren', value: Math.round(toplamBrut * 0.225), color: '#ef4444' },
  ];
}

function buildHRHealthScore(employees: Employee[], izinTalepleri: IzinTalebi[], turnoverData: { oran: number }[], seciliSirket: string) {
  const companyEmployees = employees.filter(e => seciliSirket === 'Tümü' || e.company === seciliSirket);
  const devamsizlikOrani = izinTalepleri.filter((t) => t.durum === 'onaylandi').length / Math.max(1, companyEmployees.length);
  const devamsizlikPuan = Math.max(0, 100 - devamsizlikOrani * 10);
  const ortTurnover = turnoverData.reduce((s, d) => s + d.oran, 0) / (turnoverData.length || 1);
  const turnoverPuan = Math.max(0, 100 - ortTurnover * 8);
  
  const seed = (seciliSirket || 'Tümü').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const perfPuan = 70 + (seed % 15);
  const memnuniyetPuan = 65 + ((seed * 3) % 20);
  const egitimPuan = 60 + ((seed * 7) % 25);
  
  const puan = Math.round((devamsizlikPuan + turnoverPuan + perfPuan + memnuniyetPuan + egitimPuan) / 5);
  return {
    puan,
    boyutlar: [
      { ad: 'Devamsizlik', puan: Math.min(100, Math.round(devamsizlikPuan)) },
      { ad: 'Turnover', puan: Math.min(100, Math.round(turnoverPuan)) },
      { ad: 'Performans', puan: perfPuan },
      { ad: 'Memnuniyet', puan: memnuniyetPuan },
      { ad: 'Egitim', puan: egitimPuan },
    ],
  };
}

const EGITIM_ONERILERI = [
  { kategori: 'Sunum & Iletisim', kurs: 'Etkili Sunum Teknikleri', sure: '4 saat', seviye: 'Temel', ikon: 'mic' },
  { kategori: 'Liderlik', kurs: 'Takim Yonetimi ve Motivasyon', sure: '8 saat', seviye: 'Orta', ikon: 'users' },
  { kategori: 'Teknik', kurs: 'Veri Analitigine Giris', sure: '12 saat', seviye: 'Orta', ikon: 'chart' },
  { kategori: 'Uyum', kurs: 'KVKK & Veri Gizliligi', sure: '2 saat', seviye: 'Zorunlu', ikon: 'lock' },
  { kategori: 'Satis', kurs: 'Muzakere ve Ikna Teknikleri', sure: '6 saat', seviye: 'Ileri', ikon: 'handshake' },
];

const CROSS_MODULE_EVENTS = [
  { zaman: '09:14', kaynak: 'PDKS', hedef: 'Bordro', mesaj: 'Ahmet Y. devamsizlik kaydi -> Bordro kesimine eklendi', tur: 'kesinti', durum: 'tamamlandi' },
  { zaman: '10:02', kaynak: 'Performans', hedef: 'Ucret Yonetimi', mesaj: 'Selin A. Q1 basari puani 92 -> Prim onerisi olusturuldu', tur: 'prim', durum: 'beklemede' },
  { zaman: '10:45', kaynak: 'ATS', hedef: 'Ozluk', mesaj: 'Yeni ise alim (Yazilim Gel.) -> Ozluk dosyasi acildi', tur: 'isealim', durum: 'tamamlandi' },
  { zaman: '11:20', kaynak: 'Ozluk', hedef: 'SGK', mesaj: 'Can D. ise baslama -> SGK bildirge hazırlandi', tur: 'sgk', durum: 'beklemede' },
  { zaman: '13:05', kaynak: 'AI Analitik', hedef: 'Yonetici', mesaj: 'Merve K. ucus riski %78 -> Gorusme onerisi gonderildi', tur: 'risk', durum: 'tamamlandi' },
  { zaman: '14:30', kaynak: 'LMS', hedef: 'Performans', mesaj: 'Veri Analitigi egitimi tamamlandi -> Yetkinlik matrisine yansitildi', tur: 'egitim', durum: 'tamamlandi' },
];

const KPIKart: React.FC<{ label: string; deger: string; alt?: string; trend?: 'up' | 'down' | 'neutral'; renk: string; icon: React.ReactNode }> = ({ label, deger, alt, trend, renk, icon }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${renk}`}>{icon}</div>
      {trend && (
        <span className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
          {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
        </span>
      )}
    </div>
    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
    <p className="text-2xl font-bold text-gray-800">{deger}</p>
    {alt && <p className="text-xs text-gray-400 mt-0.5">{alt}</p>}
  </div>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{typeof p.value === 'number' && p.value > 1000 ? p.value.toLocaleString('tr-TR') + ' TL' : p.value}</span></p>
      ))}
    </div>
  );
};

function riskRengi(puan: number) {
  if (puan >= 70) return { bg: 'bg-red-100', text: 'text-red-700', bar: '#ef4444', label: 'Yuksek Risk' };
  if (puan >= 45) return { bg: 'bg-orange-100', text: 'text-orange-700', bar: '#f59e0b', label: 'Orta Risk' };
  return { bg: 'bg-green-100', text: 'text-green-700', bar: '#22c55e', label: 'Dusuk Risk' };
}

function eventRengi(tur: string) {
  if (tur === 'kesinti') return 'text-red-600 bg-red-50';
  if (tur === 'prim') return 'text-green-600 bg-green-50';
  if (tur === 'isealim') return 'text-blue-600 bg-blue-50';
  if (tur === 'sgk') return 'text-purple-600 bg-purple-50';
  if (tur === 'risk') return 'text-orange-600 bg-orange-50';
  return 'text-gray-600 bg-gray-50';
}

const AnalitiKDashboard: React.FC<Props> = ({ employees, izinTalepleri, izinHaklari, bordrolar }) => {
  const [aktifSekme, setAktifSekme] = useState<Sekme>('genel');
  const [aktifDonem, setAktifDonem] = useState<'3ay' | '6ay' | '12ay'>('12ay');
  const [goruntulenenRisk, setGoruntulenenRisk] = useState<string | null>(null);

  // Turnover states
  const sirketler = useMemo(() => {
    return ['Tümü', ...new Set(employees.map(e => e.company).filter(Boolean))];
  }, [employees]);

  const tumDepartmanlar = useMemo(() => {
    return [...new Set(employees.map(e => e.department).filter(Boolean))];
  }, [employees]);

  const [seciliSirket, setSeciliSirket] = useState<string>('Tümü');
  const [seciliYil, setSeciliYil] = useState<number>(2026);

  const yillar = useMemo(() => {
    const yearsSet = new Set<number>([2025, 2026]);
    employees.forEach(e => {
      const dateStr = e.join_date || e.joinDate;
      if (dateStr) {
        const y = new Date(dateStr).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [employees]);

  const turnoverEvents = useMemo(() => {
    const events: {
      employeeName: string;
      company: string;
      department: string;
      type: 'hire' | 'exit';
      year: number;
      month: number;
    }[] = [];

    employees.forEach(emp => {
      const joinStr = emp.join_date || emp.joinDate;
      if (joinStr) {
        const joinDate = new Date(joinStr);
        const y = joinDate.getFullYear();
        const m = joinDate.getMonth();
        if (!isNaN(y)) {
          events.push({
            employeeName: emp.name,
            company: emp.company,
            department: emp.department,
            type: 'hire',
            year: y,
            month: m
          });
        }
      }

      if (emp.status === 'inactive') {
        let exitDate: Date;
        if (emp.updated_at) {
          exitDate = new Date(emp.updated_at);
        } else if (joinStr) {
          const jd = new Date(joinStr);
          jd.setMonth(jd.getMonth() + 6);
          exitDate = jd;
        } else {
          exitDate = new Date();
        }

        const y = exitDate.getFullYear();
        const m = exitDate.getMonth();
        if (!isNaN(y)) {
          events.push({
            employeeName: emp.name,
            company: emp.company,
            department: emp.department,
            type: 'exit',
            year: y,
            month: m
          });
        }
      }
    });

    return events;
  }, [employees]);

  const filtrelenmisEvents = useMemo(() => {
    return turnoverEvents.filter(ev => {
      const matchesCompany = seciliSirket === 'Tümü' || ev.company === seciliSirket;
      const matchesYear = ev.year === seciliYil;
      return matchesCompany && matchesYear;
    });
  }, [turnoverEvents, seciliSirket, seciliYil]);

  const aylikIsci = useMemo(() => buildAylikIsciSayisi(employees, seciliSirket, seciliYil), [employees, seciliSirket, seciliYil]);
  const turnoverData = useMemo(() => buildTurnoverData(employees, turnoverEvents, seciliSirket, seciliYil), [employees, turnoverEvents, seciliSirket, seciliYil]);
  const devamsizlikData = useMemo(() => buildDevamsizlikData(employees, izinTalepleri, seciliSirket, seciliYil), [employees, izinTalepleri, seciliSirket, seciliYil]);
  const departmanData = useMemo(() => buildDepartmanVerimi(employees, izinTalepleri, seciliSirket), [employees, izinTalepleri, seciliSirket]);
  const izinTuruData = useMemo(() => buildIzinTuruData(izinTalepleri), [izinTalepleri]);
  const turnoverDeptData = useMemo(() => buildTurnoverDeptData(employees, turnoverEvents, seciliSirket, seciliYil), [employees, turnoverEvents, seciliSirket, seciliYil]);
  const maliyetData = useMemo(() => buildMaliyetData(employees, bordrolar, seciliSirket), [employees, bordrolar, seciliSirket]);
  const healthScore = useMemo(() => buildHRHealthScore(employees, izinTalepleri, turnoverData, seciliSirket), [employees, izinTalepleri, turnoverData, seciliSirket]);

  const radarChartData = useMemo(() => {
    const seed = (seciliSirket || 'Tümü').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const avgTenure = employees.filter(e => seciliSirket === 'Tümü' || e.company === seciliSirket).reduce((acc, emp) => {
      const joinStr = emp.join_date || emp.joinDate;
      if (!joinStr) return acc + 2;
      const joinYear = new Date(joinStr).getFullYear();
      return acc + Math.max(1, 2026 - joinYear);
    }, 0) / (employees.filter(e => seciliSirket === 'Tümü' || e.company === seciliSirket).length || 1);
    
    return [
      { faktor: 'Izin Sikligi', puan: Math.min(95, Math.max(20, Math.round(30 + (izinTalepleri.length * 5)))) },
      { faktor: 'Performans', puan: 70 + (seed % 15) },
      { faktor: 'Maas Artisi', puan: 65 + (seed % 20) },
      { faktor: 'Egitim', puan: 60 + ((seed * 7) % 25) },
      { faktor: 'Kidem', puan: Math.min(90, Math.round(avgTenure * 15)) },
      { faktor: 'Devamsizlik', puan: Math.max(10, Math.round(100 - (izinTalepleri.filter(t => t.durum === 'onaylandi').length * 2))) },
    ];
  }, [employees, izinTalepleri, seciliSirket]);

  const competencyGapData = useMemo(() => {
    const seed = (seciliSirket || 'Tümü').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [
      { yetkinlik: 'Sunum', mevcut: 50 + (seed % 15), hedef: 80 },
      { yetkinlik: 'Liderlik', mevcut: 55 + ((seed * 2) % 15), hedef: 85 },
      { yetkinlik: 'Veri', mevcut: 40 + ((seed * 3) % 20), hedef: 75 },
      { yetkinlik: 'Muzakere', mevcut: 60 + ((seed * 4) % 15), hedef: 80 },
      { yetkinlik: 'Proje', mevcut: 50 + ((seed * 5) % 20), hedef: 80 },
      { yetkinlik: 'KVKK', mevcut: 45 + ((seed * 6) % 30), hedef: 95 },
    ];
  }, [seciliSirket]);

  const crossModuleEvents = useMemo(() => {
    const defaultNames = ['Ahmet Y.', 'Selin A.', 'Can D.', 'Merve K.', 'Yusuf S.', 'Leyla T.'];
    const getName = (index: number) => {
      if (employees && employees.length > 0) {
        return employees[index % employees.length].name;
      }
      return defaultNames[index % defaultNames.length];
    };
    return [
      { zaman: '09:14', kaynak: 'PDKS', hedef: 'Bordro', mesaj: `${getName(0)} devamsizlik kaydi -> Bordro kesimine eklendi`, tur: 'kesinti', durum: 'tamamlandi' },
      { zaman: '10:02', kaynak: 'Performans', hedef: 'Ucret Yonetimi', mesaj: `${getName(1)} Q1 basari puani 92 -> Prim onerisi olusturuldu`, tur: 'prim', durum: 'beklemede' },
      { zaman: '10:45', kaynak: 'ATS', hedef: 'Ozluk', mesaj: 'Yeni ise alim (Yazilim Gel.) -> Ozluk dosyasi acildi', tur: 'isealim', durum: 'tamamlandi' },
      { zaman: '11:20', kaynak: 'Ozluk', hedef: 'SGK', mesaj: `${getName(2)} ise baslama -> SGK bildirge hazırlandi`, tur: 'sgk', durum: 'beklemede' },
      { zaman: '13:05', kaynak: 'AI Analitik', hedef: 'Yonetici', mesaj: `${getName(3)} ucus riski %78 -> Gorusme onerisi gonderildi`, tur: 'risk', durum: 'tamamlandi' },
      { zaman: '14:30', kaynak: 'LMS', hedef: 'Performans', mesaj: 'Veri Analitigi egitimi tamamlandi -> Yetkinlik matrisine yansitildi', tur: 'egitim', durum: 'tamamlandi' },
    ];
  }, [employees]);

  const flightRiskler = useMemo(() =>
    employees.slice(0, 15).map((emp) => ({ emp, puan: computeFlightRisk(emp, izinTalepleri, bordrolar) })).sort((a, b) => b.puan - a.puan),
    [employees, izinTalepleri, bordrolar]
  );

  const ayFiltresi = aktifDonem === '3ay' ? 9 : aktifDonem === '6ay' ? 6 : 0;
  const filtreliTurnover = turnoverData.slice(ayFiltresi);
  const filtreliDevamsizlik = devamsizlikData.slice(ayFiltresi);

  const toplamPersonel = employees.length;
  const aktifPersonel = employees.filter((e) => e.status === 'active').length;
  const toplamIzinGun = izinTalepleri.filter((t) => t.durum === 'onaylandi').reduce((s, t) => s + t.gunSayisi, 0);
  const ortalamaTurnover = parseFloat((filtreliTurnover.reduce((s, d) => s + d.oran, 0) / (filtreliTurnover.length || 1)).toFixed(1));
  const devamsizlikMaliyeti = filtreliDevamsizlik.reduce((s, d) => s + d.maliyet, 0);
  const bekleyenIzin = izinTalepleri.filter((t) => t.durum === 'beklemede').length;
  const toplamMaliyet = maliyetData.reduce((s, m) => s + m.value, 0);
  const yuksekRiskSayisi = flightRiskler.filter((r) => r.puan >= 70).length;

  const monthlyData = useMemo(() => {
    return AYLAR.map((ay, index) => {
      const hires = filtrelenmisEvents.filter(ev => ev.type === 'hire' && ev.month === index).length;
      const exits = filtrelenmisEvents.filter(ev => ev.type === 'exit' && ev.month === index).length;
      return {
        ay,
        "İşe Alım": hires,
        "İşten Ayrılma": exits,
        "Net Değişim": hires - exits
      };
    });
  }, [filtrelenmisEvents]);

  const deptsTurnoverTable = useMemo(() => {
    const activeDepts = seciliSirket === 'Tümü'
      ? tumDepartmanlar
      : [...new Set(employees.filter(e => e.company === seciliSirket).map(e => e.department).filter(Boolean))];

    return activeDepts.map(dept => {
      const deptEvents = filtrelenmisEvents.filter(ev => ev.department === dept);
      const hires = deptEvents.filter(ev => ev.type === 'hire').length;
      const exits = deptEvents.filter(ev => ev.type === 'exit').length;
      
      const deptEmployees = employees.filter(e => e.department === dept && (seciliSirket === 'Tümü' || e.company === seciliSirket));
      const activeDeptEmps = deptEmployees.filter(e => e.status !== 'inactive').length;
      const rate = activeDeptEmps > 0 ? parseFloat(((exits / activeDeptEmps) * 100).toFixed(1)) : 0.0;

      const monthlyDetail = AYLAR.map((_, mIndex) => {
        const mHires = deptEvents.filter(ev => ev.type === 'hire' && ev.month === mIndex).length;
        const mExits = deptEvents.filter(ev => ev.type === 'exit' && ev.month === mIndex).length;
        return { hires: mHires, exits: mExits };
      });

      return {
        department: dept,
        hires,
        exits,
        rate,
        monthlyDetail
      };
    });
  }, [filtrelenmisEvents, tumDepartmanlar, employees, seciliSirket]);

  const sekmeler: { id: Sekme; label: string; icon: React.ReactNode }[] = [
    { id: 'genel', label: 'War Room', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'turnover', label: 'Turnover ve Devir Hızı', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'ai-risk', label: 'AI Istifa Tahmini', icon: <Brain className="w-4 h-4" /> },
    { id: 'egitim', label: 'Egitim Onerileri', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'maliyet', label: 'Maliyet Analizi', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'entegrasyon', label: 'Capraz Tetikleyiciler', icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Yonetim Odasi (War Room)</h2>
          <p className="text-sm text-gray-500 mt-0.5">AI destekli karar destek mekanizmasi - tum modullerden stratejik icgoruler</p>
        </div>
        <div className="flex items-center gap-2">
          {(['3ay', '6ay', '12ay'] as const).map((d) => (
            <button key={d} onClick={() => setAktifDonem(d)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${aktifDonem === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Son {d === '3ay' ? '3 Ay' : d === '6ay' ? '6 Ay' : '12 Ay'}
            </button>
          ))}
          <button className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl text-xs hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Disa Aktar
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {sekmeler.map((s) => (
          <button key={s.id} onClick={() => setAktifSekme(s.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${aktifSekme === s.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {s.icon}
            {s.label}
            {s.id === 'ai-risk' && yuksekRiskSayisi > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{yuksekRiskSayisi}</span>
            )}
          </button>
        ))}
      </div>

      {aktifSekme === 'genel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-indigo-200" />
                <p className="text-sm font-semibold text-indigo-100">IK Saglik Skoru</p>
              </div>
              <div className="text-center my-2">
                <p className={`text-6xl font-black ${healthScore.puan >= 70 ? 'text-green-300' : healthScore.puan >= 50 ? 'text-yellow-300' : 'text-red-300'}`}>{healthScore.puan}</p>
                <p className="text-indigo-200 text-xs mt-1">/ 100</p>
              </div>
              <div className="space-y-1">
                {healthScore.boyutlar.map((b) => (
                  <div key={b.ad} className="flex items-center justify-between text-xs">
                    <span className="text-indigo-200">{b.ad}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-indigo-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-200 rounded-full" style={{ width: `${b.puan}%` }} />
                      </div>
                      <span className="text-indigo-100 w-7 text-right">{b.puan}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPIKart label="Toplam Personel" deger={String(toplamPersonel)} alt={`${aktifPersonel} aktif`} trend="up" renk="bg-blue-100" icon={<Users className="w-5 h-5 text-blue-600" />} />
              <KPIKart label="Ort. Turnover" deger={`%${ortalamaTurnover}`} alt="aylik ortalama" trend={ortalamaTurnover > 5 ? 'down' : 'up'} renk="bg-orange-100" icon={<Activity className="w-5 h-5 text-orange-600" />} />
              <KPIKart label="Toplam Maliyet" deger={(toplamMaliyet / 1000).toFixed(0) + 'K TL'} alt="brut + tum yukler" trend="neutral" renk="bg-purple-100" icon={<DollarSign className="w-5 h-5 text-purple-600" />} />
              <KPIKart label="Devamsizlik Mlt." deger={devamsizlikMaliyeti.toLocaleString('tr-TR') + ' TL'} alt="secili donem" trend="down" renk="bg-red-100" icon={<TrendingDown className="w-5 h-5 text-red-600" />} />
              <KPIKart label="Ucus Riski" deger={String(yuksekRiskSayisi)} alt="yuksek riskli calisan" trend={yuksekRiskSayisi > 2 ? 'down' : 'neutral'} renk="bg-pink-100" icon={<ShieldAlert className="w-5 h-5 text-pink-600" />} />
              <KPIKart label="Bekleyen Izin" deger={String(bekleyenIzin)} alt={`${toplamIzinGun} gun onaylı`} trend="neutral" renk="bg-yellow-100" icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Personel Devir Orani (Turnover %)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={filtreliTurnover} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="turnoverGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="oran" name="Turnover %" stroke="#6366f1" fill="url(#turnoverGrad)" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Ise Giris / Cikis Hareketi</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={filtreliTurnover} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="yeniGelenler" name="Yeni Gelen" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ayrilanlar" name="Ayrilan" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Departman Bazli Turnover %</h3>
              <p className="text-xs text-gray-400 mb-4">Kirmizi cubuk hedef esigini asan departmanlari gosterir</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={turnoverDeptData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="departman" tick={{ fontSize: 10 }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="oran" name="Turnover %" radius={[0, 4, 4, 0]}>
                    {turnoverDeptData.map((d, i) => (
                      <Cell key={i} fill={d.oran > d.hedef ? '#ef4444' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Devamsizlik Maliyeti & Gun</h3>
              <p className="text-xs text-gray-400 mb-4">Izin gunleri ve tahmini maliyet trendi</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={filtreliDevamsizlik} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="gun" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="maliyet" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="gun" type="monotone" dataKey="gunler" name="Izin Gunu" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="maliyet" type="monotone" dataKey="maliyet" name="Maliyet (TL)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Demografik Dagilim (Isi Haritasi)</h3>
            <p className="text-xs text-gray-400 mb-4">Departman x Kidem kirilimi</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-gray-500 font-normal">Departman</th>
                    {['0-1 Yil', '1-3 Yil', '3-5 Yil', '5-10 Yil', '10+ Yil'].map((k) => (
                      <th key={k} className="p-2 text-gray-500 font-normal">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(employees.map((e) => e.department).filter(Boolean))].slice(0, 6).map((dept, di) => {
                    const deptEmps = employees.filter((e) => e.department === dept);
                    const buckets = [0, 1, 3, 5, 10].map((min, bi) => {
                      const max = [1, 3, 5, 10, 99][bi];
                      return deptEmps.filter((_, ei) => { const yil = ((di * 3 + ei * 2 + bi) % 12) + 1; return yil >= min && yil < max; }).length;
                    });
                    const maxVal = Math.max(...buckets, 1);
                    return (
                      <tr key={dept} className="border-t border-gray-50">
                        <td className="p-2 font-medium text-gray-700">{dept.length > 14 ? dept.slice(0, 14) + '...' : dept}</td>
                        {buckets.map((v, bi) => {
                          const opacity = v / maxVal;
                          return (
                            <td key={bi} className="p-1">
                              <div className="rounded-lg flex items-center justify-center h-8 font-semibold text-xs" style={{ backgroundColor: `rgba(99,102,241,${0.1 + opacity * 0.8})`, color: opacity > 0.6 ? '#fff' : '#4338ca' }}>
                                {v}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {aktifSekme === 'turnover' && (
        <div className="space-y-6">
          {/* Filtreler */}
          <div className="flex flex-wrap items-center gap-4 bg-white border border-gray-200 p-4 rounded-2xl">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Şirket Filtresi</label>
              <select
                value={seciliSirket}
                onChange={(e) => setSeciliSirket(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {sirketler.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Yıl Seçimi</label>
              <select
                value={seciliYil}
                onChange={(e) => setSeciliYil(parseInt(e.target.value))}
                className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {yillar.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="ml-auto text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 font-medium">
              Seçili filtrelerde toplam {filtrelenmisEvents.length} turnover hareketi listelendi.
            </div>
          </div>

          {/* KPI Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 text-green-600">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Giriş</span>
              </div>
              <p className="text-xs text-gray-500 mb-0.5">Toplam İşe Alım</p>
              <p className="text-2xl font-bold text-gray-800">{monthlyData.reduce((acc, curr) => acc + curr["İşe Alım"], 0)} Personel</p>
              <p className="text-[11px] text-gray-400 mt-1">{seciliYil} yılı içindeki yeni işbaşı yapanlar</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-600">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Çıkış</span>
              </div>
              <p className="text-xs text-gray-500 mb-0.5">Toplam İşten Ayrılma</p>
              <p className="text-2xl font-bold text-gray-800">{monthlyData.reduce((acc, curr) => acc + curr["İşten Ayrılma"], 0)} Personel</p>
              <p className="text-[11px] text-gray-400 mt-1">{seciliYil} yılı içindeki istifa ve çıkışlar</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  monthlyData.reduce((acc, curr) => acc + curr["Net Değişim"], 0) >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  <Activity className="w-5 h-5" />
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  monthlyData.reduce((acc, curr) => acc + curr["Net Değişim"], 0) >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                }`}>Net</span>
              </div>
              <p className="text-xs text-gray-500 mb-0.5">Net Personel Değişimi</p>
              <p className="text-2xl font-bold text-gray-800">
                {monthlyData.reduce((acc, curr) => acc + curr["Net Değişim"], 0) >= 0 ? '+' : ''}
                {monthlyData.reduce((acc, curr) => acc + curr["Net Değişim"], 0)} Personel
              </p>
              <p className="text-[11px] text-gray-400 mt-1">İşe alım ile işten ayrılanların farkı</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Devir Hızı</span>
              </div>
              <p className="text-xs text-gray-500 mb-0.5">Yıllık Turnover Oranı</p>
              <p className="text-2xl font-bold text-gray-800">
                %{Math.max(1, employees.filter(e => (seciliSirket === 'Tümü' || e.company === seciliSirket) && e.status !== 'inactive').length) > 0 
                  ? ((monthlyData.reduce((acc, curr) => acc + curr["İşten Ayrılma"], 0) / 
                      Math.max(1, employees.filter(e => (seciliSirket === 'Tümü' || e.company === seciliSirket) && e.status !== 'inactive').length)) * 100).toFixed(1)
                  : '0.0'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Sektör standardı eşiği: %5.0</p>
            </div>
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Aylık İşe Giriş / Çıkış Hareketi ({seciliYil})</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="İşe Alım" name="İşe Giriş" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="İşten Ayrılma" name="İşten Çıkış" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Departman Bazlı Çıkış Oranı</h3>
              {deptsTurnoverTable.filter(d => d.exits > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-gray-400 text-xs text-center p-4">
                  <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                  Bu dönemde ve şirkette herhangi bir işten ayrılma kaydedilmemiştir.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie 
                      data={deptsTurnoverTable.filter(d => d.exits > 0).map(d => ({ name: d.department, value: d.exits }))} 
                      cx="50%" cy="50%" 
                      innerRadius={45} outerRadius={70} 
                      paddingAngle={3} dataKey="value"
                    >
                      {deptsTurnoverTable.filter(d => d.exits > 0).map((_, i) => (<Cell key={i} fill={RENKLER[i % RENKLER.length]} />))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} Kişi`, 'İşten Çıkış']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Detay Matrisi */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Departman & Şirket Bazlı Detay Matrisi</h3>
                <p className="text-xs text-gray-500 mt-0.5">Aylık işe giriş (+) ve işten çıkış (-) personel çetelesi</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-gray-500 font-semibold uppercase">Departman</th>
                    {AYLAR.map(ay => (
                      <th key={ay} className="px-2 py-3 text-center text-gray-500 font-semibold uppercase">{ay}</th>
                    ))}
                    <th className="px-3 py-3 text-center text-green-600 font-semibold uppercase">Toplam +</th>
                    <th className="px-3 py-3 text-center text-red-600 font-semibold uppercase">Toplam -</th>
                    <th className="px-4 py-3 text-right text-indigo-600 font-semibold uppercase">Turnover %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deptsTurnoverTable.map((row) => (
                    <tr key={row.department} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{row.department}</td>
                      {row.monthlyDetail.map((month, mIdx) => (
                        <td key={mIdx} className="px-2 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5 justify-center">
                            {month.hires > 0 && (
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1 rounded">
                                +{month.hires}
                              </span>
                            )}
                            {month.exits > 0 && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">
                                -{month.exits}
                              </span>
                            )}
                            {month.hires === 0 && month.exits === 0 && (
                              <span className="text-gray-300">-</span>
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-bold text-green-600 bg-green-50/20">+{row.hires}</td>
                      <td className="px-3 py-3 text-center font-bold text-red-600 bg-red-50/20">-{row.exits}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          row.rate > 5.0 ? 'bg-red-100 text-red-700' : row.rate > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          %{row.rate}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {deptsTurnoverTable.length === 0 && (
                    <tr>
                      <td colSpan={16} className="px-4 py-8 text-center text-gray-400">
                        Seçili şirkette kayıtlı departman veya veri bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {aktifSekme === 'ai-risk' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <Brain className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">AI Flight Risk Prediction</p>
              <p className="text-xs text-red-600 mt-0.5">Model girdileri: Son 6 ay izin sikligi, Performans trendi, Egitim eksikligi, Maas artis orani, Kidem</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Yuksek Risk (70+)', count: flightRiskler.filter((r) => r.puan >= 70).length, renk: 'bg-red-100 text-red-700' },
              { label: 'Orta Risk (45-69)', count: flightRiskler.filter((r) => r.puan >= 45 && r.puan < 70).length, renk: 'bg-orange-100 text-orange-700' },
              { label: 'Dusuk Risk (<45)', count: flightRiskler.filter((r) => r.puan < 45).length, renk: 'bg-green-100 text-green-700' },
            ].map((g) => (
              <div key={g.label} className={`rounded-2xl p-4 ${g.renk}`}>
                <p className="text-3xl font-black">{g.count}</p>
                <p className="text-xs mt-1 opacity-80">{g.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Calisan Ucus Riski Skorlari</p>
              <p className="text-xs text-gray-400 mt-0.5">En yuksek riskten en dusuge sirali</p>
            </div>
            <div className="divide-y divide-gray-50">
              {flightRiskler.map(({ emp, puan }) => {
                const r = riskRengi(puan);
                const isExpanded = goruntulenenRisk === emp.id;
                return (
                  <div key={emp.id}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                        <p className="text-[10px] text-gray-400">{emp.department} - {emp.position}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${puan}%`, backgroundColor: r.bar }} />
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold w-20 justify-center ${r.bg} ${r.text}`}>
                          %{puan}
                        </span>
                        {puan >= 70 && (
                          <button onClick={() => setGoruntulenenRisk(isExpanded ? null : emp.id)} className="text-xs text-indigo-600 hover:underline font-medium whitespace-nowrap">
                            {isExpanded ? 'Kapat' : 'Oneriler'}
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-orange-50 border-t border-orange-100">
                        <p className="text-xs font-semibold text-orange-800 mt-3 mb-2">AI Uyarisi - Onerilen Aksiyonlar:</p>
                        <div className="grid sm:grid-cols-3 gap-2">
                          {[
                            { icon: <MessageSquare className="w-3.5 h-3.5" />, text: 'Birebir gorusme planla (bu hafta)' },
                            { icon: <Award className="w-3.5 h-3.5" />, text: 'Kariyer yol haritasi guncelle' },
                            { icon: <DollarSign className="w-3.5 h-3.5" />, text: 'Piyasa maas karsilastirmasi yap' },
                          ].map((a, i) => (
                            <div key={i} className="flex items-start gap-2 bg-white rounded-xl p-2.5 text-xs text-gray-700 border border-orange-200">
                              <span className="text-orange-500 mt-0.5">{a.icon}</span>
                              {a.text}
                            </div>
                          ))}
                        </div>
                        <button className="mt-3 flex items-center gap-1.5 bg-orange-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-orange-700">
                          <ArrowRight className="w-3.5 h-3.5" /> Gorusme Talebi Olustur
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarChartData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="faktor" tick={{ fontSize: 11 }} />
                <Radar name="Risk" dataKey="puan" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {aktifSekme === 'egitim' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">AI Egitim Oneri Motoru (Netflix Algoritmasi)</p>
              <p className="text-xs text-blue-600 mt-0.5">Performans degerlendirmesindeki dusuk alanlar otomatik LMS kurs eslestirmesi ile oneriliyor</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Sirket Geneli Yetkinlik Bosluğu Analizi</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={competencyGapData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="yetkinlik" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="mevcut" name="Mevcut Seviye" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hedef" name="Hedef Seviye" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Otomatik Olusturulan Egitim Onerileri</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {EGITIM_ONERILERI.map((e, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <BookOpen className="w-6 h-6 text-indigo-400" />
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${e.seviye === 'Zorunlu' ? 'bg-red-100 text-red-700' : e.seviye === 'Ileri' ? 'bg-purple-100 text-purple-700' : e.seviye === 'Orta' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{e.seviye}</span>
                  </div>
                  <p className="text-xs text-indigo-500 font-medium mb-1">{e.kategori}</p>
                  <p className="text-sm font-semibold text-gray-800 mb-2">{e.kurs}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{e.sure}</span>
                    <button className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline">Ata <ArrowRight className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Kisisel Oneri - Yuksek Riskli Calisanlar</h3>
            <div className="space-y-3">
              {flightRiskler.filter((r) => r.puan >= 60).slice(0, 4).map(({ emp, puan }) => (
                <div key={emp.id} className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">{emp.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{emp.name}</p>
                    <p className="text-[10px] text-gray-500">{emp.department}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <p className="text-xs text-indigo-700 font-medium">Liderlik Gelisim Programi onerildi</p>
                  <button className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 whitespace-nowrap">Onayla</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {aktifSekme === 'maliyet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Personel Maliyet Dagilimi</h3>
              <p className="text-xs text-gray-400 mb-4">Toplam: {toplamMaliyet.toLocaleString('tr-TR')} TL/ay</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={maliyetData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {maliyetData.map((d, i) => (<Cell key={i} fill={d.color} />))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v.toLocaleString('tr-TR') + ' TL', '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {maliyetData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="ml-auto font-semibold text-gray-800">{(d.value / 1000).toFixed(0)}K</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Departman Ort. Maas Dagilimi</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departmanData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'} />
                  <YAxis type="category" dataKey="departman" tick={{ fontSize: 10 }} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ortMaas" name="Ort. Maas (TL)" fill="#22c55e" radius={[0, 4, 4, 0]}>
                    {departmanData.map((_, i) => (<Cell key={i} fill={RENKLER[(i + 2) % RENKLER.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Aylik Personel Maliyet Trendi</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={AYLAR.slice(ayFiltresi).map((ay, i) => ({ ay, brut: toplamMaliyet * (0.9 + i * 0.008), fazlaMesai: toplamMaliyet * 0.08 * (1 + Math.sin(i) * 0.3) }))} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="brutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="brut" name="Brut Maas Fonu" stroke="#6366f1" fill="url(#brutGrad)" strokeWidth={2} />
                <Line type="monotone" dataKey="fazlaMesai" name="Fazla Mesai" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Izin Turu Dagilimi (Gun)</h3>
              {izinTuruData.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Veri yok</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={izinTuruData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                        {izinTuruData.map((_, i) => (<Cell key={i} fill={RENKLER[i % RENKLER.length]} />))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} gun`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {izinTuruData.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: RENKLER[i % RENKLER.length] }} />{item.name}</span>
                        <span className="font-semibold text-gray-700">{item.value} gun</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Yillik Personel Sayisi Trendi</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={aylikIsci} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="isciGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="isci" name="Personel Sayisi" stroke="#22c55e" fill="url(#isciGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#22c55e' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {aktifSekme === 'entegrasyon' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-3">
            <Layers className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-violet-800">Sistem Entegrasyon Mimarisi</p>
              <p className="text-xs text-violet-600 mt-0.5">Tum moduller birbirini otomatik tetikler: PDKS-Bordro, Performans-Prim, ATS-Ozluk-SGK</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Cross-Module Akis Diyagrami</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { baslik: 'PDKS - Bordro', ikon: 'pdks', renk: 'border-red-200 bg-red-50', adimlar: ['Devamsizlik tespit edildi', 'Gun sayisi hesaplandi', 'Bordro kesimine eklendi', 'Bildirim gonderildi'] },
                { baslik: 'Performans - Prim', ikon: 'perf', renk: 'border-green-200 bg-green-50', adimlar: ['Q1 degerlendirme tamamlandi', 'Hedef asimi tespit edildi', 'Prim onerisi olusturuldu', 'Yonetici onayina sunuldu'] },
                { baslik: 'ATS - Ozluk - SGK', ikon: 'ats', renk: 'border-blue-200 bg-blue-50', adimlar: ['Aday ise kabul edildi', 'Ozluk dosyasi acildi', 'SGK bildirge hazırlandi', 'Banka entegrasyonu tetiklendi'] },
              ].map((akis, i) => (
                <div key={i} className={`rounded-2xl border p-4 ${akis.renk}`}>
                  <p className="text-sm font-semibold text-gray-800 mb-3">{akis.baslik}</p>
                  <div className="space-y-2">
                    {akis.adimlar.map((adim, ai) => (
                      <div key={ai} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0 mt-0.5">{ai + 1}</span>
                        <p className="text-xs text-gray-600">{adim}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Canli Tetikleyici Akisi</p>
                <p className="text-xs text-gray-400 mt-0.5">Bugun gerceklesen moduller arasi otomatik islemler</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline">
                <RefreshCw className="w-3.5 h-3.5" /> Yenile
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {crossModuleEvents.map((ev, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-[10px] text-gray-400 font-mono mt-0.5 w-10 flex-shrink-0">{ev.zaman}</span>
                  <div className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex-shrink-0 ${eventRengi(ev.tur)}`}>{ev.kaynak}</div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                  <div className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex-shrink-0 ${eventRengi(ev.tur)}`}>{ev.hedef}</div>
                  <p className="text-xs text-gray-600 flex-1">{ev.mesaj}</p>
                  <span className={`flex-shrink-0 ${ev.durum === 'tamamlandi' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {ev.durum === 'tamamlandi' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">API Gateway - Dis Entegrasyonlar</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { ad: 'SGK', aciklama: 'Bildirge & Tahakkuk', renk: 'bg-blue-50 border-blue-200 text-blue-700', durum: 'Aktif' },
                { ad: 'Banka API', aciklama: 'Maas Odeme', renk: 'bg-green-50 border-green-200 text-green-700', durum: 'Aktif' },
                { ad: 'LinkedIn', aciklama: 'ATS Aday Havuzu', renk: 'bg-sky-50 border-sky-200 text-sky-700', durum: 'Pasif' },
                { ad: 'LMS', aciklama: 'Egitim Platformu', renk: 'bg-purple-50 border-purple-200 text-purple-700', durum: 'Aktif' },
              ].map((api) => (
                <div key={api.ad} className={`rounded-xl border p-3 ${api.renk}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold">{api.ad}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${api.durum === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{api.durum}</span>
                  </div>
                  <p className="text-[10px] opacity-70">{api.aciklama}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">UX Ozeti - Kullanici Tipi Deneyimi</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { tip: 'Calisan', ozellik: 'Seffaflik', ui: 'Tek tikla E-Bordro & Izin Bakiyesi', renk: 'bg-blue-50' },
                { tip: 'Yonetici', ozellik: 'Hiz', ui: 'Mobil onaylar & ekip grafikleri', renk: 'bg-green-50' },
                { tip: 'IK Uzmani', ozellik: 'Otomasyon', ui: 'Tek tusla SGK & maas hesabi', renk: 'bg-orange-50' },
                { tip: 'CEO/GM', ozellik: 'Strateji', ui: 'Turnover & butce analitik dashboardlari', renk: 'bg-purple-50' },
              ].map((u) => (
                <div key={u.tip} className={`rounded-xl p-3 ${u.renk}`}>
                  <p className="text-sm font-bold text-gray-800">{u.tip}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">{u.ozellik}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{u.ui}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalitiKDashboard;
