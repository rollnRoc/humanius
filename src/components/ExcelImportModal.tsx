import React, { useState, useRef, useEffect } from 'react';
import { 
  X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ArrowRight, Download, RefreshCw, Layers, Eye, Building2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { companyService } from '../services/companyService';
import { employeeService } from '../services/employeeService';
import { demoService } from '../services/demoService';
import { useAuth } from '../contexts/AuthContext';

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

interface SheetData {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
}

// Personel düzenleme ekranındaki temel alanlar
// Sıralama önemlidir: Daha spesifik eşleşmeler (örn. İş Yeri SGK Sicil No ve Doğum Tarihi) genel olanlardan önce gelmelidir.
const TARGET_FIELDS: TargetField[] = [
  { key: 'name', label: 'Adı Soyadı', required: true, matchKeywords: ['personel adı soyadı', 'adı soyadı', 'ad soyad', 'personel adı', 'isim', 'name', 'full name', 'çalışan', 'ad', 'soyad'] },
  { key: 'tc_no', label: 'TC Kimlik No', matchKeywords: ['tc kimlik no', 'tc kimlik', 'tckn', 'tc no', 'kimlik no', 'vatandaşlık no', 'tc'] },
  { key: 'is_yeri_sgk_sicil_no', label: 'İş Yeri SGK Sicil No', matchKeywords: ['işyeri sgk sicil no', 'iş yeri sgk sicil no', 'iş yeri sgk', 'işyeri sgk', 'iş yeri sicil', 'işyeri sicil', 'işyeri sicil no', 'iş yeri sgk sicil', 'isyeri sgk', 'sgk işyeri', 'sgk isyeri', 'sgk sicil'] },
  { key: 'sicil_no', label: 'Sicil No', matchKeywords: ['personel sicil', 'sicil no', 'personel no', 'kart no', 'employee id', 'özlük no', 'sicil'] },
  { key: 'department', label: 'Departman', matchKeywords: ['departman', 'bölüm', 'birim', 'müdürlük', 'department', 'şube'] },
  { key: 'position', label: 'Pozisyon / Görev', matchKeywords: ['pozisyon', 'görev', 'ünvan', 'unvan', 'rol', 'meslek', 'title', 'position', 'job'] },
  { key: 'birth_date', label: 'Doğum Tarihi', matchKeywords: ['doğum tarihi', 'dogum tarihi', 'doğum', 'dogum', 'birth date', 'birthday', 'd.tarihi'] },
  { key: 'join_date', label: 'İşe Giriş Tarihi', matchKeywords: ['işe giriş tarihi', 'ise giris tarihi', 'işe giriş', 'giriş tarihi', 'başlama tarihi', 'start date', 'başlangıç', 'giriş'] },
  { key: 'medeni_durum', label: 'Medeni Durumu', matchKeywords: ['medeni durumu', 'medeni durum', 'medeni hal', 'medeni', 'marital'] },
  { key: 'email', label: 'Kurumsal E-Posta', matchKeywords: ['kurumsal e-posta', 'e-posta', 'eposta', 'email', 'mail', 'şirket maili'] },
  { key: 'phone', label: 'Telefon', matchKeywords: ['telefon numarası', 'telefon no', 'telefon', 'tel', 'gsm', 'cep', 'mobil', 'phone', 'iletişim no'] },
  { key: 'address', label: 'Adres', matchKeywords: ['adres', 'ikametgah', 'şehir', 'address', 'yerleşim'] },
];

type SheetDeptMode = 'column_or_sheet' | 'sheet_plus_column' | 'sheet_only';

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeCompanyId,
  activeCompanyName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Yükle, 2: Eşle, 3: Önizle & Onayla
  const [fileName, setFileName] = useState<string>('');
  const [sheetsData, setSheetsData] = useState<SheetData[]>([]);
  const [selectedSheetNames, setSelectedSheetNames] = useState<string[]>([]);
  const [sheetDeptMode, setSheetDeptMode] = useState<SheetDeptMode>('column_or_sheet');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({}); // { excelCol: targetFieldKey }
  const [loading, setLoading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{ count: number; error?: string } | null>(null);

  // Şirket seçimi (Özellikle Süper Yönetici veya çoklu şirket durumu için)
  const [companyList, setCompanyList] = useState<{ id: string; name: string }[]>([]);
  const [selectedTargetCompanyId, setSelectedTargetCompanyId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    companyService.getCompanies().then((comps) => {
      if (!isMounted || !Array.isArray(comps)) return;
      const validComps = comps
        .filter((c: any) => c && c.id && c.name)
        .map((c: any) => ({ id: String(c.id), name: String(c.name) }));
      setCompanyList(validComps);

      // Varsayılan hedef şirketi belirle
      const directId = activeCompanyId && !activeCompanyId.includes('-id-') && activeCompanyId !== 'default'
        ? activeCompanyId
        : (profile?.company_id || '');

      if (directId && validComps.some(c => c.id === directId)) {
        setSelectedTargetCompanyId(directId);
      } else if (activeCompanyName && activeCompanyName !== 'all') {
        const matchedByName = validComps.find(
          c => c.name.trim().toLocaleLowerCase('tr-TR') === activeCompanyName.trim().toLocaleLowerCase('tr-TR')
        );
        if (matchedByName) {
          setSelectedTargetCompanyId(matchedByName.id);
        } else if (validComps.length > 0) {
          setSelectedTargetCompanyId(validComps[0].id);
        }
      } else if (directId) {
        setSelectedTargetCompanyId(directId);
      } else if (validComps.length === 1) {
        setSelectedTargetCompanyId(validComps[0].id);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [isOpen, activeCompanyId, activeCompanyName, profile?.company_id]);

  // 1. Sadeleştirilmiş Örnek Excel Şablonu İndirme Fonksiyonu
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Adı Soyadı': 'Ahmet Yılmaz',
        'TC Kimlik No': '12345678901',
        'Sicil No': 'SICIL-001',
        'İş Yeri SGK Sicil No': '',
        'Departman': 'Yazılım',
        'Pozisyon': 'Kıdemli Yazılım Geliştirici',
        'İşe Giriş Tarihi': '2023-04-15',
        'Doğum Tarihi': '1992-06-20',
        'Medeni Durumu': 'Evli',
        'Kurumsal E-Posta': 'ahmet.yilmaz@humanius.net',
        'Telefon': '05551234567',
        'Adres': 'Kadıköy, İstanbul',
      },
      {
        'Adı Soyadı': 'Ayşe Kaya',
        'TC Kimlik No': '98765432109',
        'Sicil No': 'SICIL-002',
        'İş Yeri SGK Sicil No': '',
        'Departman': 'İnsan Kaynakları',
        'Pozisyon': 'İK Uzmanı',
        'İşe Giriş Tarihi': '2024-01-10',
        'Doğum Tarihi': '1995-11-03',
        'Medeni Durumu': 'Bekar',
        'Kurumsal E-Posta': 'ayse.kaya@humanius.net',
        'Telefon': '05329876543',
        'Adres': 'Çankaya, Ankara',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personel Listesi');
    XLSX.writeFile(wb, 'Humanius_Ornek_Personel_Listesi.xlsx');
  };

  // 2. Dosya Seçildiğinde Excel'deki TÜM Sayfaları Okuma ve Otomatik Eşleştirme
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });

        const parsedSheets: SheetData[] = [];
        const unifiedHeaders: string[] = [];
        const canonicalHeaderMap = new Map<string, string>(); // lowerTrim -> canonical header

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          if (!ws) continue;
          const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (!data || data.length < 2) continue;

          // İlk dolu satırı başlık satırı olarak bul
          let headerRowIdx = 0;
          while (
            headerRowIdx < data.length &&
            (!Array.isArray(data[headerRowIdx]) || data[headerRowIdx].filter(c => String(c ?? '').trim() !== '').length < 2)
          ) {
            headerRowIdx++;
          }
          if (headerRowIdx >= data.length - 1) continue;

          const rawSheetHeaderRow = data[headerRowIdx];
          const colIndexToCanonicalHeader = new Map<number, string>();

          rawSheetHeaderRow.forEach((cellVal, colIdx) => {
            const cleanH = String(cellVal ?? '').trim();
            if (!cleanH) return;
            const normKey = cleanH.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
            let canonical = canonicalHeaderMap.get(normKey);
            if (!canonical) {
              canonical = cleanH;
              canonicalHeaderMap.set(normKey, canonical);
              unifiedHeaders.push(canonical);
            }
            colIndexToCanonicalHeader.set(colIdx, canonical);
          });

          if (colIndexToCanonicalHeader.size === 0) continue;

          const sheetRows: Record<string, any>[] = [];
          for (let rIdx = headerRowIdx + 1; rIdx < data.length; rIdx++) {
            const rowArr = data[rIdx];
            if (!Array.isArray(rowArr)) continue;
            const nonEmptyCells = rowArr.filter(c => String(c ?? '').trim() !== '');
            if (nonEmptyCells.length === 0) continue;

            const rowObj: Record<string, any> = { __sheetName: sheetName };
            colIndexToCanonicalHeader.forEach((canonicalHeader, colIdx) => {
              rowObj[canonicalHeader] = rowArr[colIdx] ?? '';
            });
            sheetRows.push(rowObj);
          }

          if (sheetRows.length > 0) {
            parsedSheets.push({
              sheetName,
              headers: Array.from(colIndexToCanonicalHeader.values()),
              rows: sheetRows,
            });
          }
        }

        if (parsedSheets.length === 0 || unifiedHeaders.length === 0) {
          alert('Seçilen dosyada geçerli veri satırı bulunamadı.');
          return;
        }

        setSheetsData(parsedSheets);
        setSelectedSheetNames(parsedSheets.map(s => s.sheetName));
        setRawHeaders(unifiedHeaders);

        // Akıllı Otomatik Eşleştirme (Fuzzy Match)
        const initialMapping: Record<string, string> = {};
        unifiedHeaders.forEach((header) => {
          const cleanHeader = header
            .toLocaleLowerCase('tr-TR')
            .replace(/[^a-z0-9ğüşıöç]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          // Önce tam veya kapsayıcı anahtar kelime eşleşmesi ara
          const matchedTarget = TARGET_FIELDS.find((tf) => {
            return tf.matchKeywords.some(kw => {
              const cleanKw = kw.toLocaleLowerCase('tr-TR').trim();
              return cleanHeader === cleanKw || cleanHeader.includes(cleanKw);
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
    // Aynı dosyayı tekrar seçebilmek için input'u sıfırla
    e.target.value = '';
  };

  // Seçili sayfalardaki tüm satırları birleştir
  const activeRawRows = React.useMemo(() => {
    const selectedSet = new Set(selectedSheetNames);
    const combined: Record<string, any>[] = [];
    for (const sheet of sheetsData) {
      if (selectedSet.has(sheet.sheetName)) {
        combined.push(...sheet.rows);
      }
    }
    return combined;
  }, [sheetsData, selectedSheetNames]);

  // Tarih ve Sayısal Alan Temizleyici (Saat dilimi kaymasını önleyen yerel tarih ayrıştırıcı)
  const parseExcelDate = (val: any): string => {
    if (!val && val !== 0) return '';
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      // Excel hücre tarihlerinde UTC gece yarısı sapmasını önlemek için 12 saat ekle
      const adjusted = new Date(val.getTime() + 12 * 3600 * 1000);
      const y = adjusted.getUTCFullYear();
      const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
      const d = String(adjusted.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val === 'number') {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      if (!isNaN(dateInfo.getTime())) return dateInfo.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    if (!s) return '';
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
    return '';
  };

  // Türkçe uyumlu Baş Harf Büyütme (Örn: "ahmet hündür" -> "Ahmet Hündür")
  const toTurkishTitleCase = (str: string): string => {
    if (!str) return '';
    return str
      .trim()
      .split(/\s+/)
      .map(word => {
        if (!word) return '';
        const first = word.charAt(0).toLocaleUpperCase('tr-TR');
        const rest = word.slice(1).toLocaleLowerCase('tr-TR');
        return first + rest;
      })
      .join(' ');
  };

  // 3. Eşleşmiş Verileri Formatlama & Temizleme
  const parsedEmployees = React.useMemo<Record<string, any>[]>(() => {
    if (activeRawRows.length === 0 || rawHeaders.length === 0) return [];

    return activeRawRows.map((rowObj, rowIdx) => {
      const empObj: Record<string, any> = {
        __sheetName: rowObj.__sheetName || '',
      };

      rawHeaders.forEach((header) => {
        const targetKey = columnMapping[header];
        if (targetKey && targetKey !== 'ignore') {
          let val = rowObj[header];

          // Tarih Formatlama (YYYY-MM-DD)
          if (targetKey === 'join_date' || targetKey === 'birth_date') {
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

          // İş Yeri SGK Sicil No Temizleme
          if (targetKey === 'is_yeri_sgk_sicil_no' && val) {
            val = String(val).replace(/\.0$/, '').trim();
          }

          // Medeni Durum Temizleme
          if (targetKey === 'medeni_durum' && val) {
            const mStr = String(val).trim().toLocaleLowerCase('tr-TR');
            if (mStr.includes('evli')) val = 'evli';
            else if (mStr.includes('bekar') || mStr.includes('bekâr')) val = 'bekar';
            else val = mStr;
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

          const cleanStr = typeof val === 'string' ? val.trim() : String(val ?? '').trim();
          // Eğer aynı hedef alana birden fazla sütun eşlendiyse dolu olanı koru
          if (cleanStr !== '' || !empObj[targetKey]) {
            empObj[targetKey] = cleanStr;
          }
        }
      });

      // İsim baş harflerini düzenle (örn. "ahmet hündür" -> "Ahmet Hündür")
      if (empObj.name) {
        empObj.name = toTurkishTitleCase(empObj.name);
      }

      // Çoklu sayfa / sekme adı ile Departman ilişkilendirmesi
      const rawDept = empObj.department ? toTurkishTitleCase(empObj.department) : '';
      const cleanSheetName = empObj.__sheetName ? toTurkishTitleCase(empObj.__sheetName) : '';

      if (sheetsData.length > 1 && cleanSheetName) {
        if (sheetDeptMode === 'sheet_only') {
          empObj.department = cleanSheetName;
        } else if (sheetDeptMode === 'sheet_plus_column') {
          if (rawDept && rawDept.toLocaleLowerCase('tr-TR') !== cleanSheetName.toLocaleLowerCase('tr-TR')) {
            empObj.department = `${cleanSheetName} - ${rawDept}`;
          } else {
            empObj.department = cleanSheetName;
          }
        } else {
          // column_or_sheet (Varsayılan)
          empObj.department = rawDept || cleanSheetName || 'Genel Departman';
        }
      } else {
        empObj.department = rawDept || cleanSheetName || 'Genel Departman';
      }

      // İsim varsa ve e-posta yoksa otomatik kurumsal e-posta türet
      if (empObj.name && (!empObj.email || empObj.email === '')) {
        const slug = empObj.name
          .toLocaleLowerCase('tr-TR')
          .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
          .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
          .replace(/[^a-z0-9]+/g, '.')
          .replace(/^\.+|\.+$/g, '');
        empObj.email = `${slug}@humanius.net`;
      }

      return {
        rowNumber: rowIdx + 1,
        ...empObj
      };
    }).filter(e => Boolean(e.name && e.name.trim() !== ''));
  }, [activeRawRows, rawHeaders, columnMapping, sheetsData.length, sheetDeptMode]);

  // 4. Veritabanına Aktarımı Başlatma
  const handleExecuteImport = async () => {
    if (parsedEmployees.length === 0) {
      alert('Aktarılacak geçerli personel kaydı bulunamadı.');
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      let targetCompId = selectedTargetCompanyId || (
        activeCompanyId && !activeCompanyId.includes('-id-') && activeCompanyId !== 'default'
          ? activeCompanyId
          : (demoService.isDemoActive() ? 'demo-company-id-9999' : (profile?.company_id || ''))
      );

      if (!targetCompId && !demoService.isDemoActive()) {
        alert('Lütfen aktarım yapılacak şirketi seçin.');
        setLoading(false);
        return;
      }

      const insertPayloads = parsedEmployees.map(emp => ({
        company_id: targetCompId,
        name: emp.name,
        tc_no: emp.tc_no || '',
        sicil_no: emp.sicil_no || '',
        is_yeri_sgk_sicil_no: emp.is_yeri_sgk_sicil_no || '',
        department: emp.department || 'Genel Departman',
        position: emp.position || 'Personel',
        level: 'Mid',
        status: 'active',
        employee_type: 'normal',
        join_date: emp.join_date || new Date().toISOString().split('T')[0],
        birth_date: emp.birth_date || null,
        medeni_durum: emp.medeni_durum || null,
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

  const toggleSheetSelection = (sheetName: string) => {
    setSelectedSheetNames(prev => {
      if (prev.includes(sheetName)) {
        if (prev.length === 1) return prev; // En az 1 sayfa seçili kalsın
        return prev.filter(s => s !== sheetName);
      }
      return [...prev, sheetName];
    });
  };

  if (!isOpen) return null;

  const totalWorkbookRows = sheetsData.reduce((acc, s) => acc + s.rows.length, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Başlığı */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Excel'den Personel Aktarım Sihirbazı</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {fileName ? `${fileName} • Çoklu Sayfa (Sekme) Destekli Aktarım` : 'Tüm Excel sayfalarını (sekmelerini) ve sütunları eşleştirerek tek tıkla aktarın'}
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
            Sayfa & Sütunları Eşleştir
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</span>
            Önizleme & Onay
          </div>
        </div>

        {/* Gövde / Adım İçerikleri */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* Hedef Şirket Seçimi (Birden fazla şirket varsa göster) */}
          {step !== 3 && companyList.length > 1 && (!activeCompanyId || activeCompanyId === 'default') && (
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-800">Aktarım Yapılacak Şirket</p>
                  <p className="text-[11px] text-gray-500">Personellerin kaydedileceği şirketi seçin</p>
                </div>
              </div>
              <select
                value={selectedTargetCompanyId}
                onChange={(e) => setSelectedTargetCompanyId(e.target.value)}
                className="bg-white border border-blue-300 text-gray-900 text-xs font-bold rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 min-w-[240px] cursor-pointer"
              >
                <option value="">-- Şirket Seçin --</option>
                {companyList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

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
                  <p className="text-xs text-gray-500 mt-1">
                    Birden fazla sayfa (sekme) içeren <strong>.xlsx, .xls</strong> veya <strong>.csv</strong> dosyalarındaki tüm sayfalar otomatik taranır
                  </p>
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

          {/* ADIM 2: ÇOKLU SAYFA SEÇİMİ & SÜTUN EŞLEŞTİRME SİHİRBAZI */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Çoklu Sayfa (Sekme) Yöneticisi */}
              {sheetsData.length > 1 && (
                <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-950">
                        Excel Sayfaları ({sheetsData.length} Sayfa Algılandı • Toplam {totalWorkbookRows} Personel)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSheetNames(sheetsData.map(s => s.sheetName))}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer"
                      >
                        Tüm Sayfaları Seç ({totalWorkbookRows})
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {sheetsData.map((s) => {
                      const isSelected = selectedSheetNames.includes(s.sheetName);
                      return (
                        <button
                          key={s.sheetName}
                          type="button"
                          onClick={() => toggleSheetSelection(s.sheetName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          <span>{isSelected ? '✓' : '+'}</span>
                          <span>{s.sheetName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {s.rows.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sayfa Adının Departman Olarak Kullanımı */}
                  <div className="pt-2 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-indigo-900">
                      Sekme (Sayfa) İsimleri Departman Bilgisini Nasıl Etkilesin?
                    </span>
                    <select
                      value={sheetDeptMode}
                      onChange={(e) => setSheetDeptMode(e.target.value as SheetDeptMode)}
                      className="bg-white border border-indigo-200 text-indigo-950 text-xs font-semibold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="column_or_sheet">Sütundaki Departmanı Kullan (Boşsa Sekme Adını Yaz)</option>
                      <option value="sheet_plus_column">Sekme Adı + Departman Birleştir (Örn: Balıkesir Büro - Satış)</option>
                      <option value="sheet_only">Doğrudan Sekme Adını Departman Yap (Örn: Balıkesir Büro)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-800">Excel Sütunlarını Humanius Alanlarıyla Eşleyin</h4>
                  <p className="text-xs text-gray-500">Sistem başlıkları otomatik tahmin etti. İhtiyaç halinde değiştirebilirsiniz.</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">
                  {selectedSheetNames.length} Sayfa • {activeRawRows.length} Satır Seçili
                </span>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
                {rawHeaders.map((header) => {
                  const sampleRow = activeRawRows.find(r => r[header] !== undefined && String(r[header]).trim() !== '');
                  const sampleVal = sampleRow ? sampleRow[header] : activeRawRows[0]?.[header];
                  const displaySample = sampleVal instanceof Date
                    ? parseExcelDate(sampleVal)
                    : String(sampleVal ?? '—');
                  const currentSelected = columnMapping[header] || 'ignore';

                  return (
                    <div key={header} className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{header}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          Örnek Veri: <span className="text-gray-600 font-medium">{displaySample}</span>
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
                <div className="overflow-x-auto max-h-56 border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        {sheetsData.length > 1 && <th className="p-2">Sayfa (Sekme)</th>}
                        <th className="p-2">Ad Soyad</th>
                        <th className="p-2">Departman</th>
                        <th className="p-2">Pozisyon</th>
                        <th className="p-2">TC Kimlik</th>
                        <th className="p-2">İşe Giriş</th>
                        <th className="p-2">Medeni Durum</th>
                        <th className="p-2">Telefon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {parsedEmployees.map((emp, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 text-slate-400 font-mono">{i + 1}</td>
                          {sheetsData.length > 1 && (
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                                {emp.__sheetName}
                              </span>
                            </td>
                          )}
                          <td className="p-2 font-semibold text-slate-900">{emp.name}</td>
                          <td className="p-2">{emp.department || '—'}</td>
                          <td className="p-2">{emp.position || '—'}</td>
                          <td className="p-2 font-mono">{emp.tc_no || '—'}</td>
                          <td className="p-2 font-mono">{emp.join_date || '—'}</td>
                          <td className="p-2 capitalize">{emp.medeni_durum || '—'}</td>
                          <td className="p-2 font-mono">{emp.phone || '—'}</td>
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
                    Seçili <strong className="text-indigo-600 font-bold">{selectedSheetNames.length} sayfadan</strong> toplam{' '}
                    <strong className="text-emerald-600 font-bold">{importResult.count} personel</strong> sisteme başarıyla kaydedildi.
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
                        {parsedEmployees.length} Personeli İçeri Aktar ({selectedSheetNames.length} Sayfa)
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
