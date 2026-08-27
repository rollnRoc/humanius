import React from 'react';
import { CheckCircle, Clock, XCircle, User, UserCheck, Briefcase, CreditCard, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import type { IzinTalebi } from '../types/izin';

interface IzinWorkflowProps {
  talep: IzinTalebi;
  onOnay?: (id: string) => void;
  onRed?: (id: string) => void;
  onEdit?: (talep: IzinTalebi) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
  talepleri?: IzinTalebi[];
}

interface WorkflowAdim {
  id: string;
  label: string;
  altLabel: string;
  icon: React.ReactNode;
}

const WORKFLOW_ADIMLARI: WorkflowAdim[] = [
  { id: 'talep', label: 'Çalışan Talebi', altLabel: 'Oluşturuldu', icon: <User className="w-4 h-4" /> },
  { id: 'yonetici', label: 'Yönetici Onayı', altLabel: 'Onay Bekliyor', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'bordro', label: 'Bordro Güncelleme', altLabel: 'Sistem', icon: <CreditCard className="w-4 h-4" /> },
];

function getAdimDurumu(talep: IzinTalebi, adimId: string): 'tamamlandi' | 'aktif' | 'bekliyor' | 'red' {
  if (talep.durum === 'reddedildi') {
    if (adimId === 'talep') return 'tamamlandi';
    if (adimId === 'yonetici') return 'red';
    return 'bekliyor';
  }
  if (talep.durum === 'beklemede') {
    if (adimId === 'talep') return 'tamamlandi';
    if (adimId === 'yonetici') return 'aktif';
    return 'bekliyor';
  }
  if (talep.durum === 'onaylandi') {
    return 'tamamlandi';
  }
  return 'bekliyor';
}

const AdimIkonu: React.FC<{ durum: 'tamamlandi' | 'aktif' | 'bekliyor' | 'red'; icon: React.ReactNode }> = ({ durum, icon }) => {
  if (durum === 'tamamlandi') return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (durum === 'red') return <XCircle className="w-4 h-4 text-red-500" />;
  if (durum === 'aktif') return <Clock className="w-4 h-4 text-blue-500" />;
  return <span className="text-gray-300">{icon}</span>;
};

function formatDateTR(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      return `${day} ${months[month]} ${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {}
  return dateStr;
}

function formatDateRange(start?: string, end?: string): string {
  if (!start) return '';
  const s = formatDateTR(start);
  const e = formatDateTR(end);
  if (s && e && s !== e) {
    return `${s} — ${e}`;
  }
  return s || e || '';
}

const IzinWorkflow: React.FC<IzinWorkflowProps> = ({ talep, onOnay, onRed, compact = false, talepleri = [] }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {WORKFLOW_ADIMLARI.map((adim, i) => {
          const durum = getAdimDurumu(talep, adim.id);
          return (
            <React.Fragment key={adim.id}>
              <div
                title={adim.label}
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                  durum === 'tamamlandi' ? 'bg-green-100 border-green-400' :
                  durum === 'aktif' ? 'bg-blue-100 border-blue-400 animate-pulse' :
                  durum === 'red' ? 'bg-red-100 border-red-400' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <AdimIkonu durum={durum} icon={adim.icon} />
              </div>
              {i < WORKFLOW_ADIMLARI.length - 1 && (
                <div className={`h-0.5 w-4 ${durum === 'tamamlandi' ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">Onay Akışı</p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mt-1">
            <span className="font-bold text-slate-800">{talep.employeeName}</span>
            <span>•</span>
            <span className="capitalize font-medium text-slate-600">{talep.izinTuru} İzni</span>
            <span>•</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {talep.gunSayisi} Gün
            </span>
            {talep.baslangicTarihi && (
              <>
                <span>•</span>
                <span className="font-bold text-cyan-800 bg-cyan-50 px-2.5 py-0.5 rounded-md border border-cyan-200">
                  📅 {formatDateRange(talep.baslangicTarihi, talep.bitisTarihi)}
                </span>
              </>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          talep.durum === 'onaylandi' ? 'bg-green-100 text-green-700' :
          talep.durum === 'beklemede' ? 'bg-blue-100 text-blue-700' :
          talep.durum === 'reddedildi' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {talep.durum === 'onaylandi' ? '✓ Onaylandı' : talep.durum === 'beklemede' ? '⏳ Beklemede' : talep.durum === 'reddedildi' ? '✗ Reddedildi' : 'İptal'}
        </span>
      </div>

      {/* Workflow adımları */}
      <div className="flex items-stretch gap-0">
        {WORKFLOW_ADIMLARI.map((adim, i) => {
          const durum = getAdimDurumu(talep, adim.id);
          return (
            <React.Fragment key={adim.id}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* İkon çember */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 transition-all ${
                  durum === 'tamamlandi' ? 'bg-green-100 border-green-400' :
                  durum === 'aktif' ? 'bg-blue-50 border-blue-400 shadow-blue-100 shadow-md' :
                  durum === 'red' ? 'bg-red-50 border-red-400' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  {durum === 'tamamlandi' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {durum === 'aktif' && <Clock className="w-5 h-5 text-blue-500" />}
                  {durum === 'red' && <XCircle className="w-5 h-5 text-red-500" />}
                  {durum === 'bekliyor' && <span className="text-gray-300">{adim.icon}</span>}
                </div>
                {/* Etiketler */}
                <p className={`text-xs font-semibold text-center leading-tight ${
                  durum === 'tamamlandi' ? 'text-green-700' :
                  durum === 'aktif' ? 'text-blue-700' :
                  durum === 'red' ? 'text-red-600' :
                  'text-gray-400'
                }`}>
                  {adim.label}
                </p>
                <p className={`text-[10px] text-center mt-0.5 ${
                  durum === 'aktif' ? 'text-blue-400 font-medium' : 'text-gray-400'
                }`}>
                  {durum === 'aktif' ? '● Bekliyor' : durum === 'tamamlandi' ? '✓ Tamam' : durum === 'red' ? '✗ Reddedildi' : adim.altLabel}
                </p>
              </div>
              {i < WORKFLOW_ADIMLARI.length - 1 && (
                <div className="flex items-start pt-5">
                  <div className={`h-0.5 w-6 mx-1 mt-0 ${
                    getAdimDurumu(talep, adim.id) === 'tamamlandi' ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Departman Çakışma Uyarısı */}
      {talep.durum === 'beklemede' && (() => {
        const overlaps = (talepleri || []).filter(t => 
          t.id !== talep.id &&
          t.durum === 'onaylandi' &&
          ((t.baslangicTarihi <= talep.bitisTarihi) && (t.bitisTarihi >= talep.baslangicTarihi))
        );
        if (overlaps.length === 0) return null;
        const names = overlaps.map(o => o.employeeName || 'Personel').join(', ');
        return (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <span className="font-bold text-amber-900">⚠️ Çakışma Uyarısı:</span>
            <span>Aynı tarihlerde {names} onaylı izinli!</span>
          </div>
        );
      })()}

      {/* Onay/Red/Düzenle butonları */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(talep)}
              className="py-1.5 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Düzenle</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(talep.id)}
              className="py-1.5 px-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Sil / Kaldır</span>
            </button>
          )}
        </div>

        {talep.durum === 'beklemede' && (onOnay || onRed) && (
          <div className="flex gap-2 ml-auto">
            {onRed && (
              <button
                onClick={() => onRed(talep.id)}
                className="py-1.5 px-4 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
              >
                Reddet
              </button>
            )}
            {onOnay && (
              <button
                onClick={() => onOnay(talep.id)}
                className="py-1.5 px-4 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors shadow-xs"
              >
                Onayla
              </button>
            )}
          </div>
        )}
      </div>

      {/* Red nedeni */}
      {talep.durum === 'reddedildi' && talep.redNedeni && (
        <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs text-red-600"><span className="font-semibold">Red Nedeni:</span> {talep.redNedeni}</p>
        </div>
      )}
    </div>
  );
};

// Toplu workflow listesi bileşeni
interface IzinWorkflowListesiProps {
  talepleri: IzinTalebi[];
  onOnay?: (id: string) => void;
  onRed?: (id: string) => void;
  onEdit?: (talep: IzinTalebi) => void;
  onDelete?: (id: string) => void;
}

export const IzinWorkflowListesi: React.FC<IzinWorkflowListesiProps> = ({ talepleri, onOnay, onRed, onEdit, onDelete }) => {
  const bekleyenler = talepleri.filter((t) => t.durum === 'beklemede');
  const digerler = talepleri.filter((t) => t.durum !== 'beklemede');

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div>
        <h3 className="text-base font-bold text-gray-800">Onay Bekleyen Talepler</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Çalışan Talebi → Yönetici Onayı → Bordro Güncelleme
        </p>
      </div>

      {/* Workflow şeması - açıklayıcı banner */}
      <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4">
        <div className="flex items-center justify-between">
          {[
            { label: 'Çalışan', sub: 'Talep Oluşturur' },
            { label: 'Yönetici', sub: 'Onaylar' },
            { label: 'Bordro', sub: 'Otomatik Güncelleme' },
          ].map((adim, i, arr) => (
            <React.Fragment key={i}>
              <div className="text-center flex-1">
                <p className="text-xs font-bold text-indigo-800">{adim.label}</p>
                <p className="text-[10px] text-indigo-500">{adim.sub}</p>
              </div>
              {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {bekleyenler.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
          Onay bekleyen talep bulunmuyor
        </div>
      ) : (
        <div className="space-y-3">
          {bekleyenler.map((talep) => (
            <IzinWorkflow
              key={talep.id}
              talep={talep}
              onOnay={onOnay}
              onRed={onRed}
              onEdit={onEdit}
              onDelete={onDelete}
              talepleri={talepleri}
            />
          ))}
        </div>
      )}

      {digerler.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Son İşlemler / Kullanılmış İzinler</p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {digerler.map((talep) => (
              <div key={talep.id} className="flex flex-wrap items-center justify-between px-4 py-3 hover:bg-slate-50/70 transition-colors gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{talep.employeeName}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      talep.durum === 'onaylandi' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      talep.durum === 'reddedildi' ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {talep.durum === 'onaylandi' ? 'Onaylandı / Kullanıldı' : talep.durum === 'reddedildi' ? 'Reddedildi' : 'İptal'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {talep.izinTuru} İzni • <b>{talep.gunSayisi} gün</b> • 📅 {formatDateRange(talep.baslangicTarihi, talep.bitisTarihi)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <IzinWorkflow talep={talep} compact talepleri={talepleri} />
                  
                  {/* Düzenle / Sil butonları */}
                  {(onEdit || onDelete) && (
                    <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(talep)}
                          title="İzin Kaydını Düzenle / Değiştir"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(talep.id)}
                          title="İzin Kaydını Sil / Kaldır"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IzinWorkflow;
