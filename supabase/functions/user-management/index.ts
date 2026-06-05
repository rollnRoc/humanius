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
      if (!['superadmin', 'admin', 'hr'].includes(profile.role)) {
        return jsonResponse({ error: 'Bu işlem için yetkiniz yok.' }, 403);
      }

      const fullName = String(payload.fullName ?? '').trim();
      const email = String(payload.email ?? '').trim().toLowerCase();
      const password = String(payload.password ?? '').trim();
      const requestedRole = String(payload.role ?? 'employee').trim() as ProfileRole;

      let companyId = profile.company_id;
      if (profile.role === 'superadmin') {
        companyId = String(payload.companyId ?? '').trim() || null;
      }

      if (!companyId || !fullName || !email || !password) {
        return jsonResponse({ error: 'Kullanıcı oluşturmak için tüm alanlar zorunludur.' }, 400);
      }

      const allowedRoles: ProfileRole[] = ['admin', 'manager', 'employee', 'hr', 'user'];
      let nextRole: ProfileRole = allowedRoles.includes(requestedRole) ? requestedRole : 'employee';

      // Sadece superadmin başka admin veya superadmin oluşturabilir
      if (requestedRole === 'superadmin') {
        return jsonResponse({ error: 'Süper admin rolü bu işlemle oluşturulamaz.' }, 403);
      }
      if (requestedRole === 'admin' && profile.role !== 'superadmin') {
        nextRole = 'employee';
      }
      if (profile.role === 'hr' && !['employee', 'user', 'manager', 'hr'].includes(requestedRole)) {
        nextRole = 'employee';
      }

      const managedUser = await createManagedUser(email, password, fullName);
      const { error: profileError } = await adminClient.from('profiles').insert({
        id: managedUser.id,
        email,
        full_name: fullName,
        company_id: companyId,
        role: nextRole,
      });

      if (profileError) throw profileError;

      return jsonResponse({ message: 'Kullanıcı hesabı oluşturuldu.', userId: managedUser.id });
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

    return jsonResponse({ error: 'Bilinmeyen işlem.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu';
    return jsonResponse({ error: message }, 500);
  }
});