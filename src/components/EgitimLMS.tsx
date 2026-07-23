import React, { useState, useMemo } from 'react';
import { BookOpen, Award, CheckCircle, Clock, Users, Plus, Search, Lock, ChevronRight, X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Employee } from '../types';

interface Egitim {
  id: string;
  baslik: string;
  kategori: string;
  sure: number; // dakika
  seviye: 'baslangic' | 'orta' | 'ileri';
  aciklama: string;
  egitmen: string;
  tur: 'video' | 'sunum' | 'canli' | 'sinav';
  zorunlu: boolean;
  tamamlayanSayisi: number;
  toplam: number;
}

interface SertifikaKaydi {
  id: string;
  egitimId: string;
  egitimAdi: string;
  employeeId: string;
  employeeName: string;
  durum?: 'tamamlandi' | 'devam_ediyor';
  tamamlanmaTarihi: string;
  hedefTarih?: string;
  gecerlilikSuresi: number | null; // ay
  puan?: number | null;
}

interface PersonelEgitimDurumu {
  employeeId: string;
  employeeName: string;
  department: string;
  tamamlanan: number;
  toplam: number;
  zorunluTamamlanan: number;
  zorunluToplam: number;
  sertifikaAdedi: number;
  sonAktivite: string;
}

const seviyeRenk: Record<Egitim['seviye'], string> = {
  baslangic: 'bg-green-100 text-green-700',
  orta: 'bg-yellow-100 text-yellow-700',
  ileri: 'bg-red-100 text-red-700',
};

const turIkon: Record<Egitim['tur'], string> = {
  video: '🎬',
  sunum: '📊',
  canli: '🎥',
  sinav: '📝',
};

interface EgitimLMSProps {
  employees: Employee[];
  companyId?: string;
}

const EgitimLMS: React.FC<EgitimLMSProps> = ({ employees, companyId = 'default' }) => {
  const { profile, appRole } = useAuth();
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole);

  const currentEmployee = useMemo(() => {
    return employees.find(
      (emp) =>
        emp.email?.toLowerCase() === profile?.email?.toLowerCase() ||
        emp.name?.toLowerCase() === profile?.full_name?.toLowerCase()
    ) || employees[0];
  }, [employees, profile]);

  const [aktifSekme, setAktifSekme] = useState<'katalog' | 'durumlar' | 'sertifikalar'>('katalog');
  const [aramaMetni, setAramaMetni] = useState('');
  const [secilenKategori, setSecilenKategori] = useState('all');
  
  // Modals
  const [showNewEgitim, setShowNewEgitim] = useState(false);
  const [showNewSertifika, setShowNewSertifika] = useState(false);

  // States loaded dynamically from localStorage scoped to companyId
  const [egitimler, setEgitimler] = useState<Egitim[]>(() => {
    const saved = localStorage.getItem(`humanius_egitimler_${companyId}`);
    return saved ? JSON.parse(saved) : []; // Empty by default
  });

  const [sertifikalar, setSertifikalar] = useState<SertifikaKaydi[]>(() => {
    const saved = localStorage.getItem(`humanius_sertifikalar_${companyId}`);
    return saved ? JSON.parse(saved) : []; // Empty by default
  });

  const goruntulenenSertifikalar = useMemo(() => {
    if (isManagement) return sertifikalar;
    if (!currentEmployee) return [];
    return sertifikalar.filter(
      (sc) =>
        sc.employeeId === currentEmployee.id ||
        sc.employeeName?.toLowerCase() === currentEmployee.name?.toLowerCase()
    );
  }, [sertifikalar, isManagement, currentEmployee]);

  // Form states
  const [newEgitimForm, setNewEgitimForm] = useState({
    baslik: '',
    kategori: '',
    tur: 'video' as Egitim['tur'],
    sure: 60,
    seviye: 'baslangic' as Egitim['seviye'],
    egitmen: '',
    zorunlu: false,
    aciklama: ''
  });

  const [newSertifikaForm, setNewSertifikaForm] = useState({
    egitimId: '',
    employeeId: '',
    durum: 'tamamlandi' as 'tamamlandi' | 'devam_ediyor',
    tamamlanmaTarihi: new Date().toISOString().split('T')[0],
    hedefTarih: '',
    gecerlilikSuresi: '',
    puanEkle: false,
    puan: 85
  });

  const saveEgitimler = (updated: Egitim[]) => {
    setEgitimler(updated);
    localStorage.setItem(`humanius_egitimler_${companyId}`, JSON.stringify(updated));
  };

  const saveSertifikalar = (updated: SertifikaKaydi[]) => {
    setSertifikalar(updated);
    localStorage.setItem(`humanius_sertifikalar_${companyId}`, JSON.stringify(updated));
  };

  // Add course handler
  const handleAddEgitim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEgitimForm.baslik.trim()) return;

    const newCourse: Egitim = {
      id: `eg-${Date.now()}`,
      baslik: newEgitimForm.baslik,
      kategori: newEgitimForm.kategori || 'Genel',
      sure: Number(newEgitimForm.sure) || 60,
      seviye: newEgitimForm.seviye,
      aciklama: newEgitimForm.aciklama,
      egitmen: newEgitimForm.egitmen || 'Şirket İçi',
      tur: newEgitimForm.tur,
      zorunlu: newEgitimForm.zorunlu,
      tamamlayanSayisi: 0,
      toplam: employees.length
    };

    saveEgitimler([...egitimler, newCourse]);
    setShowNewEgitim(false);
    setNewEgitimForm({
      baslik: '',
      kategori: '',
      tur: 'video',
      sure: 60,
      seviye: 'baslangic',
      egitmen: '',
      zorunlu: false,
      aciklama: ''
    });
  };

  // Add certificate completion handler
  const handleAddSertifika = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSertifikaForm.egitimId || !newSertifikaForm.employeeId) return;

    const selectedCourse = egitimler.find((eg) => eg.id === newSertifikaForm.egitimId);
    const selectedEmp = employees.find((emp) => emp.id === newSertifikaForm.employeeId);
    if (!selectedCourse || !selectedEmp) return;

    const isTamamlandi = newSertifikaForm.durum === 'tamamlandi';

    const newCert: SertifikaKaydi = {
      id: `sc-${Date.now()}`,
      egitimId: newSertifikaForm.egitimId,
      egitimAdi: selectedCourse.baslik,
      employeeId: newSertifikaForm.employeeId,
      employeeName: selectedEmp.name,
      durum: newSertifikaForm.durum,
      tamamlanmaTarihi: isTamamlandi ? newSertifikaForm.tamamlanmaTarihi : '',
      hedefTarih: !isTamamlandi ? (newSertifikaForm.hedefTarih || newSertifikaForm.tamamlanmaTarihi) : undefined,
      gecerlilikSuresi: newSertifikaForm.gecerlilikSuresi ? Number(newSertifikaForm.gecerlilikSuresi) : null,
      puan: (isTamamlandi && newSertifikaForm.puanEkle) ? Number(newSertifikaForm.puan) : null
    };

    saveSertifikalar([...sertifikalar, newCert]);

    // Update completion count in course if completed
    if (isTamamlandi) {
      const updatedEgitimler = egitimler.map((eg) => {
        if (eg.id === newSertifikaForm.egitimId) {
          const alreadyCompleted = sertifikalar.some((sc) => sc.egitimId === eg.id && sc.employeeId === newSertifikaForm.employeeId && sc.durum === 'tamamlandi');
          return {
            ...eg,
            tamamlayanSayisi: alreadyCompleted ? eg.tamamlayanSayisi : eg.tamamlayanSayisi + 1
          };
        }
        return eg;
      });
      saveEgitimler(updatedEgitimler);
    }

    setShowNewSertifika(false);
    setNewSertifikaForm({
      egitimId: '',
      employeeId: '',
      durum: 'tamamlandi',
      tamamlanmaTarihi: new Date().toISOString().split('T')[0],
      hedefTarih: '',
      gecerlilikSuresi: '',
      puanEkle: false,
      puan: 85
    });
  };

  const deleteEgitim = (id: string) => {
    if (window.confirm('Bu eğitimi silmek istediğinize emin misiniz?')) {
      const updatedCourses = egitimler.filter((e) => e.id !== id);
      const updatedCerts = sertifikalar.filter((c) => c.egitimId !== id);
      saveEgitimler(updatedCourses);
      saveSertifikalar(updatedCerts);
    }
  };

  const deleteSertifika = (id: string) => {
    if (window.confirm('Bu sertifika kaydını silmek istediğinize emin misiniz?')) {
      const cert = sertifikalar.find((c) => c.id === id);
      const updatedCerts = sertifikalar.filter((c) => c.id !== id);
      saveSertifikalar(updatedCerts);

      if (cert) {
        // Decrement completion count
        const updatedCourses = egitimler.map((eg) => {
          if (eg.id === cert.egitimId) {
            return {
              ...eg,
              tamamlayanSayisi: Math.max(0, eg.tamamlayanSayisi - 1)
            };
          }
          return eg;
        });
        saveEgitimler(updatedCourses);
      }
    }
  };

  // Dynamic calculations
  const personelDurumlari = useMemo<PersonelEgitimDurumu[]>(() => {
    return employees.map((emp) => {
      const empSerts = sertifikalar.filter((sc) => sc.employeeId === emp.id);
      const tamamlanan = empSerts.filter((sc) => sc.durum !== 'devam_ediyor').length;
      const zorunluToplam = egitimler.filter((e) => e.zorunlu).length;
      const zorunluTamamlanan = egitimler
        .filter((e) => e.zorunlu)
        .filter((e) => empSerts.some((sc) => sc.egitimId === e.id && sc.durum !== 'devam_ediyor')).length;

      const lastActivity = empSerts.reduce((max, sc) => {
        return !max || sc.tamamlanmaTarihi > max ? sc.tamamlanmaTarihi : max;
      }, '');

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department || 'Genel',
        tamamlanan,
        toplam: egitimler.length,
        zorunluTamamlanan,
        zorunluToplam,
        sertifikaAdedi: tamamlanan,
        sonAktivite: lastActivity || '-',
      };
    });
  }, [employees, egitimler, sertifikalar]);

  const kategoriler = useMemo(() => {
    return ['all', ...Array.from(new Set(egitimler.map((e) => e.kategori)))];
  }, [egitimler]);

  const filtreliEgitimler = useMemo(() => {
    return egitimler.filter((eg) => {
      const aramaEslestir = !aramaMetni || eg.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) || eg.kategori.toLowerCase().includes(aramaMetni.toLowerCase());
      const kategoriEslestir = secilenKategori === 'all' || eg.kategori === secilenKategori;
      return aramaEslestir && kategoriEslestir;
    });
  }, [egitimler, aramaMetni, secilenKategori]);

  const toplamTamamlama = sertifikalar.length;
  const toplamZorunluTamamlama = personelDurumlari.filter((p) => p.zorunluToplam > 0 && p.zorunluTamamlanan >= p.zorunluToplam).length;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Eğitim ve Gelişim (LMS)</h2>
          <p className="text-sm text-gray-500 mt-0.5">Online eğitimler, sertifika yönetimi ve çalışan gelişim takibi</p>
        </div>
        {isManagement && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewEgitim(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Eğitim Ekle
            </button>
          </div>
        )}
      </div>



      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Toplam Eğitim</p>
              <p className="text-xl font-bold text-gray-800">{egitimler.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Toplam Tamamlama</p>
              <p className="text-xl font-bold text-gray-800">{toplamTamamlama}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{isManagement ? 'Sertifikalar' : 'Sertifikalarım'}</p>
              <p className="text-xl font-bold text-gray-800">{goruntulenenSertifikalar.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b border-gray-200">
        {(isManagement ? (['katalog', 'durumlar', 'sertifikalar'] as const) : (['katalog', 'sertifikalar'] as const)).map((sekme) => (
          <button
            key={sekme}
            onClick={() => setAktifSekme(sekme)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aktifSekme === sekme ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {sekme === 'katalog' ? 'Eğitim Kataloğu' : sekme === 'durumlar' ? 'Personel Durumları' : isManagement ? 'Sertifikalar / Tamamlananlar' : 'Eğitimlerim & Sertifikalarım'}
          </button>
        ))}
      </div>

      {/* Eğitim Kataloğu */}
      {aktifSekme === 'katalog' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 flex-1 min-w-[200px] bg-white">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={aramaMetni}
                onChange={(e) => setAramaMetni(e.target.value)}
                placeholder="Eğitim ara..."
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {kategoriler.map((k) => (
                <button
                  key={k}
                  onClick={() => setSecilenKategori(k)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    secilenKategori === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {k === 'all' ? 'Tümü' : k}
                </button>
              ))}
            </div>
          </div>

          {filtreliEgitimler.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold">Kayıtlı Eğitim Bulunmamaktadır</p>
              {isManagement && <p className="text-xs text-gray-400 mt-1">Sağ üstteki "Yeni Eğitim Ekle" butonuna tıklayarak ilk eğitimi tanımlayabilirsiniz.</p>}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtreliEgitimler.map((eg) => {
                return (
                  <div key={eg.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 transition-colors relative group">
                    {isManagement && (
                      <button
                        onClick={() => deleteEgitim(eg.id)}
                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{turIkon[eg.tur]}</span>
                          <h3 className="font-semibold text-gray-800 text-sm">{eg.baslik}</h3>
                          {eg.zorunlu && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">Zorunlu</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{eg.egitmen} • {eg.kategori}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${seviyeRenk[eg.seviye]}`}>
                        {eg.seviye === 'baslangic' ? 'Başlangıç' : eg.seviye === 'orta' ? 'Orta' : 'İleri'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{eg.aciklama}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {eg.sure >= 60 ? `${Math.floor(eg.sure / 60)}s ${eg.sure % 60 > 0 ? eg.sure % 60 + 'dk' : ''}` : `${eg.sure}dk`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {eg.tamamlayanSayisi}/{eg.toplam} tamamladı
                      </span>
                    </div>
                    {isManagement && (
                      <button
                        onClick={() => {
                          setNewSertifikaForm((prev) => ({ ...prev, egitimId: eg.id }));
                          setShowNewSertifika(true);
                        }}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs py-2 rounded-xl border border-blue-200 transition-colors"
                      >
                        <Award className="w-3.5 h-3.5" />
                        Eğitimi Personele Ata / Kaydet
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Personel Durumları */}
      {aktifSekme === 'durumlar' && isManagement && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Personel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Departman</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tamamlanan</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Zorunlu Eğitimler</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sertifika</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Son Aktivite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {personelDurumlari.map((pd) => {
                  const hasZorunlu = pd.zorunluToplam > 0;
                  const zorunluTam = hasZorunlu && pd.zorunluTamamlanan >= pd.zorunluToplam;
                  const oran = pd.toplam > 0 ? Math.round((pd.tamamlanan / pd.toplam) * 100) : 0;
                  return (
                    <tr key={pd.employeeId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{pd.employeeName}</td>
                      <td className="px-4 py-3 text-gray-500">{pd.department}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-800 text-sm">
                        {pd.tamamlanan}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasZorunlu ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            zorunluTam ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {zorunluTam ? <CheckCircle className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {pd.zorunluTamamlanan}/{pd.zorunluToplam}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Zorunlu Yok</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1 font-semibold text-yellow-600">
                          <Award className="w-3.5 h-3.5" />
                          {pd.sertifikaAdedi}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">{pd.sonAktivite}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sertifikalar */}
      {aktifSekme === 'sertifikalar' && (
        <div className="space-y-3">
          {goruntulenenSertifikalar.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
              <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold">{isManagement ? 'Kayıtlı Sertifika Bulunmamaktadır' : 'Atanan veya Tamamlanan Eğitim Bulunmamaktadır'}</p>
              <p className="text-xs text-gray-400 mt-1">
                {isManagement ? 'Eğitimlerin tamamlanma kayıtlarını ve sertifikalarını yukarıdaki "Sertifika Ekle" butonu ile girebilirsiniz.' : 'Size henüz atanmış veya tamamladığınız bir eğitim bulunmamaktadır.'}
              </p>
            </div>
          ) : (
            goruntulenenSertifikalar.map((sc) => {
              const gecerlilikTarihi = sc.gecerlilikSuresi
                ? new Date(new Date(sc.tamamlanmaTarihi).setMonth(new Date(sc.tamamlanmaTarihi).getMonth() + sc.gecerlilikSuresi)).toISOString().split('T')[0]
                : null;
              const yakindaGececek = gecerlilikTarihi && new Date(gecerlilikTarihi) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

              return (
                <div key={sc.id} className="bg-white rounded-2xl border border-gray-200 p-5 relative group">
                  {isManagement && (
                    <button
                      onClick={() => deleteSertifika(sc.id)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        sc.durum === 'devam_ediyor' ? 'bg-amber-100' : 'bg-yellow-100'
                      }`}>
                        <Award className={`w-6 h-6 ${sc.durum === 'devam_ediyor' ? 'text-amber-600' : 'text-yellow-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800">{sc.egitimAdi}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sc.durum === 'devam_ediyor' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {sc.durum === 'devam_ediyor' ? '🟡 Devam Ediyor / Atandı' : '🟢 Tamamlandı'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {sc.employeeName} • {sc.durum === 'devam_ediyor' ? `Hedef Tarih: ${sc.hedefTarih || '-'}` : `Tamamlandı: ${sc.tamamlanmaTarihi}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                      {sc.durum !== 'devam_ediyor' && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Başarı Puanı</p>
                          {typeof sc.puan === 'number' && sc.puan !== null ? (
                            <p className={`text-lg font-bold ${sc.puan >= 85 ? 'text-green-600' : sc.puan >= 70 ? 'text-yellow-600' : 'text-red-500'}`}>
                              %{sc.puan}
                            </p>
                          ) : (
                            <p className="text-xs font-semibold text-gray-500">Puanlama Yok</p>
                          )}
                        </div>
                      )}
                      {gecerlilikTarihi ? (
                        <div className={`text-right px-3 py-1.5 rounded-xl ${yakindaGececek ? 'bg-red-50' : 'bg-green-50'}`}>
                          <p className="text-[10px] text-gray-400">Sertifika Geçerlilik</p>
                          <p className={`text-xs font-semibold ${yakindaGececek ? 'text-red-600' : 'text-green-600'}`}>
                            {gecerlilikTarihi}
                          </p>
                          {yakindaGececek && <p className="text-[8px] text-red-500">⚠️ Yenilenmeli</p>}
                        </div>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-[10px] text-blue-600 font-semibold">Süresiz</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Yeni Eğitim Modal */}
      {showNewEgitim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Yeni Eğitim Planla / Ekle</h3>
              <button onClick={() => setShowNewEgitim(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddEgitim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Başlığı</label>
                <input
                  type="text"
                  required
                  value={newEgitimForm.baslik}
                  onChange={(e) => setNewEgitimForm({ ...newEgitimForm, baslik: e.target.value })}
                  placeholder="Örn: KVKK Farkındalık Eğitimi"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Kategori</label>
                  <input
                    type="text"
                    required
                    value={newEgitimForm.kategori}
                    onChange={(e) => setNewEgitimForm({ ...newEgitimForm, kategori: e.target.value })}
                    placeholder="Zorunlu, Teknik, Satış..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Türü</label>
                  <select
                    value={newEgitimForm.tur}
                    onChange={(e) => setNewEgitimForm({ ...newEgitimForm, tur: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="video">Video</option>
                    <option value="sunum">Sunum</option>
                    <option value="canli">Canlı</option>
                    <option value="sinav">Sınav</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Süre (dakika)</label>
                  <input
                    type="number"
                    min="1"
                    value={newEgitimForm.sure}
                    onChange={(e) => setNewEgitimForm({ ...newEgitimForm, sure: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Seviye</label>
                  <select
                    value={newEgitimForm.seviye}
                    onChange={(e) => setNewEgitimForm({ ...newEgitimForm, seviye: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="baslangic">Başlangıç</option>
                    <option value="orta">Orta</option>
                    <option value="ileri">İleri</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitmen / Kurum</label>
                <input
                  type="text"
                  required
                  value={newEgitimForm.egitmen}
                  onChange={(e) => setNewEgitimForm({ ...newEgitimForm, egitmen: e.target.value })}
                  placeholder="Örn: Dr. Ahmet Yılmaz"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="zorunlu"
                  checked={newEgitimForm.zorunlu}
                  onChange={(e) => setNewEgitimForm({ ...newEgitimForm, zorunlu: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="zorunlu" className="text-sm font-semibold text-gray-700 select-none">Zorunlu eğitim (Her personel tamamlamalı)</label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Açıklaması</label>
                <textarea
                  rows={3}
                  value={newEgitimForm.aciklama}
                  onChange={(e) => setNewEgitimForm({ ...newEgitimForm, aciklama: e.target.value })}
                  placeholder="Eğitim detayları, hedefleri ve kazanımları..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewEgitim(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm"
                >
                  Eğitimi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Yeni Sertifika / Başarı Kaydı Modal */}
      {showNewSertifika && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Sertifika / Eğitim Tamamlama Kaydı Gir</h3>
              <button onClick={() => setShowNewSertifika(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSertifika} className="space-y-4">
              {/* Eğitim Durumu Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Atama Türü / Durumu</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSertifikaForm({ ...newSertifikaForm, durum: 'tamamlandi' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newSertifikaForm.durum === 'tamamlandi'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    🟢 Tamamlanan Eğitim (Sertifikalı)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSertifikaForm({ ...newSertifikaForm, durum: 'devam_ediyor' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newSertifikaForm.durum === 'devam_ediyor'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    🟡 Tamamlanacak / Devam Eden (Atandı)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Seçin</label>
                <select
                  required
                  value={newSertifikaForm.egitimId}
                  onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, egitimId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçin...</option>
                  {egitimler.map((eg) => (
                    <option key={eg.id} value={eg.id}>{eg.baslik} ({eg.kategori})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">İlgili Personel</label>
                <select
                  required
                  value={newSertifikaForm.employeeId}
                  onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, employeeId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçin...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department || 'Genel'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {newSertifikaForm.durum === 'tamamlandi' ? 'Tamamlanma Tarihi' : 'Hedef Tamamlama Tarihi'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newSertifikaForm.durum === 'tamamlandi' ? newSertifikaForm.tamamlanmaTarihi : newSertifikaForm.hedefTarih}
                    onChange={(e) => {
                      if (newSertifikaForm.durum === 'tamamlandi') {
                        setNewSertifikaForm({ ...newSertifikaForm, tamamlanmaTarihi: e.target.value });
                      } else {
                        setNewSertifikaForm({ ...newSertifikaForm, hedefTarih: e.target.value });
                      }
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Geçerlilik Süresi (Ay)</label>
                  <input
                    type="number"
                    min="1"
                    value={newSertifikaForm.gecerlilikSuresi}
                    onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, gecerlilikSuresi: e.target.value })}
                    placeholder="Örn: 12, 24 (Süresiz ise boş)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Başarı Puanı Tickbox */}
              {newSertifikaForm.durum === 'tamamlandi' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newSertifikaForm.puanEkle}
                      onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, puanEkle: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">Başarı Puanı / Sınav Notu Ekle</span>
                  </label>
                  
                  {newSertifikaForm.puanEkle && (
                    <div className="pt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={newSertifikaForm.puan}
                        onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, puan: Number(e.target.value) })}
                        placeholder="Başarı puanı (0-100)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewSertifika(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 shadow-sm"
                >
                  Kayıt Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EgitimLMS;
