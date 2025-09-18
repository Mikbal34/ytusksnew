-- Admin kullanıcıları tablosu
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kullanici_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_admin_users_kullanici
ON public.admin_users (kullanici_id);

CREATE INDEX IF NOT EXISTS idx_admin_users_aktif
ON public.admin_users (aktif);

-- RLS Politikaları
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Sadece adminler görebilir
CREATE POLICY "Sadece adminler admin listesini görebilir"
  ON public.admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.kullanici_id = auth.uid() AND au.aktif = true
    )
  );

-- Sadece adminler ekleyebilir
CREATE POLICY "Sadece adminler admin ekleyebilir"
  ON public.admin_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.kullanici_id = auth.uid() AND au.aktif = true
    )
  );

-- Sadece adminler güncelleyebilir
CREATE POLICY "Sadece adminler admin güncelleyebilir"
  ON public.admin_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.kullanici_id = auth.uid() AND au.aktif = true
    )
  );

COMMENT ON TABLE public.admin_users IS 'Sistem yöneticileri listesi';
COMMENT ON COLUMN public.admin_users.aktif IS 'Admin yetkisinin aktif olup olmadığı';

DO $$
BEGIN
  RAISE NOTICE '✅ Admin users tablosu oluşturuldu!';
END $$;