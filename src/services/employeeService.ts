import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import bcrypt from 'bcryptjs';
import { demoService } from './demoService';

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

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

const FULL_ACCESS_ROLES = new Set(['superadmin', 'admin', 'hr']);

async function getCurrentRole(): Promise<string> {
  if (demoService.isDemoActive()) return 'hr';
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 'user';
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();
  return data?.role ?? 'user';
}

async function pickSource(): Promise<'employees'> {
  return 'employees';
}

const VALID_CHECK_LEVELS = new Set(['Junior', 'Mid', 'Senior', 'Lead', 'Manager']);

function sanitizeLevel(level?: string | null): string | null {
  if (!level) return null;
  const trimmed = String(level).trim();
  if (VALID_CHECK_LEVELS.has(trimmed)) return trimmed;
  return null;
}

export const employeeService = {
  async getAll(companyId?: string): Promise<Employee[] | EmployeePublic[]> {
    if (demoService.isDemoActive()) {
      return demoService.getEmployees() as any;
    }
    try {
      const source = await pickSource();
      let query = supabase.from(source).select('*');
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as Employee[] | EmployeePublic[];
      }
    } catch {}

    // Edge function fallback via admin service_role to ensure 100% data access
    try {
      const { data: resData } = await supabase.functions.invoke('user-management', {
        body: { operation: 'list_employees', companyId }
      });
      if (resData?.employees && resData.employees.length > 0) {
        return resData.employees as Employee[];
      }
    } catch {}

    return [];
  },

  async getById(id: string): Promise<Employee | EmployeePublic | null> {
    if (demoService.isDemoActive()) {
      const emp = demoService.getEmployees().find(e => e.id === id);
      return (emp ?? null) as any;
    }
    const source = await pickSource();
    const { data, error } = await supabase
      .from(source)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Employee | EmployeePublic | null;
  },

  async create(employee: EmployeeInsert): Promise<Employee> {
    if (demoService.isDemoActive()) {
      return demoService.createEmployee(employee as any) as any;
    }
    const { contact_email, personal_email, joinDate, employeeType, role, ...rawPayload } = employee as any;
    const payload = {
      ...rawPayload,
      level: sanitizeLevel(rawPayload.level)
    };
    const { data, error } = await supabase
      .from('employees')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    if (data?.id) {
      try {
        const { userManagementService } = await import('./userManagementService');
        const empEmail = data.email || `${String(data.name || 'personel').toLowerCase().replace(/[^a-z0-9]+/g, '.')}@humanius.net`;
        await userManagementService.createCompanyUser({
          companyId: data.company_id || undefined,
          fullName: data.name,
          email: empEmail,
          password: '987654',
          role: (role as any) || 'employee',
          department: data.department,
          position: data.position,
          employeeType: data.employee_type || 'normal',
          salary: data.salary,
          tc_no: data.tc_no ?? '',
          employeeId: data.id,
        });
      } catch (userErr) {
        console.warn('Otomatik kullanıcı hesabı oluşturma uyarısı:', userErr);
      }
    }

    return data;
  },

  async batchCreate(employees: any[]): Promise<{ count: number; error?: any }> {
    if (demoService.isDemoActive()) {
      const createdList: any[] = [];
      for (const emp of employees) {
        const created = demoService.createEmployee({
          name: emp.name,
          tc_no: emp.tc_no || '',
          sicil_no: emp.sicil_no || '',
          department: emp.department || 'Genel Departman',
          position: emp.position || 'Personel',
          level: emp.level || 'Mid',
          salary: emp.salary || 0,
          status: emp.status || 'active',
          phone: emp.phone || '',
          email: emp.email || '',
          join_date: emp.join_date || new Date().toISOString().split('T')[0],
          address: emp.address || '',
          skills: emp.skills || [],
          company_id: 'demo-company-id-9999',
        });
        createdList.push(created);
      }
      return { count: createdList.length };
    }

    const cleaned = employees.map(emp => {
      const { contact_email, personal_email, joinDate, employeeType, role, id, ...rawPayload } = emp as any;
      return {
        ...rawPayload,
        level: sanitizeLevel(rawPayload.level),
        join_date: rawPayload.join_date || (joinDate ? String(joinDate).split('T')[0] : new Date().toISOString().split('T')[0]),
        status: rawPayload.status || 'active',
        employee_type: rawPayload.employee_type || employeeType || 'normal',
      };
    });

    // 1. Mevcut personelleri çek ve TC No / İsim eşleşmesi ile mükerrer kayıtları engelle
    let existingMap: any[] = [];
    try {
      const { data: dbExisting } = await supabase
        .from('employees')
        .select('id, name, tc_no, email, company_id');
      if (dbExisting) existingMap = dbExisting;
    } catch (e) {
      console.warn('Mevcut personel listesi çekilemedi:', e);
    }

    const toInsert: any[] = [];
    let updatedCount = 0;

    for (const emp of cleaned) {
      // Önce TC No ile eşleşme ara (eğer TC varsa)
      let match = emp.tc_no && String(emp.tc_no).trim() !== ''
        ? existingMap.find(ex => ex.company_id === emp.company_id && ex.tc_no && String(ex.tc_no).trim() === String(emp.tc_no).trim())
        : null;

      // TC yoksa veya eşleşmediyse isim ile şirket içi eşleşme ara
      if (!match && emp.name) {
        match = existingMap.find(ex => 
          ex.company_id === emp.company_id && 
          String(ex.name).trim().toLowerCase() === String(emp.name).trim().toLowerCase()
        );
      }

      if (match) {
        // Mükerrer personel bulundu! İkinci satır eklemek yerine mevcut kartı güncelle
        try {
          const { error: upErr } = await supabase
            .from('employees')
            .update({
              department: emp.department || undefined,
              position: emp.position || undefined,
              phone: emp.phone || undefined,
              address: emp.address || undefined,
              sicil_no: emp.sicil_no || undefined,
              join_date: emp.join_date || undefined,
              status: emp.status || 'active',
            })
            .eq('id', match.id);
          if (!upErr) updatedCount++;
        } catch (upCatch) {
          console.warn('Mevcut personel güncelleme uyarısı:', upCatch);
        }
      } else {
        toInsert.push(emp);
      }
    }

    let totalInserted = 0;
    const CHUNK_SIZE = 50;

    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase
        .from('employees')
        .insert(chunk)
        .select('id, name, email');

      if (error) {
        console.warn(`Toplu ekleme ${i} aralığı hatası, satır satır ekleniyor:`, error.message);
        for (const singleEmp of chunk) {
          try {
            const { data: sData, error: sErr } = await supabase
              .from('employees')
              .insert(singleEmp)
              .select('id, name, email')
              .single();
            if (!sErr && sData) {
              totalInserted++;
            }
          } catch (singleErr) {
            console.warn('Tekil personel ekleme uyarısı:', singleErr);
          }
        }
      } else {
        totalInserted += (data?.length || chunk.length);
      }
    }

    return { count: totalInserted + updatedCount };
  },

  async update(id: string, updates: EmployeeUpdate): Promise<Employee> {
    if (demoService.isDemoActive()) {
      return demoService.updateEmployee(id, updates as any) as any;
    }
    const { contact_email, personal_email, joinDate, employeeType, role, ...rawUpdates } = updates as any;
    const cleanLevel = sanitizeLevel(rawUpdates.level);
    const cleanJoinDate = rawUpdates.join_date
      ? String(rawUpdates.join_date).split('T')[0]
      : (joinDate ? String(joinDate).split('T')[0] : null);
    const cleanBirthDate = rawUpdates.birth_date
      ? String(rawUpdates.birth_date).split('T')[0]
      : (rawUpdates.birthDate ? String(rawUpdates.birthDate).split('T')[0] : null);

    const payload: any = {
      ...rawUpdates,
      level: cleanLevel ?? undefined,
      join_date: cleanJoinDate,
      birth_date: cleanBirthDate,
    };

    let updatedRow: Employee | null = null;
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        updatedRow = data as Employee;
      }
      
      if (updates.email || updates.name || updates.company_id) {
        const profUp: any = {};
        if (updates.email) profUp.email = updates.email;
        if (updates.name) profUp.full_name = updates.name;
        if (updates.company_id) profUp.company_id = updates.company_id;
        await supabase.from('profiles').update(profUp).eq('id', id);
      }
    } catch (dbErr) {
      console.warn('Direct employees/profiles table update warning:', dbErr);
    }

    try {
      const { userManagementService } = await import('./userManagementService');
      const updatedRole = (updates as any).role || role;
      await userManagementService.updateEmployeeDetails({
        employeeId: id,
        email: updates.email || '',
        phone: updates.phone ?? '',
        address: updates.address ?? '',
        join_date: cleanJoinDate,
        birth_date: cleanBirthDate,
        companyId: updates.company_id,
        fullName: updates.name,
        role: updatedRole,
        department: updates.department,
        position: updates.position,
        level: cleanLevel ?? undefined,
        salary: updates.salary,
        status: updates.status,
        tc_no: updates.tc_no,
        sicil_no: updates.sicil_no,
        employee_type: updates.employee_type,
      });
    } catch (edgeErr) {
      console.warn('Edge function update warning:', edgeErr);
    }

    return (updatedRow || { id, ...updates }) as Employee;
  },

  async delete(id: string): Promise<void> {
    if (demoService.isDemoActive()) {
      demoService.deleteEmployee(id);
      return;
    }
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
    if (demoService.isDemoActive()) {
      return demoService.getEmployees().filter(e => e.department === department) as any;
    }
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
    if (demoService.isDemoActive()) {
      return demoService.getEmployees().filter(e => e.status === status) as any;
    }
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
    if (demoService.isDemoActive()) {
      const s = searchTerm.toLowerCase();
      return demoService.getEmployees().filter(e => 
        e.name.toLowerCase().includes(s) || 
        e.email.toLowerCase().includes(s) || 
        e.position.toLowerCase().includes(s)
      ) as any;
    }
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

  async getStats(companyId?: string) {
    if (demoService.isDemoActive()) {
      const list = demoService.getEmployees();
      return {
        active: list.filter(e => e.status === 'active').length,
        onLeave: list.filter(e => e.status === 'onLeave').length,
        inactive: list.filter(e => e.status === 'inactive').length
      };
    }
    const emps = await this.getAll(companyId);
    const stats = {
      active:   (emps ?? []).filter((e) => (e.status ?? 'active') === 'active').length,
      onLeave:  (emps ?? []).filter((e) => e.status === 'leave' || e.status === 'onLeave' || e.status === 'on_leave').length,
      inactive: (emps ?? []).filter((e) => e.status === 'inactive').length,
    };
    return stats;
  },

  generatePasscode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async setEmployeePasscode(employeeId: string, passcode: string | null) {
    if (demoService.isDemoActive()) {
      let hashedPasscode = passcode;
      if (passcode) hashedPasscode = bcrypt.hashSync(passcode, 10);
      return demoService.updateEmployee(employeeId, { approval_passcode: hashedPasscode } as any) as any;
    }
    let hashedPasscode = passcode;
    if (passcode) {
      hashedPasscode = bcrypt.hashSync(passcode, 10);
    }
    const { data, error } = await supabase
      .from('employees')
      .update({ approval_passcode: hashedPasscode })
      .eq('id', employeeId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getEmployeePasscode(employeeId: string): Promise<string | undefined> {
    if (demoService.isDemoActive()) {
      const emp = demoService.getEmployees().find(e => e.id === employeeId);
      return emp?.approval_passcode ?? undefined;
    }
    const { data, error } = await supabase
      .from('employees')
      .select('approval_passcode')
      .eq('id', employeeId)
      .maybeSingle();
    if (error) throw error;
    return data?.approval_passcode ?? undefined;
  },
};