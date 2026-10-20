import React, { useEffect, useState, useMemo } from 'react';
import { 
  CheckCircle, Clock, XCircle, User, UserCheck, CreditCard, 
  Edit2, Trash2, Check
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
  effectiveAppRole?: string;
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
  talepleri = [],
  effectiveAppRole = ''
}) => {
  const [approvalConfig, setApprovalConfig] = useState<LeaveApprovalConfig>(DEFAULT_LEAVE_APPROVAL_CONFIG);
  const [localCurrentStage, setLocalCurrentStage] = useState<string | null>(null);

  useEffect(() => {
    leaveApprovalService.getConfig(talep.companyId).then(cfg => {
      if (cfg) setApprovalConfig(cfg);
    }).catch(err => console.error('Error fetching approval config for workflow:', err));

    const handleConfigUpdate = (e: any) => {
      if (e.detail) setApprovalConfig(e.detail);
    };
    const handleStageUpdate = (e: any) => {
      if (e.detail && e.detail.talepId === talep.id) {
        setLocalCurrentStage(e.detail.nextStage);
      }
    };

    window.addEventListener('humanius_leave_approval_updated', handleConfigUpdate);
    window.addEventListener('humanius_leave_request_stage_updated', handleStageUpdate);
    return () => {
      window.removeEventListener('humanius_leave_approval_updated', handleConfigUpdate);
      window.removeEventListener('humanius_leave_request_stage_updated', handleStageUpdate);
    };
  }, [talep.companyId, talep.id]);

  // Anlık durum
  const currentStage = useMemo(() => {
    if (localCurrentStage) return localCurrentStage;
    return leaveApprovalService.getTalepCurrentStage(talep.id, talep.durum, approvalConfig, talep);
  }, [talep.id, talep.durum, (talep as any).currentStage, approvalConfig, localCurrentStage]);

  const authorizedRolesText = useMemo(() => {
    const list = leaveApprovalService.getAuthorizedRolesList(approvalConfig);
    return list.length > 0 ? list.join(' / ') : 'Yetkili Yönetici';
  }, [approvalConfig]);

  // Doğrudan (Tek Adımlı) Onay Akışı: Çalışan Talebi -> Yetkili Onayı -> Bordro & Puantaj
  const dynamicSteps = useMemo(() => {
    const steps: DynamicStep[] = [
      {
        id: 'talep',
        stepNum: 1,
        label: '1. Çalışan Talebi',
        roleLabel: 'Talep Formu',
        desc: 'Talep oluşturuldu & iletildi',
        icon: <User className="w-3.5 h-3.5" />,
      },
      {
        id: 'onay',
        stepNum: 2,
        label: '2. Yetkili Onayı',
        roleLabel: authorizedRolesText,
        desc: 'Yetkili onayladığında direkt onaylanır',
        icon: <UserCheck className="w-3.5 h-3.5" />,
      },
      {
        id: 'bordro',
        stepNum: 3,
        label: '3. Bordro & Puantaj',
        roleLabel: 'Sistem Entegrasyonu',
        desc: 'Puantaj ve bordroya otomatik işlendi',
        icon: <CreditCard className="w-3.5 h-3.5" />,
      }
    ];
    return steps;
  }, [authorizedRolesText]);

  // Her adımın anlık durumunu belirle
  const getStepStatus = (stepId: string): StepDurum => {
    if (stepId === 'talep') return 'gecilen';

    if (talep.durum === 'onaylandi') {
      return 'gecilen';
    }

    if (talep.durum === 'reddedildi') {
      if (stepId === 'onay') return 'red';
      return 'ilerlenmemis';
    }

    if (talep.durum === 'beklemede') {
      if (stepId === 'onay') return 'bulunulan';
      return 'ilerlenmemis';
    }

    return 'ilerlenmemis';
  };

  // Kullanıcının rolü seçili onay yetkililerinden biri mi kontrolü
  const isRoleAuthorizedForThisStage = useMemo(() => {
    if (talep.durum !== 'beklemede' || currentStage === 'completed') return false;
    return leaveApprovalService.canRoleApproveCurrentStage(effectiveAppRole, currentStage as any, approvalConfig);
  }, [talep.durum, currentStage, effectiveAppRole, approvalConfig]);

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
                  status === 'gecilen' ? 'Tamamlandı / Onaylandı' :
                  status === 'bulunulan' ? `Onay Bekliyor (${authorizedRolesText})` :
                  status === 'red' ? 'Reddedildi' :
                  'Beklemede'
                })`}
                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  status === 'gecilen'
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-2xs'
                    : status === 'bulunulan'
                    ? 'bg-blue-600 border-blue-700 text-white shadow-xs ring-2 ring-blue-400 animate-pulse'
                    : status === 'red'
                    ? 'bg-red-500 border-red-600 text-white shadow-2xs'
                    : 'bg-slate-100 border-slate-300 text-slate-400'
                }`}
              >
                {status === 'gecilen' ? (
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                ) : status === 'bulunulan' ? (
                  <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                ) : status === 'red' ? (
                  <XCircle className="w-3 h-3" />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                )}
              </div>
              {i < dynamicSteps.length - 1 && (
                <div
                  className={`h-0.5 w-3 rounded-full transition-colors ${
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

  // Geniş & Kompakt Tasarımlı Onay Akışı Kartı
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-300 hover:border-slate-400 p-4 shadow-xs hover:shadow-md transition-all space-y-3">
      {/* Üst Bilgi Barı */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
              İzin Onay Takibi
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
              Yetkili: {authorizedRolesText}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-extrabold text-slate-900 text-sm">{talep.employeeName}</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">{formatIzinTuru(talep.izinTuru)}</span>
            <span>•</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-xs">
              {talep.gunSayisi} Gün
            </span>
            {talep.baslangicTarihi && (
              <>
                <span>•</span>
                <span className="font-bold text-cyan-800 bg-cyan-50 px-2.5 py-0.5 rounded-md border border-cyan-200 text-xs">
                  📅 {formatDateRange(talep.baslangicTarihi, talep.bitisTarihi)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Genel İzin Statüsü Rozeti */}
        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold shadow-2xs ${
            talep.durum === 'onaylandi' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
            talep.durum === 'beklemede' ? 'bg-blue-100 text-blue-900 border border-blue-300 animate-pulse' :
            talep.durum === 'reddedildi' ? 'bg-red-100 text-red-800 border border-red-300' :
            'bg-gray-100 text-gray-700 border border-gray-300'
          }`}>
            {talep.durum === 'onaylandi' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
            {talep.durum === 'beklemede' && <Clock className="w-3.5 h-3.5 text-blue-600" />}
            {talep.durum === 'reddedildi' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
            <span>
              {talep.durum === 'onaylandi' ? '✓ Onaylandı' : 
               talep.durum === 'beklemede' ? '⏳ Onay Bekliyor' : 
               talep.durum === 'reddedildi' ? '✗ Reddedildi' : 'İptal'}
            </span>
          </span>
        </div>
      </div>

      {/* Onay Akışı Adımları (3 Adım: Talep -> Yetkili Onayı -> Bordro & Puantaj) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {dynamicSteps.map((step) => {
          const status = getStepStatus(step.id);
          const isPassed = status === 'gecilen';
          const isCurrent = status === 'bulunulan';
          const isPending = status === 'ilerlenmemis';
          const isRejected = status === 'red';

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all min-h-[82px] ${
                isPassed
                  ? 'border-emerald-300 bg-emerald-50/80 shadow-2xs'
                  : isCurrent
                  ? 'border-blue-500 bg-blue-50/90 shadow-xs ring-2 ring-blue-400/25 relative scale-[1.01]'
                  : isRejected
                  ? 'border-red-300 bg-red-50/80 shadow-2xs'
                  : 'border-dashed border-slate-200 bg-slate-50/50 text-slate-400 opacity-70'
              }`}
            >
              <div>
                {/* Üst Rozet */}
                <div className="flex items-center justify-between mb-1.5">
                  {isPassed && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                      <CheckCircle className="w-2.5 h-2.5" /> Tamamlandı
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-2xs animate-pulse">
                      <Clock className="w-2.5 h-2.5" /> Onay Bekliyor
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-slate-200/80 text-slate-600">
                      ⚪ Beklemede
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-red-600 text-white shadow-2xs">
                      <XCircle className="w-2.5 h-2.5" /> Reddedildi
                    </span>
                  )}
                </div>

                {/* İkon & Başlık */}
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isPassed
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isRejected
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-200 text-slate-400 border border-slate-300'
                  }`}>
                    {step.icon}
                  </div>
                  <div className="min-w-0">
                    <h5 className={`text-[11px] font-bold truncate leading-tight ${
                      isPassed ? 'text-emerald-950' : isCurrent ? 'text-blue-950 font-black' : isRejected ? 'text-red-950' : 'text-slate-600'
                    }`}>
                      {step.label}
                    </h5>
                    <p className={`text-[9.5px] font-medium truncate ${
                      isPassed ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : isRejected ? 'text-red-700' : 'text-slate-400'
                    }`}>
                      {step.roleLabel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Alt Durum Satırı */}
              <div className={`pt-1 mt-1 border-t flex items-center justify-between text-[9px] font-bold ${
                isPassed
                  ? 'border-emerald-200/80 text-emerald-800'
                  : isCurrent
                  ? 'border-blue-200 text-blue-900'
                  : isRejected
                  ? 'border-red-200 text-red-800'
                  : 'border-slate-200 text-slate-400'
              }`}>
                <span>Durum:</span>
                <span className="flex items-center gap-0.5">
                  {isPassed && '✓ Onaylandı'}
                  {isCurrent && '⏳ Direkt Onay Bekliyor'}
                  {isPending && '⚪ Beklemede'}
                  {isRejected && '✗ Reddedildi'}
                </span>
              </div>
            </div>
          );
        })}
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
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <span className="font-bold text-amber-900">⚠️ Çakışma Uyarısı:</span>
            <span>Aynı tarihlerde {names} onaylı izinli!</span>
          </div>
        );
      })()}

      {/* İşlem Butonları (Düzenle, Sil, Onayla, Reddet veya Rol Yetki Bilgisi) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200">
        <div className="flex gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(talep)}
              className="py-1 px-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Edit2 className="w-3 h-3 text-blue-600" />
              <span>Düzenle</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(talep.id)}
              className="py-1 px-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
              <span>Sil</span>
            </button>
          )}
        </div>

        {/* Beklemede Olan Talepler İçin Onay/Yetki Durumu */}
        {talep.durum === 'beklemede' && (
          <div className="ml-auto flex items-center gap-2">
            {isRoleAuthorizedForThisStage ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                  Onay Yetkisi: <strong className="text-slate-700">{authorizedRolesText}</strong>
                </span>
                {onRed && (
                  <button
                    type="button"
                    onClick={() => onRed(talep.id)}
                    className="py-1.5 px-3.5 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 hover:border-red-300 transition-colors shadow-2xs"
                  >
                    Reddet
                  </button>
                )}
                {onOnay && (
                  <button
                    type="button"
                    onClick={() => onOnay(talep.id)}
                    className="py-1.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Onayla</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                <span>
                  Onay Bekliyor
                  <span className="text-amber-700 font-medium ml-1.5">
                    (Yetkili: <b>{leaveApprovalService.getRequiredRoleLabel(currentStage as any, approvalConfig)}</b>)
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Red nedeni */}
      {talep.durum === 'reddedildi' && talep.redNedeni && (
        <div className="mt-2 p-2.5 bg-red-50 rounded-xl border border-red-200">
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
  effectiveAppRole?: string;
}

export const IzinWorkflowListesi: React.FC<IzinWorkflowListesiProps> = ({ 
  talepleri, 
  onOnay, 
  onRed, 
  onEdit, 
  onDelete,
  effectiveAppRole = ''
}) => {
  const bekleyenler = talepleri.filter((t) => t.durum === 'beklemede');
  const digerler = talepleri.filter((t) => t.durum !== 'beklemede');

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div>
        <h3 className="text-base font-bold text-gray-800">Onay Bekleyen Talepler</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Onay bekleyen personel izin talepleri
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
              effectiveAppRole={effectiveAppRole}
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
