-- Vídeo e assets da tela de login (leitura pública; upload por administradores)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'login-assets',
  'login-assets',
  true,
  262144000,
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "login_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "login_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "login_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "login_assets_delete" ON storage.objects;

CREATE POLICY "login_assets_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'login-assets');

CREATE POLICY "login_assets_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'login-assets'
    AND (public.is_system_admin() OR public.is_admin())
  );

CREATE POLICY "login_assets_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'login-assets'
    AND (public.is_system_admin() OR public.is_admin())
  );

CREATE POLICY "login_assets_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'login-assets'
    AND (public.is_system_admin() OR public.is_admin())
  );
