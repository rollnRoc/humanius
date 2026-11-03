import { supabase } from '../lib/supabase';

export type MesajKategori =
  | 'mazeret'
  | 'izin_vardiya'
  | 'zimmet_ekipman'
  | 'ozluk_evrak'
  | 'genel';

export interface MesajKategoriInfo {
  id: MesajKategori;
  label: string;
  description: string;
  badgeColor: string;
}

export const MESAJ_KATEGORILERI: MesajKategoriInfo[] = [
  {
    id: 'mazeret',
    label: 'Mazeret / Açıklama Bildirimi',
    description: 'Geç kalma, erken çıkış, devamsızlık veya günlük durum açıklaması',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    id: 'izin_vardiya',
    label: 'İzin / Vardiya Bilgilendirmesi',
    description: 'İzin talebi detayı, vardiya değişimi veya çalışma saati notu',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  {
    id: 'zimmet_ekipman',
    label: 'Zimmet / Ekipman / Araç Bildirimi',
    description: 'Zimmetli cihaz, araç, ekipman arızası veya teslim açıklaması',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  {
    id: 'ozluk_evrak',
    label: 'Özlük / Evrak / İK Talebi',
    description: 'Belge, bordro, rapor veya kişisel bilgi güncelleme bildirimi',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    id: 'genel',
    label: 'Genel Bilgi / Öneri / Talep',
    description: 'Yönetime iletilmek istenen genel açıklama, öneri veya bilgilendirme',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
  },
];

export interface MessageRecipient {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  role: 'manager' | 'hr' | 'admin';
  roleLabel: string;
  department: string;
  position: string;
  isOwnDepartmentManager: boolean;
}

export interface YoneticiMesaji {
  id: string;
  companyId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  senderDepartment: string;
  senderPosition: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: 'manager' | 'hr' | 'admin';
  recipientRoleLabel: string;
  recipientDepartment: string;
  category: MesajKategori;
  categoryLabel: string;
  subject: string;
  message: string;
  priority: 'normal' | 'yuksek' | 'acil';
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  deletedBySender?: boolean;
  deletedByRecipient?: boolean;
}

const STORAGE_KEY = 'yonetici_mesajlari_v1';

const SUPERADMIN_EMAILS = new Set([
  'bhvtest@test.com',
  'recep.akca@bigsafer.com',
  'muhammed.gur@humanius.net',
  'superadmin@humanius.net',
  'superadmin@humanius.local',
]);

function normEmail(val?: string | null): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace('humanius.com.tr', 'humanius.net')
    .replace('humanius.com', 'humanius.net');
}

function normText(val?: string | null): string {
  return String(val || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ');
}

function getRoleLabel(role: 'manager' | 'hr' | 'admin'): string {
  if (role === 'admin') return 'Şirket Yöneticisi';
  if (role === 'hr') return 'İK Yöneticisi';
  return 'Birim Amiri';
}

class MessageService {
  /**
   * Şirket içindeki mesaj gönderilebilecek yöneticileri (Birim Amiri, İK Yöneticisi, Şirket Yöneticisi) doğrudan veritabanından getirir.
   */
  public async getCompanyRecipients(params: {
    companyId: string;
    senderId?: string;
    senderEmail?: string;
    senderDepartment?: string;
  }): Promise<MessageRecipient[]> {
    const { companyId, senderId, senderEmail, senderDepartment } = params;
    if (!companyId || companyId === 'default') return [];

    let profiles: any[] = [];
    let employees: any[] = [];

    try {
      const [usersRes, empsRes] = await Promise.all([
        supabase.functions.invoke('user-management', {
          body: { operation: 'list_users', companyId },
        }),
        supabase.functions.invoke('user-management', {
          body: { operation: 'list_employees', companyId },
        }),
      ]);

      if (!usersRes.error && Array.isArray(usersRes.data?.users)) {
        profiles = usersRes.data.users;
      }
      if (!empsRes.error && Array.isArray(empsRes.data?.employees)) {
        employees = empsRes.data.employees;
      }
    } catch (err) {
      console.warn('[MessageService] Edge list_users/list_employees fallback:', err);
    }

    if (profiles.length === 0) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, company_id')
          .eq('company_id', companyId);
        if (data) profiles = data;
      } catch {}
    }

    if (employees.length === 0) {
      try {
        const { data } = await supabase
          .from('employees')
          .select('id, name, email, department, position, role, level, company_id')
          .eq('company_id', companyId);
        if (data) employees = data;
      } catch {}
    }

    const cleanSenderEmail = normEmail(senderEmail);
    const senderEmp = employees.find(
      (e) =>
        (senderId && e.id === senderId) ||
        (cleanSenderEmail && normEmail(e.email) === cleanSenderEmail)
    );
    const cleanSenderDept = normText(senderDepartment || senderEmp?.department);

    const recipientsMap = new Map<string, MessageRecipient>();

    for (const prof of profiles) {
      const role = String(prof.role || '').toLowerCase();
      if (role !== 'manager' && role !== 'hr' && role !== 'admin') continue;

      const pEmail = normEmail(prof.email);
      if (SUPERADMIN_EMAILS.has(pEmail)) continue;
      if (normText(prof.full_name) === 'zzzzz' || pEmail.startsWith('zzzzz@')) continue;

      if (senderId && prof.id === senderId) continue;
      if (cleanSenderEmail && pEmail && pEmail === cleanSenderEmail) continue;

      const matchedEmp = employees.find(
        (e) =>
          e.id === prof.id ||
          (pEmail && normEmail(e.email) === pEmail) ||
          (prof.full_name && normText(e.name) === normText(prof.full_name))
      );

      const name = String(matchedEmp?.name || prof.full_name || prof.email || 'Yönetici').trim();
      const department = String(matchedEmp?.department || '').trim();
      const position = String(matchedEmp?.position || '').trim();
      const typedRole = role as 'manager' | 'hr' | 'admin';

      const isOwnDepartmentManager =
        typedRole === 'manager' &&
        Boolean(cleanSenderDept) &&
        Boolean(department) &&
        normText(department) === cleanSenderDept;

      const key = pEmail || prof.id;
      recipientsMap.set(key, {
        id: prof.id,
        employeeId: matchedEmp?.id,
        name,
        email: pEmail || String(prof.email || '').trim().toLowerCase(),
        role: typedRole,
        roleLabel: getRoleLabel(typedRole),
        department,
        position,
        isOwnDepartmentManager,
      });
    }

    for (const emp of employees) {
      const empRole = String(emp.role || '').toLowerCase();
      const isManagerOrAdmin =
        empRole === 'manager' ||
        empRole === 'hr' ||
        empRole === 'admin' ||
        String(emp.level || '') === 'Manager';

      if (!isManagerOrAdmin) continue;

      const eEmail = normEmail(emp.email);
      if (SUPERADMIN_EMAILS.has(eEmail)) continue;
      if (normText(emp.name) === 'zzzzz' || eEmail.startsWith('zzzzz@')) continue;

      if (senderId && emp.id === senderId) continue;
      if (cleanSenderEmail && eEmail && eEmail === cleanSenderEmail) continue;

      const key = eEmail || emp.id;
      if (recipientsMap.has(key)) continue;

      const typedRole: 'manager' | 'hr' | 'admin' =
        empRole === 'admin' ? 'admin' : empRole === 'hr' ? 'hr' : 'manager';
      const department = String(emp.department || '').trim();
      const position = String(emp.position || '').trim();

      const isOwnDepartmentManager =
        typedRole === 'manager' &&
        Boolean(cleanSenderDept) &&
        Boolean(department) &&
        normText(department) === cleanSenderDept;

      recipientsMap.set(key, {
        id: emp.id,
        employeeId: emp.id,
        name: String(emp.name || 'Yönetici').trim(),
        email: eEmail,
        role: typedRole,
        roleLabel: getRoleLabel(typedRole),
        department,
        position,
        isOwnDepartmentManager,
      });
    }

    const list = Array.from(recipientsMap.values());

    list.sort((a, b) => {
      if (a.isOwnDepartmentManager && !b.isOwnDepartmentManager) return -1;
      if (!a.isOwnDepartmentManager && b.isOwnDepartmentManager) return 1;

      const roleOrder = { admin: 1, hr: 2, manager: 3 };
      if (roleOrder[a.role] !== roleOrder[b.role]) {
        return roleOrder[a.role] - roleOrder[b.role];
      }
      return a.name.localeCompare(b.name, 'tr');
    });

    return list;
  }

  /**
   * Şirketin mesaj kayıtlarını hiçbir yerel önbellek kullanmadan doğrudan veritabanından (PostgreSQL) çeker.
   */
  private async getAllCompanyMessagesFromDB(companyId: string): Promise<YoneticiMesaji[]> {
    if (!companyId || companyId === 'default') return [];

    // 1. Doğrudan user-management edge function (service_role) üzerinden veritabanından oku
    try {
      const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('user-management', {
        body: {
          operation: 'get_system_parameter',
          companyId,
          kategori: 'sistem_kurallari',
          ad: STORAGE_KEY,
        },
      });
      if (!edgeErr && edgeRes?.deger) {
        const parsed =
          typeof edgeRes.deger === 'string' ? JSON.parse(edgeRes.deger) : edgeRes.deger;
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    // 2. Fallback: doğrudan sistem_parametreleri tablosundan oku
    try {
      const { data, error } = await supabase
        .from('sistem_parametreleri')
        .select('deger')
        .eq('company_id', companyId)
        .eq('kategori', 'sistem_kurallari')
        .eq('ad', STORAGE_KEY)
        .maybeSingle();

      if (!error && data?.deger) {
        const parsed = typeof data.deger === 'string' ? JSON.parse(data.deger) : data.deger;
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    return [];
  }

  /**
   * Şirketin mesaj kayıtlarını doğrudan veritabanına (PostgreSQL) yazar.
   */
  private async saveAllCompanyMessagesToDB(
    companyId: string,
    messages: YoneticiMesaji[]
  ): Promise<boolean> {
    if (!companyId || companyId === 'default') return false;
    const jsonString = JSON.stringify(messages);

    // 1. Doğrudan user-management edge function (service_role) ile veritabanına yaz (tüm roller için RLS engeli olmadan)
    try {
      const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('user-management', {
        body: {
          operation: 'save_system_parameter',
          companyId,
          kategori: 'sistem_kurallari',
          ad: STORAGE_KEY,
          deger: jsonString,
          aciklama: 'Personel Yönetici Açıklamalı Mesajları',
        },
      });
      if (!edgeErr && edgeRes?.success) {
        window.dispatchEvent(new CustomEvent('humanius_messages_updated'));
        return true;
      }
    } catch {}

    // 2. Fallback: doğrudan tablo upsert
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from('sistem_parametreleri').upsert(
        {
          company_id: companyId,
          kategori: 'sistem_kurallari',
          ad: STORAGE_KEY,
          deger: jsonString,
          aciklama: 'Personel Yönetici Açıklamalı Mesajları',
          zorunlu: false,
          degistirilebilir: true,
          son_guncelleme: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'company_id,kategori,ad' }
      );
      if (!error) {
        window.dispatchEvent(new CustomEvent('humanius_messages_updated'));
        return true;
      }
    } catch {}

    return false;
  }

  /**
   * Yalnızca oturum açmış yöneticiye/kullanıcıya gelen ve silinmemiş mesajları veritabanından döndürür.
   */
  public async getInboxMessages(params: {
    companyId: string;
    userId?: string;
    employeeId?: string;
    userEmail?: string;
    userName?: string;
  }): Promise<YoneticiMesaji[]> {
    const { companyId, userId, employeeId, userEmail, userName } = params;
    const all = await this.getAllCompanyMessagesFromDB(companyId);
    const cleanEmail = normEmail(userEmail);
    const cleanName = normText(userName);

    return all
      .filter((msg) => {
        if (msg.deletedByRecipient) return false;
        if (userId && msg.recipientId === userId) return true;
        if (employeeId && msg.recipientId === employeeId) return true;
        if (cleanEmail && msg.recipientEmail && normEmail(msg.recipientEmail) === cleanEmail) {
          return true;
        }
        if (
          !msg.recipientEmail &&
          cleanName &&
          msg.recipientName &&
          normText(msg.recipientName) === cleanName
        ) {
          return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Kullanıcının kendi gönderdiği ve silmediği mesajları veritabanından döndürür.
   */
  public async getSentMessages(params: {
    companyId: string;
    userId?: string;
    employeeId?: string;
    userEmail?: string;
    userName?: string;
  }): Promise<YoneticiMesaji[]> {
    const { companyId, userId, employeeId, userEmail, userName } = params;
    const all = await this.getAllCompanyMessagesFromDB(companyId);
    const cleanEmail = normEmail(userEmail);
    const cleanName = normText(userName);

    return all
      .filter((msg) => {
        if (msg.deletedBySender) return false;
        if (userId && msg.senderId === userId) return true;
        if (employeeId && msg.senderId === employeeId) return true;
        if (cleanEmail && msg.senderEmail && normEmail(msg.senderEmail) === cleanEmail) {
          return true;
        }
        if (
          !msg.senderEmail &&
          cleanName &&
          msg.senderName &&
          normText(msg.senderName) === cleanName
        ) {
          return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Seçilen tek bir yöneticiye açıklamalı mesaj iletir (doğrudan veritabanına kaydeder).
   */
  public async sendMessage(params: {
    companyId: string;
    senderId: string;
    senderEmail: string;
    senderName: string;
    senderDepartment?: string;
    senderPosition?: string;
    recipient: MessageRecipient;
    category: MesajKategori;
    subject: string;
    message: string;
    priority?: 'normal' | 'yuksek' | 'acil';
  }): Promise<{ success: boolean; record?: YoneticiMesaji; error?: string }> {
    const {
      companyId,
      senderId,
      senderEmail,
      senderName,
      senderDepartment,
      senderPosition,
      recipient,
      category,
      subject,
      message,
      priority = 'normal',
    } = params;

    if (!companyId || companyId === 'default') {
      return { success: false, error: 'Şirket bilgisi bulunamadı.' };
    }
    if (!recipient?.id && !recipient?.email) {
      return { success: false, error: 'Lütfen mesajın iletileceği yöneticiyi seçin.' };
    }
    if (!subject.trim() || !message.trim()) {
      return { success: false, error: 'Lütfen konu başlığı ve açıklama alanlarını doldurun.' };
    }

    const catInfo =
      MESAJ_KATEGORILERI.find((c) => c.id === category) || MESAJ_KATEGORILERI[0];
    const nowIso = new Date().toISOString();

    let resolvedDept = String(senderDepartment || '').trim();
    let resolvedPos = String(senderPosition || '').trim();

    if (!resolvedDept || !resolvedPos) {
      try {
        const cleanSenderEmail = normEmail(senderEmail);
        const { data: emps } = await supabase
          .from('employees')
          .select('id, email, department, position')
          .eq('company_id', companyId);
        const matched = (emps || []).find(
          (e: any) =>
            (senderId && e.id === senderId) ||
            (cleanSenderEmail && normEmail(e.email) === cleanSenderEmail)
        );
        if (matched) {
          if (!resolvedDept && matched.department) resolvedDept = String(matched.department).trim();
          if (!resolvedPos && matched.position) resolvedPos = String(matched.position).trim();
        }
      } catch {}
    }

    const newMsg: YoneticiMesaji = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      companyId,
      senderId,
      senderEmail: normEmail(senderEmail),
      senderName: senderName.trim(),
      senderDepartment: resolvedDept,
      senderPosition: resolvedPos,
      recipientId: recipient.id,
      recipientEmail: normEmail(recipient.email),
      recipientName: recipient.name.trim(),
      recipientRole: recipient.role,
      recipientRoleLabel: recipient.roleLabel,
      recipientDepartment: recipient.department,
      category,
      categoryLabel: catInfo.label,
      subject: subject.trim(),
      message: message.trim(),
      priority,
      isRead: false,
      readAt: null,
      createdAt: nowIso,
    };

    const existing = await this.getAllCompanyMessagesFromDB(companyId);
    const updated = [newMsg, ...existing].slice(0, 500);

    const saved = await this.saveAllCompanyMessagesToDB(companyId, updated);

    if (!saved) {
      return {
        success: false,
        error: 'Mesaj kaydedilirken bir bağlantı hatası oluştu. Lütfen tekrar deneyin.',
      };
    }

    return { success: true, record: newMsg };
  }

  /**
   * Gönderilen mesajı GERİ ALIR (Sadece yönetici tarafından henüz OKUNMADIYSA).
   * Veritabanından güncel durumu kontrol eder; okunduysa geri almayı reddeder.
   * Okunmadıysa mesajı veritabanından tamamen siler (alıcı yöneticinin ekranından da kalkar).
   */
  public async recallMessage(
    companyId: string,
    messageId: string
  ): Promise<{ success: boolean; alreadyRead?: boolean; error?: string }> {
    if (!companyId || !messageId) {
      return { success: false, error: 'Geçersiz mesaj bilgisi.' };
    }

    const all = await this.getAllCompanyMessagesFromDB(companyId);
    const target = all.find((m) => m.id === messageId);

    if (!target) {
      return { success: true };
    }

    if (target.isRead) {
      return {
        success: false,
        alreadyRead: true,
        error: 'Bu mesaj yönetici tarafından okunduğu için artık geri alınamaz.',
      };
    }

    const updated = all.filter((m) => m.id !== messageId);
    const saved = await this.saveAllCompanyMessagesToDB(companyId, updated);

    if (!saved) {
      return { success: false, error: 'Mesaj geri alınırken veritabanı hatası oluştu.' };
    }

    return { success: true };
  }

  /**
   * Gönderen kişinin "Gönderdiğim Mesajlar" listesinden mesajı silmesini sağlar.
   */
  public async deleteSentMessage(companyId: string, messageId: string): Promise<boolean> {
    if (!companyId || !messageId) return false;
    const all = await this.getAllCompanyMessagesFromDB(companyId);

    const updated = all
      .map((msg) => {
        if (msg.id === messageId) {
          return { ...msg, deletedBySender: true };
        }
        return msg;
      })
      .filter((msg) => !(msg.deletedBySender && msg.deletedByRecipient));

    return await this.saveAllCompanyMessagesToDB(companyId, updated);
  }

  /**
   * Alıcı yöneticinin "Bana Gelen Mesajlar" listesinden mesajı silmesini sağlar.
   */
  public async deleteInboxMessage(companyId: string, messageId: string): Promise<boolean> {
    if (!companyId || !messageId) return false;
    const all = await this.getAllCompanyMessagesFromDB(companyId);

    const updated = all
      .map((msg) => {
        if (msg.id === messageId) {
          return { ...msg, deletedByRecipient: true };
        }
        return msg;
      })
      .filter((msg) => !(msg.deletedBySender && msg.deletedByRecipient));

    return await this.saveAllCompanyMessagesToDB(companyId, updated);
  }

  /**
   * Alıcı yöneticinin mesajı okundu olarak işaretlemesini sağlar.
   */
  public async markAsRead(companyId: string, messageId: string): Promise<boolean> {
    if (!companyId || !messageId) return false;
    const all = await this.getAllCompanyMessagesFromDB(companyId);
    const nowIso = new Date().toISOString();
    let changed = false;

    const updated = all.map((msg) => {
      if (msg.id === messageId && !msg.isRead) {
        changed = true;
        return {
          ...msg,
          isRead: true,
          readAt: nowIso,
        };
      }
      return msg;
    });

    if (!changed) return true;
    return await this.saveAllCompanyMessagesToDB(companyId, updated);
  }

  /**
   * Alıcı yöneticinin kendisine gelen tüm okunmamış mesajları okundu olarak işaretlemesini sağlar.
   */
  public async markAllInboxAsRead(params: {
    companyId: string;
    userId?: string;
    employeeId?: string;
    userEmail?: string;
    userName?: string;
  }): Promise<boolean> {
    const { companyId, userId, employeeId, userEmail, userName } = params;
    if (!companyId) return false;

    const all = await this.getAllCompanyMessagesFromDB(companyId);
    const cleanEmail = normEmail(userEmail);
    const cleanName = normText(userName);
    const nowIso = new Date().toISOString();
    let changed = false;

    const updated = all.map((msg) => {
      if (msg.isRead || msg.deletedByRecipient) return msg;

      const isMine =
        (userId && msg.recipientId === userId) ||
        (employeeId && msg.recipientId === employeeId) ||
        (cleanEmail && msg.recipientEmail && normEmail(msg.recipientEmail) === cleanEmail) ||
        (!msg.recipientEmail &&
          cleanName &&
          msg.recipientName &&
          normText(msg.recipientName) === cleanName);

      if (isMine) {
        changed = true;
        return {
          ...msg,
          isRead: true,
          readAt: nowIso,
        };
      }
      return msg;
    });

    if (!changed) return true;
    return await this.saveAllCompanyMessagesToDB(companyId, updated);
  }
}

export const messageService = new MessageService();
