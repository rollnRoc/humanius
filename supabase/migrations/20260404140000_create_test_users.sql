-- Test kullanicilarini ve sirket verisini olustur
-- Supabase SQL Editor'da calistirin

-- 1. Test sirketi olustur
INSERT INTO public.companies (id, name, address, tax_number, city, email, phone)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Humanius Demo Şirketi',
  'Maslak Mah. Büyükdere Cad. No:1 Sarıyer',
  '1234567890',
  'İstanbul',
  'info@demo.com',
  '02121234567'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Auth kullanicilari olustur (sifre: 123456)
-- NOT: confirmation_token / recovery_token yeni Supabase versiyonlarinda yok
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token
)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000000',
    'test@test.com',
    crypt('123456', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Admin"}',
    'authenticated', 'authenticated',
    false,
    '', '', '', '', '', '', '', ''
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000000',
    'bilgtest@test.com',
    crypt('123456', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Bilg Test"}',
    'authenticated', 'authenticated',
    false,
    '', '', '', '', '', '', '', ''
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000000',
    'bhv@test.com',
    crypt('123456', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"BHV Kullanici"}',
    'authenticated', 'authenticated',
    false,
    '', '', '', '', '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- 3. auth.identities kayitlari olustur (email login icin gerekli)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000101',
    'aaaaaaaa-0000-0000-0000-000000000101',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000101","email":"test@test.com"}',
    'email',
    'test@test.com',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000102',
    'aaaaaaaa-0000-0000-0000-000000000102',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000102","email":"bilgtest@test.com"}',
    'email',
    'bilgtest@test.com',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000103',
    'aaaaaaaa-0000-0000-0000-000000000103',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000103","email":"bhv@test.com"}',
    'email',
    'bhv@test.com',
    now(), now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Profilleri olustur
INSERT INTO public.profiles (id, email, full_name, company_id, role)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000101',
    'test@test.com',
    'Test Admin',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'admin'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000102',
    'bilgtest@test.com',
    'Bilg Test',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'hr'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000103',
    'bhv@test.com',
    'BHV Kullanıcı',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'employee'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Ornek calisan ekle
INSERT INTO public.employees (
  id, company_id, name, tc_no, sicil_no,
  department, position, level, salary,
  status, email, join_date, medeni_durum, cocuk_sayisi
)
VALUES
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Ahmet Yılmaz', '12345678901', 'EMP001',
    'Yazılım', 'Kıdemli Geliştirici', 'Senior', 75000,
    'active', 'ahmet@humanius.net', '2022-01-15', 'evli', 2
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Ayşe Kaya', '98765432109', 'EMP002',
    'İnsan Kaynakları', 'İK Uzmanı', 'Mid', 55000,
    'active', 'ayse@humanius.net', '2023-03-01', 'bekar', 0
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Mehmet Demir', '11223344556', 'EMP003',
    'Muhasebe', 'Muhasebe Müdürü', 'Senior', 85000,
    'active', 'mehmet@demo.com', '2021-06-10', 'evli', 1
  )
ON CONFLICT (id) DO NOTHING;

-- Ozet ve dogrulama
SELECT 'Auth users:' AS kontrol, id, email FROM auth.users WHERE email IN ('test@test.com','bilgtest@test.com','bhv@test.com');
SELECT 'Profiles:' AS kontrol, email, role FROM public.profiles WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SELECT 'Employees:' AS kontrol, name, department, position FROM public.employees WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000001';

