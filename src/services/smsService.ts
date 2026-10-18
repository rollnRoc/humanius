import { supabase } from '../lib/supabase';
import { getTodayYYYYMMDD } from '../utils/sanitize';
import { normalizeCompanyId } from './companyService';

export interface SmsConfig {
  enabled: boolean;
  username: string;
  password: string;
  source_addr: string;
  login_url: string;
  start_delay_minutes: number; // e.g. 15 -> 08:30 vardiyası için 08:45
  end_delay_minutes: number;   // e.g. 15 -> 18:00 vardiyası için 18:15
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
  enabled: false, // TÜM FİRMALARDA OTOMATİK KAPALI OLARAK BAŞLAR
  username: '908502428910',
  password: '3e3f25f6-mpsp-1406',
  source_addr: '',
  login_url: 'https://humanius.net',
  start_delay_minutes: 10, // 10 dk gecikme (örn: 08:30 için 08:40)
  end_delay_minutes: 10,   // 10 dk gecikme (örn: 18:00 için 18:10)
};

const SMS_CONFIG_KEY = 'humanius_sms_config';
const SMS_LOGS_KEY = 'humanius_sms_logs';

export const smsService = {
  /**
   * Belirtilen firma için Vardiya SMS servisinin açık olup olmadığını kontrol eder.
   * Tüm firmalarda varsayılan olarak KAPALI (false) gelir.
   * Yalnızca Süper Yönetici tarafından açık hale getirilebilir.
   * @param companyId Firma ID, UUID veya firma adı
   * @param exactCompanyOnly Eğer true ise (örn: Sistem Ayarları tablosunda) genel 'all' durumuna bakmaz, doğrudan bu firmanın durumunu verir.
   */
  isCompanySmsEnabled(companyId?: string | null, exactCompanyOnly: boolean = false): boolean {
    try {
      let registry: Record<string, boolean> = {};
      try {
        const raw = localStorage.getItem('humanius_company_sms_registry');
        if (raw) registry = JSON.parse(raw);
      } catch {}

      // Parametre 'all', 'default' veya tanımsız ise:
      if (!companyId || companyId === 'all' || companyId === 'default') {
        const globalFlag = localStorage.getItem('humanius_company_sms_enabled_all');
        if (globalFlag === 'true') return true;
        if (registry['all'] === true) return true;
        // Registry veya localStorage içinde açık olan herhangi bir firma var mı?
        const hasAnyEnabled = Object.values(registry).some((v) => v === true);
        if (hasAnyEnabled) return true;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('humanius_company_sms_enabled_') && k !== 'humanius_company_sms_enabled_all') {
            if (localStorage.getItem(k) === 'true') return true;
          }
        }
        return false;
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

      // 1. Registry'de bu firma için doğrudan bir kayıt var mı?
      for (const id of candidates) {
        if (registry[id] !== undefined) {
          if (registry[id] === true) return true;
        }
      }

      // 2. localStorage doğrudan anahtarlarında var mı?
      for (const id of candidates) {
        const flag = localStorage.getItem(`humanius_company_sms_enabled_${id}`);
        if (flag !== null) {
          if (flag === 'true') return true;
        }
        const saved = localStorage.getItem(`${SMS_CONFIG_KEY}_${id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.enabled === true) return true;
          } catch {}
        }
      }

      // 3. exactCompanyOnly false ise genel all veya registry['all'] kontrolü
      if (!exactCompanyOnly) {
        const globalAll = localStorage.getItem('humanius_company_sms_enabled_all');
        if (globalAll === 'true') return true;
        if (registry['all'] === true) return true;
      }
    } catch (e) {
      console.warn('isCompanySmsEnabled okuma hatası:', e);
    }
    return false;
  },

  /**
   * Süper Yönetici tarafından bir firma için SMS servisini açar veya kapatır.
   */
  setCompanySmsEnabled(companyId: string, enabled: boolean, companyName?: string): boolean {
    if (!companyId && !companyName) return false;
    try {
      const targetIds = new Set<string>();
      if (companyId) {
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

      let registry: Record<string, boolean> = {};
      try {
        const raw = localStorage.getItem('humanius_company_sms_registry');
        if (raw) registry = JSON.parse(raw);
      } catch {}

      targetIds.forEach((id) => {
        registry[id] = enabled;
        localStorage.setItem(`humanius_company_sms_enabled_${id}`, String(enabled));
        const cur = this.getConfig(id);
        cur.enabled = enabled;
        localStorage.setItem(`${SMS_CONFIG_KEY}_${id}`, JSON.stringify(cur));
      });

      if (companyId === 'all') {
        localStorage.setItem('humanius_company_sms_enabled_all', String(enabled));
        registry['all'] = enabled;
      } else if (enabled) {
        localStorage.setItem('humanius_company_sms_enabled_all', 'true');
        registry['all'] = true;
      } else {
        const anyRemaining = Object.entries(registry).some(([k, v]) => k !== 'all' && v === true);
        if (!anyRemaining) {
          localStorage.setItem('humanius_company_sms_enabled_all', 'false');
          registry['all'] = false;
        }
      }

      localStorage.setItem('humanius_company_sms_registry', JSON.stringify(registry));

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
    try {
      const isEnabled = this.isCompanySmsEnabled(companyId);
      const cleanCompId = companyId ? normalizeCompanyId(companyId) : undefined;
      const candidateKeys = [
        companyId ? `${SMS_CONFIG_KEY}_${companyId}` : null,
        companyId ? `${SMS_CONFIG_KEY}_${companyId.trim().toLowerCase()}` : null,
        cleanCompId ? `${SMS_CONFIG_KEY}_${cleanCompId}` : null,
        `${SMS_CONFIG_KEY}_all`,
        SMS_CONFIG_KEY,
      ].filter(Boolean) as string[];

      for (const key of candidateKeys) {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...DEFAULT_SMS_CONFIG,
            ...parsed,
            start_delay_minutes: parsed.start_delay_minutes === 15 ? 10 : (parsed.start_delay_minutes ?? 10),
            end_delay_minutes: parsed.end_delay_minutes === 15 ? 10 : (parsed.end_delay_minutes ?? 10),
            enabled: isEnabled,
          };
        }
      }
      return { ...DEFAULT_SMS_CONFIG, enabled: isEnabled };
    } catch (e) {
      console.warn('SMS config okuma hatası:', e);
    }
    return { ...DEFAULT_SMS_CONFIG, enabled: false };
  },

  /**
   * SMS Ayarlarını kaydet
   */
  saveConfig(companyId: string | undefined, updates: Partial<SmsConfig>, companyName?: string): SmsConfig {
    const current = this.getConfig(companyId);
    const updated: SmsConfig = { ...current, ...updates };
    try {
      const targetId = companyId || 'all';
      const cleanCompId = normalizeCompanyId(targetId);
      const keysToSave = Array.from(
        new Set([
          targetId,
          targetId.trim().toLowerCase(),
          cleanCompId,
          companyName || '',
          companyName ? companyName.trim().toLowerCase() : '',
          targetId === 'all' ? 'all' : '',
        ])
      ).filter(Boolean);

      for (const id of keysToSave) {
        localStorage.setItem(`${SMS_CONFIG_KEY}_${id}`, JSON.stringify(updated));
        if (typeof updates.enabled === 'boolean') {
          localStorage.setItem(`humanius_company_sms_enabled_${id}`, String(updates.enabled));
        }
      }

      if (typeof updates.enabled === 'boolean') {
        this.setCompanySmsEnabled(targetId, updates.enabled, companyName);
      }

      window.dispatchEvent(new CustomEvent('humanius_sms_config_updated', { detail: updated }));
    } catch (e) {
      console.error('SMS config kaydetme hatası:', e);
    }
    return updated;
  },

  /**
   * Telefon numarasını Verimor için standartlaştırır (905xxxxxxxxx)
   */
  formatPhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    let clean = String(phone).replace(/[^\d]/g, '');
    if (!clean) return null;

    // Başta 0 varsa kaldır
    if (clean.startsWith('0')) {
      clean = clean.substring(1);
    }

    // 10 haneli ise (5xxxxxxxxx) başına 90 ekle
    if (clean.length === 10) {
      clean = `90${clean}`;
    }

    // Türkiye telefon numarası 90 ile başlar ve 12 hanelidir
    if (clean.startsWith('90') && clean.length === 12) {
      return clean;
    }

    // Farklı ülke kodu içeren numaralar (en az 11 hane)
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

    // 1. Önce Supabase Edge Function denemesi (sunucu tarafında IP veya proxy varsa)
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: payload,
      });
      if (!error && data && data.success) {
        return { success: true, rawResponse: data };
      }
    } catch {
      // Supabase edge function deploy edilmemişse doğrudan veya proxy ile devam et
    }

    // 2. Vite dev proxy veya doğrudan Verimor çağrısı
    // Geliştirme ortamında CORS'u aşmak için Vite proxy (/api/verimor) kullanılır
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
          errMessage = `Verimor Güvenlik Kısıtlaması (403): ${responseText}. Lütfen bu IP adresini Verimor SMS panelinde (Güvenlik / İzinli IP'ler) yetkilendiriniz.`;
        }
        return { success: false, error: errMessage, rawResponse: responseText };
      }

      return { success: true, rawResponse: responseText };
    } catch (fetchErr: any) {
      // CORS veya Ağ Hatası
      const msg = fetchErr?.message || String(fetchErr);
      return {
        success: false,
        error: `Ağ / Bağlantı Hatası: ${msg}`,
      };
    }
  },

  /**
   * Vardiya Başlatma Hatırlatma SMS'i (Örn: 08:30 vardiyası için 08:45'te başlatmadıysa)
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
   * Vardiya Bitirme Hatırlatma SMS'i (Örn: 18:00 vardiyası için 18:15'te bitirmediyse)
   */
  async sendShiftEndReminder(
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
        type: 'end_reminder',
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
      `Bugün ${shiftText} vardiyanız tamamlanmıştır ancak henüz vardiyanızı bitirmediğiniz tespit edilmiştir. Lütfen sisteme giriş yaparak vardiyanızı bitiriniz.\n` +
      `${config.login_url || 'https://humanius.net'}`;

    const res = await this.sendVerimorSms(targetPhone, smsMessage, config, targetCompId);

    this.addLog({
      employee_id: employee.id,
      employee_name: employee.name,
      company_id: targetCompId,
      phone: targetPhone,
      type: 'end_reminder',
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

    // Manuel Test SMS: Yetkili kullanıcı doğrudan test gönderimi yaptığında
    // zamanlayıcı kapalı olsa bile test bağlantısının denenmesini sağlar.
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
   * Bugün bu personele bu türde SMS gönderilmiş mi kontrol et
   * KULLANICI KESİN TALİMATI: Günde kesinlikle sadece 1 kere atılır!
   */
  hasSentToday(
    employeeId: string,
    type: 'start_reminder' | 'end_reminder',
    dateStr: string,
    companyId?: string
  ): boolean {
    // 1. Doğrudan anlık kilit kontrolü (O(1) spam koruması)
    const sentKey = `humanius_sms_sent_${dateStr}_${employeeId}_${type}`;
    try {
      if (localStorage.getItem(sentKey) === '1') {
        return true;
      }
    } catch {}

    // 2. Ham tüm log kayıtlarında bugün bu personele bu türde SMS gönderim kaydı var mı kontrol et
    // (Durum ister success ister failed olsun; kullanıcı talimatı gereği günde sadece 1 kere atılır)
    const allLogs = this.getRawLogs();
    const found = allLogs.some(
      (log) =>
        log.employee_id === employeeId &&
        log.type === type &&
        log.date === dateStr
    );

    if (found) {
      try {
        localStorage.setItem(sentKey, '1');
      } catch {}
      return true;
    }

    return false;
  },

  /**
   * Bugün için SMS gönderildi olarak işaretle (Çift gönderimi anında engelleyen kilit)
   */
  markSentToday(
    employeeId: string,
    type: 'start_reminder' | 'end_reminder',
    dateStr: string
  ): void {
    try {
      localStorage.setItem(`humanius_sms_sent_${dateStr}_${employeeId}_${type}`, '1');
    } catch {}
  },

  /**
   * Ham SMS Loglarını Getir (Filtresiz)
   */
  getRawLogs(): SmsLogEntry[] {
    try {
      const raw = localStorage.getItem(SMS_LOGS_KEY);
      if (!raw) return [];
      const list: SmsLogEntry[] = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  /**
   * SMS Loglarını Getir (Firma ve Tarih filtreli)
   * Her şirketin sadece kendi geçmişini görmesini garanti eder.
   */
  getLogs(
    dateFilter?: string,
    companyId?: string,
    employees?: Array<{ id: string; company_id?: string; name?: string; phone?: string; company?: string }>
  ): SmsLogEntry[] {
    try {
      const list = this.getRawLogs();
      let filtered = list;

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
            if (empComp === cleanTargetCompId || emp.company_id === companyId || (!cleanTargetCompId || cleanTargetCompId === 'default')) {
              if (emp.id) employeeIdSet.add(emp.id);
              if (emp.name) employeeNameSet.add(emp.name.trim().toLocaleLowerCase('tr-TR'));
              const rawP = (emp.phone || '').replace(/\D/g, '');
              if (rawP.length >= 7) employeePhoneSet.add(rawP);
            }
          });
        }

        filtered = filtered.filter((l) => {
          // 1. Log kaydında doğrudan company_id varsa karşılaştır
          if (l.company_id) {
            const logComp = normalizeCompanyId(l.company_id);
            if (cleanTargetCompId && cleanTargetCompId !== 'default') {
              return logComp === cleanTargetCompId || l.company_id === companyId;
            }
          }

          // 2. Personel ID eşleşmesi
          if (l.employee_id && employeeIdSet.has(l.employee_id)) {
            return true;
          }

          // 3. Personel İsim eşleşmesi
          if (l.employee_name && employeeNameSet.has(l.employee_name.trim().toLocaleLowerCase('tr-TR'))) {
            return true;
          }

          // 4. Personel Telefon eşleşmesi
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
   * Yeni Log Ekle
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
      const existing = this.getRawLogs();
      // En fazla 1000 kayıt tut
      const updated = [newEntry, ...existing].slice(0, 1000);
      localStorage.setItem(SMS_LOGS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('humanius_sms_updated', { detail: newEntry }));
    } catch (e) {
      console.error('SMS log kaydetme hatası:', e);
    }

    return newEntry;
  },

  /**
   * Logları Temizle (Belirtilen firma için veya tümü)
   */
  clearLogs(companyId?: string, employees?: Array<{ id: string; company_id?: string; company?: string }>): void {
    try {
      if (!companyId || companyId === 'all') {
        localStorage.removeItem(SMS_LOGS_KEY);
      } else {
        const all = this.getRawLogs();
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

        const remaining = all.filter((l) => {
          if (l.company_id) {
            const logComp = normalizeCompanyId(l.company_id);
            return logComp !== cleanTargetCompId && l.company_id !== companyId;
          }
          if (l.employee_id && employeeIdSet.has(l.employee_id)) {
            return false;
          }
          return true;
        });

        localStorage.setItem(SMS_LOGS_KEY, JSON.stringify(remaining));
      }
      window.dispatchEvent(new CustomEvent('humanius_sms_updated'));
    } catch (e) {
      console.error('clearLogs hatası:', e);
    }
  },
};
