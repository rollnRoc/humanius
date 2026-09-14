-- Migration: Add saturday working hours columns to company_shifts table
ALTER TABLE public.company_shifts ADD COLUMN IF NOT EXISTS saturday_start_time text;
ALTER TABLE public.company_shifts ADD COLUMN IF NOT EXISTS saturday_end_time text;
ALTER TABLE public.company_shifts ADD COLUMN IF NOT EXISTS saturday_break_minutes integer DEFAULT 30;
