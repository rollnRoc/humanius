/**
 * Humanius 24/7 Shift SMS Background Worker
 * 
 * Bu servis tarayıcı veya yönetici açık olsun ya da olmasın,
 * Google Cloud Run üzerinde 7/24 arka planda çalışarak her 60 saniyede bir
 * mesaisi başlayıp giriş yapmayan veya mesaisi bitip çıkış yapmayan çalışanları tespit eder
 * ve Verimor üzerinden SMS bildirimlerini iletir.
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
const AUTH_EMAIL = 'gonulunlu@humanius.net'; // Admin auth to query PDKS records

const VERIMOR_USERNAME = process.env.VERIMOR_USERNAME || '908502428910';
const VERIMOR_PASSWORD = process.env.VERIMOR_PASSWORD || '3e3f25f6-mpsp-1406';
const VERIMOR_SOURCE_ADDR = process.env.VERIMOR_SOURCE_ADDR || '';
const LOGIN_URL = 'https://humanius.net';

// ── In-Memory & Persistent State ──────────────────────────────────────────
let workerState = {
  enabled: true, // 7/24 Genel otomatik SMS açık
  companyOverrides: {}, // { [companyId]: boolean }
  startDelayMinutes: 10,
  endDelayMinutes: 10,
  lastTickIso: null,
  lastTickStats: null,
  sentHistory: {}, // { [key: `${date}_${empId}_${type}`]: { timestamp, phone, name } }
  recentLogs: [] // Son 200 gönderim kaydı
};

// State yükle
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      workerState = { ...workerState, ...parsed };
      console.log(`[ShiftSmsWorker] Kalıcı durum dosyası yüklendi (${STATE_FILE}).`);
    }
  } catch (err) {
    console.warn('[ShiftSmsWorker] Durum dosyası okuma uyarısı:', err.message);
  }
}

// State kaydet
function saveState() {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Son 200 log ile sınırla
    if (workerState.recentLogs && workerState.recentLogs.length > 200) {
      workerState.recentLogs = workerState.recentLogs.slice(0, 200);
    }
    // Sent history'de 7 günden eski kayıtları temizle
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
    hour12: false
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
    weekday: 'short'
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

// ── In-Memory Cache (Quota & Egress Koruması - 15 Dakika TTL) ─────────────
let cachedEmployees = null;
let cachedEmployeesExpiresAt = 0;
let cachedShifts = null;
let cachedShiftsExpiresAt = 0;
let cachedAssigns = null;
let cachedAssignsExpiresAt = 0;
let backoffUntil = 0; // Hata veya kısıtlama durumunda geçici bekleme süresi

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

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
        Authorization: `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ operation: 'quick_login', email: AUTH_EMAIL, workerSecret: 'humanius-sms-worker-v1' })
    });
    if (loginRes.status === 402 || loginRes.status === 403) {
      console.warn('[ShiftSmsWorker] Supabase servisi kısıtlı (402/403). 5 dakika bekleme başlatılıyor.');
      backoffUntil = Date.now() + 5 * 60 * 1000;
      return null;
    }
    const loginData = await loginRes.json();
    if (!loginData.token_hash) throw new Error('Token hash alınamadı: ' + JSON.stringify(loginData));

    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ token_hash: loginData.token_hash, type: 'magiclink' })
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
        dest: formattedDest
      }
    ]
  };

  // 1. Doğrudan Verimor API çağrısı
  try {
    const res = await fetch('https://sms.verimor.com.tr/v2/send.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const responseText = await res.text();
    if (res.ok) {
      return { success: true, rawResponse: responseText };
    }
    // Eğer 403 veya IP kısıtlaması ise edge function fallback dene
    console.warn(`[ShiftSmsWorker] Doğrudan Verimor yanıtı (${res.status}): ${responseText}`);
  } catch (fetchErr) {
    console.warn('[ShiftSmsWorker] Doğrudan Verimor ağ hatası:', fetchErr.message);
  }

  // 2. Supabase Edge Function fallback (send-sms)
  try {
    const edgeRes = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });
    const edgeData = await edgeRes.json();
    if (edgeRes.ok && (edgeData.success || edgeData.data)) {
      return { success: true, rawResponse: edgeData };
    }
    return { success: false, error: edgeData.error || 'Edge function üzerinden SMS gönderilemedi' };
  } catch (edgeErr) {
    return { success: false, error: `SMS gönderim hatası: ${edgeErr.message}` };
  }
}

// ── Ana Vardiya Tarama Fonksiyonu ─────────────────────────────────────────
let isTicking = false;

async function checkAndSendShiftSms(options = {}) {
  const trTime = getTurkeyTime(options.targetDate);
  const { todayStr, trTimeStr, currentMinutes, isSaturday } = trTime;

  const stats = {
    timestamp: new Date().toISOString(),
    trTimeStr,
    checkedEmployees: 0,
    startSmsSent: 0,
    endSmsSent: 0,
    alreadySentCount: 0,
    errors: []
  };

  // Eğer kısıtlama veya hata nedeniyle bekleme modundaysa atla
  if (Date.now() < backoffUntil && !options.forceRun) {
    return { ...stats, message: 'Servis kota/hata koruması nedeniyle geçici beklemede.' };
  }

  // Eğer genel olarak kapatılmışsa çık
  if (workerState.enabled === false && !options.forceRun) {
    return { ...stats, message: 'SMS servisi genel ayarlardan duraklatılmıştır.' };
  }

  const token = await getSupabaseToken();
  const effectiveKey = SERVICE_ROLE_KEY || ANON_KEY;
  const authHeaders = {
    apikey: effectiveKey,
    Authorization: token ? `Bearer ${token}` : `Bearer ${effectiveKey}`
  };

  try {
    // 1. Çalışanları yükle (15 Dakika In-Memory Cache)
    let allEmployees = [];
    if (cachedEmployees && Date.now() < cachedEmployeesExpiresAt && !options.forceRun) {
      allEmployees = cachedEmployees;
    } else {
      // 1.1 Öncelik: Hafif PostgREST sorgusu (Sadece gerekli 7 kolon, minik egress)
      try {
        const pUrl = `${SUPABASE_URL}/rest/v1/employees?select=id,name,phone,mobile,company_id,status,company&status=neq.inactive`;
        const pRes = await fetch(pUrl, { headers: authHeaders });
        if (pRes.ok) {
          const pData = await pRes.json();
          if (Array.isArray(pData) && pData.length > 0) {
            allEmployees = pData;
          }
        }
      } catch (dbErr) {
        console.warn('[ShiftSmsWorker] PostgREST employees sorgusu uyarısı:', dbErr.message);
      }

      // 1.2 Yedek: PostgREST boş veya başarısız ise Edge Function
      if (allEmployees.length === 0) {
        const empRes = await fetch(`${SUPABASE_URL}/functions/v1/user-management`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: effectiveKey,
            Authorization: `Bearer ${effectiveKey}`
          },
          body: JSON.stringify({ operation: 'list_employees' })
        });
        if (empRes.status === 402 || empRes.status === 403) {
          console.warn('[ShiftSmsWorker] Supabase kota aşımı (402/403). Bekleme başlatıldı.');
          backoffUntil = Date.now() + 5 * 60 * 1000;
          return { ...stats, message: 'Supabase kota kısıtlaması nedeniyle beklemede.' };
        }
        const empData = await empRes.json();
        allEmployees = empData.employees || [];
      }

      if (allEmployees.length > 0) {
        cachedEmployees = allEmployees;
        cachedEmployeesExpiresAt = Date.now() + 15 * 60 * 1000;
      }
    }

    const activeEmployees = (allEmployees || []).filter(
      (e) => e.status !== 'inactive' && e.status !== 'onLeave'
    );
    stats.checkedEmployees = activeEmployees.length;

    // 2. Vardiyalar ve Atamalar (15 Dakika In-Memory Cache) + Bugünkü PDKS (Canlı)
    let allShifts = cachedShifts;
    let allAssigns = cachedAssigns;

    const needShifts = !allShifts || Date.now() >= cachedShiftsExpiresAt || options.forceRun;
    const needAssigns = !allAssigns || Date.now() >= cachedAssignsExpiresAt || options.forceRun;

    const fetchPromises = [];

    if (needShifts) {
      fetchPromises.push(
        fetch(`${SUPABASE_URL}/rest/v1/company_shifts?select=id,name,start_time,end_time,company_id,is_default,saturday_start_time,saturday_end_time`, { headers: authHeaders })
          .then(r => r.json())
          .catch(() => [])
      );
    } else {
      fetchPromises.push(Promise.resolve(allShifts));
    }

    if (needAssigns) {
      fetchPromises.push(
        fetch(`${SUPABASE_URL}/rest/v1/company_shift_assignments?select=employee_id,shift_id`, { headers: authHeaders })
          .then(r => r.json())
          .catch(() => [])
      );
    } else {
      fetchPromises.push(Promise.resolve(allAssigns));
    }

    // PDKS kayıtları canlı (sadece bugünün ve sadece gerekli 4 alan)
    fetchPromises.push(
      fetch(`${SUPABASE_URL}/rest/v1/pdks_vardiya_kayitlari?select=employee_id,giris_saati,cikis_saati,tarih&tarih=gte.${todayStr}`, { headers: authHeaders })
        .then(r => r.json())
        .catch(() => [])
    );

    const [shiftsRes, assignsRes, pdksRes] = await Promise.all(fetchPromises);

    if (needShifts && Array.isArray(shiftsRes) && shiftsRes.length > 0) {
      allShifts = shiftsRes;
      cachedShifts = shiftsRes;
      cachedShiftsExpiresAt = Date.now() + 15 * 60 * 1000;
    } else if (!allShifts) {
      allShifts = Array.isArray(shiftsRes) ? shiftsRes : [];
    }

    if (needAssigns && Array.isArray(assignsRes) && assignsRes.length > 0) {
      allAssigns = assignsRes;
      cachedAssigns = assignsRes;
      cachedAssignsExpiresAt = Date.now() + 15 * 60 * 1000;
    } else if (!allAssigns) {
      allAssigns = Array.isArray(assignsRes) ? assignsRes : [];
    }

    const todayPdks = Array.isArray(pdksRes) ? pdksRes : [];

    // Haritaları oluştur
    const shiftsByCompany = new Map();
    allShifts.forEach((s) => {
      const cid = s.company_id || 'default';
      if (!shiftsByCompany.has(cid)) shiftsByCompany.set(cid, []);
      shiftsByCompany.get(cid).push(s);
    });

    const assignsByEmp = new Map();
    allAssigns.forEach((a) => {
      if (a.employee_id && a.shift_id) {
        assignsByEmp.set(a.employee_id, a.shift_id);
      }
    });

    const todayPdksByEmp = new Map();
    todayPdks.forEach((p) => {
      const pDate = String(p.tarih).split('T')[0];
      if (pDate === todayStr && p.employee_id) {
        todayPdksByEmp.set(p.employee_id, p);
      }
    });

    // 3. Çalışanları tek tek analiz et
    for (const emp of activeEmployees) {
      const companyId = emp.company_id || 'default';

      // Firma açık mı? Eğer firma için açıkça false verilmemişse çalıştır
      const compSetting = workerState.companyOverrides[companyId];
      if (compSetting === false) {
        continue;
      }

      // Çalışanın vardiyasını bul
      const compShifts = shiftsByCompany.get(companyId) || shiftsByCompany.get('default') || allShifts;
      const defaultShift = compShifts.find((s) => s.is_default) || compShifts[0] || {
        name: 'Standart Vardiya',
        start_time: '08:30',
        end_time: '18:00'
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

      const startDelay = workerState.startDelayMinutes || 15;
      const endDelay = workerState.endDelayMinutes || 15;

      const startTriggerMinutes = startMinutes + startDelay;
      const endTriggerMinutes = endMinutes + endDelay;

      // PDKS kayıtları
      const todayRec = todayPdksByEmp.get(emp.id);
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
        name: shift.name || 'Vardiya',
        start_time: startTimeStr,
        end_time: endTimeStr
      };

      // Gece vardiyası desteği (örn: 22:00 - 06:00)
      const isNightShift = endMinutes < startMinutes;
      const isWithinShiftHours = isNightShift
        ? currentMinutes >= startTriggerMinutes || currentMinutes < endMinutes
        : currentMinutes >= startTriggerMinutes && currentMinutes < endMinutes;

      // ── DURUM 1: VARDIYA BAŞLATMA HATIRLATMASI ───────────────────────────
      // Örn: 08:30 vardiyası için 08:40 ve sonrasında, vardiya bitmeden önce, giriş yoksa
      if (isWithinShiftHours && !hasGiris) {
        const sentKey = `${todayStr}_${emp.id}_start_reminder`;
        if (workerState.sentHistory[sentKey]) {
          stats.alreadySentCount++;
        } else {
          const targetPhone = emp.phone || emp.mobile;
          if (!targetPhone) {
            stats.errors.push({ employee: emp.name, error: 'Telefon numarası eksik' });
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
            phone: targetPhone,
            type: 'start_reminder',
            shift_name: shiftInfo.name,
            shift_time: shiftText,
            message: smsMessage,
            status: sendRes.success ? 'success' : 'failed',
            error_message: sendRes.error,
            timestamp: new Date().toISOString(),
            date: todayStr
          };

          workerState.recentLogs.unshift(logEntry);

          if (sendRes.success) {
            stats.startSmsSent++;
            workerState.sentHistory[sentKey] = {
              timestamp: new Date().toISOString(),
              phone: targetPhone,
              name: emp.name
            };
            console.log(`[ShiftSmsWorker] 🟢 Vardiya Başlatma SMS'i Gönderildi: ${emp.name} (${targetPhone})`);
          } else {
            stats.errors.push({ employee: emp.name, error: sendRes.error });
            console.warn(`[ShiftSmsWorker] 🔴 SMS Gönderilemedi (${emp.name}): ${sendRes.error}`);
          }
        }
      }

      // ── DURUM 2: VARDIYA BİTİRME HATIRLATMASI ────────────────────────────
      // Örn: 18:00 vardiyası için 18:10 ve sonrasında (+180 dk içinde), giriş var ama çıkış yoksa
      if (
        currentMinutes >= endTriggerMinutes &&
        currentMinutes <= endTriggerMinutes + 180 &&
        hasGiris &&
        !hasCikis
      ) {
        const sentKey = `${todayStr}_${emp.id}_end_reminder`;
        if (workerState.sentHistory[sentKey]) {
          stats.alreadySentCount++;
        } else {
          const targetPhone = emp.phone || emp.mobile;
          if (!targetPhone) {
            stats.errors.push({ employee: emp.name, error: 'Telefon numarası eksik' });
            continue;
          }

          const shiftText = `${shiftInfo.start_time} - ${shiftInfo.end_time}`;
          const smsMessage =
            `Sayın ${emp.name},\n` +
            `Bugün ${shiftText} vardiyanız tamamlanmıştır ancak henüz vardiyanızı bitirmediğiniz tespit edilmiştir. Lütfen sisteme giriş yaparak vardiyanızı bitiriniz.\n` +
            `${LOGIN_URL}`;

          const sendRes = await sendVerimorSms(targetPhone, smsMessage);

          const logEntry = {
            id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            employee_id: emp.id,
            employee_name: emp.name,
            phone: targetPhone,
            type: 'end_reminder',
            shift_name: shiftInfo.name,
            shift_time: shiftText,
            message: smsMessage,
            status: sendRes.success ? 'success' : 'failed',
            error_message: sendRes.error,
            timestamp: new Date().toISOString(),
            date: todayStr
          };

          workerState.recentLogs.unshift(logEntry);

          if (sendRes.success) {
            stats.endSmsSent++;
            workerState.sentHistory[sentKey] = {
              timestamp: new Date().toISOString(),
              phone: emp.phone,
              name: emp.name
            };
            console.log(`[ShiftSmsWorker] 🟢 Vardiya Bitirme SMS'i Gönderildi: ${emp.name} (${emp.phone})`);
          } else {
            stats.errors.push({ employee: emp.name, error: sendRes.error });
            console.warn(`[ShiftSmsWorker] 🔴 SMS Gönderilemedi (${emp.name}): ${sendRes.error}`);
          }
        }
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

// ── Periyodik Zamanlayıcı (Her 60 Saniyede Bir) ───────────────────────────
async function tick() {
  if (isTicking) return;
  try {
    isTicking = true;
    const res = await checkAndSendShiftSms();
    if (res.startSmsSent > 0 || res.endSmsSent > 0 || res.errors.length > 0) {
      console.log(`[ShiftSmsWorker ${res.trTimeStr}] Tarama: ${res.checkedEmployees} personel, Başlatma SMS: ${res.startSmsSent}, Bitirme SMS: ${res.endSmsSent}, Önceden Gönderilmiş: ${res.alreadySentCount}, Hata: ${res.errors.length}`);
    }
  } catch (err) {
    console.warn('[ShiftSmsWorker] Periyodik tick hatası:', err.message);
  } finally {
    isTicking = false;
  }
}

// ── HTTP API Server (Nginx / Frontend Kontrolü İçin) ───────────────────────
const server = http.createServer(async (req, res) => {
  // CORS Headers
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

  // JSON helper
  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  // Body parser helper
  const getBody = () => new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
    });
  });

  // GET /status or /
  if (pathname === '/' || pathname === '/status') {
    const tr = getTurkeyTime();
    return sendJson(200, {
      status: 'online',
      service: 'Humanius 24/7 Shift SMS Background Worker',
      turkeyTime: tr,
      workerEnabled: workerState.enabled,
      companyOverrides: workerState.companyOverrides,
      lastTickIso: workerState.lastTickIso,
      lastTickStats: workerState.lastTickStats,
      totalRecentLogs: workerState.recentLogs ? workerState.recentLogs.length : 0
    });
  }

  // GET /logs
  if (pathname === '/logs') {
    const dateFilter = url.searchParams.get('date');
    let logs = workerState.recentLogs || [];
    if (dateFilter) {
      logs = logs.filter(l => l.date === dateFilter);
    }
    return sendJson(200, { logs: logs.slice(0, 100) });
  }

  // POST /trigger-check
  if (pathname === '/trigger-check' && req.method === 'POST') {
    console.log('[ShiftSmsWorker] Manuel tetikleme alındı.');
    const result = await checkAndSendShiftSms({ forceRun: true });
    return sendJson(200, { success: true, result });
  }

  // POST /toggle-service
  if (pathname === '/toggle-service' && req.method === 'POST') {
    const body = await getBody();
    if (typeof body.enabled === 'boolean') {
      workerState.enabled = body.enabled;
      saveState();
      console.log(`[ShiftSmsWorker] Genel servis durumu güncellendi: ${body.enabled}`);
      return sendJson(200, { success: true, enabled: workerState.enabled });
    }
    return sendJson(400, { error: 'enabled boolean alani zorunludur' });
  }

  // POST /set-company-permission
  if (pathname === '/set-company-permission' && req.method === 'POST') {
    const body = await getBody();
    const { companyId, enabled } = body;
    if (!companyId || typeof enabled !== 'boolean') {
      return sendJson(400, { error: 'companyId ve enabled zorunludur' });
    }
    workerState.companyOverrides[companyId] = enabled;
    saveState();
    console.log(`[ShiftSmsWorker] Firma izni güncellendi (${companyId}): ${enabled}`);
    return sendJson(200, { success: true, companyId, enabled });
  }

  sendJson(404, { error: 'Endpoint bulunamadı' });
});

// ── Başlatma ──────────────────────────────────────────────────────────────
loadState();

// Server'ı başlat
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================================`);
  console.log(`🚀 Humanius 24/7 Shift SMS Background Worker Aktif!`);
  console.log(`Port: ${PORT} | Zamanlayıcı Aralığı: 60 saniye`);
  console.log(`Türkiye Saati: ${JSON.stringify(getTurkeyTime())}`);
  console.log(`=============================================================`);

  // İlk kontrolü 5 saniye sonra başlat
  setTimeout(tick, 5000);

  // Her 60 saniyede bir düzenli çalıştır
  setInterval(tick, 60000);
});
