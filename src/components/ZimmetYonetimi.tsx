import React, { useState, useEffect } from 'react';
import { Plus, Search, QrCode, CheckCircle, AlertTriangle, Clock, Package, Laptop, Smartphone, Car, Key, Monitor, Printer, X, Save, Edit2, Trash2, Loader2 } from 'lucide-react';
import type { Employee } from '../types';
import { zimmetService, Zimmet, ZimmetKategori, ZimmetDurum, ZimmetInsert } from '../services/zimmetService';
import { useAuth } from '../contexts/AuthContext';

const getKategoriIkon = (kategori: string): React.ReactNode => {
  const norm = (kategori || '').toLowerCase();
  if (norm.includes('bilgisayar') || norm.includes('laptop') || norm.includes('pc')) return <Laptop className="w-4 h-4" />;
  if (norm.includes('telefon') || norm.includes('phone') || norm.includes('mobil')) return <Smartphone className="w-4 h-4" />;
  if (norm.includes('araç') || norm.includes('arac') || norm.includes('araba')) return <Car className="w-4 h-4" />;
  if (norm.includes('anahtar')) return <Key className="w-4 h-4" />;
  if (norm.includes('monitör') || norm.includes('monitor') || norm.includes('ekran')) return <Monitor className="w-4 h-4" />;
  if (norm.includes('yazıcı') || norm.includes('yazici') || norm.includes('printer')) return <Printer className="w-4 h-4" />;
  return <Package className="w-4 h-4" />;
};

const getKategoriRenk = (kategori: string): string => {
  const norm = (kategori || '').toLowerCase();
  if (norm.includes('bilgisayar') || norm.includes('laptop')) return '#6366f1';
  if (norm.includes('telefon')) return '#3b82f6';
  if (norm.includes('araç') || norm.includes('arac')) return '#f59e0b';
  if (norm.includes('anahtar')) return '#ef4444';
  if (norm.includes('monitör') || norm.includes('monitor')) return '#8b5cf6';
  if (norm.includes('yazıcı') || norm.includes('yazici')) return '#10b981';
  return '#64748b';
};

const DURUM_RENK: Record<ZimmetDurum, string> = {
  aktif: 'bg-green-100 text-green-700',
  'iade-edildi': 'bg-gray-100 text-gray-600',
  kayip: 'bg-red-100 text-red-700',
  bakimda: 'bg-yellow-100 text-yellow-700',
};
const DURUM_ETIKET: Record<ZimmetDurum, string> = {
  aktif: 'Kullanımda',
  'iade-edildi': 'İade Edildi',
  kayip: 'Kayıp/Çalıntı',
  bakimda: 'Bakımda',
};

interface ZimmetFormState {
  seriNo: string;
  ad: string;
  kategori: ZimmetKategori;
  marka: string;
  model: string;
  deger: string;
  aciklama: string;
}

function ZimmetQRModal({ zimmet, onClose }: { zimmet: Zimmet; onClose: () => void }) {
  const qrData = `ZIMMET:${zimmet.seri_no}:${zimmet.ad}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-800">Zimmet QR Kodu</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white border-4 border-gray-800 rounded-xl p-4 inline-block mx-auto">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(11, 1fr)', width: 110 }}>
            {Array.from({ length: 121 }).map((_, i) => {
              const hash = (qrData.charCodeAt(i % qrData.length) + i * 37) % 7;
              return (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 ${hash < 3 ? 'bg-gray-900' : 'bg-white'}`}
                />
              );
            })}
          </div>
        </div>

        <div>
          <p className="font-mono text-sm bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700 inline-block">
            {zimmet.seri_no}
          </p>
        </div>
        <p className="text-sm font-semibold text-gray-800">{zimmet.ad}</p>
        <button
          onClick={() => { window.print(); onClose(); }}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          Yazdır / PDF
        </button>
      </div>
    </div>
  );
}

interface ZimmetYonetimiProps {
  employees: Employee[];
}

const ZimmetYonetimi: React.FC<ZimmetYonetimiProps> = ({ employees }) => {
  const { profile, appRole, isAdmin, isHr } = useAuth();
  const isAdminOrHR = appRole === 'superadmin' || appRole === 'admin' || appRole === 'hr';

  const [zimmetler, setZimmetler] = useState<Zimmet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [aramaMetni, setAramaMetni] = useState('');
  const [filtreDurum, setFiltreDurum] = useState<ZimmetDurum | 'hepsi'>('hepsi');
  const [filtreKategori, setFiltreKategori] = useState<ZimmetKategori | 'hepsi'>('hepsi');
  
  const [qrZimmet, setQrZimmet] = useState<Zimmet | null>(null);
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [atamaPaneli, setAtamaPaneli] = useState<Zimmet | null>(null);
  const [silOnay, setSilOnay] = useState<string | null>(null);
  
  const [form, setForm] = useState<ZimmetFormState>({
    seriNo: '', ad: '', kategori: '', marka: '', model: '', deger: '', aciklama: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await zimmetService.getAll();
      setZimmetler(data);
    } catch (error) {
      console.error("Zimmetler yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtrelenmis = zimmetler.filter((z) => {
    const eslesti =
      z.ad.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      z.seri_no.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      (z.marka || '').toLowerCase().includes(aramaMetni.toLowerCase());
    const durumOk = filtreDurum === 'hepsi' || z.durum === filtreDurum;
    const kategoriOk = filtreKategori === 'hepsi' || z.kategori === filtreKategori;
    return eslesti && durumOk && kategoriOk;
  });

  const istatistik = {
    toplam: zimmetler.length,
    aktif: zimmetler.filter((z) => z.durum === 'aktif').length,
    atanmamis: zimmetler.filter((z) => z.durum !== 'iade-edildi' && !z.atanan_employee_id).length,
    toplamDeger: zimmetler.reduce((sum, z) => sum + Number(z.deger || 0), 0),
  };

  async function kaydet() {
    const targetCompId = profile?.company_id || (employees.find(e => e.company_id)?.company_id) || '11111111-1111-1111-1111-111111111111';
    setIsSaving(true);
    
    try {
      const payload: ZimmetInsert = {
        company_id: targetCompId,
        seri_no: form.seriNo,
        ad: form.ad,
        kategori: form.kategori,
        marka: form.marka,
        model: form.model,
        deger: parseFloat(form.deger) || 0,
        durum: 'aktif',
        atanan_employee_id: null,
        atanma_tarihi: null,
        iade_tarihi: null,
        aciklama: form.aciklama,
      };

      if (duzenlenenId) {
        await zimmetService.update(duzenlenenId, payload);
      } else {
        await zimmetService.create(payload);
      }

      await loadData();
      setFormAcik(false);
      setDuzenlenenId(null);
    } catch (error) {
      console.error("Kaydetme hatası", error);
      alert("Bir hata oluştu");
    } finally {
      setIsSaving(false);
    }
  }

  async function sil() {
    if (!silOnay) return;
    try {
      await zimmetService.delete(silOnay);
      await loadData();
    } catch (error) {
      console.error("Silme hatası", error);
    } finally {
      setSilOnay(null);
    }
  }

  async function atamaYap(zimmetId: string, employeeId: string | null) {
    try {
      await zimmetService.atamaYap(zimmetId, employeeId);
      await loadData();
    } catch (error) {
      console.error("Atama hatası", error);
    } finally {
      setAtamaPaneli(null);
    }
  }

  const getEmpName = (id: string | null) => employees.find((e) => e.id === id)?.name ?? '-';

  const getCompanyDisplayName = () => {
    return profile?.company_id 
      ? (employees.find(e => e.company_id === profile.company_id)?.company || 'Humanius Şirket Grubu')
      : (employees.find(e => e.company)?.company || 'Humanius Şirket Grubu');
  };

  const yazdirAtananZimmetler = () => {
    const atananlar = zimmetler.filter((z) => z.atanan_employee_id);
    if (atananlar.length === 0) {
      alert('Henüz personele atanmış aktif bir zimmet kaydı bulunmamaktadır.');
      return;
    }

    const companyName = getCompanyDisplayName();
    const toplamDeger = atananlar.reduce((sum, z) => sum + Number(z.deger || 0), 0);
    const uniqueEmployees = new Set(atananlar.map(z => z.atanan_employee_id)).size;

    const rowsHtml = atananlar.map((z, idx) => {
      const emp = employees.find(e => e.id === z.atanan_employee_id);
      const atanmaTarihiFormatted = z.atanma_tarihi ? new Date(z.atanma_tarihi).toLocaleDateString('tr-TR') : '-';
      return `
        <tr>
          <td style="text-align:center;font-weight:600;color:#64748b;">${idx + 1}</td>
          <td>
            <strong>${z.ad}</strong>
            ${z.aciklama ? `<br><small style="color:#64748b;">${z.aciklama}</small>` : ''}
          </td>
          <td><span class="badge">${z.kategori || 'Genel'}</span></td>
          <td>${[z.marka, z.model].filter(Boolean).join(' ') || '-'}</td>
          <td><code class="seri-no">${z.seri_no}</code></td>
          <td style="text-align:right;font-weight:600;">₺${Number(z.deger || 0).toLocaleString('tr-TR')}</td>
          <td>
            <strong>${emp?.name || 'Bilinmeyen Personel'}</strong>
            ${emp?.tc_no ? `<br><small style="color:#64748b;">TC: ${emp.tc_no}</small>` : ''}
          </td>
          <td>${emp?.department || '-'}${emp?.position ? ` / ${emp.position}` : ''}</td>
          <td style="text-align:center;">${atanmaTarihiFormatted}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <title>Atanan Zimmetler ve Teslimat Raporu - ${companyName}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 20px;
            font-size: 11px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
            color: #1e293b;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .header h2 {
            margin: 4px 0 0 0;
            font-size: 13px;
            color: #2563eb;
            font-weight: 600;
          }
          .header-meta {
            text-align: right;
            font-size: 10px;
            color: #64748b;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }
          .stat-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
          }
          .stat-card .label {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
          }
          .stat-card .value {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 8px 6px;
            border: 1px solid #cbd5e1;
            font-size: 10px;
            text-transform: uppercase;
          }
          td {
            padding: 7px 6px;
            border: 1px solid #e2e8f0;
            font-size: 10px;
            vertical-align: middle;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .badge {
            display: inline-block;
            background: #e0e7ff;
            color: #3730a3;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 9px;
            text-transform: capitalize;
          }
          .seri-no {
            font-family: monospace;
            background: #f1f5f9;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 10px;
          }
          .footer-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .sig-box {
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            padding: 14px;
            text-align: center;
          }
          .sig-title {
            font-weight: 700;
            color: #334155;
            font-size: 11px;
            margin-bottom: 35px;
          }
          .sig-line {
            border-top: 1px solid #94a3b8;
            margin: 0 30px 6px 30px;
          }
          .sig-sub {
            font-size: 9px;
            color: #64748b;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${companyName}</h1>
            <h2>ZİMMETLİ EKİPMANLAR VE PERSONEL TESLİMAT RAPORU</h2>
          </div>
          <div class="header-meta">
            <div><strong>Rapor Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Sistem:</strong> Humanius HRMS Zimmet Takip</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Zimmetli Ekipman Sayısı</div>
            <div class="value">${atananlar.length} Adet</div>
          </div>
          <div class="stat-card">
            <div class="label">Zimmet Sahibi Personel</div>
            <div class="value">${uniqueEmployees} Kişi</div>
          </div>
          <div class="stat-card">
            <div class="label">Toplam Envanter Değeri</div>
            <div class="value">₺${toplamDeger.toLocaleString('tr-TR')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:28px;text-align:center;">#</th>
              <th>Zimmet Adı / Tanım</th>
              <th>Kategori</th>
              <th>Marka / Model</th>
              <th>Seri Numarası</th>
              <th style="text-align:right;">Değer (₺)</th>
              <th>Atanan Personel</th>
              <th>Departman / Pozisyon</th>
              <th style="text-align:center;">Atanma Tarihi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer-signatures">
          <div class="sig-box">
            <div class="sig-title">Raporu Hazırlayan / İnsan Kaynakları Yetkilisi</div>
            <div class="sig-line"></div>
            <div class="sig-sub">İsim - İmza - Kaşe</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Şirket Yöneticisi / İdari İşler Onayı</div>
            <div class="sig-line"></div>
            <div class="sig-sub">İsim - İmza - Kaşe</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
    }
  };

  const yazdirTekZimmet = (z: Zimmet) => {
    const emp = employees.find(e => e.id === z.atanan_employee_id);
    const companyName = getCompanyDisplayName();
    const atanmaTarihiFormatted = z.atanma_tarihi ? new Date(z.atanma_tarihi).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <title>Zimmet Teslim Tutanağı - ${z.ad} - ${emp?.name || 'Personel'}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            font-size: 12px;
            line-height: 1.5;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0 0 4px 0;
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .header h2 {
            margin: 0;
            font-size: 14px;
            color: #2563eb;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .doc-info {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #64748b;
            margin-bottom: 16px;
            padding: 6px 12px;
            background: #f8fafc;
            border-radius: 6px;
          }
          .section-title {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
            background: #e2e8f0;
            padding: 6px 10px;
            margin-top: 16px;
            margin-bottom: 8px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          table.details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          table.details-table td {
            padding: 6px 8px;
            border: 1px solid #e2e8f0;
            font-size: 11px;
          }
          table.details-table td.label {
            width: 28%;
            background: #f8fafc;
            font-weight: 600;
            color: #475569;
          }
          .taahhut-text {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
            font-size: 11px;
            color: #334155;
            text-align: justify;
            margin-top: 16px;
            margin-bottom: 24px;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 24px;
            page-break-inside: avoid;
          }
          .sig-box {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 14px;
            text-align: center;
          }
          .sig-box .title {
            font-weight: 700;
            color: #1e293b;
            font-size: 11px;
            margin-bottom: 45px;
          }
          .sig-box .line {
            border-top: 1px solid #475569;
            margin: 0 20px 6px 20px;
          }
          .sig-box .name {
            font-weight: 600;
            font-size: 11px;
          }
          .sig-box .sub {
            font-size: 10px;
            color: #64748b;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${companyName}</h1>
          <h2>ZİMMET TESLİM VE TAAHHÜT TUTANAĞI</h2>
        </div>

        <div class="doc-info">
          <div><strong>Belge No:</strong> ZMM-${z.seri_no}</div>
          <div><strong>Düzenlenme Tarihi:</strong> ${atanmaTarihiFormatted}</div>
        </div>

        <div class="section-title">1. TESLİM ALAN PERSONEL BİLGİLERİ</div>
        <table class="details-table">
          <tr>
            <td class="label">Adı Soyadı:</td>
            <td><strong>${emp?.name || '-'}</strong></td>
            <td class="label">TC Kimlik No:</td>
            <td>${emp?.tc_no || '-'}</td>
          </tr>
          <tr>
            <td class="label">Departman:</td>
            <td>${emp?.department || '-'}</td>
            <td class="label">Görevi / Pozisyon:</td>
            <td>${emp?.position || '-'}</td>
          </tr>
          <tr>
            <td class="label">İletişim Telefonu:</td>
            <td>${emp?.phone || '-'}</td>
            <td class="label">E-posta:</td>
            <td>${emp?.email || '-'}</td>
          </tr>
        </table>

        <div class="section-title">2. TESLİM EDİLEN ZİMMET / EKİPMAN BİLGİLERİ</div>
        <table class="details-table">
          <tr>
            <td class="label">Ekipman / Zimmet Adı:</td>
            <td><strong>${z.ad}</strong></td>
            <td class="label">Kategori:</td>
            <td>${z.kategori || 'Genel'}</td>
          </tr>
          <tr>
            <td class="label">Marka:</td>
            <td>${z.marka || '-'}</td>
            <td class="label">Model:</td>
            <td>${z.model || '-'}</td>
          </tr>
          <tr>
            <td class="label">Seri Numarası:</td>
            <td><strong style="font-family:monospace;letter-spacing:0.5px;">${z.seri_no}</strong></td>
            <td class="label">Envanter Değeri:</td>
            <td>₺${Number(z.deger || 0).toLocaleString('tr-TR')}</td>
          </tr>
          <tr>
            <td class="label">Teslim Tarihi:</td>
            <td>${atanmaTarihiFormatted}</td>
            <td class="label">Mevcut Durumu:</td>
            <td>Çalışır / Eksiksiz</td>
          </tr>
          <tr>
            <td class="label">Özel Notlar / Açıklama:</td>
            <td colspan="3">${z.aciklama || 'Standart iş amaçlı ekipman teslimi.'}</td>
          </tr>
        </table>

        <div class="section-title">3. TAAHHÜT VE SORUMLULUK BEYANI</div>
        <div class="taahhut-text">
          İşbu tutanak ile yukarıda detayları, marka, model ve seri numarası belirtilen şirket demirbaşını/cihazını eksiksiz, hasarsız ve tam çalışır vaziyette teslim aldım. 
          Zimmet konusu ekipmanı yalnızca şirket faaliyetleri kapsamında ve gerekli özeni göstererek kullanacağımı; üçüncü şahıslara devretmeyeceğimi veya ödünç vermeyeceğimi; 
          meydana gelebilecek kasıt veya ağır ihmal kaynaklı hasar ve kayıplardan sorumlu olacağımı; şirket tarafından talep edildiğinde veya iş akdimin herhangi bir nedenle son bulması durumunda 
          aynı şekilde eksiksiz, hasarsız ve çalışır olarak yetkililere iade edeceğimi gayrikabili rücu kabul, beyan ve taahhüt ederim.
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="title">TESLİM EDEN (ŞİRKET YETKİLİSİ)</div>
            <div class="line"></div>
            <div class="name">İnsan Kaynakları / İdari İşler</div>
            <div class="sub">İmza / Kaşe / Tarih</div>
          </div>
          <div class="sig-box">
            <div class="title">TESLİM ALAN (ÇALIŞAN)</div>
            <div class="line"></div>
            <div class="name">${emp?.name || 'Personel'}</div>
            <div class="sub">İmza / Tarih</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Zimmet Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdminOrHR 
              ? "Şirket ekipmanlarını kayıt altına alın, personele atayın, QR ile takip edin" 
              : "Size atanmış olan şirket ekipmanları ve cihazlar"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={yazdirAtananZimmetler}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 shadow-sm transition-all"
            title="Personele atanmış zimmetlerin detaylı teslimat listesini yazdır / PDF olarak kaydet"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            Atanan Zimmetler Çıktısı
          </button>
          {isAdminOrHR && (
            <button
              onClick={() => { setFormAcik(true); setDuzenlenenId(null); setForm({ seriNo: '', ad: '', kategori: '', marka: '', model: '', deger: '', aciklama: '' }); }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Yeni Zimmet
            </button>
          )}
        </div>
      </div>

      {/* İstatistik kartları (Sadece yöneticiler tüm istatistiği görür, personel kendi sayılarını görür) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { etiket: 'Toplam Zimmet', deger: istatistik.toplam, renk: 'text-indigo-700', bg: 'bg-indigo-50' },
          { etiket: 'Kullanımda', deger: istatistik.aktif, renk: 'text-green-700', bg: 'bg-green-50' },
          ...(isAdminOrHR ? [{ etiket: 'Atanmamış', deger: istatistik.atanmamis, renk: 'text-yellow-700', bg: 'bg-yellow-50' }] : []),
          ...(isAdminOrHR ? [{ etiket: 'Toplam Değer', deger: `₺${istatistik.toplamDeger.toLocaleString('tr-TR')}`, renk: 'text-blue-700', bg: 'bg-blue-50' }] : []),
        ].map((item) => (
          <div key={item.etiket} className={`${item.bg} rounded-2xl border border-white p-4`}>
            <p className="text-xs text-gray-500">{item.etiket}</p>
            <p className={`text-2xl font-bold mt-0.5 ${item.renk}`}>{item.deger}</p>
          </div>
        ))}
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            placeholder="Zimmet, seri no veya marka ara..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select
          value={filtreKategori}
          onChange={(e) => setFiltreKategori(e.target.value as any)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 capitalize"
        >
          <option value="hepsi">Tüm Kategoriler</option>
          {Array.from(new Set(zimmetler.map((z) => z.kategori).filter(Boolean))).map((kat) => (
            <option key={kat} value={kat}>{kat}</option>
          ))}
        </select>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Zimmet</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Seri No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                {isAdminOrHR && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Atanan Personel</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Atanma Tarihi</th>
                {isAdminOrHR && <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">İşlemler</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrelenmis.map((z) => (
                <tr key={z.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: getKategoriRenk(z.kategori) }}
                      >
                        {getKategoriIkon(z.kategori)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{z.ad}</p>
                        <p className="text-xs text-gray-400">{z.marka} {z.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{z.seri_no}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DURUM_RENK[z.durum]}`}>
                      {z.durum === 'aktif' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                       z.durum === 'kayip' ? <AlertTriangle className="w-3 h-3 mr-1" /> :
                       z.durum === 'bakimda' ? <Clock className="w-3 h-3 mr-1" /> : null}
                      {DURUM_ETIKET[z.durum]}
                    </span>
                  </td>
                  {isAdminOrHR && (
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {z.atanan_employee_id ? getEmpName(z.atanan_employee_id) : <span className="text-gray-400 italic">Atanmamış</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-500">{z.atanma_tarihi ? new Date(z.atanma_tarihi).toLocaleDateString('tr-TR') : '-'}</td>
                  
                  {isAdminOrHR && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="Personele Ata / İade Al"
                          onClick={() => setAtamaPaneli(z)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        {z.atanan_employee_id && (
                          <button
                            title="Zimmet Teslim Tutanağı Yazdır (PDF)"
                            onClick={() => yazdirTekZimmet(z)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          title="Düzenle"
                          onClick={() => {
                            setForm({ seriNo: z.seri_no, ad: z.ad, kategori: z.kategori, marka: z.marka || '', model: z.model || '', deger: z.deger.toString(), aciklama: z.aciklama || '' });
                            setDuzenlenenId(z.id);
                            setFormAcik(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          title="Sil"
                          onClick={() => setSilOnay(z.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtrelenmis.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">Zimmet bulunamadı</div>
          )}
        </div>
      </div>



      {/* Atama Paneli Modal */}
      {atamaPaneli && isAdminOrHR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">Zimmet Atama</p>
              <button onClick={() => setAtamaPaneli(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-semibold text-gray-700">{atamaPaneli.ad}</p>
              <p className="text-xs text-gray-400">{atamaPaneli.seri_no}</p>
            </div>
            <p className="text-sm text-gray-600">Personel seçin:</p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              <button
                onClick={() => atamaYap(atamaPaneli.id, null)}
                className="w-full text-left px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50"
              >
                ✕ İade Al / Atamasız Bırak
              </button>
              {employees.filter((e) => e.status === 'active').map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => atamaYap(atamaPaneli.id, emp.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                    atamaPaneli.atanan_employee_id === emp.id
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-xs text-gray-400">{emp.department} · {emp.position}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {silOnay && isAdminOrHR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="font-semibold text-gray-800">Bu zimmeti silmek istiyor musunuz?</p>
            <div className="flex gap-2">
              <button onClick={() => setSilOnay(null)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={sil} className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm hover:bg-red-700">Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Ekle / Düzenle Formu */}
      {formAcik && isAdminOrHR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">{duzenlenenId ? 'Zimmeti Düzenle' : 'Yeni Zimmet Ekle'}</p>
              <button onClick={() => setFormAcik(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Zimmet Adı *</label>
                <input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="ör. MacBook Pro 14" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Seri No *</label>
                <input value={form.seriNo} onChange={(e) => setForm({ ...form, seriNo: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="ör. APL-001" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Kategori</label>
                <input
                  type="text"
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Kategori yazın (ör. Bilgisayar, Kulaklık, Telefon...)"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Marka</label>
                <input value={form.marka} onChange={(e) => setForm({ ...form, marka: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" placeholder="ör. Apple" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Model</label>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" placeholder="ör. MacBook Pro M3" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Değer (₺)</label>
                <input type="number" value={form.deger} onChange={(e) => setForm({ ...form, deger: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Açıklama</label>
                <textarea value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setFormAcik(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={kaydet} disabled={!form.ad || !form.seriNo || isSaving}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZimmetYonetimi;
