-- onay_gecmisi tablosunu genişlet - hem etkinlik hem belge onayları için
-- Tek tabloda tüm onay süreçlerini tutacağız

-- Önce mevcut onay_gecmisi tablosunu kontrol edelim
DO $$
DECLARE
    onay_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO onay_count FROM public.onay_gecmisi;
    RAISE NOTICE '📊 Mevcut onay_gecmisi kayıt sayısı: %', onay_count;
END $$;

-- onay_gecmisi tablosuna yeni kolonlar ekle
ALTER TABLE public.onay_gecmisi 
ADD COLUMN IF NOT EXISTS onay_kategorisi VARCHAR NOT NULL DEFAULT 'Etkinlik';

ALTER TABLE public.onay_gecmisi 
ADD COLUMN IF NOT EXISTS belge_id UUID NULL;

ALTER TABLE public.onay_gecmisi 
ADD COLUMN IF NOT EXISTS belge_tipi VARCHAR NULL;

-- Yorum ekle
COMMENT ON COLUMN public.onay_gecmisi.onay_kategorisi IS 'Onay türü: Etkinlik veya Belge';
COMMENT ON COLUMN public.onay_gecmisi.belge_id IS 'Belge onayları için belge ID (etkinlik_belgeleri veya ek_belgeler)';
COMMENT ON COLUMN public.onay_gecmisi.belge_tipi IS 'Belge tablosu: etkinlik_belgeleri, ek_belgeler';

-- Var olan kayıtları güncelle (hepsi etkinlik onayı)
UPDATE public.onay_gecmisi 
SET onay_kategorisi = 'Etkinlik' 
WHERE onay_kategorisi IS NULL OR onay_kategorisi = '';

-- Kontrol kısıtlamaları ekle
ALTER TABLE public.onay_gecmisi 
ADD CONSTRAINT chk_onay_kategorisi 
CHECK (onay_kategorisi IN ('Etkinlik', 'Belge'));

ALTER TABLE public.onay_gecmisi 
ADD CONSTRAINT chk_belge_fields 
CHECK (
    (onay_kategorisi = 'Etkinlik' AND belge_id IS NULL AND belge_tipi IS NULL AND basvuru_id IS NOT NULL) OR
    (onay_kategorisi = 'Belge' AND belge_id IS NOT NULL AND belge_tipi IS NOT NULL AND belge_tipi IN ('etkinlik_belgeleri', 'ek_belgeler'))
);

-- JSONB belge onaylarını onay_gecmisi tablosuna migrate et
DO $$
DECLARE
    belge_rec RECORD;
    onay_id UUID;
BEGIN
    RAISE NOTICE '🔄 Etkinlik belge onaylarını migrate ediliyor...';
    
    -- etkinlik_belgeleri tablosundaki JSONB onayları
    FOR belge_rec IN 
        SELECT id, danisman_onay, sks_onay 
        FROM public.etkinlik_belgeleri 
        WHERE danisman_onay IS NOT NULL OR sks_onay IS NOT NULL
    LOOP
        -- Danışman onayını migrate et
        IF belge_rec.danisman_onay IS NOT NULL THEN
            INSERT INTO public.onay_gecmisi (
                onay_kategorisi,
                belge_id,
                belge_tipi,
                onay_tipi,
                durum,
                tarih,
                red_sebebi,
                onaylayan_id
            ) VALUES (
                'Belge',
                belge_rec.id,
                'etkinlik_belgeleri',
                'Danışman',
                belge_rec.danisman_onay->>'durum',
                (belge_rec.danisman_onay->>'tarih')::timestamp with time zone,
                belge_rec.danisman_onay->>'redSebebi',
                (belge_rec.danisman_onay->>'onaylayan_id')::uuid
            );
        END IF;
        
        -- SKS onayını migrate et
        IF belge_rec.sks_onay IS NOT NULL THEN
            INSERT INTO public.onay_gecmisi (
                onay_kategorisi,
                belge_id,
                belge_tipi,
                onay_tipi,
                durum,
                tarih,
                red_sebebi,
                onaylayan_id
            ) VALUES (
                'Belge',
                belge_rec.id,
                'etkinlik_belgeleri',
                'SKS',
                belge_rec.sks_onay->>'durum',
                (belge_rec.sks_onay->>'tarih')::timestamp with time zone,
                belge_rec.sks_onay->>'redSebebi',
                (belge_rec.sks_onay->>'onaylayan_id')::uuid
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Etkinlik belge onayları migrate edildi';
END $$;

-- ek_belgeler JSONB onaylarını migrate et
DO $$
DECLARE
    ek_belge_rec RECORD;
BEGIN
    RAISE NOTICE '🔄 Ek belge onaylarını migrate ediliyor...';
    
    FOR ek_belge_rec IN 
        SELECT id, danisman_onay, sks_onay 
        FROM public.ek_belgeler 
        WHERE danisman_onay IS NOT NULL OR sks_onay IS NOT NULL
    LOOP
        -- Danışman onayını migrate et
        IF ek_belge_rec.danisman_onay IS NOT NULL THEN
            INSERT INTO public.onay_gecmisi (
                onay_kategorisi,
                belge_id,
                belge_tipi,
                onay_tipi,
                durum,
                tarih,
                red_sebebi,
                onaylayan_id
            ) VALUES (
                'Belge',
                ek_belge_rec.id,
                'ek_belgeler',
                'Danışman',
                ek_belge_rec.danisman_onay->>'durum',
                (ek_belge_rec.danisman_onay->>'tarih')::timestamp with time zone,
                ek_belge_rec.danisman_onay->>'redSebebi',
                (ek_belge_rec.danisman_onay->>'onaylayan_id')::uuid
            );
        END IF;
        
        -- SKS onayını migrate et
        IF ek_belge_rec.sks_onay IS NOT NULL THEN
            INSERT INTO public.onay_gecmisi (
                onay_kategorisi,
                belge_id,
                belge_tipi,
                onay_tipi,
                durum,
                tarih,
                red_sebebi,
                onaylayan_id
            ) VALUES (
                'Belge',
                ek_belge_rec.id,
                'ek_belgeler',
                'SKS',
                ek_belge_rec.sks_onay->>'durum',
                (ek_belge_rec.sks_onay->>'tarih')::timestamp with time zone,
                ek_belge_rec.sks_onay->>'redSebebi',
                (ek_belge_rec.sks_onay->>'onaylayan_id')::uuid
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Ek belge onayları migrate edildi';
END $$;

-- etkinlik_basvurulari JSONB onaylarını migrate et
DO $$
DECLARE
    basvuru_rec RECORD;
BEGIN
    RAISE NOTICE '🔄 Etkinlik başvuru onaylarını migrate ediliyor...';
    
    FOR basvuru_rec IN 
        SELECT id, danisman_onay, sks_onay 
        FROM public.etkinlik_basvurulari 
        WHERE danisman_onay IS NOT NULL OR sks_onay IS NOT NULL
    LOOP
        -- Danışman onayını migrate et
        IF basvuru_rec.danisman_onay IS NOT NULL THEN
            INSERT INTO public.onay_gecmisi (
                onay_kategorisi,
                basvuru_id,
                onay_tipi,
                durum,
                tarih,
                red_sebebi,
                onaylayan_id
            ) VALUES (
                'Etkinlik',
                basvuru_rec.id,
                'Danışman',
                basvuru_rec.danisman_onay->>'durum',
                (basvuru_rec.danisman_onay->>'tarih')::timestamp with time zone,
                basvuru_rec.danisman_onay->>'redSebebi',
                (basvuru_rec.danisman_onay->>'onaylayan_id')::uuid
            );
        END IF;
        
        -- SKS onayını migrate et
        IF basvuru_rec.sks_onay IS NOT NULL THEN
            INSERT INTO public.onay_gecmisi (
                onay_kategorisi,
                basvuru_id,
                onay_tipi,
                durum,
                tarih,
                red_sebebi,
                onaylayan_id
            ) VALUES (
                'Etkinlik',
                basvuru_rec.id,
                'SKS',
                basvuru_rec.sks_onay->>'durum',
                (basvuru_rec.sks_onay->>'tarih')::timestamp with time zone,
                basvuru_rec.sks_onay->>'redSebebi',
                (basvuru_rec.sks_onay->>'onaylayan_id')::uuid
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Etkinlik başvuru onayları migrate edildi';
END $$;

-- JSONB kolonlarını kaldır (artık gerekli değil)
ALTER TABLE public.etkinlik_basvurulari 
DROP COLUMN IF EXISTS danisman_onay,
DROP COLUMN IF EXISTS sks_onay;

ALTER TABLE public.etkinlik_belgeleri 
DROP COLUMN IF EXISTS danisman_onay,
DROP COLUMN IF EXISTS sks_onay;

ALTER TABLE public.ek_belgeler 
DROP COLUMN IF EXISTS danisman_onay,
DROP COLUMN IF EXISTS sks_onay;

-- İndeksleri kaldır
DROP INDEX IF EXISTS idx_etkinlik_basvurulari_danisman_onay;
DROP INDEX IF EXISTS idx_etkinlik_basvurulari_sks_onay;

-- Yeni indeksler ekle
CREATE INDEX IF NOT EXISTS idx_onay_gecmisi_basvuru_id 
ON public.onay_gecmisi (basvuru_id) 
WHERE onay_kategorisi = 'Etkinlik';

CREATE INDEX IF NOT EXISTS idx_onay_gecmisi_belge_id 
ON public.onay_gecmisi (belge_id, belge_tipi) 
WHERE onay_kategorisi = 'Belge';

CREATE INDEX IF NOT EXISTS idx_onay_gecmisi_kategori_durum 
ON public.onay_gecmisi (onay_kategorisi, durum, tarih);

-- Başarı özeti
DO $$
DECLARE
    etkinlik_onay_count INTEGER;
    belge_onay_count INTEGER;
    toplam_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO etkinlik_onay_count 
    FROM public.onay_gecmisi 
    WHERE onay_kategorisi = 'Etkinlik';
    
    SELECT COUNT(*) INTO belge_onay_count 
    FROM public.onay_gecmisi 
    WHERE onay_kategorisi = 'Belge';
    
    SELECT COUNT(*) INTO toplam_count FROM public.onay_gecmisi;
    
    RAISE NOTICE '🎉 Unified onay_gecmisi sistemi hazır!';
    RAISE NOTICE '📊 Migration özeti:';
    RAISE NOTICE '   • Etkinlik onayları: %', etkinlik_onay_count;
    RAISE NOTICE '   • Belge onayları: %', belge_onay_count;
    RAISE NOTICE '   • Toplam onay: %', toplam_count;
    RAISE NOTICE '✅ Tek tabloda tüm onay süreçleri!';
END $$;
