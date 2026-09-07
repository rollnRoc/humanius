import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, User, Users, Building2, Briefcase, Search, Printer, FileText, Eye, X, Layers, Check } from 'lucide-react';
import type { Employee } from '../types';
import { escapeHtml } from '../utils/sanitize';

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
  companies?: (string | { id: string; name: string })[];
  selectedCompany?: string;
  onCompanyChange?: (company: string) => void;
  userCompanyId?: string;
}

export function getEmployeeRank(emp: Employee): number {
  const pos = (emp.position || '').toLowerCase();
  const lvl = (emp.level || '').toLowerCase();

  // Rank 0: Genel Müdür / CEO / Şirket Sahibi / Kurucu / Yönetim Kurulu
  if (
    pos.includes('genel müdür') || pos.includes('genel mudur') ||
    pos.includes('ceo') || pos.includes('sahibi') ||
    pos.includes('kurucu') || pos.includes('yönetim kurulu') ||
    pos.includes('genel koordinatör') || lvl === 'executive'
  ) {
    return 0;
  }

  // Rank 1: Müdürler / Direktörler / Yöneticiler (excl. Yardımcı/Asistan)
  if (
    !pos.includes('yardımcı') && !pos.includes('yardimci') && !pos.includes('asistan') &&
    (pos.includes('müdür') || pos.includes('mudur') || pos.includes('direktör') || pos.includes('direktor') || pos.includes('yönetici') || pos.includes('yonetici') || pos.includes('head') || lvl === 'director' || lvl === 'manager')
  ) {
    return 1;
  }

  // Rank 2: Müdür Yardımcıları / Takım Liderleri / Supervisors
  if (
    pos.includes('müdür yardımcısı') || pos.includes('mudur yardimcisi') || pos.includes('yönetici yardımcısı') ||
    pos.includes('lider') || pos.includes('lead') || pos.includes('supervisor') || pos.includes('kıdemli') || pos.includes('senior')
  ) {
    return 2;
  }

  // Rank 4: Yardımcılar / Asistanlar / Stajyerler / Juniorlar
  if (
    pos.includes('asistan') || pos.includes('stajyer') || pos.includes('junior') || pos.includes('destek') ||
    pos.includes('yardımcı') || pos.includes('yardimci')
  ) {
    return 4;
  }

  // Rank 3: Standart Departman Çalışanları / Uzmanlar / Mühendisler
  return 3;
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

  const DEPT_COLORS: Record<string, string> = {
    'İnsan Kaynakları': '#6366f1',
    'Muhasebe': '#f59e0b',
    'Mühendislik': '#10b981',
    'Satış': '#3b82f6',
    'Pazarlama': '#ec4899',
    'Operasyon': '#8b5cf6',
    'Hukuk': '#ef4444',
    'IT': '#14b8a6',
  };

  const getColor = (dept: string) => DEPT_COLORS[dept] ?? '#64748b';

  return Array.from(deptMap.entries()).map(([dept, posMap]) => ({
    id: `dept-${dept}`,
    label: dept,
    tip: 'departman',
    altBaslik: `${Array.from(posMap.values()).flat().length} çalışan`,
    renk: getColor(dept),
    children: Array.from(posMap.entries()).map(([pos, emps]) => ({
      id: `pos-${dept}-${pos}`,
      label: pos,
      tip: 'pozisyon',
      altBaslik: `${emps.length} kişi`,
      renk: getColor(dept),
      children: emps.map((emp) => ({
        id: emp.id,
        label: emp.name,
        tip: 'personel',
        altBaslik: emp.email || '',
        renk: getColor(dept),
        children: [],
        employee: emp,
      })),
    })),
  }));
}

const statusRenk: Record<string, string> = {
  active: 'bg-green-400',
  inactive: 'bg-gray-300',
  'on-leave': 'bg-yellow-400',
};

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
  const levelDisplay = emp?.level && emp.level !== 'Junior' ? emp.level : undefined;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
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
            { etiket: 'Şirket', deger: emp.company },
            { etiket: 'Departman', deger: emp.department },
            { etiket: 'Pozisyon', deger: emp.position },
            { etiket: 'Seviye', deger: levelDisplay },
            { etiket: 'E-posta', deger: emp.email },
            { etiket: 'Telefon', deger: emp.phone },
            { etiket: 'Durum', deger: emp.status === 'active' ? '✓ Aktif' : emp.status === 'on-leave' ? '⏸ İzinde' : '✗ Pasif' },
            { etiket: 'İşe Giriş', deger: emp.joinDate ?? emp.join_date },
          ].filter((r) => r.deger).map((row, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-500">{row.etiket}</span>
              <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{row.deger}</span>
            </div>
          ))}

          {emp.skills && emp.skills.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Yetenekler</p>
              <div className="flex flex-wrap gap-1">
                {emp.skills.map((skill, i) => (
                  <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {node.tip === 'departman' && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-sm text-gray-600">{node.altBaslik}</p>
        </div>
      )}
    </div>
  );
};

const OrganizasyonSemasi: React.FC<OrganizasyonSemasiProps> = ({
  employees,
  companyName,
  companies,
  selectedCompany,
  onCompanyChange,
  userCompanyId
}) => {
  const [secilenNode, setSecilenNode] = useState<OrgNode | null>(null);
  const [aramaMetni, setAramaMetni] = useState('');
  const [gorunum, setGorunum] = useState<'agac' | 'kart'>('agac');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  
  // PDF format ve sayfa ayarları (Aşağıya uzamayı önleyen çoklu mod)
  const [pdfFormat, setPdfFormat] = useState<'agac-fit' | 'departman-sayfali' | 'kadro-liste'>('agac-fit');
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');

  // 1. Şirket Ayrıştırma & İzolasyonu (Şirket verileri ASLA birbirine karışamaz!)
  const distinctCompanies = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    
    // Çalışanlar üzerinden şirketleri topla
    for (const emp of employees) {
      const cName = (emp.company || '').trim() || 'Ana Şirket';
      const cId = emp.company_id || cName;
      if (!map.has(cId)) {
        map.set(cId, { id: cId, name: cName, count: 0 });
      }
      map.get(cId)!.count++;
    }

    // Dışarıdan gelen şirket listesini de ekle
    if (companies && Array.isArray(companies)) {
      for (const comp of companies) {
        const cName = typeof comp === 'string' ? comp : comp.name;
        const cId = typeof comp === 'string' ? comp : comp.id;
        if (cName && cName !== 'all' && !map.has(cId) && !map.has(cName)) {
          map.set(cId, { id: cId, name: cName, count: 0 });
        }
      }
    }

    return Array.from(map.values());
  }, [employees, companies]);

  // Aktif şirket seçimi
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    if (selectedCompany && selectedCompany !== 'all') {
      const found = distinctCompanies.find(c => c.id === selectedCompany || c.name.toLowerCase() === selectedCompany.toLowerCase());
      if (found) return found.id;
    }
    if (userCompanyId) {
      const found = distinctCompanies.find(c => c.id === userCompanyId);
      if (found) return found.id;
    }
    return distinctCompanies[0]?.id || distinctCompanies[0]?.name || 'default';
  });

  useEffect(() => {
    if (selectedCompany && selectedCompany !== 'all') {
      const found = distinctCompanies.find(c => c.id === selectedCompany || c.name.toLowerCase() === selectedCompany.toLowerCase());
      if (found && found.id !== activeCompanyId) {
        setActiveCompanyId(found.id);
      }
    }
  }, [selectedCompany, distinctCompanies]);

  // YALNIZCA SEÇİLİ ŞİRKETİN ÇALIŞANLARI — Başka şirketin çalışanı ASLA bu şemaya dahil edilmez!
  const scopedEmployees = useMemo(() => {
    if (!activeCompanyId || activeCompanyId === 'all') {
      if (distinctCompanies.length > 0) {
        const first = distinctCompanies[0];
        return employees.filter(e => (e.company_id === first.id || (e.company && e.company.toLowerCase().trim() === first.name.toLowerCase().trim())));
      }
      return employees;
    }

    const targetComp = distinctCompanies.find(c => c.id === activeCompanyId);
    const targetName = (targetComp?.name || activeCompanyId).toLowerCase().trim();

    return employees.filter(e => {
      const empCompId = (e.company_id || '').toLowerCase().trim();
      const empCompName = (e.company || '').toLowerCase().trim();
      return empCompId === activeCompanyId.toLowerCase().trim() || empCompName === targetName;
    });
  }, [employees, activeCompanyId, distinctCompanies]);

  const activeCompanyName = useMemo(() => {
    const found = distinctCompanies.find(c => c.id === activeCompanyId);
    return found?.name || scopedEmployees[0]?.company || companyName || 'Humanius Şirketi';
  }, [distinctCompanies, activeCompanyId, scopedEmployees, companyName]);

  const tree = useMemo(() => buildOrgTree(scopedEmployees), [scopedEmployees]);

  const depts = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const emp of scopedEmployees) {
      const d = emp.department || 'Genel Kadro';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(emp);
    }
    return map;
  }, [scopedEmployees]);

  const DEPT_COLORS: Record<string, string> = {
    'İnsan Kaynakları': '#6366f1', 'Muhasebe': '#f59e0b', 'Mühendislik': '#10b981',
    'Satış': '#3b82f6', 'Pazarlama': '#ec4899', 'Operasyon': '#8b5cf6',
    'Hukuk': '#ef4444', 'IT': '#14b8a6',
  };
  const getColor = (dept: string) => DEPT_COLORS[dept] ?? '#64748b';

  const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  // 2. Akıllı PDF Baskı Fonksiyonu (Aşağıya uzamayı önleyen ölçekli veya sayfalı düzen)
  const handlePrintPdf = (modeOverride?: 'agac-fit' | 'departman-sayfali' | 'kadro-liste', sizeOverride?: 'a4' | 'a3') => {
    const mode = modeOverride ?? pdfFormat;
    const size = sizeOverride ?? paperSize;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const deptCount = depts.size;
    const maxStaffInDept = Math.max(...Array.from(depts.values()).map(emps => emps.length), 1);

    // Otomatik Sığdırma Ölçeği (Auto-Fit Scale Factor)
    // Departman ve personel sayısına göre ölçeği optimize ederek tam 1 A4/A3 sayfasına sığdırır
    let autoScale = 1.0;
    if (deptCount >= 8 || maxStaffInDept >= 12) {
      autoScale = 0.65;
    } else if (deptCount >= 6 || maxStaffInDept >= 8) {
      autoScale = 0.75;
    } else if (deptCount >= 4 || maxStaffInDept >= 5) {
      autoScale = 0.85;
    }

    const pageSizeCss = size === 'a3' ? 'A3 landscape' : 'A4 landscape';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(activeCompanyName)} - Resmi Organizasyon Şeması</title>
        <style>
          @page { 
            size: ${pageSizeCss}; 
            margin: 5mm 7mm; 
          }
          * { 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            color-adjust: exact !important; 
          }
          html, body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            color: #0f172a; 
            background: #ffffff; 
          }

          /* Audit & Header Table */
          .audit-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 8.5px; }
          .audit-table td { border: 1px solid #cbd5e1; padding: 2.5px 6px; }
          .audit-bg { background-color: #f8fafc; font-weight: 600; color: #475569; }

          /* MOD 1: TEK SAYFA FIT AĞAÇ ŞEMASI */
          .single-page-wrapper {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            zoom: ${autoScale};
          }

          .tree-wrapper { display: flex; flex-direction: column; align-items: center; width: 100%; margin: 2px 0; flex: 1 1 auto; justify-content: center; }
          .tree-root-box { background: #0f172a; color: #ffffff; padding: 5px 18px; border-radius: 6px; text-align: center; border: 2px solid #1e293b; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block; }
          .root-title { font-size: 11px; font-weight: 900; letter-spacing: 0.5px; }
          .root-sub { font-size: 8px; opacity: 0.85; margin-top: 1px; }

          .dept-branches { display: flex; justify-content: space-around; width: 100%; gap: 6px; align-items: flex-start; }
          .dept-branch { display: flex; flex-direction: column; align-items: center; flex: 1 1 0px; min-width: 80px; }

          .manager-node-box { background: #eff6ff !important; border: 1.5px solid #2563eb !important; border-radius: 5px; padding: 3px 5px; text-align: center; width: 100%; min-width: 95px; max-width: 150px; }
          .manager-name { font-size: 9px; font-weight: 800; color: #1e3a8a; line-height: 1.15; word-break: break-word; }
          .manager-pos { font-size: 7.5px; font-weight: 700; color: #2563eb; margin-top: 1px; line-height: 1.15; word-break: break-word; }

          /* Personel Grid - 2/3 Sütunlu Kompakt Rozetler (Aşağıya uzamayı engeller!) */
          .staff-grid-compact { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); 
            gap: 2px; 
            width: 100%; 
            margin-top: 2px; 
          }
          .staff-node-box-compact { 
            background: #ffffff; 
            border: 1px solid #cbd5e1; 
            border-radius: 3px; 
            padding: 2px 3px; 
            text-align: center; 
            box-shadow: 0 1px 1px rgba(0,0,0,0.02); 
          }
          .staff-name-compact { font-size: 8px; font-weight: 800; color: #0f172a; line-height: 1.1; word-break: break-word; }
          .staff-pos-compact { font-size: 7px; font-weight: 600; color: #2563eb; line-height: 1.05; word-break: break-word; }

          /* MOD 2: DEPARTMAN BAZLI SAYFALI DÜZEN */
          .page-break { page-break-after: always; break-after: page; }
          .dept-page-card { 
            background: #ffffff; 
            border: 1.5px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 12px; 
            margin-bottom: 12px; 
            page-break-inside: avoid; 
          }
          .dept-page-header { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            border-bottom: 2px solid #2563eb; 
            padding-bottom: 6px; 
            margin-bottom: 10px; 
          }

          /* Alt Bilgi & İmza */
          .legal-note { margin-top: 4px; padding: 3px 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 7.5px; color: #475569; line-height: 1.15; page-break-inside: avoid; }
          .sig-container { display: flex; justify-content: space-between; margin-top: 5px; padding: 0 30px; page-break-inside: avoid; }
          .sig-box { text-align: center; width: 150px; font-size: 8px; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 2px; font-weight: 600; }
          .footer { margin-top: 4px; padding-top: 2px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 7px; color: #94a3b8; }
        </style>
      </head>
      <body>
        ${mode === 'agac-fit' ? `
          <!-- MOD 1: SIKIŞTIRILMIŞ VE AŞAĞIYA UZAMAYAN TEK SAYFA FIT AĞAÇ ŞEMASI -->
          <div class="single-page-wrapper">
            <!-- Header Table -->
            <table class="audit-table">
              <tr>
                <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:white;">
                  <div style="font-size:13px; font-weight:900;">HUMANİUS HRMS</div>
                  <div style="font-size:7px; font-weight:600; opacity:0.9;">İK Teşkilat Yönetimi</div>
                </td>
                <td rowspan="2" style="width:50%; text-align:center; vertical-align:middle;">
                  <div style="font-size:11.5px; font-weight:800; color:#0f172a;">${escapeHtml(activeCompanyName.toUpperCase())}</div>
                  <div style="font-size:8px; color:#64748b; margin-top:1px;">Kurumsal Organizasyon ve Hiyerarşik Kadro Şeması</div>
                </td>
                <td class="audit-bg" style="width:15%;">Doküman No:</td>
                <td style="width:15%; font-weight:600; color:#1e293b;">ORG-${new Date().getFullYear()}-01</td>
              </tr>
              <tr>
                <td class="audit-bg">Rapor Tarihi:</td>
                <td style="font-weight:600; color:#1e293b;">${todayStr}</td>
              </tr>
            </table>

            <!-- Summary Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:8.5px; color:#475569;">
              <span><strong>Şirket:</strong> ${escapeHtml(activeCompanyName)}</span>
              <span><strong>Kadrolu Personel:</strong> ${scopedEmployees.length} Çalışan · <strong>Departman:</strong> ${depts.size} Birim</span>
            </div>

            <!-- Ağaç Şeması -->
            <div class="tree-wrapper">
              <!-- Root CEO / Şirket Sahibi -->
              <div class="tree-root-box">
                ${(() => {
                  const ceoEmps = scopedEmployees.filter(e => getEmployeeRank(e) === 0);
                  if (ceoEmps.length > 0) {
                    return ceoEmps.map(e => `
                      <div class="root-title">👑 ${escapeHtml(e.name)}</div>
                      <div class="root-sub">${escapeHtml(e.position || 'Genel Müdür / Şirket Yöneticisi')}</div>
                    `).join('');
                  }
                  return `
                    <div class="root-title">👑 ${escapeHtml(activeCompanyName)}</div>
                    <div class="root-sub">Genel Müdürlük & İcra Kurulu</div>
                  `;
                })()}
              </div>

              <!-- Dikey Çizgi -->
              <svg width="100%" height="8" style="display:block; overflow:visible;">
                <line x1="50%" y1="0" x2="50%" y2="8" stroke="#1e40af" stroke-width="2" />
              </svg>

              <!-- Yatay Çubuk -->
              <div style="width:100%; display:flex; justify-content:center; margin:-1px 0;">
                <svg width="88%" height="3" style="display:block; overflow:visible;">
                  <line x1="0" y1="1.5" x2="100%" y2="1.5" stroke="#1e40af" stroke-width="2" />
                </svg>
              </div>

              <!-- Departman Dalları -->
              <div class="dept-branches">
                ${Array.from(depts.entries()).filter(([dept, emps]) => !emps.every(e => getEmployeeRank(e) === 0)).map(([dept, emps]) => {
                  const managers = emps.filter(e => getEmployeeRank(e) === 1 || getEmployeeRank(e) === 2);
                  const mainManager = managers[0] || (emps[0] ? emps[0] : null);
                  const remainingStaff = mainManager ? emps.filter(e => e.id !== mainManager.id) : emps;

                  return `
                    <div class="dept-branch">
                      <svg width="100%" height="7" style="display:block; overflow:visible;">
                        <line x1="50%" y1="0" x2="50%" y2="7" stroke="#1e40af" stroke-width="2" />
                      </svg>

                      <!-- Müdür / Yönetici -->
                      <div class="manager-node-box">
                        <div class="manager-name">👔 ${escapeHtml(mainManager ? mainManager.name : dept)}</div>
                        <div class="manager-pos">${escapeHtml(mainManager ? (mainManager.position || dept + ' Müdürü') : 'Birim Yönetimi')}</div>
                      </div>

                      ${remainingStaff.length > 0 ? `
                        <svg width="100%" height="5" style="display:block; overflow:visible;">
                          <line x1="50%" y1="0" x2="50%" y2="5" stroke="#2563eb" stroke-width="1.5" />
                        </svg>
                        <div style="width:100%; display:flex; justify-content:center; margin:-1px 0;">
                          <svg width="80%" height="2" style="display:block; overflow:visible;">
                            <line x1="0" y1="1" x2="100%" y2="1" stroke="#2563eb" stroke-width="1.5" />
                          </svg>
                        </div>
                        <svg width="100%" height="4" style="display:block; overflow:visible;">
                          <line x1="50%" y1="0" x2="50%" y2="4" stroke="#2563eb" stroke-width="1.5" />
                        </svg>

                        <!-- Kompakt Kadro Izgarası (Aşağıya uzamayı engeller!) -->
                        <div class="staff-grid-compact">
                          ${remainingStaff.map(e => `
                            <div class="staff-node-box-compact">
                              <div class="staff-name-compact">${escapeHtml(e.name)}</div>
                              <div class="staff-pos-compact">${escapeHtml(e.position || 'Personel')}</div>
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Yasal Beyan -->
            <div class="legal-note">
              <strong>Resmi Beyan:</strong> İşbu Organizasyon Şeması, 4857 sayılı İş Kanunu ve ISO 9001 standartlarına uygun olarak ${escapeHtml(activeCompanyName)} şirket kadrosuna özel olarak üretilmiştir. Başka şirket çalışanları ile birleştirilemez.
            </div>

            <!-- İmza Blokları -->
            <div class="sig-container">
              <div class="sig-box">
                Hazırlayan & İK Onayı<br>
                <div style="margin-top:12px; font-size:8px; color:#94a3b8;">İmza / Tarih</div>
              </div>
              <div class="sig-box">
                Onaylayan & Genel Müdür<br>
                <div style="margin-top:12px; font-size:8px; color:#94a3b8;">İmza / Kaşe</div>
              </div>
            </div>

            <div class="footer">
              <span>Humanius İnsan Kaynakları Sistemi © ${new Date().getFullYear()}</span>
              <span>Gizli ve Kuruma Özeldir · ${escapeHtml(activeCompanyName)}</span>
            </div>
          </div>
        ` : `
          <!-- MOD 2: DEPARTMAN BAZLI ÇOKLU SAYFA (HİÇBİR ZAMAN UZAMAZ VE TAŞMAZ) -->
          <!-- Sayfa 1: Kurumsal Özet ve Üst Düzey Şema -->
          <div style="min-height:92vh; display:flex; flex-direction:column; justify-content:space-between;" class="page-break">
            <div>
              <table class="audit-table">
                <tr>
                  <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:white;">
                    <div style="font-size:14px; font-weight:900;">HUMANİUS HRMS</div>
                    <div style="font-size:7px; font-weight:600; opacity:0.9;">İK Teşkilat Yönetimi</div>
                  </td>
                  <td rowspan="2" style="width:50%; text-align:center; vertical-align:middle;">
                    <div style="font-size:12px; font-weight:800; color:#0f172a;">${escapeHtml(activeCompanyName.toUpperCase())}</div>
                    <div style="font-size:8.5px; color:#64748b; margin-top:1px;">Sayfa 1: Kurumsal Teşkilat & Departman Yönetim Özeti</div>
                  </td>
                  <td class="audit-bg" style="width:15%;">Doküman No:</td>
                  <td style="width:15%; font-weight:600; color:#1e293b;">ORG-${new Date().getFullYear()}-DET</td>
                </tr>
                <tr>
                  <td class="audit-bg">Rapor Tarihi:</td>
                  <td style="font-weight:600; color:#1e293b;">${todayStr}</td>
                </tr>
              </table>

              <div style="margin:16px 0; text-align:center;">
                <div style="display:inline-block; background:#0f172a; color:#fff; padding:8px 24px; border-radius:8px; border:2px solid #334155;">
                  <div style="font-size:13px; font-weight:900;">👑 ${escapeHtml(activeCompanyName)}</div>
                  <div style="font-size:9px; color:#94a3b8; margin-top:2px;">Genel Müdürlük ve İdari Teşkilat Yapısı</div>
                </div>
              </div>

              <!-- Departman Dağılım Tablosu -->
              <table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:10px;">
                <thead>
                  <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
                    <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Departman</th>
                    <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Birim Yöneticisi</th>
                    <th style="border:1px solid #cbd5e1; padding:6px; text-align:center;">Toplam Kadro</th>
                    <th style="border:1px solid #cbd5e1; padding:6px; text-align:center;">Aktif</th>
                    <th style="border:1px solid #cbd5e1; padding:6px; text-align:center;">İzinde / Diğer</th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from(depts.entries()).map(([dept, emps]) => {
                    const manager = emps.find(e => getEmployeeRank(e) <= 2) || emps[0];
                    const activeCount = emps.filter(e => e.status === 'active').length;
                    const otherCount = emps.length - activeCount;
                    return `
                      <tr>
                        <td style="border:1px solid #e2e8f0; padding:6px; font-weight:700; color:#1e3a8a;">🏢 ${escapeHtml(dept)}</td>
                        <td style="border:1px solid #e2e8f0; padding:6px; color:#334155;">👔 ${escapeHtml(manager?.name || 'Atanmadı')} (${escapeHtml(manager?.position || 'Yönetici')})</td>
                        <td style="border:1px solid #e2e8f0; padding:6px; text-align:center; font-weight:700;">${emps.length}</td>
                        <td style="border:1px solid #e2e8f0; padding:6px; text-align:center; color:#16a34a; font-weight:600;">${activeCount}</td>
                        <td style="border:1px solid #e2e8f0; padding:6px; text-align:center; color:#eab308; font-weight:600;">${otherCount}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div>
              <div class="sig-container" style="margin-top:24px;">
                <div class="sig-box">
                  İnsan Kaynakları Yöneticisi<br>
                  <div style="margin-top:16px; font-size:8px; color:#94a3b8;">İmza / Tarih</div>
                </div>
                <div class="sig-box">
                  Genel Müdür Onayı<br>
                  <div style="margin-top:16px; font-size:8px; color:#94a3b8;">İmza / Kaşe</div>
                </div>
              </div>
              <div class="footer">
                <span>Humanius İnsan Kaynakları Sistemi © ${new Date().getFullYear()}</span>
                <span>Sayfa 1 / ${depts.size + 1}</span>
              </div>
            </div>
          </div>

          <!-- Sonraki Sayfalar: Her Departman İçin Ayrı A4 Sayfası -->
          ${Array.from(depts.entries()).map(([dept, emps], pageIdx) => {
            const manager = emps.find(e => getEmployeeRank(e) <= 2) || emps[0];
            const staff = manager ? emps.filter(e => e.id !== manager.id) : emps;

            return `
              <div style="min-height:92vh; display:flex; flex-direction:column; justify-content:space-between;" class="${pageIdx < depts.size - 1 ? 'page-break' : ''}">
                <div>
                  <div class="dept-page-header">
                    <div>
                      <h2 style="margin:0; font-size:14px; font-weight:900; color:#1e3a8a;">🏢 ${escapeHtml(dept)} Departmanı Teşkilat Şeması</h2>
                      <p style="margin:2px 0 0; font-size:9px; color:#64748b;">${escapeHtml(activeCompanyName)} · Kadro Detayı</p>
                    </div>
                    <div style="text-align:right;">
                      <span style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; font-size:9px; font-weight:800; padding:3px 8px; border-radius:12px;">
                        Toplam ${emps.length} Çalışan
                      </span>
                    </div>
                  </div>

                  <!-- Birim Amiri Kutusu -->
                  <div style="text-align:center; margin-bottom:12px;">
                    <div style="display:inline-block; background:#eff6ff; border:2px solid #2563eb; border-radius:8px; padding:6px 20px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                      <div style="font-size:11px; font-weight:800; color:#1e3a8a;">👔 ${escapeHtml(manager?.name || dept + ' Müdürü')}</div>
                      <div style="font-size:8.5px; font-weight:700; color:#2563eb;">${escapeHtml(manager?.position || 'Birim Yöneticisi')}</div>
                      <div style="font-size:7.5px; color:#64748b; margin-top:1px;">${escapeHtml(manager?.email || '')}</div>
                    </div>
                  </div>

                  <!-- Departman Çalışanları (Geniş & Ferah 4 Sütunlu Kartlar) -->
                  <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
                    ${staff.map(e => `
                      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; box-shadow:0 1px 2px rgba(0,0,0,0.03);">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                          <div style="font-size:9px; font-weight:800; color:#0f172a;">${escapeHtml(e.name)}</div>
                          <span style="font-size:7px; padding:1px 4px; border-radius:4px; font-weight:600; background:${e.status === 'active' ? '#dcfce7; color:#15803d;' : '#fef9c3; color:#a16207;'}">
                            ${e.status === 'active' ? 'Aktif' : 'İzinde'}
                          </span>
                        </div>
                        <div style="font-size:8px; font-weight:600; color:#2563eb; margin-top:2px;">${escapeHtml(e.position || 'Personel')}</div>
                        ${e.email ? `<div style="font-size:7px; color:#94a3b8; margin-top:2px;">${escapeHtml(e.email)}</div>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>

                <div class="footer">
                  <span>Humanius İK Sistemi · ${escapeHtml(activeCompanyName)}</span>
                  <span>Sayfa ${pageIdx + 2} / ${depts.size + 1}</span>
                </div>
              </div>
            `;
          }).join('')}
        `}

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
      {/* Başlık ve Şirket Seçici Kontrol Çubuğu */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">Organizasyon Şeması</h2>
            {/* Şirket İzolasyon Rozeti / Seçicisi */}
            {distinctCompanies.length > 1 ? (
              <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200 rounded-xl px-3 py-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-900">Şirket:</span>
                <select
                  value={activeCompanyId}
                  onChange={(e) => {
                    setActiveCompanyId(e.target.value);
                    if (onCompanyChange) onCompanyChange(e.target.value);
                  }}
                  className="text-xs font-bold text-indigo-950 bg-transparent outline-none cursor-pointer pr-2"
                >
                  {distinctCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.count} personel)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                <Building2 className="w-3 h-3 text-gray-500" />
                {activeCompanyName}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            <strong>{activeCompanyName}</strong> · {scopedEmployees.length} personel · {depts.size} departman
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPdfPreview(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors"
            title="Şema Baskı Önizlemesi"
          >
            <Eye className="w-3.5 h-3.5" />
            PDF Önizleme & Ayarlar
          </button>
          <button
            onClick={() => handlePrintPdf('agac-fit', paperSize)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            title="Sıkıştırılmış Tek Sayfa PDF İndir"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF İndir / Yazdır
          </button>
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['agac', 'kart'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGorunum(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  gorunum === g ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {g === 'agac' ? 'Ağaç' : 'Kart'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={aramaMetni}
          onChange={(e) => setAramaMetni(e.target.value)}
          placeholder={`${activeCompanyName} bünyesinde departman, pozisyon veya personel ara...`}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
        />
      </div>

      {gorunum === 'agac' && (
        <div className="flex gap-5">
          {/* Ağaç */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 overflow-y-auto max-h-[calc(100vh-280px)]">
            {/* Şirket kök düğümü */}
            <div
              onClick={() => setSecilenNode(null)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-50 border border-transparent hover:border-gray-200 mb-2"
            >
              <ChevronDown className="w-4 h-4 text-gray-400" />
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{activeCompanyName}</p>
                <p className="text-[10px] text-gray-400">{scopedEmployees.length} kadrolu personel</p>
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

          {/* Detay paneli */}
          <div className="w-72 flex-shrink-0">
            <PersonelDetay node={secilenNode} />
          </div>
        </div>
      )}

      {gorunum === 'kart' && (
        <div className="space-y-6">
          {Array.from(depts.entries()).map(([dept, emps]) => (
            <div key={dept}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getColor(dept) }}
                />
                <p className="font-semibold text-gray-700 text-sm">{dept}</p>
                <span className="text-xs text-gray-400">({emps.length} kişi)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {emps.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => setSecilenNode({
                      id: emp.id, label: emp.name, tip: 'personel',
                      altBaslik: emp.position, renk: getColor(dept), children: [], employee: emp,
                    })}
                    className={`bg-white rounded-2xl border p-3 cursor-pointer hover:shadow-md transition-all ${
                      secilenNode?.id === emp.id ? 'border-indigo-400 shadow-md' : 'border-gray-200'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base mb-2 mx-auto"
                      style={{ backgroundColor: getColor(dept) }}
                    >
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 text-center truncate">{emp.name}</p>
                    <p className="text-[10px] text-gray-400 text-center truncate">{emp.position}</p>
                    <div className="flex justify-center mt-1.5">
                      <div className={`w-2 h-2 rounded-full ${statusRenk[emp.status] ?? 'bg-gray-300'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Renk açıklaması */}
      <div className="flex flex-wrap gap-3 bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 w-full">Durum Göstergesi</p>
        {[
          { renk: 'bg-green-400', etiket: 'Aktif' },
          { renk: 'bg-yellow-400', etiket: 'İzinde' },
          { renk: 'bg-gray-300', etiket: 'Pasif' },
        ].map((item) => (
          <div key={item.etiket} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${item.renk}`} />
            <span className="text-xs text-gray-600">{item.etiket}</span>
          </div>
        ))}
      </div>

      {/* PDF Önizleme & Düzenleme Modalı */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header & Kontrol Barı */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-gray-50 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    PDF Baskı ve Çıktı Kontrolü
                    <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                      {activeCompanyName}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">Aşağıya taşmayı ve uzamayı önleyen optimize edilmiş baskı düzeni</p>
                </div>
              </div>

              {/* Düzen ve Kağıt Seçicileri */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Format Seçici */}
                <div className="flex bg-gray-200/70 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => setPdfFormat('agac-fit')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      pdfFormat === 'agac-fit'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Otomatik ölçeklenerek tek sayfaya sığdırılır"
                  >
                    🌳 Tek Sayfa Sığdır (Fit)
                  </button>
                  <button
                    onClick={() => setPdfFormat('departman-sayfali')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      pdfFormat === 'departman-sayfali'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Her departman ayrı ferah bir sayfaya basılır, asla uzamaz"
                  >
                    📑 Departmanlara Göre Sayfalı
                  </button>
                </div>

                {/* Kağıt Boyutu */}
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as any)}
                  className="text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="a4">A4 Yatay</option>
                  <option value="a3">A3 Yatay (Büyük Kadrolar)</option>
                </select>

                {/* Yazdır Butonu */}
                <button
                  onClick={() => { handlePrintPdf(pdfFormat, paperSize); setShowPdfPreview(false); }}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Printer size={14} />
                  Yazdır / PDF İndir
                </button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body - Paper Document Mockup */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100/80">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-4xl mx-auto space-y-4">
                {/* Format Bilgilendirme Notu */}
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>
                      {pdfFormat === 'agac-fit' 
                        ? 'Tek Sayfa Sığdır: Şemanız dikey olarak uzamadan tek bir landscape sayfasına otomatik ölçeklenerek sığdırılır.' 
                        : 'Departman Sayfalı: Şirket genel müdürlüğü ilk sayfada, departmanlar ise kendi bağımsız sayfalarında basılarak taşma tamamen engellenir.'}
                    </span>
                  </div>
                  <span className="font-bold text-blue-700 uppercase tracking-wider text-[10px]">
                    {paperSize.toUpperCase()} Yatay
                  </span>
                </div>

                {/* Paper Header */}
                <div className="flex items-center justify-between border-b-2 border-blue-600 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-base font-black">
                      H
                    </div>
                    <div>
                      <h1 className="text-base font-black text-gray-900 tracking-tight">{activeCompanyName}</h1>
                      <p className="text-[9px] font-bold text-blue-600 tracking-wider">KURUMSAL ORGANİZASYON ŞEMASI</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                      {scopedEmployees.length} PERSONEL · {depts.size} DEPARTMAN
                    </span>
                    <p className="text-[9px] text-gray-500 mt-0.5">Rapor Tarihi: {todayStr}</p>
                  </div>
                </div>

                {/* Ağaç Önizlemesi */}
                <div className="flex flex-col items-center w-full py-3 overflow-x-auto">
                  {/* Root Node (CEO / Genel Müdür / Şirket Sahibi) */}
                  <div className="bg-slate-900 text-white px-5 py-1.5 rounded-lg border-2 border-slate-800 text-center shadow-xs">
                    {(() => {
                      const ceoEmps = scopedEmployees.filter(e => getEmployeeRank(e) === 0);
                      if (ceoEmps.length > 0) {
                        return ceoEmps.map(e => (
                          <React.Fragment key={e.id}>
                            <p className="text-xs font-black tracking-wide">👑 {e.name}</p>
                            <p className="text-[9px] text-slate-300">{e.position || 'Genel Müdür / Şirket Yöneticisi'}</p>
                          </React.Fragment>
                        ));
                      }
                      return (
                        <>
                          <p className="text-xs font-black tracking-wide">👑 {activeCompanyName}</p>
                          <p className="text-[9px] text-slate-300">Genel Müdürlük & İcra Kurulu</p>
                        </>
                      );
                    })()}
                  </div>

                  {/* Vertical Line from Root */}
                  <div className="w-0.5 h-3 bg-blue-600"></div>

                  {/* Horizontal Connector Bar */}
                  <div className="w-[88%] h-0.5 bg-blue-600 rounded-full"></div>

                  {/* Manager Branches */}
                  <div className="flex justify-around w-full gap-2 items-start mt-0">
                    {Array.from(depts.entries()).filter(([dept, emps]) => !emps.every(e => getEmployeeRank(e) === 0)).map(([dept, emps]) => {
                      const managers = emps.filter(e => getEmployeeRank(e) === 1 || getEmployeeRank(e) === 2);
                      const mainManager = managers[0] || (emps[0] ? emps[0] : null);
                      const remainingStaff = mainManager ? emps.filter(e => e.id !== mainManager.id) : emps;

                      return (
                        <div key={dept} className="flex flex-col items-center flex-1 min-w-[80px]">
                          <div className="w-0.5 h-2.5 bg-blue-600"></div>

                          {/* Level 1: Manager Box */}
                          <div className="bg-blue-50 border-1.5 border-blue-600 rounded-md p-1.5 text-center w-full max-w-[130px] shadow-2xs">
                            <p className="font-bold text-[10px] text-blue-950 truncate">👔 {mainManager ? mainManager.name : dept}</p>
                            <p className="font-semibold text-[8px] text-blue-700 truncate mt-0.5">{mainManager ? (mainManager.position || 'Müdür') : 'Birim Yönetimi'}</p>
                          </div>

                          {/* Level 2: Staff Grid (Kompakt 2 sütunlu mikro kartlar) */}
                          {remainingStaff.length > 0 && (
                            <>
                              <div className="w-0.5 h-1.5 bg-blue-600"></div>
                              <div className="w-[80%] h-0.5 bg-blue-600 rounded-full"></div>
                              <div className="w-0.5 h-1.5 bg-blue-600"></div>
                              <div className="grid grid-cols-2 gap-1 w-full mt-0.5">
                                {remainingStaff.slice(0, 8).map(e => (
                                  <div key={e.id} className="bg-white border border-slate-300 rounded p-1 text-center shadow-2xs">
                                    <p className="font-bold text-[8.5px] text-slate-900 truncate">{e.name}</p>
                                    <p className="text-[7.5px] text-blue-600 truncate">{e.position || 'Personel'}</p>
                                  </div>
                                ))}
                                {remainingStaff.length > 8 && (
                                  <div className="col-span-2 text-center text-[7.5px] text-gray-500 font-semibold bg-gray-100 py-0.5 rounded">
                                    +{remainingStaff.length - 8} personel daha
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures Preview */}
                <div className="flex justify-between pt-4 px-8 border-t border-gray-200">
                  <div className="text-center w-36 border-t border-dashed border-gray-400 pt-1">
                    <p className="font-bold text-[11px] text-gray-800">Hazırlayan</p>
                    <p className="text-[8px] text-gray-500">İnsan Kaynakları Yönetimi</p>
                  </div>
                  <div className="text-center w-36 border-t border-dashed border-gray-400 pt-1">
                    <p className="font-bold text-[11px] text-gray-800">Onaylayan</p>
                    <p className="text-[8px] text-gray-500">Genel Müdürlük</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizasyonSemasi;
