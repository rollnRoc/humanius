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
   * Yalnızca SMS servisi aktif şirketler için Vardiya Başlatma SMS kontrollerini çalıştırır.
   * (Mesai bitişleri otomatik sonlandırıldığı için bitiş SMS kontrolü yapılmaz.)
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

    await smsService.refreshFromDatabase();

    // Sadece SMS özelliği açık olan şirketlerin aktif personellerini filtrele
    const activeEmployees = params.employees.filter(
      (e) =>
        e.status !== 'inactive' &&
        e.status !== 'onLeave' &&
        (smsService.isCompanySmsEnabled(e.company_id, true) ||
          smsService.isCompanySmsEnabled(e.company, true))
    );
    result.checkedEmployeesCount = activeEmployees.length;

    if (activeEmployees.length === 0) {
      return result;
    }

    try {
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

      for (const emp of activeEmployees) {
        const empCompanyId = emp.company_id || params.companyId;
        if (!smsService.isCompanySmsEnabled(empCompanyId, true) && !smsService.isCompanySmsEnabled(emp.company, true)) {
          continue;
        }

        const empConfig = smsService.getConfig(empCompanyId);
        const compShifts = shiftsByComp.get(empCompanyId || '') || shiftsByComp.get('default') || [];
        const compAssigns = assignsByComp.get(empCompanyId || '') || assignsByComp.get('default') || {};
        const defaultShift = compShifts.find((s) => s.is_default) || compShifts[0];

        const assignedShiftId = compAssigns[emp.id];
        const shift: CompanyShift = compShifts.find((s) => s.id === assignedShiftId) || defaultShift;

        if (!shift) continue;

        let startTimeStr = shift.start_time || '08:30';
        let endTimeStr = shift.end_time || '18:00';

        if (isSaturday && shift.saturday_start_time && shift.saturday_end_time) {
          startTimeStr = shift.saturday_start_time;
          endTimeStr = shift.saturday_end_time;
        }

        const startMinutes = timeStringToMinutes(startTimeStr);
        const endMinutes = timeStringToMinutes(endTimeStr);

        if (startMinutes === null || endMinutes === null) continue;

        const startDelay = empConfig.start_delay_minutes ?? 10;
        const startTriggerMinutes = startMinutes + startDelay;

        const todayRec = todayVardiyaMap.get(emp.id);
        const hasGiris = Boolean(
          todayRec?.giris_saati &&
            todayRec.giris_saati !== '00:00:00' &&
            todayRec.giris_saati !== '-'
        );

        const shiftInfo = {
          name: shift.name,
          start_time: startTimeStr,
          end_time: endTimeStr,
        };

        // Yalnızca vardiya başlangıç penceresinde (+10 dk ile +75 dk arası) ve giriş yoksa başlatma SMS'i gönder
        const isInStartWindow =
          currentMinutes >= startTriggerMinutes && currentMinutes <= startTriggerMinutes + 65;

        if (isInStartWindow && !hasGiris) {
          const alreadySent = smsService.hasSentToday(emp.id, 'start_reminder', todayStr);
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
      }
    } catch (err: any) {
      console.error('Vardiya SMS kontrolü sırasında beklenmeyen hata:', err);
    }

    return result;
  },

  startShiftSmsWorker(getEmployees: () => Employee[], getCompanyId: () => string): void {
    if (workerIntervalId) {
      return;
    }
    setTimeout(() => {
      this.tickWorker(getEmployees, getCompanyId);
    }, 5000);
    workerIntervalId = setInterval(() => {
      this.tickWorker(getEmployees, getCompanyId);
    }, 5 * 60 * 1000);
  },

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

  stopShiftSmsWorker(): void {
    if (workerIntervalId) {
      clearInterval(workerIntervalId);
      workerIntervalId = null;
    }
  },
};
