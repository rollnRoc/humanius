import React, { useState, useEffect } from 'react';
import { Plus, Search, QrCode, CheckCircle, AlertTriangle, Clock, Package, Laptop, Smartphone, Car, Key, Monitor, Printer, X, Save, Edit2, Trash2, Loader2, Copy, FileText } from 'lucide-react';
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
  atananEmployeeId: string;
  atanmaTarihi: string;
  aciklama: string;
}

interface ZimmetSatirState {
  id: string;
  seriNo: string;
  ad: string;
  kategori: ZimmetKategori;
  marka: string;
  model: string;
  deger: string;
  aciklama: string;
}

const bosZimmetSatiriOlustur = (): ZimmetSatirState => ({
  id: 'row-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now(),
  seriNo: '',
  ad: '',
  kategori: '',
  marka: '',
  model: '',
  deger: '',
  aciklama: '',
});

const formatPara = (val: number | string | undefined | null): string => {
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val || 0);
  if (isNaN(num)) return '₺0,00';
  return `₺${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateTR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('tr-TR');
    }
  } catch {}
  return String(dateStr);
};

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
  const { profile, appRole, user } = useAuth();
  const userRole = (profile?.role || appRole || (user?.user_metadata as any)?.role || '').toLowerCase().trim();
  const isAdminOrHR = userRole === 'superadmin' || userRole === 'admin' || userRole === 'hr';

  const currentEmployee = employees.find(e => 
    (profile?.email && e.email?.toLowerCase().trim() === profile.email.toLowerCase().trim()) ||
    (user?.email && e.email?.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
    e.id === profile?.id
  ) || (employees.length === 1 ? employees[0] : null);
  const currentEmployeeId = currentEmployee?.id;

  const [zimmetler, setZimmetler] = useState<Zimmet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [aramaMetni, setAramaMetni] = useState('');
  const [filtreDurum, setFiltreDurum] = useState<ZimmetDurum | 'hepsi'>('hepsi');
  const [filtreKategori, setFiltreKategori] = useState<ZimmetKategori | 'hepsi'>('hepsi');
  
  type SortField = 'ad' | 'seriNo' | 'durum' | 'personel' | 'tarih' | 'deger';
  const [sortField, setSortField] = useState<SortField>('ad');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  const [qrZimmet, setQrZimmet] = useState<Zimmet | null>(null);
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [atamaPaneli, setAtamaPaneli] = useState<Zimmet | null>(null);
  const [atamaTarihi, setAtamaTarihi] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [silOnay, setSilOnay] = useState<string | null>(null);
  
  const [form, setForm] = useState<ZimmetFormState>({
    seriNo: '',
    ad: '',
    kategori: '',
    marka: '',
    model: '',
    deger: '',
    atananEmployeeId: '',
    atanmaTarihi: new Date().toISOString().split('T')[0],
    aciklama: '',
  });

  const [zimmetSatirlari, setZimmetSatirlari] = useState<ZimmetSatirState[]>(() => [bosZimmetSatiriOlustur()]);

  const yeniZimmetModalAc = (varsayilanPersonelId: string = '') => {
    const bugun = new Date().toISOString().split('T')[0];
    setDuzenlenenId(null);
    setForm({
      seriNo: '',
      ad: '',
      kategori: '',
      marka: '',
      model: '',
      deger: '',
      atananEmployeeId: varsayilanPersonelId,
      atanmaTarihi: bugun,
      aciklama: '',
    });
    setZimmetSatirlari([bosZimmetSatiriOlustur()]);
    setFormAcik(true);
  };

  const yeniSatirEkle = () => {
    setZimmetSatirlari((prev) => [...prev, bosZimmetSatiriOlustur()]);
  };

  const satirCogalt = (index: number) => {
    setZimmetSatirlari((prev) => {
      const kaynak = prev[index];
      if (!kaynak) return prev;
      const kopya: ZimmetSatirState = {
        ...bosZimmetSatiriOlustur(),
        ad: kaynak.ad,
        kategori: kaynak.kategori,
        marka: kaynak.marka,
        model: kaynak.model,
        deger: kaynak.deger,
        aciklama: kaynak.aciklama,
        seriNo: '',
      };
      const yeni = [...prev];
      yeni.splice(index + 1, 0, kopya);
      return yeni;
    });
  };

  const satirSil = (id: string) => {
    setZimmetSatirlari((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  };

  const satirGuncelle = (id: string, field: keyof Omit<ZimmetSatirState, 'id'>, value: string) => {
    setZimmetSatirlari((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await zimmetService.getAll(isAdminOrHR ? undefined : (currentEmployeeId || undefined));
      if (!isAdminOrHR) {
        // Normal personel yalnızca kendi üstüne kayıtlı zimmetleri görebilir
        const userZimmetler = (data || []).filter(z => 
          currentEmployeeId && z.atanan_employee_id === currentEmployeeId
        );
        setZimmetler(userZimmetler);
      } else {
        setZimmetler(data || []);
      }
    } catch (error) {
      console.error("Zimmetler yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentEmployeeId, isAdminOrHR]);

  const filtrelenmis = zimmetler.filter((z) => {
    if (!isAdminOrHR && currentEmployeeId && z.atanan_employee_id !== currentEmployeeId) {
      return false;
    }
    const eslesti =
      z.ad.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      z.seri_no.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      (z.marka || '').toLowerCase().includes(aramaMetni.toLowerCase());
    const durumOk = filtreDurum === 'hepsi' || z.durum === filtreDurum;
    const kategoriOk = filtreKategori === 'hepsi' || z.kategori === filtreKategori;
    return eslesti && durumOk && kategoriOk;
  }).sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'ad':
        cmp = (a.ad || '').localeCompare(b.ad || '', 'tr');
        break;
      case 'seriNo':
        cmp = (a.seri_no || '').localeCompare(b.seri_no || '', 'tr');
        break;
      case 'durum':
        cmp = (a.durum || '').localeCompare(b.durum || '', 'tr');
        break;
      case 'personel': {
        const pA = a.atanan_employee_id ? getEmpName(a.atanan_employee_id) : '';
        const pB = b.atanan_employee_id ? getEmpName(b.atanan_employee_id) : '';
        cmp = pA.localeCompare(pB, 'tr');
        break;
      }
      case 'tarih':
        cmp = (a.atanma_tarihi || '').localeCompare(b.atanma_tarihi || '');
        break;
      case 'deger':
        cmp = Number(a.deger || 0) - Number(b.deger || 0);
        break;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const istatistik = {
    toplam: zimmetler.length,
    aktif: zimmetler.filter((z) => z.durum === 'aktif').length,
    atanmamis: zimmetler.filter((z) => z.durum !== 'iade-edildi' && !z.atanan_employee_id).length,
    toplamDeger: zimmetler.reduce((sum, z) => sum + Number(z.deger || 0), 0),
  };

  async function kaydet(yazdirSonrasi: boolean = false) {
    const targetCompId = profile?.company_id || (employees.find(e => e.company_id)?.company_id) || '11111111-1111-1111-1111-111111111111';
    setIsSaving(true);
    
    try {
      const secilenPersonel = form.atananEmployeeId ? form.atananEmployeeId : null;
      const secilenTarih = form.atanmaTarihi ? form.atanmaTarihi : (secilenPersonel ? new Date().toISOString().split('T')[0] : null);

      if (duzenlenenId) {
        const parsedDeger = form.deger ? parseFloat(String(form.deger).replace(',', '.')) : 0;
        const cleanDeger = isNaN(parsedDeger) ? 0 : Number(parsedDeger.toFixed(2));
        const existingItem = zimmetler.find(z => z.id === duzenlenenId) || null;

        const payload: ZimmetInsert = {
          company_id: targetCompId,
          seri_no: form.seriNo.trim(),
          ad: form.ad.trim(),
          kategori: form.kategori.trim() || 'Genel',
          marka: form.marka.trim() || null,
          model: form.model.trim() || null,
          deger: cleanDeger,
          durum: secilenPersonel ? 'aktif' : (existingItem ? existingItem.durum : 'aktif'),
          atanan_employee_id: secilenPersonel,
          atanma_tarihi: secilenTarih,
          iade_tarihi: existingItem ? existingItem.iade_tarihi : null,
          aciklama: form.aciklama.trim() || null,
        };

        await zimmetService.update(duzenlenenId, payload);
      } else {
        const gecerliSatirlar = zimmetSatirlari.filter(s => s.ad.trim() && s.seriNo.trim());
        if (gecerliSatirlar.length === 0) {
          alert('Lütfen en az bir zimmet için Zimmet Adı ve Seri No bilgilerini doldurun.');
          setIsSaving(false);
          return;
        }

        const payloads: ZimmetInsert[] = gecerliSatirlar.map((satir) => {
          const parsedDeger = satir.deger ? parseFloat(String(satir.deger).replace(',', '.')) : 0;
          const cleanDeger = isNaN(parsedDeger) ? 0 : Number(parsedDeger.toFixed(2));
          return {
            company_id: targetCompId,
            seri_no: satir.seriNo.trim(),
            ad: satir.ad.trim(),
            kategori: satir.kategori.trim() || 'Genel',
            marka: satir.marka.trim() || null,
            model: satir.model.trim() || null,
            deger: cleanDeger,
            durum: 'aktif',
            atanan_employee_id: secilenPersonel,
            atanma_tarihi: secilenTarih,
            iade_tarihi: null,
            aciklama: satir.aciklama.trim() || null,
          };
        });

        const yeniKayitlar = await zimmetService.createBulk(payloads);
        await loadData();
        setFormAcik(false);
        setDuzenlenenId(null);

        if (yazdirSonrasi && secilenPersonel) {
          // Mevcut + yeni eklenen tüm zimmetleriyle kişi bazlı tutanak yazdır
          const mevcutKisiZimmetleri = zimmetler.filter(
            (z) => z.atanan_employee_id === secilenPersonel && z.durum !== 'iade-edildi'
          );
          const birlesikListe = [
            ...yeniKayitlar,
            ...mevcutKisiZimmetleri.filter((m) => !yeniKayitlar.some((y) => y.id === m.id)),
          ];
          yazdirKisiTopluZimmet(secilenPersonel, birlesikListe);
        }
        return;
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

  async function atamaYap(zimmetId: string, employeeId: string | null, customTarih?: string) {
    try {
      const islemTarihi = customTarih || atamaTarihi || new Date().toISOString().split('T')[0];
      await zimmetService.atamaYap(zimmetId, employeeId, islemTarihi);
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

  const yazdirKisiTopluZimmet = (employeeId: string, ozelListe?: Zimmet[]) => {
    const emp = employees.find((e) => e.id === employeeId);
    const kisiZimmetleri = (ozelListe || zimmetler).filter(
      (z) => z.atanan_employee_id === employeeId && z.durum !== 'iade-edildi'
    );

    if (kisiZimmetleri.length === 0) {
      alert('Bu personele ait aktif zimmet kaydı bulunamadı.');
      return;
    }

    const companyName = getCompanyDisplayName();
    const toplamDeger = kisiZimmetleri.reduce((sum, z) => sum + Number(z.deger || 0), 0);
    const bugunFormatted = new Date().toLocaleDateString('tr-TR');

    const rowsHtml = kisiZimmetleri
      .map((z, idx) => {
        const tarihFormatted = z.atanma_tarihi
          ? new Date(z.atanma_tarihi).toLocaleDateString('tr-TR')
          : bugunFormatted;
        return `
          <tr>
            <td style="text-align:center;font-weight:700;color:#475569;">${idx + 1}</td>
            <td>
              <strong>${z.ad}</strong>
              ${z.aciklama ? `<br><small style="color:#64748b;">${z.aciklama}</small>` : ''}
            </td>
            <td>${z.kategori || 'Genel'}</td>
            <td>${[z.marka, z.model].filter(Boolean).join(' ') || '-'}</td>
            <td><strong style="font-family:monospace;letter-spacing:0.4px;">${z.seri_no}</strong></td>
            <td style="text-align:center;">${tarihFormatted}</td>
            <td style="text-align:right;font-weight:600;">${formatPara(z.deger)}</td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <title>Kişi Bazlı Toplu Zimmet Teslim Tutanağı - ${emp?.name || 'Personel'}</title>
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            font-size: 11.5px;
            line-height: 1.45;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .header h1 {
            margin: 0 0 4px 0;
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .header h2 {
            margin: 0;
            font-size: 13.5px;
            color: #2563eb;
            font-weight: 700;
            letter-spacing: 0.4px;
          }
          .doc-info {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #475569;
            margin-bottom: 14px;
            padding: 6px 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
          }
          .section-title {
            font-size: 11.5px;
            font-weight: 700;
            color: #1e293b;
            background: #e2e8f0;
            padding: 6px 10px;
            margin-top: 14px;
            margin-bottom: 8px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          table.details-table, table.items-table {
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
            width: 24%;
            background: #f8fafc;
            font-weight: 600;
            color: #475569;
          }
          table.items-table th {
            background: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            text-align: left;
            padding: 7px 6px;
            border: 1px solid #cbd5e1;
            font-size: 10px;
            text-transform: uppercase;
          }
          table.items-table td {
            padding: 6px 6px;
            border: 1px solid #e2e8f0;
            font-size: 10.5px;
            vertical-align: middle;
          }
          table.items-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .summary-row td {
            background: #eef2ff !important;
            font-weight: 700;
            color: #1e1b4b;
            border-top: 2px solid #6366f1 !important;
          }
          .taahhut-text {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 11px 12px;
            font-size: 10.5px;
            color: #334155;
            text-align: justify;
            margin-top: 12px;
            margin-bottom: 20px;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 28px;
            margin-top: 20px;
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
            margin-bottom: 42px;
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
          <h2>PERSONEL ZİMMET TESLİM VE TAAHHÜT TUTANAĞI (${kisiZimmetleri.length} KALEM)</h2>
        </div>

        <div class="doc-info">
          <div><strong>Personel:</strong> ${emp?.name || '-'}</div>
          <div><strong>Toplam Zimmet Adedi:</strong> ${kisiZimmetleri.length} Adet</div>
          <div><strong>Düzenlenme Tarihi:</strong> ${bugunFormatted}</div>
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
            <td class="label">Departman / Şube:</td>
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

        <div class="section-title">2. TESLİM EDİLEN ZİMMET / EKİPMAN LİSTESİ</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width:28px;text-align:center;">#</th>
              <th>Zimmet / Ekipman Adı & Açıklama</th>
              <th>Kategori</th>
              <th>Marka / Model</th>
              <th>Seri Numarası</th>
              <th style="text-align:center;">Teslim Tarihi</th>
              <th style="text-align:right;">Değer (₺)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="summary-row">
              <td colspan="6" style="text-align:right;padding-right:10px;">TOPLAM (${kisiZimmetleri.length} Adet Zimmet Kalemi):</td>
              <td style="text-align:right;">${formatPara(toplamDeger)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">3. TAAHHÜT VE SORUMLULUK BEYANI</div>
        <div class="taahhut-text">
          İşbu tutanakta listelenen <strong>${kisiZimmetleri.length} adet</strong> şirket demirbaşını/ekipmanını (yukarıda marka, model ve seri numaraları belirtilen cihaz ve malzemeleri) eksiksiz, hasarsız ve tam çalışır vaziyette teslim aldım.
          Zimmet konusu ekipmanları yalnızca şirket faaliyetleri kapsamında ve gerekli özeni göstererek kullanacağımı; üçüncü şahıslara devretmeyeceğimi veya ödünç vermeyeceğimi;
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
              ? "Şirket ekipmanlarını kayıt altına alın, personele tekli veya toplu zimmet atayın" 
              : "Size atanmış olan şirket ekipmanları ve cihazlar"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isAdminOrHR && currentEmployeeId && zimmetler.length > 0 && (
            <button
              onClick={() => yazdirKisiTopluZimmet(currentEmployeeId)}
              className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-100 shadow-sm transition-all"
              title="Üzerinizdeki tüm zimmetleri tek bir tutanakta yazdır / PDF kaydet"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              Toplu Zimmet Tutanağım (PDF)
            </button>
          )}
          <button
            onClick={yazdirAtananZimmetler}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 shadow-sm transition-all"
            title="Personele atanmış zimmetlerin detaylı teslimat listesini yazdır / PDF olarak kaydet"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            {isAdminOrHR ? 'Atanan Zimmetler Çıktısı' : 'Zimmetlerim Çıktısı'}
          </button>
          {isAdminOrHR && (
            <button
              onClick={() => yeniZimmetModalAc('')}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Yeni Zimmet Ekle
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
          ...(isAdminOrHR ? [{ etiket: 'Toplam Değer', deger: formatPara(istatistik.toplamDeger), renk: 'text-blue-700', bg: 'bg-blue-50' }] : []),
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
                <th
                  onClick={() => handleSort('ad')}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  title={sortField === 'ad' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'Zimmet adına göre sırala'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Zimmet</span>
                    {sortField === 'ad' ? (
                      <>
                        <span className="text-indigo-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        <span className="text-[10px] lowercase font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300 text-xs">↕</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('seriNo')}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  title={sortField === 'seriNo' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'Seri numarasına göre sırala'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Seri No</span>
                    {sortField === 'seriNo' ? (
                      <>
                        <span className="text-indigo-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        <span className="text-[10px] lowercase font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300 text-xs">↕</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('durum')}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  title={sortField === 'durum' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'Duruma göre sırala'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Durum</span>
                    {sortField === 'durum' ? (
                      <>
                        <span className="text-indigo-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        <span className="text-[10px] lowercase font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300 text-xs">↕</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('deger')}
                  className="text-right px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  title={sortField === 'deger' ? (sortOrder === 'asc' ? 'Küçükten Büyüğe' : 'Büyükten Küçüğe') : 'Değere göre sırala'}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Değer (₺)</span>
                    {sortField === 'deger' ? (
                      <>
                        <span className="text-indigo-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        <span className="text-[10px] lowercase font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {sortOrder === 'asc' ? '0-9' : '9-0'}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300 text-xs">↕</span>
                    )}
                  </div>
                </th>
                {isAdminOrHR && (
                  <th
                    onClick={() => handleSort('personel')}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    title={sortField === 'personel' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'Personele göre sırala'}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Atanan Personel</span>
                      {sortField === 'personel' ? (
                        <>
                          <span className="text-indigo-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          <span className="text-[10px] lowercase font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-300 text-xs">↕</span>
                      )}
                    </div>
                  </th>
                )}
                <th
                  onClick={() => handleSort('tarih')}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  title={sortField === 'tarih' ? (sortOrder === 'asc' ? 'Eskiden Yeniye' : 'Yeniden Eskiye') : 'Atanma tarihine göre sırala'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Atanma Tarihi</span>
                    {sortField === 'tarih' ? (
                      <>
                        <span className="text-indigo-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        <span className="text-[10px] lowercase font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {sortOrder === 'asc' ? '0-9' : '9-0'}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300 text-xs">↕</span>
                    )}
                  </div>
                </th>
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
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 font-mono text-sm whitespace-nowrap">
                    {formatPara(z.deger)}
                  </td>
                  {isAdminOrHR && (
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {z.atanan_employee_id ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">{getEmpName(z.atanan_employee_id)}</span>
                          {(() => {
                            const kisiZimmetSayisi = zimmetler.filter(
                              (item) => item.atanan_employee_id === z.atanan_employee_id && item.durum !== 'iade-edildi'
                            ).length;
                            return kisiZimmetSayisi > 1 ? (
                              <button
                                type="button"
                                onClick={() => yazdirKisiTopluZimmet(z.atanan_employee_id!)}
                                title={`${getEmpName(z.atanan_employee_id)} adına kayıtlı tüm zimmetleri (${kisiZimmetSayisi} adet) tek bir A4 tutanakta yazdır`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                {kisiZimmetSayisi} Zimmet · Toplu Tutanak
                              </button>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Atanmamış</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-medium">
                    {formatDateTR(z.atanma_tarihi)}
                  </td>
                  
                  {isAdminOrHR && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {z.atanan_employee_id && (
                          <button
                            title={`${getEmpName(z.atanan_employee_id)} adına yeni zimmet(ler) ekle`}
                            onClick={() => yeniZimmetModalAc(z.atanan_employee_id || '')}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          title="Personele Ata / İade Al"
                          onClick={() => {
                            setAtamaPaneli(z);
                            setAtamaTarihi(z.atanma_tarihi || new Date().toISOString().split('T')[0]);
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        {z.atanan_employee_id && (
                          <>
                            <button
                              title="Bu Zimmetin Teslim Tutanağını Yazdır (Tekil PDF)"
                              onClick={() => yazdirTekZimmet(z)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              title={`${getEmpName(z.atanan_employee_id)} - Kişi Bazlı Toplu Zimmet Tutanağı Yazdır (Tüm Zimmetleri Tek A4'te)`}
                              onClick={() => yazdirKisiTopluZimmet(z.atanan_employee_id!)}
                              className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          title="Düzenle"
                          onClick={() => {
                            setForm({
                              seriNo: z.seri_no,
                              ad: z.ad,
                              kategori: z.kategori,
                              marka: z.marka || '',
                              model: z.model || '',
                              deger: (z.deger !== undefined && z.deger !== null) ? z.deger.toString() : '',
                              atananEmployeeId: z.atanan_employee_id || '',
                              atanmaTarihi: z.atanma_tarihi || (z.created_at ? z.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
                              aciklama: z.aciklama || '',
                            });
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
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="font-bold text-gray-800">Zimmet Atama / Teslimat</p>
                <p className="text-xs text-gray-500 mt-0.5">Personele zimmet atayın veya iade işlemi gerçekleştirin</p>
              </div>
              <button onClick={() => setAtamaPaneli(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">{atamaPaneli.ad}</p>
                <p className="text-xs font-mono text-gray-500 mt-0.5">{atamaPaneli.seri_no} · {atamaPaneli.kategori || 'Genel'}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-indigo-700 font-mono">{formatPara(atamaPaneli.deger)}</span>
              </div>
            </div>

            {/* Tarih Seçimi */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                İşlem / Teslim Tarihi *
              </label>
              <input
                type="date"
                value={atamaTarihi}
                onChange={(e) => setAtamaTarihi(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 font-medium"
              />
            </div>

            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">İşlem veya Personel Seçin:</p>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              <button
                onClick={() => atamaYap(atamaPaneli.id, null, atamaTarihi)}
                className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-rose-300 text-sm font-medium text-rose-700 hover:bg-rose-50 flex items-center justify-between transition-colors"
              >
                <span>✕ İade Al / Atamasız Bırak</span>
                <span className="text-xs text-rose-500 font-normal">({formatDateTR(atamaTarihi)} iade tarihi)</span>
              </button>
              {employees.filter((e) => e.status === 'active' || e.status === 'onLeave').map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => atamaYap(atamaPaneli.id, emp.id, atamaTarihi)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                    atamaPaneli.atanan_employee_id === emp.id
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800 shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{emp.name}</p>
                    {atamaPaneli.atanan_employee_id === emp.id && (
                      <span className="text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-md">
                        Mevcut Sahibi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{emp.department || 'Genel'} · {emp.position || 'Personel'}</p>
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
          <div className={`bg-white rounded-2xl shadow-2xl w-full ${duzenlenenId ? 'max-w-lg' : 'max-w-3xl'} p-6 space-y-4 max-h-[92vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="font-bold text-gray-900 text-base">
                  {duzenlenenId ? 'Zimmeti Düzenle' : 'Yeni Zimmet Ekle (Tekli / Çoklu)'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {duzenlenenId
                    ? 'Demirbaş/cihaz bilgilerini, teslim tarihini ve küsüratlı tutarını güncelleyin'
                    : 'Personeli ve teslim tarihini seçip aynı ekranda birden fazla zimmet satırı ekleyebilirsiniz'}
                </p>
              </div>
              <button onClick={() => setFormAcik(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <datalist id="zimmet-kategori-listesi">
              <option value="Bilgisayar" />
              <option value="Telefon" />
              <option value="Araç" />
              <option value="Monitör" />
              <option value="Anahtar" />
              <option value="Yazıcı" />
              <option value="Tablet" />
              <option value="Hat / SIM Kart" />
              <option value="Genel" />
            </datalist>

            {duzenlenenId ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Zimmet Adı *</label>
                    <input
                      value={form.ad}
                      onChange={(e) => setForm({ ...form, ad: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                      placeholder="ör. MacBook Pro 14"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Seri No *</label>
                    <input
                      value={form.seriNo}
                      onChange={(e) => setForm({ ...form, seriNo: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 font-mono"
                      placeholder="ör. APL-001"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Kategori</label>
                    <input
                      type="text"
                      list="zimmet-kategori-listesi"
                      value={form.kategori}
                      onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                      placeholder="ör. Bilgisayar, Telefon, Araç..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Marka</label>
                    <input
                      value={form.marka}
                      onChange={(e) => setForm({ ...form, marka: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                      placeholder="ör. Apple"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Model</label>
                    <input
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                      placeholder="ör. MacBook Pro M3"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">Değer / Tutar (₺)</label>
                      <span className="text-[10px] text-indigo-600 font-medium">Küsüratlı (0.01)</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₺</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.deger}
                        onChange={(e) => setForm({ ...form, deger: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 font-mono font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Zimmet / Teslim Tarihi *
                    </label>
                    <input
                      type="date"
                      value={form.atanmaTarihi}
                      onChange={(e) => setForm({ ...form, atanmaTarihi: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 font-medium"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Atanan Personel (İsteğe Bağlı)
                    </label>
                    <select
                      value={form.atananEmployeeId}
                      onChange={(e) => setForm({ ...form, atananEmployeeId: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      <option value="">Henüz Atanmadı (Boşta / Stokta)</option>
                      {employees.filter(e => e.status === 'active' || e.status === 'onLeave').map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.department || 'Genel'} {emp.position ? `(${emp.position})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Açıklama</label>
                    <textarea
                      value={form.aciklama}
                      onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                      placeholder="Ekipman teslim durumu veya seri no detayları..."
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setFormAcik(false)}
                    className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={() => kaydet(false)}
                    disabled={!form.ad || !form.seriNo || isSaving}
                    className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-200"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Güncelle
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* 1. Ortak Personel & Teslim Tarihi Alanı */}
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      1. Atanacak Kişi ve Teslim Tarihi
                    </p>
                    {form.atananEmployeeId && (() => {
                      const mevcutAdet = zimmetler.filter(
                        (z) => z.atanan_employee_id === form.atananEmployeeId && z.durum !== 'iade-edildi'
                      ).length;
                      return (
                        <span className="text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 px-2.5 py-0.5 rounded-full">
                          Seçili Personel: {getEmpName(form.atananEmployeeId)} (Mevcut: {mevcutAdet} zimmet)
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Atanan Personel (İsteğe Bağlı)
                      </label>
                      <select
                        value={form.atananEmployeeId}
                        onChange={(e) => setForm({ ...form, atananEmployeeId: e.target.value })}
                        className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white font-medium"
                      >
                        <option value="">Henüz Atanmadı (Boşta / Stokta)</option>
                        {employees.filter(e => e.status === 'active' || e.status === 'onLeave').map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} — {emp.department || 'Genel'} {emp.position ? `(${emp.position})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Zimmet / Teslim Tarihi *
                      </label>
                      <input
                        type="date"
                        value={form.atanmaTarihi}
                        onChange={(e) => setForm({ ...form, atanmaTarihi: e.target.value })}
                        className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Çoklu Zimmet Satırları */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      2. Eklenecek Zimmet Kalemleri ({zimmetSatirlari.length} Satır)
                    </p>
                    <button
                      type="button"
                      onClick={yeniSatirEkle}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {form.atananEmployeeId
                        ? `${getEmpName(form.atananEmployeeId)} Adına Zimmet Satırı Ekle`
                        : 'Yeni Zimmet Satırı Ekle'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {zimmetSatirlari.map((satir, idx) => (
                      <div
                        key={satir.id}
                        className="border border-gray-200 rounded-2xl p-4 bg-gray-50/60 space-y-3 relative transition-all hover:border-indigo-200"
                      >
                        <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-gray-800">
                              {satir.ad.trim() ? satir.ad : `${idx + 1}. Zimmet Kalemi`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => satirCogalt(idx)}
                              title="Bu satırın marka/kategori/tutar bilgilerini kopyalayarak altına yeni satır ekle"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-indigo-700 bg-white border border-gray-200 hover:border-indigo-200 px-2 py-1 rounded-lg transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              Kopyala
                            </button>
                            {zimmetSatirlari.length > 1 && (
                              <button
                                type="button"
                                onClick={() => satirSil(satir.id)}
                                title="Bu satırı kaldır"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:bg-red-50 bg-white border border-red-200 px-2 py-1 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                Kaldır
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Zimmet Adı *</label>
                            <input
                              value={satir.ad}
                              onChange={(e) => satirGuncelle(satir.id, 'ad', e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                              placeholder="ör. MacBook Pro 14 / Şirket Hattı"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Seri No / Kod *</label>
                            <input
                              value={satir.seriNo}
                              onChange={(e) => satirGuncelle(satir.id, 'seriNo', e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 font-mono bg-white"
                              placeholder="ör. APL-001"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Kategori</label>
                            <input
                              type="text"
                              list="zimmet-kategori-listesi"
                              value={satir.kategori}
                              onChange={(e) => satirGuncelle(satir.id, 'kategori', e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                              placeholder="ör. Bilgisayar, Telefon, Araç..."
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Marka</label>
                            <input
                              value={satir.marka}
                              onChange={(e) => satirGuncelle(satir.id, 'marka', e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                              placeholder="ör. Apple / Samsung"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Model</label>
                            <input
                              value={satir.model}
                              onChange={(e) => satirGuncelle(satir.id, 'model', e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                              placeholder="ör. M3 Pro / S24"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-semibold text-gray-700">Değer / Tutar (₺)</label>
                              <span className="text-[10px] text-indigo-600 font-medium">Küsüratlı</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₺</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={satir.deger}
                                onChange={(e) => satirGuncelle(satir.id, 'deger', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 font-mono font-semibold bg-white"
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-3">
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Açıklama / Teslim Notu (İsteğe Bağlı)</label>
                            <input
                              value={satir.aciklama}
                              onChange={(e) => satirGuncelle(satir.id, 'aciklama', e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                              placeholder="Ekipman aksesuarları, şarj aleti, çanta veya teslim durumu notu..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={yeniSatirEkle}
                    className="w-full py-2.5 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    {form.atananEmployeeId
                      ? `+ Bu Kişiye Zimmet Eklemeye Devam Et (${getEmpName(form.atananEmployeeId)})`
                      : '+ Yeni Zimmet Satırı Ekle'}
                  </button>
                </div>

                {/* Alt Özet ve Kaydet Butonları */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 font-medium">
                    Toplam <strong className="text-gray-900">{zimmetSatirlari.length}</strong> zimmet satırı · Toplam Tutar:{' '}
                    <strong className="text-indigo-700 font-mono">
                      {formatPara(
                        zimmetSatirlari.reduce((sum, s) => {
                          const n = s.deger ? parseFloat(String(s.deger).replace(',', '.')) : 0;
                          return sum + (isNaN(n) ? 0 : n);
                        }, 0)
                      )}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setFormAcik(false)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    {form.atananEmployeeId && (
                      <button
                        type="button"
                        onClick={() => kaydet(true)}
                        disabled={zimmetSatirlari.some((s) => !s.ad.trim() || !s.seriNo.trim()) || isSaving}
                        className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                        title="Tüm satırları kaydeder ve bu personelin tüm zimmetlerini içeren tek sayfalık A4 teslim tutanağını açar"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Kaydet & Toplu Tutanak Yazdır
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => kaydet(false)}
                      disabled={zimmetSatirlari.some((s) => !s.ad.trim() || !s.seriNo.trim()) || isSaving}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-200"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {zimmetSatirlari.length > 1 ? `Tümünü Kaydet (${zimmetSatirlari.length} Zimmet)` : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ZimmetYonetimi;
