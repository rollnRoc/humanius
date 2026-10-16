import { Employee } from '../types';
import { shiftService, CompanyShift } from './shiftService';
import { pdksService } from './pdksService';
import { smsService } from './smsService';
import { getTodayYYYYMMDD } from '../utils/sanitize';

function timeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = String(timeStr).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export interface ShiftSmsCheckResult {
  timestamp: string;
  checkedEmployeesCount: number;
  startSmsSent: number;
  endSmsSent: number;
  alreadySentCount: number;
  errors: Array<{ employeeName: string; error: string }>;
}

let workerIntervalId: any = null;
let isWorkerRunning = false;

export const shiftSmsScheduler = {
  /**
   * Tüm çalışanlar için vardiya başlangıç ve bitiş SMS kontrollerini çalıştırır
   */
  async checkAndSendShiftSms(params: {
    employees: Employee[];
    companyId?: string;
    targetDate?: Date;
  }): Promise<ShiftSmsCheckResult> {
    const now = params.targetDate || new Date();
    const todayStr = getTodayYYYYMMDD(now);
    const isSaturday = now.getDay() === 6;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const result: ShiftSmsCheckResult = {
      timestamp: now.toISOString(),
      checkedEmployeesCount: 0,
      startSmsSent: 0,
      endSmsSent: 0,
      alreadySentCount: 0,
      errors: [],
    };

    const activeEmployees = params.employees.filter(
      (e) => e.status !== 'inactive' && e.status !== 'onLeave'
    );
    result.checkedEmployeesCount = activeEmployees.length;

    // Herhangi bir firma için SMS açık mı?
    const hasAnySmsPermission =
      smsService.isCompanySmsEnabled(params.companyId) ||
      activeEmployees.some((e) => smsService.isCompanySmsEnabled(e.company_id || e.company));

    if (!hasAnySmsPermission) {
      return result;
    }

    try {
      // 1. İlgili tüm şirketlerin vardiyalarını, atamalarını ve bugünkü PDKS kayıtlarını yükle
      const companyIds = Array.from(
        new Set(activeEmployees.map((e) => e.company_id || params.companyId).filter(Boolean))
      ) as string[];
      const targetCompanies = companyIds.length > 0 ? companyIds : [params.companyId || 'default'];

      const shiftsByComp = new Map<string, CompanyShift[]>();
      const assignsByComp = new Map<string, Record<string, string>>();
      const todayVardiyaMap = new Map<string, any>();

      await Promise.all(
        targetCompanies.map(async (cid) => {
          try {
            const [cShifts, cAssigns, cVardiyalar] = await Promise.all([
              shiftService.getShifts(cid),
              shiftService.getAssignments(cid),
              pdksService.getVardiyalar(cid),
            ]);
            shiftsByComp.set(cid, cShifts || []);
            assignsByComp.set(cid, cAssigns || {});
            (cVardiyalar || []).forEach((v) => {
              const vDate = String(v.tarih).split('T')[0];
              if (vDate === todayStr) {
                todayVardiyaMap.set(v.employee_id, v);
              }
            });
          } catch (e) {
            console.warn(`Vardiya SMS verileri yüklenirken hata (${cid}):`, e);
          }
        })
      );

      // 2. Her çalışan için vardiya ve PDKS saatlerini analiz et
      for (const emp of activeEmployees) {
        const empCompanyId = emp.company_id || params.companyId;

        // Firma bazlı SMS kontrolü: Bu firma için SMS kapalıysa kesinlikle SMS gönderme
        if (!smsService.isCompanySmsEnabled(empCompanyId) && !smsService.isCompanySmsEnabled(emp.company)) {
          continue;
        }

        const empConfig = smsService.getConfig(empCompanyId);
        const compShifts = shiftsByComp.get(empCompanyId) || shiftsByComp.get('default') || [];
        const compAssigns = assignsByComp.get(empCompanyId) || assignsByComp.get('default') || {};
        const defaultShift = compShifts.find((s) => s.is_default) || compShifts[0];

        // Çalışanın atanmış vardiyasını bul
        const assignedShiftId = compAssigns[emp.id];
        let shift: CompanyShift = compShifts.find((s) => s.id === assignedShiftId) || defaultShift;

        if (!shift) continue;

        // Cumartesi ise varsa Cumartesi saatlerini al
        let startTimeStr = shift.start_time || '08:30';
        let endTimeStr = shift.end_time || '18:00';

        if (isSaturday && shift.saturday_start_time && shift.saturday_end_time) {
          startTimeStr = shift.saturday_start_time;
          endTimeStr = shift.saturday_end_time;
        }

        const startMinutes = timeStringToMinutes(startTimeStr);
        const endMinutes = timeStringToMinutes(endTimeStr);

        if (startMinutes === null || endMinutes === null) continue;

        // Tolerans / gecikme dakikaları (Kullanıcı talimatı: 10 dk: 08:30 için 08:40, 18:00 için 18:10)
        const startDelay = empConfig.start_delay_minutes ?? 10;
        const endDelay = empConfig.end_delay_minutes ?? 10;

        const startTriggerMinutes = startMinutes + startDelay;
        const endTriggerMinutes = endMinutes + endDelay;

        // Çalışanın bugünkü PDKS kaydı
        const todayRec = todayVardiyaMap.get(emp.id);
        const hasGiris = Boolean(
          todayRec?.giris_saati &&
          todayRec.giris_saati !== '00:00:00' &&
          todayRec.giris_saati !== '-'
        );
        const hasCikis = Boolean(
          todayRec?.cikis_saati &&
          todayRec.cikis_saati !== '00:00:00' &&
          todayRec.cikis_saati !== '-'
        );

        const shiftInfo = {
          name: shift.name,
          start_time: startTimeStr,
          end_time: endTimeStr,
        };

        // Gece vardiyası toleransı (örn: 22:00 - 06:00)
        const isNightShift = endMinutes < startMinutes;
        const isWithinShiftHours = isNightShift
          ? currentMinutes >= startTriggerMinutes || currentMinutes < endMinutes
          : currentMinutes >= startTriggerMinutes && currentMinutes < endMinutes;

        // ── DURUM 1: VARDIYA BAŞLATMA HATIRLATMASI ───────────────────────────
        // Örn: 08:30 vardiyası için 08:40 ve sonrasında, vardiya henüz bitmeden önce
        // KULLANICI KESİN TALİMATI: Sadece vardiyası başlamış ama hala vardiyasını başlatmamış kişilere GÜNDE SADECE 1 KERE
        if (
          isWithinShiftHours &&
          !hasGiris
        ) {
          const alreadySent = smsService.hasSentToday(emp.id, 'start_reminder', todayStr, empCompanyId);
          if (alreadySent) {
            result.alreadySentCount++;
          } else {
            smsService.markSentToday(emp.id, 'start_reminder', todayStr);
            const sendRes = await smsService.sendShiftStartReminder(emp, shiftInfo, empConfig, empCompanyId);
            if (sendRes.success) {
              result.startSmsSent++;
            } else if (sendRes.error) {
              result.errors.push({ employeeName: emp.name, error: sendRes.error });
            }
          }
        }

        // ── DURUM 2: VARDIYA BİTİRME HATIRLATMASI ────────────────────────────
        // Örn: 18:00 vardiyası için 18:10 ve sonrasında (en fazla +180 dk içerisinde)
        // KULLANICI KESİN TALİMATI: Mesaiye girmiş ama vardiya saati dolduğu halde vardiyasını bitirmemiş kişilere GÜNDE SADECE 1 KERE
        if (
          currentMinutes >= endTriggerMinutes &&
          currentMinutes <= endTriggerMinutes + 180 &&
          hasGiris &&
          !hasCikis
        ) {
          const alreadySent = smsService.hasSentToday(emp.id, 'end_reminder', todayStr, empCompanyId);
          if (alreadySent) {
            result.alreadySentCount++;
          } else {
            smsService.markSentToday(emp.id, 'end_reminder', todayStr);
            const sendRes = await smsService.sendShiftEndReminder(emp, shiftInfo, empConfig, empCompanyId);
            if (sendRes.success) {
              result.endSmsSent++;
            } else if (sendRes.error) {
              result.errors.push({ employeeName: emp.name, error: sendRes.error });
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Vardiya SMS kontrolü sırasında beklenmeyen hata:', err);
    }

    return result;
  },

  /**
   * Arka plan otomatik zamanlayıcısını başlatır (her 60 saniyede bir kontrol)
   */
  startShiftSmsWorker(getEmployees: () => Employee[], getCompanyId: () => string): void {
    if (workerIntervalId) {
      return; // Zaten çalışıyor
    }

    // İlk kontrol 5 saniye sonra çalışsın
    setTimeout(() => {
      this.tickWorker(getEmployees, getCompanyId);
    }, 5000);

    // Sonra her 60 saniyede bir tekrar etsin
    workerIntervalId = setInterval(() => {
      this.tickWorker(getEmployees, getCompanyId);
    }, 60000);
  },

  /**
   * Tekil kontrol adımı
   */
  async tickWorker(getEmployees: () => Employee[], getCompanyId: () => string): Promise<void> {
    if (isWorkerRunning) return;
    try {
      isWorkerRunning = true;
      const employees = getEmployees();
      const companyId = getCompanyId();
      if (employees && employees.length > 0) {
        await this.checkAndSendShiftSms({ employees, companyId });
      }
    } catch (err) {
      console.warn('Shift SMS worker tick uyarısı:', err);
    } finally {
      isWorkerRunning = false;
    }
  },

  /**
   * Arka plan zamanlayıcısını durdurur
   */
  stopShiftSmsWorker(): void {
    if (workerIntervalId) {
      clearInterval(workerIntervalId);
      workerIntervalId = null;
    }
  },
};
