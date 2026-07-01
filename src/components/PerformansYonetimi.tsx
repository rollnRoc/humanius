import React, { useState, useMemo } from 'react';
import { Star, Target, TrendingUp, MessageSquare, Plus, ChevronRight, Award } from 'lucide-react';
import type { Employee } from '../types';

interface PerformansDegerlendirme {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  donem: string;
  degerlendiren: string;
  teknikYetkinlik: number;
  iletisim: number;
  takim: number;
  liderlik: number;
  uyum: number;
  genelPuan: number;
  gucluyonler: string;
  gelisimAlanlari: string;
  hedefler: string;
  durum: 'taslak' | 'tamamlandi' | 'onaylandi';
}

interface OKR {
  id: string;
  employeeId: string;
  employeeName: string;
  hedef: string;
  donem: string;
  kilit_sonuclar: { metin: string; ilerleme: number }[];
  genel_ilerleme: number;
  durum: 'aktif' | 'tamamlandi' | 'iptal';
}

interface GeriBildirim {
  id: string;
  gonderen: string;
  alici: string;
  mesaj: string;
  tarih: string;
  tip: 'olumlu' | 'gelistirici' | 'nötr';
}

interface PerformansYonetimiProps {
  employees: Employee[];
  userRole?: string;
}

function generateDemoData(employees: Employee[]) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  const donemler = [
    `${currentYear - 1}-Q3`,
    `${currentYear - 1}-Q4`,
    `${currentYear}-Q1`,
    `${currentYear}-Q2`,
    `${currentYear}-Q3`,
    `${currentYear}-Q4`,
  ];
  const guncelDonem = `${currentYear}-Q${currentQuarter}`;

  const defaultDegerlendirmeler: PerformansDegerlendirme[] = employees.slice(0, 8).map((emp, i) => ({
    id: `deg-${emp.id}`,
    employeeId: emp.id,
    employeeName: emp.name,
    department: emp.department,
    donem: guncelDonem,
    degerlendiren: 'Yönetici',
    teknikYetkinlik: 3 + (i % 3),
    iletisim: 2 + (i % 4),
    takim: 3 + ((i + 1) % 3),
    liderlik: 2 + (i % 3),
    uyum: 3 + ((i + 2) % 3),
    genelPuan: Math.round((3 + (i % 3) + 2 + (i % 4) + 3 + ((i + 1) % 3)) / 3 * 10) / 10,
    gucluyonler: 'Teknik yetkinlik ve takım çalışması',
    gelisimAlanlari: 'İletişim ve liderlik becerileri',
    hedefler: 'Q3\'te sertifikasyon tamamlama',
    durum: i < 5 ? 'tamamlandi' : i < 7 ? 'taslak' : 'onaylandi',
  }));

  const okrListesi: OKR[] = employees.slice(0, 5).map((emp, i) => ({
    id: `okr-${emp.id}`,
    employeeId: emp.id,
    employeeName: emp.name,
    hedef: `${emp.department} departmanı verimliliğini artır`,
    donem: guncelDonem,
    kilit_sonuclar: [
      { metin: 'Proje teslim sürelerini %20 kısalt', ilerleme: 60 + i * 5 },
      { metin: 'Müşteri memnuniyetini 4.5/5 üzeri tut', ilerleme: 80 - i * 3 },
      { metin: 'Takım kapasitesini 2 kişi artır', ilerleme: 33 },
    ],
    genel_ilerleme: 55 + i * 4,
    durum: 'aktif',
  }));

  const geriBildirimler: GeriBildirim[] = [
    { id: 'gb-1', gonderen: 'Ahmet Yılmaz', alici: employees[0]?.name ?? 'Personel', mesaj: 'Proje teslimatındaki özeni takdire değer.', tarih: `${currentYear}-05-01`, tip: 'olumlu' },
    { id: 'gb-2', gonderen: 'Müdür', alici: employees[1]?.name ?? 'Personel', mesaj: 'Müşteri toplantılarına daha hazırlıklı gelmelisiniz.', tarih: `${currentYear}-04-28`, tip: 'gelistirici' },
    { id: 'gb-3', gonderen: 'Takım Arkadaşı', alici: employees[0]?.name ?? 'Personel', mesaj: 'Birlikte çalışmak her zaman verimli ve keyifli.', tarih: `${currentYear}-04-25`, tip: 'olumlu' },
    { id: 'gb-4', gonderen: 'İK', alici: employees[2]?.name ?? 'Personel', mesaj: 'Eğitim programına katılım oranınız artırılabilir.', tarih: `${currentYear}-04-20`, tip: 'gelistirici' },
  ];

  return { defaultDegerlendirmeler, okrListesi, geriBildirimler, donemler, guncelDonem };
}

const puanRengi = (puan: number) => {
  if (puan >= 4) return 'text-green-600';
  if (puan >= 3) return 'text-yellow-600';
  return 'text-red-500';
};

const PuanYildizlari: React.FC<{ puan: number; max?: number }> = ({ puan, max = 5 }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i < Math.round(puan) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
      />
    ))}
  </div>
);

const PerformansYonetimi: React.FC<PerformansYonetimiProps> = ({ employees, userRole = 'employee' }) => {
  const [aktifSekme, setAktifSekme] = useState<'degerlendirme' | 'okr' | 'geri-bildirim'>('degerlendirme');
  const [secilenEmployee, setSecilenEmployee] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const { defaultDegerlendirmeler, okrListesi, geriBildirimler, donemler, guncelDonem } = useMemo(
    () => generateDemoData(employees),
    [employees]
  );
  
  const [degerlendirmeler, setDegerlendirmeler] = useState<PerformansDegerlendirme[]>(defaultDegerlendirmeler);
  const [yeniDeg, setYeniDeg] = useState({
    employeeId: '',
    donem: guncelDonem,
    teknikYetkinlik: 3,
    iletisim: 3,
    takim: 3,
    liderlik: 3,
    uyum: 3,
    yorumlar: ''
  });

  const genelOrtalama = degerlendirmeler.length
    ? (degerlendirmeler.reduce((s, d) => s + d.genelPuan, 0) / degerlendirmeler.length).toFixed(1)
    : '—';

  const tamamlananCount = degerlendirmeler.filter((d) => d.durum !== 'taslak').length;
  const okrTamamlanan = okrListesi.filter((o) => o.genel_ilerleme >= 100).length;
  const aktifOkr = okrListesi.filter((o) => o.durum === 'aktif').length;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Performans & Geri Bildirim</h2>
          <p className="text-sm text-gray-500 mt-0.5">360° değerlendirme, OKR/KPI takibi ve sürekli geri bildirim</p>
        </div>
        {!['employee', 'user'].includes(userRole) && (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Değerlendirme
          </button>
        )}
      </div>
      
      {/* SkillBridge Integration Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-indigo-50">
            <Target className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900">SkillBridge Performance Entegrasyonu</h3>
            <p className="text-sm text-indigo-700 mt-0.5">Tüm performans verileri ve raporları SkillBridge LMS altyapısı üzerinden İK tarafından yönetilmektedir.</p>
          </div>
        </div>
        <a href="https://skillbridge.com.tr" target="_blank" rel="noopener noreferrer" className="bg-white border border-indigo-200 text-indigo-700 font-medium px-4 py-2 rounded-xl text-sm hover:bg-indigo-50 transition-colors">
          SkillBridge'e Git
        </a>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Genel Ortalama</p>
          <p className={`text-2xl font-bold ${puanRengi(Number(genelOrtalama))}`}>{genelOrtalama} / 5</p>
          <PuanYildizlari puan={Number(genelOrtalama)} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Tamamlanan Değerlendirme</p>
          <p className="text-2xl font-bold text-gray-800">{tamamlananCount}</p>
          <p className="text-xs text-gray-400">{degerlendirmeler.length} toplam</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Aktif OKR</p>
          <p className="text-2xl font-bold text-indigo-600">{aktifOkr}</p>
          <p className="text-xs text-gray-400">{okrTamamlanan} tamamlandı</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Geri Bildirim</p>
          <p className="text-2xl font-bold text-purple-600">{geriBildirimler.length}</p>
          <p className="text-xs text-gray-400">bu dönem</p>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['degerlendirme', 'okr', 'geri-bildirim'] as const).map((sekme) => (
          <button
            key={sekme}
            onClick={() => setAktifSekme(sekme)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aktifSekme === sekme
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {sekme === 'degerlendirme' ? '360° Değerlendirme' : sekme === 'okr' ? 'OKR / KPI Takibi' : 'Geri Bildirim'}
          </button>
        ))}
      </div>

      {/* 360° Değerlendirme */}
      {aktifSekme === 'degerlendirme' && (
        <div className="space-y-3">
          {degerlendirmeler.map((deg) => (
            <div
              key={deg.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => setSecilenEmployee(secilenEmployee === deg.id ? null : deg.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                    {deg.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{deg.employeeName}</p>
                    <p className="text-xs text-gray-500">{deg.department} • {deg.donem}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-xl font-bold ${puanRengi(deg.genelPuan)}`}>{deg.genelPuan.toFixed(1)}</p>
                    <PuanYildizlari puan={deg.genelPuan} />
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    deg.durum === 'onaylandi' ? 'bg-green-100 text-green-700' :
                    deg.durum === 'tamamlandi' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {deg.durum === 'onaylandi' ? 'Onaylandı' : deg.durum === 'tamamlandi' ? 'Tamamlandı' : 'Taslak'}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${secilenEmployee === deg.id ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {secilenEmployee === deg.id && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    {[
                      { label: 'Teknik Yetkinlik', puan: deg.teknikYetkinlik },
                      { label: 'İletişim', puan: deg.iletisim },
                      { label: 'Takım Çalışması', puan: deg.takim },
                      { label: 'Liderlik', puan: deg.liderlik },
                      { label: 'Uyum', puan: deg.uyum },
                    ].map((kriter) => (
                      <div key={kriter.label} className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">{kriter.label}</p>
                        <p className={`text-lg font-bold ${puanRengi(kriter.puan)}`}>{kriter.puan}/5</p>
                        <PuanYildizlari puan={kriter.puan} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-green-600 mb-1">Güçlü Yönler</p>
                      <p className="text-gray-600">{deg.gucluyonler}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-orange-500 mb-1">Gelişim Alanları</p>
                      <p className="text-gray-600">{deg.gelisimAlanlari}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-600 mb-1">Hedefler</p>
                      <p className="text-gray-600">{deg.hedefler}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* OKR / KPI */}
      {aktifSekme === 'okr' && (
        <div className="space-y-4">
          {okrListesi.map((okr) => (
            <div key={okr.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-indigo-500" />
                    <p className="font-semibold text-gray-800">{okr.hedef}</p>
                  </div>
                  <p className="text-xs text-gray-500">{okr.employeeName} • {okr.donem}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Genel İlerleme</p>
                    <p className="text-lg font-bold text-indigo-600">%{okr.genel_ilerleme}</p>
                  </div>
                  <div className="relative w-12 h-12">
                    <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                        strokeDasharray={`${okr.genel_ilerleme} ${100 - okr.genel_ilerleme}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {okr.kilit_sonuclar.map((kr, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-600">{kr.metin}</p>
                        <span className="text-xs font-semibold text-gray-700">%{kr.ilerleme}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            kr.ilerleme >= 80 ? 'bg-green-500' : kr.ilerleme >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${kr.ilerleme}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Geri Bildirim */}
      {aktifSekme === 'geri-bildirim' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              <MessageSquare className="w-4 h-4" />
              Geri Bildirim Gönder
            </button>
          </div>
          {geriBildirimler.map((gb) => (
            <div key={gb.id} className={`bg-white rounded-2xl border p-5 ${
              gb.tip === 'olumlu' ? 'border-l-4 border-l-green-400 border-gray-200' :
              gb.tip === 'gelistirici' ? 'border-l-4 border-l-orange-400 border-gray-200' :
              'border-gray-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-gray-600">{gb.gonderen}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-xs font-semibold text-gray-800">{gb.alici}</span>
                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      gb.tip === 'olumlu' ? 'bg-green-100 text-green-700' :
                      gb.tip === 'gelistirici' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {gb.tip === 'olumlu' ? '👍 Olumlu' : gb.tip === 'gelistirici' ? '📈 Geliştirici' : 'Nötr'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{gb.mesaj}</p>
                </div>
                <span className="text-xs text-gray-400 ml-4">{gb.tarih}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Değerlendirme Modal (basit) */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Yeni Performans Değerlendirmesi</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Personel</label>
                <select 
                  value={yeniDeg.employeeId}
                  onChange={(e) => setYeniDeg({...yeniDeg, employeeId: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Personel seçin...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Değerlendirme Dönemi</label>
                <select 
                  value={yeniDeg.donem}
                  onChange={(e) => setYeniDeg({...yeniDeg, donem: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {donemler.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(['Teknik', 'İletişim', 'Takım', 'Liderlik', 'Uyum'] as const).map((kriter) => {
                  const kmap: Record<string, keyof typeof yeniDeg> = {
                    'Teknik': 'teknikYetkinlik',
                    'İletişim': 'iletisim',
                    'Takım': 'takim',
                    'Liderlik': 'liderlik',
                    'Uyum': 'uyum'
                  };
                  const key = kmap[kriter];
                  return (
                    <div key={kriter} className="text-center">
                      <label className="block text-xs text-gray-500 mb-1">{kriter}</label>
                      <select 
                        value={yeniDeg[key] as number}
                        onChange={(e) => setYeniDeg({...yeniDeg, [key]: Number(e.target.value)})}
                        className="w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Yorumlar</label>
                <textarea 
                  value={yeniDeg.yorumlar}
                  onChange={(e) => setYeniDeg({...yeniDeg, yorumlar: e.target.value})}
                  rows={3} 
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
                  placeholder="Değerlendirme notlarını girin..." 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={() => {
                if (!yeniDeg.employeeId) {
                  alert('Lütfen bir personel seçin.');
                  return;
                }
                const emp = employees.find(e => e.id === yeniDeg.employeeId)!;
                const newD: PerformansDegerlendirme = {
                  id: `deg-custom-${Date.now()}`,
                  employeeId: emp.id,
                  employeeName: emp.name,
                  department: emp.department,
                  donem: yeniDeg.donem,
                  degerlendiren: 'Yönetici',
                  teknikYetkinlik: yeniDeg.teknikYetkinlik,
                  iletisim: yeniDeg.iletisim,
                  takim: yeniDeg.takim,
                  liderlik: yeniDeg.liderlik,
                  uyum: yeniDeg.uyum,
                  genelPuan: (yeniDeg.teknikYetkinlik + yeniDeg.iletisim + yeniDeg.takim + yeniDeg.liderlik + yeniDeg.uyum) / 5,
                  gucluyonler: yeniDeg.yorumlar,
                  gelisimAlanlari: '',
                  hedefler: '',
                  durum: 'taslak'
                };
                setDegerlendirmeler([newD, ...degerlendirmeler]);
                setShowNewForm(false);
                setYeniDeg({
                  employeeId: '',
                  donem: guncelDonem,
                  teknikYetkinlik: 3,
                  iletisim: 3,
                  takim: 3,
                  liderlik: 3,
                  uyum: 3,
                  yorumlar: ''
                });
              }} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformansYonetimi;
