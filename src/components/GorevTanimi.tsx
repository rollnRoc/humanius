import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, RefreshCw, Search, Plus, X, Save, CheckCircle, History, AlertTriangle, Sparkles, BookOpen, Layers } from 'lucide-react';
import { companyService } from '../services/companyService';
import { employeeService } from '../services/employeeService';
import { gorevTanimiService } from '../services/gorevTanimiService';
import { useAuth } from '../contexts/AuthContext';
import { emailService } from '../services/emailService';
import { JOB_TEMPLATES, type JobTemplate } from '../data/jobTemplates';

interface Task {
  surec: string;
  yetkinlik: string;
  davranis: string;
  raci: string;
  kpi: string;
}

interface KPI {
  label: string;
  value: string;
}

interface Yetkinlik {
  baslik: string;
  aciklama: string;
}

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  company_id?: string;
  company?: string;
}

const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

interface GorevTanimiViewProps {
  mode?: 'form' | 'records';
  employees?: Employee[];
}

export default function GorevTanimi({ mode = 'form', employees: employeesProp }: GorevTanimiViewProps) {
  const { profile, user } = useAuth();
  const effectiveCompanyId = profile?.company_id ?? '';
  const [employees, setEmployees] = useState<Employee[]>(employeesProp ?? []);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [savedGorevTanimiId, setSavedGorevTanimiId] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [ilkYayinTarihi, setIlkYayinTarihi] = useState('');
  const [revizyonTarihi, setRevizyonTarihi] = useState('');
  const [revizyonNo, setRevizyonNo] = useState('0');
  const [pozisyonAdi, setPozisyonAdi] = useState('');
  const [sirketAdi, setSirketAdi] = useState('Varsayılan Şirket');
  const [isBirimi, setIsBirimi] = useState('Tedarik Zinciri Bölümü / Operasyonlar');
  const [lokasyon, setLokasyon] = useState('Merkez Ofis');
  const [idariUst, setIdariUst] = useState('Operasyonlar Direktörü');
  const [fonksiyonelUst, setFonksiyonelUst] = useState('Operasyonlar Direktörü');
  const [istirakler, setIstirakler] = useState('Tedarik Zinciri Müdürlüğünde Görev Alan Mühendisler, Teknikerler ve Diğer Teknik Kadroları');
  const [pozisyonAmaci, setPozisyonAmaci] = useState('Satın alma, depo, sevkiyat/lojistik süreçlerini baştan sona yönetir, koordine eder. Satış sözleşmelerinde belirtilen termin tarihi ve bütçe ile Proje ve Ürün departmanlarından gelen bilgiler doğrultusunda tedarik planlarını oluşturur, yürütülen tedarik süreçlerini koordine eder. Tedarik planını ve revizyonları/gecikmeleri ilgili kişilerle paylaşır. Satın alma teslimat takvimini takip eder. Tedarikte yaşanan gecikmelerin en aza indirilmesi konusunda iyileştirmeler yapılmasını sağlar. Tedarikçileri optimum hizmet kalitesi ve fiyat açısından değerlendirir ve seçer. Tedarikçi seçimiyle ilgili kurumsal prosedürleri tanımlar ve uygulanmasını sağlar. Tedarikçi performans takibi yaparak iyileştirilmesi gereken noktaları belirler ve bu iyileştirmelerin uygulanmasını sağlar. Gümrük işlemleri, ithalat ve ihracat süreçlerini koordine eder ve yönetir. Depo ve lojistik süreçlerinde stratejik planlama yaparak teslim tarihlerini doğru şekilde yönetir ve opere edilmesini sağlar. Sevkiyat süreçlerini planlar ve koordine eder. Envanter yönetimi yapar, stok seviyelerinin optimize edilmesi konusunda çalışmalar yapar. İş emirlerinin ve teslim tarihlerinin ERP sistemi üzerinden kolayca izlenebilmesini sağlar. Potansiyel riskleri ve fırsatları sürekli olarak analiz eder ve belirler, bunları ölçer ve metrik verilere dönüştürür. Ürün maliyetlerini takip eder, yapılan revize işler ile ilgili olarak Finans ve Satış birimlerini bilgilendirerek gerektiğinde ilgili satış sözleşmesinin revize edilmesini sağlar. Gerçekçi bütçe tahminleri hazırlar ve gerçek maliyetlerle karşılaştırır, şeffaf bir şekilde raporlar. Operasyonel ve finansal verimliliğin takip eder, gerektiğinde düzeltici önleyici faaliyetlerin yürütülmesini sağlar. Satış, Finans, Proje, Üretim ve diğer dahili paydaşlarla yakın bir şekilde çalışır. Bu birimler arasındaki iş akış süreçlerinin iyileştirilmesi için çalışmalar yapar. Dahili ve harici denetimler sırasında yönetimi altındaki departmanların sorumluluğunu üstlenir. Departmanın daha verimli hale gelebilmesi için gerekli araştırma ve iyileştirmeleri yapar. Yöneticisi tarafından istenen, beklenen her türlü araştırma, periyodik raporlama ve ilerleme raporlarını sunar. Yönetim desteği ile ekibinin entegre yönetim sistemine katılımını destekler, öncülük eder. Sistemin iyileştirilmesi ve geliştirilmesini destekler. Ekibinin sisteme katılımı ve görüşlerinin alınması ile ilgili gerekli önlemleri alır, çalışmalar yapar. Bu konuda teşvik edici olur.');
  const [projePortfoy, setProjePortfoy] = useState('zaman/bütçe/kalite, müşteri memnuniyeti, ekip kapasite planı ve sürekli iyileştirme çıktılarından sorumludur.');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Template Library State ────────────────────────────────────────────────
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templateSearch, setTemplateSearch] = useState('');

  const applyTemplate = (template: JobTemplate) => {
    setPozisyonAdi(template.title);
    setIsBirimi(template.department);
    setIdariUst(template.reportsTo);
    setFonksiyonelUst(template.reportsTo);
    setPozisyonAmaci(template.summary);
    setTasks(template.tasks);
    setKpis(template.kpis);
    setYonetselYetkinlikler(template.yonetselYetkinlikler);
    setTeknikBeceriler(template.teknikBeceriler);
    setShowTemplateModal(false);
  };

  const normalizeTr = (str: string = '') => {
    return str
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .trim();
  };

  const filteredTemplates = useMemo(() => {
    const normTerm = normalizeTr(templateSearch);
    
    const scored = JOB_TEMPLATES.map((tpl) => {
      const matchesCategory = selectedCategory === 'all' || tpl.category === selectedCategory;
      if (!matchesCategory) return { tpl, score: 0 };

      if (!normTerm) return { tpl, score: 1 };

      const normTitle = normalizeTr(tpl.title);
      const normDept = normalizeTr(tpl.department);
      const normCat = normalizeTr(tpl.category);
      const normSummary = normalizeTr(tpl.summary);

      let score = 0;
      // Exact or substring match in position title gets top priority (+500)
      if (normTitle.includes(normTerm)) {
        score += 500;
        if (normTitle.startsWith(normTerm)) score += 200;
      }

      // Check all individual search words matching title (+200)
      const termWords = normTerm.split(/\s+/).filter(Boolean);
      const titleWordsMatch = termWords.every(w => normTitle.includes(w));
      if (titleWordsMatch) score += 200;

      // Matches in department (+50)
      if (normDept.includes(normTerm)) score += 50;

      // Summary or category matches (+5)
      const summaryWordsMatch = termWords.every(w => normSummary.includes(w) || normTitle.includes(w));
      if (summaryWordsMatch && !normTitle.includes(normTerm)) score += 5;

      return { tpl, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.tpl);
  }, [templateSearch, selectedCategory]);

  useEffect(() => {
    const init = async () => {
      if (employeesProp && employeesProp.length > 0) {
        setEmployees(employeesProp);
      } else {
        await loadEmployees();
      }
      setCompanyId(effectiveCompanyId);
      setIsLoading(false);
      if (mode === 'records') {
        loadRecords();
      }
    };
    init();
  }, [profile, mode, employeesProp]);

  useEffect(() => {
    if (selectedEmployeeId) {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      if (emp) {
        setPozisyonAdi(emp.position || '');
        setIsBirimi(emp.department || '');
        if (emp.company) {
          setSirketAdi(emp.company);
        }
        
        // Check if there is an existing job description for this employee in the database
        gorevTanimiService.getGorevTanimiByEmployeeId(selectedEmployeeId).then((existing) => {
          if (existing) {
            setPozisyonAdi(existing.gorev_adi || emp.position || '');
            setIsBirimi(existing.is_birimi || emp.department || '');
            setPozisyonAmaci(existing.gorev_aciklama || '');
            setIdariUst(existing.bagli_oldugu_pozisyon || '');
            setFonksiyonelUst(existing.bagli_oldugu_pozisyon || '');
            const createdDate = existing.created_at ? String(existing.created_at).split('T')[0] : new Date().toISOString().split('T')[0];
            setIlkYayinTarihi(existing.ilk_yayin_tarihi || createdDate);
            setRevizyonTarihi(existing.revizyon_tarihi || '');
            setRevizyonNo(existing.revizyon_no !== undefined ? String(existing.revizyon_no) : '0');

            const matchedTpl = JOB_TEMPLATES.find(
              (t) => normalizeTr(t.title) === normalizeTr(existing.gorev_adi || '')
            );

            if (Array.isArray(existing.sorumluluklar) && existing.sorumluluklar.length > 0) {
              const calismalarArr = Array.isArray(existing.calismalar) ? existing.calismalar : [];
              const maxLen = Math.max(existing.sorumluluklar.length, calismalarArr.length);
              const loadedTasks: Task[] = [];
              for (let i = 0; i < maxLen; i++) {
                const tplTask = matchedTpl?.tasks?.[i];
                loadedTasks.push({
                  surec: existing.sorumluluklar[i] ?? tplTask?.surec ?? '',
                  yetkinlik: tplTask?.yetkinlik ?? '',
                  davranis: calismalarArr[i] ?? tplTask?.davranis ?? '',
                  raci: tplTask?.raci ?? 'A/R',
                  kpi: tplTask?.kpi ?? '',
                });
              }
              setTasks(loadedTasks);
            } else if (matchedTpl) {
              setTasks(matchedTpl.tasks);
            }

            if (Array.isArray(existing.performans_kriterleri) && existing.performans_kriterleri.length > 0) {
              setKpis(
                existing.performans_kriterleri.map((item: string) => {
                  const sepIdx = item.indexOf(':');
                  if (sepIdx !== -1) {
                    return {
                      label: item.slice(0, sepIdx).trim(),
                      value: item.slice(sepIdx + 1).trim(),
                    };
                  }
                  return { label: item, value: '' };
                })
              );
            } else if (matchedTpl) {
              setKpis(matchedTpl.kpis);
            }

            if (Array.isArray(existing.yetki_ve_sorumluluklar) && existing.yetki_ve_sorumluluklar.length > 0) {
              setYonetselYetkinlikler(
                existing.yetki_ve_sorumluluklar.map((baslik: string, idx: number) => ({
                  baslik,
                  aciklama: matchedTpl?.yonetselYetkinlikler?.[idx]?.aciklama ?? '',
                }))
              );
            } else if (matchedTpl) {
              setYonetselYetkinlikler(matchedTpl.yonetselYetkinlikler);
            }

            if (matchedTpl?.teknikBeceriler) {
              setTeknikBeceriler(matchedTpl.teknikBeceriler);
            }
          } else {
            // No existing record, clear template fields so they can enter a new one
            setIlkYayinTarihi(new Date().toISOString().split('T')[0]);
            setRevizyonTarihi('');
            setRevizyonNo('0');
            setPozisyonAmaci('');
            setIdariUst('');
            setFonksiyonelUst('');
            setIstirakler('');
            setProjePortfoy('');
            setTasks([]);
            setKpis([]);
            setYonetselYetkinlikler([]);
            setTeknikBeceriler([]);
          }
        }).catch(() => {
          // ignore error
        });
      }
    }
  }, [selectedEmployeeId, employees]);

  const loadEmployees = async () => {
    try {
      setCompanyId(effectiveCompanyId);
      const empList = await employeeService.getAll(effectiveCompanyId || undefined);
      console.log('loadEmployees - yüklenen personel sayısı:', empList?.length || 0);

      if (empList) {
        setEmployees(empList.map((emp: any) => ({
          id: emp.id,
          name: emp.name || 'İsimsiz Personel',
          department: emp.department || 'Belirtilmemiş',
          position: emp.position || 'Belirtilmemiş',
          company_id: emp.company_id,
          company: emp.company,
        } as Employee)));
      }
    } catch (error) {
      console.error('loadEmployees - Hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecords = async () => {
    setRecordsLoading(true);
    setRecordsError('');
    try {
      const data = await gorevTanimiService.getGorevTanimlari(effectiveCompanyId || undefined);
      setSavedRecords(data ?? []);
    } catch (error: any) {
      console.error('Görev tanımı kayıtları yüklenemedi:', error);
      setRecordsError(error?.message || 'Görev tanımı kayıtları yüklenemedi.');
    } finally {
      setRecordsLoading(false);
    }
  };

  const defaultTasks: Task[] = [
    {surec: "Talep Toplama & Tedarik Planlama (MRP/termin bazlı)", yetkinlik: "Planlama & organizasyon", davranis: "PM/ÜM'den gelen BOM/konfigürasyon ve termin bilgilerini netleştirir; eksik bilgiyle satın alma riskini görünür kılar.", raci: "A/R", kpi: "Kritik malzeme plan doğruluğu (%)"},
    {surec: "", yetkinlik: "Analitik Düşünme", davranis: "Kritik malzeme listesi (long lead items) çıkarır; alternatif/ikame senaryoları hazırlar.", raci: "A/R", kpi: "Expedite (acil satın alma) oranı (%)"},
    {surec: "", yetkinlik: "Risk Yönetimi, Paydaş Yönetimi", davranis: "Plan revizyonlarını etkisiyle (termin/bütçe) birlikte yayınlar.", raci: "A/R", kpi: "Plan revizyon sayısı (adet)"},
    {surec: "Tedarikçi Seçimi & Onay Süreci", yetkinlik: "Pazarlık, Ticari Bakış", davranis: "Tedarikçi değerlendirme kriterlerini (fiyat/termin/kalite/servis) standartlaştırır.", raci: "A/R", kpi: "Onaylı tedarikçi oranı (%)"},
    {surec: "", yetkinlik: "Kalite Bilinci", davranis: "Kritik ürünlerde en az 2 kaynak stratejisi kurar (dual sourcing).", raci: "A/R", kpi: "Alternatif tedarikçi sayısı (adet)"},
    {surec: "", yetkinlik: "Prosedür, Disiplin", davranis: "Tedarikçi onay dokümantasyonunu (sertifika, referans, kalite kayıtları) tamamlattırır.", raci: "A/R", kpi: "Tedarikçi ilk yıl performansı (skor)"},
    {surec: "Satın Alma Operasyonu (RFQ–PO–teslimat takibi)", yetkinlik: "Uctan Uca Takip", davranis: "RFQ/teklif karşılaştırmasını şeffaf yapar; satın alma kararını gerekçelendirir.", raci: "A/R", kpi: "OTD (On-time delivery) %"},
    {surec: "", yetkinlik: "Problem Çözme & İletişim", davranis: "Teslimat takvimini günlük/haftalık yönetir; gecikme riskini erken yakalar.", raci: "A/R", kpi: "Gecikme kaynaklı iş duruş saati (saat)"},
    {surec: "", yetkinlik: "Veri Disiplini (ERP)", davranis: "Revizyon/ek işler için maliyet etkisini FIN+SAT ile görünür kılar.", raci: "A/R", kpi: "PO çevrim süresi (gün)"},
    {surec: "İthalat–İhracat & Gümrük Süreçleri", yetkinlik: "Gümrük Lojistik Bilgisi", davranis: "Incoterms, gümrük evrak seti ve teslim sorumluluklarını netleştirir.", raci: "A/R", kpi: "Gümrükleme çevrim süresi (gün)"},
    {surec: "", yetkinlik: "Risk Uyum", davranis: "Gümrük müşaviri/taşıyıcı performansını takip eder.", raci: "A/R", kpi: "Gümrük kaynaklı gecikme adedi (adet)"},
    {surec: "", yetkinlik: "Planlama", davranis: "Gecikme/ceza riskini (evrak eksikliği vb.) proaktif yönetir.", raci: "A/R", kpi: "Ek lojistik maliyet (TL)"},
    {surec: "Depo–Envanter Yönetimi", yetkinlik: "Envanter Yönetimi", davranis: "Stok doğruluğu için sayım planı (cycle count) kurar; sapmaları kök neden analiz eder.", raci: "A/R", kpi: "Stok doğruluğu (%)"},
    {surec: "", yetkinlik: "Süreç Disiplini", davranis: "Minimum–maksimum/ABC gibi yöntemlerle stok seviyelerini optimize eder.", raci: "A/R", kpi: "Stok devir hızı (adet/yıl)"},
    {surec: "", yetkinlik: "Analitik Raporlama", davranis: "Kritik malzeme bulunurluğunu proje risk haritasına bağlar.", raci: "A/R", kpi: "Obsolete/atıl stok (TL)"}
  ];

  const defaultKPIs: KPI[] = [
    {label: "OTIF", value: "%95"},
    {label: "Kritik malzeme gecikmesi", value: "10 saat/ay"},
    {label: "Stok doğruluğu", value: "%98"},
    {label: "Atıl/obsolete stok", value: "5000 TL"},
    {label: "Satın alma tasarrufu", value: "100000 TL/yıl"},
    {label: "PO çevrim süresi", value: "5 gün"},
    {label: "Gümrükleme çevrim süresi", value: "3 gün"},
    {label: "ERP kayıt tamlık", value: "%95"}
  ];

  const defaultYonetsel: Yetkinlik[] = [
    {baslik: "Planlama & Organize Etme – Seviye 3", aciklama: "Çoklu projede önceliklendirme, kritik yol/long-lead yönetimi, revizyon iletişimi."},
    {baslik: "Finansal/Ticari Bakış – Seviye 3", aciklama: "TCO düşünme, tasarrufun doğrulanması, bütçe–kur–revizyon etkisi yönetimi."},
    {baslik: "Ekip Yönetimi & Gelişimi – Seviye 3", aciklama: "Satın alma/depo/lojistik ekiplerinde standart iş, eğitim, performans takibi."}
  ];

  const defaultTeknik = [
    "Satın Alma & Sözleşme Yönetimi – Seviye 4",
    "Tedarikçi Performans Yönetimi – Seviye 3",
    "Envanter Yönetimi (ABC, min–max) – Seviye 3",
    "Lojistik & Sevkiyat Planlama (OTIF) – Seviye 3",
    "Gümrük/İthalat-İhracat, Incoterms – Seviye 3",
    "ERP kullanımı (IFS / benzeri) – Seviye 3",
    "İleri Excel + raporlama (Power BI) – Seviye 3",
    "Kalite/EYS temel bilgisi (ISO) – Seviye 2–3"
  ];

  const defaultKurallar = [
    "İlgili Pozisyonun yetkinlik, beceri ve gereklilikleri için; şirket içi doküman yönetim sisteminde yayınlı güncel 'Pozisyon Gereklilikleri Yetki Tablosu', Pozisyon Yetkinlikleri, Mesleki Beceri Listesi, Prensipler geçerlidir.",
    "İlgili pozisyonun, sorumlu olduğu süreçlerin detayları için; Şirket içi kullanılan Süreç Sistemi, şirket içi doküman yönetim sisteminde yayınlı güncel dokümanlar (Prosedür, Talimat, Duyuru, İç Yazışmalar vb.) geçerlidir. Sorumlu olduğu süreçler dahilinde yöneticilerinin verdiği benzer nitelikteki diğer görevleri gerçekleştirmekle yükümlüdür.",
    "İş tanımı kapsamında yer alan ve yöneticisi tarafından kendisine bildirilen benzer nitelikteki diğer görevlerin; yürürlükteki kanun, tüzük, yönetmelik ve diğer ilgili ve yan mevzuat hükümleri uyarınca gereği gibi yerine getirilmesinden, yetkilerin yerinde, zamanında ve gereğince kullanılmasından sorumludur.",
    "İşbu Görev Tanımı Formu ile kapsamı belirlenen pozisyonun şirket organizasyon yapısı içerisindeki yeri, şirket içi kullanılan ve erişime açık olan 'Organizasyon Yapısı' sisteminde tanımlanmıştır. Şirket, şirket organizasyon yapısını ve ilgili sistemlerde yer alan bilgileri tek taraflı olarak değiştirme hakkını saklı tutar.",
    "İlgili pozisyonun sorumlu olduğu bölge / ürün / işyeri gibi sorumluluk alanı değişimleri için; şirket içi doküman yönetim sisteminde yayınlı güncel duyuru, iç yazışmalar, yayınlı dokümanlar geçerlidir."
  ];

  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [kpis, setKpis] = useState<KPI[]>(defaultKPIs);
  const [yonetselYetkinlikler, setYonetselYetkinlikler] = useState<Yetkinlik[]>(defaultYonetsel);
  const [teknikBeceriler, setTeknikBeceriler] = useState<string[]>(defaultTeknik);
  const [kurallar, setKurallar] = useState<string[]>(defaultKurallar);

  const filteredTasks = tasks.filter((task) =>
    Object.values(task).some((val) => String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToExcel = () => {
    alert('Excel export fonksiyonu için XLSX kütüphanesi eklenmesi gerekiyor.');
  };

  const escapeHtml = (val: any) =>
    String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const printGorevTanimiPdf = (pdfData: {
    employeeName?: string;
    pozisyonAdi: string;
    sirketAdi: string;
    isBirimi: string;
    lokasyon: string;
    idariUst: string;
    fonksiyonelUst: string;
    ilkYayinTarihi: string;
    revizyonTarihi: string;
    revizyonNo: string;
    pozisyonAmaci: string;
    projePortfoy?: string;
    tasks: Task[];
    kpis: KPI[];
    yonetselYetkinlikler: Yetkinlik[];
    teknikBeceriler: string[];
    kurallar: string[];
  }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('PDF yazdırma penceresi engellendi. Lütfen tarayıcı izinlerini kontrol edin.');
      return;
    }

    const docTitle = [pdfData.pozisyonAdi || 'Görev Tanımı', pdfData.employeeName]
      .filter(Boolean)
      .join(' - ');

    const tasksRowsHtml = pdfData.tasks
      .filter((t) => t.surec || t.yetkinlik || t.davranis || t.kpi)
      .map(
        (t) => `
        <tr>
          <td><strong>${escapeHtml(t.surec || '-')}</strong></td>
          <td>${escapeHtml(t.yetkinlik || '-')}</td>
          <td>${escapeHtml(t.davranis || '-')}</td>
          <td style="text-align:center; font-weight:700;">${escapeHtml(t.raci || 'A/R')}</td>
          <td>${escapeHtml(t.kpi || '-')}</td>
        </tr>
      `
      )
      .join('');

    const kpisHtml = pdfData.kpis
      .filter((k) => k.label || k.value)
      .map(
        (k) => `
        <div class="kpi-item">
          <span class="kpi-label">${escapeHtml(k.label)}</span>
          <span class="kpi-val">${escapeHtml(k.value || '-')}</span>
        </div>
      `
      )
      .join('');

    const yonetselHtml = pdfData.yonetselYetkinlikler
      .filter((y) => y.baslik || y.aciklama)
      .map(
        (y) => `
        <div class="comp-card">
          <div class="comp-title">${escapeHtml(y.baslik)}</div>
          ${y.aciklama ? `<div class="comp-desc">${escapeHtml(y.aciklama)}</div>` : ''}
        </div>
      `
      )
      .join('');

    const teknikHtml = pdfData.teknikBeceriler
      .filter(Boolean)
      .map((b) => `<li class="skill-item">${escapeHtml(b)}</li>`)
      .join('');

    const kurallarHtml = pdfData.kurallar
      .filter(Boolean)
      .map((k, idx) => `<div class="rule-item"><strong>${idx + 1}.</strong> ${escapeHtml(k)}</div>`)
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>Görev Tanımı - ${escapeHtml(docTitle)}</title>
  <style>
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11.5px;
      line-height: 1.45;
    }
    .header-box {
      border: 2px solid #1e293b;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .header-grid {
      width: 100%;
      border-collapse: collapse;
    }
    .header-grid td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      vertical-align: middle;
    }
    .header-main {
      background: #1e293b;
      color: #ffffff;
      text-align: center;
    }
    .header-main h1 {
      margin: 0;
      font-size: 18px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header-main p {
      margin: 4px 0 0;
      font-size: 12.5px;
      color: #bbf7d0;
      font-weight: 600;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .meta-table td {
      border: 1px solid #e2e8f0;
      padding: 4px 8px;
    }
    .meta-label {
      background: #f8fafc;
      font-weight: 700;
      color: #475569;
      width: 48%;
    }
    .section {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .section-breakable {
      margin-bottom: 14px;
    }
    .section-title {
      background: #f1f5f9;
      border-left: 4px solid #16a34a;
      padding: 6px 10px;
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      font-size: 11.5px;
    }
    .info-table td.lbl {
      background: #f8fafc;
      font-weight: 700;
      color: #334155;
      width: 22%;
    }
    .info-table td.val {
      width: 28%;
      color: #0f172a;
    }
    .purpose-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      background: #ffffff;
      white-space: pre-line;
      text-align: justify;
    }
    .portfolio-box {
      margin-top: 6px;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 11px;
    }
    .tasks-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .tasks-table th {
      background: #1e293b;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #1e293b;
      font-weight: 600;
    }
    .tasks-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: top;
    }
    .tasks-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .kpi-item {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }
    .kpi-label {
      font-weight: 600;
      color: #334155;
    }
    .kpi-val {
      font-weight: 700;
      color: #15803d;
      margin-left: 8px;
    }
    .comp-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .comp-card {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 7px 10px;
      background: #ffffff;
    }
    .comp-title {
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #bbf7d0;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .comp-desc {
      font-size: 10.5px;
      color: #475569;
    }
    .skills-list {
      margin: 0;
      padding-left: 18px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px 16px;
    }
    .skill-item {
      font-size: 11px;
      color: #1e293b;
    }
    .rule-item {
      font-size: 10px;
      color: #334155;
      margin-bottom: 5px;
      text-align: justify;
    }
    .signatures {
      margin-top: 22px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      page-break-inside: avoid;
    }
    .sig-box {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      min-height: 105px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sig-title {
      font-weight: 700;
      font-size: 11px;
      color: #334155;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .sig-footer {
      margin-top: 38px;
      border-top: 1px dashed #94a3b8;
      padding-top: 5px;
      font-size: 10.5px;
      color: #475569;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <table class="header-grid">
      <tr>
        <td class="header-main" style="width: 68%;">
          <h1>GÖREV TANIMI FORMU</h1>
          <p>${escapeHtml(pdfData.pozisyonAdi || 'Görev Tanımı')}</p>
        </td>
        <td style="width: 32%; padding: 0;">
          <table class="meta-table">
            <tr>
              <td class="meta-label">İlk Yayın Tarihi</td>
              <td>${escapeHtml(pdfData.ilkYayinTarihi || new Date().toLocaleDateString('tr-TR'))}</td>
            </tr>
            <tr>
              <td class="meta-label">Revizyon Tarihi</td>
              <td>${escapeHtml(pdfData.revizyonTarihi || '-')}</td>
            </tr>
            <tr>
              <td class="meta-label">Revizyon No</td>
              <td>${escapeHtml(pdfData.revizyonNo || '0')}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">1. Pozisyon &amp; Organizasyon Bilgileri</div>
    <table class="info-table">
      ${
        pdfData.employeeName
          ? `<tr>
              <td class="lbl">Personel Adı Soyadı</td>
              <td class="val" colspan="3"><strong>${escapeHtml(pdfData.employeeName)}</strong></td>
            </tr>`
          : ''
      }
      <tr>
        <td class="lbl">Pozisyon Adı</td>
        <td class="val"><strong>${escapeHtml(pdfData.pozisyonAdi || '-')}</strong></td>
        <td class="lbl">Şirket Adı</td>
        <td class="val">${escapeHtml(pdfData.sirketAdi || '-')}</td>
      </tr>
      <tr>
        <td class="lbl">İş Birimi / Departman</td>
        <td class="val">${escapeHtml(pdfData.isBirimi || '-')}</td>
        <td class="lbl">Lokasyon</td>
        <td class="val">${escapeHtml(pdfData.lokasyon || 'Merkez Ofis')}</td>
      </tr>
      <tr>
        <td class="lbl">Bağlı Olunan Üst (İdari)</td>
        <td class="val">${escapeHtml(pdfData.idariUst || '-')}</td>
        <td class="lbl">Bağlı Olunan Üst (Fonksiyonel)</td>
        <td class="val">${escapeHtml(pdfData.fonksiyonelUst || pdfData.idariUst || '-')}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">2. Pozisyonun Amacı</div>
    <div class="purpose-box">${escapeHtml(pdfData.pozisyonAmaci || '-')}</div>
    ${
      pdfData.projePortfoy
        ? `<div class="portfolio-box"><strong>Proje Portföyü Teslimat Performansı:</strong> ${escapeHtml(pdfData.projePortfoy)}</div>`
        : ''
    }
  </div>

  ${
    tasksRowsHtml
      ? `<div class="section-breakable">
          <div class="section-title">3. Süreçler, Yetkinlikler, RACI ve KPI Tablosu</div>
          <table class="tasks-table">
            <thead>
              <tr>
                <th style="width: 22%;">Süreç Adı / Sorumluluk</th>
                <th style="width: 16%;">Yetkinlik</th>
                <th style="width: 34%;">Davranış Göstergeleri / Çalışmalar</th>
                <th style="width: 8%; text-align:center;">RACI</th>
                <th style="width: 20%;">KPI</th>
              </tr>
            </thead>
            <tbody>
              ${tasksRowsHtml}
            </tbody>
          </table>
        </div>`
      : ''
  }

  ${
    kpisHtml
      ? `<div class="section">
          <div class="section-title">4. Genel Performans Göstergeleri (KPI)</div>
          <div class="kpi-grid">${kpisHtml}</div>
        </div>`
      : ''
  }

  ${
    yonetselHtml
      ? `<div class="section">
          <div class="section-title">5. Yönetsel Yetkinlikler</div>
          <div class="comp-grid">${yonetselHtml}</div>
        </div>`
      : ''
  }

  ${
    teknikHtml
      ? `<div class="section">
          <div class="section-title">6. Teknik / Mesleki Beceriler</div>
          <ul class="skills-list">${teknikHtml}</ul>
        </div>`
      : ''
  }

  ${
    kurallarHtml
      ? `<div class="section">
          <div class="section-title">7. Genel Kurallar</div>
          ${kurallarHtml}
        </div>`
      : ''
  }

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-title">Hazırlayan / Onaylayan Yönetici</div>
      <div class="sig-footer">
        <span>Ad Soyad / Unvan</span>
        <span>İmza</span>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Tebellüğ Eden Personel</div>
      <div style="font-size: 11px; margin-top: 6px; font-weight: 600;">
        ${escapeHtml(pdfData.employeeName || '')}
      </div>
      <div class="sig-footer">
        <span>Tarih: .... / .... / 202..</span>
        <span>İmza</span>
      </div>
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
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadFormPdf = () => {
    const selectedEmp = employees.find((e) => e.id === selectedEmployeeId);
    const resolvedCompany =
      selectedEmp?.company ||
      (sirketAdi && sirketAdi !== 'Varsayılan Şirket' ? sirketAdi : '') ||
      'HUMANİUS KURUMSAL';

    printGorevTanimiPdf({
      employeeName: selectedEmp?.name || '',
      pozisyonAdi: pozisyonAdi || selectedEmp?.position || 'Görev Tanımı',
      sirketAdi: resolvedCompany,
      isBirimi: isBirimi || selectedEmp?.department || '-',
      lokasyon: lokasyon || 'Merkez Ofis',
      idariUst: idariUst || '-',
      fonksiyonelUst: fonksiyonelUst || idariUst || '-',
      ilkYayinTarihi: ilkYayinTarihi || new Date().toISOString().split('T')[0],
      revizyonTarihi: revizyonTarihi || '-',
      revizyonNo: revizyonNo || '0',
      pozisyonAmaci: pozisyonAmaci || '-',
      projePortfoy,
      tasks,
      kpis,
      yonetselYetkinlikler,
      teknikBeceriler,
      kurallar,
    });
  };

  const handleDownloadTemplatePdf = (tpl: JobTemplate) => {
    const selectedEmp = employees.find((e) => e.id === selectedEmployeeId);
    const resolvedCompany =
      selectedEmp?.company ||
      (sirketAdi && sirketAdi !== 'Varsayılan Şirket' ? sirketAdi : '') ||
      'HUMANİUS KURUMSAL';

    printGorevTanimiPdf({
      employeeName: selectedEmp?.name || '',
      pozisyonAdi: tpl.title,
      sirketAdi: resolvedCompany,
      isBirimi: tpl.department,
      lokasyon: lokasyon || 'Merkez Ofis',
      idariUst: tpl.reportsTo,
      fonksiyonelUst: tpl.reportsTo,
      ilkYayinTarihi: new Date().toISOString().split('T')[0],
      revizyonTarihi: '-',
      revizyonNo: '0',
      pozisyonAmaci: tpl.summary,
      projePortfoy: '',
      tasks: tpl.tasks,
      kpis: tpl.kpis,
      yonetselYetkinlikler: tpl.yonetselYetkinlikler,
      teknikBeceriler: tpl.teknikBeceriler,
      kurallar: defaultKurallar,
    });
  };

  const handleDownloadRecordPdf = (record: any) => {
    const matchedEmp = employees.find((e) => e.id === record.employee_id);
    const matchedTpl = JOB_TEMPLATES.find(
      (t) => normalizeTr(t.title) === normalizeTr(record.gorev_adi || '')
    );

    const sorumluluklarArr: string[] = Array.isArray(record.sorumluluklar) ? record.sorumluluklar : [];
    const calismalarArr: string[] = Array.isArray(record.calismalar) ? record.calismalar : [];
    const maxLen = Math.max(sorumluluklarArr.length, calismalarArr.length);

    let recordTasks: Task[] = [];
    if (maxLen > 0) {
      for (let i = 0; i < maxLen; i++) {
        const tplTask = matchedTpl?.tasks?.[i];
        recordTasks.push({
          surec: sorumluluklarArr[i] ?? tplTask?.surec ?? '',
          yetkinlik: tplTask?.yetkinlik ?? '',
          davranis: calismalarArr[i] ?? tplTask?.davranis ?? '',
          raci: tplTask?.raci ?? 'A/R',
          kpi: tplTask?.kpi ?? '',
        });
      }
    } else if (matchedTpl) {
      recordTasks = matchedTpl.tasks;
    }

    const perfArr: string[] = Array.isArray(record.performans_kriterleri) ? record.performans_kriterleri : [];
    const recordKpis: KPI[] =
      perfArr.length > 0
        ? perfArr.map((item: string) => {
            const sepIdx = item.indexOf(':');
            if (sepIdx !== -1) {
              return {
                label: item.slice(0, sepIdx).trim(),
                value: item.slice(sepIdx + 1).trim(),
              };
            }
            return { label: item, value: '' };
          })
        : matchedTpl?.kpis ?? [];

    const yetkiArr: string[] = Array.isArray(record.yetki_ve_sorumluluklar) ? record.yetki_ve_sorumluluklar : [];
    const recordYonetsel: Yetkinlik[] =
      yetkiArr.length > 0
        ? yetkiArr.map((baslik: string, idx: number) => ({
            baslik,
            aciklama: matchedTpl?.yonetselYetkinlikler?.[idx]?.aciklama ?? '',
          }))
        : matchedTpl?.yonetselYetkinlikler ?? [];

    const createdDate = record.created_at
      ? new Date(record.created_at).toLocaleDateString('tr-TR')
      : new Date().toLocaleDateString('tr-TR');

    const resolvedCompany =
      matchedEmp?.company ||
      (sirketAdi && sirketAdi !== 'Varsayılan Şirket' ? sirketAdi : '') ||
      'HUMANİUS KURUMSAL';

    printGorevTanimiPdf({
      employeeName: record.employee_name || matchedEmp?.name || '',
      pozisyonAdi: record.gorev_adi || matchedEmp?.position || 'Görev Tanımı',
      sirketAdi: resolvedCompany,
      isBirimi: record.is_birimi || matchedEmp?.department || '-',
      lokasyon: lokasyon || 'Merkez Ofis',
      idariUst: record.bagli_oldugu_pozisyon || matchedTpl?.reportsTo || '-',
      fonksiyonelUst: record.bagli_oldugu_pozisyon || matchedTpl?.reportsTo || '-',
      ilkYayinTarihi: record.ilk_yayin_tarihi || createdDate,
      revizyonTarihi: record.revizyon_tarihi || '-',
      revizyonNo: record.revizyon_no !== undefined ? String(record.revizyon_no) : '0',
      pozisyonAmaci: record.gorev_aciklama || matchedTpl?.summary || '-',
      projePortfoy: '',
      tasks: recordTasks,
      kpis: recordKpis,
      yonetselYetkinlikler: recordYonetsel,
      teknikBeceriler: matchedTpl?.teknikBeceriler ?? [],
      kurallar: defaultKurallar,
    });
  };

  const resetForm = () => {
    if (confirm('Tüm değişiklikler sıfırlansın mı?')) {
      setTasks(defaultTasks);
      setKpis(defaultKPIs);
      setYonetselYetkinlikler(defaultYonetsel);
      setTeknikBeceriler(defaultTeknik);
      setKurallar(defaultKurallar);
    }
  };

  const handleSaveGorevTanimi = async () => {
    if (!selectedEmployeeId) {
      alert('Lütfen bir personel seçin.');
      return;
    }

    if (!user) {
      setSaveError('Bu işlemi gerçekleştirmek için giriş yapmanız gerekiyor.');
      return;
    }

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    if (!selectedEmployee) {
      alert('Seçilen personel bulunamadı.');
      return;
    }

    const targetCompanyId = selectedEmployee.company_id || profile?.company_id || (employees.find(e => e.company_id)?.company_id) || '11111111-1111-1111-1111-111111111111';

    const gorevTanimi = {
      company_id: targetCompanyId,
      employee_id: selectedEmployeeId,
      employee_name: selectedEmployee.name,
      gorev_adi: pozisyonAdi,
      gorev_aciklama: pozisyonAmaci,
      sorumluluklar: tasks.map(t => t.surec).filter(Boolean),
      yetki_ve_sorumluluklar: yonetselYetkinlikler.map(y => y.baslik),
      calismalar: tasks.map(t => t.davranis).filter(Boolean),
      performans_kriterleri: kpis.map(k => `${k.label}: ${k.value}`),
      bagli_oldugu_pozisyon: idariUst,
      is_birimi: isBirimi,
      onay_durumu: 'onaylandi',
      onay_tarihi: new Date().toISOString()
    };

    try {
      console.log('Görev tanımı payloadu:', gorevTanimi);
      const result = await gorevTanimiService.createGorevTanimi(gorevTanimi);
      setSavedGorevTanimiId(result.id);
      setSavedRecords(prev => [result, ...prev]);
      setSaveSuccess(true);
      setSaveError('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Görev tanımı kaydedilemedi:', error);
      const detailMessage = error?.details || error?.hint || error?.message;
      setSaveError(
        detailMessage
          ? `Görev tanımı kaydedilirken bir hata oluştu: ${detailMessage}`
          : 'Görev tanımı kaydedilirken bir hata oluştu.'
      );
      setSaveSuccess(false);
      return;
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const filteredEmployees = employees.filter((emp) => {
    const q = employeeSearchTerm.toLowerCase();
    return (
      String(emp.name ?? '').toLowerCase().includes(q) ||
      String(emp.position ?? '').toLowerCase().includes(q) ||
      String(emp.department ?? '').toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }



  if (mode === 'records') {
    const filteredRecords = savedRecords.filter((record) => {
      const q = recordsSearchTerm.toLowerCase();
      return (
        String(record.employee_name ?? '').toLowerCase().includes(q) ||
        String(record.gorev_adi ?? '').toLowerCase().includes(q) ||
        String(record.is_birimi ?? '').toLowerCase().includes(q) ||
        String(record.onay_durumu ?? '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6 text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <History className="h-7 w-7" />
                <div>
                  <h1 className="text-2xl font-semibold">Görev Tanım Kayıtları</h1>
                  <p className="text-sm text-slate-300">Kaydedilen ve onaylanan görev tanımı kayıtlarını listeleyin</p>
                </div>
              </div>
              <button
                onClick={loadRecords}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4" />
                Yenile
              </button>
            </div>

            <div className="border-b bg-slate-50 px-6 py-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={recordsSearchTerm}
                  onChange={(e) => setRecordsSearchTerm(e.target.value)}
                  placeholder="Personel, görev adı, iş birimi veya durum ara..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {recordsError && (
              <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {recordsError}
              </div>
            )}

            {recordsLoading ? (
              <div className="px-6 py-10 text-sm text-slate-500">Kayıtlar yükleniyor...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">Gösterilecek görev tanım kaydı bulunamadı.</div>
            ) : (
                <table className="w-full min-w-[700px]">
                  <thead className="bg-slate-100 border-y border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Personel</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Görev Adı</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">İş Birimi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bağlı Pozisyon</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kayıt Tarihi</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => {
                      return (
                        <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-800">{record.employee_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{record.gorev_adi || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{record.is_birimi || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{record.bagli_oldugu_pozisyon || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {record.created_at ? new Date(record.created_at).toLocaleString('tr-TR') : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDownloadRecordPdf(record)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                              title="Görev Tanımını PDF Olarak İndir"
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF İndir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            )}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-10 py-8 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <FileText className="h-8 w-8" />
              <h1 className="text-3xl font-semibold">GÖREV TANIMI</h1>
              <span className="rounded-full bg-green-600 px-4 py-2 text-base shadow-sm">{pozisyonAdi || 'Görev Tanımı'}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-base font-medium text-slate-200">
              <div className="flex items-center gap-2">
                İlk Yayın:
                <input
                  type="date"
                  value={ilkYayinTarihi}
                  onChange={(e) => setIlkYayinTarihi(e.target.value)}
                  className="rounded border-0 bg-white/10 px-3 py-1.5 text-white text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                Revizyon:
                <input
                  type="date"
                  value={revizyonTarihi}
                  onChange={(e) => setRevizyonTarihi(e.target.value)}
                  className="rounded border-0 bg-white/10 px-3 py-1.5 text-white text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                Rev. No:
                <input
                  type="text"
                  value={revizyonNo}
                  onChange={(e) => setRevizyonNo(e.target.value)}
                  className="w-16 rounded border-0 bg-white/10 px-3 py-1.5 text-white text-base"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-slate-50 px-6 py-4">
            <div className="flex gap-3 flex-wrap items-center">
              <div className="flex flex-col gap-2">
                <label className="text-base font-semibold text-slate-800">Personel Seçimi:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    placeholder="Personel ara (isim, pozisyon, departman)..."
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[250px]"
                  />
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[350px]"
                  >
                    <option value="">Personel Seçin ({filteredEmployees.length}/{employees.length})</option>
                    {filteredEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} - {emp.position} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600"
              >
                <Sparkles className="h-4 w-4" />
                Hazır Şablondan Yükle
              </button>
              <button
                onClick={handleSaveGorevTanimi}
                disabled={!selectedEmployeeId}
                className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                Kaydet
              </button>
              <button
                type="button"
                onClick={handleDownloadFormPdf}
                className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-700"
              >
                <Download className="h-4 w-4" />
                PDF İndir
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Excel'e Aktar
              </button>
              <button
                onClick={resetForm}
                className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-base font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Sıfırla
              </button>
          </div>
        </div>

          {saveSuccess && (
            <div className="mx-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Görev tanımı başarıyla kaydedildi.</p>
            </div>
          )}
          {saveError && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{saveError}</p>
            </div>
          )}

          <div className="p-8">
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-800">
                <span className="text-2xl">📌</span> 1. Pozisyon & Organizasyon Bilgileri
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">Pozisyon Adı</label>
                  <input
                    type="text"
                    value={pozisyonAdi}
                    onChange={(e) => setPozisyonAdi(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">Şirket Adı</label>
                  <input
                    type="text"
                    value={sirketAdi}
                    onChange={(e) => setSirketAdi(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">İş Birimi</label>
                  <input
                    type="text"
                    value={isBirimi}
                    onChange={(e) => setIsBirimi(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">Lokasyon</label>
                  <input
                    type="text"
                    value={lokasyon}
                    onChange={(e) => setLokasyon(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">Bağlı Olunan Üst (İdari)</label>
                  <input
                    type="text"
                    value={idariUst}
                    onChange={(e) => setIdariUst(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">Bağlı Olunan Üst (Fonksiyonel)</label>
                  <input
                    type="text"
                    value={fonksiyonelUst}
                    onChange={(e) => setFonksiyonelUst(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-800">
                <span className="text-2xl">🎯</span> 2. Pozisyonun Amacı
              </h2>
              <textarea
                value={pozisyonAmaci}
                onChange={(e) => setPozisyonAmaci(e.target.value)}
                rows={10}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 transition focus:border-green-500 focus:outline-none"
              />
              <div className="mt-4 rounded-xl bg-blue-50 p-4">
                <label className="mb-2 block text-base font-bold text-slate-800">Proje Portföyü Teslimat Performansı</label>
                <input
                  type="text"
                  value={projePortfoy}
                  onChange={(e) => setProjePortfoy(e.target.value)}
                  className="w-full rounded-lg border-2 border-blue-200 px-4 py-2 transition focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-800">
                <span className="text-2xl">📋</span> 3. Süreçler, Yetkinlikler, RACI ve KPI Tablosu
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-green-600 bg-slate-50">
                      <th className="p-3 text-left font-semibold text-slate-700">Süreç Adı</th>
                      <th className="p-3 text-left font-semibold text-slate-700">Yetkinlik</th>
                      <th className="p-3 text-left font-semibold text-slate-700">Davranış Göstergeleri</th>
                      <th className="p-3 text-left font-semibold text-slate-700">RACI</th>
                      <th className="p-3 text-left font-semibold text-slate-700">KPI</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-2">
                          <input
                            type="text"
                            value={task.surec}
                            onChange={(e) => {
                              const newTasks = [...tasks];
                              newTasks[idx].surec = e.target.value;
                              setTasks(newTasks);
                            }}
                            className="w-full rounded border border-slate-300 px-2 py-1"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={task.yetkinlik}
                            onChange={(e) => {
                              const newTasks = [...tasks];
                              newTasks[idx].yetkinlik = e.target.value;
                              setTasks(newTasks);
                            }}
                            className="w-full rounded border border-slate-300 px-2 py-1"
                          />
                        </td>
                        <td className="p-2">
                          <textarea
                            value={task.davranis}
                            onChange={(e) => {
                              const newTasks = [...tasks];
                              newTasks[idx].davranis = e.target.value;
                              setTasks(newTasks);
                            }}
                            rows={2}
                            className="w-full rounded border border-slate-300 px-2 py-1"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={task.raci}
                            onChange={(e) => {
                              const newTasks = [...tasks];
                              newTasks[idx].raci = e.target.value;
                              setTasks(newTasks);
                            }}
                            className="w-full rounded border border-slate-300 px-2 py-1"
                          >
                            <option value="A/R">A/R</option>
                            <option value="R">R</option>
                            <option value="A">A</option>
                            <option value="C">C</option>
                            <option value="I">I</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={task.kpi}
                            onChange={(e) => {
                              const newTasks = [...tasks];
                              newTasks[idx].kpi = e.target.value;
                              setTasks(newTasks);
                            }}
                            className="w-full rounded border border-slate-300 px-2 py-1"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => {
                              if (confirm('Bu satırı silmek istediğinizden emin misiniz?')) {
                                setTasks(tasks.filter((_, i) => i !== idx));
                              }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:bg-red-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setTasks([...tasks, {surec: '', yetkinlik: '', davranis: '', raci: 'A/R', kpi: ''}])}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-slate-600 transition hover:border-green-500 hover:bg-slate-100"
              >
                <Plus className="h-5 w-5" />
                Yeni Görev Satırı Ekle
              </button>
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-800">
                <span className="text-2xl">📈</span> 4. Genel Performans Göstergeleri
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {kpis.map((kpi, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <input
                      type="text"
                      value={kpi.label}
                      onChange={(e) => {
                        const newKpis = [...kpis];
                        newKpis[idx].label = e.target.value;
                        setKpis(newKpis);
                      }}
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                      placeholder="KPI Adı"
                    />
                    <input
                      type="text"
                      value={kpi.value}
                      onChange={(e) => {
                        const newKpis = [...kpis];
                        newKpis[idx].value = e.target.value;
                        setKpis(newKpis);
                      }}
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                      placeholder="Hedef"
                    />
                    <button
                      onClick={() => {
                        if (confirm('Bu KPI\'yı silmek istediğinizden emin misiniz?')) {
                          setKpis(kpis.filter((_, i) => i !== idx));
                        }
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:bg-red-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setKpis([...kpis, {label: 'Yeni KPI', value: ''}])}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-slate-600 transition hover:border-green-500 hover:bg-slate-100"
              >
                <Plus className="h-5 w-5" />
                Yeni KPI Ekle
              </button>
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-800">
                <span className="text-2xl">👔</span> 5. Yönetsel Yetkinlikler
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {yonetselYetkinlikler.map((yet, idx) => (
                  <div key={idx} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <button
                      onClick={() => {
                        if (confirm('Bu yetkinliği silmek istediğinizden emin misiniz?')) {
                          setYonetselYetkinlikler(yonetselYetkinlikler.filter((_, i) => i !== idx));
                        }
                      }}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:bg-red-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      value={yet.baslik}
                      onChange={(e) => {
                        const newYet = [...yonetselYetkinlikler];
                        newYet[idx].baslik = e.target.value;
                        setYonetselYetkinlikler(newYet);
                      }}
                      className="mb-2 w-full border-0 border-b-2 border-green-500 bg-transparent pb-1 font-semibold focus:outline-none"
                    />
                    <textarea
                      value={yet.aciklama}
                      onChange={(e) => {
                        const newYet = [...yonetselYetkinlikler];
                        newYet[idx].aciklama = e.target.value;
                        setYonetselYetkinlikler(newYet);
                      }}
                      rows={3}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setYonetselYetkinlikler([...yonetselYetkinlikler, {baslik: 'Yeni Yetkinlik – Seviye 3', aciklama: ''}])}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-slate-600 transition hover:border-green-500 hover:bg-slate-100"
              >
                <Plus className="h-5 w-5" />
                Yeni Yönetsel Yetkinlik Ekle
              </button>
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-800">
                <span className="text-2xl">🛠️</span> 6. Teknik / Mesleki Beceriler
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {teknikBeceriler.map((beceri, idx) => (
                  <div key={idx} className="relative">
                    <button
                      onClick={() => {
                        if (confirm('Bu beceriyi silmek istediğinizden emin misiniz?')) {
                          setTeknikBeceriler(teknikBeceriler.filter((_, i) => i !== idx));
                        }
                      }}
                      className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:bg-red-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <input
                      type="text"
                      value={beceri}
                      onChange={(e) => {
                        const newBeceri = [...teknikBeceriler];
                        newBeceri[idx] = e.target.value;
                        setTeknikBeceriler(newBeceri);
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTeknikBeceriler([...teknikBeceriler, ''])}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-slate-600 transition hover:border-green-500 hover:bg-slate-100"
              >
                <Plus className="h-5 w-5" />
                Yeni Teknik Beceri Ekle
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-800">
                <span className="text-2xl">📜</span> 7. Bireysel Katkı Rolleri için Geçerli Genel Kurallar
              </h2>
              <div className="space-y-3">
                {kurallar.map((kural, idx) => (
                  <div key={idx} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <button
                      onClick={() => {
                        if (confirm('Bu kuralı silmek istediğinizden emin misiniz?')) {
                          setKurallar(kurallar.filter((_, i) => i !== idx));
                        }
                      }}
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:bg-red-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex gap-3">
                      <span className="min-w-[30px] font-bold text-slate-700">{idx + 1}.</span>
                      <textarea
                        value={kural}
                        onChange={(e) => {
                          const newKurallar = [...kurallar];
                          newKurallar[idx] = e.target.value;
                          setKurallar(newKurallar);
                        }}
                        rows={3}
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setKurallar([...kurallar, 'Yeni kural maddesi...'])}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-slate-600 transition hover:border-green-500 hover:bg-slate-100"
              >
                <Plus className="h-5 w-5" />
                Yeni Kural Ekle
              </button>
            </div>
          </div>
        </div>
      </div>


      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-amber-500 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Standart Görev Tanımı Kütüphanesi</h2>
                  <p className="text-xs text-amber-100">ISO/MYK uyumlu hazır şablonlardan 1 tıkla yükleyin</p>
                </div>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 text-white/80 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Pozisyon veya anahtar kelime ara (örn. Boyacı, İK, Muhasebe)..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {['all', 'Çevre & İSG', 'İnsan Kaynakları & İdari İşler', 'Muhasebe & Finans', 'Satış & Pazarlama', 'Servis & Hasar', 'Üretim & İmalat', 'Depo & Lojistik', 'Yazılım & IT', 'Yönetim'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat ? 'bg-amber-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cat === 'all' ? 'Tüm Kategoriler' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates List Grid */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 bg-gray-50/50">
              {filteredTemplates.map((tpl) => (
                <div key={tpl.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">{tpl.category}</span>
                      <span className="text-xs text-gray-400">{tpl.department}</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{tpl.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-3 mb-3">{tpl.summary}</p>
                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <p>🔹 <span className="font-semibold">{tpl.tasks.length} Sorumluluk Maddesi</span></p>
                      <p>🔹 <span className="font-semibold">{tpl.kpis.length} KPI / Performans Göstergesi</span></p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Bu Şablonu Forma Yükle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplatePdf(tpl)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      title="Bu şablonu PDF olarak indir"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF İndir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
