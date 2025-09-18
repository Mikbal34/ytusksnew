-- etkinlik_revizyonlari tablosuna revize_belgeler kolonu ekle
ALTER TABLE public.etkinlik_revizyonlari
ADD COLUMN IF NOT EXISTS revize_belgeler BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.etkinlik_revizyonlari.revize_belgeler IS 'Belge revizyonu yapıldı mı?';

DO $$
BEGIN
  RAISE NOTICE '✅ etkinlik_revizyonlari tablosuna revize_belgeler kolonu eklendi!';
END $$;