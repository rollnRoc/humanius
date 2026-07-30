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
  if (demoService.isDemoActive()) return 'superadmin';
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
    const source = await pickSource();
    let query = supabase.from(source).select('*');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Employee[] | EmployeePublic[];
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
    return data;
  },

  async update(id: string, updates: EmployeeUpdate): Promise<Employee> {
    if (demoService.isDemoActive()) {
      return demoService.updateEmployee(id, updates as any) as any;
    }
    const { contact_email, personal_email, joinDate, employeeType, role, ...rawUpdates } = updates as any;
    const payload = {
      ...rawUpdates,
      ...(rawUpdates.level !== undefined ? { level: sanitizeLevel(rawUpdates.level) } : {})
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
    } catch (e) {
      console.warn('Client update error:', e);
    }

    if (!updatedRow) {
      try {
        const { userManagementService } = await import('./userManagementService');
        await userManagementService.updateEmployeeDetails({
          employeeId: id,
          email: updates.email || '',
          phone: updates.phone ?? '',
          address: updates.address ?? '',
          join_date: updates.join_date ?? null,
          companyId: updates.company_id,
          fullName: updates.name,
          department: updates.department,
          position: updates.position,
          level: updates.level,
          salary: updates.salary,
          status: updates.status,
          tc_no: updates.tc_no,
          sicil_no: updates.sicil_no,
          employee_type: updates.employee_type,
        });
      } catch (e) {
        console.warn('Fallback update details error:', e);
      }
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
    const source = await pickSource();
    let query = supabase.from(source).select('status');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query;
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