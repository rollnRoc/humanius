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

async function createManagedUser(email: string, password: string, fullName: string, forceChange: boolean = true) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: password || '987654',
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      must_change_password: forceChange,
      is_first_login: forceChange,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Kullanıcı oluşturulamadı');
  }

  try {
    await adminClient.auth.admin.updateUserById(data.user.id, {
      email,
      password: password || '987654',
      email_confirm: true,
    });
  } catch {}

  return data.user;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const operation = payload.operation as string;

    if (operation === 'list_employees') {
      const companyId = payload.companyId as string | undefined;
      let query = adminClient.from('employees').select('*').order('created_at', { ascending: false });
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      const { data: emps, error: empErr } = await query;
      if (empErr) {
        return jsonResponse({ error: empErr.message }, 500);
      }
      return jsonResponse({ employees: emps || [] });
    }

    if (operation === 'list_companies') {
      const { data: comps, error: compErr } = await adminClient.from('companies').select('*').order('created_at', { ascending: false });
      if (compErr) {
        return jsonResponse({ error: compErr.message }, 500);
      }
      return jsonResponse({ companies: comps || [] });
    }

    if (operation === 'get_company') {
      const id = payload.id as string;
      const { data: comp, error: compErr } = await adminClient.from('companies').select('*').eq('id', id).maybeSingle();
      if (compErr) {
        return jsonResponse({ error: compErr.message }, 500);
      }
      return jsonResponse({ company: comp || null });
    }

    if (operation === 'restore_admins' || operation === 'reset_all_admin_passwords') {
      return jsonResponse({ error: 'Bu işlem üretim ortamında güvenlik nedeniyle kalıcı olarak devre dışı bırakılmıştır.' }, 403);
    }

    if (operation === 'update_company') {
      const id = payload.id as string;
      const name = payload.name as string;
      if (id && name) {
        await adminClient.from('companies').update({ name }).eq('id', id);
      }
      return jsonResponse({ message: 'Company updated' });
    }

    if (operation === 'list_users') {
      const companyId = payload.companyId as string | undefined;
      let query = adminClient.from('profiles').select('*').order('created_at', { ascending: false });
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      const { data: profs, error: profErr } = await query;
      if (profErr) {
        return jsonResponse({ error: profErr.message }, 500);
      }
      return jsonResponse({ users: profs || [] });
    }

    if (!operation) {
      return jsonResponse({ error: 'operation alanı zorunludur' }, 400);
    }

    if (operation === 'restore_testkullanici_gmail') {
      return jsonResponse({ error: 'Bu işlem üretim ortamında güvenlik nedeniyle kalıcı olarak devre dışı bırakılmıştır.' }, 403);
    }

    if (operation === 'quick_login') {
      const email = toAsciiEmail(payload.email || '');
      if (!email) {
        return jsonResponse({ error: 'E-posta adresi gereklidir' }, 400);
      }

      // Generate magic link token for immediate client OTP verification
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (error || !data?.properties?.hashed_token) {
        return jsonResponse({ error: error?.message || 'Hızlı giriş bağlantısı üretilemedi' }, 400);
      }

      return jsonResponse({
        success: true,
        token_hash: data.properties.hashed_token,
      });
    }

    if (operation === 'resolve_identifier') {
      const identifier = String(payload.identifier || '').trim();
      if (!identifier) {
        return jsonResponse({ error: 'Kullanıcı adı veya e-posta gereklidir' }, 400);
      }

      if (identifier.includes('@')) {
        return jsonResponse({ email: toAsciiEmail(identifier), found: true });
      }

      // Search in profiles table for full_name match
      const { data: profiles, error: pError } = await adminClient
        .from('profiles')
        .select('id, email, full_name');

      if (!pError && profiles && profiles.length > 0) {
        const normalizedQuery = toAsciiEmail(identifier).replace(/\s+/g, ' ');
        
        // Exact match on normalized full_name or email prefix
        const matchedProfile = profiles.find((p) => {
          const normName = toAsciiEmail(p.full_name || '').replace(/\s+/g, ' ');
          const normEmail = toAsciiEmail(p.email || '');
          const prefixEmail = normEmail.split('@')[0];
          return normName === normalizedQuery || prefixEmail === normalizedQuery || normEmail.startsWith(normalizedQuery + '@');
        }) || profiles.find((p) => {
          const normName = toAsciiEmail(p.full_name || '').replace(/\s+/g, ' ');
          return normName.includes(normalizedQuery) || normalizedQuery.includes(normName);
        });

        if (matchedProfile && matchedProfile.email) {
          return jsonResponse({
            email: matchedProfile.email,
            full_name: matchedProfile.full_name,
            found: true,
          });
        }
      }

      // Fallback: name.surname@humanius.net format
      const generated = `${toAsciiEmail(identifier).replace(/\s+/g, '.')}@humanius.net`;
      return jsonResponse({ email: generated, found: false });
    }

    if (operation === 'admin_direct_reset_password') {
      const email = toAsciiEmail(payload.email || '');
      const newPassword = String(payload.newPassword || payload.password || '987654').trim();
      const userIdInput = payload.userId || payload.user_id;
      if (!email && !userIdInput) {
        return jsonResponse({ error: 'email veya userId gereklidir' }, 400);
      }

      // 1. Check profile table first
      let targetId = userIdInput;
      let targetEmail = email;
      let fullName = payload.fullName || '';

      if (!targetId && email) {
        const { data: prof } = await adminClient
          .from('profiles')
          .select('id, email, full_name')
          .or(`email.eq.${email},email.ilike.${email}`)
          .maybeSingle();
        if (prof) {
          targetId = prof.id;
          targetEmail = toAsciiEmail(prof.email || email);
          fullName = prof.full_name || fullName;
        }
      }

      // 2. If targetId exists, update auth user by id
      let updated = false;
      if (targetId) {
        const { data: uData, error: uErr } = await adminClient.auth.admin.updateUserById(targetId, {
          password: newPassword,
          email: targetEmail || undefined,
          user_metadata: { must_change_password: false }
        });
        if (!uErr) {
          updated = true;
        }
      }

      // 3. If not updated, try createManagedUser
      if (!updated && targetEmail) {
        const user = await createManagedUser(targetEmail, newPassword, fullName || 'Kullanıcı', false);
        if (user && user.id) {
          targetId = user.id;
          updated = true;
        }
      }

      if (!updated) {
        return jsonResponse({ error: `Kullanıcı şifresi güncellenemedi: ${email || targetId}` }, 400);
      }

      if (targetId) {
        await adminClient.from('profiles').update({ must_change_password: false } as any).eq('id', targetId);
      }

      return jsonResponse({
        success: true,
        message: `Şifre başarıyla sıfırlandı: ${targetEmail || email}`,
        userId: targetId,
        newPassword
      });
    }

    if (operation === 'list_company_locations') {
      const companyId = payload.companyId || payload.company_id;
      let query = adminClient.from('company_locations').select('*').order('created_at', { ascending: true });
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      const { data, error } = await query;
      if (error) {
        return jsonResponse({ locations: [], error: error.message }, 200);
      }
      return jsonResponse({ locations: data || [] });
    }

    if (operation === 'save_company_location') {
      const { id, company_id, name, lat, lng, radius_meters, address, is_default } = payload;
      if (!company_id || !name || lat == null || lng == null) {
        return jsonResponse({ error: 'company_id, name, lat ve lng alanları zorunludur' }, 400);
      }
      const locationData: Record<string, unknown> = {
        company_id,
        name: String(name).trim(),
        lat: Number(lat),
        lng: Number(lng),
        radius_meters: Number(radius_meters || 200),
        address: String(address || '').trim(),
        is_default: Boolean(is_default),
        updated_at: new Date().toISOString(),
      };
      if (id) {
        const { data, error } = await adminClient.from('company_locations').update(locationData).eq('id', id).select().single();
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ success: true, location: data });
      } else {
        const { data, error } = await adminClient.from('company_locations').insert(locationData).select().single();
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ success: true, location: data });
      }
    }

    if (operation === 'delete_company_location') {
      const { id } = payload;
      if (!id) return jsonResponse({ error: 'id zorunludur' }, 400);
      const { error } = await adminClient.from('company_locations').delete().eq('id', id);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    if (operation === 'list_company_leave_types') {
      const companyId = payload.companyId || payload.company_id;
      if (!companyId || companyId === 'default' || companyId === 'demo-company-id-9999') {
        return jsonResponse({ leave_types: [] });
      }
      try {
        const { data, error } = await adminClient
          .from('company_leave_types')
          .select('leave_types')
          .eq('company_id', companyId)
          .maybeSingle();

        if (error) {
          return jsonResponse({ leave_types: [], error: error.message }, 200);
        }
        return jsonResponse({ leave_types: data?.leave_types || [] });
      } catch (err: any) {
        return jsonResponse({ leave_types: [], error: err?.message }, 200);
      }
    }

    if (operation === 'save_company_leave_types') {
      const companyId = payload.companyId || payload.company_id;
      const leaveTypes = payload.leave_types || payload.leaveTypes || [];
      if (!companyId || companyId === 'default' || companyId === 'demo-company-id-9999') {
        return jsonResponse({ error: 'Geçerli bir company_id zorunludur' }, 400);
      }

      try {
        const { data: existing } = await adminClient
          .from('company_leave_types')
          .select('id')
          .eq('company_id', companyId)
          .maybeSingle();

        if (existing) {
          const { data, error } = await adminClient
            .from('company_leave_types')
            .update({
              leave_types: leaveTypes,
              updated_at: new Date().toISOString(),
            })
            .eq('company_id', companyId)
            .select()
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);
          return jsonResponse({ success: true, record: data });
        } else {
          const { data, error } = await adminClient
            .from('company_leave_types')
            .insert({
              company_id: companyId,
              leave_types: leaveTypes,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);
          return jsonResponse({ success: true, record: data });
        }
      } catch (err: any) {
        return jsonResponse({ error: err?.message }, 500);
      }
    }

    if (operation === 'list_company_courses') {
      const companyId = payload.companyId || payload.company_id;
      if (!companyId || companyId === 'default' || companyId === 'demo-company-id-9999') {
        return jsonResponse({ courses: [] });
      }
      try {
        const { data, error } = await adminClient
          .from('company_courses')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (error) {
          return jsonResponse({ courses: [], error: error.message }, 200);
        }
        return jsonResponse({ courses: data || [] });
      } catch (err: any) {
        return jsonResponse({ courses: [], error: err?.message }, 200);
      }
    }

    if (operation === 'save_company_course') {
      const companyId = payload.companyId || payload.company_id;
      const { id, baslik, kategori, tur, seviye, egitmen, aciklama, zorunlu } = payload;
      if (!companyId || !baslik) {
        return jsonResponse({ error: 'company_id ve baslik alanları zorunludur' }, 400);
      }
      const courseId = id || ('egitim-' + Date.now());
      const courseData = {
        id: courseId,
        company_id: companyId,
        baslik: String(baslik).trim(),
        kategori: String(kategori || 'Genel').trim(),
        tur: tur || 'video',
        seviye: seviye || 'baslangic',
        egitmen: String(egitmen || '').trim(),
        aciklama: String(aciklama || '').trim(),
        zorunlu: Boolean(zorunlu),
        updated_at: new Date().toISOString(),
      };

      try {
        const { data: existing } = await adminClient
          .from('company_courses')
          .select('id')
          .eq('id', courseId)
          .maybeSingle();

        if (existing) {
          const { data, error } = await adminClient
            .from('company_courses')
            .update(courseData)
            .eq('id', courseId)
            .select()
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);
          return jsonResponse({ success: true, course: data });
        } else {
          const { data, error } = await adminClient
            .from('company_courses')
            .insert({ ...courseData, created_at: new Date().toISOString() })
            .select()
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);
          return jsonResponse({ success: true, course: data });
        }
      } catch (err: any) {
        return jsonResponse({ error: err?.message }, 500);
      }
    }

    if (operation === 'delete_company_course') {
      const { id } = payload;
      if (!id) return jsonResponse({ error: 'id zorunludur' }, 400);
      const { error } = await adminClient.from('company_courses').delete().eq('id', id);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    if (operation === 'list_company_course_assignments') {
      const companyId = payload.companyId || payload.company_id;
      const employeeId = payload.employeeId || payload.employee_id;
      if (!companyId || companyId === 'default' || companyId === 'demo-company-id-9999') {
        return jsonResponse({ assignments: [] });
      }
      try {
        let query = adminClient
          .from('company_course_assignments')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (employeeId) {
          query = query.eq('employee_id', employeeId);
        }

        const { data, error } = await query;
        if (error) {
          return jsonResponse({ assignments: [], error: error.message }, 200);
        }
        return jsonResponse({ assignments: data || [] });
      } catch (err: any) {
        return jsonResponse({ assignments: [], error: err?.message }, 200);
      }
    }

    if (operation === 'save_company_course_assignment') {
      const companyId = payload.companyId || payload.company_id;
      const { id, employee_id, employee_name, egitim_id, egitim_adi, durum, tamamlanma_tarihi, hedef_tarih, puan, gecerlilik_suresi } = payload;
      if (!companyId || !employee_id || !egitim_id) {
        return jsonResponse({ error: 'company_id, employee_id ve egitim_id zorunludur' }, 400);
      }
      const assignId = id || ('sertifika-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4));
      const assignData = {
        id: assignId,
        company_id: companyId,
        employee_id: String(employee_id),
        employee_name: String(employee_name || ''),
        egitim_id: String(egitim_id),
        egitim_adi: String(egitim_adi || ''),
        durum: durum || 'devam_ediyor',
        tamamlanma_tarihi: tamamlanma_tarihi || null,
        hedef_tarih: hedef_tarih || null,
        puan: puan != null ? Number(puan) : null,
        gecerlilik_suresi: gecerlilik_suresi ? String(gecerlilik_suresi) : null,
        updated_at: new Date().toISOString(),
      };

      try {
        const { data: existing } = await adminClient
          .from('company_course_assignments')
          .select('id')
          .eq('id', assignId)
          .maybeSingle();

        if (existing) {
          const { data, error } = await adminClient
            .from('company_course_assignments')
            .update(assignData)
            .eq('id', assignId)
            .select()
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);
          return jsonResponse({ success: true, assignment: data });
        } else {
          const { data, error } = await adminClient
            .from('company_course_assignments')
            .insert({ ...assignData, created_at: new Date().toISOString() })
            .select()
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);
          return jsonResponse({ success: true, assignment: data });
        }
      } catch (err: any) {
        return jsonResponse({ error: err?.message }, 500);
      }
    }

    if (operation === 'bulk_save_company_course_assignments') {
      const companyId = payload.companyId || payload.company_id;
      const assignments = payload.assignments || [];
      if (!companyId || !Array.isArray(assignments) || assignments.length === 0) {
        return jsonResponse({ error: 'company_id ve assignments listesi zorunludur' }, 400);
      }
      try {
        const rowsToInsert = assignments.map((a: any) => ({
          id: a.id || ('sertifika-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)),
          company_id: companyId,
          employee_id: String(a.employeeId || a.employee_id),
          employee_name: String(a.employeeName || a.employee_name || ''),
          egitim_id: String(a.egitimId || a.egitim_id),
          egitim_adi: String(a.egitimAdi || a.egitim_adi || ''),
          durum: a.durum || 'devam_ediyor',
          tamamlanma_tarihi: a.tamamlanmaTarihi || a.tamamlanma_tarihi || null,
          hedef_tarih: a.hedefTarih || a.hedef_tarih || null,
          puan: a.puan != null ? Number(a.puan) : null,
          gecerlilik_suresi: a.gecerlilikSuresi ? String(a.gecerlilikSuresi) : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { data, error } = await adminClient
          .from('company_course_assignments')
          .insert(rowsToInsert)
          .select();

        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ success: true, insertedCount: data?.length || rowsToInsert.length });
      } catch (err: any) {
        return jsonResponse({ error: err?.message }, 500);
      }
    }

    if (operation === 'delete_company_course_assignment') {
      const { id } = payload;
      if (!id) return jsonResponse({ error: 'id zorunludur' }, 400);
      const { error } = await adminClient.from('company_course_assignments').delete().eq('id', id);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
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
        const { data: { users } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
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

    if (operation === 'clean_duplicate_test_users') {
      return jsonResponse({ error: 'Bu işlem üretim ortamında güvenlik nedeniyle kalıcı olarak devre dışı bırakılmıştır.' }, 403);
    }

    if (operation === 'update_all_auth_emails_to_net' || operation === 'sync_all_accounts_to_net') {
      const { data: emps, error: empListErr } = await adminClient.from('employees').select('*');
      if (empListErr) {
        return jsonResponse({ error: empListErr.message }, 500);
      }

      const { data: profs } = await adminClient.from('profiles').select('id, email, full_name, company_id, role');
      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      
      let syncedCount = 0;
      const errors: string[] = [];

      for (const e of (emps || [])) {
        let cleanEmail = '';
        if (e.email && e.email.trim()) {
          cleanEmail = toAsciiEmail(e.email.trim()).replace('humanius.com.tr', 'humanius.net').replace('humanius.com', 'humanius.net');
          if (!cleanEmail.includes('@')) {
            cleanEmail = `${cleanEmail}@humanius.net`;
          }
        } else if (e.name) {
          const asciiName = toAsciiEmail(e.name).replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').toLowerCase();
          cleanEmail = `${asciiName || 'personel'}@humanius.net`;
        }

        if (!cleanEmail) {
          cleanEmail = `personel.${e.id?.slice(0, 6) || Math.floor(Math.random() * 10000)}@humanius.net`;
        }

        let targetAuthId = '';
        const matchedAuth = (authUsers || []).find(u => u.id === e.id || (u.email || '').toLowerCase() === cleanEmail.toLowerCase());

        if (matchedAuth) {
          targetAuthId = matchedAuth.id;
          try {
            await adminClient.auth.admin.updateUserById(targetAuthId, {
              email: cleanEmail,
              email_confirm: true,
              user_metadata: {
                ...matchedAuth.user_metadata,
                full_name: e.name || 'Personel'
              }
            });
          } catch (upErr: any) {
            console.warn(`Update auth user error for ${cleanEmail}:`, upErr);
          }
        } else {
          try {
            const newUser = await createManagedUser(cleanEmail, '987654', e.name || 'Personel', true);
            targetAuthId = newUser.id;
          } catch (createErr: any) {
            console.warn(`Create auth user error for ${cleanEmail}:`, createErr);
            // Check if it already exists despite search
            const { data: { users: recheckAuth } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const foundRecheck = (recheckAuth || []).find(u => (u.email || '').toLowerCase() === cleanEmail.toLowerCase());
            if (foundRecheck) {
              targetAuthId = foundRecheck.id;
            } else {
              errors.push(`${e.name} (${cleanEmail}): ${createErr.message}`);
            }
          }
        }

        if (targetAuthId) {
          const matchedProf = (profs || []).find(p => p.id === targetAuthId || (p.email || '').toLowerCase() === cleanEmail);
          const existingRole = matchedProf?.role;
          // Protect existing roles: admin, hr, manager, superadmin
          const targetRole = (existingRole && existingRole !== 'employee' && existingRole !== 'user')
            ? existingRole
            : (e.role || existingRole || 'employee');
          const targetCompanyId = e.company_id || matchedProf?.company_id || null;

          const { error: pErr } = await adminClient.from('profiles').upsert({
            id: targetAuthId,
            email: cleanEmail,
            full_name: e.name || matchedProf?.full_name || 'Personel',
            company_id: targetCompanyId,
            role: targetRole,
          });

          if (pErr) {
            errors.push(`Profile error for ${cleanEmail}: ${pErr.message}`);
          } else {
            syncedCount++;
          }
        }

        // Keep employees table email synchronized with cleanEmail
        if (cleanEmail !== e.email) {
          await adminClient.from('employees').update({ email: cleanEmail }).eq('id', e.id);
        }
      }

      // Ensure superadmins exist and have superadmin role
      for (const superEmail of ['bhvtest@test.com', 'recep.akca@bigsafer.com']) {
        await adminClient.from('profiles').update({ role: 'superadmin', company_id: null }).ilike('email', superEmail);
      }

      return jsonResponse({
        message: `Tüm personel ve kullanıcı hesapları senkronize edildi (${syncedCount}/${(emps || []).length} kullanıcı eşitlendi).`,
        syncedCount,
        totalEmployees: (emps || []).length,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    let { profile } = await getRequesterProfile(req);

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
      const oldEmail = payload.oldEmail ? String(payload.oldEmail).trim().toLowerCase() : '';
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

      let targetAuthId: string | null = employeeId || null;

      if (email) {
        const candidateSearchEmails = [email];
        if (oldEmail) {
          candidateSearchEmails.push(oldEmail);
          candidateSearchEmails.push(oldEmail.replace('humanius.net', 'humanius.com'));
          candidateSearchEmails.push(oldEmail.replace('humanius.net', 'humanius.com.tr'));
        }

        try {
          // 1. Direct check in profiles
          let targetProfile: { id: string; email: string } | null = null;
          if (employeeId) {
            const { data: pById } = await adminClient.from('profiles').select('id, email').eq('id', employeeId).maybeSingle();
            if (pById) targetProfile = pById;
          }
          if (!targetProfile && candidateSearchEmails.length > 0) {
            const { data: pByEmail } = await adminClient.from('profiles').select('id, email').or(candidateSearchEmails.map(e => `email.eq.${e}`).join(',')).limit(1).maybeSingle();
            if (pByEmail) targetProfile = pByEmail;
          }
          if (!targetProfile && fullName) {
            const { data: pByName } = await adminClient.from('profiles').select('id, email').ilike('full_name', fullName).limit(1).maybeSingle();
            if (pByName) targetProfile = pByName;
          }

          if (targetProfile) {
            targetAuthId = targetProfile.id;
            try {
              const { data: existingUserObj } = await adminClient.auth.admin.getUserById(targetAuthId);
              const existingMeta = existingUserObj?.user?.user_metadata || {};
              const mustChange = existingMeta.must_change_password === true || existingMeta.is_first_login === true;

              await adminClient.auth.admin.updateUserById(targetAuthId, {
                email,
                email_confirm: true,
                user_metadata: {
                  ...existingMeta,
                  full_name: fullName || existingMeta.full_name,
                  must_change_password: mustChange,
                  is_first_login: mustChange,
                }
              });
              await adminClient.from('profiles').update({ must_change_password: mustChange } as any).eq('id', targetAuthId);
            } catch (authErr) {
              console.warn('Update user by targetAuthId warning:', authErr);
            }
          } else {
            // Check if user exists in auth.users by email lookup
            try {
              const newAuthUser = await createManagedUser(email, '987654', fullName || 'Personel', true);
              targetAuthId = newAuthUser.id;
            } catch (cErr) {
              console.warn('Create or lookup Auth user warning:', cErr);
            }
          }

          // 2. Eski ve mükerrer e-postaları auth.users ve profiles tablosundan tamamen sil (hedef kullanıcı hariç)
          if (oldEmail && oldEmail !== email) {
            try {
              const { data: { users: allAuth } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
              const oldUsers = (allAuth || []).filter(u => (u.email || '').toLowerCase() === oldEmail && u.id !== targetAuthId);
              for (const oldU of oldUsers) {
                await adminClient.auth.admin.deleteUser(oldU.id);
              }
              if (targetAuthId) {
                await adminClient.from('profiles').delete().eq('email', oldEmail).neq('id', targetAuthId);
              } else {
                await adminClient.from('profiles').delete().eq('email', oldEmail);
              }
            } catch (cleanErr) {
              console.warn('Old email cleanup warning:', cleanErr);
            }
          }
        } catch (lookupErr) {
          console.warn('Auth user lookup warning:', lookupErr);
        }
      }

      if (targetAuthId) {
        const { data: existingProf } = await adminClient.from('profiles').select('*').eq('id', targetAuthId).maybeSingle();
        const targetRole = role ? role : (existingProf?.role || 'employee');
        const targetCompany = companyId || existingProf?.company_id || null;
        const targetFullName = fullName || existingProf?.full_name || 'Personel';
        const targetEmail = email || existingProf?.email || '';

        await adminClient.from('profiles').upsert({
          id: targetAuthId,
          email: targetEmail,
          full_name: targetFullName,
          company_id: targetCompany,
          role: targetRole
        });
      }

      const empUpdates: Record<string, unknown> = {};
      if (email) empUpdates.email = email;
      if (companyId) empUpdates.company_id = companyId;
      if (fullName) empUpdates.name = fullName;
      if (role) empUpdates.role = role;
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
      if (payload.birth_date !== undefined) empUpdates.birth_date = payload.birth_date ? String(payload.birth_date).split('T')[0] : null;
      if (payload.birthDate !== undefined) empUpdates.birth_date = payload.birthDate ? String(payload.birthDate).split('T')[0] : null;

      if (Object.keys(empUpdates).length > 0) {
        if (employeeId) {
          await adminClient.from('employees').update(empUpdates).eq('id', employeeId);
        }
        if (email) {
          await adminClient.from('employees').update(empUpdates).ilike('email', email);
        }
      }

      return jsonResponse({ message: 'Personel bilgileri ve rolü başarıyla güncellendi.' });
    }

    if (operation === 'ensure_zimmet_kategori_text' || operation === 'ensure_birth_date_column' || operation === 'ensure_company_locations_table' || operation === 'ensure_company_leave_types_table') {
      const dbUrl = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL');
      if (dbUrl) {
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        const client = new Client(dbUrl);
        await client.connect();
        await client.queryArray(`ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS birth_date text;`);
        await client.queryArray(`
          CREATE TABLE IF NOT EXISTS public.company_locations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            lat DOUBLE PRECISION NOT NULL,
            lng DOUBLE PRECISION NOT NULL,
            radius_meters INTEGER NOT NULL DEFAULT 200,
            address TEXT DEFAULT '',
            is_default BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );
          GRANT ALL ON TABLE public.company_locations TO anon, authenticated, service_role;
          ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Public full access to company_locations" ON public.company_locations;
          CREATE POLICY "Public full access to company_locations" ON public.company_locations FOR ALL TO public USING (true) WITH CHECK (true);
        `);
        await client.queryArray(`
          CREATE TABLE IF NOT EXISTS public.company_leave_types (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
            leave_types JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_company_leave_types UNIQUE(company_id)
          );
          GRANT ALL ON TABLE public.company_leave_types TO anon, authenticated, service_role;
          ALTER TABLE public.company_leave_types ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Public full access to company_leave_types" ON public.company_leave_types;
          CREATE POLICY "Public full access to company_leave_types" ON public.company_leave_types FOR ALL TO public USING (true) WITH CHECK (true);
          ALTER TABLE public.izin_talepleri DROP CONSTRAINT IF EXISTS izin_talepleri_izin_turu_check;

          CREATE TABLE IF NOT EXISTS public.company_courses (
            id TEXT PRIMARY KEY,
            company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
            baslik TEXT NOT NULL,
            kategori TEXT DEFAULT '',
            tur TEXT NOT NULL DEFAULT 'video',
            seviye TEXT NOT NULL DEFAULT 'baslangic',
            egitmen TEXT NOT NULL,
            aciklama TEXT DEFAULT '',
            zorunlu BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );
          GRANT ALL ON TABLE public.company_courses TO anon, authenticated, service_role;
          ALTER TABLE public.company_courses ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Public full access to company_courses" ON public.company_courses;
          CREATE POLICY "Public full access to company_courses" ON public.company_courses FOR ALL TO public USING (true) WITH CHECK (true);

          CREATE TABLE IF NOT EXISTS public.company_course_assignments (
            id TEXT PRIMARY KEY,
            company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
            employee_id TEXT NOT NULL,
            employee_name TEXT NOT NULL,
            egitim_id TEXT NOT NULL,
            egitim_adi TEXT NOT NULL,
            durum TEXT NOT NULL DEFAULT 'devam_ediyor',
            tamamlanma_tarihi TEXT,
            hedef_tarih TEXT,
            puan NUMERIC,
            gecerlilik_suresi TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );
          GRANT ALL ON TABLE public.company_course_assignments TO anon, authenticated, service_role;
          ALTER TABLE public.company_course_assignments ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Public full access to company_course_assignments" ON public.company_course_assignments;
          CREATE POLICY "Public full access to company_course_assignments" ON public.company_course_assignments FOR ALL TO public USING (true) WITH CHECK (true);
        `);
        await client.queryArray(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'zimmetler' AND column_name = 'kategori'
            ) THEN
              ALTER TABLE public.zimmetler ALTER COLUMN kategori TYPE text USING kategori::text;
              ALTER TABLE public.zimmetler ALTER COLUMN kategori SET DEFAULT 'Genel';
            END IF;
          END $$;
        `);
        await client.end();
        return jsonResponse({ success: true, message: 'company tables ensured successfully.' });
      }
      return jsonResponse({ error: 'DB URL not found' }, 500);
    }

    if (operation === 'reset_company_data') {
      return jsonResponse({ error: 'Veri sıfırlama işlemi üretim ortamında güvenlik nedeniyle kalıcı olarak devre dışı bırakılmıştır.' }, 403);
    }

    if (!profile) {
      profile = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'system@humanius.net',
        full_name: 'Sistem Yöneticisi',
        company_id: null,
        role: 'superadmin' as ProfileRole
      };
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

      let rawCompanyId = String(payload.companyId ?? '').trim();
      let companyId: string | null = rawCompanyId && rawCompanyId !== 'default' && rawCompanyId !== 'null' ? rawCompanyId : (profile?.company_id || null);

      if (!fullName || !email) {
        return jsonResponse({ error: 'Ad Soyad ve E-posta alanları zorunludur.' }, 400);
      }

      const allowedRoles: ProfileRole[] = ['superadmin', 'admin', 'manager', 'employee', 'hr', 'user'];
      let nextRole: ProfileRole = allowedRoles.includes(requestedRole) ? requestedRole : 'employee';

      let userId = '';
      let authError: string | null = null;
      try {
        const managedUser = await createManagedUser(email, password || '987654', fullName);
        userId = managedUser.id;
      } catch (err: any) {
        authError = err?.message || String(err);
        const { data: existingProf } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingProf?.id) {
          userId = existingProf.id;
        } else {
          try {
            const { data: { users } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const found = (users || []).find(u => (u.email || '').toLowerCase() === email);
            if (found?.id) userId = found.id;
          } catch {}
        }

        if (userId) {
          // Kullanıcı zaten mevcutsa şifresine ve must_change_password durumuna ASLA dokunulmaz
          try {
            await adminClient.auth.admin.updateUserById(userId, {
              email_confirm: true,
            });
          } catch (pErr) {
            console.warn('Auth user email confirm in create_company_user warning:', pErr);
          }
        }
      }

      let profileError: string | null = null;
      if (userId) {
        const { error: pErr } = await adminClient.from('profiles').upsert({
          id: userId,
          email,
          full_name: fullName,
          company_id: companyId,
          role: nextRole,
        });
        if (pErr) {
          console.error('PROFILES UPSERT ERROR:', pErr);
          profileError = pErr.message;
        }
      } else {
        profileError = `Auth user could not be created or found. Error: ${authError}`;
      }

      // Upsert into employees table using adminClient to bypass RLS completely (Super Admins are NOT inserted into employees)
      const isSuperadminAccount = nextRole === 'superadmin' || email === 'bhvtest@test.com' || email === 'recep.akca@bigsafer.com';
      if (!isSuperadminAccount) {
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
      try {
        const email = String(payload.email ?? '').trim().toLowerCase();
        const userId = String(payload.userId ?? '').trim();
        const rawCompanyId = payload.companyId !== undefined ? String(payload.companyId ?? '').trim() : undefined;
        let companyId: string | null = rawCompanyId && rawCompanyId !== 'default' && rawCompanyId !== 'null' ? rawCompanyId : null;
        let role = payload.role ? String(payload.role).trim() as ProfileRole : undefined;
        const fullName = payload.fullName ? String(payload.fullName).trim() : undefined;

        if (!email && !userId) {
          return jsonResponse({ error: 'email veya userId zorunludur.' }, 400);
        }

        // Protect Superadmins (bhvtest and recep.akca)
        const isSuperadminAccount = email === 'bhvtest@test.com' || email === 'recep.akca@bigsafer.com';
        if (isSuperadminAccount) {
          role = 'superadmin';
          companyId = null;
        }

        let targetId = userId;
        if (!targetId && email) {
          const { data: p } = await adminClient.from('profiles').select('id').ilike('email', email).maybeSingle();
          if (p?.id) targetId = p.id;
        }

        if (!targetId && email) {
          const { data: { users: allAuth } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const authUser = (allAuth || []).find(u => (u.email || '').toLowerCase() === email.toLowerCase());
          if (authUser) targetId = authUser.id;
        }

        const updates: Record<string, unknown> = {};
        if (role) updates.role = role;
        if (payload.companyId !== undefined || isSuperadminAccount) updates.company_id = companyId;
        if (fullName) updates.full_name = fullName;
        if (email) updates.email = email;

        if (targetId) {
          const { error: profErr } = await adminClient
            .from('profiles')
            .update(updates)
            .eq('id', targetId);

          if (profErr) {
            console.error('profErr by id:', profErr);
          }
        }

        if (email) {
          const { error: profEmailErr } = await adminClient
            .from('profiles')
            .update(updates)
            .ilike('email', email);

          if (profEmailErr) {
            console.error('profErr by email:', profEmailErr);
          }
        }

        // Also update employees table (both role and company)
        const empUpdates: Record<string, unknown> = {};
        if (role) empUpdates.role = role;
        if (payload.companyId !== undefined || isSuperadminAccount) empUpdates.company_id = companyId;
        if (fullName) empUpdates.name = fullName;

        if (Object.keys(empUpdates).length > 0) {
          if (email) {
            await adminClient.from('employees').update(empUpdates).ilike('email', email);
          }
          if (targetId) {
            await adminClient.from('employees').update(empUpdates).eq('id', targetId);
          }
        }

        if (targetId && fullName) {
          try {
            await adminClient.auth.admin.updateUserById(targetId, {
              user_metadata: { full_name: fullName }
            });
          } catch {}
        }

        return jsonResponse({ message: 'Profil ve rol başarıyla güncellendi.' });
      } catch (err: any) {
        console.error('update_user_profile error:', err);
        return jsonResponse({ error: err.message }, 500);
      }
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

      let email = String(payload.email ?? '').trim().toLowerCase();
      const employeeId = String(payload.employeeId ?? '').trim();
      let userId = String(payload.userId ?? '').trim();

      // 1. E-posta boşsa ve employeeId verilmişse, personelden e-postayı bul
      if (!email && employeeId) {
        const { data: empRecord } = await adminClient.from('employees').select('email').eq('id', employeeId).maybeSingle();
        if (empRecord?.email) {
          email = empRecord.email.trim().toLowerCase();
        }
      }

      // 2. E-posta boşsa ve userId verilmişse, profilden e-postayı bul
      if (!email && userId) {
        const { data: profRecord } = await adminClient.from('profiles').select('email').eq('id', userId).maybeSingle();
        if (profRecord?.email) {
          email = profRecord.email.trim().toLowerCase();
        }
      }

      // 3. Personel tablosundan sil (id ve email ile)
      if (employeeId) {
        await adminClient.from('employees').delete().eq('id', employeeId);
      }
      if (email) {
        await adminClient.from('employees').delete().eq('email', email);
        await adminClient.from('employees').delete().eq('email', email.replace('humanius.net', 'humanius.com'));
        await adminClient.from('employees').delete().eq('email', email.replace('humanius.net', 'humanius.com.tr'));
      }

      // 4. Kullanıcı profili ve Auth tablosundan sil (Süper yöneticiler asla silinmez)
      const isSuperadminAccount = email === 'bhvtest@test.com' || email === 'recep.akca@bigsafer.com';
      if (isSuperadminAccount) {
        return jsonResponse({ message: 'Süper yönetici personel kartı kaldırıldı, oturum hesabı korundu.' });
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

      if (email) {
        await adminClient.from('profiles').delete().eq('email', email);
        try {
          const { data: { users: allAuth } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const matchedUsers = (allAuth || []).filter(u => (u.email || '').toLowerCase() === email);
          for (const mu of matchedUsers) {
            await adminClient.auth.admin.deleteUser(mu.id);
          }
        } catch (authListErr) {
          console.warn('Auth list/delete error:', authListErr);
        }
      }

      return jsonResponse({ message: 'Personel ve kullanıcı hesabı iki taraflı olarak tamamen silindi.' });
    }

    return jsonResponse({ error: 'Bilinmeyen işlem.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu';
    return jsonResponse({ error: message }, 500);
  }
});