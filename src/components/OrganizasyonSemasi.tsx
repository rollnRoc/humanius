import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  User,
  Users,
  Building2,
  Briefcase,
  Search,
  Printer,
  X,
  ArrowRight,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Award,
  Crown,
  CornerDownRight,
  Grid,
  GitMerge
} from 'lucide-react';
import type { Employee } from '../types';
import { JOB_TEMPLATES } from '../data/jobTemplates';

const getPositionSummary = (positionTitle: string): string => {
  if (!positionTitle) return 'Pozisyon kapsamındaki operasyonel süreçlerin ve kurumsal görevlerin yürütülmesini sağlamaktır.';
  const norm = positionTitle.toLowerCase().trim();
  const found = JOB_TEMPLATES.find(
    (t) =>
      t.title.toLowerCase().trim() === norm ||
      norm.includes(t.title.toLowerCase().trim()) ||
      t.title.toLowerCase().trim().includes(norm)
  );
  if (found && found.summary) {
    const sentences = found.summary.split('.').map(s => s.trim()).filter(Boolean);
    if (sentences.length > 0) {
      return sentences[0] + '.';
    }
  }
  return `${positionTitle} pozisyonu kapsamında departman içi operasyonel süreçlerin ve kurumsal hedeflerin eksiksiz yürütülmesini sağlamaktır.`;
};

// ─── Mantıksal Derecelendirme (Level Classifier) ─────────────────────────────
// Level 0: Bayi Sahibi / Şirket Sahibi / Patron / Kurucu
// Level 0.5: Genel Müdür / CEO / Genel Yönetici
// Level 1: Departman Müdürleri / Direktörler / Yöneticiler
// Level 2: Uzmanlar / Şefler / Mühendisler / Danışmanlar
// Level 3: Stajyerler / Asistanlar / Yardımcılar / Elemanlar
export function classifyEmployeeLevel(emp: Employee): number {
  const pos = (emp.position || '').toLowerCase().trim();
  const level = (emp.level || '').toLowerCase().trim();

  // Level 0: Bayi Sahibi / Patron / Şirket Sahibi / Kurucu
  if (
    pos.includes('bayi sahibi') ||
    pos.includes('patron') ||
    pos.includes('şirket sahibi') ||
    pos.includes('yönetim kurulu başkanı') ||
    pos.includes('kurucu')
  ) {
    return 0;
  }

  // Level 0.5: Genel Müdür / CEO
  if (
    pos.includes('genel müdür') ||
    pos.includes('ceo') ||
    pos.includes('genel yönetici')
  ) {
    return 0.5;
  }

  // Level 1: Müdürler, Direktörler, Kısım / Bölge Yöneticileri
  if (
    pos.includes('müdür') ||
    pos.includes('direktör') ||
    pos.includes('yönetici') ||
    pos.includes('head of') ||
    level === 'manager' ||
    level === 'lead'
  ) {
    return 1;
  }

  // Level 3: Stajyer, Asistan, Yardımcı, Eleman, Destek, Çırak
  if (
    pos.includes('stajyer') ||
    pos.includes('asistan') ||
    pos.includes('yardımcı') ||
    pos.includes('eleman') ||
    pos.includes('destek') ||
    pos.includes('çırak') ||
    level === 'junior' ||
    level === 'intern'
  ) {
    return 3;
  }

  // Level 2: Varsayılan (Uzman, Mühendis, Danışman, Şef, Temsilci, Operatör)
  return 2;
}

const DEPT_COLORS: Record<string, { bg: string; border: string; text: string; lightBg: string; hex: string }> = {
  'İnsan Kaynakları': { bg: 'bg-indigo-600', border: 'border-indigo-300', text: 'text-indigo-700', lightBg: 'bg-indigo-50', hex: '#6366f1' },
  'Muhasebe':         { bg: 'bg-amber-600',  border: 'border-amber-300',  text: 'text-amber-700',  lightBg: 'bg-amber-50',  hex: '#f59e0b' },
  'Finans':           { bg: 'bg-amber-600',  border: 'border-amber-300',  text: 'text-amber-700',  lightBg: 'bg-amber-50',  hex: '#d97706' },
  'Mühendislik':     { bg: 'bg-emerald-600', border: 'border-emerald-300', text: 'text-emerald-700', lightBg: 'bg-emerald-50', hex: '#10b981' },
  'Yazılım & IT':     { bg: 'bg-cyan-600',    border: 'border-cyan-300',    text: 'text-cyan-700',    lightBg: 'bg-cyan-50',    hex: '#06b6d4' },
  'IT':               { bg: 'bg-cyan-600',    border: 'border-cyan-300',    text: 'text-cyan-700',    lightBg: 'bg-cyan-50',    hex: '#06b6d4' },
  'Satış':            { bg: 'bg-blue-600',    border: 'border-blue-300',    text: 'text-blue-700',    lightBg: 'bg-blue-50',    hex: '#2563eb' },
  'Pazarlama':        { bg: 'bg-pink-600',    border: 'border-pink-300',    text: 'text-pink-700',    lightBg: 'bg-pink-50',    hex: '#db2777' },
  'Operasyon':        { bg: 'bg-purple-600',  border: 'border-purple-300',  text: 'text-purple-700',  lightBg: 'bg-purple-50',  hex: '#9333ea' },
  'Servis':           { bg: 'bg-violet-600',  border: 'border-violet-300',  text: 'text-violet-700',  lightBg: 'bg-violet-50',  hex: '#7c3aed' },
  'Hukuk':            { bg: 'bg-rose-600',    border: 'border-rose-300',    text: 'text-rose-700',    lightBg: 'bg-rose-50',    hex: '#e11d48' },
  'Yönetim':          { bg: 'bg-slate-800',    border: 'border-slate-400',   text: 'text-slate-800',   lightBg: 'bg-slate-100',  hex: '#1e293b' },
};

const getDeptTheme = (dept?: string) => {
  if (!dept) return DEPT_COLORS['Yönetim'];
  return DEPT_COLORS[dept] || { bg: 'bg-slate-600', border: 'border-slate-300', text: 'text-slate-700', lightBg: 'bg-slate-50', hex: '#475569' };
};

const statusRenk: Record<string, string> = {
  active: 'bg-emerald-500',
  inactive: 'bg-gray-400',
  'on-leave': 'bg-amber-500',
};

interface OrgNode {
  id: string;
  label: string;
  tip: 'sirket' | 'departman' | 'pozisyon' | 'personel';
  altBaslik?: string;
  renk: string;
  children: OrgNode[];
  employee?: Employee;
}

interface OrganizasyonSemasiProps {
  employees: Employee[];
  companyName?: string;
}

function buildOrgTree(employees: Employee[]): OrgNode[] {
  const deptMap = new Map<string, Map<string, Employee[]>>();

  for (const emp of employees) {
    const dept = emp.department || 'Departman Belirtilmedi';
    const pos = emp.position || 'Pozisyon Belirtilmedi';
    if (!deptMap.has(dept)) deptMap.set(dept, new Map());
    const posMap = deptMap.get(dept)!;
    if (!posMap.has(pos)) posMap.set(pos, []);
    posMap.get(pos)!.push(emp);
  }

  return Array.from(deptMap.entries()).map(([dept, posMap]) => ({
    id: `dept-${dept}`,
    label: dept,
    tip: 'departman',
    altBaslik: `${Array.from(posMap.values()).flat().length} çalışan`,
    renk: getDeptTheme(dept).hex,
    children: Array.from(posMap.entries()).map(([pos, emps]) => ({
      id: `pos-${dept}-${pos}`,
      label: pos,
      tip: 'pozisyon',
      altBaslik: `${emps.length} kişi`,
      renk: getDeptTheme(dept).hex,
      children: emps.map((emp) => ({
        id: emp.id,
        label: emp.name,
        tip: 'personel',
        altBaslik: emp.email || '',
        renk: getDeptTheme(dept).hex,
        children: [],
        employee: emp,
      })),
    })),
  }));
}

// ─── Tree Card Component for Collapsible View ────────────────────────────────
const OrgKart: React.FC<{
  node: OrgNode;
  derinlik: number;
  onSelect: (node: OrgNode) => void;
  secilenId: string | null;
  aramaMetni: string;
}> = ({ node, derinlik, onSelect, secilenId, aramaMetni }) => {
  const [acik, setAcik] = useState(derinlik < 2);

  const eslesti = aramaMetni.trim()
    ? node.label.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      (node.altBaslik ?? '').toLowerCase().includes(aramaMetni.toLowerCase())
    : true;

  const cocukEslesti = aramaMetni.trim()
    ? node.children.some((c) => c.label.toLowerCase().includes(aramaMetni.toLowerCase()))
    : false;

  if (aramaMetni && !eslesti && !cocukEslesti) return null;

  const ikonBoyut = 'w-4 h-4';
  const ikon =
    node.tip === 'sirket' ? <Building2 className={ikonBoyut} /> :
    node.tip === 'departman' ? <Users className={ikonBoyut} /> :
    node.tip === 'pozisyon' ? <Briefcase className={ikonBoyut} /> :
    <User className={ikonBoyut} />;

  const seçildi = secilenId === node.id;

  return (
    <div className="relative">
      {derinlik > 0 && (
        <div
          className="absolute left-3 -top-3 w-0.5 bg-gray-200"
          style={{ height: 12 }}
        />
      )}

      <div
        onClick={() => { onSelect(node); if (node.children.length) setAcik((v) => !v); }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border ${
          seçildi
            ? 'border-indigo-400 bg-indigo-50 shadow-sm'
            : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
        } ${aramaMetni && eslesti ? 'bg-yellow-50 border-yellow-300' : ''}`}
        style={{ marginLeft: derinlik * 20 }}
      >
        {node.children.length > 0 ? (
          <span className="text-gray-400 flex-shrink-0 w-4">
            {acik ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
          style={{ backgroundColor: node.renk }}
        >
          {ikon}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${seçildi ? 'text-indigo-800' : 'text-gray-800'}`}>
            {node.label}
          </p>
          {node.altBaslik && node.tip !== 'personel' && (
            <p className="text-[10px] text-gray-400 truncate">{node.altBaslik}</p>
          )}
        </div>

        {node.tip === 'personel' && node.employee && (
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusRenk[node.employee.status] ?? 'bg-gray-300'}`} />
        )}

        {node.children.length > 0 && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {node.children.length}
          </span>
        )}
      </div>

      {acik && node.children.length > 0 && (
        <div className="relative">
          <div
            className="absolute bg-gray-200 w-0.5"
            style={{ left: derinlik * 20 + 12, top: 0, bottom: 8 }}
          />
          {node.children.map((child) => (
            <OrgKart
              key={child.id}
              node={child}
              derinlik={derinlik + 1}
              onSelect={onSelect}
              secilenId={secilenId}
              aramaMetni={aramaMetni}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Personel Detay Paneli ───────────────────────────────────────────────────
const PersonelDetay: React.FC<{ node: OrgNode | null }> = ({ node }) => {
  if (!node) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Detay görmek için bir öğeye tıklayın</p>
      </div>
    );
  }

  const emp = node.employee;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm"
          style={{ backgroundColor: node.renk }}
        >
          {node.label.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-800">{node.label}</p>
          <p className="text-xs text-gray-500 capitalize">{node.tip === 'personel' ? 'Personel' : node.tip === 'departman' ? 'Departman' : node.tip === 'pozisyon' ? 'Pozisyon' : 'Şirket'}</p>
        </div>
      </div>

      {emp && (
        <div className="space-y-2">
          {[
            { etiket: 'Departman', deger: emp.department },
            { etiket: 'Pozisyon', deger: emp.position },
            { etiket: 'E-posta', deger: emp.email },
            { etiket: 'Telefon', deger: emp.phone },
            { etiket: 'Durum', deger: emp.status === 'active' ? '✓ Aktif' : emp.status === 'on-leave' ? '⏸ İzinde' : '✗ Pasif' },
            { etiket: 'İşe Giriş', deger: emp.joinDate ?? emp.join_date },
          ].filter((r) => r.deger).map((row, i) => (
            <div key={i} className="flex justify-between text-sm border-b border-gray-100 pb-1">
              <span className="text-gray-500">{row.etiket}</span>
              <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{row.deger}</span>
            </div>
          ))}

          {emp.skills && emp.skills.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-gray-500 mb-1">Yetenekler</p>
              <div className="flex flex-wrap gap-1">
                {emp.skills.map((skill, i) => (
                  <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <p className="text-xs font-semibold text-gray-700 mb-1">Görev Tanımı Özeti:</p>
            <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-200 leading-relaxed">
              {getPositionSummary(emp.position)}
            </p>
          </div>
        </div>
      )}

      {node.tip === 'departman' && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <p className="text-sm text-gray-600 font-medium">{node.altBaslik}</p>
        </div>
      )}
    </div>
  );
};

// ─── ANA ORGANİZASYON ŞEMASI BİLEŞENİ ──────────────────────────────────────────
const OrganizasyonSemasi: React.FC<OrganizasyonSemasiProps> = ({ employees, companyName }) => {
  const [secilenNode, setSecilenNode] = useState<OrgNode | null>(null);
  const [aramaMetni, setAramaMetni] = useState('');
  const [gorunum, setGorunum] = useState<'dikey-oklu' | 'excel-agac' | 'yatay-agac' | 'dikey' | 'agac' | 'kart'>('dikey-oklu');
  const [zoomScale, setZoomScale] = useState(1);

  const tree = useMemo(() => buildOrgTree(employees), [employees]);

  // Departman -> Pozisyon -> Personel Hiyerarşik Yapısı
  const deptPosMap = useMemo(() => {
    const map = new Map<string, Map<string, Employee[]>>();
    for (const emp of employees) {
      const dept = emp.department || 'Belirsiz';
      const pos = emp.position || 'Personel';
      if (!map.has(dept)) map.set(dept, new Map());
      const posMap = map.get(dept)!;
      if (!posMap.has(pos)) posMap.set(pos, []);
      posMap.get(pos)!.push(emp);
    }
    return map;
  }, [employees]);

  // ─── Dynamic Hierarchical Tree (Bayi Sahibi ➔ Genel Müdür ➔ Departman Müdürleri ➔ Çalışanlar)
  const dynamicTree = useMemo(() => {
    const level0Emps: Employee[] = [];
    const level05Emps: Employee[] = [];
    const level1Emps: Employee[] = [];
    const level2Emps: Employee[] = [];
    const level3Emps: Employee[] = [];

    for (const emp of employees) {
      const lvl = classifyEmployeeLevel(emp);
      if (lvl === 0) level0Emps.push(emp);
      else if (lvl === 0.5) level05Emps.push(emp);
      else if (lvl === 1) level1Emps.push(emp);
      else if (lvl === 3) level3Emps.push(emp);
      else level2Emps.push(emp);
    }

    const matchesSearch = (e: Employee) => {
      if (!aramaMetni.trim()) return true;
      const q = aramaMetni.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        (e.position || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q)
      );
    };

    const deptGroupMap = new Map<
      string,
      {
        manager?: Employee;
        specialists: Employee[];
        assistants: Employee[];
      }
    >();

    for (const emp of employees) {
      if (!matchesSearch(emp)) continue;
      const dept = emp.department || 'Genel Yönetim';
      if (!deptGroupMap.has(dept)) {
        deptGroupMap.set(dept, { specialists: [], assistants: [] });
      }
      const g = deptGroupMap.get(dept)!;
      const lvl = classifyEmployeeLevel(emp);
      if (lvl === 1 && !g.manager) {
        g.manager = emp;
      } else if (lvl === 3) {
        g.assistants.push(emp);
      } else if (lvl !== 0 && lvl !== 0.5) {
        g.specialists.push(emp);
      }
    }

    return {
      topOwners: level0Emps.filter(matchesSearch),
      generalManagers: level05Emps.filter(matchesSearch),
      departments: Array.from(deptGroupMap.entries()).map(([deptName, group]) => ({
        name: deptName,
        theme: getDeptTheme(deptName),
        manager: group.manager,
        specialists: group.specialists,
        assistants: group.assistants,
        total: (group.manager ? 1 : 0) + group.specialists.length + group.assistants.length,
      })),
    };
  }, [employees, aramaMetni]);

  const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ─── PDF / Yazdırma Çıktısı ────────────────────────────────────────────────
  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>Humanius HRMS - Yukarıdan Aşağıya Oklu Hiyerarşik Şema</title>
        <style>
          @page { size: A4 landscape; margin: 5mm 6mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 6px; background: #ffffff; width: 100%; }
          
          .audit-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9px; }
          .audit-table td { border: 1px solid #cbd5e1; padding: 4px 8px; }
          .audit-bg { background: #f8fafc; font-weight: 600; color: #475569; }

          /* TOP BOXES */
          .top-wrapper { text-align: center; margin-bottom: 4px; }
          .box-owner { display: inline-block; background: #0f172a; color: white; padding: 6px 20px; border-radius: 8px; font-weight: 800; font-size: 11px; border: 2px solid #000; }
          .box-gm { display: inline-block; background: #1e3a8a; color: white; padding: 6px 20px; border-radius: 8px; font-weight: 800; font-size: 10.5px; border: 2px solid #1d4ed8; }

          .down-arrow-stem { text-align: center; font-size: 14px; color: #2563eb; font-weight: 900; line-height: 1; margin: 2px 0; }

          /* VERTICAL FLOW COLUMNS (DEPARTMENTS SIDE BY SIDE) */
          .dept-columns-flex { display: flex; flex-direction: row; align-items: flex-start; gap: 8px; justify-content: center; width: 100%; page-break-inside: avoid; }
          .dept-column { flex: 1; border: 1.5px solid #94a3b8; border-radius: 8px; background: #ffffff; padding: 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; page-break-inside: avoid; }
          
          .box-node { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 6px; font-size: 8px; text-align: center; background: #ffffff; }
          .box-mgr-pdf { border-color: #2563eb; background: #eff6ff; border-width: 1.5px; }
          .box-emp-pdf { border-color: #475569; background: #f8fafc; }
          .box-ast-pdf { border-color: #9333ea; background: #faf5ff; }

          /* STAFF SECTION BELOW */
          .staff-section { page-break-before: always; break-before: page; margin-top: 0; padding-top: 12px; border-top: 2px solid #0f172a; }
          .staff-title-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; page-break-after: avoid; break-after: avoid; }
          .staff-title { font-size: 10.5px; font-weight: 800; color: #0f172a; }
          .staff-sub { font-size: 8.5px; color: #64748b; }

          .staff-flex-container { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; }
          .staff-card { width: calc(33.333% - 4px); border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background: #ffffff; page-break-inside: avoid; display: flex; flex-direction: column; justify-content: space-between; }
          .staff-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
          .staff-name { font-weight: 800; font-size: 9px; color: #0f172a; }
          .staff-dept { font-size: 7.5px; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; color: #475569; font-weight: 600; }
          .staff-pos { font-weight: 700; font-size: 8.5px; color: #1d4ed8; margin-bottom: 3px; }
          .staff-desc { font-size: 8px; color: #334155; background: #f8fafc; padding: 4px; border-radius: 4px; border: 1px solid #e2e8f0; line-height: 1.25; }

          .legal-note { margin-top: 10px; padding: 5px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 8px; color: #475569; line-height: 1.2; page-break-inside: avoid; }
          .sig-container { display: flex; justify-content: space-between; margin-top: 10px; padding: 0 40px; page-break-inside: avoid; }
          .sig-box { text-align: center; width: 170px; font-size: 9px; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 3px; font-weight: 600; }
          .footer { margin-top: 8px; padding-top: 4px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 7.5px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <table class="audit-table">
          <tr>
            <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:white;">
              <div style="font-size:14px; font-weight:900;">HUMANİUS HRMS</div>
              <div style="font-size:7px; font-weight:600; opacity:0.9;">İK Yönetim Sistemleri</div>
            </td>
            <td rowspan="2" style="width:50%; text-align:center; vertical-align:middle;">
              <div style="font-size:13px; font-weight:800; color:#0f172a;">YUKARIDAN AŞAĞIYA OKLU HİYERARŞİK ŞEMA</div>
              <div style="font-size:8.5px; color:#64748b; margin-top:1px;">Bayi Sahibi ➔ Genel Müdür ➔ Departman Müdürleri ➔ Çalışanlar ➔ Stajyerler</div>
            </td>
            <td class="audit-bg" style="width:15%;">Doküman No:</td>
            <td style="width:15%; font-weight:600; color:#1e293b;">FR-IK-012</td>
          </tr>
          <tr>
            <td class="audit-bg">Yayın / Rev. Tarihi:</td>
            <td style="font-weight:600; color:#1e293b;">${todayStr}</td>
          </tr>
        </table>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:9px; color:#475569;">
          <span><strong>Kurum:</strong> ${companyName || (employees.length > 0 && (employees[0] as any).company ? (employees[0] as any).company : 'Kurumsal Şirket')} / Humanius HRMS</span>
          <span><strong>Kadro Yapısı:</strong> ${employees.length} Çalışan · ${dynamicTree.departments.length} Departman</span>
        </div>

        <!-- BAYİ SAHİBİ -->
        <div class="top-wrapper">
          <div class="box-owner">
            👑 BAYİ SAHİBİ: ${dynamicTree.topOwners.length > 0 ? dynamicTree.topOwners.map(l => l.name).join(' & ') : 'Kurumsal Şirket Sahibi'}
          </div>
        </div>

        <div class="down-arrow-stem">↓</div>

        <!-- GENEL MÜDÜR (VARSA) -->
        <div class="top-wrapper">
          <div class="box-gm">
            🏢 GENEL MÜDÜR: ${dynamicTree.generalManagers.length > 0 ? dynamicTree.generalManagers.map(gm => `${gm.name} (${gm.position})`).join(' & ') : 'Genel Müdürlük / Şirket Yönetimi'}
          </div>
        </div>

        <div class="down-arrow-stem">↓</div>

        <!-- DEPARTMAN SÜTUNLARI (YUKARIDAN AŞAĞIYA AKIŞ) -->
        <div class="dept-columns-flex">
          ${dynamicTree.departments.map(dept => `
            <div class="dept-column">
              <!-- MÜDÜR KUTUSU -->
              <div class="box-node box-mgr-pdf">
                <div style="font-weight:800; color:#1e40af; font-size:8px;">🏢 ${dept.name}</div>
                <div style="font-weight:800; color:#0f172a; font-size:9px; margin-top:2px;">
                  ${dept.manager ? dept.manager.name : 'Müdür Atanmadı'}
                </div>
                <div style="font-size:7.5px; color:#2563eb; font-weight:700;">${dept.manager ? dept.manager.position : ''}</div>
              </div>

              <div class="down-arrow-stem" style="font-size:10px;">↓</div>

              <!-- DEPARTMAN ÇALIŞANLARI KUTUSU -->
              <div class="box-node box-emp-pdf">
                <div style="font-weight:800; color:#475569; font-size:7.5px; margin-bottom:3px;">
                  👥 ${dept.name} Çalışanları (${dept.specialists.length}):
                </div>
                ${dept.specialists.length > 0 ? dept.specialists.map(s => `
                  <div style="border-bottom:1px solid #e2e8f0; padding:2px 0;">
                    <div style="font-weight:700; color:#0f172a;">👤 ${s.name}</div>
                    <div style="color:#2563eb; font-size:7.5px;">${s.position}</div>
                  </div>
                `).join('') : '<div style="font-size:7.5px; color:#94a3b8; font-style:italic;">Müdüre bağlı</div>'}
              </div>

              ${dept.assistants.length > 0 ? `
                <div class="down-arrow-stem" style="font-size:10px;">↓</div>

                <!-- STAJYER & ASİSTAN KUTUSU -->
                <div class="box-node box-ast-pdf">
                  <div style="font-weight:800; color:#7e22ce; font-size:7.5px; margin-bottom:2px;">
                    🎓 Stajyer & Yardımcılar:
                  </div>
                  ${dept.assistants.map(a => `
                    <div style="font-weight:700; color:#581c87;">🎓 ${a.name}</div>
                    <div style="color:#9333ea; font-size:7px;">${a.position}</div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- SÜTUNLAR BİTTİKTEN SONRA: KADRO & GÖREV TANIMLARI KUTULARI -->
        <div class="staff-section">
          <div class="staff-title-bar">
            <span class="staff-title">👥 KURUMSAL KADRO & POZİSYON GÖREV TANIMLARI DETAY LİSTESİ</span>
            <span class="staff-sub">${employees.length} Kayıtlı Çalışan</span>
          </div>

          <div class="staff-flex-container">
            ${Array.from(deptPosMap.entries()).flatMap(([dept, posMap]) =>
              Array.from(posMap.entries()).flatMap(([pos, emps]) =>
                emps.map(e => `
                  <div class="staff-card">
                    <div>
                      <div class="staff-header">
                        <span class="staff-name">👤 ${e.name}</span>
                        <span class="staff-dept">${dept}</span>
                      </div>
                      <div class="staff-pos">💼 ${pos}</div>
                      <div class="staff-desc">
                        <strong>Görev Tanımı:</strong> ${getPositionSummary(pos)}
                      </div>
                    </div>
                  </div>
                `)
              )
            ).join('')}
          </div>
        </div>

        <div class="legal-note">
          <strong>Resmi Beyan & Uyumluluk:</strong> İşbu Kurumsal Organizasyon Şeması Belgesi, 4857 sayılı İş Kanunu, 6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve ISO 9001 Kalite Yönetim Sistemi standartlarına uygun tanzim edilmiş resmi evraktır.
        </div>

        <div class="sig-container">
          <div class="sig-box">
            Hazırlayan & Kontrol Eden<br>
            <div style="font-weight:normal; font-size:8.5px; color:#64748b; margin-top:1px;">İnsan Kaynakları Yöneticisi</div>
            <div style="margin-top:14px; font-size:8px; color:#cbd5e1;">İmza / Tarih</div>
          </div>
          <div class="sig-box">
            Onaylayan & Kaşe<br>
            <div style="font-weight:normal; font-size:8.5px; color:#64748b; margin-top:1px;">Genel Müdür / Şirket Yöneticisi</div>
            <div style="margin-top:14px; font-size:8px; color:#cbd5e1;">İmza / Kaşe / Tarih</div>
          </div>
        </div>

        <div class="footer">
          <span>Humanius İnsan Kaynakları Yönetim Sistemi © ${new Date().getFullYear()}</span>
          <span>Gizli ve Kuruma Özel Belge · Otomatik Üretilmiştir.</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-blue-600" />
            Organizasyon Şeması
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {employees.length} kayıtlı personel · {dynamicTree.departments.length} departman · Yukarıdan Aşağıya Oklu Bağlantı Ağacı
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
            title="Organizasyon Şemasını PDF Olarak İndir / Yazdır"
          >
            <Printer className="w-4 h-4" />
            PDF İndir / Yazdır
          </button>

          <div className="flex bg-gray-100 p-1 rounded-xl gap-1 border border-gray-200 flex-wrap">
            {[
              { id: 'dikey-oklu', label: '🎯 Yukarıdan Aşağıya Oklu Ağaç (YENİ)' },
              { id: 'excel-agac', label: '📊 Yatay Excel Kutuları' },
              { id: 'yatay-agac', label: '🌿 Koyu Görsel Şema' },
              { id: 'dikey', label: '🏢 Departman Görünümü' },
              { id: 'agac', label: '🌲 Ağaç Liste' },
              { id: 'kart', label: '📇 Kadro Kartları' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setGorunum(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  gorunum === tab.id
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── ARAMA VE FİLTRELEME ─────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={aramaMetni}
          onChange={(e) => setAramaMetni(e.target.value)}
          placeholder="İsim, pozisyon veya departman ara (ör. Bayi Sahibi, Genel Müdür, Satış Müdürü, Uzman, Stajyer...)"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all shadow-xs"
        />
        {aramaMetni && (
          <button
            onClick={() => setAramaMetni('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 px-2 py-1 rounded-md"
          >
            Temizle
          </button>
        )}
      </div>

      {/* ─── 1. GÖRÜNÜM: YUKARIDAN AŞAĞIYA OKLU AĞAÇ (EXACT USER SPEC) ─────────── */}
      {gorunum === 'dikey-oklu' && (
        <div className="bg-white rounded-3xl border border-slate-300 p-6 space-y-6 overflow-x-auto shadow-md relative">
          {/* Controls Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-xs font-bold tracking-wide text-slate-700 uppercase">
                Hiyerarşik Bağlantı Akışı: Bayi Sahibi ➔ Genel Müdür ➔ Departman Müdürleri ➔ Çalışanlar ➔ Stajyerler
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomScale((prev) => Math.max(0.7, prev - 0.1))}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300"
                title="Küçült"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-mono font-bold text-slate-600 px-2">%{Math.round(zoomScale * 100)}</span>
              <button
                onClick={() => setZoomScale((prev) => Math.min(1.4, prev + 0.1))}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300"
                title="Büyüt"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoomScale(1)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300"
                title="Sıfırla"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* CANVAS WRAPPER */}
          <div
            className="transition-transform origin-top-left space-y-4"
            style={{ transform: `scale(${zoomScale})` }}
          >
            {/* LEVEL 0: BAYİ SAHİBİ (EN ÜST KUTU) */}
            <div className="flex justify-center">
              <div className="bg-slate-900 text-white border-2 border-slate-950 rounded-2xl p-4 text-center min-w-[340px] shadow-lg">
                <div className="flex items-center justify-center gap-2 font-black text-base">
                  <Crown className="w-5 h-5 text-amber-400" />
                  {dynamicTree.topOwners.length > 0
                    ? dynamicTree.topOwners.map(l => l.name).join(' & ')
                    : (companyName ? `${companyName} - Bayi Sahibi` : 'Bayi Sahibi')}
                </div>
                <div className="text-xs font-bold text-slate-300 mt-1">
                  {dynamicTree.topOwners.length > 0
                    ? dynamicTree.topOwners.map(l => l.position || 'Bayi Sahibi').join(' · ')
                    : 'Kurumsal Şirket Sahibi / Yönetim'}
                </div>
                <div className="mt-2 text-[11px] bg-slate-800 text-amber-300 font-bold px-3 py-1 rounded-lg border border-slate-700 inline-block">
                  En Üst Yönetici Makamı ({employees.length} Bağlı Personel)
                </div>
              </div>
            </div>

            {/* AŞAĞI OK (BAYİ SAHİBİ ➔ GENEL MÜDÜR) */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="w-0.5 h-4 bg-blue-600" />
              <ArrowDown className="w-5 h-5 text-blue-600 font-black -mt-1 animate-bounce" />
            </div>

            {/* LEVEL 0.5: GENEL MÜDÜR (BAYİ SAHİBİNİN ALTINDA) */}
            <div className="flex justify-center">
              <div className="bg-blue-900 text-white border-2 border-blue-950 rounded-2xl p-3.5 text-center min-w-[320px] shadow-md">
                <div className="flex items-center justify-center gap-2 font-black text-sm">
                  <Building2 className="w-4 h-4 text-blue-300" />
                  {dynamicTree.generalManagers.length > 0
                    ? dynamicTree.generalManagers.map(gm => `${gm.name} (${gm.position})`).join(' & ')
                    : 'Genel Müdürlük / Şirket Genel Yönetimi'}
                </div>
                <div className="text-[11px] text-blue-200 mt-0.5 font-medium">
                  Tüm Departman Müdürleri Genel Müdüre Bağlıdır
                </div>
              </div>
            </div>

            {/* AŞAĞI OK & YATAY DALLANMA ÇİZGİSİ (GENEL MÜDÜR ➔ DEPARTMAN MÜDÜRLERİ) */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="w-0.5 h-4 bg-blue-600" />
              <ArrowDown className="w-5 h-5 text-blue-600 font-black -mt-1" />
            </div>

            {/* DEPARTMAN SÜTUNLARI (YAN YANA SÜTUNLAR, YUKARIDAN AŞAĞIYA AKIŞ) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-start min-w-[960px] pt-2">
              {dynamicTree.departments.map((dept) => (
                <div
                  key={dept.name}
                  className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-3.5 flex flex-col items-center gap-3 shadow-sm hover:border-slate-400 transition-colors"
                >
                  {/* 1. MÜDÜR KUTUSU (GENEL MÜDÜRE BAĞLI) */}
                  <div className="w-full bg-blue-50 border-2 border-blue-600 rounded-xl p-3 text-center shadow-xs">
                    <div className="text-[10px] font-black uppercase text-blue-700 tracking-wider flex items-center justify-center gap-1 mb-1">
                      <Award className="w-3.5 h-3.5" />
                      {dept.name} Müdürü
                    </div>
                    {dept.manager ? (
                      <div
                        onClick={() =>
                          setSecilenNode({
                            id: dept.manager!.id,
                            label: dept.manager!.name,
                            tip: 'personel',
                            altBaslik: dept.manager!.position,
                            renk: dept.theme.hex,
                            children: [],
                            employee: dept.manager,
                          })
                        }
                        className="cursor-pointer"
                      >
                        <p className="font-extrabold text-sm text-slate-900">{dept.manager.name}</p>
                        <p className="text-xs font-bold text-blue-700 mt-0.5">{dept.manager.position}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-xs text-slate-700">{dept.name} Yöneticisi</p>
                        <p className="text-[10px] text-slate-400 italic">Müdür Atanmadı</p>
                      </div>
                    )}
                  </div>

                  {/* AŞAĞI OK (MÜDÜR ➔ ÇALIŞANLAR) */}
                  <div className="flex flex-col items-center text-blue-600 font-bold -my-1">
                    <div className="w-0.5 h-3 bg-blue-600" />
                    <ArrowDown className="w-4 h-4 text-blue-600 font-black -mt-1" />
                  </div>

                  {/* 2. DEPARTMAN ÇALIŞANLARI KUTUSU (MÜDÜRE BAĞLI) */}
                  <div className="w-full bg-white border border-slate-300 rounded-xl p-3 text-center space-y-2 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {dept.name} Çalışanları ({dept.specialists.length})
                    </div>

                    {dept.specialists.length > 0 ? (
                      dept.specialists.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() =>
                            setSecilenNode({
                              id: emp.id,
                              label: emp.name,
                              tip: 'personel',
                              altBaslik: emp.position,
                              renk: dept.theme.hex,
                              children: [],
                              employee: emp,
                            })
                          }
                          className="bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-lg p-2 cursor-pointer transition-all hover:bg-blue-50/40 text-left"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 truncate">{emp.name}</span>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusRenk[emp.status] || 'bg-gray-400'}`} />
                          </div>
                          <p className="text-[10px] font-semibold text-blue-600 truncate mt-0.5">{emp.position}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-slate-400 italic py-1">
                        Doğrudan müdüre bağlı çalışan yok.
                      </div>
                    )}
                  </div>

                  {/* AŞAĞI OK & 3. STAJYERLER / ASİSTANLAR (VARSA) */}
                  {dept.assistants.length > 0 && (
                    <>
                      <div className="flex flex-col items-center text-purple-600 font-bold -my-1">
                        <div className="w-0.5 h-3 bg-purple-600" />
                        <ArrowDown className="w-4 h-4 text-purple-600 font-black -mt-1" />
                      </div>

                      <div className="w-full bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-center space-y-2 shadow-2xs">
                        <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider border-b border-purple-100 pb-1 flex items-center justify-center gap-1">
                          🎓 Stajyer & Yardımcılar ({dept.assistants.length})
                        </div>

                        {dept.assistants.map((emp) => (
                          <div
                            key={emp.id}
                            onClick={() =>
                              setSecilenNode({
                                id: emp.id,
                                label: emp.name,
                                tip: 'personel',
                                altBaslik: emp.position,
                                renk: dept.theme.hex,
                                children: [],
                                employee: emp,
                              })
                            }
                            className="bg-white border border-purple-300 hover:border-purple-500 rounded-lg p-2 cursor-pointer transition-all text-left"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-purple-950 truncate">{emp.name}</span>
                              <CornerDownRight className="w-3 h-3 text-purple-600" />
                            </div>
                            <p className="text-[10px] font-bold text-purple-700 truncate mt-0.5">{emp.position}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. GÖRÜNÜM: YATAY EXCEL KUTULARI ──────────────────────────────── */}
      {gorunum === 'excel-agac' && (
        <div className="bg-white rounded-3xl border border-slate-300 p-6 space-y-6 overflow-x-auto shadow-md relative">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-xs font-bold tracking-wide text-slate-700 uppercase">
                Yatay Kutu Akışı: Bayi Sahibi ➔ Müdürler ➔ Departman Çalışanları
              </span>
            </div>
          </div>

          <div className="space-y-4 min-w-[920px]">
            {dynamicTree.departments.map((dept) => (
              <div
                key={dept.name}
                className="border-2 border-slate-300 rounded-2xl p-4 bg-slate-50/60 shadow-xs"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: dept.theme.hex }} />
                    <h3 className="font-extrabold text-sm text-slate-900">
                      {dept.name} Departmanı
                    </h3>
                  </div>
                  <span className="text-xs font-bold bg-white border border-slate-300 px-3 py-1 rounded-lg text-slate-700">
                    Kadro: {dept.total} Personel
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="bg-blue-50 border-2 border-blue-600 rounded-xl p-3 min-w-[220px]">
                    <div className="text-[10px] font-black uppercase text-blue-700 tracking-wider flex items-center gap-1 mb-1">
                      <Award className="w-3.5 h-3.5" />
                      Departman Müdürü:
                    </div>
                    {dept.manager ? (
                      <div>
                        <p className="font-extrabold text-sm text-slate-900">{dept.manager.name}</p>
                        <p className="text-xs font-bold text-blue-700 mt-0.5">{dept.manager.position}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-xs text-slate-600">{dept.name} Yöneticisi</p>
                        <p className="text-[11px] text-slate-400 italic">Müdür Atanmadı</p>
                      </div>
                    )}
                  </div>

                  <div className="text-blue-600 font-extrabold flex items-center">
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  <div className="flex-1 flex flex-wrap gap-2.5 items-center bg-white border border-slate-300 rounded-xl p-3 shadow-xs">
                    {dept.specialists.map((emp) => (
                      <div
                        key={emp.id}
                        className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 min-w-[160px]"
                      >
                        <p className="font-bold text-xs text-slate-900">{emp.name}</p>
                        <p className="text-[11px] font-semibold text-blue-600 truncate mt-0.5">{emp.position}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 3. GÖRÜNÜM: KOYU GÖRSEL YATAY AĞAÇ ────────────────────────────── */}
      {gorunum === 'yatay-agac' && (
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 space-y-6 overflow-x-auto shadow-2xl relative">
          <div className="space-y-4 min-w-[900px]">
            {dynamicTree.departments.map((dept) => (
              <div
                key={dept.name}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-stretch gap-3 shadow-lg"
              >
                <div
                  className="w-64 rounded-xl p-3.5 flex flex-col justify-between border-l-4 shadow-md flex-shrink-0 bg-slate-900/90"
                  style={{ borderLeftColor: dept.theme.hex }}
                >
                  <div>
                    <span className="font-extrabold text-xs tracking-wide uppercase text-slate-200">
                      🏢 {dept.name}
                    </span>
                    <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 mt-2">
                      <p className="font-bold text-sm text-white">{dept.manager ? dept.manager.name : 'Müdür Atanmadı'}</p>
                      <p className="text-xs text-indigo-300 font-medium truncate">{dept.manager ? dept.manager.position : ''}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-indigo-400 px-1">
                  <ArrowRight className="w-6 h-6" />
                </div>

                <div className="flex-1 bg-slate-900/60 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-center gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {dept.specialists.map((emp) => (
                      <div key={emp.id} className="bg-slate-800 border border-slate-700 rounded-lg p-2.5">
                        <p className="font-bold text-xs text-slate-200">{emp.name}</p>
                        <p className="text-[11px] text-indigo-400 font-medium truncate">{emp.position}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. GÖRÜNÜM: DİKEY DEPARTMAN ŞEMASI ─────────────────────────────── */}
      {gorunum === 'dikey' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-8 overflow-x-auto shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-8 py-3.5 rounded-2xl shadow-md border border-blue-800 text-center">
                <div className="flex items-center justify-center gap-2 font-extrabold text-base">
                  <Building2 className="w-5 h-5 text-amber-300" />
                  {companyName || 'Şirket Genel Yönetim Kurulu'}
                </div>
                <div className="text-xs text-blue-100 mt-0.5 font-medium">
                  {employees.length} Çalışan · {deptPosMap.size} Departman
                </div>
              </div>
            </div>

            <div className="w-0.5 h-5 bg-blue-300 mx-auto" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
              {Array.from(deptPosMap.entries()).map(([dept, posMap]) => (
                <div key={dept} className="bg-slate-50 rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 text-white font-bold text-sm flex items-center justify-between shadow-sm" style={{ backgroundColor: getDeptTheme(dept).hex }}>
                    <span className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-4 h-4" />
                      {dept}
                    </span>
                    <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap">
                      {Array.from(posMap.values()).flat().length} kişi
                    </span>
                  </div>

                  <div className="p-3 space-y-2 bg-white">
                    {Array.from(posMap.entries()).map(([pos, emps]) => (
                      <div key={pos} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                        <span className="flex items-center gap-2 text-xs font-bold text-slate-800 truncate">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                          <span className="truncate">{pos}</span>
                        </span>
                        <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-full whitespace-nowrap ml-2">
                          {emps.length} kişi
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. GÖRÜNÜM: AĞAÇ LİSTE ────────────────────────────────────────────── */}
      {gorunum === 'agac' && (
        <div className="flex gap-5">
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 overflow-y-auto max-h-[calc(100vh-280px)]">
            <div
              onClick={() => setSecilenNode(null)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-50 border border-transparent hover:border-gray-200 mb-2"
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Şirket Kök Ağacı</p>
                <p className="text-[10px] text-gray-400">{employees.length} toplam personel</p>
              </div>
            </div>

            {tree.map((node) => (
              <OrgKart
                key={node.id}
                node={node}
                derinlik={1}
                onSelect={setSecilenNode}
                secilenId={secilenNode?.id ?? null}
                aramaMetni={aramaMetni}
              />
            ))}
          </div>

          <div className="w-80 flex-shrink-0">
            <PersonelDetay node={secilenNode} />
          </div>
        </div>
      )}

      {/* ─── 6. GÖRÜNÜM: KADRO KARTLARI GRİDİ ──────────────────────────────────── */}
      {gorunum === 'kart' && (
        <div className="space-y-6">
          {Array.from(deptPosMap.entries()).map(([dept, posMap]) => (
            <div key={dept}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getDeptTheme(dept).hex }}
                />
                <p className="font-semibold text-gray-700 text-sm">{dept}</p>
                <span className="text-xs text-gray-400">({Array.from(posMap.values()).flat().length} kişi)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from(posMap.values()).flat().map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => setSecilenNode({
                      id: emp.id, label: emp.name, tip: 'personel',
                      altBaslik: emp.position, renk: getDeptTheme(dept).hex, children: [], employee: emp,
                    })}
                    className={`bg-white rounded-2xl border p-3.5 cursor-pointer hover:shadow-md transition-all ${
                      secilenNode?.id === emp.id ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-gray-200'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base mb-2 mx-auto shadow-sm"
                      style={{ backgroundColor: getDeptTheme(dept).hex }}
                    >
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-bold text-gray-900 text-center truncate">{emp.name}</p>
                    <p className="text-[11px] text-blue-600 font-medium text-center truncate">{emp.position}</p>
                    <div className="flex justify-center items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                      <div className={`w-2 h-2 rounded-full ${statusRenk[emp.status] ?? 'bg-gray-300'}`} />
                      <span className="text-[10px] text-gray-500 capitalize">{emp.status === 'active' ? 'Aktif' : 'İzinde'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── DURUM VE MANTIK REHBERİ ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-xs font-bold text-gray-700">Durum Göstergesi:</p>
          {[
            { renk: 'bg-emerald-500', etiket: 'Aktif Çalışan' },
            { renk: 'bg-amber-500', etiket: 'İzinde' },
            { renk: 'bg-gray-400', etiket: 'Pasif' },
          ].map((item) => (
            <div key={item.etiket} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${item.renk}`} />
              <span className="text-xs text-gray-600 font-medium">{item.etiket}</span>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Net Hiyerarşi: <strong>Bayi Sahibi ➔ Genel Müdür ➔ Departman Müdürleri ➔ Çalışanlar ➔ Stajyerler</strong> dikey oklarla bağlıdır.</span>
        </div>
      </div>
    </div>
  );
};

export default OrganizasyonSemasi;
