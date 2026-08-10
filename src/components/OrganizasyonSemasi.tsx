import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, User, Users, Building2, Briefcase, Search, Printer, FileText, Eye, X } from 'lucide-react';
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

const OrganizasyonSemasi: React.FC<OrganizasyonSemasiProps> = ({ employees, companyName }) => {
  const [secilenNode, setSecilenNode] = useState<OrgNode | null>(null);
  const [aramaMetni, setAramaMetni] = useState('');
  const [gorunum, setGorunum] = useState<'agac' | 'kart'>('agac');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'agac' | 'kart'>('agac');

  const tree = useMemo(() => buildOrgTree(employees), [employees]);

  const depts = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const emp of employees) {
      const d = emp.department || 'Belirsiz';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(emp);
    }
    return map;
  }, [employees]);

  const DEPT_COLORS: Record<string, string> = {
    'İnsan Kaynakları': '#6366f1', 'Muhasebe': '#f59e0b', 'Mühendislik': '#10b981',
    'Satış': '#3b82f6', 'Pazarlama': '#ec4899', 'Operasyon': '#8b5cf6',
    'Hukuk': '#ef4444', 'IT': '#14b8a6',
  };
  const getColor = (dept: string) => DEPT_COLORS[dept] ?? '#64748b';

  const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrintPdf = (modeOverride?: 'agac' | 'kart') => {
    const targetMode = modeOverride ?? previewFormat ?? gorunum;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>Humanius HRMS - Kurumsal Resmi Organizasyon Şeması Belgesi</title>
        <style>
          @page { size: A4 landscape; margin: 4mm 6mm; }
          * { 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            color-adjust: exact !important; 
          }
          html, body { 
            height: 100%; 
            max-height: 100vh;
            margin: 0; 
            padding: 4px; 
            overflow: hidden !important; 
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            color: #0f172a; 
            background: #ffffff; 
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .page-container {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid !important;
          }

          .audit-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 9px; }
          .audit-table td { border: 1px solid #cbd5e1; padding: 2px 6px; }
          
          /* Top-Down Ağaç Şeması Stilleri (BELGİN VE MAVİ AĞAÇ DALLARI) */
          .tree-wrapper { display: flex; flex-direction: column; align-items: center; width: 100%; margin: 4px 0; flex: 1 1 auto; justify-content: center; }
          .tree-root-box { background: #0f172a; color: #ffffff; padding: 5px 18px; border-radius: 6px; text-align: center; border: 2px solid #1e293b; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block; }
          .root-title { font-size: 11.5px; font-weight: 900; letter-spacing: 0.5px; }
          .root-sub { font-size: 8px; opacity: 0.85; margin-top: 1px; }

          .v-line { 
            width: 2.5px; 
            background-color: #2563eb !important; 
            border-left: 2.5px solid #2563eb !important; 
            margin: 0 auto; 
            flex-shrink: 0; 
          }

          .h-line-wrapper { width: 100%; display: flex; justify-content: center; }
          .h-line { 
            height: 2.5px; 
            background-color: #2563eb !important; 
            border-top: 2.5px solid #2563eb !important; 
            width: 86%; 
          }

          .dept-branches { display: flex; justify-content: space-around; width: 100%; gap: 5px; align-items: flex-start; }
          .dept-branch { display: flex; flex-direction: column; align-items: center; flex: 1 1 0px; min-width: 85px; }

          /* YÖNETİCİ / MÜDÜR KUTUSU (LEVEL 1) */
          .manager-node-box { background: #eff6ff !important; border: 1.5px solid #2563eb !important; border-radius: 5px; padding: 4px 6px; text-align: center; width: 100%; min-width: 110px; max-width: 160px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .manager-name { font-size: 9.5px; font-weight: 800; color: #1e3a8a; white-space: normal; word-break: break-word; line-height: 1.15; }
          .manager-pos { font-size: 8px; font-weight: 700; color: #2563eb; margin-top: 1px; white-space: normal; word-break: break-word; line-height: 1.15; }

          /* MÜDÜR ALTINDAKİ AĞAÇ DALI ÇİZGİLERİ (SUB-BRANCH LINES) */
          .sub-h-line-wrapper { width: 100%; display: flex; justify-content: center; margin: 1px 0; }
          .sub-h-line { 
            height: 2px; 
            background-color: #2563eb !important; 
            border-top: 2px solid #2563eb !important; 
            width: 80%; 
            border-radius: 1px; 
          }

          /* YATAY YAN YANA ÇALIŞAN IZGARASI (STAFF HORIZONTAL GRID - TAM İŞ TANIMLARI) */
          .staff-grid { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: center; align-items: stretch; width: 100%; gap: 3px; }
          .staff-node-box { flex: 1 1 auto; min-width: 65px; max-width: 110px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 4px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: center; }
          .staff-name { font-size: 8.5px; font-weight: 800; color: #0f172a; white-space: normal; word-break: break-word; line-height: 1.15; }
          .staff-pos { font-size: 7.5px; font-weight: 600; color: #2563eb; margin-top: 1px; white-space: normal; word-break: break-word; line-height: 1.15; }

          .legal-note { margin-top: 4px; padding: 3px 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 8px; color: #475569; line-height: 1.15; page-break-inside: avoid; }
          .sig-container { display: flex; justify-content: space-between; margin-top: 6px; padding: 0 30px; page-break-inside: avoid; }
          .sig-box { text-align: center; width: 150px; font-size: 8.5px; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 2px; font-weight: 600; }
          .footer { margin-top: 4px; padding-top: 2px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 7.5px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="page-container">
        <!-- ISO 9001 / ISG Kurumsal Denetim Başlık Tablosu -->
        <table class="audit-table">
          <tr>
            <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:white;">
              <div style="font-size:14px; font-weight:900;">HUMANİUS HRMS</div>
              <div style="font-size:7px; font-weight:600; opacity:0.9;">İK Yönetim Sistemleri</div>
            </td>
            <td rowspan="2" style="width:50%; text-align:center; vertical-align:middle;">
              <div style="font-size:12px; font-weight:800; color:#0f172a;">KURUMSAL ORGANİZASYON ŞEMASI BELGESİ</div>
              <div style="font-size:8.5px; color:#64748b; margin-top:1px;">İdari ve Teşkilat Yapısı · Hiyerarşik Ağaç Şeması</div>
            </td>
            <td class="audit-bg" style="width:15%;">Doküman No:</td>
            <td style="width:15%; font-weight:600; color:#1e293b;">FR-IK-012</td>
          </tr>
          <tr>
            <td class="audit-bg">Yayın / Rev. Tarihi:</td>
            <td style="font-weight:600; color:#1e293b;">${todayStr}</td>
          </tr>
        </table>

        <!-- Summary Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:9.5px; color:#475569;">
          <span><strong>Kurum:</strong> ${escapeHtml(companyName || 'Humanius HRMS')}</span>
          <span><strong>Toplam Kadro:</strong> ${employees.length} Çalışan</span>
        </div>

        <!-- HİYERARŞİK DİKİNE AĞAÇ ŞEMASI (DEPARTMAN KUTULARI OLMADAN - DOĞRUDAN MÜDÜRLER VE YATAY ÇALIŞANLAR) -->
        <div class="tree-wrapper">
          <!-- Level 0: Kök Düğüm / Şirket Sahibi - Genel Müdür -->
          <div class="tree-root-box">
            ${(() => {
              const ceoEmps = employees.filter(e => getEmployeeRank(e) === 0);
              if (ceoEmps.length > 0) {
                return ceoEmps.map(e => `
                  <div class="root-title">👑 ${escapeHtml(e.name)}</div>
                  <div class="root-sub">${escapeHtml(e.position || 'Şirket Sahibi / Genel Müdür')}</div>
                `).join('');
              }
              return `
                <div class="root-title">👑 ${escapeHtml(companyName || 'Humanius HRMS')}</div>
                <div class="root-sub">Yönetim Kurulu & Genel Müdürlük</div>
              `;
            })()}
          </div>

          <!-- Dikey Bağlantı Çubuğu (SVG Vektör Çizgisi) -->
          <svg width="100%" height="12" style="display:block; overflow:visible;">
            <line x1="50%" y1="0" x2="50%" y2="12" stroke="#1e40af" stroke-width="2.5" />
          </svg>

          <!-- Departmanlar Arası Yatay Bağlantı Çubuğu (SVG Vektör Çizgisi) -->
          <div style="width:100%; display:flex; justify-content:center; margin:-1px 0;">
            <svg width="86%" height="4" style="display:block; overflow:visible;">
              <line x1="0" y1="2" x2="100%" y2="2" stroke="#1e40af" stroke-width="2.5" />
            </svg>
          </div>

          <!-- MÜDÜR VE ÇALIŞAN DALLARI (DEPARTMAN KUTULARI YOKTUR) -->
          <div class="dept-branches">
            ${Array.from(depts.entries()).filter(([dept, emps]) => !emps.every(e => getEmployeeRank(e) === 0)).map(([dept, emps]) => {
              const managers = emps.filter(e => getEmployeeRank(e) === 1 || getEmployeeRank(e) === 2);
              const staff = emps.filter(e => getEmployeeRank(e) >= 3);
              const mainManager = managers[0] || (emps[0] ? emps[0] : null);
              const remainingStaff = mainManager ? emps.filter(e => e.id !== mainManager.id) : emps;

              return `
                <div class="dept-branch">
                  <!-- Yatay Çubuktan Müdüre İnen Çizgi (SVG Vektör) -->
                  <svg width="100%" height="10" style="display:block; overflow:visible;">
                    <line x1="50%" y1="0" x2="50%" y2="10" stroke="#1e40af" stroke-width="2.5" />
                  </svg>

                  <!-- Level 1: Müdür / Yönetici Kutusu (Doğrudan Üst Çizgiye Bağlı) -->
                  ${mainManager ? `
                    <div class="manager-node-box">
                      <div class="manager-name">👔 ${escapeHtml(mainManager.name)}</div>
                      <div class="manager-pos">${escapeHtml(mainManager.position || 'Müdür')}</div>
                    </div>
                  ` : `
                    <div class="manager-node-box">
                      <div class="manager-name">🏢 ${escapeHtml(dept)}</div>
                      <div class="manager-pos">Yönetimi</div>
                    </div>
                  `}

                  <!-- Müdürden Altındaki Çalışanlara İnen SVG Ağaç Dalı Çizgileri -->
                  ${remainingStaff.length > 0 ? `
                    <svg width="100%" height="6" style="display:block; overflow:visible;">
                      <line x1="50%" y1="0" x2="50%" y2="6" stroke="#2563eb" stroke-width="2" />
                    </svg>
                    <div style="width:100%; display:flex; justify-content:center; margin:-1px 0;">
                      <svg width="80%" height="3" style="display:block; overflow:visible;">
                        <line x1="0" y1="1.5" x2="100%" y2="1.5" stroke="#2563eb" stroke-width="2" />
                      </svg>
                    </div>
                    <svg width="100%" height="6" style="display:block; overflow:visible;">
                      <line x1="50%" y1="0" x2="50%" y2="6" stroke="#2563eb" stroke-width="2" />
                    </svg>
                    <!-- Level 2: Çalışanlar (Yatay Yan Yana Sıkıştırılmış Izgara) -->
                    <div class="staff-grid">
                      ${remainingStaff.map(e => `
                        <div class="staff-node-box">
                          <div class="staff-name">${escapeHtml(e.name)}</div>
                          <div class="staff-pos">${escapeHtml(e.position || 'Personel')}</div>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Yasal Beyan & Uyum Metni -->
        <div class="legal-note">
          <strong>Resmi Beyan & Uyumluluk:</strong> İşbu Organizasyon Şeması Belgesi, 4857 sayılı İş Kanunu, 6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve ISO 9001 Kalite Yönetim Sistemi standartlarına uygun tanzim edilmiş resmi evraktır.
        </div>

        <!-- Islak İmza & Mühür Kutuları -->
        <div class="sig-container">
          <div class="sig-box">
            Hazırlayan & Kontrol Eden<br>
            <div style="font-weight:normal; font-size:9px; color:#64748b; margin-top:2px;">İnsan Kaynakları Yöneticisi</div>
            <div style="margin-top:16px; font-size:8.5px; color:#cbd5e1;">İmza / Tarih</div>
          </div>
          <div class="sig-box">
            Onaylayan & Kaşe<br>
            <div style="font-weight:normal; font-size:9px; color:#64748b; margin-top:2px;">Genel Müdür / Şirket Yöneticisi</div>
            <div style="margin-top:16px; font-size:8.5px; color:#cbd5e1;">İmza / Kaşe / Tarih</div>
          </div>
        </div>

        <div class="footer">
          <span>Humanius İnsan Kaynakları Yönetim Sistemi © ${new Date().getFullYear()}</span>
          <span>Gizli ve Kuruma Özel Belge · Bu evrak resmi denetimler için geçerlidir.</span>
        </div>
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
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Organizasyon Şeması</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {employees.length} personel · {depts.size} departman
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPreviewFormat(gorunum); setShowPdfPreview(true); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors"
            title="Şema Baskı Önizlemesi"
          >
            <Eye className="w-3.5 h-3.5" />
            PDF Önizleme
          </button>
          <button
            onClick={() => handlePrintPdf(gorunum)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            title="Organizasyon Şemasını PDF Olarak İndir / Yazdır"
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
          placeholder="Departman, pozisyon veya personel ara..."
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
                <p className="text-sm font-semibold text-gray-800">Şirket</p>
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

      {/* PDF Önizleme Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    PDF Baskı Önizlemesi
                    <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">A4 Yatay (Landscape)</span>
                  </h3>
                  <p className="text-xs text-gray-500">Sıkıştırılmış ultra düzenli kurumsal organizasyon şeması</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { handlePrintPdf(previewFormat); setShowPdfPreview(false); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Printer size={15} />
                  Şimdi Bastır / PDF İndir
                </button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body - Paper Document Mockup */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100/80">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-4xl mx-auto space-y-5">
                {/* Paper Header */}
                <div className="flex items-center justify-between border-b-2 border-blue-600 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-black">
                      H
                    </div>
                    <div>
                      <h1 className="text-lg font-black text-gray-900 tracking-tight">HUMANİUS HRMS</h1>
                      <p className="text-[10px] font-bold text-blue-600 tracking-wider">KURUMSAL ORGANİZASYON ŞEMASI</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs px-3 py-1 rounded-full">
                      {employees.length} PERSONEL · {depts.size} DEPARTMAN
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">Rapor Tarihi: {todayStr}</p>
                  </div>
                </div>

                {/* Top-Down Ağaç Şeması Önizlemesi (Departman Kutuları Olmadan) */}
                <div className="flex flex-col items-center w-full py-4 overflow-x-auto">
                  {/* Root Node (CEO / Genel Müdür / Şirket Sahibi) */}
                  <div className="bg-slate-900 text-white px-6 py-2 rounded-lg border-2 border-slate-800 text-center shadow-md">
                    {(() => {
                      const ceoEmps = employees.filter(e => getEmployeeRank(e) === 0);
                      if (ceoEmps.length > 0) {
                        return ceoEmps.map(e => (
                          <React.Fragment key={e.id}>
                            <p className="text-xs font-black tracking-wide">👑 {e.name}</p>
                            <p className="text-[10px] text-slate-300">{e.position || 'Şirket Sahibi / Genel Müdür'}</p>
                          </React.Fragment>
                        ));
                      }
                      return (
                        <>
                          <p className="text-xs font-black tracking-wide">👑 {companyName || 'Humanius HRMS'}</p>
                          <p className="text-[10px] text-slate-300">Yönetim Kurulu & Genel Müdürlük</p>
                        </>
                      );
                    })()}
                  </div>

                  {/* Vertical Line from Root */}
                  <div className="w-1 h-3.5 bg-blue-600"></div>

                  {/* Horizontal Connector Bar */}
                  <div className="w-[86%] h-1 bg-blue-600 rounded-full"></div>

                  {/* Manager Branches (NO Department Header Boxes!) */}
                  <div className="flex justify-around w-full gap-2 items-start mt-0">
                    {Array.from(depts.entries()).filter(([dept, emps]) => !emps.every(e => getEmployeeRank(e) === 0)).map(([dept, emps]) => {
                      const managers = emps.filter(e => getEmployeeRank(e) === 1 || getEmployeeRank(e) === 2);
                      const mainManager = managers[0] || (emps[0] ? emps[0] : null);
                      const remainingStaff = mainManager ? emps.filter(e => e.id !== mainManager.id) : emps;

                      return (
                        <div key={dept} className="flex flex-col items-center flex-1 min-w-[85px]">
                          {/* Vertical Line down to Manager */}
                          <div className="w-1 h-3 bg-blue-600"></div>

                          {/* Level 1: Manager Box */}
                          {mainManager ? (
                            <div className="bg-blue-50 border-2 border-blue-600 rounded-md p-1.5 text-center w-full max-w-[150px] shadow-sm">
                              <p className="font-bold text-[11px] text-blue-950 whitespace-normal break-words leading-tight">👔 {mainManager.name}</p>
                              <p className="font-semibold text-[9px] text-blue-700 whitespace-normal break-words leading-tight mt-0.5">{mainManager.position || 'Müdür'}</p>
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-300 rounded-md p-1.5 text-center w-full max-w-[150px] shadow-2xs">
                              <p className="font-bold text-[11px] text-slate-900 whitespace-normal break-words leading-tight">🏢 {dept}</p>
                              <p className="font-semibold text-[9px] text-slate-500 whitespace-normal break-words leading-tight mt-0.5">Yönetimi</p>
                            </div>
                          )}

                          {/* Vertical Line & Sub-Branch Lines down to Staff */}
                          {remainingStaff.length > 0 && (
                            <>
                              <div className="w-0.5 h-2 bg-blue-600"></div>
                              <div className="w-[80%] h-0.5 bg-blue-600 rounded-full my-0.5"></div>
                              <div className="w-0.5 h-2 bg-blue-600"></div>
                              {/* Level 2: Staff Horizontal Grid (Tam Unvanlar & Kısaltmasız Metinler) */}
                              <div className="flex flex-row flex-wrap justify-center items-stretch gap-1 w-full">
                                {remainingStaff.map(e => (
                                  <div key={e.id} className="flex-1 min-w-[65px] max-w-[110px] bg-white border border-slate-300 rounded p-1 text-center shadow-2xs flex flex-col justify-center">
                                    <p className="font-bold text-[9.5px] text-slate-900 whitespace-normal break-words leading-tight">{e.name}</p>
                                    <p className="font-semibold text-[8px] text-blue-600 whitespace-normal break-words leading-tight mt-0.5">{e.position || 'Personel'}</p>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures Preview */}
                <div className="flex justify-between pt-6 px-12 border-t border-gray-200">
                  <div className="text-center w-40 border-t border-dashed border-gray-400 pt-1.5">
                    <p className="font-bold text-xs text-gray-800">Hazırlayan</p>
                    <p className="text-[9px] text-gray-500">İnsan Kaynakları Yönetimi</p>
                  </div>
                  <div className="text-center w-40 border-t border-dashed border-gray-400 pt-1.5">
                    <p className="font-bold text-xs text-gray-800">Onaylayan</p>
                    <p className="text-[9px] text-gray-500">Şirket Genel Müdürü</p>
                  </div>
                </div>

                {/* Paper Footer */}
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-[9px] text-gray-400">
                  <span>Humanius İnsan Kaynakları Yönetim Sistemi © {new Date().getFullYear()}</span>
                  <span>Gizli ve Kuruma Özel Belge · Otomatik Üretilmiştir.</span>
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
