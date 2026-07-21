CREATE EXTENSION IF NOT EXISTS http;

CREATE OR REPLACE FUNCTION public.forward_db_changes_to_sync_portal()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  api_key text := 'SuperSecretSyncApiKey123!';
  anon_key text := 'sb_publishable_wxlAHN7E63-NbwFiVhJBeA_F3PYc3w-';
BEGIN
  -- Eğer güncellemeyi zaten service_role (sync API'miz) yaptıysa sonsuz döngü olmasın diye çık
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE row_to_json(NEW)::jsonb END,
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END
  );

  -- Edge Function'ı tetikle
  BEGIN
    PERFORM http((
      'POST',
      'https://gfbtjdedaoleqhrlebof.supabase.co/functions/v1/sync-portal',
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('X-Api-Key', api_key),
        http_header('apikey', anon_key),
        http_header('Authorization', 'Bearer ' || anon_key)
      ],
      payload::text,
      '10000'
    )::http_request);
  EXCEPTION WHEN OTHERS THEN
    -- Webhook başarısız olsa bile ana veritabanı işleminin kilitlenmemesi için hatayı yutalım
    RAISE WARNING 'Sync Webhook hatası: %', SQLERRM;
  END;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tetikleyicileri (Triggers) tanımlayalım
DROP TRIGGER IF EXISTS trg_sync_companies_to_portal ON public.companies;
CREATE TRIGGER trg_sync_companies_to_portal
AFTER INSERT OR UPDATE OR DELETE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.forward_db_changes_to_sync_portal();

DROP TRIGGER IF EXISTS trg_sync_employees_to_portal ON public.employees;
CREATE TRIGGER trg_sync_employees_to_portal
AFTER INSERT OR UPDATE OR DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.forward_db_changes_to_sync_portal();
