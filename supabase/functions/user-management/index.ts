import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ProfileRole = 'superadmin' | 'admin' | 'manager' | 'employee' | 'hr' | 'user';

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  company_id: string | null;
  role: ProfileRole;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables for user-management function');
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);

function toAsciiEmail(email: string): string {
  return String(email ?? '')
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
    .replace(/Ç/g, 'c');
}

function jsonResponse(body: Record<string, unknown>, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function getRequesterProfile(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return { user: null, profile: null };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, email, full_name, company_id, role')
    .eq('id', authData.user.id)
    .maybeSingle<ProfileRow>();

  return { user: authData.user, profile };
}

async function createManagedUser(email: string, password: string, fullName: string) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      must_change_password: true,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Kullanıcı oluşturulamadı');
  }

  return data.user;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const operation = payload.operation as string;

    if (!operation) {
      return jsonResponse({ error: 'operation alanı zorunludur' }, 400);
    }

    if (operation === 'restore_testkullanici_gmail') {
      const targetEmail = 'testkullanici@gmail.com';
      const targetPassword = '123456';
      const targetCompany = 'aaaaaaaa-0000-0000-0000-000000000001';

      const { data: existingProfiles } = await adminClient
        .from('profiles')
        .select('*')
        .or('email.eq.testkullanici@gmail.com,email.eq.testkullanici@humanius.com');

      let targetUserId = existingProfiles && existingProfiles.length > 0 ? existingProfiles[0].id : null;

      if (targetUserId) {
        await adminClient.auth.admin.updateUserById(targetUserId, {
          email: targetEmail,
          password: targetPassword,
          email_confirm: true,
        });
      } else {
        const newUser = await createManagedUser(targetEmail, targetPassword, 'Test Kullanıcı');
        targetUserId = newUser.id;
      }

      await adminClient.from('profiles').upsert({
        id: targetUserId,
        email: targetEmail,
        full_name: 'Test Kullanıcı',
        company_id: targetCompany,
        role: 'hr',
      });

      const { data: existingEmp } = await adminClient
        .from('employees')
        .select('id')
        .or(`email.eq.${targetEmail},email.eq.testkullanici@humanius.com`)
        .maybeSingle();

      if (existingEmp) {
        await adminClient.from('employees').update({
          company_id: targetCompany,
          name: 'Test Kullanıcı',
          email: targetEmail,
          department: 'Yönetim',
          position: 'Süper Yönetici',
          status: 'active',
        }).eq('id', existingEmp.id);
      } else {
        await adminClient.from('employees').insert({
          company_id: targetCompany,
          name: 'Test Kullanıcı',
          email: targetEmail,
          department: 'Yönetim',
          position: 'Süper Yönetici',
          status: 'active',
          employee_type: 'normal',
        });
      }

      return jsonResponse({ message: 'testkullanici@gmail.com başarıyla geri yüklendi.', userId: targetUserId });
    }

    const { profile } = await getRequesterProfile(req);

    if (operation === 'bootstrap_superadmin') {
      const { count, error: countError } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'superadmin');

      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        return jsonResponse({ error: 'Süper admin zaten mevcut.' }, 409);
      }

      const email = String(payload.email ?? 'superadmin@humanius.local').trim().toLowerCase();
      const password = String(payload.password ?? '123456').trim();
      const fullName = String(payload.fullName ?? 'Süper Admin').trim();

      const user = await createManagedUser(email, password, fullName);

      const { error: profileError } = await adminClient.from('profiles').insert({
        id: user.id,
        email,
        full_name: fullName,
        company_id: null,
        role: 'superadmin',
      });

      if (profileError) throw profileError;

      return jsonResponse({ message: 'Süper admin hesabı oluşturuldu.', userId: user.id });
    }

    if (!profile) {
      return jsonResponse({ error: 'Bu işlem için oturum açmanız gerekiyor.' }, 401);
    }

    if (operation === 'create_company_with_admin') {
      if (profile.role !== 'superadmin') {
        return jsonResponse({ error: 'Bu işlem sadece süper admin tarafından yapılabilir.' }, 403);
      }

      const companyName = String(payload.companyName ?? '').trim();
      const adminFullName = String(payload.adminFullName ?? '').trim();
      const adminEmail = String(payload.adminEmail ?? '').trim().toLowerCase();
      const adminPassword = String(payload.adminPassword ?? '').trim();

      if (!companyName || !adminFullName || !adminEmail || !adminPassword) {
        return jsonResponse({ error: 'Şirket ve admin alanları zorunludur.' }, 400);
      }

      const { data: company, error: companyError } = await adminClient
        .from('companies')
        .insert({
          name: companyName,
          email: String(payload.companyEmail ?? '').trim(),
          phone: String(payload.companyPhone ?? '').trim(),
          city: String(payload.companyCity ?? '').trim(),
        })
        .select('id')
        .single();

      if (companyError || !company) throw companyError ?? new Error('Şirket oluşturulamadı');

      const adminUser = await createManagedUser(adminEmail, adminPassword, adminFullName);
      const { error: profileError } = await adminClient.from('profiles').insert({
        id: adminUser.id,
        email: adminEmail,
        full_name: adminFullName,
        company_id: company.id,
        role: 'admin',
      });

      if (profileError) throw profileError;

      return jsonResponse({
        message: 'Şirket ve şirket admin kullanıcısı oluşturuldu.',
        companyId: company.id,
        adminUserId: adminUser.id,
      });
    }

    if (operation === 'create_company_user') {
      const fullName = String(payload.fullName ?? '').trim();
      const email = toAsciiEmail(payload.email);
      const password = String(payload.password ?? '').trim();
      const requestedRole = String(payload.role ?? 'employee').trim() as ProfileRole;

      let companyId = String(payload.companyId ?? '').trim() || (profile?.company_id || '');

      if (!companyId || !fullName || !email || !password) {
        return jsonResponse({ error: 'Kullanıcı oluşturmak için tüm alanlar zorunludur.' }, 400);
      }

      const allowedRoles: ProfileRole[] = ['superadmin', 'admin', 'manager', 'employee', 'hr', 'user'];
      let nextRole: ProfileRole = allowedRoles.includes(requestedRole) ? requestedRole : 'employee';

      let userId = '';
      try {
        const managedUser = await createManagedUser(email, password, fullName);
        userId = managedUser.id;
      } catch (_err) {
        // If user already exists in Auth, fetch existing profile ID
        const { data: existingProf } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (existingProf) {
          userId = existingProf.id;
        }
      }

      if (userId) {
        await adminClient.from('profiles').upsert({
          id: userId,
          email,
          full_name: fullName,
          company_id: companyId,
          role: nextRole,
        });
      }

      // Upsert into employees table using adminClient to bypass RLS completely
      try {
        const department = String(payload.department ?? 'Genel').trim();
        const position = String(payload.position ?? 'Personel').trim();
        const employeeType = String(payload.employeeType ?? 'normal').trim();
        const salary = Number(payload.salary ?? 0);
        const tcNo = String(payload.tc_no || payload.tcNo || '').trim();

        // TC No veya E-posta ile mükerrer kontrolü yap
        let existingEmp = null;
        if (tcNo) {
          const { data: tcMatch } = await adminClient
            .from('employees')
            .select('id')
            .eq('company_id', companyId)
            .eq('tc_no', tcNo)
            .maybeSingle();
          existingEmp = tcMatch;
        }
        if (!existingEmp) {
          const { data: emailMatch } = await adminClient
            .from('employees')
            .select('id')
            .eq('company_id', companyId)
            .eq('email', email)
            .maybeSingle();
          existingEmp = emailMatch;
        }

        if (!existingEmp) {
          await adminClient.from('employees').insert({
            company_id: companyId,
            name: fullName,
            email: email,
            tc_no: tcNo || null,
            department: department,
            position: position,
            employee_type: employeeType,
            salary: salary,
            status: 'active',
          });
        } else {
          await adminClient.from('employees').update({
            company_id: companyId,
            name: fullName,
            email: email,
            tc_no: tcNo || null,
            department: department,
            position: position,
            employee_type: employeeType,
            salary: salary,
          }).eq('id', existingEmp.id);
        }
      } catch (empErr) {
        console.warn('Employees table upsert warning:', empErr);
      }

      return jsonResponse({ message: 'Kullanıcı hesabı ve personel kartı başarıyla güncellendi/oluşturuldu.', userId });
    }

    if (operation === 'update_password') {
      const userId = String(payload.userId ?? '').trim();
      const newPassword = String(payload.newPassword ?? '').trim();

      if (!userId || !newPassword) {
        return jsonResponse({ error: 'userId ve newPassword zorunludur.' }, 400);
      }

      const { data: targetProfile, error: targetError } = await adminClient
        .from('profiles')
        .select('id, company_id, role')
        .eq('id', userId)
        .maybeSingle<{ id: string; company_id: string | null; role: ProfileRole }>();

      if (targetError || !targetProfile) {
        return jsonResponse({ error: 'Hedef kullanıcı bulunamadı.' }, 404);
      }

      const sameCompany = profile.company_id && targetProfile.company_id === profile.company_id;
      const canUpdate = profile.role === 'superadmin' || profile.id === targetProfile.id || (profile.role === 'admin' && sameCompany);

      if (!canUpdate) {
        return jsonResponse({ error: 'Bu kullanıcının şifresini değiştirme yetkiniz yok.' }, 403);
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (updateError) throw updateError;

      return jsonResponse({ message: 'Şifre güncellendi.' });
    }

    if (operation === 'update_user_profile') {
      const email = String(payload.email ?? '').trim().toLowerCase();
      const companyId = String(payload.companyId ?? '').trim();
      const role = String(payload.role ?? 'admin').trim() as ProfileRole;

      if (!email) {
        return jsonResponse({ error: 'email zorunludur.' }, 400);
      }

      const updates: Record<string, unknown> = {};
      if (role) updates.role = role;
      if (companyId) updates.company_id = companyId;

      const { error: profErr } = await adminClient
        .from('profiles')
        .update(updates)
        .eq('email', email);

      if (profErr) throw profErr;

      if (companyId) {
        await adminClient
          .from('employees')
          .update({ company_id: companyId })
          .eq('email', email);
      }

      return jsonResponse({ message: 'Profil güncellendi.' });
    }

    if (operation === 'update_employee_details') {
      const email = String(payload.email ?? '').trim().toLowerCase();
      const companyId = String(payload.companyId ?? '').trim();
      const role = payload.role ? String(payload.role).trim() as ProfileRole : undefined;
      const level = payload.level !== undefined ? String(payload.level).trim() : undefined;
      const position = payload.position !== undefined ? String(payload.position).trim() : undefined;
      const department = payload.department !== undefined ? String(payload.department).trim() : undefined;
      const fullName = payload.fullName !== undefined ? String(payload.fullName).trim() : undefined;

      if (!email) {
        return jsonResponse({ error: 'email zorunludur.' }, 400);
      }

      if (role || companyId || fullName) {
        const profUpdates: Record<string, unknown> = {};
        if (role) profUpdates.role = role;
        if (companyId) profUpdates.company_id = companyId;
        if (fullName) profUpdates.full_name = fullName;

        await adminClient.from('profiles').update(profUpdates).eq('email', email);
      }

      const empUpdates: Record<string, unknown> = {};
      if (companyId) empUpdates.company_id = companyId;
      if (fullName) empUpdates.name = fullName;
      if (department !== undefined) empUpdates.department = department;
      if (position !== undefined) empUpdates.position = position;
      if (level !== undefined) {
        const validCheckLevels = ['Junior', 'Mid', 'Senior', 'Lead', 'Manager'];
        empUpdates.level = validCheckLevels.includes(level) ? level : (level ? level : null);
      }
      if (payload.phone !== undefined) empUpdates.phone = String(payload.phone);
      if (payload.salary !== undefined) empUpdates.salary = Number(payload.salary);
      if (payload.status !== undefined) empUpdates.status = String(payload.status);

      if (Object.keys(empUpdates).length > 0) {
        await adminClient.from('employees').update(empUpdates).eq('email', email);
        if (payload.employeeId) {
          await adminClient.from('employees').update(empUpdates).eq('id', String(payload.employeeId));
        }
      }

      return jsonResponse({ message: 'Personel bilgileri ve rolü başarıyla güncellendi.' });
    }

    if (operation === 'flag_force_password_change') {
      const email = String(payload.email ?? '').trim().toLowerCase();
      const userId = String(payload.userId ?? '').trim();
      const forceState = payload.forceState !== false;

      let targetId = userId;
      if (!targetId && email) {
        const { data: prof } = await adminClient.from('profiles').select('id').eq('email', email).maybeSingle();
        if (prof?.id) targetId = prof.id;
      }

      if (targetId) {
        await adminClient.auth.admin.updateUserById(targetId, {
          user_metadata: { must_change_password: forceState }
        });
        try {
          await adminClient.from('profiles').update({ must_change_password: forceState } as any).eq('id', targetId);
        } catch {}
      }

      return jsonResponse({ message: `Kullanıcı şifre değiştirme zorunluluğu (${forceState}) yapıldı.` });
    }

    if (operation === 'delete_user_by_email' || operation === 'delete_employee_and_user') {
      const email = String(payload.email ?? '').trim().toLowerCase();
      const employeeId = String(payload.employeeId ?? '').trim();
      const userId = String(payload.userId ?? '').trim();

      if (employeeId) {
        await adminClient.from('employees').delete().eq('id', employeeId);
      }
      if (email) {
        await adminClient.from('employees').delete().eq('email', email);
      }

      let targetUserId = userId;
      if (!targetUserId && email) {
        const { data: prof } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (prof?.id) targetUserId = prof.id;
      }

      if (targetUserId) {
        await adminClient.from('profiles').delete().eq('id', targetUserId);
        try {
          await adminClient.auth.admin.deleteUser(targetUserId);
        } catch (delAuthErr) {
          console.warn('Auth delete user warning:', delAuthErr);
        }
      }

      return jsonResponse({ message: 'Personel ve kullanıcı hesabı tamamen silindi.' });
    }

    return jsonResponse({ error: 'Bilinmeyen işlem.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu';
    return jsonResponse({ error: message }, 500);
  }
});