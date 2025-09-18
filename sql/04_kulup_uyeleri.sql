-- Kulüp üyeleri tablosu
CREATE TABLE IF NOT EXISTS public.kulup_uyeleri (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kulup_id UUID REFERENCES public.kulupler(id) ON DELETE CASCADE,
  kullanici_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rol VARCHAR(50) DEFAULT 'uye', -- 'baskan', 'yonetim', 'uye'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(kulup_id, kullanici_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_kulup_uyeleri_kulup
ON public.kulup_uyeleri (kulup_id);

CREATE INDEX IF NOT EXISTS idx_kulup_uyeleri_kullanici
ON public.kulup_uyeleri (kullanici_id);

CREATE INDEX IF NOT EXISTS idx_kulup_uyeleri_rol
ON public.kulup_uyeleri (rol);

-- RLS Politikaları
ALTER TABLE public.kulup_uyeleri ENABLE ROW LEVEL SECURITY;

-- Herkes kendi üyeliklerini görebilir
CREATE POLICY "Kullanıcılar kendi üyeliklerini görebilir"
  ON public.kulup_uyeleri
  FOR SELECT
  USING (kullanici_id = auth.uid());

-- Kulüp başkanları kendi kulüplerinin üyelerini görebilir
CREATE POLICY "Kulüp başkanları üyeleri görebilir"
  ON public.kulup_uyeleri
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.kulup_uyeleri ku2
      WHERE ku2.kulup_id = kulup_uyeleri.kulup_id
        AND ku2.kullanici_id = auth.uid()
        AND ku2.rol = 'baskan'
    )
  );

-- Kulüp başkanları üye ekleyebilir
CREATE POLICY "Kulüp başkanları üye ekleyebilir"
  ON public.kulup_uyeleri
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kulup_uyeleri ku
      WHERE ku.kulup_id = kulup_uyeleri.kulup_id
        AND ku.kullanici_id = auth.uid()
        AND ku.rol = 'baskan'
    )
  );

-- Kulüp başkanları üye güncelleyebilir
CREATE POLICY "Kulüp başkanları üye güncelleyebilir"
  ON public.kulup_uyeleri
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.kulup_uyeleri ku
      WHERE ku.kulup_id = kulup_uyeleri.kulup_id
        AND ku.kullanici_id = auth.uid()
        AND ku.rol = 'baskan'
    )
  );

-- Kulüp başkanları üye silebilir (kendileri hariç)
CREATE POLICY "Kulüp başkanları üye silebilir"
  ON public.kulup_uyeleri
  FOR DELETE
  USING (
    kullanici_id != auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.kulup_uyeleri ku
      WHERE ku.kulup_id = kulup_uyeleri.kulup_id
        AND ku.kullanici_id = auth.uid()
        AND ku.rol = 'baskan'
    )
  );

-- Admin bypass
CREATE POLICY "Admin bypass for kulup_uyeleri"
  ON public.kulup_uyeleri
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE kullanici_id = auth.uid() AND aktif = true
    )
  );

COMMENT ON TABLE public.kulup_uyeleri IS 'Kulüp üyelik ilişkilerini takip eder';
COMMENT ON COLUMN public.kulup_uyeleri.rol IS 'Üyenin kulüpteki rolü: baskan, yonetim, uye';

DO $$
BEGIN
  RAISE NOTICE '✅ Kulüp üyeleri tablosu oluşturuldu!';
END $$;