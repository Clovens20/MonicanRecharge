-- Photo optionnelle pour avis landing (fichier dans Storage).
ALTER TABLE public.avis_landing
ADD COLUMN IF NOT EXISTS foto_path text;

COMMENT ON COLUMN public.avis_landing.foto_path IS 'Chemin Storage bucket avis_landing_photos (ex. reviews/uuid.jpg).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avis_landing_photos',
  'avis_landing_photos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avis_landing_photos_public_read" ON storage.objects;
CREATE POLICY "avis_landing_photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avis_landing_photos');
