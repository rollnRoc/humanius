import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ArrowRight, Download, RefreshCw, Layers, ShieldCheck, Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { companyService } from '../services/companyService';
import { employeeService } from '../services/employeeService';
import { userManagementService } from '../services/userManagementService';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeCompanyId?: string;
  activeCompanyName?: string;
}

interface TargetField {
  key: string;
  label: string;
  required?: boolean;
  matchKeywords: string[];
}

// Personel düzenleme ekranındaki temel alanlar (Maaş, kıdem, kişisel mail, istihdam türü hariç)
const TARGET_FIELDS: TargetField[] = [
  { key: 'name', label: 'Adı Soyadı', required: true, matchKeywords: ['ad', 'soyad', 'adı soyadı', 'isim', 'personel adı', 'name', 'full name', 'çalışan'] },
  { key: 'tc_no', label: 'TC Kimlik No', matchKeywords: ['tc', 'tckn', 'tc no', 'tc kimlik', 'kimlik no', 'vatandaşlık no'] },
  { key: 'sicil_no', label: 'Sicil No', matchKeywords: ['sicil', 'sicil no', 'personel no', 'kart no', 'employee id', 'özlük no'] },
  { key: 'department', label: 'Departman', matchKeywords: ['departman', 'bölüm', 'birim', 'müdürlük', 'department', 'şube'] },
  { key: 'position', label: 'Pozisyon / Görev', matchKeywords: ['pozisyon', 'görev', 'ünvan', 'unvan', 'rol', 'meslek', 'title', 'position', 'job'] },
  { key: 'join_date', label: 'İşe Giriş Tarihi', matchKeywords: ['giriş', 'işe giriş', 'başlama tarihi', 'giriş tarihi', 'start date', 'tarih', 'başlangıç'] },
  { key: 'email', label: 'Kurumsal E-Posta', matchKeywords: ['kurumsal e-posta', 'e-posta', 'eposta', 'email', 'mail', 'şirket maili'] },
  { key: 'phone', label: 'Telefon', matchKeywords: ['tel', 'telefon', 'gsm', 'cep', 'mobil', 'phone', 'iletişim no'] },
  { key: 'address', label: 'Adres', matchKeywords: ['adres', 'ikametgah', 'şehir', 'address', 'yerleşim'] },
];

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeCompanyId,
  activeCompanyName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Yükle, 2: Eşle, 3: Önizle & Onayla
  const [fileName, setFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({}); // { excelCol: targetFieldKey }
  const [loading, setLoading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{ count: number; error?: string } | null>(null);

  // 1. Sadeleştirilmiş Örnek Excel Şablonu İndirme Fonksiyonu
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Adı Soyadı': 'Ahmet Yılmaz',
        'TC Kimlik No': '12345678901',
        'Sicil No': 'SICIL-001',
        'Departman': 'Yazılım',
        'Pozisyon': 'Kıdemli Yazılım Geliştirici',
        'İşe Giriş Tarihi': '2023-04-15',
        'Kurumsal E-Posta': 'ahmet.yilmaz@humanius.net',
        'Telefon': '05551234567',
        'Adres': 'Kadıköy, İstanbul',
      },
      {
        'Adı Soyadı': 'Ayşe Kaya',
        'TC Kimlik No': '98765432109',
        'Sicil No': 'SICIL-002',
        'Departman': 'İnsan Kaynakları',
        'Pozisyon': 'İK Uzmanı',
        'İşe Giriş Tarihi': '2024-01-10',
        'Kurumsal E-Posta': 'ayse.kaya@humanius.net',
        'Telefon': '05329876543',
        'Adres': 'Çankaya, Ankara',
      },
      {
        'Adı Soyadı': 'Mehmet Demir',
        'TC Kimlik No': '45678901234',
        'Sicil No': 'SICIL-003',
        'Departman': 'Satış & Pazarlama',
        'Pozisyon': 'Satış Yöneticisi',
        'İşe Giriş Tarihi': '2022-08-01',
        'Kurumsal E-Posta': 'mehmet.demir@humanius.net',
        'Telefon': '05445556677',
        'Adres': 'Bornova, İzmir',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personel Listesi');
    XLSX.writeFile(wb, 'Humanius_Ornek_Personel_Listesi.xlsx');
  };

  // 2. Dosya Seçildiğinde Excel'i Okuma ve Otomatik Eşleştirme
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (data.length < 2) {
          alert('Seçilen dosyada veri satırı bulunamadı.');
          return;
        }

        const headers = data[0].map(h => String(h).trim()).filter(Boolean);
        const rows = data.slice(1).filter(r => r.some(c => String(c).trim() !== ''));

        setRawHeaders(headers);
        setRawRows(rows);

        // Akıllı Otomatik Eşleştirme (Fuzzy Match)
        const initialMapping: Record<string, string> = {};
        headers.forEach((header) => {
          const cleanHeader = header.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, ' ').trim();
          
          const matchedTarget = TARGET_FIELDS.find((tf) => {
            return tf.matchKeywords.some(kw => {
              return cleanHeader.includes(kw) || kw.includes(cleanHeader);
            });
          });

          if (matchedTarget) {
            initialMapping[header] = matchedTarget.key;
          } else {
            initialMapping[header] = 'ignore';
          }
        });

        setColumnMapping(initialMapping);
        setStep(2);
      } catch (err) {
        console.error('Excel okuma hatası:', err);
        alert('Excel dosyası okunurken bir hata oluştu. Lütfen dosya formatını kontrol edin.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Tarih ve Sayısal Alan Temizleyici
  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (val instanceof Date) {
      return !isNaN(val.getTime()) ? val.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      if (!isNaN(dateInfo.getTime())) return dateInfo.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const dotParts = s.split('.');
    if (dotParts.length === 3) {
      const y = dotParts[2].length === 2 ? `20${dotParts[2]}` : dotParts[2];
      return `${y}-${dotParts[1].padStart(2, '0')}-${dotParts[0].padStart(2, '0')}`;
    }
    const slashParts = s.split('/');
    if (slashParts.length === 3) {
      const y = slashParts[2].length === 2 ? `20${slashParts[2]}` : slashParts[2];
      return `${y}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
    }
    const dashParts = s.split('-');
    if (dashParts.length === 3) {
      if (dashParts[0].length <= 2) {
        const y = dashParts[2].length === 2 ? `20${dashParts[2]}` : dashParts[2];
        return `${y}-${dashParts[1].padStart(2, '0')}-${dashParts[0].padStart(2, '0')}`;
      }
      return s;
    }
    return new Date().toISOString().split('T')[0];
  };

  // 3. Eşleşmiş Verileri Formatlama & Temizleme
  const parsedEmployees = React.useMemo(() => {
    if (rawRows.length === 0 || rawHeaders.length === 0) return [];

    return rawRows.map((row, rowIdx) => {
      const empObj: Record<string, any> = {};

      rawHeaders.forEach((header, colIdx) => {
        const targetKey = columnMapping[header];
        if (targetKey && targetKey !== 'ignore') {
          let val = row[colIdx];

          // Tarih Formatlama (YYYY-MM-DD)
          if (targetKey === 'join_date') {
            val = parseExcelDate(val);
          }

          // TC Kimlik No Temizleme (Excel float / boşluk önleme)
          if (targetKey === 'tc_no' && val) {
            val = String(val).replace(/\.0$/, '').replace(/\D/g, '').slice(0, 11);
          }

          // Telefon Temizleme
          if (targetKey === 'phone' && val) {
            val = String(val).replace(/\.0$/, '').trim();
          }

          // Sicil No Temizleme
          if (targetKey === 'sicil_no' && val) {
            val = String(val).replace(/\.0$/, '').trim();
          }

          // Seviye Temizleme (Junior, Mid, Senior, Lead, Manager)
          if (targetKey === 'level' && val) {
            const lStr = String(val).trim().toLowerCase();
            if (lStr.includes('jun') || lStr.includes('başla') || lStr.includes('staj')) val = 'Junior';
            else if (lStr.includes('mid') || lStr.includes('orta')) val = 'Mid';
            else if (lStr.includes('sen') || lStr.includes('ileri') || lStr.includes('uzman')) val = 'Senior';
            else if (lStr.includes('lead') || lStr.includes('lider')) val = 'Lead';
            else if (lStr.includes('man') || lStr.includes('müdür') || lStr.includes('yönetici')) val = 'Manager';
            else val = 'Mid';
          }

          // Durum Temizleme
          if (targetKey === 'status' && val) {
            const sStr = String(val).trim().toLowerCase();
            val = (sStr.includes('pasif') || sStr.includes('ayrıl') || sStr.includes('çık')) ? 'pasif' : 'active';
          }

          empObj[targetKey] = typeof val === 'string' ? val.trim() : String(val ?? '').trim();
        }
      });

      // İsim varsa ve e-posta yoksa otomatik kurumsal e-posta türet
      if (empObj.name && (!empObj.email || empObj.email === '')) {
        const slug = empObj.name
          .toLowerCase()
          .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
          .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
          .replace(/[^a-z0-9]/g, '.');
        empObj.email = `${slug}@humanius.net`;
      }

      return {
        rowNumber: rowIdx + 1,
        ...empObj
      };
    }).filter(e => Boolean(e.name && e.name.trim() !== ''));
  }, [rawRows, rawHeaders, columnMapping]);

  // 4. Veritabanına Aktarımı Başlatma
  const handleExecuteImport = async () => {
    if (parsedEmployees.length === 0) {
      alert('Aktarılacak geçerli personel kaydı bulunamadı.');
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      let targetCompId = activeCompanyId && !activeCompanyId.includes('-id-') && activeCompanyId !== 'default' 
        ? activeCompanyId 
        : (demoService.isDemoActive() ? 'demo-company-id-9999' : (profile?.company_id || ''));

      if (!targetCompId && !demoService.isDemoActive()) {
        alert('Aktarım yapılacak şirket belirlenemedi. Lütfen şirketinizi kontrol edin.');
        setLoading(false);
        return;
      }

      const insertPayloads = parsedEmployees.map(emp => ({
        company_id: targetCompId,
        name: emp.name,
        tc_no: emp.tc_no || '',
        sicil_no: emp.sicil_no || '',
        department: emp.department || 'Genel Departman',
        position: emp.position || 'Personel',
        level: 'Mid',
        status: 'active',
        employee_type: 'normal',
        join_date: emp.join_date || new Date().toISOString().split('T')[0],
        email: emp.email || '',
        phone: emp.phone || '',
        address: emp.address || '',
        skills: [],
      }));

      // Toplu Ekleme (Demo ve Canlı Mod uyumlu)
      const res = await employeeService.batchCreate(insertPayloads);

      setImportResult({ count: res.count || insertPayloads.length });
      setStep(3);
    } catch (err: any) {
      console.error('Toplu aktarım hatası:', err);
      setImportResult({ count: 0, error: err.message || 'Aktarım sırasında veritabanı hatası oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Başlığı */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Excel'den Personel Aktarım Sihirbazı</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeCompanyName ? `${activeCompanyName} için toplu personel aktarımı` : 'Sütunları eşleştirerek personellerinizi tek tıkla sisteme aktarın'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-white/80 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Adım Göstergeleri */}
        <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</span>
            Excel Yükle
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</span>
            Sütunları Eşleştir
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</span>
            Önizleme & Onay
          </div>
        </div>

        {/* Gövde / Adım İçerikleri */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ADIM 1: DOSYA YÜKLEME & ŞABLON */}
          {step === 1 && (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
              >
                <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-600">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-800">Personel Excel veya CSV Dosyasını Seçin</p>
                  <p className="text-xs text-gray-500 mt-1">.xlsx, .xls veya .csv formatındaki dosyaları sürükleyip bırakabilirsiniz</p>
                </div>
                <button 
                  type="button"
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Bilgisayardan Dosya Seç
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </div>

              {/* Örnek Şablon İndirme Alanı */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Örnek Test Excel Şablonu</p>
                    <p className="text-[11px] text-slate-500">Personel bilgilerini içeren hazır formatı hemen indirip deneyebilirsiniz.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Örnek Şablonu İndir
                </button>
              </div>
            </div>
          )}

          {/* ADIM 2: SÜTUN EŞLEŞTİRME SİHİRBAZI */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-800">Excel Sütunlarını Humanius Alanlarıyla Eşleyin</h4>
                  <p className="text-xs text-gray-500">Sistem başlıkları otomatik tahmin etti. İhtiyaç halinde değiştirebilirsiniz.</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">
                  {rawRows.length} Satır Bulundu
                </span>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
                {rawHeaders.map((header) => {
                  const sampleVal = rawRows[0]?.[rawHeaders.indexOf(header)];
                  const currentSelected = columnMapping[header] || 'ignore';

                  return (
                    <div key={header} className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{header}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          Örnek Veri: <span className="text-gray-600 font-medium">{String(sampleVal ?? '—')}</span>
                        </p>
                      </div>

                      <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />

                      <div className="w-64 shrink-0">
                        <select
                          value={currentSelected}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, [header]: e.target.value }))}
                          className={`w-full text-xs font-semibold rounded-xl px-3 py-2 border outline-none transition-all cursor-pointer ${
                            currentSelected !== 'ignore' 
                              ? 'bg-blue-50/50 border-blue-300 text-blue-900 focus:border-blue-500' 
                              : 'bg-gray-50 border-gray-200 text-gray-400'
                          }`}
                        >
                          <option value="ignore">❌ Bu Sütunu Atla (Aktarma)</option>
                          <optgroup label="Humanius Personel Alanları">
                            {TARGET_FIELDS.map(tf => (
                              <option key={tf.key} value={tf.key}>
                                {tf.label} {tf.required ? '*(Zorunlu)' : ''}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Önizleme Tablosu */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    Aktarılacak Veri Önizlemesi ({parsedEmployees.length} Geçerli Personel)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-40 border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Ad Soyad</th>
                        <th className="p-2">Departman</th>
                        <th className="p-2">Pozisyon</th>
                        <th className="p-2">TC Kimlik</th>
                        <th className="p-2">E-Posta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {parsedEmployees.slice(0, 5).map((emp, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="p-2 font-semibold text-slate-900">{emp.name}</td>
                          <td className="p-2">{emp.department || '—'}</td>
                          <td className="p-2">{emp.position || '—'}</td>
                          <td className="p-2 font-mono">{emp.tc_no || '—'}</td>
                          <td className="p-2 text-blue-600 font-mono">{emp.email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ADIM 3: BAŞARI VEYA HATA SONUCU */}
          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              {importResult?.count ? (
                <>
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Aktarım Başarıyla Tamamlandı!</h4>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    Toplam <strong className="text-emerald-600 font-bold">{importResult.count} personel</strong> sisteme başarıyla kaydedildi ve hesapları oluşturuldu.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Aktarım Sırasında Hata Oluştu</h4>
                  <p className="text-sm text-red-600 max-w-md mx-auto">
                    {importResult?.error || 'Kayıtlar işlenirken bir sorun meydana geldi.'}
                  </p>
                </>
              )}
            </div>
          )}

        </div>

        {/* Modal Alt Butonları */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
            >
              ← Farklı Dosya Seç
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            {step !== 3 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                >
                  İptal
                </button>

                {step === 2 && (
                  <button
                    type="button"
                    disabled={loading || parsedEmployees.length === 0}
                    onClick={handleExecuteImport}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        İçeri Aktarılıyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {parsedEmployees.length} Personeli İçeri Aktar
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Tamamla ve Personel Listesine Dön
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default ExcelImportModal;
