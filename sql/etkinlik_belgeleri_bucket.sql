-- Etkinlik belgeleri için bucket oluşturma
INSERT INTO storage.buckets (id, name, public)
VALUES ('etkinlik-belgeleri', 'etkinlik-belgeleri', false);

-- Herkes belgeleri görebilir (SELECT politikası)
CREATE POLICY "Herkes belgeleri görüntüleyebilir"
ON storage.objects FOR SELECT
USING (bucket_id = 'etkinlik-belgeleri');

-- Kulüp başkanları ve adminler belge yükleyebilir (INSERT politikası)
CREATE POLICY "Kulüp başkanları ve adminler belge yükleyebilir"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'etkinlik-belgeleri' AND
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('kulup_baskani', 'admin')
  )
);

-- Kulüp başkanları ve adminler kendi yükledikleri belgeleri güncelleyebilir ve silebilir (UPDATE, DELETE politikası)
CREATE POLICY "Kulüp başkanları ve adminler belge güncelleyebilir"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'etkinlik-belgeleri' AND
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('kulup_baskani', 'admin')
  )
);

CREATE POLICY "Kulüp başkanları ve adminler belge silebilir"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'etkinlik-belgeleri' AND
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('kulup_baskani', 'admin')
  )
);

-- SKS ve danışmanlar da belgeleri görebilir
CREATE POLICY "SKS ve danışmanlar belgeleri görüntüleyebilir"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'etkinlik-belgeleri' AND
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('sks', 'danisman')
  )
); 