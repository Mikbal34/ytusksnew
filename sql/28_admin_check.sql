-- Admin kullanıcılarını kontrol et ve RLS politikalarını test et

-- 1. Admin kullanıcıları listele
SELECT 
  id,
  email,
  ad_soyad,
  role,
  created_at
FROM public.profiles 
WHERE role = 'admin'
ORDER BY created_at;

-- 2. Mevcut RLS politikalarını kontrol et
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'etkinlik_basvurulari',
    'onay_gecmisi', 
    'sponsorlar',
    'konusmacilar',
    'ek_belgeler',
    'etkinlik_belgeleri',
    'etkinlik_zaman_dilimleri'
  )
  AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;

-- 3. Test sorgusu - Admin yetkilerini test et (bu komutu manuel çalıştırın)
/*
-- Bu sorguyu admin kullanıcı ile test edin:
SELECT COUNT(*) as toplam_basvuru 
FROM public.etkinlik_basvurulari;

-- Admin DELETE testi (güvenli - hiç etkisi olmayan)
DELETE FROM public.etkinlik_basvurulari 
WHERE id = '00000000-0000-0000-0000-000000000000';
*/

-- 4. Etkinlik verilerinin genel durumu
SELECT 
  'etkinlik_basvurulari' as tablo,
  COUNT(*) as kayit_sayisi
FROM public.etkinlik_basvurulari
UNION ALL
SELECT 
  'etkinlik_zaman_dilimleri' as tablo,
  COUNT(*) as kayit_sayisi  
FROM public.etkinlik_zaman_dilimleri
UNION ALL
SELECT 
  'sponsorlar' as tablo,
  COUNT(*) as kayit_sayisi
FROM public.sponsorlar
UNION ALL
SELECT 
  'konusmacilar' as tablo,
  COUNT(*) as kayit_sayisi
FROM public.konusmacilar
UNION ALL
SELECT 
  'etkinlik_belgeleri' as tablo,
  COUNT(*) as kayit_sayisi
FROM public.etkinlik_belgeleri
UNION ALL
SELECT 
  'ek_belgeler' as tablo,
  COUNT(*) as kayit_sayisi
FROM public.ek_belgeler
UNION ALL
SELECT 
  'onay_gecmisi' as tablo,
  COUNT(*) as kayit_sayisi
FROM public.onay_gecmisi;
