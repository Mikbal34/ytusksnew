-- etkinlik_zaman_dilimleri tablosu için eksik RLS politikalarını ekler
-- Kulüp başkanları kendi kulüplerinin etkinlikleri için zaman dilimi yönetebilsin

DO $$
BEGIN
  -- Kulüp başkanları kendi kulüplerinin etkinlikleri için INSERT yapabilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='etkinlik_zaman_dilimleri' AND policyname='ezd_kulup_baskani_insert'
  ) THEN
    CREATE POLICY ezd_kulup_baskani_insert ON public.etkinlik_zaman_dilimleri
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.etkinlik_basvurulari eb ON eb.kulup_id = p.kulup_id
          WHERE p.id = auth.uid() 
          AND p.role = 'kulup_baskani' 
          AND eb.id = etkinlik_zaman_dilimleri.basvuru_id
        )
      );
  END IF;

  -- Kulüp başkanları kendi kulüplerinin etkinlikleri için UPDATE yapabilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='etkinlik_zaman_dilimleri' AND policyname='ezd_kulup_baskani_update'
  ) THEN
    CREATE POLICY ezd_kulup_baskani_update ON public.etkinlik_zaman_dilimleri
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.etkinlik_basvurulari eb ON eb.kulup_id = p.kulup_id
          WHERE p.id = auth.uid() 
          AND p.role = 'kulup_baskani' 
          AND eb.id = etkinlik_zaman_dilimleri.basvuru_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.etkinlik_basvurulari eb ON eb.kulup_id = p.kulup_id
          WHERE p.id = auth.uid() 
          AND p.role = 'kulup_baskani' 
          AND eb.id = etkinlik_zaman_dilimleri.basvuru_id
        )
      );
  END IF;

  -- Kulüp başkanları kendi kulüplerinin etkinlikleri için DELETE yapabilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='etkinlik_zaman_dilimleri' AND policyname='ezd_kulup_baskani_delete'
  ) THEN
    CREATE POLICY ezd_kulup_baskani_delete ON public.etkinlik_zaman_dilimleri
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.etkinlik_basvurulari eb ON eb.kulup_id = p.kulup_id
          WHERE p.id = auth.uid() 
          AND p.role = 'kulup_baskani' 
          AND eb.id = etkinlik_zaman_dilimleri.basvuru_id
        )
      );
  END IF;

  -- SKS ve Danışmanlar da zaman dilimlerini görebilir ve düzenleyebilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='etkinlik_zaman_dilimleri' AND policyname='ezd_sks_danisman_all'
  ) THEN
    CREATE POLICY ezd_sks_danisman_all ON public.etkinlik_zaman_dilimleri
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND (role = 'sks' OR role = 'danisman')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND (role = 'sks' OR role = 'danisman')
        )
      );
  END IF;
END $$;
