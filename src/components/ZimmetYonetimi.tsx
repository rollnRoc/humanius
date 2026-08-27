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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
    seriNo: '', ad: '', kategori: 'bilgisayar', marka: '', model: '', deger: '', aciklama: '',
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
        {isAdminOrHR && (
          <button
            onClick={() => { setFormAcik(true); setDuzenlenenId(null); setForm({ seriNo: '', ad: '', kategori: 'bilgisayar', marka: '', model: '', deger: '', aciklama: '' }); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Yeni Zimmet
          </button>
        )}
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
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="hepsi">Tüm Kategoriler</option>
          <option value="bilgisayar">Bilgisayar</option>
          <option value="telefon">Telefon</option>
          <option value="arac">Araç</option>
          <option value="monitor">Monitör</option>
          <option value="diger">Diğer</option>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                  list="zimmet-kategorileri"
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Kategori yazın veya seçin (Örn: Kulaklık, Yazıcı...)"
                />
                <datalist id="zimmet-kategorileri">
                  <option value="bilgisayar">Bilgisayar</option>
                  <option value="telefon">Telefon</option>
                  <option value="arac">Araç</option>
                  <option value="anahtar">Anahtar</option>
                  <option value="monitor">Monitör</option>
                  <option value="yazici">Yazıcı</option>
                  <option value="kulaklik">Kulaklık</option>
                  <option value="tablet">Tablet</option>
                  <option value="mobilya">Mobilya / Masa</option>
                  <option value="yazilim">Yazılım Lisansı</option>
                  <option value="diger">Diğer</option>
                </datalist>
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
