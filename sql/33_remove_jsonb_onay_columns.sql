-- JSONB onay kolonlarını kaldır - artık unified onay_gecmisi kullanıyoruz
-- Bu temizlik migration'ı unified onay sisteminden sonra çalıştırılmalı

-- Önce mevcut JSONB kolonlarını kontrol edelim
DO $$
DECLARE
    eb_danisman_exists BOOLEAN;
    eb_sks_exists BOOLEAN;
    etk_belge_danisman_exists BOOLEAN;
    etk_belge_sks_exists BOOLEAN;
    ek_belge_danisman_exists BOOLEAN;
    ek_belge_sks_exists BOOLEAN;
BEGIN
    -- etkinlik_basvurulari tablosu
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'etkinlik_basvurulari' 
        AND column_name = 'danisman_onay'
        AND table_schema = 'public'
    ) INTO eb_danisman_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'etkinlik_basvurulari' 
        AND column_name = 'sks_onay'
        AND table_schema = 'public'
    ) INTO eb_sks_exists;
    
    -- etkinlik_belgeleri tablosu
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'etkinlik_belgeleri' 
        AND column_name = 'danisman_onay'
        AND table_schema = 'public'
    ) INTO etk_belge_danisman_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'etkinlik_belgeleri' 
        AND column_name = 'sks_onay'
        AND table_schema = 'public'
    ) INTO etk_belge_sks_exists;
    
    -- ek_belgeler tablosu
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ek_belgeler' 
        AND column_name = 'danisman_onay'
        AND table_schema = 'public'
    ) INTO ek_belge_danisman_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ek_belgeler' 
        AND column_name = 'sks_onay'
        AND table_schema = 'public'
    ) INTO ek_belge_sks_exists;
    
    RAISE NOTICE '🔍 JSONB onay kolonları durumu:';
    RAISE NOTICE '📋 etkinlik_basvurulari:';
    RAISE NOTICE '   • danisman_onay: %', CASE WHEN eb_danisman_exists THEN 'MEVCUT' ELSE 'YOK' END;
    RAISE NOTICE '   • sks_onay: %', CASE WHEN eb_sks_exists THEN 'MEVCUT' ELSE 'YOK' END;
    
    RAISE NOTICE '📄 etkinlik_belgeleri:';
    RAISE NOTICE '   • danisman_onay: %', CASE WHEN etk_belge_danisman_exists THEN 'MEVCUT' ELSE 'YOK' END;
    RAISE NOTICE '   • sks_onay: %', CASE WHEN etk_belge_sks_exists THEN 'MEVCUT' ELSE 'YOK' END;
    
    RAISE NOTICE '📎 ek_belgeler:';
    RAISE NOTICE '   • danisman_onay: %', CASE WHEN ek_belge_danisman_exists THEN 'MEVCUT' ELSE 'YOK' END;
    RAISE NOTICE '   • sks_onay: %', CASE WHEN ek_belge_sks_exists THEN 'MEVCUT' ELSE 'YOK' END;
    
    IF NOT (eb_danisman_exists OR eb_sks_exists OR etk_belge_danisman_exists OR etk_belge_sks_exists OR ek_belge_danisman_exists OR ek_belge_sks_exists) THEN
        RAISE NOTICE '✅ Tüm JSONB onay kolonları zaten kaldırılmış!';
    END IF;
END $$;

-- Önceki migration'da kaydedilmiş veriler varsa onay_gecmisi'ne aktarıldığından emin olalım
DO $$
DECLARE
    onay_count INTEGER;
    etkinlik_onay_count INTEGER;
    belge_onay_count INTEGER;
BEGIN
    -- onay_gecmisi'ndeki toplam kayıt
    SELECT COUNT(*) INTO onay_count FROM public.onay_gecmisi;
    
    -- Etkinlik onayları
    SELECT COUNT(*) INTO etkinlik_onay_count 
    FROM public.onay_gecmisi 
    WHERE onay_kategorisi = 'Etkinlik';
    
    -- Belge onayları
    SELECT COUNT(*) INTO belge_onay_count 
    FROM public.onay_gecmisi 
    WHERE onay_kategorisi = 'Belge';
    
    RAISE NOTICE '📊 onay_gecmisi tablosu durumu:';
    RAISE NOTICE '   • Toplam onay: %', onay_count;
    RAISE NOTICE '   • Etkinlik onayları: %', etkinlik_onay_count;
    RAISE NOTICE '   • Belge onayları: %', belge_onay_count;
    
    IF onay_count = 0 THEN
        RAISE WARNING '⚠️  onay_gecmisi tablosu boş! Unified migration önce çalıştırılmalı.';
    ELSE
        RAISE NOTICE '✅ onay_gecmisi tablosu hazır - JSONB kolonları güvenle kaldırılabilir.';
    END IF;
END $$;

-- JSONB onay kolonlarını kaldır
RAISE NOTICE '🗑️ JSONB onay kolonları kaldırılıyor...';

-- etkinlik_basvurulari tablosundan
ALTER TABLE public.etkinlik_basvurulari 
DROP COLUMN IF EXISTS danisman_onay CASCADE;

ALTER TABLE public.etkinlik_basvurulari 
DROP COLUMN IF EXISTS sks_onay CASCADE;

RAISE NOTICE '✅ etkinlik_basvurulari JSONB onay kolonları kaldırıldı';

-- etkinlik_belgeleri tablosundan
ALTER TABLE public.etkinlik_belgeleri 
DROP COLUMN IF EXISTS danisman_onay CASCADE;

ALTER TABLE public.etkinlik_belgeleri 
DROP COLUMN IF EXISTS sks_onay CASCADE;

RAISE NOTICE '✅ etkinlik_belgeleri JSONB onay kolonları kaldırıldı';

-- ek_belgeler tablosundan
ALTER TABLE public.ek_belgeler 
DROP COLUMN IF EXISTS danisman_onay CASCADE;

ALTER TABLE public.ek_belgeler 
DROP COLUMN IF EXISTS sks_onay CASCADE;

RAISE NOTICE '✅ ek_belgeler JSONB onay kolonları kaldırıldı';

-- İlişkili indeksleri kaldır
DROP INDEX IF EXISTS idx_etkinlik_basvurulari_danisman_onay;
DROP INDEX IF EXISTS idx_etkinlik_basvurulari_sks_onay;
DROP INDEX IF EXISTS idx_etkinlik_belgeleri_danisman_onay;
DROP INDEX IF EXISTS idx_etkinlik_belgeleri_sks_onay;
DROP INDEX IF EXISTS idx_ek_belgeler_danisman_onay;
DROP INDEX IF EXISTS idx_ek_belgeler_sks_onay;

RAISE NOTICE '🗑️ JSONB onay indeksleri kaldırıldı';

-- Temizlik sonrası durum raporu
DO $$
DECLARE
    onay_count INTEGER;
    etkinlik_onay_count INTEGER;
    belge_onay_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO onay_count FROM public.onay_gecmisi;
    SELECT COUNT(*) INTO etkinlik_onay_count FROM public.onay_gecmisi WHERE onay_kategorisi = 'Etkinlik';
    SELECT COUNT(*) INTO belge_onay_count FROM public.onay_gecmisi WHERE onay_kategorisi = 'Belge';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 JSONB onay sistemi temizleme tamamlandı!';
    RAISE NOTICE '📊 Mevcut durum:';
    RAISE NOTICE '   ✅ Tüm JSONB onay kolonları kaldırıldı';
    RAISE NOTICE '   ✅ İlişkili indeksler temizlendi';
    RAISE NOTICE '   📋 onay_gecmisi''nde % etkinlik onayı', etkinlik_onay_count;
    RAISE NOTICE '   📄 onay_gecmisi''nde % belge onayı', belge_onay_count;
    RAISE NOTICE '   🎯 Toplam % unified onay kaydı', onay_count;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Artık sadece unified onay_gecmisi sistemi aktif!';
END $$;
