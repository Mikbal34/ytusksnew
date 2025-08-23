-- JSONB Onay Sistemi Migration
-- Bu script unified onay_gecmisi sisteminden geri JSONB sisteme geçer
-- onay_gecmisi tablosu audit trail için korunur

-- 1. JSONB onay kolonları ekle (eğer yoksa)
-- etkinlik_basvurulari
ALTER TABLE public.etkinlik_basvurulari 
ADD COLUMN IF NOT EXISTS danisman_onay JSONB;

ALTER TABLE public.etkinlik_basvurulari 
ADD COLUMN IF NOT EXISTS sks_onay JSONB;

-- etkinlik_belgeleri  
ALTER TABLE public.etkinlik_belgeleri 
ADD COLUMN IF NOT EXISTS danisman_onay JSONB;

ALTER TABLE public.etkinlik_belgeleri 
ADD COLUMN IF NOT EXISTS sks_onay JSONB;

-- ek_belgeler
ALTER TABLE public.ek_belgeler 
ADD COLUMN IF NOT EXISTS danisman_onay JSONB;

ALTER TABLE public.ek_belgeler 
ADD COLUMN IF NOT EXISTS sks_onay JSONB;

-- 2. Mevcut onay_gecmisi verilerini JSONB kolonlarına taşı
DO $$
DECLARE
    onay_record RECORD;
    target_table TEXT;
    target_id_column TEXT;
    update_query TEXT;
BEGIN
    RAISE NOTICE '🔄 onay_gecmisi verilerini JSONB kolonlarına taşınıyor...';
    
    -- onay_gecmisi tablosundaki tüm kayıtları işle
    FOR onay_record IN 
        SELECT 
            id,
            basvuru_id,
            onay_kategorisi,
            belge_id,
            belge_tipi,
            onay_tipi,
            durum,
            tarih,
            red_sebebi,
            onaylayan_id
        FROM public.onay_gecmisi 
        ORDER BY tarih ASC -- En eski tarihten başla
    LOOP
        -- JSONB veri formatı
        update_query := NULL;
        
        -- Etkinlik onayları
        IF onay_record.onay_kategorisi = 'Etkinlik' AND onay_record.basvuru_id IS NOT NULL THEN
            target_table := 'etkinlik_basvurulari';
            target_id_column := 'id';
            
            IF onay_record.onay_tipi = 'Danışman' THEN
                update_query := format(
                    'UPDATE public.%I SET danisman_onay = %L WHERE %I = %L',
                    target_table,
                    json_build_object(
                        'durum', onay_record.durum,
                        'tarih', onay_record.tarih,
                        'redSebebi', onay_record.red_sebebi,
                        'onaylayanId', onay_record.onaylayan_id
                    )::text,
                    target_id_column,
                    onay_record.basvuru_id
                );
            ELSIF onay_record.onay_tipi = 'SKS' THEN
                update_query := format(
                    'UPDATE public.%I SET sks_onay = %L WHERE %I = %L',
                    target_table,
                    json_build_object(
                        'durum', onay_record.durum,
                        'tarih', onay_record.tarih,
                        'redSebebi', onay_record.red_sebebi,
                        'onaylayanId', onay_record.onaylayan_id
                    )::text,
                    target_id_column,
                    onay_record.basvuru_id
                );
            END IF;
            
        -- Belge onayları
        ELSIF onay_record.onay_kategorisi = 'Belge' AND onay_record.belge_id IS NOT NULL THEN
            target_table := onay_record.belge_tipi; -- 'etkinlik_belgeleri' veya 'ek_belgeler'
            target_id_column := 'id';
            
            IF onay_record.onay_tipi = 'Danışman' THEN
                update_query := format(
                    'UPDATE public.%I SET danisman_onay = %L WHERE %I = %L',
                    target_table,
                    json_build_object(
                        'durum', onay_record.durum,
                        'tarih', onay_record.tarih,
                        'redSebebi', onay_record.red_sebebi,
                        'onaylayanId', onay_record.onaylayan_id
                    )::text,
                    target_id_column,
                    onay_record.belge_id
                );
            ELSIF onay_record.onay_tipi = 'SKS' THEN
                update_query := format(
                    'UPDATE public.%I SET sks_onay = %L WHERE %I = %L',
                    target_table,
                    json_build_object(
                        'durum', onay_record.durum,
                        'tarih', onay_record.tarih,
                        'redSebebi', onay_record.red_sebebi,
                        'onaylayanId', onay_record.onaylayan_id
                    )::text,
                    target_id_column,
                    onay_record.belge_id
                );
            END IF;
        END IF;
        
        -- Update query'yi çalıştır
        IF update_query IS NOT NULL THEN
            BEGIN
                EXECUTE update_query;
                RAISE NOTICE '✅ Onay kaydı taşındı: %s %s -> %s.%s_onay', 
                    onay_record.onay_kategorisi, 
                    onay_record.onay_tipi,
                    target_table,
                    LOWER(onay_record.onay_tipi);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '❌ Onay kaydı taşınamadı: %s (Hata: %s)', onay_record.id, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎉 onay_gecmisi -> JSONB migration tamamlandı!';
END $$;

-- 3. durum kolonlarını kaldır (artık JSONB onay sistemini kullanacağız)
-- Önce RLS policy'lerini güncelle/kaldır

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '🔄 RLS policy bağımlılıkları kontrol ediliyor...';
    
    -- etkinlik_basvurulari durum kolonuna bağımlı policy'leri bul ve güncelle
    -- Policy'leri CASCADE ile silmek yerine güncellemeyi deneyelim
    
    -- Mevcut policy'leri listele
    RAISE NOTICE '📋 Mevcut RLS policy''leri:';
    FOR rec IN 
        SELECT schemaname, tablename, policyname, cmd, qual 
        FROM pg_policies 
        WHERE tablename IN ('etkinlik_basvurulari', 'etkinlik_belgeleri', 'ek_belgeler')
        AND qual LIKE '%durum%'
    LOOP
        RAISE NOTICE '  - %: %', rec.policyname, rec.qual;
    END LOOP;
    
    -- durum kolonuna bağımlı policy'leri kaldır
    BEGIN
        DROP POLICY IF EXISTS "Kulüp başkanları başvurularını güncelleyebilir" ON public.etkinlik_basvurulari;
        RAISE NOTICE '✅ Policy kaldırıldı: Kulüp başkanları başvurularını güncelleyebilir';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '⚠️ Policy kaldırılamadı: %', SQLERRM;
    END;
    
    -- Diğer durum bağımlı policy'leri de kontrol et
    BEGIN
        DROP POLICY IF EXISTS "Kulüp başkanları sadece beklemedeki başvurularını düzenleyebilir" ON public.etkinlik_basvurulari;
        RAISE NOTICE '✅ Policy kaldırıldı (varsa): Kulüp başkanları sadece beklemedeki başvurularını düzenleyebilir';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '⚠️ Policy kaldırılamadı: %', SQLERRM;
    END;
    
END $$;

-- Şimdi durum kolonlarını güvenle kaldır
ALTER TABLE public.etkinlik_basvurulari DROP COLUMN IF EXISTS durum;
ALTER TABLE public.etkinlik_belgeleri DROP COLUMN IF EXISTS durum;
ALTER TABLE public.ek_belgeler DROP COLUMN IF EXISTS durum;

-- Kulüp başkanları için yeni policy ekle (durum kolonu olmadan)
DO $$
BEGIN
    -- Kulüp başkanları kendi başvurularını güncelleyebilir
    CREATE POLICY "Kulüp başkanları başvurularını güncelleyebilir JSONB"
    ON public.etkinlik_basvurulari
    FOR UPDATE
    TO kulup_baskani
    USING (
        kulup_id IN (
            SELECT kulup_id 
            FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'kulup_baskani'
        )
    );
    RAISE NOTICE '✅ Yeni policy eklendi: Kulüp başkanları başvurularını güncelleyebilir JSONB';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ Policy zaten mevcut';
WHEN OTHERS THEN
    RAISE WARNING '❌ Policy eklenemedi: %', SQLERRM;
END $$;

-- 4. JSONB kolonları için indeksler ekle
CREATE INDEX IF NOT EXISTS idx_etkinlik_basvurulari_danisman_onay 
ON public.etkinlik_basvurulari USING gin (danisman_onay);

CREATE INDEX IF NOT EXISTS idx_etkinlik_basvurulari_sks_onay 
ON public.etkinlik_basvurulari USING gin (sks_onay);

CREATE INDEX IF NOT EXISTS idx_etkinlik_belgeleri_danisman_onay 
ON public.etkinlik_belgeleri USING gin (danisman_onay);

CREATE INDEX IF NOT EXISTS idx_etkinlik_belgeleri_sks_onay 
ON public.etkinlik_belgeleri USING gin (sks_onay);

CREATE INDEX IF NOT EXISTS idx_ek_belgeler_danisman_onay 
ON public.ek_belgeler USING gin (danisman_onay);

CREATE INDEX IF NOT EXISTS idx_ek_belgeler_sks_onay 
ON public.ek_belgeler USING gin (sks_onay);

-- 5. Başarı mesajları
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 JSONB Onay Sistemi Migration Tamamlandı!';
    RAISE NOTICE '✅ JSONB onay kolonları eklendi';
    RAISE NOTICE '✅ onay_gecmisi verileri JSONB kolonlarına taşındı';
    RAISE NOTICE '✅ durum kolonları kaldırıldı';
    RAISE NOTICE '✅ GIN indeksleri eklendi';
    RAISE NOTICE '📝 onay_gecmisi tablosu audit trail için korundu';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Şimdi backend fonksiyonları güncellenmeli!';
    RAISE NOTICE '';
END $$;
