-- Kulüp - Danışman ilişki tablosu (maks. 2 aktif danışman)
CREATE TABLE IF NOT EXISTS public.kulup_danismanlar (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  kulup_id uuid NOT NULL REFERENCES public.kulupler(id) ON DELETE CASCADE,
  danisman_id uuid NOT NULL REFERENCES public.akademik_danismanlar(id) ON DELETE RESTRICT,
  aktif boolean NOT NULL DEFAULT true,
  baslangic_tarihi timestamp with time zone DEFAULT now(),
  bitis_tarihi timestamp with time zone,
  gorev_talep_dilekcesi text,
  gorev_fesih_dilekcesi text,
  created_at timestamp with time zone DEFAULT now()
);

-- Aynı kulüp-danışman için birden fazla aktif kayıt olmasın
CREATE UNIQUE INDEX IF NOT EXISTS uniq_aktif_kulup_danisman
ON public.kulup_danismanlar (kulup_id, danisman_id)
WHERE aktif = true;

-- RLS (temel): şimdilik sadece authenticated kullanıcılar görebilsin; admin servis zaten admin doğruluyor
ALTER TABLE public.kulup_danismanlar ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kulup_danismanlar' AND policyname = 'kulup_danismanlar_select_authenticated'
  ) THEN
    CREATE POLICY "kulup_danismanlar_select_authenticated"
    ON public.kulup_danismanlar
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kulup_danismanlar' AND policyname = 'kulup_danismanlar_admin_insert_update'
  ) THEN
    CREATE POLICY "kulup_danismanlar_admin_insert_update"
    ON public.kulup_danismanlar
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    )
    WITH CHECK (
      auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    );
  END IF;
END $$;


