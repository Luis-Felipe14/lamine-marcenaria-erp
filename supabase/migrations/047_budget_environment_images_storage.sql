-- Bucket para fotos dos ambientes do orçamento (proposta PDF)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'budget-environment-images',
  'budget-environment-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "budget_env_images_select" ON storage.objects;
DROP POLICY IF EXISTS "budget_env_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "budget_env_images_update" ON storage.objects;
DROP POLICY IF EXISTS "budget_env_images_delete" ON storage.objects;

CREATE POLICY "budget_env_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'budget-environment-images');

CREATE POLICY "budget_env_images_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'budget-environment-images');

CREATE POLICY "budget_env_images_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'budget-environment-images');

CREATE POLICY "budget_env_images_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'budget-environment-images');
