-- Eski tarih kolonlarını etkinlik_basvurulari tablosundan kaldır
-- Artık zaman dilimleri etkinlik_zaman_dilimleri tablosunda saklanıyor

-- Önce bu kolonların var olup olmadığını kontrol edelim
DO $$
DECLARE
    baslangic_exists BOOLEAN;
    bitis_exists BOOLEAN;
    baslangic_count INTEGER := 0;
    bitis_count INTEGER := 0;
BEGIN
    -- Kolonların varlığını kontrol et
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'etkinlik_basvurulari' 
        AND column_name = 'baslangic_tarihi'
        AND table_schema = 'public'
    ) INTO baslangic_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'etkinlik_basvurulari' 
        AND column_name = 'bitis_tarihi'
        AND table_schema = 'public'
    ) INTO bitis_exists;
    
    RAISE NOTICE 'Legacy tarih kolonları durumu:';
    RAISE NOTICE 'baslangic_tarihi kolonu mevcut: %', baslangic_exists;
    RAISE NOTICE 'bitis_tarihi kolonu mevcut: %', bitis_exists;
    
    -- Eğer kolonlar mevcutsa veri sayısını kontrol et
    IF baslangic_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM public.etkinlik_basvurulari WHERE baslangic_tarihi IS NOT NULL' INTO baslangic_count;
        RAISE NOTICE 'baslangic_tarihi dolu olan kayıt sayısı: %', baslangic_count;
    END IF;
    
    IF bitis_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM public.etkinlik_basvurulari WHERE bitis_tarihi IS NOT NULL' INTO bitis_count;
        RAISE NOTICE 'bitis_tarihi dolu olan kayıt sayısı: %', bitis_count;
    END IF;
    
    -- Eğer hala kullanılıyorsa uyarı ver
    IF baslangic_count > 0 OR bitis_count > 0 THEN
        RAISE WARNING 'Legacy tarih kolonlarında hala veri var! Bu veriler kaybolacak.';
        RAISE NOTICE 'Zaman dilimleri tablosunda karşılık gelen veriler olduğundan emin olun.';
    END IF;
    
    -- Eğer kolonlar zaten yoksa bilgi ver
    IF NOT baslangic_exists AND NOT bitis_exists THEN
        RAISE NOTICE '✅ Legacy tarih kolonları zaten mevcut değil - temizlik gerekmiyor!';
    END IF;
END $$;

-- Legacy tarih kolonlarını kaldır
ALTER TABLE public.etkinlik_basvurulari 
DROP COLUMN IF EXISTS baslangic_tarihi;

ALTER TABLE public.etkinlik_basvurulari 
DROP COLUMN IF EXISTS bitis_tarihi;

-- Başarı mesajı
DO $$
BEGIN
    RAISE NOTICE '✅ Legacy tarih kolonları başarıyla kaldırıldı!';
    RAISE NOTICE '📅 Artık tüm tarih bilgileri etkinlik_zaman_dilimleri tablosunda saklanıyor.';
    RAISE NOTICE '🔄 Frontend kodları zaman dilimlerini kullanacak şekilde güncellendi.';
END $$;
