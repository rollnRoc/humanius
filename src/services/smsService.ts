import { supabase } from '../lib/supabase';
import { getTodayYYYYMMDD } from '../utils/sanitize';
import { normalizeCompanyId } from './companyService';
import { systemDataService } from './systemDataService';

export interface SmsConfig {
  enabled: boolean;
  username: string;
  password: string;
  source_addr: string;
  login_url: string;
  start_delay_minutes: number; // Örn: 10 -> 08:30 vardiyası için 08:40
  end_delay_minutes: number;
}

export interface SmsLogEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  company_id?: string;
  phone: string;
  type: 'start_reminder' | 'end_reminder' | 'test';
  shift_name: string;
  shift_time: string;
  message: string;
  status: 'success' | 'failed';
  error_message?: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
}

export const DEFAULT_SMS_CONFIG: SmsConfig = {
  enabled: false, // TÜM FİRMALARDA VARSAYILAN OLARAK KAPALI BAŞLAR
  username: '908502428910',
  password: '3e3f25f6-mpsp-1406',
  source_addr: '',
  login_url: 'https://humanius.net',
  start_delay_minutes: 10,
  end_delay_minutes: 10,
};

const GLOBAL_STORAGE_COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const REGISTRY_DB_KEY = 'company_sms_registry';
const LOGS_DB_KEY = 'sms_logs_v1';

// ── Bellek İçi Önbellek (localStorage kullanılmaz, doğrudan veritabanı ile senkronize çalışır) ──
let memoryRegistry: Record<string, boolean> = {};
let memoryConfigs: Record<string, SmsConfig> = {};
let memoryLogs: SmsLogEntry[] = [];
let memorySentToday = new Set<string>();
let isHydrated = false;
let hydrationPromise: Promise<void> | null = null;

async function hydrateFromDatabase(force: boolean = false): Promise<void> {
  if (isHydrated && !force) return;
  if (hydrationPromise && !force) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const [dbRegistry, dbLogs] = await Promise.all([
        systemDataService.getCompanyData<Record<string, boolean>>(
          GLOBAL_STORAGE_COMPANY_ID,
          REGISTRY_DB_KEY,
          {}
        ),
        systemDataService.getCompanyData<SmsLogEntry[]>(
          GLOBAL_STORAGE_COMPANY_ID,
          LOGS_DB_KEY,
          []
        ),
      ]);

      if (dbRegistry && typeof dbRegistry === 'object') {
        memoryRegistry = { ...dbRegistry };
      }

      if (Array.isArray(dbLogs)) {
        memoryLogs = dbLogs;
      }

      // Ayrıca arka plan worker servisinden canlı logları ve izinleri birleştir
      try {
        const res = await fetch('/api/sms-worker/logs');
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const workerData = await res.json();
            if (Array.isArray(workerData?.logs) && workerData.logs.length > 0) {
              const mergedMap = new Map<string, SmsLogEntry>();
              workerData.logs.forEach((l: SmsLogEntry) => mergedMap.set(l.id, l));
              memoryLogs.forEach((l: SmsLogEntry) => mergedMap.set(l.id, l));
              memoryLogs = Array.from(mergedMap.values()).sort((a, b) =>
                String(b.timestamp || '').localeCompare(String(a.timestamp || ''))
              );
            }
          }
        }
      } catch {}

      isHydrated = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('humanius_sms_company_updated'));
        window.dispatchEvent(new CustomEvent('humanius_sms_updated'));
      }
    } catch (e) {
      console.warn('[smsService] Veritabanı senkronizasyon uyarısı:', e);
    } finally {
      hydrationPromise = null;
    }
  })();

  return hydrationPromise;
}

// Modül yüklendiğinde veritabanından senkronize et
if (typeof window !== 'undefined') {
  hydrateFromDatabase();
}

export const smsService = {
  /**
   * Veritabanından en güncel SMS ayarlarını ve günlüklerini yeniler
   */
  async refreshFromDatabase(): Promise<void> {
    await hydrateFromDatabase(true);
  },

  /**
   * Belirtilen firma için Vardiya SMS servisinin açık olup olmadığını kontrol eder.
   * Tüm firmalarda varsayılan olarak KAPALI (false) gelir.
   */
  isCompanySmsEnabled(companyId?: string | null, exactCompanyOnly: boolean = false): boolean {
    try {
      if (!companyId || companyId === 'all' || companyId === 'default') {
        if (memoryRegistry['all'] === true) return true;
        return Object.entries(memoryRegistry).some(([k, v]) => k !== 'all' && v === true);
      }

      const cleanCompId = normalizeCompanyId(companyId);
      const candidates = Array.from(
        new Set([
          companyId,
          companyId.trim().toLowerCase(),
          cleanCompId,
          cleanCompId ? cleanCompId.trim().toLowerCase() : '',
        ])
      ).filter(Boolean);

      for (const id of candidates) {
        if (memoryRegistry[id] !== undefined) {
          return memoryRegistry[id] === true;
        }
      }

      if (!exactCompanyOnly && memoryRegistry['all'] === true) {
        return true;
      }
    } catch (e) {
      console.warn('isCompanySmsEnabled okuma hatası:', e);
    }
    return false;
  },

  /**
   * Süper Yönetici tarafından bir firma için SMS servisini açar veya kapatır.
   * Doğrudan veritabanına (sistem_parametreleri) ve arka plan worker servisine kaydeder.
   */
  setCompanySmsEnabled(companyId: string, enabled: boolean, companyName?: string): boolean {
    if (!companyId && !companyName) return false;
    try {
      const targetIds = new Set<string>();
      if (companyId && companyId !== 'all' && companyId !== 'default') {
        targetIds.add(companyId);
        targetIds.add(companyId.trim().toLowerCase());
        const clean = normalizeCompanyId(companyId);
        if (clean) {
          targetIds.add(clean);
          targetIds.add(clean.trim().toLowerCase());
        }
      }
      if (companyName) {
        targetIds.add(companyName);
        targetIds.add(companyName.trim().toLowerCase());
        const cleanFromName = normalizeCompanyId(companyName);
        if (cleanFromName) {
          targetIds.add(cleanFromName);
          targetIds.add(cleanFromName.trim().toLowerCase());
        }
      }

      targetIds.forEach((id) => {
        memoryRegistry[id] = enabled;
        const cur = this.getConfig(id);
        memoryConfigs[id] = { ...cur, enabled };
      });

      if (companyId === 'all') {
        memoryRegistry['all'] = enabled;
      } else {
        delete memoryRegistry['all'];
      }

      // 1. Veritabanına kaydet (sistem_parametreleri)
      void systemDataService.saveCompanyData(
        GLOBAL_STORAGE_COMPANY_ID,
        REGISTRY_DB_KEY,
        memoryRegistry,
        'Firma Bazlı Vardiya SMS Aktiflik Durumu'
      );

      // 2. Arka plan 7/24 SMS Worker servisine anlık bildir
      if (companyId && companyId !== 'all' && companyId !== 'default') {
        fetch('/api/sms-worker/set-company-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId, enabled, companyName }),
        }).catch(() => {});
      }

      window.dispatchEvent(
        new CustomEvent('humanius_sms_company_updated', {
          detail: { companyId, companyName, enabled },
        })
      );
      window.dispatchEvent(
        new CustomEvent('humanius_sms_config_updated', {
          detail: this.getConfig(companyId),
        })
      );
      return true;
    } catch (e) {
      console.error('setCompanySmsEnabled hatası:', e);
      return false;
    }
  },

  /**
   * SMS Ayarlarını getir (Firma bazlı açık/kapalı durumu ile)
   */
  getConfig(companyId?: string): SmsConfig {
    const isEnabled = this.isCompanySmsEnabled(companyId, Boolean(companyId && companyId !== 'all' && companyId !== 'default'));
    const cleanCompId = companyId ? normalizeCompanyId(companyId) : undefined;
    const saved = (companyId && memoryConfigs[companyId]) || (cleanCompId && memoryConfigs[cleanCompId]);
    if (saved) {
      return {
        ...DEFAULT_SMS_CONFIG,
        ...saved,
        enabled: isEnabled,
      };
    }
    return { ...DEFAULT_SMS_CONFIG, enabled: isEnabled };
  },

  /**
   * SMS Ayarlarını kaydet
   */
  saveConfig(companyId: string | undefined, updates: Partial<SmsConfig>, companyName?: string): SmsConfig {
    const current = this.getConfig(companyId);
    const updated: SmsConfig = { ...current, ...updates };
    const targetId = companyId || 'all';
    const cleanCompId = normalizeCompanyId(targetId);

    memoryConfigs[targetId] = updated;
    if (cleanCompId) {
      memoryConfigs[cleanCompId] = updated;
    }

    if (typeof updates.enabled === 'boolean') {
      this.setCompanySmsEnabled(targetId, updates.enabled, companyName);
    }

    window.dispatchEvent(new CustomEvent('humanius_sms_config_updated', { detail: updated }));
    return updated;
  },

  /**
   * Telefon numarasını Verimor için standartlaştırır (905xxxxxxxxx)
   */
  formatPhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    let clean = String(phone).replace(/[^\d]/g, '');
    if (!clean) return null;

    if (clean.startsWith('0')) {
      clean = clean.substring(1);
    }

    if (clean.length === 10) {
      clean = `90${clean}`;
    }

    if (clean.startsWith('90') && clean.length === 12) {
      return clean;
    }

    if (clean.length >= 11 && clean.length <= 15) {
      return clean;
    }

    return null;
  },

  /**
   * Verimor SMS Gönderme
   */
  async sendVerimorSms(
    destPhone: string,
    message: string,
    customConfig?: Partial<SmsConfig>,
    companyId?: string
  ): Promise<{ success: boolean; error?: string; rawResponse?: any }> {
    const config = { ...this.getConfig(companyId), ...(customConfig || {}) };

    const isOverrideOrTest = customConfig?.enabled === true;
    if (!config.enabled && !isOverrideOrTest) {
      return { success: false, error: 'SMS gönderimi bu firma için ayarlardan devre dışı bırakılmıştır.' };
    }

    const formattedDest = this.formatPhone(destPhone);
    if (!formattedDest) {
      return { success: false, error: `Geçersiz telefon numarası: ${destPhone}` };
    }

    const payload = {
      username: config.username,
      password: config.password,
      source_addr: config.source_addr || '',
      messages: [
        {
          msg: message,
          dest: formattedDest,
        },
      ],
    };

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: payload,
      });
      if (!error && data && data.success) {
        return { success: true, rawResponse: data };
      }
    } catch {}

    const isDev = import.meta.env.DEV;
    const url = isDev ? '/api/verimor/v2/send.json' : 'https://sms.verimor.com.tr/v2/send.json';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();

      if (!res.ok) {
        let errMessage = responseText;
        if (responseText.includes('İzinsiz DNS') || responseText.includes('İzinsiz IP') || res.status === 403) {
          errMessage = `Verimor Güvenlik Kısıtlaması (403): ${responseText}. Lütfen IP adresini Verimor SMS panelinde (Güvenlik / İzinli IP'ler) yetkilendiriniz.`;
        }
        return { success: false, error: errMessage, rawResponse: responseText };
      }

      return { success: true, rawResponse: responseText };
    } catch (fetchErr: any) {
      const msg = fetchErr?.message || String(fetchErr);
      return {
        success: false,
        error: `Ağ / Bağlantı Hatası: ${msg}`,
      };
    }
  },

  /**
   * Vardiya Başlatma Hatırlatma SMS'i (Örn: 08:30 vardiyası için 08:40'ta başlatmadıysa)
   */
  async sendShiftStartReminder(
    employee: { id: string; name: string; phone?: string; company_id?: string },
    shift: { name?: string; start_time: string; end_time: string },
    customConfig?: SmsConfig,
    companyId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const targetCompId = companyId || employee.company_id;
    const config = customConfig || this.getConfig(targetCompId);
    const today = getTodayYYYYMMDD();

    if (!config.enabled) {
      return { success: false, error: 'SMS gönderimi bu firma için kapalıdır.' };
    }

    const targetPhone = employee.phone || (employee as any).mobile;

    if (!targetPhone) {
      const entry = this.addLog({
        employee_id: employee.id,
        employee_name: employee.name,
        company_id: targetCompId,
        phone: '-',
        type: 'start_reminder',
        shift_name: shift.name || 'Vardiya',
        shift_time: `${shift.start_time} - ${shift.end_time}`,
        message: '',
        status: 'failed',
        error_message: 'Personelin sistemde kayıtlı cep telefonu bulunamadı.',
        date: today,
      });
      return { success: false, error: entry.error_message };
    }

    const shiftText = `${shift.start_time} - ${shift.end_time}`;
    const smsMessage =
      `Sayın ${employee.name},\n` +
      `Bugün ${shiftText} vardiyanız başlamıştır ancak henüz vardiyanızı başlatmadığınız tespit edilmiştir. Lütfen sisteme giriş yaparak vardiyanızı başlatınız.\n` +
      `${config.login_url || 'https://humanius.net'}`;

    const res = await this.sendVerimorSms(targetPhone, smsMessage, config, targetCompId);

    this.addLog({
      employee_id: employee.id,
      employee_name: employee.name,
      company_id: targetCompId,
      phone: targetPhone,
      type: 'start_reminder',
      shift_name: shift.name || 'Vardiya',
      shift_time: shiftText,
      message: smsMessage,
      status: res.success ? 'success' : 'failed',
      error_message: res.error,
      date: today,
    });

    return res;
  },

  /**
   * Vardiya Bitirme Hatırlatma SMS'i pasife alınmıştır (mesai bitişi otomatik sonlandırılmaktadır).
   */
  async sendShiftEndReminder(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Mesai bitişleri otomatik sonlandırıldığı için bitiş SMS bildirimi devre dışıdır.' };
  },

  /**
   * Test SMS Gönder
   */
  async sendTestSms(
    destPhone: string,
    testNote: string = 'Test Bildirimi',
    companyId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig(companyId);
    const today = getTodayYYYYMMDD();

    const smsMessage =
      `Humanius Vardiya SMS Testi: ${testNote}\n` +
      `Sistem bağlantısı başarıyla çalışmaktadır.\n` +
      `${config.login_url || 'https://humanius.net'}`;

    const testConfig: Partial<SmsConfig> = { ...config, enabled: true };
    const res = await this.sendVerimorSms(destPhone, smsMessage, testConfig, companyId);

    this.addLog({
      employee_id: 'test',
      employee_name: 'Test Gönderimi',
      company_id: companyId,
      phone: destPhone,
      type: 'test',
      shift_name: 'Test',
      shift_time: '-',
      message: smsMessage,
      status: res.success ? 'success' : 'failed',
      error_message: res.error,
      date: today,
    });

    return res;
  },

  /**
   * Bugün bu personele bu türde SMS gönderilmiş mi kontrol et (Günde sadece 1 kere atılır)
   */
  hasSentToday(
    employeeId: string,
    type: 'start_reminder' | 'end_reminder',
    dateStr: string
  ): boolean {
    const sentKey = `${dateStr}_${employeeId}_${type}`;
    if (memorySentToday.has(sentKey)) {
      return true;
    }

    const found = memoryLogs.some(
      (log) =>
        log.employee_id === employeeId &&
        log.type === type &&
        log.date === dateStr
    );

    if (found) {
      memorySentToday.add(sentKey);
      return true;
    }

    return false;
  },

  /**
   * Bugün için SMS gönderildi olarak işaretle
   */
  markSentToday(
    employeeId: string,
    type: 'start_reminder' | 'end_reminder',
    dateStr: string
  ): void {
    memorySentToday.add(`${dateStr}_${employeeId}_${type}`);
  },

  /**
   * Ham SMS Loglarını Getir (Filtresiz)
   */
  getRawLogs(): SmsLogEntry[] {
    return memoryLogs;
  },

  /**
   * SMS Loglarını Getir (Firma ve Tarih filtreli)
   */
  getLogs(
    dateFilter?: string,
    companyId?: string,
    employees?: Array<{ id: string; company_id?: string; name?: string; phone?: string; company?: string }>
  ): SmsLogEntry[] {
    try {
      let filtered = [...memoryLogs];

      if (dateFilter) {
        filtered = filtered.filter((l) => l.date === dateFilter);
      }

      if (companyId && companyId !== 'all') {
        const cleanTargetCompId = normalizeCompanyId(companyId);
        const employeeIdSet = new Set<string>();
        const employeeNameSet = new Set<string>();
        const employeePhoneSet = new Set<string>();

        if (employees && employees.length > 0) {
          employees.forEach((emp) => {
            const empComp = normalizeCompanyId(emp.company_id || emp.company || '');
            if (empComp === cleanTargetCompId || emp.company_id === companyId || !cleanTargetCompId || cleanTargetCompId === 'default') {
              if (emp.id) employeeIdSet.add(emp.id);
              if (emp.name) employeeNameSet.add(emp.name.trim().toLocaleLowerCase('tr-TR'));
              const rawP = (emp.phone || '').replace(/\D/g, '');
              if (rawP.length >= 7) employeePhoneSet.add(rawP);
            }
          });
        }

        filtered = filtered.filter((l) => {
          if (l.company_id) {
            const logComp = normalizeCompanyId(l.company_id);
            if (cleanTargetCompId && cleanTargetCompId !== 'default') {
              return logComp === cleanTargetCompId || l.company_id === companyId;
            }
          }
          if (l.employee_id && employeeIdSet.has(l.employee_id)) {
            return true;
          }
          if (l.employee_name && employeeNameSet.has(l.employee_name.trim().toLocaleLowerCase('tr-TR'))) {
            return true;
          }
          const logPhone = (l.phone || '').replace(/\D/g, '');
          if (logPhone.length >= 7 && employeePhoneSet.has(logPhone)) {
            return true;
          }
          return false;
        });
      }

      return filtered;
    } catch {
      return [];
    }
  },

  /**
   * Yeni Log Ekle (Veritabanına kaydeder)
   */
  addLog(entry: Omit<SmsLogEntry, 'id' | 'timestamp'>): SmsLogEntry {
    const newEntry: SmsLogEntry = {
      ...entry,
      company_id: entry.company_id ? normalizeCompanyId(entry.company_id) : undefined,
      id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    try {
      if (entry.type === 'start_reminder' || entry.type === 'end_reminder') {
        this.markSentToday(entry.employee_id, entry.type, entry.date);
      }
      memoryLogs = [newEntry, ...memoryLogs].slice(0, 200);
      void systemDataService.saveCompanyData(
        GLOBAL_STORAGE_COMPANY_ID,
        LOGS_DB_KEY,
        memoryLogs,
        'Vardiya SMS Gönderim Günlüğü'
      );
      window.dispatchEvent(new CustomEvent('humanius_sms_updated', { detail: newEntry }));
    } catch (e) {
      console.error('SMS log kaydetme hatası:', e);
    }

    return newEntry;
  },

  /**
   * Logları Temizle (Veritabanından siler)
   */
  clearLogs(companyId?: string, employees?: Array<{ id: string; company_id?: string; company?: string }>): void {
    try {
      if (!companyId || companyId === 'all') {
        memoryLogs = [];
      } else {
        const cleanTargetCompId = normalizeCompanyId(companyId);
        const employeeIdSet = new Set<string>();
        if (employees && employees.length > 0) {
          employees.forEach((emp) => {
            const empComp = normalizeCompanyId(emp.company_id || emp.company || '');
            if (empComp === cleanTargetCompId || emp.company_id === companyId) {
              if (emp.id) employeeIdSet.add(emp.id);
            }
          });
        }

        memoryLogs = memoryLogs.filter((l) => {
          if (l.company_id) {
            const logComp = normalizeCompanyId(l.company_id);
            return logComp !== cleanTargetCompId && l.company_id !== companyId;
          }
          if (l.employee_id && employeeIdSet.has(l.employee_id)) {
            return false;
          }
          return true;
        });
      }

      void systemDataService.saveCompanyData(
        GLOBAL_STORAGE_COMPANY_ID,
        LOGS_DB_KEY,
        memoryLogs,
        'Vardiya SMS Gönderim Günlüğü'
      );
      window.dispatchEvent(new CustomEvent('humanius_sms_updated'));
    } catch (e) {
      console.error('clearLogs hatası:', e);
    }
  },
};
