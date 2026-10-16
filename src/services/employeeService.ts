import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import bcrypt from 'bcryptjs';
import { demoService } from './demoService';
import {
  formatAddressWithCity,
  saveEmployeeLocationMeta,
  enrichEmployeeWithLocation,
  saveEmployeeIsYeriSgkSicil,
} from '../utils/employeeLocationMeta';
import { normalizeDateForInput } from '../utils/dateUtils';

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

function sanitizeLevel(level?: string | null): string {
  if (!level) return 'Junior';
  const trimmed = String(level).trim();
  if (VALID_CHECK_LEVELS.has(trimmed)) return trimmed;
  return 'Junior';
}

const VALID_DB_EMPLOYEE_COLUMNS = new Set([
  'id',
  'company_id',
  'name',
  'tc_no',
  'sicil_no',
  'is_yeri_sgk_sicil_no',
  'department',
  'position',
  'level',
  'salary',
  'status',
  'phone',
  'email',
  'join_date',
  'address',
  'avatar_url',
  'skills',
  'medeni_durum',
  'cocuk_sayisi',
  'engelli_durumu',
  'approval_passcode',
  'employee_type',
  'approval_signature',
  'birth_date',
]);

function filterDbEmployeePayload(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (VALID_DB_EMPLOYEE_COLUMNS.has(key) && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export const employeeService = {
  async getAll(companyId?: string): Promise<Employee[] | EmployeePublic[]> {
    const targetCompId = (companyId && companyId !== 'all') ? companyId : undefined;
    const cacheKey = `humanius_cached_employees_${targetCompId || 'all'}`;

    // 1. DÜMDÜZ veritabanından çek (Edge function - service_role, RLS aşan, kesin 220 personel)
    try {
      const { data: resData } = await supabase.functions.invoke('user-management', {
        body: { operation: 'list_employees', companyId: targetCompId }
      });
      let parsed = resData;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch {}
      }
      const employeesList = parsed?.employees || (Array.isArray(parsed) ? parsed : null);
      if (employeesList && employeesList.length > 0) {
        console.log(`[employeeService.getAll] Edge Function'dan ${employeesList.length} personel çekildi.`);
        const enriched = (employeesList as any[]).map(enrichEmployeeWithLocation) as Employee[];
        try {
          localStorage.setItem(cacheKey, JSON.stringify(enriched));
          if (!targetCompId) {
            localStorage.setItem('humanius_cached_employees_all', JSON.stringify(enriched));
          }
        } catch {}
        return enriched;
      }
    } catch (edgeErr) {
      console.warn('Edge function list_employees warning:', edgeErr);
    }

    // 2. Doğrudan veritabanı sorgusu fallback
    try {
      const source = await pickSource();
      let query = supabase.from(source).select('*');
      if (targetCompId) {
        query = query.eq('company_id', targetCompId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const enriched = (data as any[]).map(enrichEmployeeWithLocation) as Employee[] | EmployeePublic[];
        try {
          localStorage.setItem(cacheKey, JSON.stringify(enriched));
          if (!targetCompId) {
            localStorage.setItem('humanius_cached_employees_all', JSON.stringify(enriched));
          }
        } catch {}
        return enriched;
      }
    } catch {}

    // 3. User-specific fallback: Check if authenticated user has their own employee record
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        const uEmail = user.email ? user.email.toLowerCase().trim() : '';
        const uId = user.id;
        let query = supabase.from('employees').select('*');
        if (uEmail) {
          query = query.ilike('email', uEmail);
        } else {
          query = query.eq('id', uId);
        }
        const { data: myEmp } = await query;
        if (myEmp && myEmp.length > 0) {
          const enrichedMy = myEmp.map(enrichEmployeeWithLocation) as Employee[];
          return enrichedMy;
        }
      }
    } catch {}

    // 4. Yerel önbellek yedeği
    try {
      const cached = localStorage.getItem(cacheKey) || (!targetCompId ? localStorage.getItem('humanius_cached_employees_all') : null);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    return [];
  },

  async getById(id: string): Promise<Employee | EmployeePublic | null> {
    if (!id) return null;
    const all = await this.getAll();
    const found = all.find(e => e.id === id);
    if (found) return found;

    try {
      const source = await pickSource();
      const { data, error } = await supabase
        .from(source)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) return enrichEmployeeWithLocation(data as any) as Employee | EmployeePublic;
    } catch {}
    return null;
  },

  async create(employee: EmployeeInsert): Promise<Employee> {
    if (demoService.isDemoActive()) {
      return demoService.createEmployee(employee as any) as any;
    }
    const { contact_email, personal_email, joinDate, employeeType, role, il, ilce, ...rawPayload } = employee as any;
    const targetIsYeriSicil = (rawPayload.is_yeri_sgk_sicil_no || rawPayload.isYeriSgkSicilNo || '').trim();
    const cleanAddress = formatAddressWithCity(rawPayload.address, il, ilce, targetIsYeriSicil);
    const cleanLevel = sanitizeLevel(rawPayload.level);
    const cleanJoinDate = normalizeDateForInput(rawPayload.join_date ?? joinDate) || null;
    const cleanBirthDate = normalizeDateForInput(rawPayload.birth_date ?? (rawPayload as any).birthDate) || null;

    const payload = filterDbEmployeePayload({
      ...rawPayload,
      address: cleanAddress,
      is_yeri_sgk_sicil_no: targetIsYeriSicil,
      level: cleanLevel,
      join_date: cleanJoinDate,
      birth_date: cleanBirthDate,
      employee_type: rawPayload.employee_type || rawPayload.employeeType || employeeType || 'normal',
    });

    // Mükerrer personel kaydını engelle: Aynı e-posta veya TC Kimlik no mevcut mu kontrol et
    const targetEmail = payload.email ? String(payload.email).trim().toLowerCase() : null;
    const targetTc = payload.tc_no && String(payload.tc_no).trim() !== '' ? String(payload.tc_no).trim() : null;

    let existingEmpId: string | null = null;
    if (targetEmail || targetTc) {
      try {
        let query = supabase.from('employees').select('id, email, tc_no, company_id');
        if (payload.company_id) {
          query = query.eq('company_id', payload.company_id);
        }
        const { data: existingRows } = await query;
        if (existingRows && existingRows.length > 0) {
          const match = existingRows.find(
            (r: any) =>
              (targetEmail && r.email && String(r.email).trim().toLowerCase() === targetEmail) ||
              (targetTc && r.tc_no && String(r.tc_no).trim() === targetTc)
          );
          if (match) {
            existingEmpId = match.id;
          }
        }
      } catch (checkErr) {
        console.warn('Mükerrer personel kontrolü hatası:', checkErr);
      }
    }

    let data: any = null;
    if (existingEmpId) {
      let upRes = await supabase
        .from('employees')
        .update(payload)
        .eq('id', existingEmpId)
        .select()
        .single();
      if (upRes.error && upRes.error.message?.includes('is_yeri_sgk_sicil_no')) {
        const { is_yeri_sgk_sicil_no, ...fallbackPayload } = payload;
        upRes = await supabase
          .from('employees')
          .update(fallbackPayload)
          .eq('id', existingEmpId)
          .select()
          .single();
      }
      if (upRes.error) throw upRes.error;
      data = upRes.data;
    } else {
      let inRes = await supabase
        .from('employees')
        .insert(payload)
        .select()
        .single();
      if (inRes.error && inRes.error.message?.includes('is_yeri_sgk_sicil_no')) {
        const { is_yeri_sgk_sicil_no, ...fallbackPayload } = payload;
        inRes = await supabase
          .from('employees')
          .insert(fallbackPayload)
          .select()
          .single();
      }
      if (inRes.error) throw inRes.error;
      data = inRes.data;
    }

    if (data?.id) {
      if (il || ilce) {
        saveEmployeeLocationMeta(data.id, data.email, il, ilce);
      }
      if (targetIsYeriSicil) {
        saveEmployeeIsYeriSgkSicil(data.id, data.email, targetIsYeriSicil);
      }
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
          birth_date: cleanBirthDate,
        } as any);
      } catch (userErr) {
        console.warn('Otomatik kullanıcı hesabı oluşturma uyarısı:', userErr);
      }
    }

    return enrichEmployeeWithLocation({
      ...data,
      il: il || '',
      ilce: ilce || '',
    });
  },

  async batchCreate(employees: any[]): Promise<{ count: number; error?: any }> {
    if (demoService.isDemoActive()) {
      const createdList: any[] = [];
      for (const emp of employees) {
        const created = demoService.createEmployee({
          name: emp.name,
          tc_no: emp.tc_no || '',
          sicil_no: emp.sicil_no || '',
          is_yeri_sgk_sicil_no: emp.is_yeri_sgk_sicil_no || emp.isYeriSgkSicilNo || '',
          department: emp.department || 'Genel Departman',
          position: emp.position || 'Personel',
          level: emp.level || 'Mid',
          salary: emp.salary || 0,
          status: emp.status || 'active',
          phone: emp.phone || '',
          email: emp.email || '',
          join_date: emp.join_date || new Date().toISOString().split('T')[0],
          address: emp.address || '',
          il: emp.il || '',
          ilce: emp.ilce || '',
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
          const updateAddr = formatAddressWithCity(emp.address, emp.il, emp.ilce);
          if (emp.il || emp.ilce) {
            saveEmployeeLocationMeta(match.id, emp.email, emp.il, emp.ilce);
          }
          const { error: upErr } = await supabase
            .from('employees')
            .update({
              department: emp.department || undefined,
              position: emp.position || undefined,
              phone: emp.phone || undefined,
              address: updateAddr || undefined,
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
        const insertAddr = formatAddressWithCity(emp.address, emp.il, emp.ilce);
        const { il: _il, ilce: _ilce, ...cleanEmp } = emp;
        toInsert.push(filterDbEmployeePayload({ ...cleanEmp, address: insertAddr }));
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
    const { contact_email, personal_email, joinDate, employeeType, role, il, ilce, ...rawUpdates } = updates as any;
    const targetIl = il !== undefined ? il : (updates as any).il;
    const targetIlce = ilce !== undefined ? ilce : (updates as any).ilce;
    const targetIsYeriSicil = rawUpdates.is_yeri_sgk_sicil_no !== undefined || rawUpdates.isYeriSgkSicilNo !== undefined
      ? String(rawUpdates.is_yeri_sgk_sicil_no ?? rawUpdates.isYeriSgkSicilNo ?? '').trim()
      : undefined;

    if (targetIl !== undefined || targetIlce !== undefined) {
      saveEmployeeLocationMeta(id, updates.email, targetIl, targetIlce);
    }
    if (targetIsYeriSicil !== undefined) {
      saveEmployeeIsYeriSgkSicil(id, updates.email, targetIsYeriSicil);
    }

    if (targetIl !== undefined || targetIlce !== undefined || targetIsYeriSicil !== undefined) {
      rawUpdates.address = formatAddressWithLocationAndSgk(
        rawUpdates.address ?? updates.address,
        targetIl,
        targetIlce,
        targetIsYeriSicil !== undefined ? targetIsYeriSicil : parseIsYeriSgkFromAddress(rawUpdates.address ?? updates.address)
      );
    }

    const cleanLevel = sanitizeLevel(rawUpdates.level);
    const cleanJoinDate = normalizeDateForInput(rawUpdates.join_date ?? joinDate) || null;
    const cleanBirthDate = normalizeDateForInput(rawUpdates.birth_date ?? (rawUpdates as any).birthDate) || null;

    const payload = filterDbEmployeePayload({
      ...rawUpdates,
      address: rawUpdates.address,
      is_yeri_sgk_sicil_no: targetIsYeriSicil !== undefined ? targetIsYeriSicil : undefined,
      level: cleanLevel,
      join_date: cleanJoinDate,
      birth_date: cleanBirthDate,
      employee_type: rawUpdates.employee_type || rawUpdates.employeeType || undefined,
    });

    let updatedRow: Employee | null = null;
    try {
      let { data, error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error && error.message?.includes('is_yeri_sgk_sicil_no')) {
        const { is_yeri_sgk_sicil_no, ...fallbackPayload } = payload;
        const fallbackRes = await supabase
          .from('employees')
          .update(fallbackPayload)
          .eq('id', id)
          .select()
          .maybeSingle();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

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
        address: rawUpdates.address ?? updates.address ?? '',
        is_yeri_sgk_sicil_no: targetIsYeriSicil,
        isYeriSgkSicilNo: targetIsYeriSicil,
        join_date: cleanJoinDate,
        birth_date: cleanBirthDate,
        companyId: updates.company_id,
        fullName: updates.name,
        role: updatedRole,
        department: updates.department,
        position: updates.position,
        level: cleanLevel,
        salary: updates.salary,
        status: updates.status,
        tc_no: updates.tc_no,
        sicil_no: updates.sicil_no,
        employee_type: updates.employee_type,
      });
    } catch (edgeErr) {
      console.warn('Edge function update warning:', edgeErr);
    }

    return enrichEmployeeWithLocation({
      ...(updatedRow || { id, ...updates }),
      il: targetIl,
      ilce: targetIlce,
    }) as Employee;
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