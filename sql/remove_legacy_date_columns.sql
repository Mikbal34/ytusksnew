-- Legacy tarih kolonlarını kaldır (önce migration'ı çalıştırdığından emin ol!)

-- Önce kontrol et - tüm başvuruların zaman dilimi olduğundan emin ol
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM public.etkinlik_basvurulari eb
    LEFT JOIN public.etkinlik_zaman_dilimleri ezd ON eb.id = ezd.basvuru_id
    WHERE ezd.basvuru_id IS NULL;
    
    IF missing_count > 0 THEN
        RAISE EXCEPTION 'Hata: % başvurunun zaman dilimi eksik! Önce migration çalıştır.', missing_count;
    END IF;
    
    RAISE NOTICE 'Kontrol başarılı: Tüm başvuruların zaman dilimi var.';
END $$;

-- Legacy kolonları kaldır
ALTER TABLE public.etkinlik_basvurulari 
DROP COLUMN IF EXISTS baslangic_tarihi,
DROP COLUMN IF EXISTS bitis_tarihi;

-- Sonuçları göster
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'etkinlik_basvurulari' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
