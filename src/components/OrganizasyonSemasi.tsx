import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, User, Users, Building2, Briefcase, Search, Printer, FileText, Eye, X } from 'lucide-react';
import type { Employee } from '../types';

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

const OrganizasyonSemasi: React.FC<OrganizasyonSemasiProps> = ({ employees }) => {
  const [secilenNode, setSecilenNode] = useState<OrgNode | null>(null);
  const [aramaMetni, setAramaMetni] = useState('');
  const [gorunum, setGorunum] = useState<'agac' | 'kart'>('agac');
  const [showPdfPreview, setShowPdfPreview] = useState(false);

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

  const DEPT_COLORS: Record<string, string> = {
    'İnsan Kaynakları': '#6366f1', 'Muhasebe': '#f59e0b', 'Mühendislik': '#10b981',
    'Satış': '#3b82f6', 'Pazarlama': '#ec4899', 'Operasyon': '#8b5cf6',
    'Hukuk': '#ef4444', 'IT': '#14b8a6',
  };
  const getColor = (dept: string) => DEPT_COLORS[dept] ?? '#64748b';

  const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>Humanius HRMS - Yatay Hiyerarşik Organizasyon Şeması Belgesi</title>
        <style>
          @page { size: A4 landscape; margin: 6mm 8mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; background: #ffffff; }
          
          .audit-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
          .audit-table td { border: 1px solid #cbd5e1; padding: 4px 8px; }
          .audit-bg { background: #f8fafc; font-weight: 600; color: #475569; }

          /* YATAY HİYERARŞİK AĞAÇ ŞEMASI (HORIZONTAL TREE FLOWCHART) */
          .tree-root { display: flex; align-items: center; margin-bottom: 12px; }
          .tree-root-box { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 8px 18px; border-radius: 8px; font-weight: 800; font-size: 12px; }
          
          .htree-wrapper { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
          .htree-dept-block { display: flex; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; overflow: hidden; page-break-inside: avoid; }
          
          .htree-dept-sidebar { width: 140px; padding: 10px; background: #f8fafc; border-right: 3px solid #2563eb; display: flex; flex-direction: column; justify-content: center; }
          .htree-dept-title { font-weight: 800; font-size: 11px; color: #0f172a; }
          .htree-dept-count { font-size: 9px; font-weight: 600; color: #64748b; background: #e2e8f0; padding: 1px 6px; border-radius: 10px; margin-top: 4px; display: inline-block; width: fit-content; }

          .htree-positions-container { flex: 1; padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; background: #ffffff; justify-content: center; }

          .htree-pos-row { display: flex; align-items: center; gap: 8px; position: relative; }
          .htree-pos-badge { min-width: 120px; max-width: 150px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-weight: 700; font-size: 9.5px; padding: 4px 8px; border-radius: 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
          .htree-arrow { color: #3b82f6; font-weight: 900; font-size: 10px; flex-shrink: 0; }

          .htree-emp-group { display: flex; flex-wrap: wrap; gap: 5px; flex: 1; padding-left: 6px; border-left: 2px solid #e2e8f0; }
          .htree-emp-box { background: #f9fafb; border: 1px solid #e2e8f0; border-radius: 5px; padding: 3px 8px; font-weight: 600; font-size: 9.5px; color: #0f172a; white-space: nowrap; }

          .legal-note { margin-top: 10px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 9px; color: #475569; line-height: 1.3; page-break-inside: avoid; }
          .sig-container { display: flex; justify-content: space-between; margin-top: 14px; padding: 0 40px; page-break-inside: avoid; }
          .sig-box { text-align: center; width: 180px; font-size: 10px; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 4px; font-weight: 600; }
          .footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8.5px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <!-- ISO 9001 / ISG Kurumsal Denetim Başlık Tablosu -->
        <table class="audit-table">
          <tr>
            <td rowspan="2" style="width:20%; text-align:center; vertical-align:middle; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:white;">
              <div style="font-size:15px; font-weight:900;">HUMANİUS HRMS</div>
              <div style="font-size:7.5px; font-weight:600; opacity:0.9;">İK Yönetim Sistemleri</div>
            </td>
            <td rowspan="2" style="width:50%; text-align:center; vertical-align:middle;">
              <div style="font-size:13px; font-weight:800; color:#0f172a;">YATAY HİYERARŞİK ORGANİZASYON ŞEMASI BELGESİ</div>
              <div style="font-size:9px; color:#64748b; margin-top:1px;">Departman ➔ Pozisyon ➔ Personel Akış Şeması</div>
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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:10px; color:#475569;">
          <span><strong>Kurum:</strong> HİZEL OTOMOTİV İNŞ.A.Ş / Humanius HRMS</span>
          <span><strong>Kadro Yapısı:</strong> ${employees.length} Çalışan · ${deptPosMap.size} Departman</span>
        </div>

        <!-- YATAY HİYERARŞİK AĞAÇ MODELİ -->
        <div class="tree-root">
          <div class="tree-root-box">
            🏢 Şirket Genel Yönetim Kurulu <span style="font-size:9.5px; font-weight:normal; opacity:0.9;">(${employees.length} Çalışan)</span>
          </div>
        </div>

        <div class="htree-wrapper">
          ${Array.from(deptPosMap.entries()).map(([dept, posMap]) => `
            <div class="htree-dept-block">
              <div class="htree-dept-sidebar" style="border-right-color: ${getColor(dept)};">
                <div class="htree-dept-title">🏢 ${dept}</div>
                <div class="htree-dept-count">${Array.from(posMap.values()).flat().length} Çalışan</div>
              </div>
              <div class="htree-positions-container">
                ${Array.from(posMap.entries()).map(([pos, emps]) => `
                  <div class="htree-pos-row">
                    <div class="htree-pos-badge">
                      <span>💼 ${pos}</span>
                      <span style="font-size:8.5px; opacity:0.8;">(${emps.length})</span>
                    </div>
                    <span class="htree-arrow">➔</span>
                    <div class="htree-emp-group">
                      ${emps.map(e => `<div class="htree-emp-box">${e.name}</div>`).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Yasal Beyan & Uyum Metni -->
        <div class="legal-note">
          <strong>Resmi Beyan & Uyumluluk:</strong> İşbu Yatay Hiyerarşik Organizasyon Şeması Belgesi, 4857 sayılı İş Kanunu, 6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve ISO 9001 Kalite Yönetim Sistemi standartlarına uygun tanzim edilmiş resmi evraktır.
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
            {employees.length} personel · {deptPosMap.size} departman
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPdfPreview(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors"
            title="Şema Baskı Önizlemesi"
          >
            <Eye className="w-3.5 h-3.5" />
            PDF Önizleme
          </button>
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            title="Yatay Hiyerarşik Ağaç Şemasını PDF Olarak İndir / Yazdır"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF İndir / Yazdır (Yatay Ağaç)
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
          {Array.from(deptPosMap.entries()).map(([dept, posMap]) => (
            <div key={dept}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getColor(dept) }}
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
                    Yatay Hiyerarşik Ağaç Şeması Önizlemesi
                    <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">A4 Yatay (Landscape)</span>
                  </h3>
                  <p className="text-xs text-gray-500">Departman ➔ Pozisyon ➔ Personel bağlantılı akış şeması</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { handlePrintPdf(); setShowPdfPreview(false); }}
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
                      <p className="text-[10px] font-bold text-blue-600 tracking-wider">YATAY HİYERARŞİK ORGANİZASYON ŞEMASI</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs px-3 py-1 rounded-full">
                      {employees.length} PERSONEL · {deptPosMap.size} DEPARTMAN
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">Rapor Tarihi: {todayStr}</p>
                  </div>
                </div>

                {/* Yatay Ağaç Hiyerarşisi Önizlemesi */}
                <div className="space-y-4">
                  <div className="inline-block bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-extrabold text-xs px-5 py-1.5 rounded-lg shadow-sm">
                    🏢 Şirket Genel Yönetim Kurulu <span className="text-[10px] font-normal opacity-90">({employees.length} Çalışan)</span>
                  </div>

                  <div className="space-y-3">
                    {Array.from(deptPosMap.entries()).map(([dept, posMap]) => (
                      <div key={dept} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs flex">
                        <div className="w-36 bg-gray-50 p-2.5 border-r-4 flex flex-col justify-center" style={{ borderRightColor: getColor(dept) }}>
                          <span className="font-bold text-xs text-gray-900">🏢 {dept}</span>
                          <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold mt-1 w-fit">
                            {Array.from(posMap.values()).flat().length} Çalışan
                          </span>
                        </div>

                        <div className="flex-1 p-2.5 flex flex-col gap-2 justify-center">
                          {Array.from(posMap.entries()).map(([pos, emps]) => (
                            <div key={pos} className="flex items-center gap-2">
                              <div className="bg-blue-50 border border-blue-200 text-blue-800 font-bold text-[10px] px-2.5 py-1 rounded-md flex-shrink-0 flex items-center justify-between min-w-[120px]">
                                <span>💼 {pos}</span>
                                <span className="text-[9px] text-blue-500 font-normal ml-1">({emps.length})</span>
                              </div>
                              <span className="text-blue-500 font-black text-xs">➔</span>
                              <div className="flex flex-wrap gap-1.5 flex-1 pl-1 border-l-2 border-gray-200">
                                {emps.map((e) => (
                                  <span key={e.id} className="bg-gray-50 border border-gray-200 text-gray-900 font-semibold text-[10px] px-2 py-0.5 rounded">
                                    {e.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
