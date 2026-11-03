/**
 * Humanius 24/7 Shift SMS Background Worker (Database-First & Smart Window Optimized)
 *
 * - Yalnızca veritabanında (sistem_parametreleri -> company_sms_registry) SMS özelliği AÇIK olan
 *   şirketlerin personellerini kontrol eder (varsayılan olarak tüm firmalar kapalıdır).
 * - Yalnızca Vardiya Başlatma Hatırlatması (start_reminder) gönderir; vardiya bitişleri otomatik
 *   sonlandırıldığı için bitiş SMS'i gönderilmez.
 * - Gereksiz veritabanı sorgularını önlemek için 5 dakikada bir çalışır ve yalnızca vardiya başlangıç
 *   penceresinde (+10 dk ile +70 dk arası) henüz bugün kontrol edilmemiş personel varsa PDKS tablosunu sorgular.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.WORKER_PORT || 3001;
const STATE_FILE = process.env.STATE_FILE || path.join(__dirname, 'data', 'shift-sms-state.json');

process.on('uncaughtException', (err) => {
  console.error('[ShiftSmsWorker] CRITICAL Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[ShiftSmsWorker] CRITICAL Unhandled Rejection:', reason);
});

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gfbtjdedaoleqhrlebof.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wxlAHN7E63-NbwFiVhJBeA_F3PYc3w-';
const AUTH_EMAIL = 'muhammed.gur@humanius.net';
const GLOBAL_STORAGE_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

function computeQuickLoginToken(email, userId) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const raw = `hmn-ql-v1:${cleanEmail}:${userId || 'legacy'}:9f4b2c8e1a`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `ql1_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

const VERIMOR_USERNAME = process.env.VERIMOR_USERNAME || '908502428910';
const VERIMOR_PASSWORD = process.env.VERIMOR_PASSWORD || '3e3f25f6-mpsp-1406';
const VERIMOR_SOURCE_ADDR = process.env.VERIMOR_SOURCE_ADDR || '';
const LOGIN_URL = 'https://humanius.net';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── In-Memory & Persistent State ──────────────────────────────────────────
let workerState = {
  enabled: true,
  companyOverrides: {}, // { [companyId]: boolean } - Sadece true olan firmalar açıktır
  startDelayMinutes: 10,
  lastTickIso: null,
  lastTickStats: null,
  sentHistory: {}, // { [key: `${date}_${empId}_start_reminder`]: { timestamp, phone, name, status } }
  checkedGirisToday: {}, // { [key: `${date}_${empId}`]: true } - Giriş yaptığı tespit edilenleri tekrar sorgulamaz
  recentLogs: [],
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      workerState = {
        ...workerState,
        ...parsed,
        checkedGirisToday: parsed.checkedGirisToday || {},
      };
    }
  } catch (err) {
    console.warn('[ShiftSmsWorker] Durum dosyası okuma uyarısı:', err.message);
  }
}

function saveState() {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (workerState.recentLogs && workerState.recentLogs.length > 200) {
      workerState.recentLogs = workerState.recentLogs.slice(0, 200);
    }
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (workerState.sentHistory) {
      for (const [k, v] of Object.entries(workerState.sentHistory)) {
        if (v.timestamp && new Date(v.timestamp).getTime() < sevenDaysAgo) {
          delete workerState.sentHistory[k];
        }
      }
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(workerState, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ShiftSmsWorker] Durum dosyası kaydetme uyarısı:', err.message);
  }
}

// ── Türkiye Saati ve Tarihi Yardımcısı ────────────────────────────────────
function getTurkeyTime(customDate) {
  const now = customDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map = {};
  for (const p of parts) map[p.type] = p.value;

  const year = map.year || '2026';
  const month = (map.month || '01').padStart(2, '0');
  const day = (map.day || '01').padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const hour = parseInt(map.hour || '0', 10);
  const min = parseInt(map.minute || '0', 10);
  const sec = parseInt(map.second || '0', 10);
  const trTimeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  const currentMinutes = hour * 60 + min;

  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    weekday: 'short',
  });
  const weekday = dayFormatter.format(now);
  const isSaturday = weekday === 'Sat';
  const isSunday = weekday === 'Sun';

  return { todayStr, trTimeStr, currentMinutes, isSaturday, isSunday };
}

function timeStringToMinutes(timeStr) {
  if (!timeStr) return null;
  const clean = String(timeStr).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function formatPhone(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/[^\d]/g, '');
  if (!clean) return null;
  if (clean.startsWith('0')) clean = clean.substring(1);
  if (clean.length === 10) clean = `90${clean}`;
  if (clean.startsWith('90') && clean.length === 12) return clean;
  if (clean.length >= 11 && clean.length <= 15) return clean;
  return null;
}

// ── In-Memory Cache (Veritabanı Sorgu Optimizasyonu - 30 Dakika TTL) ────────
let cachedRegistry = null;
let cachedRegistryExpiresAt = 0;
let cachedEmployees = null;
let cachedEmployeesExpiresAt = 0;
let cachedEmployeesKey = '';
let cachedShifts = null;
let cachedShiftsExpiresAt = 0;
let cachedAssigns = null;
let cachedAssignsExpiresAt = 0;
let backoffUntil = 0;

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

// ── Veritabanı Sistem Parametresi Okuma / Yazma ──────────────────────────
async function getSystemParam(ad, companyId = GLOBAL_STORAGE_COMPANY_ID) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/user-management`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        operation: 'get_system_parameter',
        companyId,
        kategori: 'sistem_kurallari',
        ad,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.deger) return null;
    return typeof data.deger === 'string' ? JSON.parse(data.deger) : data.deger;
  } catch (err) {
    console.warn(`[ShiftSmsWorker] getSystemParam (${ad}) uyarısı:`, err.message);
    return null;
  }
}

async function saveSystemParam(ad, value, aciklama = 'SMS Worker Verisi', companyId = GLOBAL_STORAGE_COMPANY_ID) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/user-management`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        operation: 'save_system_parameter',
        companyId,
        kategori: 'sistem_kurallari',
        ad,
        deger: typeof value === 'string' ? value : JSON.stringify(value),
        aciklama,
      }),
    });
  } catch (err) {
    console.warn(`[ShiftSmsWorker] saveSystemParam (${ad}) uyarısı:`, err.message);
  }
}

async function loadCompanyRegistry(force = false) {
  if (cachedRegistry && Date.now() < cachedRegistryExpiresAt && !force) {
    return cachedRegistry;
  }
  const dbReg = await getSystemParam('company_sms_registry');
  if (dbReg && typeof dbReg === 'object') {
    workerState.companyOverrides = dbReg;
    cachedRegistry = dbReg;
    cachedRegistryExpiresAt = Date.now() + 15 * 60 * 1000; // 15 dk cache
    saveState();
    return dbReg;
  }
  cachedRegistry = workerState.companyOverrides || {};
  cachedRegistryExpiresAt = Date.now() + 5 * 60 * 1000;
  return cachedRegistry;
}

async function loadLogsFromDb() {
  const dbLogs = await getSystemParam('sms_logs_v1');
  if (Array.isArray(dbLogs)) {
    workerState.recentLogs = dbLogs.slice(0, 200);
    saveState();
  }
}

async function appendLogToDb(logEntry) {
  workerState.recentLogs.unshift(logEntry);
  if (workerState.recentLogs.length > 200) {
    workerState.recentLogs = workerState.recentLogs.slice(0, 200);
  }
  saveState();
  await saveSystemParam('sms_logs_v1', workerState.recentLogs, 'Vardiya SMS Gönderim Günlüğü');
}

// ── Supabase Token Yönetimi ───────────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

async function getSupabaseToken() {
  if (SERVICE_ROLE_KEY) {
    return SERVICE_ROLE_KEY;
  }
  if (cachedToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }
  try {
    const loginRes = await fetch(`${SUPABASE_URL}/functions/v1/user-management`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        operation: 'quick_login',
        email: AUTH_EMAIL,
        quickToken: computeQuickLoginToken(AUTH_EMAIL),
      }),
    });
    if (loginRes.status === 402 || loginRes.status === 403) {
      backoffUntil = Date.now() + 10 * 60 * 1000;
      return null;
    }
    const loginData = await loginRes.json();
    if (!loginData.token_hash) throw new Error('Token hash alınamadı');

    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ token_hash: loginData.token_hash, type: 'magiclink' }),
    });
    const authSession = await verifyRes.json();
    if (!authSession.access_token) throw new Error('Access token üretilemedi');

    cachedToken = authSession.access_token;
    tokenExpiresAt = Date.now() + (authSession.expires_in || 3600) * 1000;
    return cachedToken;
  } catch (err) {
    console.error('[ShiftSmsWorker] Supabase token yenileme hatası:', err.message);
    return null;
  }
}

// ── Verimor SMS Gönderimi ─────────────────────────────────────────────────
async function sendVerimorSms(destPhone, message) {
  const formattedDest = formatPhone(destPhone);
  if (!formattedDest) {
    return { success: false, error: `Geçersiz telefon numarası: ${destPhone}` };
  }

  const payload = {
    username: VERIMOR_USERNAME,
    password: VERIMOR_PASSWORD,
    source_addr: VERIMOR_SOURCE_ADDR,
    messages: [
      {
        msg: message,
        dest: formattedDest,
      },
    ],
  };

  try {
    const res = await fetch('https://sms.verimor.com.tr/v2/send.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseText = await res.text();
    if (res.ok) {
      return { success: true, rawResponse: responseText };
    }
    if (responseText.includes('İzinsiz DNS') || responseText.includes('İzinsiz IP') || res.status === 403) {
      return {
        success: false,
        error: `Verimor IP Kısıtlaması (403): ${responseText}. Verimor panelinden sunucu IP kısıtlaması kaldırılmalıdır.`,
      };
    }
    return { success: false, error: `Verimor API Hatası (${res.status}): ${responseText}` };
  } catch (fetchErr) {
    return { success: false, error: `Verimor bağlantı hatası: ${fetchErr.message}` };
  }
}

// ── Ana Vardiya Tarama Fonksiyonu (Akıllı Pencere & Minimum Sorgu) ────────
let isTicking = false;

async function checkAndSendShiftSms(options = {}) {
  const trTime = getTurkeyTime(options.targetDate);
  const { todayStr, trTimeStr, currentMinutes, isSaturday, isSunday } = trTime;

  const stats = {
    timestamp: new Date().toISOString(),
    trTimeStr,
    checkedEmployees: 0,
    startSmsSent: 0,
    endSmsSent: 0,
    alreadySentCount: 0,
    skippedQueries: false,
    errors: [],
  };

  // Pazar günleri mesai başlangıç SMS kontrolü yapma (0 sorgu)
  if (isSunday && !options.forceRun) {
    return { ...stats, skippedQueries: true, message: 'Pazar günü otomatik SMS taraması pasif.' };
  }

  if (Date.now() < backoffUntil && !options.forceRun) {
    return { ...stats, skippedQueries: true, message: 'Servis geçici beklemede.' };
  }

  if (workerState.enabled === false && !options.forceRun) {
    return { ...stats, skippedQueries: true, message: 'SMS servisi genel ayarlardan duraklatılmıştır.' };
  }

  // 1. Veritabanından yalnızca SMS'i AÇIK olan şirketlerin UUID listesini al
  const registry = await loadCompanyRegistry(Boolean(options.forceRun));
  const enabledCompanyIds = Object.entries(registry || {})
    .filter(([k, val]) => val === true && UUID_REGEX.test(k))
    .map(([k]) => k);

  if (enabledCompanyIds.length === 0) {
    return {
      ...stats,
      skippedQueries: true,
      message: 'SMS servisi aktif edilmiş herhangi bir şirket bulunmuyor (0 sorgu).',
    };
  }

  const token = await getSupabaseToken();
  const effectiveKey = SERVICE_ROLE_KEY || ANON_KEY;
  const authHeaders = {
    apikey: effectiveKey,
    Authorization: token ? `Bearer ${token}` : `Bearer ${effectiveKey}`,
  };

  try {
    const companiesKey = enabledCompanyIds.slice().sort().join(',');
    const companyFilterParam = `in.(${enabledCompanyIds.join(',')})`;

    // 2. Yalnızca SMS'i açık şirketlerin çalışanlarını, vardiyalarını ve atamalarını yükle (30 Dk Cache)
    let activeEmployees = [];
    if (
      cachedEmployees &&
      cachedEmployeesKey === companiesKey &&
      Date.now() < cachedEmployeesExpiresAt &&
      !options.forceRun
    ) {
      activeEmployees = cachedEmployees;
    } else {
      const empUrl = `${SUPABASE_URL}/rest/v1/employees?select=id,name,phone,mobile,company_id,status,company&company_id=${companyFilterParam}&status=neq.inactive`;
      const empRes = await fetch(empUrl, { headers: authHeaders });
      if (empRes.ok) {
        const empData = await empRes.json();
        if (Array.isArray(empData)) {
          activeEmployees = empData.filter((e) => e.status !== 'inactive' && e.status !== 'onLeave');
          cachedEmployees = activeEmployees;
          cachedEmployeesKey = companiesKey;
          cachedEmployeesExpiresAt = Date.now() + 30 * 60 * 1000; // 30 dk cache
        }
      }
    }

    stats.checkedEmployees = activeEmployees.length;
    if (activeEmployees.length === 0) {
      return { ...stats, skippedQueries: true, message: 'Aktif şirkette kontrol edilecek personel yok.' };
    }

    let allShifts = cachedShifts;
    let allAssigns = cachedAssigns;
    const needShifts = !allShifts || Date.now() >= cachedShiftsExpiresAt || options.forceRun;
    const needAssigns = !allAssigns || Date.now() >= cachedAssignsExpiresAt || options.forceRun;

    if (needShifts || needAssigns) {
      const [shiftsRes, assignsRes] = await Promise.all([
        needShifts
          ? fetch(
              `${SUPABASE_URL}/rest/v1/company_shifts?select=id,name,start_time,end_time,company_id,is_default,saturday_start_time,saturday_end_time&company_id=${companyFilterParam}`,
              { headers: authHeaders }
            )
              .then((r) => r.json())
              .catch(() => [])
          : Promise.resolve(allShifts),
        needAssigns
          ? fetch(`${SUPABASE_URL}/rest/v1/company_shift_assignments?select=employee_id,shift_id`, {
              headers: authHeaders,
            })
              .then((r) => r.json())
              .catch(() => [])
          : Promise.resolve(allAssigns),
      ]);

      if (needShifts && Array.isArray(shiftsRes)) {
        allShifts = shiftsRes;
        cachedShifts = shiftsRes;
        cachedShiftsExpiresAt = Date.now() + 30 * 60 * 1000;
      }
      if (needAssigns && Array.isArray(assignsRes)) {
        allAssigns = assignsRes;
        cachedAssigns = assignsRes;
        cachedAssignsExpiresAt = Date.now() + 30 * 60 * 1000;
      }
    }

    const shiftsByCompany = new Map();
    (allShifts || []).forEach((s) => {
      const cid = s.company_id || 'default';
      if (!shiftsByCompany.has(cid)) shiftsByCompany.set(cid, []);
      shiftsByCompany.get(cid).push(s);
    });

    const assignsByEmp = new Map();
    (allAssigns || []).forEach((a) => {
      if (a.employee_id && a.shift_id) {
        assignsByEmp.set(a.employee_id, a.shift_id);
      }
    });

    // 3. ÖN KONTROL (0 PDKS SORGUSU):
    // Şu anki dakika itibarıyla vardiya başlangıç penceresinde (+10 dk ile +75 dk arası) olan
    // ve bugün henüz SMS gönderilmemiş / giriş yaptığı doğrulanmamış personel var mı?
    const startDelay = workerState.startDelayMinutes || 10;
    const candidates = [];

    for (const emp of activeEmployees) {
      const companyId = emp.company_id;
      if (!companyId || registry[companyId] !== true) continue;

      const sentKey = `${todayStr}_${emp.id}_start_reminder`;
      const girisCacheKey = `${todayStr}_${emp.id}`;

      if (workerState.sentHistory[sentKey]) {
        stats.alreadySentCount++;
        continue;
      }
      if (workerState.checkedGirisToday[girisCacheKey] && !options.forceRun) {
        continue;
      }

      const compShifts = shiftsByCompany.get(companyId) || [];
      const defaultShift = compShifts.find((s) => s.is_default) || compShifts[0] || {
        name: 'Standart Vardiya',
        start_time: '08:30',
        end_time: '18:00',
      };
      const assignedShiftId = assignsByEmp.get(emp.id);
      const shift = compShifts.find((s) => s.id === assignedShiftId) || defaultShift;

      let startTimeStr = shift.start_time || '08:30';
      let endTimeStr = shift.end_time || '18:00';
      if (isSaturday && shift.saturday_start_time && shift.saturday_end_time) {
        startTimeStr = shift.saturday_start_time;
        endTimeStr = shift.saturday_end_time;
      }

      const startMinutes = timeStringToMinutes(startTimeStr);
      const endMinutes = timeStringToMinutes(endTimeStr);
      if (startMinutes === null || endMinutes === null) continue;

      const startTriggerMinutes = startMinutes + startDelay;

      // Sadece vardiya başlangıcından +10 dk sonra ile +75 dk sonrası arasındaki pencerede kontrol et
      // (Böylece günün diğer 23 saatinde PDKS tablosuna hiç sorgu atılmaz)
      const isInStartCheckWindow =
        currentMinutes >= startTriggerMinutes && currentMinutes <= startTriggerMinutes + 65;

      if (isInStartCheckWindow) {
        candidates.push({
          emp,
          companyId,
          sentKey,
          girisCacheKey,
          shiftInfo: {
            name: shift.name || 'Vardiya',
            start_time: startTimeStr,
            end_time: endTimeStr,
          },
        });
      }
    }

    // Eğer şu an vardiya başlangıç penceresinde kontrol bekleyen kimse yoksa PDKS sorgusu atmadan çık!
    if (candidates.length === 0) {
      stats.skippedQueries = true;
      workerState.lastTickIso = new Date().toISOString();
      workerState.lastTickStats = stats;
      return stats;
    }

    // 4. Yalnızca aday personellerin bulunduğu aktif şirketler için bugünkü PDKS kayıtlarını çek
    const pdksRes = await fetch(
      `${SUPABASE_URL}/rest/v1/pdks_vardiya_kayitlari?select=employee_id,giris_saati,tarih&company_id=${companyFilterParam}&tarih=eq.${todayStr}`,
      { headers: authHeaders }
    )
      .then((r) => r.json())
      .catch(() => []);

    const todayPdksByEmp = new Map();
    if (Array.isArray(pdksRes)) {
      pdksRes.forEach((p) => {
        if (p.employee_id) {
          todayPdksByEmp.set(p.employee_id, p);
        }
      });
    }

    // 5. Adayları kontrol et: Giriş yapmışsa belleğe kaydet, yapmamışsa günde 1 kez başlatma SMS'i gönder
    for (const item of candidates) {
      const { emp, companyId, sentKey, girisCacheKey, shiftInfo } = item;
      const todayRec = todayPdksByEmp.get(emp.id);
      const hasGiris = Boolean(
        todayRec?.giris_saati &&
          todayRec.giris_saati !== '00:00:00' &&
          todayRec.giris_saati !== '-'
      );

      if (hasGiris) {
        // Personel zaten giriş yapmış, bugün bir daha PDKS sorgusuna dahil etme
        workerState.checkedGirisToday[girisCacheKey] = true;
        continue;
      }

      const targetPhone = emp.phone || emp.mobile;
      // Tekrar denemeyi önlemek için sentHistory'ye hemen işle (hata alsa bile her dakika tekrar denemesin)
      workerState.sentHistory[sentKey] = {
        timestamp: new Date().toISOString(),
        phone: targetPhone || '-',
        name: emp.name,
      };

      if (!targetPhone) {
        stats.errors.push({ employee: emp.name, error: 'Telefon numarası eksik' });
        await appendLogToDb({
          id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          employee_id: emp.id,
          employee_name: emp.name,
          company_id: companyId,
          phone: '-',
          type: 'start_reminder',
          shift_name: shiftInfo.name,
          shift_time: `${shiftInfo.start_time} - ${shiftInfo.end_time}`,
          message: '',
          status: 'failed',
          error_message: 'Personelin sistemde kayıtlı cep telefonu bulunamadı.',
          timestamp: new Date().toISOString(),
          date: todayStr,
        });
        continue;
      }

      const shiftText = `${shiftInfo.start_time} - ${shiftInfo.end_time}`;
      const smsMessage =
        `Sayın ${emp.name},\n` +
        `Bugün ${shiftText} vardiyanız başlamıştır ancak henüz vardiyanızı başlatmadığınız tespit edilmiştir. Lütfen sisteme giriş yaparak vardiyanızı başlatınız.\n` +
        `${LOGIN_URL}`;

      const sendRes = await sendVerimorSms(targetPhone, smsMessage);

      const logEntry = {
        id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        employee_id: emp.id,
        employee_name: emp.name,
        company_id: companyId,
        phone: targetPhone,
        type: 'start_reminder',
        shift_name: shiftInfo.name,
        shift_time: shiftText,
        message: smsMessage,
        status: sendRes.success ? 'success' : 'failed',
        error_message: sendRes.error,
        timestamp: new Date().toISOString(),
        date: todayStr,
      };

      await appendLogToDb(logEntry);

      if (sendRes.success) {
        stats.startSmsSent++;
        console.log(`[ShiftSmsWorker] Vardiya Başlatma SMS'i Gönderildi: ${emp.name} (${targetPhone})`);
      } else {
        stats.errors.push({ employee: emp.name, error: sendRes.error });
        console.warn(`[ShiftSmsWorker] SMS Gönderilemedi (${emp.name}): ${sendRes.error}`);
      }
    }
  } catch (err) {
    console.error('[ShiftSmsWorker] Tarama döngüsü hatası:', err);
    stats.errors.push({ error: err.message });
  }

  workerState.lastTickIso = new Date().toISOString();
  workerState.lastTickStats = stats;
  saveState();

  return stats;
}

// ── Periyodik Zamanlayıcı (Her 5 Dakikada Bir - 300 Saniye) ──────────────
async function tick() {
  if (isTicking) return;
  try {
    isTicking = true;
    await checkAndSendShiftSms();
  } catch (err) {
    console.warn('[ShiftSmsWorker] Periyodik tick hatası:', err.message);
  } finally {
    isTicking = false;
  }
}

// ── HTTP API Server ───────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;
  if (pathname.startsWith('/api/sms-worker')) {
    pathname = pathname.substring('/api/sms-worker'.length) || '/';
  }

  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  const getBody = () =>
    new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          resolve({});
        }
      });
    });

  if (pathname === '/' || pathname === '/status') {
    const tr = getTurkeyTime();
    const registry = await loadCompanyRegistry(false);
    return sendJson(200, {
      status: 'online',
      service: 'Humanius Shift SMS Background Worker (Smart Window)',
      turkeyTime: tr,
      workerEnabled: workerState.enabled,
      companyOverrides: registry,
      lastTickIso: workerState.lastTickIso,
      lastTickStats: workerState.lastTickStats,
      totalRecentLogs: workerState.recentLogs ? workerState.recentLogs.length : 0,
    });
  }

  if (pathname === '/logs') {
    const dateFilter = url.searchParams.get('date');
    const companyFilter = url.searchParams.get('companyId');
    let logs = workerState.recentLogs || [];
    if (dateFilter) {
      logs = logs.filter((l) => l.date === dateFilter);
    }
    if (companyFilter && companyFilter !== 'all' && companyFilter !== 'default') {
      logs = logs.filter((l) => !l.company_id || l.company_id === companyFilter);
    }
    return sendJson(200, { logs: logs.slice(0, 100) });
  }

  if (pathname === '/trigger-check' && req.method === 'POST') {
    const result = await checkAndSendShiftSms({ forceRun: true });
    return sendJson(200, { success: true, result });
  }

  if (pathname === '/toggle-service' && req.method === 'POST') {
    const body = await getBody();
    if (typeof body.enabled === 'boolean') {
      workerState.enabled = body.enabled;
      saveState();
      return sendJson(200, { success: true, enabled: workerState.enabled });
    }
    return sendJson(400, { error: 'enabled boolean alani zorunludur' });
  }

  if (pathname === '/set-company-permission' && req.method === 'POST') {
    const body = await getBody();
    const { companyId, enabled, companyName } = body;
    if (!companyId || typeof enabled !== 'boolean') {
      return sendJson(400, { error: 'companyId ve enabled zorunludur' });
    }
    const registry = await loadCompanyRegistry(false);
    registry[companyId] = enabled;
    if (companyName) {
      registry[String(companyName).trim().toLowerCase()] = enabled;
    }
    workerState.companyOverrides = registry;
    cachedRegistry = registry;
    cachedRegistryExpiresAt = Date.now() + 15 * 60 * 1000;
    cachedEmployees = null; // Şirket listesi değiştiği için çalışan önbelleğini yenile
    saveState();
    await saveSystemParam('company_sms_registry', registry, 'Firma Bazlı Vardiya SMS Aktiflik Durumu');
    return sendJson(200, { success: true, companyId, enabled, companyOverrides: registry });
  }

  sendJson(404, { error: 'Endpoint bulunamadı' });
});

// ── Başlatma ──────────────────────────────────────────────────────────────
loadState();
loadCompanyRegistry(true).then(() => loadLogsFromDb());

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================================`);
  console.log(`Humanius Shift SMS Background Worker Aktif (5 Dk Akıllı Pencere)`);
  console.log(`Port: ${PORT} | Türkiye Saati: ${JSON.stringify(getTurkeyTime())}`);
  console.log(`=============================================================`);

  setTimeout(tick, 10000);
  // Her 5 dakikada bir (300.000 ms) kontrol et
  setInterval(tick, 5 * 60 * 1000);
});
