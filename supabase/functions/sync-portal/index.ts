import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Api-Key, x-api-key",
};

const SYNC_API_KEY = Deno.env.get('SYNC_API_KEY') || 'SuperSecretSyncApiKey123!';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables for sync-portal function');
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // 1. API Key Doğrulaması (X-Api-Key)
  const apiKeyHeader = req.headers.get('X-Api-Key') || req.headers.get('x-api-key') || '';
  if (apiKeyHeader !== SYNC_API_KEY) {
    return jsonResponse({ success: false, error: 'Unauthorized: Geçersiz veya eksik X-Api-Key' }, 401);
  }

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  try {
    // -------------------------------------------------------------
    // FIRMA SENKRONİZASYONU (/company veya /api/sync/company)
    // -------------------------------------------------------------
    if (path.includes('/company')) {
      const pathParts = path.split('/').filter(Boolean);
      const isParamId = pathParts[pathParts.length - 1] !== 'company';
      const paramId = isParamId ? pathParts[pathParts.length - 1] : null;

      if (method === 'DELETE') {
        const idToDelete = paramId || (await req.json().catch(() => ({}))).id;
        if (!idToDelete) {
          return jsonResponse({ success: false, error: 'Silinecek firma id bilgisi bulunamadı' }, 400);
        }

        const { error } = await adminClient
          .from('companies')
          .delete()
          .or(`tax_number.eq.${idToDelete},name.eq.${idToDelete}`);

        if (error) {
          return jsonResponse({ success: false, error: error.message }, 500);
        }

        return jsonResponse({ success: true, message: `Firma (${idToDelete}) başarıyla silindi.` });
      }

      if (method === 'POST' || method === 'PUT') {
        const body = await req.json();
        const name = body.name || '';
        const email = body.email || '';
        const vergino = body.vergino || body.tax_number || '';
        const yetkili = body.yetkili || '';

        if (!name) {
          return jsonResponse({ success: false, error: 'Firma adı (name) zorunludur' }, 400);
        }

        // Mevcut firmayı sorgula
        let existingCompany = null;
        if (vergino) {
          const { data } = await adminClient
            .from('companies')
            .select('id')
            .eq('tax_number', vergino)
            .maybeSingle();
          existingCompany = data;
        }

        if (!existingCompany && email) {
          const { data } = await adminClient
            .from('companies')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          existingCompany = data;
        }

        let companyId = existingCompany?.id;

        if (companyId) {
          // Firma Güncelleme
          const { error } = await adminClient
            .from('companies')
            .update({
              name,
              email: email || undefined,
              tax_number: vergino || undefined,
              updated_at: new Date().toISOString()
            })
            .eq('id', companyId);

          if (error) return jsonResponse({ success: false, error: error.message }, 500);

          return jsonResponse({
            success: true,
            action: 'updated',
            company_id: companyId,
            message: 'Firma başarıyla güncellendi'
          });
        } else {
          // Firma Ekleme
          const { data, error } = await adminClient
            .from('companies')
            .insert({
              name,
              email,
              tax_number: vergino,
              address: '',
              city: ''
            })
            .select('id')
            .single();

          if (error) return jsonResponse({ success: false, error: error.message }, 500);

          return jsonResponse({
            success: true,
            action: 'created',
            company_id: data.id,
            message: 'Firma başarıyla oluşturuldu'
          });
        }
      }
    }

    // -------------------------------------------------------------
    // KULLANICI SENKRONİZASYONU (/user veya /api/sync/user)
    // -------------------------------------------------------------
    if (path.includes('/user')) {
      const pathParts = path.split('/').filter(Boolean);
      const isParamId = pathParts[pathParts.length - 1] !== 'user';
      const paramId = isParamId ? pathParts[pathParts.length - 1] : null;

      if (method === 'DELETE') {
        const idToDelete = paramId || (await req.json().catch(() => ({}))).id;
        if (!idToDelete) {
          return jsonResponse({ success: false, error: 'Silinecek kullanıcı id/tcNo/email bilgisi bulunamadı' }, 400);
        }

        // Önce çalışan kaydını bulalım
        const { data: empData } = await adminClient
          .from('employees')
          .select('id, email, tc_no')
          .or(`tc_no.eq.${idToDelete},email.eq.${idToDelete},id.eq.${idToDelete}`)
          .maybeSingle();

        const emailToDelete = empData?.email || (idToDelete.includes('@') ? idToDelete : null);

        if (emailToDelete) {
          // Auth kullanıcısını sil
          const { data: usersData } = await adminClient.auth.admin.listUsers();
          const targetUser = usersData.users.find(u => u.email === emailToDelete);
          if (targetUser) {
            await adminClient.auth.admin.deleteUser(targetUser.id);
          }
        }

        if (empData?.id) {
          await adminClient.from('employees').delete().eq('id', empData.id);
        }

        return jsonResponse({ success: true, message: `Kullanıcı (${idToDelete}) ve detayları başarıyla silindi.` });
      }

      if (method === 'POST' || method === 'PUT') {
        const body = await req.json();

        // Esnek Model Parsing (Portal modelini destekler)
        const userObj = body.user || body;
        const detailsObj = body.userDetails || body.user_details || {};

        const portalCompanyId = userObj.companyId || userObj.companiyid || 1;
        const firstName = userObj.name || userObj.first_name || '';
        const lastName = userObj.lastname || userObj.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || userObj.full_name || 'Portal Kullanıcısı';
        const email = userObj.email || '';
        const password = userObj.password || 'Humanius2026!';
        const phone = userObj.tel || userObj.phone || '';

        const tcNo = detailsObj.tcNo || detailsObj.tc_no || '';
        const cinsiyet = detailsObj.cinsiyet || '';
        const adres = detailsObj.adres || detailsObj.address || '';

        if (!email) {
          return jsonResponse({ success: false, error: 'Kullanıcı e-postası (email) zorunludur' }, 400);
        }

        // Varsayılan ilk şirketi bul veya ilk aktif şirketi bağla
        let companyId = null;
        const { data: compList } = await adminClient.from('companies').select('id').limit(1);
        if (compList && compList.length > 0) {
          companyId = compList[0].id;
        }

        if (!companyId) {
          return jsonResponse({ success: false, error: 'Sistemde kayıtlı aktif bir şirket bulunamadı' }, 400);
        }

        // 1. Auth kullanıcısı var mı sorgula
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        let authUser = usersData.users.find(u => u.email === email);

        if (!authUser) {
          // Yeni Auth kullanıcısı oluştur
          const { data: newAuth, error: createAuthErr } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
          });

          if (createAuthErr) {
            return jsonResponse({ success: false, error: `Auth kullanıcısı oluşturulamadı: ${createAuthErr.message}` }, 500);
          }
          authUser = newAuth.user;
        }

        // 2. Profile kaydını güncelle / ekle
        const { error: profileErr } = await adminClient
          .from('profiles')
          .upsert({
            id: authUser.id,
            email,
            full_name: fullName,
            company_id: companyId,
            role: 'employee',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (profileErr) {
          return jsonResponse({ success: false, error: `Profil oluşturulamadı: ${profileErr.message}` }, 500);
        }

        // 3. Employee (Özlük) kaydını güncelle / ekle
        let existingEmp = null;
        if (tcNo) {
          const { data } = await adminClient.from('employees').select('id').eq('tc_no', tcNo).maybeSingle();
          existingEmp = data;
        }
        if (!existingEmp) {
          const { data } = await adminClient.from('employees').select('id').eq('email', email).maybeSingle();
          existingEmp = data;
        }

        if (existingEmp) {
          await adminClient.from('employees').update({
            name: fullName,
            phone,
            address: adres,
            updated_at: new Date().toISOString()
          }).eq('id', existingEmp.id);
        } else {
          await adminClient.from('employees').insert({
            company_id: companyId,
            name: fullName,
            tc_no: tcNo,
            email,
            phone,
            address: adres,
            department: 'Genel',
            position: 'Personel',
            status: 'active'
          });
        }

        return jsonResponse({
          success: true,
          action: authUser ? 'synced' : 'created',
          user_id: authUser.id,
          email,
          full_name: fullName,
          message: 'Kullanıcı ve özlük detayları başarıyla senkronize edildi.'
        });
      }
    }

    return jsonResponse({
      success: true,
      service: 'Humanius Portal Sync API',
      version: '1.0.0',
      message: 'API aktif ve dinlemede.'
    });

  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || 'Sunucu içi bir hata oluştu' }, 500);
  }
});
