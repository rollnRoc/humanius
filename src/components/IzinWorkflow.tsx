import React, { useEffect, useState, useMemo } from 'react';
import { 
  CheckCircle, Clock, XCircle, User, UserCheck, Briefcase, CreditCard, 
  ChevronRight, Edit2, Trash2, Users, Award, Check
} from 'lucide-react';
import type { IzinTalebi } from '../types/izin';
import { formatIzinTuru } from '../utils/izinCalculations';
import { leaveApprovalService, type LeaveApprovalConfig, DEFAULT_LEAVE_APPROVAL_CONFIG } from '../services/leaveApprovalService';

interface IzinWorkflowProps {
  talep: IzinTalebi;
  onOnay?: (id: string) => void;
  onRed?: (id: string) => void;
  onEdit?: (talep: IzinTalebi) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
  talepleri?: IzinTalebi[];
}

export type StepDurum = 'gecilen' | 'bulunulan' | 'ilerlenmemis' | 'red';

interface DynamicStep {
  id: string;
  stepNum: number;
  label: string;
  roleLabel: string;
  desc: string;
  icon: React.ReactNode;
}

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

const IzinWorkflow: React.FC<IzinWorkflowProps> = ({ 
  talep, 
  onOnay, 
  onRed, 
  onEdit, 
  onDelete, 
  compact = false, 
  talepleri = [] 
}) => {
  const [approvalConfig, setApprovalConfig] = useState<LeaveApprovalConfig>(DEFAULT_LEAVE_APPROVAL_CONFIG);

  useEffect(() => {
    leaveApprovalService.getConfig(talep.companyId).then(cfg => {
      if (cfg) setApprovalConfig(cfg);
    }).catch(err => console.error('Error fetching approval config for workflow:', err));

    const handleUpdate = (e: any) => {
      if (e.detail) setApprovalConfig(e.detail);
    };
    window.addEventListener('humanius_leave_approval_updated', handleUpdate);
    return () => window.removeEventListener('humanius_leave_approval_updated', handleUpdate);
  }, [talep.companyId]);

  // Şirket onay ayarlarından seçilen aşamalara göre dinamik akış adımları
  const dynamicSteps = useMemo(() => {
    const steps: DynamicStep[] = [
      {
        id: 'talep',
        stepNum: 0,
        label: 'Çalışan Talebi',
        roleLabel: 'Talep Formu',
        desc: 'Talep oluşturuldu & iletildi',
        icon: <User className="w-4 h-4" />,
      }
    ];

    let counter = 1;
    if (approvalConfig.stages.manager) {
      steps.push({
        id: 'manager',
        stepNum: counter++,
        label: '1. Aşama: Birim Amiri',
        roleLabel: 'Departman Sorumlusu',
        desc: 'Departman ön onayı',
        icon: <Users className="w-4 h-4" />,
      });
    }

    if (approvalConfig.stages.hr) {
      steps.push({
        id: 'hr',
        stepNum: counter++,
        label: `${counter > 1 ? counter : 1}. Aşama: İK Uzmanı`,
        roleLabel: 'İnsan Kaynakları',
        desc: 'Mevzuat ve bakiye denetimi',
        icon: <Award className="w-4 h-4" />,
      });
    }

    if (approvalConfig.stages.admin) {
      steps.push({
        id: 'admin',
        stepNum: counter++,
        label: `${counter > 1 ? counter : 1}. Aşama: Şirket Yöneticisi`,
        roleLabel: 'Üst Yönetim',
        desc: 'Nihai yönetim onayı',
        icon: <Briefcase className="w-4 h-4" />,
      });
    }

    steps.push({
      id: 'bordro',
      stepNum: counter,
      label: 'Bordro & Puantaj',
      roleLabel: 'Sistem Entegrasyonu',
      desc: 'Puantaj ve bordroya otomatik işlendi',
      icon: <CreditCard className="w-4 h-4" />,
    });

    return steps;
  }, [approvalConfig.stages]);

  // Her adımın anlık durumunu belirle
  const getStepStatus = (stepId: string): StepDurum => {
    if (talep.durum === 'reddedildi') {
      if (stepId === 'talep') return 'gecilen';
      const approvalSteps = dynamicSteps.filter(s => s.id !== 'talep' && s.id !== 'bordro');
      if (approvalSteps.length > 0 && approvalSteps[0].id === stepId) return 'red';
      return 'ilerlenmemis';
    }

    if (talep.durum === 'onaylandi') {
      return 'gecilen';
    }

    if (talep.durum === 'beklemede') {
      if (stepId === 'talep') return 'gecilen';
      if (stepId === 'bordro') return 'ilerlenmemis';

      const approvalSteps = dynamicSteps.filter(s => s.id !== 'talep' && s.id !== 'bordro');
      // İlk onay adımında beklemede
      if (approvalSteps.length > 0 && approvalSteps[0].id === stepId) {
        return 'bulunulan';
      }
      return 'ilerlenmemis';
    }

    return 'ilerlenmemis';
  };

  // Kompakt görünüm (Tablo satırları ve drawer içi küçük durum göstergesi)
  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title="Onay Akışı İlerleme Durumu">
        {dynamicSteps.map((step, i) => {
          const status = getStepStatus(step.id);
          return (
            <React.Fragment key={step.id}>
              <div
                title={`${step.label} (${
                  status === 'gecilen' ? 'Geçilen Aşama: Onaylandı' :
                  status === 'bulunulan' ? 'Bulunulan Aşama: Onay Bekliyor' :
                  status === 'red' ? 'Reddedildi' :
                  'Henüz İlerlenmemiş Aşama'
                })`}
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                  status === 'gecilen'
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                    : status === 'bulunulan'
                    ? 'bg-blue-600 border-blue-700 text-white shadow-md ring-2 ring-blue-400 animate-pulse'
                    : status === 'red'
                    ? 'bg-red-500 border-red-600 text-white shadow-xs'
                    : 'bg-slate-100 border-slate-300 text-slate-400'
                }`}
              >
                {status === 'gecilen' ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : status === 'bulunulan' ? (
                  <Clock className="w-3 h-3 stroke-[2.5]" />
                ) : status === 'red' ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>
              {i < dynamicSteps.length - 1 && (
                <div
                  className={`h-0.5 w-3.5 rounded-full transition-colors ${
                    status === 'gecilen' ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Geniş & Detaylı Onay Akışı Kartı
  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all space-y-4">
      {/* Üst Bilgi Barı */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
              Onay Akışı Takibi
            </span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              {leaveApprovalService.getActiveStagesCount(approvalConfig)} Aşamalı Süreç
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-extrabold text-slate-900 text-sm">{talep.employeeName}</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">{formatIzinTuru(talep.izinTuru)}</span>
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

        {/* Genel İzin Statüsü Rozeti */}
        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs ${
            talep.durum === 'onaylandi' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
            talep.durum === 'beklemede' ? 'bg-blue-100 text-blue-900 border border-blue-300 animate-pulse' :
            talep.durum === 'reddedildi' ? 'bg-red-100 text-red-800 border border-red-300' :
            'bg-gray-100 text-gray-700 border border-gray-300'
          }`}>
            {talep.durum === 'onaylandi' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
            {talep.durum === 'beklemede' && <Clock className="w-3.5 h-3.5 text-blue-600" />}
            {talep.durum === 'reddedildi' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
            <span>
              {talep.durum === 'onaylandi' ? '✓ Onaylandı (Süreç Tamamlandı)' : 
               talep.durum === 'beklemede' ? '⏳ Onay Bekliyor' : 
               talep.durum === 'reddedildi' ? '✗ Reddedildi' : 'İptal'}
            </span>
          </span>
        </div>
      </div>

      {/* Dinamik ve Belirgin Onay Akışı Adımları (Grid / Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {dynamicSteps.map((step) => {
          const status = getStepStatus(step.id);
          const isPassed = status === 'gecilen';
          const isCurrent = status === 'bulunulan';
          const isPending = status === 'ilerlenmemis';
          const isRejected = status === 'red';

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                isPassed
                  ? 'border-emerald-500 bg-emerald-50/90 shadow-xs ring-1 ring-emerald-400/30'
                  : isCurrent
                  ? 'border-blue-600 bg-blue-50/95 shadow-md ring-4 ring-blue-500/25 relative scale-[1.02]'
                  : isRejected
                  ? 'border-red-500 bg-red-50/90 shadow-xs'
                  : 'border-dashed border-slate-300 bg-slate-50/60 text-slate-500 opacity-75'
              }`}
            >
              <div>
                {/* Üst Rozet (Aşama Durumu) */}
                <div className="flex items-center justify-between mb-2">
                  {isPassed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                      <CheckCircle className="w-2.5 h-2.5" /> Geçilen Aşama
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs animate-pulse">
                      <Clock className="w-2.5 h-2.5" /> Bulunulan Aşama
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600">
                      ⚪ Henüz İlerlenmedi
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs">
                      <XCircle className="w-2.5 h-2.5" /> Reddedildi
                    </span>
                  )}
                </div>

                {/* İkon & Başlık */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${
                    isPassed
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white shadow-md'
                      : isRejected
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-200 text-slate-400 border border-slate-300'
                  }`}>
                    {step.icon}
                  </div>
                  <div className="min-w-0">
                    <h5 className={`text-xs font-black truncate ${
                      isPassed ? 'text-emerald-950' : isCurrent ? 'text-blue-950' : isRejected ? 'text-red-950' : 'text-slate-600'
                    }`}>
                      {step.label}
                    </h5>
                    <p className={`text-[10px] font-semibold truncate ${
                      isPassed ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : isRejected ? 'text-red-700' : 'text-slate-400'
                    }`}>
                      {step.roleLabel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Alt Durum Satırı */}
              <div className={`pt-2 mt-2 border-t flex items-center justify-between text-[10px] font-bold ${
                isPassed
                  ? 'border-emerald-200/80 text-emerald-800'
                  : isCurrent
                  ? 'border-blue-200 text-blue-900'
                  : isRejected
                  ? 'border-red-200 text-red-800'
                  : 'border-slate-200 text-slate-400'
              }`}>
                <span>Durum:</span>
                <span className="flex items-center gap-1 font-extrabold">
                  {isPassed && '✓ Onaylandı (Geçildi)'}
                  {isCurrent && '⏳ Onay Bekliyor'}
                  {isPending && '⚪ Sırada Bekliyor'}
                  {isRejected && '✗ Reddedildi'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Renk Göstergesi (Legend) */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] pt-2.5 border-t border-slate-100 text-slate-500">
        <span className="font-extrabold text-slate-700">Aşama Göstergeleri:</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" /> Yeşil: Geçilen Aşama
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 font-bold border border-blue-300">
          <Clock className="w-3 h-3 text-blue-600 animate-pulse" /> Mavi: Bulunulan Aşama (Aktif)
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 font-bold border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Gri: Henüz İlerlenmemiş (Sırada)
        </span>
      </div>

      {/* Departman İzin Çakışma Uyarısı */}
      {talep.durum === 'beklemede' && (() => {
        const overlaps = (talepleri || []).filter(t => 
          t.id !== talep.id &&
          t.durum === 'onaylandi' &&
          ((t.baslangicTarihi <= talep.bitisTarihi) && (t.bitisTarihi >= talep.baslangicTarihi))
        );
        if (overlaps.length === 0) return null;
        const names = overlaps.map(o => o.employeeName || 'Personel').join(', ');
        return (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <span className="font-bold text-amber-900">⚠️ Çakışma Uyarısı:</span>
            <span>Aynı tarihlerde {names} onaylı izinli!</span>
          </div>
        );
      })()}

      {/* İşlem Butonları (Düzenle, Sil, Onayla, Reddet) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
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

        {talep.durum === 'beklemede' && !onOnay && !onRed && (
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Yetkili Onayı Bekleniyor
            </span>
          </div>
        )}
      </div>

      {/* Red nedeni */}
      {talep.durum === 'reddedildi' && talep.redNedeni && (
        <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-200">
          <p className="text-xs text-red-700"><span className="font-bold">Red Nedeni:</span> {talep.redNedeni}</p>
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

export const IzinWorkflowListesi: React.FC<IzinWorkflowListesiProps> = ({ 
  talepleri, 
  onOnay, 
  onRed, 
  onEdit, 
  onDelete 
}) => {
  const bekleyenler = talepleri.filter((t) => t.durum === 'beklemede');
  const digerler = talepleri.filter((t) => t.durum !== 'beklemede');

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div>
        <h3 className="text-base font-bold text-gray-800">Onay Bekleyen Talepler</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          İzin onay akışındaki kademeler ve işlem bekleyen personel talepleri
        </p>
      </div>

      {bekleyenler.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 text-center text-slate-400 text-sm">
          Onay bekleyen izin talebi bulunmuyor
        </div>
      ) : (
        <div className="space-y-3.5">
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
        <div className="space-y-3 pt-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Son İşlemler / Tamamlanan İzinler
          </p>
          <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden divide-y divide-slate-100">
            {digerler.map((talep) => (
              <div key={talep.id} className="flex flex-wrap items-center justify-between px-5 py-4 hover:bg-slate-50/70 transition-colors gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-extrabold text-slate-900">{talep.employeeName}</p>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      talep.durum === 'onaylandi' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      talep.durum === 'reddedildi' ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {talep.durum === 'onaylandi' ? '✓ Onaylandı' : talep.durum === 'reddedildi' ? '✗ Reddedildi' : 'İptal'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    <span className="font-bold text-slate-700">{formatIzinTuru(talep.izinTuru)}</span> • <b>{talep.gunSayisi} gün</b> • 📅 {formatDateRange(talep.baslangicTarihi, talep.bitisTarihi)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <IzinWorkflow talep={talep} compact talepleri={talepleri} />
                  
                  {/* Düzenle / Sil butonları */}
                  {(onEdit || onDelete) && (
                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(talep)}
                          title="İzin Kaydını Düzenle"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(talep.id)}
                          title="İzin Kaydını Sil"
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

export { IzinWorkflow };
export default IzinWorkflow;
