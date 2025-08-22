-- Eski başvuruların tarih bilgilerini etkinlik_zaman_dilimleri tablosuna migrate et
INSERT INTO public.etkinlik_zaman_dilimleri (basvuru_id, baslangic, bitis)
SELECT 
    id as basvuru_id,
    baslangic_tarihi as baslangic,
    bitis_tarihi as bitis
FROM public.etkinlik_basvurulari 
WHERE baslangic_tarihi IS NOT NULL 
  AND bitis_tarihi IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT basvuru_id 
    FROM public.etkinlik_zaman_dilimleri
  );

-- Sonuçları kontrol et
SELECT 
    COUNT(*) as total_basvurular,
    COUNT(CASE WHEN ezd.basvuru_id IS NOT NULL THEN 1 END) as zaman_dilimi_olan
FROM public.etkinlik_basvurulari eb
LEFT JOIN public.etkinlik_zaman_dilimleri ezd ON eb.id = ezd.basvuru_id;
