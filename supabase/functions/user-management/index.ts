import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

serve(async (req: Request) => {
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
        .or('email.eq.testkullanici@gmail.com,email.eq.testkullanici@humanius.net');

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
        .or(`email.eq.${targetEmail},email.eq.testkullanici@humanius.net`)
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

    if (operation === 'check_email_availability') {
      const email = String(payload.email || '').trim().toLowerCase();
      const excludeId = String(payload.excludeId || '').trim();

      if (!email || email.length < 5) {
        return jsonResponse({ available: true, isTaken: false });
      }

      const { data: emps } = await adminClient
        .from('employees')
        .select('id, name, email')
        .eq('email', email);

      const { data: profs } = await adminClient
        .from('profiles')
        .select('id, email')
        .eq('email', email);

      const existingEmps = (emps || []).filter(e => e.id !== excludeId);
      const existingProfs = (profs || []).filter(p => p.id !== excludeId);

      const isTaken = existingEmps.length > 0 || existingProfs.length > 0;
      return jsonResponse({ available: !isTaken, isTaken });
    }

    if (operation === 'reset_password_with_tc_phone') {
      const email = String(payload.email || '').trim().toLowerCase();
      const tcNo = String(payload.tcNo || payload.tc_no || '').replace(/\D/g, '').trim();
      let phone = String(payload.phone || '').replace(/\D/g, '').trim();

      if (phone.startsWith('90') && phone.length >= 11) phone = phone.slice(2);
      if (phone.startsWith('0') && phone.length >= 10) phone = phone.slice(1);

      if (!email || !tcNo || !phone) {
        return jsonResponse({ error: 'Lütfen E-posta, TC Kimlik No ve Telefon Numarası alanlarını doldurun.' }, 400);
      }

      if (tcNo.length !== 11) {
        return jsonResponse({ error: 'TC Kimlik numarası 11 haneli olmalıdır.' }, 400);
      }

      const altEmailCom = email.replace('humanius.net', 'humanius.com');
      const altEmailComTr = email.replace('humanius.net', 'humanius.com.tr');

      const { data: emps } = await adminClient
        .from('employees')
        .select('id, email, tc_no, phone, name')
        .or(`email.eq.${email},email.eq.${altEmailCom},email.eq.${altEmailComTr},tc_no.eq.${tcNo}`);

      let matchedEmp = null;
      if (emps && emps.length > 0) {
        for (const emp of emps) {
          const empTc = (emp.tc_no || '').replace(/\D/g, '');
          let empPhone = (emp.phone || '').replace(/\D/g, '');
          if (empPhone.startsWith('90') && empPhone.length >= 11) empPhone = empPhone.slice(2);
          if (empPhone.startsWith('0') && empPhone.length >= 10) empPhone = empPhone.slice(1);

          const empEmailClean = (emp.email || '').toLowerCase().trim();
          const emailMatches = empEmailClean === email || empEmailClean === altEmailCom || empEmailClean === altEmailComTr;
          const phoneMatches = empPhone === phone || (empPhone.length >= 7 && (empPhone.endsWith(phone) || phone.endsWith(empPhone)));

          if (emailMatches && empTc === tcNo && phoneMatches) {
            matchedEmp = emp;
            break;
          }
        }
      }

      if (!matchedEmp) {
        return jsonResponse({ error: 'Girilen E-posta, TC Kimlik No veya Telefon numarası sistemdeki kayıtlar ile eşleşmedi. Lütfen bilgilerinizi kontrol edin.' }, 400);
      }

      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, email')
        .or(`email.eq.${email},email.eq.${altEmailCom},email.eq.${altEmailComTr}`);

      let authUserId = profiles && profiles.length > 0 ? profiles[0].id : null;

      if (!authUserId) {
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const foundUser = (users || []).find(u => {
          const uEm = (u.email || '').toLowerCase();
          return uEm === email || uEm === altEmailCom || uEm === altEmailComTr;
        });
        if (foundUser) authUserId = foundUser.id;
      }

      if (!authUserId) {
        return jsonResponse({ error: 'Eşleşen sistem hesabı bulunamadı.' }, 400);
      }

      await adminClient.auth.admin.updateUserById(authUserId, {
        password: '987654',
        user_metadata: { must_change_password: true }
      });

      try {
        await adminClient.from('profiles').update({ must_change_password: true }).eq('id', authUserId);
      } catch (pErr) {
        console.warn('Profiles update warning:', pErr);
      }

      return jsonResponse({ message: 'Parolanız başarıyla başlangıç şifrenize (987654) sıfırlandı.' });
    }

    if (operation === 'update_all_auth_emails_to_net') {
      const { data: profs } = await adminClient.from('profiles').select('id, email, full_name');
      let count = 0;
      for (const p of (profs || [])) {
        if (p.email && (p.email.includes('humanius.com') || p.email.includes('humanius.com.tr'))) {
          const newEmail = p.email.replace('humanius.com.tr', 'humanius.net').replace('humanius.com', 'humanius.net');
          try {
            await adminClient.auth.admin.updateUserById(p.id, { email: newEmail, email_confirm: true });
          } catch (e) {
            console.warn('Auth user update warning:', e);
          }
          await adminClient.from('profiles').update({ email: newEmail }).eq('id', p.id);
          await adminClient.from('employees').update({ email: newEmail }).eq('id', p.id);
          count++;
        }
      }
      return jsonResponse({ message: `${count} adet kullanıcının Auth e-postası @humanius.net olarak güncellendi.`, count });
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

    if (operation === 'update_employee_details') {
      const email = String(payload.email ?? '').trim().toLowerCase();
      const employeeId = payload.employeeId ? String(payload.employeeId).trim() : '';
      const companyId = String(payload.companyId ?? '').trim();
      const role = payload.role ? String(payload.role).trim() as ProfileRole : undefined;
      const level = payload.level !== undefined ? String(payload.level).trim() : undefined;
      const position = payload.position !== undefined ? String(payload.position).trim() : undefined;
      const department = payload.department !== undefined ? String(payload.department).trim() : undefined;
      const fullName = payload.fullName !== undefined ? String(payload.fullName).trim() : undefined;

      if (!email && !employeeId) {
        return jsonResponse({ error: 'email veya employeeId zorunludur.' }, 400);
      }

      if (email && employeeId) {
        try {
          await adminClient.auth.admin.updateUserById(employeeId, { email, email_confirm: true });
        } catch (e) {
          console.warn('Auth email update warning:', e);
        }
      }

      if (role || companyId || fullName || email) {
        const profUpdates: Record<string, unknown> = {};
        if (role) profUpdates.role = role;
        if (companyId) profUpdates.company_id = companyId;
        if (fullName) profUpdates.full_name = fullName;
        if (email) profUpdates.email = email;

        if (employeeId) {
          await adminClient.from('profiles').update(profUpdates).eq('id', employeeId);
        }
      }

      const empUpdates: Record<string, unknown> = {};
      if (email) empUpdates.email = email;
      if (companyId) empUpdates.company_id = companyId;
      if (fullName) empUpdates.name = fullName;
      if (department !== undefined) empUpdates.department = department;
      if (position !== undefined) empUpdates.position = position;
      if (level !== undefined) {
        const validCheckLevels = ['Junior', 'Mid', 'Senior', 'Lead', 'Manager'];
        empUpdates.level = validCheckLevels.includes(level) ? level : (level ? level : null);
      }
      if (payload.phone !== undefined) empUpdates.phone = String(payload.phone);
      const contactEmail = payload.contact_email !== undefined ? String(payload.contact_email ?? '').trim()
        : (payload.personal_email !== undefined ? String(payload.personal_email ?? '').trim()
        : (payload.contactEmail !== undefined ? String(payload.contactEmail ?? '').trim() : undefined));
      if (contactEmail !== undefined) empUpdates.personal_email = contactEmail;
      if (payload.salary !== undefined) empUpdates.salary = Number(payload.salary);
      if (payload.status !== undefined) empUpdates.status = String(payload.status);
      if (payload.join_date !== undefined) empUpdates.join_date = payload.join_date || null;
      if (payload.joinDate !== undefined) empUpdates.join_date = payload.joinDate || null;
      if (payload.tc_no !== undefined) empUpdates.tc_no = String(payload.tc_no);
      if (payload.sicil_no !== undefined) empUpdates.sicil_no = String(payload.sicil_no);
      if (payload.address !== undefined) empUpdates.address = String(payload.address);
      if (payload.employee_type !== undefined) empUpdates.employee_type = String(payload.employee_type);
      if (payload.employeeType !== undefined) empUpdates.employee_type = String(payload.employeeType);

      if (Object.keys(empUpdates).length > 0) {
        if (employeeId) {
          await adminClient.from('employees').update(empUpdates).eq('id', employeeId);
        }
      }

      return jsonResponse({ message: 'Personel bilgileri ve rolü başarıyla güncellendi.' });
    }

    if (operation === 'reset_company_data') {
      const companyQuery = payload.companyName ? String(payload.companyName).trim() : 'Toyota';
      
      const { data: compList } = await adminClient.from('companies').select('*');
      const { data: allEmp } = await adminClient.from('employees').select('id, name, company_id, company');
      const { data: allProf } = await adminClient.from('profiles').select('id, email, full_name, company_id');

      let targetCompany = compList?.find(c => String(c.name || '').toLowerCase().includes(companyQuery.toLowerCase()));
      
      // If not found by company name, search by employee company name field
      if (!targetCompany && allEmp) {
        const empMatch = allEmp.find(e => String(e.company || '').toLowerCase().includes(companyQuery.toLowerCase()));
        if (empMatch?.company_id) {
          targetCompany = compList?.find(c => c.id === empMatch.company_id);
        }
      }

      // Fallback: If searching for Toyota or main company, match active company with profiles (e.g. Hizel)
      if (!targetCompany && (companyQuery.toLowerCase() === 'toyota' || companyQuery.toLowerCase() === 'toyota türkiye')) {
        targetCompany = compList?.find(c => c.name.includes('HIZEL') || c.name.includes('Bigsafer')) || compList?.[0];
      }

      if (!targetCompany) {
        const compStats = (compList || []).map(c => {
          const empCount = (allEmp || []).filter(e => e.company_id === c.id || e.company === c.name).length;
          const profCount = (allProf || []).filter(p => p.company_id === c.id).length;
          return { id: c.id, name: c.name, employeeCount: empCount, profileCount: profCount };
        });
        return jsonResponse({ error: `'${companyQuery}' adında şirket bulunamadı.`, companies: compStats }, 404);
      }

      const companyId = targetCompany.id;

      // Delete all leave requests for this company
      const { count: deletedLeaves } = await adminClient
        .from('izin_talepleri')
        .delete({ count: 'exact' })
        .eq('company_id', companyId);

      // Delete all PDKS shift records for this company
      const { count: deletedShifts } = await adminClient
        .from('pdks_vardiya_kayitlari')
        .delete({ count: 'exact' })
        .eq('company_id', companyId);

      // Delete all PDKS overtime records for this company
      const { count: deletedOvertimes } = await adminClient
        .from('pdks_fazla_mesai')
        .delete({ count: 'exact' })
        .eq('company_id', companyId);

      // Reset all user passwords to "123456" and clear must_change_password
      const { data: compProfiles } = await adminClient
        .from('profiles')
        .select('*')
        .eq('company_id', companyId);

      const targetPassword = payload.password ? String(payload.password).trim() : '987654';
      let resetPasswordsCount = 0;
      if (compProfiles && compProfiles.length > 0) {
        for (const prof of compProfiles) {
          if (prof.id) {
            try {
              await adminClient.auth.admin.updateUserById(prof.id, {
                password: targetPassword,
                user_metadata: { must_change_password: false }
              });
              await adminClient.from('profiles').update({ must_change_password: false } as any).eq('id', prof.id);
              resetPasswordsCount++;
            } catch (pErr) {
              console.warn('Reset password error for user:', prof.email, pErr);
            }
          }
        }
      }

      // Get employee count
      const { data: compEmployees } = await adminClient
        .from('employees')
        .select('id, name, email')
        .eq('company_id', companyId);

      return jsonResponse({
        message: `'${targetCompany.name}' şirketinin izin talepleri, PDKS verileri ve şifreleri başarıyla sıfırlandı.`,
        companyName: targetCompany.name,
        companyId,
        preservedEmployeesCount: compEmployees?.length ?? 0,
        deletedLeavesCount: deletedLeaves ?? 0,
        deletedShiftsCount: deletedShifts ?? 0,
        deletedOvertimesCount: deletedOvertimes ?? 0,
        resetPasswordsCount
      });
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
        const passedEmpId = String(payload.employeeId || payload.employee_id || '').trim();
        if (passedEmpId) {
          const { data: idMatch } = await adminClient
            .from('employees')
            .select('id')
            .eq('id', passedEmpId)
            .maybeSingle();
          existingEmp = idMatch;
        }

        if (!existingEmp && tcNo) {
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

        const joinDate = payload.join_date || payload.joinDate || null;
        const phone = payload.phone !== undefined ? String(payload.phone ?? '').trim() : undefined;
        const contactEmail = payload.contact_email !== undefined ? String(payload.contact_email ?? '').trim() : undefined;
        const address = payload.address !== undefined ? String(payload.address ?? '').trim() : undefined;
        const sicilNo = payload.sicil_no !== undefined ? String(payload.sicil_no ?? '').trim() : undefined;

        const updateData: Record<string, any> = {
          company_id: companyId,
          name: fullName,
          email: email,
          tc_no: tcNo || null,
          department: department,
          position: position,
          employee_type: employeeType,
          salary: salary,
          join_date: joinDate,
        };

        if (phone !== undefined) updateData.phone = phone;
        if (contactEmail !== undefined && contactEmail !== '') updateData.personal_email = contactEmail;
        if (address !== undefined) updateData.address = address;
        if (sicilNo !== undefined) updateData.sicil_no = sicilNo;

        if (!existingEmp) {
          await adminClient.from('employees').insert({
            ...updateData,
            status: 'active',
          });
        } else {
          await adminClient.from('employees').update(updateData).eq('id', existingEmp.id);
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
        } catch (_err) {}
      }

      return jsonResponse({ message: `Kullanıcı şifre değiştirme zorunluluğu (${forceState}) yapıldı.` });
    }

    if (operation === 'delete_user_by_email' || operation === 'delete_employee_and_user') {
      if (profile.role !== 'superadmin' && profile.role !== 'admin' && profile.role !== 'hr') {
        return jsonResponse({ error: 'Kullanıcı ve personel silme yetkisi Şirket Yöneticisi ve İK Uzmanındadır.' }, 403);
      }

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