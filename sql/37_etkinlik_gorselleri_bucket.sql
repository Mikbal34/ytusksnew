-- Etkinlik görselleri için storage bucket oluşturma
-- Bu bucket etkinlik görsellerini (1080x1080 pixel) saklar

-- Bucket oluştur
INSERT INTO storage.buckets (id, name, public) 
VALUES ('etkinlik-gorselleri', 'etkinlik-gorselleri', true) 
ON CONFLICT (id) DO NOTHING;

-- Herkes görselleri görüntüleyebilir (public bucket)
CREATE POLICY "Herkes etkinlik görsellerini görüntüleyebilir"
ON storage.objects FOR SELECT
USING (bucket_id = 'etkinlik-gorselleri');

-- Kulüp başkanları ve adminler görsel yükleyebilir (INSERT politikası)
CREATE POLICY "Kulüp başkanları ve adminler görsel yükleyebilir"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'etkinlik-gorselleri' AND
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('kulup_baskani', 'admin')
  )
);

-- Kulüp başkanları ve adminler kendi yükledikleri görselleri güncelleyebilir
CREATE POLICY "Kulüp başkanları ve adminler görsel güncelleyebilir"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'etkinlik-gorselleri' AND
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('kulup_baskani', 'admin')
  )
);

-- Kulüp başkanları ve adminler kendi yükledikleri görselleri silebilir
CREATE POLICY "Kulüp başkanları ve adminler görsel silebilir"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'etkinlik-gorselleri' AND
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('kulup_baskani', 'admin')
  )
);
