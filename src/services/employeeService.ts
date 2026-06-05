import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

// Public view satırı (maaş ve hassas alanlar olmadan). Tam tip oluşturmamak için
// Employee'den Partial türü kullanıyoruz; üzerinde dönen alanlar zaten view tanımıyla sınırlı.
type EmployeePublic = Omit<
  Employee,
  | 'salary'
  | 'tc_no'
  | 'phone'
  | 'address'
  | 'medeni_durum'
  | 'cocuk_sayisi'
  | 'engelli_durumu'
  | 'approval_passcode'
  | 'approval_signature'
>;

// Hangi rollerin ham tabloyu (maaş dahil) görmesine izin var?
const FULL_ACCESS_ROLES = new Set(['superadmin', 'admin', 'hr']);

/**
 * Giriş yapan kullanıcının rolünü profiles tablosundan çeker.
 * Cache yok — her çağrıda RLS doğru filtrelesin diye taze okuyoruz.
 * Hata durumunda 'user' döndürür (en kısıtlı varsayım = güvenli varsayılan).
 */
async function getCurrentRole(): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 'user';
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();
  return data?.role ?? 'user';
}

/**
 * Role göre hangi kaynağı sorgulayalım?
 *  - admin/hr/superadmin → 'employees' (ham tablo, maaş dahil)
 *  - diğerleri          → 'employees_public' (maaşsız view)
 */
async function pickSource(): Promise<'employees' | 'employees_public'> {
  const role = await getCurrentRole();
  return FULL_ACCESS_ROLES.has(role) ? 'employees' : 'employees_public';
}

export const employeeService = {
  /**
   * Tüm personeli getir. Rol bazlı yönlendirme:
   *  - HR/admin/superadmin maaş dahil tam veriyi alır.
   *  - Manager/employee/user maaşsız public view'i alır.
   */
  async getAll(companyId: string): Promise<Employee[] | EmployeePublic[]> {
    const source = await pickSource();
    const { data, error } = await supabase
      .from(source)
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Employee[] | EmployeePublic[];
  },

  /**
   * Tek bir personeli getir. Yine rol bazlı kaynak.
   * Manager personel detayını görür ama maaş alanları null/undefined olur.
   */
  async getById(id: string): Promise<Employee | EmployeePublic | null> {
    const source = await pickSource();
    const { data, error } = await supabase
      .from(source)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Employee | EmployeePublic | null;
  },

  /**
   * Personel oluşturma — daima ham employees tablosuna. Backend RLS sadece
   * admin/hr/manager/superadmin'e INSERT izni veriyor; manager INSERT yapabilir
   * ama hassas alanları (maaş, tc_no vs.) UI'da göremediği için bunları
   * boş gönderir. Tutarlılık için kontrol BACKEND'e bırakılıyor.
   */
  async create(employee: EmployeeInsert): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Personel güncelleme — ham tabloya. RLS sadece yetkili rollere izin verir.
   */
  async update(id: string, updates: EmployeeUpdate): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByDepartment(
    companyId: string,
    department: string,
  ): Promise<Employee[] | EmployeePublic[]> {
    const source = await pickSource();
    const { data, error } = await supabase
      .from(source)
      .select('*')
      .eq('company_id', companyId)
      .eq('department', department)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Employee[] | EmployeePublic[];
  },

  async getByStatus(
    companyId: string,
    status: Employee['status'],
  ): Promise<Employee[] | EmployeePublic[]> {
    const source = await pickSource();
    const { data, error } = await supabase
      .from(source)
      .select('*')
      .eq('company_id', companyId)
      .eq('status', status)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Employee[] | EmployeePublic[];
  },

  async search(
    companyId: string,
    searchTerm: string,
  ): Promise<Employee[] | EmployeePublic[]> {
    const source = await pickSource();
    const { data, error } = await supabase
      .from(source)
      .select('*')
      .eq('company_id', companyId)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%`)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Employee[] | EmployeePublic[];
  },

  /**
   * İstatistik — sadece status sütununa bakıyor, view'de bu kolon var.
   * Rol bazlı yönlendirme yapmaya gerek yok; view yeterli.
   */
  async getStats(companyId: string) {
    const source = await pickSource();
    const { data, error } = await supabase
      .from(source)
      .select('status')
      .eq('company_id', companyId);
    if (error) throw error;
    const stats = {
      active:   (data ?? []).filter((e) => e.status === 'active').length,
      onLeave:  (data ?? []).filter((e) => e.status === 'onLeave').length,
      inactive: (data ?? []).filter((e) => e.status === 'inactive').length,
    };
    return stats;
  },

  generatePasscode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Passcode operasyonları — hassas alan. View'de yok, ham tabloya gider.
   * RLS sadece admin/hr/superadmin'e erişim verir.
   */
  async setEmployeePasscode(employeeId: string, passcode: string) {
    const { data, error } = await supabase
      .from('employees')
      .update({ approval_passcode: passcode })
      .eq('id', employeeId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getEmployeePasscode(employeeId: string): Promise<string | undefined> {
    const { data, error } = await supabase
      .from('employees')
      .select('approval_passcode')
      .eq('id', employeeId)
      .maybeSingle();
    if (error) throw error;
    return data?.approval_passcode ?? undefined;
  },
};