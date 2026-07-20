import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, CheckCircle, Info } from 'lucide-react';

interface IzinTuruKural {
  id: string;
  ad: string;
  kod: string;
  renk: string;
  ucretli: boolean;
  yillikHak: boolean;
  devirHakki: boolean;
  devirLimiti: number | null; // gün cinsinden
  borclanma: boolean; // hakedilmeden kullanılabilir mi
  belgeGerekli: boolean;
  maksBekleme: number; // talep öncesi max bekleme gün
  kademeli: boolean; // çalışma yılına göre farklı hak mı
  kademe: { yilAlt: number; yilUst: number | null; gunHak: number }[];
  aciklama: string;
}

const VARSAYILAN_IZIN_TURLERI: IzinTuruKural[] = [
  {
    id: 'yillik',
    ad: 'Yıllık İzin',
    kod: 'YI',
    renk: '#6366f1',
    ucretli: true,
    yillikHak: true,
    devirHakki: true,
    devirLimiti: 10,
    borclanma: false,
    belgeGerekli: false,
    maksBekleme: 30,
    kademeli: true,
    kademe: [
      { yilAlt: 1, yilUst: 5, gunHak: 14 },
      { yilAlt: 5, yilUst: 15, gunHak: 20 },
      { yilAlt: 15, yilUst: null, gunHak: 26 },
    ],
    aciklama: 'İş Kanunu Madde 53 kapsamında yıllık ücretli izin. Çalışanların kıdemine göre belirlenir.',
  },
  {
    id: 'mazeret',
    ad: 'Mazeret İzni',
    kod: 'MZ',
    renk: '#f59e0b',
    ucretli: true,
    yillikHak: false,
    devirHakki: false,
    devirLimiti: null,
    borclanma: false,
    belgeGerekli: false,
    maksBekleme: 3,
    kademeli: false,
    kademe: [{ yilAlt: 0, yilUst: null, gunHak: 3 }],
    aciklama: 'İş Kanunu kapsamında çalışanın mazereti nedeniyle verilen ücretli izin.',
  },
  {
    id: 'hastalik',
    ad: 'Hastalık İzni',
    kod: 'HA',
    renk: '#ef4444',
    ucretli: true,
    yillikHak: false,
    devirHakki: false,
    devirLimiti: null,
    borclanma: false,
    belgeGerekli: true,
    maksBekleme: 0,
    kademeli: false,
    kademe: [{ yilAlt: 0, yilUst: null, gunHak: 30 }],
    aciklama: 'Doktor raporu ile belgelenen hastalık durumlarında verilen ücretli istirahat izni.',
  },
  {
    id: 'dogum',
    ad: 'Doğum İzni',
    kod: 'DO',
    renk: '#ec4899',
    ucretli: false,
    yillikHak: false,
    devirHakki: false,
    devirLimiti: null,
    borclanma: false,
    belgeGerekli: true,
    maksBekleme: 0,
    kademeli: false,
    kademe: [{ yilAlt: 0, yilUst: null, gunHak: 112 }],
    aciklama: 'Doğum öncesi 8 ve sonrası 8 hafta olmak üzere 16 haftadır. Ücreti SGK tarafından geçici iş göremezlik ödeneği olarak karşılanır.',
  },
  {
    id: 'babalik',
    ad: 'Babalık İzni',
    kod: 'BA',
    renk: '#3b82f6',
    ucretli: true,
    yillikHak: false,
    devirHakki: false,
    devirLimiti: null,
    borclanma: false,
    belgeGerekli: true,
    maksBekleme: 0,
    kademeli: false,
    kademe: [{ yilAlt: 0, yilUst: null, gunHak: 5 }],
    aciklama: 'İş Kanunu Ek Madde 2 uyarınca eşi doğum yapan erkek çalışana tanınan 5 günlük ücretli izin.',
  },
  {
    id: 'evlilik',
    ad: 'Evlilik İzni',
    kod: 'EV',
    renk: '#a855f7',
    ucretli: true,
    yillikHak: false,
    devirHakki: false,
    devirLimiti: null,
    borclanma: false,
    belgeGerekli: true,
    maksBekleme: 0,
    kademeli: false,
    kademe: [{ yilAlt: 0, yilUst: null, gunHak: 3 }],
    aciklama: 'İş Kanunu Ek Madde 2 uyarınca evlenen çalışana tanınan 3 günlük ücretli izin.',
  },
  {
    id: 'olum',
    ad: 'Ölüm İzni',
    kod: 'OL',
    renk: '#6b7280',
    ucretli: true,
    yillikHak: false,
    devirHakki: false,
    devirLimiti: null,
    borclanma: false,
    belgeGerekli: false,
    maksBekleme: 0,
    kademeli: false,
    kademe: [{ yilAlt: 0, yilUst: null, gunHak: 3 }],
    aciklama: 'İş Kanunu Ek Madde 2 uyarınca anne, baba, eş, çocuk veya kardeş kaybında verilen 3 günlük ücretli izin.',
  },
  {
    id: 'ucretsiz',
    ad: 'Ücretsiz İzin',
    kod: 'UC',
    renk: '#94a3b8',
    ucretli: false,
    yillikHak: false,
    devirHakki: false,
    devirLimiti: null,
    borclanma: false,
    belgeGerekli: false,
    maksBekleme: 14,
    kademeli: false,
    kademe: [{ yilAlt: 0, yilUst: null, gunHak: 0 }],
    aciklama: 'Çalışan ve işverenin karşılıklı yazılı mutabakatıyla kullanılan ücretsiz izin.',
  },
];

interface FormState {
  ad: string;
  kod: string;
  renk: string;
  ucretli: boolean;
  yillikHak: boolean;
  devirHakki: boolean;
  devirLimiti: string;
  borclanma: boolean;
  belgeGerekli: boolean;
  maksBekleme: string;
  kademeli: boolean;
  kademe1gun: string;
  kademe2gun: string;
  kademe3gun: string;
  aciklama: string;
}

const IzinTanimlari: React.FC = () => {
  const [izinTurleri, setIzinTurleri] = useState<IzinTuruKural[]>(VARSAYILAN_IZIN_TURLERI);
  const [secili, setSecili] = useState<string | null>(null);
  const [duzenleme, setDuzenleme] = useState(false);
  const [yeniEkleme, setYeniEkleme] = useState(false);
  const [form, setForm] = useState<FormState>({
    ad: '', kod: '', renk: '#6366f1', ucretli: true, yillikHak: false,
    devirHakki: false, devirLimiti: '', borclanma: false, belgeGerekli: false,
    maksBekleme: '0', kademeli: false, kademe1gun: '14', kademe2gun: '20', kademe3gun: '26', aciklama: '',
  });
  const [silOnay, setSilOnay] = useState<string | null>(null);
  const [kaydedildi, setKaydedildi] = useState(false);

  const seciliTur = izinTurleri.find((t) => t.id === secili);

  function formDoldur(tur: IzinTuruKural) {
    setForm({
      ad: tur.ad,
      kod: tur.kod,
      renk: tur.renk,
      ucretli: tur.ucretli,
      yillikHak: tur.yillikHak,
      devirHakki: tur.devirHakki,
      devirLimiti: tur.devirLimiti?.toString() ?? '',
      borclanma: tur.borclanma,
      belgeGerekli: tur.belgeGerekli,
      maksBekleme: tur.maksBekleme.toString(),
      kademeli: tur.kademeli,
      kademe1gun: tur.kademe[0]?.gunHak?.toString() ?? '14',
      kademe2gun: tur.kademe[1]?.gunHak?.toString() ?? '20',
      kademe3gun: tur.kademe[2]?.gunHak?.toString() ?? '26',
      aciklama: tur.aciklama,
    });
  }

  function kaydet() {
    const guncellenmis: IzinTuruKural = {
      id: yeniEkleme ? form.kod.toLowerCase().replace(/\s/g, '-') : secili!,
      ad: form.ad,
      kod: form.kod.toUpperCase(),
      renk: form.renk,
      ucretli: form.ucretli,
      yillikHak: form.yillikHak,
      devirHakki: form.devirHakki,
      devirLimiti: form.devirLimiti ? parseInt(form.devirLimiti) : null,
      borclanma: form.borclanma,
      belgeGerekli: form.belgeGerekli,
      maksBekleme: parseInt(form.maksBekleme) || 0,
      kademeli: form.kademeli,
      kademe: form.kademeli
        ? [
            { yilAlt: 1, yilUst: 5, gunHak: parseInt(form.kademe1gun) || 14 },
            { yilAlt: 5, yilUst: 15, gunHak: parseInt(form.kademe2gun) || 20 },
            { yilAlt: 15, yilUst: null, gunHak: parseInt(form.kademe3gun) || 26 },
          ]
        : [{ yilAlt: 0, yilUst: null, gunHak: parseInt(form.kademe1gun) || 0 }],
      aciklama: form.aciklama,
    };

    if (yeniEkleme) {
      setIzinTurleri((prev) => [...prev, guncellenmis]);
      setSecili(guncellenmis.id);
    } else {
      setIzinTurleri((prev) => prev.map((t) => (t.id === secili ? guncellenmis : t)));
    }
    setDuzenleme(false);
    setYeniEkleme(false);
    setKaydedildi(true);
    setTimeout(() => setKaydedildi(false), 2000);
  }

  function sil(id: string) {
    setIzinTurleri((prev) => prev.filter((t) => t.id !== id));
    setSecili(null);
    setSilOnay(null);
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">İzin Türleri & Hakediş Kuralları</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            İzin türlerini, hak günlerini ve devir kurallarını yapılandırın
          </p>
        </div>
      </div>

      {/* Başarı bildirimi */}
      {kaydedildi && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-xl">
          <CheckCircle className="w-4 h-4" />
          Değişiklikler kaydedildi
        </div>
      )}

      <div className="flex gap-5">
        {/* Sol: İzin türleri listesi */}
        <div className="w-64 flex-shrink-0 space-y-1.5">
          {izinTurleri.map((tur) => (
            <button
              key={tur.id}
              onClick={() => {
                setSecili(tur.id);
                setDuzenleme(false);
                setYeniEkleme(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                secili === tur.id ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tur.renk }} />
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${secili === tur.id ? 'text-indigo-800' : 'text-gray-700'}`}>
                  {tur.ad}
                </p>
                <p className="text-[10px] text-gray-400 flex gap-2">
                  <span>{tur.kod}</span>
                  <span>{tur.ucretli ? 'Ücretli' : 'Ücretsiz'}</span>
                  {tur.kademeli && <span>Kademeli</span>}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Sağ: Detay / Düzenleme paneli */}
        <div className="flex-1">
          {!secili && !yeniEkleme && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
              <p className="text-sm">Düzenlemek veya detaylarını incelemek için sol listeden bir izin türü seçin</p>
            </div>
          )}

          {(seciliTur || yeniEkleme) && !duzenleme && seciliTur && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
              {/* Detay görünümü */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: seciliTur.renk }} />
                  <div>
                    <p className="font-bold text-gray-800">{seciliTur.ad}</p>
                    <p className="text-xs text-gray-400">{seciliTur.kod}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { formDoldur(seciliTur); setDuzenleme(true); setYeniEkleme(false); }}
                    className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl text-xs hover:bg-gray-50"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Düzenle
                  </button>
                </div>
              </div>

              {silOnay === seciliTur.id && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-3 flex items-center justify-between">
                  <p className="text-sm text-red-700">Bu izin türünü silmek istediğinize emin misiniz?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSilOnay(null)} className="text-xs text-gray-500 px-3 py-1 rounded-lg border border-gray-200 hover:bg-white">İptal</button>
                    <button onClick={() => sil(seciliTur.id)} className="text-xs text-white px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700">Evet, Sil</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { etiket: 'Ücretli', deger: seciliTur.ucretli ? '✓ Evet' : '✗ Hayır', renk: seciliTur.ucretli ? 'text-green-600' : 'text-red-500' },
                  { etiket: 'Yıllık Hak', deger: seciliTur.yillikHak ? '✓ Evet' : 'Hayır', renk: 'text-gray-700' },
                  { etiket: 'Devir Hakkı', deger: seciliTur.devirHakki ? `✓ Evet (max ${seciliTur.devirLimiti ?? '∞'} gün)` : 'Hayır', renk: 'text-gray-700' },
                  { etiket: 'Borçlanma', deger: seciliTur.borclanma ? '✓ İzin Verilir' : 'İzin Verilmez', renk: 'text-gray-700' },
                  { etiket: 'Belge Zorunlu', deger: seciliTur.belgeGerekli ? '✓ Evet' : 'Hayır', renk: 'text-gray-700' },
                  { etiket: 'Önceden Bildirim', deger: `${seciliTur.maksBekleme} gün önce`, renk: 'text-gray-700' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{item.etiket}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${item.renk}`}>{item.deger}</p>
                  </div>
                ))}
              </div>

              {/* Kademeli hak cetveli */}
              {seciliTur.kademeli && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Kıdeme Göre Hak Cetveli</p>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Kıdem</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">İzin Hakkı</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {seciliTur.kademe.map((k, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-sm text-gray-700">
                              {k.yilUst ? `${k.yilAlt} – ${k.yilUst} yıl` : `${k.yilAlt}+ yıl`}
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-indigo-700">
                              {k.gunHak} gün
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {seciliTur.aciklama && (
                <div className="flex gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p>{seciliTur.aciklama}</p>
                </div>
              )}
            </div>
          )}

          {/* Düzenleme / Yeni ekleme formu */}
          {duzenleme && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <p className="font-semibold text-gray-800">{yeniEkleme ? 'Yeni İzin Türü' : 'İzin Türü Düzenle'}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">İzin Adı *</label>
                  <input
                    value={form.ad}
                    onChange={(e) => setForm({ ...form, ad: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                    placeholder="ör. Yıllık İzin"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Kod (2-3 harf) *</label>
                  <input
                    value={form.kod}
                    onChange={(e) => setForm({ ...form, kod: e.target.value.toUpperCase().slice(0, 3) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-indigo-300 outline-none"
                    placeholder="ör. YI"
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Renk</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.renk} onChange={(e) => setForm({ ...form, renk: e.target.value })}
                      className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer" />
                    <span className="text-sm text-gray-500">{form.renk}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Önceden Bildirim (gün)</label>
                  <input
                    type="number" min="0" value={form.maksBekleme}
                    onChange={(e) => setForm({ ...form, maksBekleme: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'ucretli' as const, label: 'Ücretli' },
                  { key: 'yillikHak' as const, label: 'Yıllık Hak' },
                  { key: 'devirHakki' as const, label: 'Devir Hakkı' },
                  { key: 'borclanma' as const, label: 'Borçlanma' },
                  { key: 'belgeGerekli' as const, label: 'Belge Zorunlu' },
                  { key: 'kademeli' as const, label: 'Kademeli Hak' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[item.key]}
                      onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>

              {form.devirHakki && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Devir Limiti (gün, boş = sınırsız)</label>
                  <input
                    type="number" min="0" value={form.devirLimiti}
                    onChange={(e) => setForm({ ...form, devirLimiti: e.target.value })}
                    className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                  />
                </div>
              )}

              {form.kademeli ? (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Kıdeme Göre Hak Günleri</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: '1-5 yıl arası', key: 'kademe1gun' as const },
                      { label: '5-15 yıl arası', key: 'kademe2gun' as const },
                      { label: '15+ yıl', key: 'kademe3gun' as const },
                    ].map((k) => (
                      <div key={k.key}>
                        <p className="text-[10px] text-gray-500 mb-1">{k.label}</p>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" value={form[k.key]}
                            onChange={(e) => setForm({ ...form, [k.key]: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                          />
                          <span className="text-xs text-gray-400">gün</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Hak Günü</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" value={form.kademe1gun}
                      onChange={(e) => setForm({ ...form, kademe1gun: e.target.value })}
                      className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                    />
                    <span className="text-sm text-gray-500">gün (0 = sınırsız)</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Açıklama / Yasal Dayanak</label>
                <textarea
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
                  placeholder="ör. İş Kanunu Madde 53 kapsamında..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setDuzenleme(false); setYeniEkleme(false); }}
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  İptal
                </button>
                <button
                  onClick={kaydet}
                  disabled={!form.ad || !form.kod}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Kaydet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IzinTanimlari;
