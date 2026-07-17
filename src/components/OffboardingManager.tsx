import React, { useState, useMemo } from 'react';
import { UserMinus, FileText, Printer, CheckCircle, Search, AlertTriangle, FileSignature } from 'lucide-react';
import type { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { employeeService } from '../services/employeeService';
import { ozlukDosyasiService } from '../services/ozlukDosyasiService';

interface OffboardingManagerProps {
  employees: Employee[];
  onDataRefresh: () => Promise<void>;
  companyName: string;
}

const EXIT_REASONS = [
  { value: 'istifa', label: 'İstifa (Çalışanın Kendi İsteğiyle Ayrılması)' },
  { value: 'fesih_isveren_hakli', label: 'İşveren Tarafından Fesih (Haklı Nedenle)' },
  { value: 'fesih_isveren_gecerli', label: 'İşveren Tarafından Fesih (Geçerli Nedenle)' },
  { value: 'ikale', label: 'Karşılıklı Anlaşma (İkale)' },
  { value: 'emeklilik', label: 'Emeklilik' },
  { value: 'askerlik', label: 'Askerlik Sebebiyle Ayrılma' },
  { value: 'evlilik', label: 'Evlilik Sebebiyle Ayrılma (Kadın Çalışanlar İçin)' },
  { value: 'deneme_suresi_sonu', label: 'Deneme Süresi İçinde Fesih' },
  { value: 'vefat', label: 'Vefat' },
  { value: 'diger', label: 'Diğer Nedenler' }
];

export const OffboardingManager: React.FC<OffboardingManagerProps> = ({
  employees,
  onDataRefresh,
  companyName
}) => {
  const { profile } = useAuth();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [exitDate, setExitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exitReason, setExitReason] = useState<string>('istifa');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sadece aktif ve izinde olan personeller çıkarılabilir
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'active' || e.status === 'onLeave');
  }, [employees]);

  // İşten çıkarılmış personeller
  const exitedEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'inactive');
  }, [employees]);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId);
  }, [selectedEmpId, employees]);

  const resolvedReasonLabel = useMemo(() => {
    return EXIT_REASONS.find(r => r.value === exitReason)?.label || 'Diğer';
  }, [exitReason]);

  const formatDateTR = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Belirtilmemiş';
    try {
      const cleanStr = dateStr.split('T')[0];
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2]}.${parts[1]}.${parts[0]}`;
        }
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  // İbraname Belgesi HTML şablonu üretici
  const generateIbranameHTML = (emp: Employee, date: string, reasonLabel: string, customNotes: string) => {
    const formattedJoinDate = formatDateTR(emp.joinDate || emp.join_date);
    const formattedExitDate = formatDateTR(date);
    const todayStr = formatDateTR(new Date().toISOString());

    return `
      <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif; line-height: 1.6; color: #333;">
        <div style="text-align: center; border-bottom: 2px solid #3182ce; padding-bottom: 15px; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px; color: #2b6cb0; text-transform: uppercase;">İşten Ayrılış ve İbraname Belgesi</h1>
          <p style="margin: 5px 0 0 0; color: #718096; font-size: 14px;">${companyName} İnsan Kaynakları Yönetim Sistemi</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f7fafc; width: 35%;">Personel Adı Soyadı</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${emp.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f7fafc;">T.C. Kimlik No</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${emp.tc_no || 'Belirtilmemiş'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f7fafc;">Sicil No</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${emp.sicil_no || 'Belirtilmemiş'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f7fafc;">Departman / Pozisyon</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${emp.department} / ${emp.position}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f7fafc;">İşe Giriş Tarihi</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${formattedJoinDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f7fafc;">İşten Çıkış Tarihi</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${formattedExitDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f7fafc;">Ayrılış Nedeni</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${reasonLabel}</td>
          </tr>
        </table>

        <div style="margin-bottom: 30px;">
          <h3 style="margin-bottom: 10px; color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Açıklamalar ve Teslimat Notları</h3>
          <p style="white-space: pre-wrap; font-size: 14px; color: #4a5568;">${customNotes || 'Ek açıklama girilmemiştir.'}</p>
        </div>

        <div style="margin-bottom: 40px; text-align: justify; font-size: 14px; line-height: 1.8;">
          <p>
            Yukarıda açık kimliği ve çalışma bilgileri belirtilen personelin, <strong>${companyName}</strong> nezdindeki hizmet sözleşmesi <strong>${formattedExitDate}</strong> tarihi itibariyle son bulmuştur.
          </p>
          <p>
            Çalışan, işyerinde çalıştığı süre boyunca hak kazandığı tüm normal ücret, fazla mesai, hafta tatili, genel tatil, yıllık ücretli izin ücreti ile ihbar ve kıdem tazminatı dahil olmak üzere yasal ve akdi tüm alacaklarını tam, eksiksiz ve nakden tahsil ettiğini; işverenden hiçbir ad ve nam altında alacağının kalmadığını kabul, beyan ve taahhüt eder.
          </p>
          <p>
            Bu çerçevede, işveren şirket yetkilileri ve çalışan karşılıklı olarak birbirlerini tamamen ibra etmişlerdir.
          </p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 60px; font-size: 14px;">
          <div style="text-align: center; width: 45%; border-top: 1px dashed #cbd5e0; padding-top: 15px;">
            <strong>İşveren Temsilcisi</strong><br/>
            İmza / Kaşe
          </div>
          <div style="text-align: center; width: 45%; border-top: 1px dashed #cbd5e0; padding-top: 15px;">
            <strong>Çalışan (İbra Eden)</strong><br/>
            İsim Soyisim / İmza
          </div>
        </div>
      </div>
    `;
  };

  const printDocument = (htmlContent: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>İbraname ve İşten Çıkış Belgesi</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleOffboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    if (!window.confirm('Bu personelin işten çıkış işlemini tamamlamak istediğinize emin misiniz? Bu işlem durumunu PASİF yapacaktır.')) return;

    setLoading(true);
    try {
      const emp = activeEmployees.find(x => x.id === selectedEmpId);
      if (!emp) throw new Error('Personel bulunamadı.');

      const ibranameHtml = generateIbranameHTML(emp, exitDate, resolvedReasonLabel, notes);

      // 1. Durumu pasife çek
      await employeeService.update(selectedEmpId, { status: 'inactive' });

      // 2. Özlük dosyasına yazıyı kaydet
      await ozlukDosyasiService.saveYaziKaydi(
        profile?.company_id || '',
        selectedEmpId,
        'İşten Çıkış / İbraname',
        `İşten Ayrılış Tarihi: ${exitDate}\nAyrılış Nedeni: ${resolvedReasonLabel}\n\nİbraname Metni:\n${ibranameHtml}`
      );

      await onDataRefresh();

      alert('İşten çıkış işlemi başarıyla tamamlandı ve İbraname özlük dosyasına kaydedildi.');
      
      // Yazdırma ekranını aç
      printDocument(ibranameHtml);

      // Formu sıfırla
      setSelectedEmpId('');
      setNotes('');
    } catch (err: any) {
      console.error(err);
      alert('İşten çıkış işlemi yapılırken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintExitedDoc = async (emp: Employee) => {
    try {
      const docs = await ozlukDosyasiService.getDosyalar(emp.id);
      const exitDoc = docs.find(d => d.kategori === 'İşten Çıkış / İbraname');
      if (exitDoc && exitDoc.notlar) {
        // İbraname HTML'ini notlardan ayıkla veya yeniden oluştur
        const htmlMatch = exitDoc.notlar.indexOf('<div');
        if (htmlMatch !== -1) {
          printDocument(exitDoc.notlar.substring(htmlMatch));
        } else {
          // Eski format ise veya HTML bulunamadıysa düz yazıdan oluştur
          const details = exitDoc.notlar.split('\n');
          const date = details.find(d => d.startsWith('İşten Ayrılış Tarihi:'))?.replace('İşten Ayrılış Tarihi:', '').trim() || '';
          const reason = details.find(d => d.startsWith('Ayrılış Nedeni:'))?.replace('Ayrılış Nedeni:', '').trim() || '';
          const ibranameHtml = generateIbranameHTML(emp, date, reason, exitDoc.notlar);
          printDocument(ibranameHtml);
        }
      } else {
        // Eğer kayıt bulunamadıysa varsayılan şablonla göster
        const ibranameHtml = generateIbranameHTML(emp, new Date().toISOString().split('T')[0], 'Belirtilmemiş', 'Geçmiş kayıt.');
        printDocument(ibranameHtml);
      }
    } catch (err: any) {
      alert('Belge yüklenirken hata oluştu.');
    }
  };

  const filteredExited = useMemo(() => {
    return exitedEmployees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [exitedEmployees, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Başlık */}
      <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
          <UserMinus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">İşten Çıkış (Offboarding) Yönetimi</h2>
          <p className="text-xs text-gray-500 mt-1">İşten ayrılan çalışanların çıkış süreçlerini yönetin, yasal ibranameleri hazırlayın ve özlük dosyasına kaydedin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* İşlem Formu */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">Çıkış İşlemini Başlat</h3>
          
          <form onSubmit={handleOffboard} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Çalışan Seçin</label>
              <select
                required
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 text-sm"
              >
                <option value="">-- Personel Seçin --</option>
                {activeEmployees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.department} - {e.position})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Ayrılış Tarihi</label>
                <input
                  type="date"
                  required
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Ayrılış Nedeni</label>
                <select
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                >
                  {EXIT_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Devir & İade ve Ek Notlar</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Örn: Şirket bilgisayarı ve telefonu teslim alındı. E-posta hesabı askıya alındı. SGK çıkış bildirimi yapıldı."
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 text-sm resize-none"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">Önemli Hukuki Hatırlatma:</p>
                <p className="mt-0.5 leading-relaxed">İşten çıkış işleminin onaylanmasıyla çalışanın sistem durumu "Pasif" olacaktır. Hazırlanan ibraname belgesi çalışanın özlük dosyasına kalıcı olarak kaydedilecektir.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedEmpId}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <FileSignature className="w-4 h-4" />
              {loading ? 'İşlem Yapılıyor...' : 'Çıkışı Tamamla ve Belgeyi Yazdır'}
            </button>
          </form>
        </div>

        {/* Belge Önizleme */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col h-[560px]">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            Resmi Belge Önizlemesi (İbraname)
          </h3>
          
          {selectedEmp ? (
            <div className="flex-1 overflow-y-auto mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div 
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[500px]"
                dangerouslySetInnerHTML={{ 
                  __html: generateIbranameHTML(selectedEmp, exitDate, resolvedReasonLabel, notes) 
                }} 
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 mt-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm font-medium">Önizleme İçin Çalışan Seçin</p>
              <p className="text-xs text-gray-400 mt-1">Seçtiğiniz çalışanın bilgileri ile ibraname taslağı anlık olarak burada üretilir.</p>
            </div>
          )}
        </div>
      </div>

      {/* Geçmiş İşten Çıkarılanlar Tablosu */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">İşten Ayrılan Personel Geçmişi</h3>
            <p className="text-xs text-gray-500 mt-0.5">Daha önce işten çıkışı onaylanmış ve pasif duruma getirilmiş çalışanlar.</p>
          </div>
          
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Çalışan ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 outline-none text-xs focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Personel</th>
                <th className="px-6 py-3">Departman / Pozisyon</th>
                <th className="px-6 py-3">İşe Giriş Tarihi</th>
                <th className="px-6 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExited.length > 0 ? (
                filteredExited.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{emp.name}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.department} / {emp.position}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDateTR(emp.joinDate || emp.join_date)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handlePrintExitedDoc(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold transition-colors"
                        title="İbraname Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        İbranameyi Görüntüle
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    İşten ayrılmış personel bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
