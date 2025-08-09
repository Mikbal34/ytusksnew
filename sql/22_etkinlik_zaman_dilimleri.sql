-- Etkinlik başvurularına çoklu zaman dilimi desteği
CREATE TABLE IF NOT EXISTS public.etkinlik_zaman_dilimleri (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  basvuru_id uuid NOT NULL REFERENCES public.etkinlik_basvurulari(id) ON DELETE CASCADE,
  baslangic timestamp with time zone NOT NULL,
  bitis timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.etkinlik_zaman_dilimleri ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='etkinlik_zaman_dilimleri' AND policyname='ezd_select_authenticated'
  ) THEN
    CREATE POLICY ezd_select_authenticated ON public.etkinlik_zaman_dilimleri
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='etkinlik_zaman_dilimleri' AND policyname='ezd_admin_all'
  ) THEN
    CREATE POLICY ezd_admin_all ON public.etkinlik_zaman_dilimleri
      FOR ALL TO authenticated
      USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
      WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
  END IF;
END $$;


