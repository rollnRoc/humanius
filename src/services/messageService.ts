import { supabase } from '../lib/supabase';
import { systemDataService } from './systemDataService';

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
   * Şirket içindeki mesaj gönderilebilecek yöneticileri (Birim Amiri, İK Yöneticisi, Şirket Yöneticisi) getirir.
   * Süper adminleri ve göndericinin kendisini hariç tutar.
   * Personelin kendi departmanındaki Birim Amirini listenin en üstünde önerir.
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

    // 1. Edge function ile tam şirket kullanıcı ve personel listesini al (RLS kısıtlamasına takılmadan)
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

    // 2. Fallback: doğrudan tablo sorgusu
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

    // Profiles tablosundaki manager, hr, admin kullanıcılarını eşleştir
    for (const prof of profiles) {
      const role = String(prof.role || '').toLowerCase();
      if (role !== 'manager' && role !== 'hr' && role !== 'admin') continue;

      const pEmail = normEmail(prof.email);
      if (SUPERADMIN_EMAILS.has(pEmail)) continue;
      if (normText(prof.full_name) === 'zzzzz' || pEmail.startsWith('zzzzz@')) continue;

      // Göndericinin kendisini hariç tut
      if (senderId && prof.id === senderId) continue;
      if (cleanSenderEmail && pEmail && pEmail === cleanSenderEmail) continue;

      // Eşleşen personel kaydını bul (departman ve pozisyon bilgisi için)
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

    // Employees tablosunda olup profiles tablosunda henüz yer almayan yönetici/birim amirlerini de kontrol et
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

    // Sıralama:
    // 1. Personelin kendi departmanının Birim Amiri
    // 2. Şirket Yöneticisi (admin) ve İK Yöneticisi (hr)
    // 3. Diğer departmanların Birim Amirleri
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
   * Şirketin tüm mesaj havuzunu getirir (iç kullanım - filtreleme getInboxMessages ve getSentMessages içinde yapılır).
   */
  private async getAllCompanyMessages(companyId: string): Promise<YoneticiMesaji[]> {
    if (!companyId || companyId === 'default') return [];
    const data = await systemDataService.getCompanyData<YoneticiMesaji[]>(
      companyId,
      STORAGE_KEY,
      []
    );
    return Array.isArray(data) ? data : [];
  }

  /**
   * Yalnızca oturum açmış yöneticiye/kullanıcıya gelen mesajları döndürür.
   * KURAL: Yöneticiler sadece KENDİLERİNE gönderilen mesajları görebilir.
   */
  public async getInboxMessages(params: {
    companyId: string;
    userId?: string;
    employeeId?: string;
    userEmail?: string;
    userName?: string;
  }): Promise<YoneticiMesaji[]> {
    const { companyId, userId, employeeId, userEmail, userName } = params;
    const all = await this.getAllCompanyMessages(companyId);
    const cleanEmail = normEmail(userEmail);
    const cleanName = normText(userName);

    return all
      .filter((msg) => {
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
   * Kullanıcının kendi gönderdiği mesajları döndürür.
   */
  public async getSentMessages(params: {
    companyId: string;
    userId?: string;
    employeeId?: string;
    userEmail?: string;
    userName?: string;
  }): Promise<YoneticiMesaji[]> {
    const { companyId, userId, employeeId, userEmail, userName } = params;
    const all = await this.getAllCompanyMessages(companyId);
    const cleanEmail = normEmail(userEmail);
    const cleanName = normText(userName);

    return all
      .filter((msg) => {
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
   * Seçilen tek bir yöneticiye açıklamalı mesaj iletir.
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

    const existing = await this.getAllCompanyMessages(companyId);
    const updated = [newMsg, ...existing].slice(0, 500); // Son 500 mesajı sakla

    const saved = await systemDataService.saveCompanyData(
      companyId,
      STORAGE_KEY,
      updated,
      'Personel Yönetici Açıklamalı Mesajları'
    );

    if (!saved) {
      return {
        success: false,
        error: 'Mesaj kaydedilirken bir bağlantı hatası oluştu. Lütfen tekrar deneyin.',
      };
    }

    // Best-effort: bildirimler tablosuna da sadece ilgili alıcı user_id ile ekle
    try {
      await supabase.from('bildirimler').insert({
        company_id: companyId,
        user_id: recipient.id,
        baslik: `[${catInfo.label}] ${subject.trim()}`,
        mesaj: `${senderName}: ${message.trim()}`,
        tur: 'bilgi',
        oncelik: priority,
        okundu_mu: false,
        metadata: {
          kind: 'personel_mesaji',
          message_id: newMsg.id,
          sender_id: senderId,
          sender_name: senderName,
          sender_department: senderDepartment || '',
          recipient_id: recipient.id,
          recipient_email: recipient.email,
          category,
        },
      });
    } catch {}

    window.dispatchEvent(new CustomEvent('humanius_messages_updated'));
    return { success: true, record: newMsg };
  }

  /**
   * Alıcı yöneticinin mesajı okundu olarak işaretlemesini sağlar.
   */
  public async markAsRead(companyId: string, messageId: string): Promise<boolean> {
    if (!companyId || !messageId) return false;
    const all = await this.getAllCompanyMessages(companyId);
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

    const saved = await systemDataService.saveCompanyData(
      companyId,
      STORAGE_KEY,
      updated,
      'Personel Yönetici Açıklamalı Mesajları'
    );

    if (saved) {
      window.dispatchEvent(new CustomEvent('humanius_messages_updated'));
    }
    return saved;
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

    const all = await this.getAllCompanyMessages(companyId);
    const cleanEmail = normEmail(userEmail);
    const cleanName = normText(userName);
    const nowIso = new Date().toISOString();
    let changed = false;

    const updated = all.map((msg) => {
      if (msg.isRead) return msg;

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

    const saved = await systemDataService.saveCompanyData(
      companyId,
      STORAGE_KEY,
      updated,
      'Personel Yönetici Açıklamalı Mesajları'
    );

    if (saved) {
      window.dispatchEvent(new CustomEvent('humanius_messages_updated'));
    }
    return saved;
  }
}

export const messageService = new MessageService();
