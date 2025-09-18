-- SKS görevlileri tablosu
CREATE TABLE IF NOT EXISTS public.sks_gorevlileri (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kullanici_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  ad_soyad VARCHAR(255) NOT NULL,
  unvan VARCHAR(100),
  telefon VARCHAR(20),
  eposta VARCHAR(255),
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_sks_gorevlileri_kullanici
ON public.sks_gorevlileri (kullanici_id);

CREATE INDEX IF NOT EXISTS idx_sks_gorevlileri_aktif
ON public.sks_gorevlileri (aktif);

-- RLS Politikaları
ALTER TABLE public.sks_gorevlileri ENABLE ROW LEVEL SECURITY;

-- Herkes SKS görevlilerini görebilir
CREATE POLICY "Herkes SKS görevlilerini görebilir"
  ON public.sks_gorevlileri
  FOR SELECT
  USING (aktif = true);

-- Sadece adminler SKS görevlisi ekleyebilir
CREATE POLICY "Sadece adminler SKS görevlisi ekleyebilir"
  ON public.sks_gorevlileri
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE kullanici_id = auth.uid() AND aktif = true
    )
  );

-- Sadece adminler SKS görevlisi güncelleyebilir
CREATE POLICY "Sadece adminler SKS görevlisi güncelleyebilir"
  ON public.sks_gorevlileri
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE kullanici_id = auth.uid() AND aktif = true
    )
  );

-- Sadece adminler SKS görevlisi silebilir
CREATE POLICY "Sadece adminler SKS görevlisi silebilir"
  ON public.sks_gorevlileri
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE kullanici_id = auth.uid() AND aktif = true
    )
  );

COMMENT ON TABLE public.sks_gorevlileri IS 'SKS görevlileri listesi';
COMMENT ON COLUMN public.sks_gorevlileri.aktif IS 'SKS görevlisinin aktif olup olmadığı';

DO $$
BEGIN
  RAISE NOTICE '✅ SKS görevlileri tablosu oluşturuldu!';
END $$;