-- Form Dosyaları için tablo oluştur
CREATE TABLE IF NOT EXISTS public.form_dosyalari (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  isim text NOT NULL,
  dosya_yolu text NOT NULL,
  aciklama text,
  kategori text NOT NULL CHECK (kategori IN ('Kulüp', 'Etkinlik', 'SKS', 'Diğer')),
  yukleme_tarihi timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS'yi etkinleştir
ALTER TABLE public.form_dosyalari ENABLE ROW LEVEL SECURITY;

-- Herkes form dosyalarını görüntüleyebilir (SELECT)
CREATE POLICY "Herkes form dosyalarını görüntüleyebilir"
ON public.form_dosyalari
FOR SELECT
TO authenticated
USING (true);

-- Sadece admin ve sks kullanıcıları form ekleyebilir (INSERT)
CREATE POLICY "Admin ve SKS kullanıcıları form ekleyebilir"
ON public.form_dosyalari
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'sks')
  )
);

-- Sadece admin ve sks kullanıcıları form güncelleyebilir (UPDATE)
CREATE POLICY "Admin ve SKS kullanıcıları form güncelleyebilir"
ON public.form_dosyalari
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'sks')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'sks')
  )
);

-- Sadece admin ve sks kullanıcıları form silebilir (DELETE)
CREATE POLICY "Admin ve SKS kullanıcıları form silebilir"
ON public.form_dosyalari
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'sks')
  )
);

-- Anonim kullanıcılar için yalnızca görüntüleme izni
CREATE POLICY "Anonim kullanıcılar formları görüntüleyebilir"
ON public.form_dosyalari
FOR SELECT
TO anon
USING (true);

-- Referans için hatırlatıcı yorum:
-- Storage bucket politikalarını manuel olarak Supabase Dashboard üzerinden yapılandırın:
-- 1. "form-dosyalari" adında bir bucket oluşturun (public değil)
-- 2. Aşağıdaki storage politikalarını ekleyin:
--    - SELECT (okuma): true (herkes)
--    - INSERT (yazma): auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'sks'))
--    - DELETE (silme): auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'sks')) 