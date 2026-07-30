import React from 'react';
import { CheckCircle, Clock, XCircle, User, UserCheck, Briefcase, CreditCard, ChevronRight } from 'lucide-react';
import type { IzinTalebi } from '../types/izin';

interface IzinWorkflowProps {
  talep: IzinTalebi;
  onOnay?: (id: string) => void;
  onRed?: (id: string) => void;
  compact?: boolean;
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

const IzinWorkflow: React.FC<IzinWorkflowProps> = ({ talep, onOnay, onRed, compact = false }) => {
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
          <p className="text-xs text-gray-400 mt-0.5">
            {talep.employeeName} • {talep.izinTuru} • {talep.gunSayisi} gün
          </p>
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

      {/* Onay/Red butonları - sadece beklemede olan talepler için */}
      {talep.durum === 'beklemede' && (onOnay || onRed) && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          {onRed && (
            <button
              onClick={() => onRed(talep.id)}
              className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Reddet
            </button>
          )}
          {onOnay && (
            <button
              onClick={() => onOnay(talep.id)}
              className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Onayla
            </button>
          )}
        </div>
      )}

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
}

export const IzinWorkflowListesi: React.FC<IzinWorkflowListesiProps> = ({ talepleri, onOnay, onRed }) => {
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
            <IzinWorkflow key={talep.id} talep={talep} onOnay={onOnay} onRed={onRed} />
          ))}
        </div>
      )}

      {digerler.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Son İşlemler</p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {digerler.map((talep, i) => (
              <div key={talep.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-gray-800">{talep.employeeName}</p>
                  <p className="text-xs text-gray-500">{talep.izinTuru} • {talep.gunSayisi} gün • {talep.baslangicTarihi}</p>
                </div>
                <IzinWorkflow talep={talep} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IzinWorkflow;
