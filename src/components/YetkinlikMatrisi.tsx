import React, { useState, useMemo } from 'react';
import { Search, Target, CheckCircle2, ShieldCheck, BookOpen, Briefcase, Filter } from 'lucide-react';
import type { Employee } from '../types';

export interface PozisyonYetkinlik {
  id: string;
  ad: string;
  kategori: 'Teknik' | 'Sosyal' | 'Analitik' | 'Yönetim' | 'İş & Süreç' | 'Hukuk & Uyum';
  aciklama: string;
  minSeviye: number; // 1 to 5
  onemDerecesi: 'Zorunlu' | 'Kritik' | 'Önemli' | 'Tercih Sebebi';
}

export interface PozisyonTanimi {
  pozisyon: string;
  departman: string;
  aciklama: string;
  yetkinlikler: PozisyonYetkinlik[];
}

const SEVIYE_ETIKET = ['', '%20 (Başlangıç)', '%40 (Temel)', '%60 (Orta)', '%80 (İleri)', '%100 (Uzman)'];
const SEVIYE_RENK = ['', 'bg-red-50 text-red-700 border-red-200', 'bg-orange-50 text-orange-700 border-orange-200', 'bg-amber-50 text-amber-700 border-amber-200', 'bg-blue-50 text-blue-700 border-blue-200', 'bg-emerald-50 text-emerald-700 border-emerald-200'];

const ONEM_RENK: Record<string, string> = {
  'Zorunlu': 'bg-red-100 text-red-800 border-red-200',
  'Kritik': 'bg-purple-100 text-purple-800 border-purple-200',
  'Önemli': 'bg-blue-100 text-blue-800 border-blue-200',
  'Tercih Sebebi': 'bg-gray-100 text-gray-700 border-gray-200',
};

const KATEGORI_RENK: Record<string, string> = {
  'Teknik': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Sosyal': 'bg-pink-50 text-pink-700 border-pink-200',
  'Analitik': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Yönetim': 'bg-amber-50 text-amber-700 border-amber-200',
  'İş & Süreç': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Hukuk & Uyum': 'bg-purple-50 text-purple-700 border-purple-200',
};

const HAZIR_POZISYON_GEREKSINIMLERI: PozisyonTanimi[] = [
  {
    pozisyon: 'Yazılım Geliştirici',
    departman: 'Yazılım & Teknoloji',
    aciklama: 'Modern web ve kurumsal yazılım sistemlerinin mimari tasarımı, kodlanması ve güvenliğinin sağlanması.',
    yetkinlikler: [
      {
        id: 'yg-1',
        ad: 'Clean Code & Yazılım Mimarisi',
        kategori: 'Teknik',
        aciklama: 'SOLID prensipleri, tasarım kalıpları (Design Patterns) ve mikroservis mimarilerine hakimiyet.',
        minSeviye: 4,
        onemDerecesi: 'Zorunlu',
      },
      {
        id: 'yg-2',
        ad: 'Veritabanı & SQL / NoSQL Modelleme',
        kategori: 'Teknik',
        aciklama: 'İlişkisel veritabanı şema tasarımı, indeksleme, sorgu optimizasyonu ve veri bütünlüğü.',
        minSeviye: 4,
        onemDerecesi: 'Kritik',
      },
      {
        id: 'yg-3',
        ad: 'Siber Güvenlik & OWASP Standartları',
        kategori: 'Hukuk & Uyum',
        aciklama: 'Güvenli kod yazımı, veri şifreleme ve yetkilendirme açıklarına karşı önleyici geliştirme.',
        minSeviye: 3,
        onemDerecesi: 'Zorunlu',
      },
      {
        id: 'yg-4',
        ad: 'Problem Çözme & Algoritmik Düşünme',
        kategori: 'Analitik',
        aciklama: 'Karmaşık iş mantıklarını hızlı analiz edip optimize algoritmalara dönüştürebilme.',
        minSeviye: 4,
        onemDerecesi: 'Kritik',
      },
      {
        id: 'yg-5',
        ad: 'Çevik (Agile / Scrum) Takım Çalışması',
        kategori: 'Sosyal',
        aciklama: 'Sprint planlamalarına uyum, kod inceleme (Code Review) kültürü ve yapıcı iletişim.',
        minSeviye: 3,
        onemDerecesi: 'Önemli',
      },
    ],
  },
  {
    pozisyon: 'İnsan Kaynakları Uzmanı',
    departman: 'İnsan Kaynakları',
    aciklama: 'İşe alım, yetenek yönetimi, özlük mevzuatı ve çalışan deneyimi süreçlerinin uçtan uca yürütülmesi.',
    yetkinlikler: [
      {
        id: 'ik-1',
        ad: '4857 Sayılı İş Kanunu & Mevzuat Hakimiyeti',
        kategori: 'Hukuk & Uyum',
        aciklama: 'İş akdi feshi, izinler, fazla mesai, SGK bildirgeleri ve yasal risklerin önlenmesi.',
        minSeviye: 4,
        onemDerecesi: 'Zorunlu',
      },
      {
        id: 'ik-2',
        ad: 'Yetkinlik Bazlı Mülakat & Seçme-Yerleştirme',
        kategori: 'İş & Süreç',
        aciklama: 'STAR metoduyla aday değerlendirme, mülakat teknikleri ve doğru adayı kuruma kazandırma.',
        minSeviye: 4,
        onemDerecesi: 'Kritik',
      },
      {
        id: 'ik-3',
        ad: 'Empati & Çatışma Yönetimi',
        kategori: 'Sosyal',
        aciklama: 'Çalışan sorunlarını dinleme, yapıcı arabuluculuk ve şirket içi barış ortamını koruma.',
        minSeviye: 4,
        onemDerecesi: 'Önemli',
      },
      {
        id: 'ik-4',
        ad: 'Performans & Yetenek Değerlendirme',
        kategori: 'Analitik',
        aciklama: '360 derece geri bildirim, OKR/KPI hedef takibi ve kariyer planlama süreçleri.',
        minSeviye: 3,
        onemDerecesi: 'Önemli',
      },
      {
        id: 'ik-5',
        ad: 'KVKK & Personel Veri Güvenliği',
        kategori: 'Hukuk & Uyum',
        aciklama: 'Özlük dosyaları ve hassas çalışan verilerinin kanuna uygun şekilde saklanması ve korunması.',
        minSeviye: 4,
        onemDerecesi: 'Zorunlu',
      },
    ],
  },
  {
    pozisyon: 'Satış Müdürü',
    departman: 'Satış & Pazarlama',
    aciklama: 'Kurumsal satış hedeflerinin belirlenmesi, büyük müşteri yönetimi ve satış ekibinin liderliği.',
    yetkinlikler: [
      {
        id: 'sm-1',
        ad: 'B2B Müzakere & İkna Becerisi',
        kategori: 'Sosyal',
        aciklama: 'Üst düzey yöneticilerle anlaşma sağlama, itiraz karşılama ve kazan-kazan müzakere yönetimi.',
        minSeviye: 5,
        onemDerecesi: 'Zorunlu',
      },
      {
        id: 'sm-2',
        ad: 'Büyük Müşteri (Key Account) Yönetimi',
        kategori: 'İş & Süreç',
        aciklama: 'Stratejik kurumsal müşterilerle uzun vadeli ticari ortaklık ve sadakat yönetimi.',
        minSeviye: 4,
        onemDerecesi: 'Kritik',
      },
      {
        id: 'sm-3',
        ad: 'Satış Ekibi Liderliği & Motivasyon',
        kategori: 'Yönetim',
        aciklama: 'Satış kotalarının dağıtımı, saha ekibinin eğitimi, KPI takibi ve yüksek motivasyon sağlama.',
        minSeviye: 4,
        onemDerecesi: 'Kritik',
      },
      {
        id: 'sm-4',
        ad: 'Satış Tahminleme & Finansal Raporlama',
        kategori: 'Analitik',
        aciklama: 'Pipeline analizi, gelir projeksiyonu ve pazar trendlerinin finansal analizi.',
        minSeviye: 4,
        onemDerecesi: 'Önemli',
      },
    ],
  },
  {
    pozisyon: 'Muhasebe / Finans Uzmanı',
    departman: 'Finans & Muhasebe',
    aciklama: 'Mali tabloların hazırlanması, vergi beyannameleri, bütçe kontrolü ve nakit akışı yönetimi.',
    yetkinlikler: [
      {
        id: 'fin-1',
        ad: 'Genel Muhasebe & Tekdüzen Hesap Planı',
        kategori: 'İş & Süreç',
        aciklama: 'Yevmiye kayıtları, mizan, bilanço ve gelir tablosu hazırlama süreçlerine tam hakimiyet.',
        minSeviye: 5,
        onemDerecesi: 'Zorunlu',
      },
      {
        id: 'fin-2',
        ad: 'Vergi Mevzuatı & Beyanname Süreçleri',
        kategori: 'Hukuk & Uyum',
        aciklama: 'KDV, Muhtasar, Geçici Vergi, Kurumlar Vergisi ve e-Dönüşüm (e-Fatura/e-Defter) mevzuatı.',
        minSeviye: 4,
        onemDerecesi: 'Zorunlu',
      },
      {
        id: 'fin-3',
        ad: 'İleri Seviye Excel & Finansal Modelleme',
        kategori: 'Teknik',
        aciklama: 'Pivot tablolar, finansal formüller, nakit akış projeksiyonları ve bütçe sapma analizleri.',
        minSeviye: 4,
        onemDerecesi: 'Kritik',
      },
      {
        id: 'fin-4',
        ad: 'Maliyet Muhasebesi & Bütçe Denetimi',
        kategori: 'Analitik',
        aciklama: 'Birim maliyet analizi, gider merkezi dağıtımı ve şirket harcamalarının denetimi.',
        minSeviye: 4,
        onemDerecesi: 'Önemli',
      },
    ],
  },
  {
    pozisyon: 'Proje Yöneticisi',
    departman: 'Operasyon & Proje Yönetimi',
    aciklama: 'Projelerin kapsam, bütçe, zaman ve kalite hedeflerine uygun olarak başarıyla tamamlanması.',
    yetkinlikler: [
      {
        id: 'py-1',
        ad: 'Proje Planlama & Kapsam Yönetimi',
        kategori: 'İş & Süreç',
        aciklama: 'İş kırılım yapısı (WBS), Gantt şeması, kritik yol analizi ve kaynak dengeleme.',
        minSeviye: 4,
        onemDerecesi: 'Zorunlu',
      },
      {
        id: 'py-2',
        ad: 'Risk & Kriz Yönetimi',
        kategori: 'Analitik',
        aciklama: 'Proje risk haritası çıkarma, önleyici aksiyon planları ve beklenmedik krizleri yönetme.',
        minSeviye: 4,
        onemDerecesi: 'Kritik',
      },
      {
        id: 'py-3',
        ad: 'Paydaş İletişimi & Yetki Devri',
        kategori: 'Sosyal',
        aciklama: 'Müşteriler, yöneticiler ve teknik ekipler arasında şeffaf, sonuç odaklı koordinasyon.',
        minSeviye: 4,
        onemDerecesi: 'Önemli',
      },
      {
        id: 'py-4',
        ad: 'Bütçe & Kaynak Optimizasyonu',
        kategori: 'Yönetim',
        aciklama: 'Proje maliyet kontrolü, tedarikçi yönetimi ve bütçe aşımını engelleme.',
        minSeviye: 3,
        onemDerecesi: 'Önemli',
      },
    ],
  },
  {
    pozisyon: 'DevOps & Bulut Mühendisi',
    departman: 'Yazılım & Teknoloji',
    aciklama: 'Bulut altyapılarının kurulumu, CI/CD süreçlerinin otomasyonu ve yüksek erişilebilirlik yönetimi.',
    yetkinlikler: [
      {
        id: 'do-1',
        ad: 'Kubernetes & Docker Konteyner Yönetimi',
        kategori: 'Teknik',
        aciklama: 'Mikroservis orkestrasyonu, pod güvenliği, auto-scaling ve sıfır kesintili dağıtım.',
        minSeviye: 4,
        onemDerecesi: 'Zorunlu',
      },
      {
        id: 'do-2',
        ad: 'CI/CD Pipeline & Otomasyon',
        kategori: 'Teknik',
        aciklama: 'GitHub Actions, GitLab CI veya Jenkins ile sürekli entegrasyon ve otomatik test/dağıtım.',
        minSeviye: 4,
        onemDerecesi: 'Zorunlu',
      },
      {
        id: 'do-3',
        ad: 'Infrastructure as Code (Terraform / Ansible)',
        kategori: 'Teknik',
        aciklama: 'Bulut sunucu ve ağ mimarilerini kod olarak yönetme ve sürümleme.',
        minSeviye: 4,
        onemDerecesi: 'Kritik',
      },
      {
        id: 'do-4',
        ad: 'Sistem İzleme & Log Analizi (Monitoring)',
        kategori: 'Analitik',
        aciklama: 'Grafana, Prometheus, ELK stack ile sistem sağlığı takibi ve anomali tespiti.',
        minSeviye: 3,
        onemDerecesi: 'Önemli',
      },
    ],
  },
];

interface YetkinlikMatrisiProps {
  employees: Employee[];
  companyId?: string;
}

const YetkinlikMatrisi: React.FC<YetkinlikMatrisiProps> = ({ employees }) => {
  const [aramaMetni, setAramaMetni] = useState('');
  const [secilenKategori, setSecilenKategori] = useState<string>('Tümü');

  // Build combined unique positions from presets and actual employee positions
  const tumPozisyonlar = useMemo(() => {
    const list = new Set([
      ...HAZIR_POZISYON_GEREKSINIMLERI.map((p) => p.pozisyon),
      ...employees.map((e) => e.position).filter(Boolean),
    ]);
    return Array.from(list);
  }, [employees]);

  const [seciliPozisyonAd, setSeciliPozisyonAd] = useState<string>(() => {
    return tumPozisyonlar[0] || 'Yazılım Geliştirici';
  });

  // Find or generate position details
  const aktifPozisyon = useMemo<PozisyonTanimi>(() => {
    const hazir = HAZIR_POZISYON_GEREKSINIMLERI.find(
      (p) => p.pozisyon.toLowerCase().trim() === seciliPozisyonAd.toLowerCase().trim()
    );
    if (hazir) return hazir;

    // Auto-generate a clean profile if it's an unconfigured position from employees list
    const matchedEmp = employees.find((e) => e.position === seciliPozisyonAd);
    return {
      pozisyon: seciliPozisyonAd,
      departman: matchedEmp?.department || 'Genel Departman',
      aciklama: `${seciliPozisyonAd} rolü için kurumsal standartlarda tanımlanmış temel yetkinlik ve başarı kriterleri.`,
      yetkinlikler: [
        {
          id: 'gen-1',
          ad: 'Pozisyona Özel Mesleki Uzmanlık',
          kategori: 'Teknik',
          aciklama: `${seciliPozisyonAd} görev tanımında yer alan süreçlerin ve iş gereksinimlerinin eksiksiz yürütülmesi.`,
          minSeviye: 4,
          onemDerecesi: 'Zorunlu',
        },
        {
          id: 'gen-2',
          ad: 'Zaman Yönetimi & İş Disiplini',
          kategori: 'İş & Süreç',
          aciklama: 'İş teslim tarihlerine riayet, önceliklendirme ve verimli çalışma alışkanlığı.',
          minSeviye: 4,
          onemDerecesi: 'Kritik',
        },
        {
          id: 'gen-3',
          ad: 'Problem Çözme & Çözüm Odaklılık',
          kategori: 'Analitik',
          aciklama: 'Operasyonel aksaklıklarda inisiyatif alıp hızlı ve rasyonel çözümler geliştirebilme.',
          minSeviye: 3,
          onemDerecesi: 'Önemli',
        },
        {
          id: 'gen-4',
          ad: 'Etkili İletişim & Takım Uyumu',
          kategori: 'Sosyal',
          aciklama: 'Birimler arası sağlıklı bilgi akışı sağlama ve ekip çalışmasına katkı sunma.',
          minSeviye: 3,
          onemDerecesi: 'Önemli',
        },
      ],
    };
  }, [seciliPozisyonAd, employees]);

  // Filter competencies based on search & category
  const filtrelenmisYetkinlikler = useMemo(() => {
    return aktifPozisyon.yetkinlikler.filter((y) => {
      const matchKategori = secilenKategori === 'Tümü' || y.kategori === secilenKategori;
      const matchArama =
        y.ad.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        y.aciklama.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        y.kategori.toLowerCase().includes(aramaMetni.toLowerCase());
      return matchKategori && matchArama;
    });
  }, [aktifPozisyon, secilenKategori, aramaMetni]);

  const tumKategoriler = useMemo(() => {
    return ['Tümü', ...new Set(aktifPozisyon.yetkinlikler.map((y) => y.kategori))];
  }, [aktifPozisyon]);

  const zorunluSayisi = useMemo(() => {
    return aktifPozisyon.yetkinlikler.filter((y) => y.onemDerecesi === 'Zorunlu' || y.onemDerecesi === 'Kritik').length;
  }, [aktifPozisyon]);

  const ortalamaBeklenen = useMemo(() => {
    if (aktifPozisyon.yetkinlikler.length === 0) return 0;
    const top = aktifPozisyon.yetkinlikler.reduce((acc, y) => acc + y.minSeviye, 0);
    return (top / aktifPozisyon.yetkinlikler.length).toFixed(1);
  }, [aktifPozisyon]);

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Açıklama */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Gap Analysis</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Pozisyon bazlı yetkinlik standartları ve kurumsal başarı için gerekli beceri gereksinimleri
          </p>
        </div>
      </div>

      {/* Pozisyon Seçim Çubuğu & Arama */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="position-select" className="text-xs font-semibold text-gray-600 block mb-1.5 uppercase tracking-wide">
              İncelenecek Pozisyonu Seçin
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
              <select
                id="position-select"
                value={seciliPozisyonAd}
                onChange={(e) => setSeciliPozisyonAd(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all cursor-pointer"
              >
                {tumPozisyonlar.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="search-competency" className="text-xs font-semibold text-gray-600 block mb-1.5 uppercase tracking-wide">
              Yetkinlik Filtrele
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="search-competency"
                type="text"
                value={aramaMetni}
                onChange={(e) => setAramaMetni(e.target.value)}
                placeholder="Yetkinlik veya anahtar kelime..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Kategori Filtre Butonları */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 overflow-x-auto">
          <span className="text-xs text-gray-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Kategori:
          </span>
          {tumKategoriler.map((kat) => (
            <button
              key={kat}
              onClick={() => setSecilenKategori(kat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                secilenKategori === kat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {kat}
            </button>
          ))}
        </div>
      </div>

      {/* Pozisyon Özet Paneli */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-indigo-500/30 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-400/30">
                {aktifPozisyon.departman}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">{aktifPozisyon.pozisyon}</h3>
            <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">{aktifPozisyon.aciklama}</p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 text-center min-w-24">
              <p className="text-2xl font-black text-white">{aktifPozisyon.yetkinlikler.length}</p>
              <p className="text-[11px] text-gray-300 uppercase tracking-wide mt-0.5">Toplam Yetkinlik</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 text-center min-w-24">
              <p className="text-2xl font-black text-amber-300">{zorunluSayisi}</p>
              <p className="text-[11px] text-gray-300 uppercase tracking-wide mt-0.5">Zorunlu / Kritik</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 text-center min-w-24">
              <p className="text-2xl font-black text-emerald-300">%{Number(ortalamaBeklenen) * 20}</p>
              <p className="text-[11px] text-gray-300 uppercase tracking-wide mt-0.5">Beklenen Seviye</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gerekli Yetkinlikler Listesi / Kartları */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Bu Pozisyonda Gerekli Olan Yetkinlikler ({filtrelenmisYetkinlikler.length})
          </h4>
        </div>

        {filtrelenmisYetkinlikler.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Arama kriterinize uygun yetkinlik bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtrelenmisYetkinlikler.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-semibold border ${KATEGORI_RENK[item.kategori] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {item.kategori}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-semibold border ${ONEM_RENK[item.onemDerecesi] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {item.onemDerecesi}
                      </span>
                    </div>
                  </div>

                  <h5 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">{item.ad}</h5>
                  <p className="text-xs text-gray-600 leading-relaxed mb-4">{item.aciklama}</p>
                </div>

                <div className="pt-3 border-t border-gray-100 bg-gray-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      Gerekli Minimum Seviye
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-xs border ${SEVIYE_RENK[item.minSeviye]}`}>
                      {SEVIYE_ETIKET[item.minSeviye]}
                    </span>
                  </div>

                  {/* 5 Kademeli Seviye Barı */}
                  <div className="flex gap-1.5 mt-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-colors ${
                          i <= item.minSeviye ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default YetkinlikMatrisi;
