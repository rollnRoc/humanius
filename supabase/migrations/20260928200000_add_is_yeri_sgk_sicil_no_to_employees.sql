/*
  # Personel Tablosuna İş Yeri SGK Sicil Numarası Kolonunun Eklenmesi

  1. Değişiklikler:
    - `employees` tablosuna `is_yeri_sgk_sicil_no` (text, DEFAULT '') kolonu eklenir.
*/

ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS is_yeri_sgk_sicil_no text DEFAULT '';
