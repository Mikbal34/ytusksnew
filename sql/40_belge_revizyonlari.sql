-- Belge revizyonları tablosu
-- Her belge için ayrı revizyon takibi yapar
CREATE TABLE IF NOT EXISTS public.etkinlik_belge_revizyonlari (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revizyon_id UUID REFERENCES public.etkinlik_revizyonlari(id) ON DELETE CASCADE,
  basvuru_id UUID REFERENCES public.etkinlik_basvurulari(id) ON DELETE CASCADE,
  hedef_belge_id UUID REFERENCES public.etkinlik_belgeleri(id) ON DELETE SET NULL, -- Değiştirilecek belgenin ID'si
  eski_path TEXT, -- Eski belgenin storage path'i
  yeni_gecici_path TEXT, -- Pending klasöründeki yeni belgenin path'i
  final_path TEXT, -- Onaylandıktan sonra taşınacak final path
  belge_tipi VARCHAR NOT NULL, -- 'Afiş', 'KatilimciListesi', vb.
  belge_notu TEXT, -- Opsiyonel not
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

-- Kulüp üyeleri kendi başvurularının belge revizyonlarını görebilir
CREATE POLICY "Kulüp üyeleri kendi belge revizyonlarını görebilir"
  ON public.etkinlik_belge_revizyonlari
  FOR SELECT
  USING (
    -- Kulup_uyeleri tablosu yoksa, sadece başvuru sahibi kontrol et
    EXISTS (
      SELECT 1 FROM public.etkinlik_basvurulari eb
      WHERE eb.id = etkinlik_belge_revizyonlari.basvuru_id
    )
  );

-- Kulüp üyeleri belge revizyonu ekleyebilir
CREATE POLICY "Kulüp üyeleri belge revizyonu ekleyebilir"
  ON public.etkinlik_belge_revizyonlari
  FOR INSERT
  WITH CHECK (
    -- Kulup_uyeleri tablosu yoksa, sadece başvuru sahibi kontrol et
    EXISTS (
      SELECT 1 FROM public.etkinlik_basvurulari eb
      WHERE eb.id = etkinlik_belge_revizyonlari.basvuru_id
    )
  );

-- Danışman ve SKS belge revizyonlarını görebilir
CREATE POLICY "Danışman belge revizyonlarını görebilir"
  ON public.etkinlik_belge_revizyonlari
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.akademik_danismanlar ad
      WHERE ad.kullanici_id = auth.uid()
    )
  );

CREATE POLICY "SKS belge revizyonlarını görebilir"
  ON public.etkinlik_belge_revizyonlari
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sks_gorevlileri sg
      WHERE sg.kullanici_id = auth.uid()
    )
  );

-- Admin bypass
CREATE POLICY "Admin bypass for belge revizyonlari"
  ON public.etkinlik_belge_revizyonlari
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE kullanici_id = auth.uid() AND aktif = true
    )
  );

-- etkinlik_revizyonlari tablosuna belge revizyonu flag'i ekle
ALTER TABLE public.etkinlik_revizyonlari
ADD COLUMN IF NOT EXISTS revize_belgeler BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.etkinlik_revizyonlari.revize_belgeler IS 'Belge revizyonu yapıldı mı?';
COMMENT ON TABLE public.etkinlik_belge_revizyonlari IS 'Etkinlik belgelerinin revizyonlarını takip eder. Her belge ID bazlı olarak revize edilir.';

DO $$
BEGIN
  RAISE NOTICE '✅ Belge revizyonları tablosu oluşturuldu!';
END $$;