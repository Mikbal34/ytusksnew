-- Storage bucket policies for etkinlik-belgeleri
-- Run these in the Supabase SQL Editor

-- First, make sure the bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('etkinlik-belgeleri', 'etkinlik-belgeleri', false) 
ON CONFLICT (id) DO NOTHING;

-- Policy for any authenticated user to read files
CREATE POLICY "Authenticated users can read files" ON storage.objects
FOR SELECT
USING (
  auth.role() = 'authenticated' AND 
  bucket_id = 'etkinlik-belgeleri'
);

-- Policy for kulup_baskani to upload files for their own clubs
CREATE POLICY "Kulup baskani can upload files" ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'etkinlik-belgeleri' AND
  (
    -- Kulup başkanlarının kendi kulüplerine ait dosyaları yüklemesine izin ver
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE 
        p.id = auth.uid() AND
        p.role = 'kulup_baskani' AND
        p.kulup_id::text = SPLIT_PART(storage.objects.name, '/', 1)
    )
  )
);

-- Policy for kulup_baskani to update their own files
CREATE POLICY "Kulup baskani can update their files" ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'etkinlik-belgeleri' AND
  (
    -- Kulup başkanlarının kendi kulüplerine ait dosyaları güncellemesine izin ver
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE 
        p.id = auth.uid() AND
        p.role = 'kulup_baskani' AND
        p.kulup_id::text = SPLIT_PART(storage.objects.name, '/', 1)
    )
  )
);

-- Policy for kulup_baskani to delete their own files
CREATE POLICY "Kulup baskani can delete their files" ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'etkinlik-belgeleri' AND
  (
    -- Kulup başkanlarının kendi kulüplerine ait dosyaları silmesine izin ver
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE 
        p.id = auth.uid() AND
        p.role = 'kulup_baskani' AND
        p.kulup_id::text = SPLIT_PART(storage.objects.name, '/', 1)
    )
  )
);

-- Policy for SKS admins to have full access
CREATE POLICY "SKS admins have full access" ON storage.objects
FOR ALL
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'etkinlik-belgeleri' AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE 
      p.id = auth.uid() AND
      p.role = 'sks'
  )
);

-- Policy for academic advisors to read files for their clubs
CREATE POLICY "Academic advisors can read their club files" ON storage.objects
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'etkinlik-belgeleri' AND
  (
    -- Akademik danışmanların danışmanlık yaptığı kulüplere ait dosyaları görmesine izin ver
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN kulupler k ON k.akademik_danisman_id = p.danisman_id
      WHERE 
        p.id = auth.uid() AND
        p.role = 'danisman' AND
        k.id::text = SPLIT_PART(storage.objects.name, '/', 1)
    )
  )
); 