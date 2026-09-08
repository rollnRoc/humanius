/*
  # Personel Tablosuna İl ve İlçe Kolonlarının Eklenmesi

  1. Değişiklikler:
    - `employees` tablosuna `il` (text, DEFAULT '') ve `ilce` (text, DEFAULT '') kolonları eklenir.
*/

ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS il text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ilce text DEFAULT '';
