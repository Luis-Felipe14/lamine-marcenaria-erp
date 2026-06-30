-- Bucket para fotos de materiais (upload pelo ERP)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'material-images',
  'material-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "material_images_select" ON storage.objects;
DROP POLICY IF EXISTS "material_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "material_images_update" ON storage.objects;
DROP POLICY IF EXISTS "material_images_delete" ON storage.objects;

CREATE POLICY "material_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'material-images');

CREATE POLICY "material_images_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'material-images');

CREATE POLICY "material_images_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'material-images');

CREATE POLICY "material_images_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'material-images');
