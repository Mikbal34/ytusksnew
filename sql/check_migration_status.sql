-- Migration durumunu kontrol et

-- 1. Etkinlik başvuruları sayısı
SELECT COUNT(*) as toplam_basvuru_sayisi FROM public.etkinlik_basvurulari;

-- 2. Zaman dilimi olan başvuru sayısı
SELECT COUNT(DISTINCT basvuru_id) as zaman_dilimi_olan_basvuru_sayisi 
FROM public.etkinlik_zaman_dilimleri;

-- 3. Legacy tarih alanları var mı kontrol et
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'etkinlik_basvurulari' 
  AND table_schema = 'public'
  AND column_name IN ('baslangic_tarihi', 'bitis_tarihi');

-- 4. Örnek başvuru ve zaman dilimleri
SELECT 
    eb.id,
    eb.etkinlik_adi,
    eb.baslangic_tarihi as legacy_baslangic,  -- Bu null olmalı migration sonrası
    eb.bitis_tarihi as legacy_bitis,          -- Bu null olmalı migration sonrası
    COUNT(ezd.id) as zaman_dilimi_sayisi
FROM public.etkinlik_basvurulari eb
LEFT JOIN public.etkinlik_zaman_dilimleri ezd ON eb.id = ezd.basvuru_id
GROUP BY eb.id, eb.etkinlik_adi, eb.baslangic_tarihi, eb.bitis_tarihi
ORDER BY eb.created_at DESC
LIMIT 5;

-- 5. Detaylı zaman dilimi örneği
SELECT 
    ezd.basvuru_id,
    ezd.baslangic,
    ezd.bitis,
    eb.etkinlik_adi
FROM public.etkinlik_zaman_dilimleri ezd
JOIN public.etkinlik_basvurulari eb ON ezd.basvuru_id = eb.id
LIMIT 3;


