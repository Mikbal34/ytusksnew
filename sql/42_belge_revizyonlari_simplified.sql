-- Belge revizyonları tablosu (basitleştirilmiş)
CREATE TABLE IF NOT EXISTS public.etkinlik_belge_revizyonlari (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revizyon_id UUID REFERENCES public.etkinlik_revizyonlari(id) ON DELETE CASCADE,
  basvuru_id UUID REFERENCES public.etkinlik_basvurulari(id) ON DELETE CASCADE,
  hedef_belge_id UUID REFERENCES public.etkinlik_belgeleri(id) ON DELETE SET NULL,
  eski_path TEXT,
  yeni_gecici_path TEXT,
  final_path TEXT,
  belge_tipi VARCHAR NOT NULL,
  belge_notu TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_belge_revizyonlari_revizyon
ON public.etkinlik_belge_revizyonlari (revizyon_id);

CREATE INDEX IF NOT EXISTS idx_belge_revizyonlari_basvuru
ON public.etkinlik_belge_revizyonlari (basvuru_id);

CREATE INDEX IF NOT EXISTS idx_belge_revizyonlari_hedef
ON public.etkinlik_belge_revizyonlari (hedef_belge_id);

-- RLS Politikaları
ALTER TABLE public.etkinlik_belge_revizyonlari ENABLE ROW LEVEL SECURITY;

-- Herkes belge revizyonlarını görebilir (basitleştirilmiş)
CREATE POLICY "Herkes belge revizyonlarını görebilir"
  ON public.etkinlik_belge_revizyonlari
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.etkinlik_belge_revizyonlari IS 'Etkinlik belgelerinin revizyonlarını takip eder. Her belge ID bazlı olarak revize edilir.';
COMMENT ON COLUMN public.etkinlik_belge_revizyonlari.hedef_belge_id IS 'Değiştirilecek belgenin ID''si';
COMMENT ON COLUMN public.etkinlik_belge_revizyonlari.eski_path IS 'Eski belgenin storage path''i';
COMMENT ON COLUMN public.etkinlik_belge_revizyonlari.yeni_gecici_path IS 'Pending klasöründeki yeni belgenin path''i';
COMMENT ON COLUMN public.etkinlik_belge_revizyonlari.final_path IS 'Onaylandıktan sonra taşınacak final path';

DO $$
BEGIN
  RAISE NOTICE '✅ Belge revizyonları tablosu oluşturuldu!';
END $$;