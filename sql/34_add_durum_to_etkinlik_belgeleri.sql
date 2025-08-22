-- etkinlik_belgeleri tablosuna durum kolonu ekler
-- Bu sayede belge durumları da takip edilebilir ve revizyon işlemi daha tutarlı olur

-- 1. etkinlik_belgeleri tablosuna durum kolonu ekle
ALTER TABLE public.etkinlik_belgeleri 
ADD COLUMN IF NOT EXISTS durum VARCHAR DEFAULT 'Beklemede';

-- 2. Mevcut kayıtlar için durum alanını güncelle (unified onay sistemine göre)
DO $$
DECLARE
    belge_record RECORD;
    danisman_onay_durumu VARCHAR;
    sks_onay_durumu VARCHAR;
    final_durum VARCHAR;
BEGIN
    RAISE NOTICE 'etkinlik_belgeleri tablosundaki mevcut kayıtların durumları güncelleniyor...';
    
    FOR belge_record IN 
        SELECT id FROM public.etkinlik_belgeleri WHERE durum IS NULL OR durum = 'Beklemede'
    LOOP
        -- Bu belgenin onay_gecmisi'ndeki durumlarını kontrol et
        SELECT 
            MAX(CASE WHEN onay_tipi = 'Danışman' THEN durum END) as danisman_durum,
            MAX(CASE WHEN onay_tipi = 'SKS' THEN durum END) as sks_durum
        INTO danisman_onay_durumu, sks_onay_durumu
        FROM public.onay_gecmisi 
        WHERE onay_kategorisi = 'Belge' 
        AND belge_id = belge_record.id 
        AND belge_tipi = 'etkinlik_belgeleri';
        
        -- Durumu belirle
        IF sks_onay_durumu = 'Onaylandı' THEN
            final_durum := 'Onaylandı';
        ELSIF danisman_onay_durumu = 'Reddedildi' OR sks_onay_durumu = 'Reddedildi' THEN
            final_durum := 'Reddedildi';
        ELSE
            final_durum := 'Beklemede';
        END IF;
        
        -- Belgenin durumunu güncelle
        UPDATE public.etkinlik_belgeleri 
        SET durum = final_durum 
        WHERE id = belge_record.id;
        
        RAISE NOTICE 'Belge % durumu güncellendi: %', belge_record.id, final_durum;
    END LOOP;
    
    RAISE NOTICE 'etkinlik_belgeleri durum güncellemesi tamamlandı!';
END $$;

-- 3. durum kolonu için indeks ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_etkinlik_belgeleri_durum 
ON public.etkinlik_belgeleri (durum);

-- 4. durum kolonu için CHECK constraint ekle
ALTER TABLE public.etkinlik_belgeleri 
ADD CONSTRAINT chk_etkinlik_belgeleri_durum 
CHECK (durum IN ('Beklemede', 'Onaylandı', 'Reddedildi'));

-- 5. Yorum ekle
COMMENT ON COLUMN public.etkinlik_belgeleri.durum IS 'Belgenin genel durumu: Beklemede (varsayılan), Onaylandı (hem danışman hem SKS onaylı), Reddedildi (en az biri red)';

-- 6. Başarı mesajları
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 etkinlik_belgeleri tablosu durum sistemi eklendi!';
    RAISE NOTICE '📊 Durum değerleri: Beklemede, Onaylandı, Reddedildi';
    RAISE NOTICE '🔄 Mevcut kayıtlar unified onay sistemine göre güncellendi';
    RAISE NOTICE '⚡ Performans indeksi eklendi';
    RAISE NOTICE '✅ CHECK constraint ile veri bütünlüğü sağlandı';
    RAISE NOTICE '';
END $$;
