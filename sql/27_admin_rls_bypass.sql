-- Admin rolüne RLS bypass yetkisi ver
-- Bu admin kullanıcılarının tüm etkinlik verilerini silebilmesini sağlar

-- RLS politikalarını güncelle - Admin rolü için tüm tablolarda BYPASS yetkisi

-- 1. etkinlik_basvurulari tablosu için admin bypass
DO $$
BEGIN
  -- Mevcut admin politikasını kaldır ve yeniden oluştur
  DROP POLICY IF EXISTS "Admin tüm işlemleri yapabilir" ON public.etkinlik_basvurulari;
  
  CREATE POLICY "Admin tüm işlemleri yapabilir" 
  ON public.etkinlik_basvurulari 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END $$;

-- 2. onay_gecmisi tablosu için admin bypass
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin onay geçmişi yönetebilir" ON public.onay_gecmisi;
  
  CREATE POLICY "Admin onay geçmişi yönetebilir" 
  ON public.onay_gecmisi 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END $$;

-- 3. sponsorlar tablosu için admin bypass
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin sponsor yönetebilir" ON public.sponsorlar;
  
  CREATE POLICY "Admin sponsor yönetebilir" 
  ON public.sponsorlar 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END $$;

-- 4. konusmacilar tablosu için admin bypass
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin konuşmacı yönetebilir" ON public.konusmacilar;
  
  CREATE POLICY "Admin konuşmacı yönetebilir" 
  ON public.konusmacilar 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END $$;

-- 5. ek_belgeler tablosu için admin bypass
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin ek belge yönetebilir" ON public.ek_belgeler;
  
  CREATE POLICY "Admin ek belge yönetebilir" 
  ON public.ek_belgeler 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END $$;

-- 6. etkinlik_belgeleri tablosu için admin bypass
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin etkinlik belgesi yönetebilir" ON public.etkinlik_belgeleri;
  
  CREATE POLICY "Admin etkinlik belgesi yönetebilir" 
  ON public.etkinlik_belgeleri 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END $$;

-- 7. etkinlik_zaman_dilimleri tablosu için admin bypass
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin zaman dilimi yönetebilir" ON public.etkinlik_zaman_dilimleri;
  
  CREATE POLICY "Admin zaman dilimi yönetebilir" 
  ON public.etkinlik_zaman_dilimleri 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END $$;

-- Admin yetkilerini logla
DO $$
BEGIN
  RAISE NOTICE 'Admin RLS bypass yetkileri başarıyla oluşturuldu!';
  RAISE NOTICE 'Admin rolündeki kullanıcılar artık tüm etkinlik verilerini yönetebilir.';
END $$;
