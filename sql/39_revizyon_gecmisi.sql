-- Revizyon geçmişi tablosu oluştur
-- Her revizyon öncesi başvurunun eski durumunu kaydet

CREATE TABLE IF NOT EXISTS public.etkinlik_revizyon_gecmisi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    basvuru_id UUID NOT NULL REFERENCES etkinlik_basvurulari(id) ON DELETE CASCADE,
    
    -- Revizyon bilgileri
    revizyon_numarasi INTEGER NOT NULL, -- 1, 2, 3...
    revizyon_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revizyon_turu VARCHAR(20) NOT NULL, -- 'belgeler', 'etkinlik', 'ikisi'
    revizyon_yapan_id UUID, -- Hangi kullanıcı revize etti
    revizyon_aciklamasi TEXT, -- Neden revize edildi
    
    -- Eski değerler (revizyon öncesi durum)
    eski_etkinlik_adi VARCHAR NOT NULL,
    eski_aciklama TEXT,
    eski_etkinlik_turu VARCHAR,
    eski_diger_turu_aciklama TEXT,
    eski_etkinlik_yeri JSONB,
    eski_zaman_dilimleri JSONB,
    eski_danisman_onay JSONB,
    eski_sks_onay JSONB,
    eski_etkinlik_gorseli TEXT,
    
    -- Hangi alanların değiştiği
    degisen_alanlar JSONB, -- ["etkinlik_adi", "aciklama", "belgeler"]
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- İndeksler için
    CONSTRAINT etkinlik_revizyon_gecmisi_revizyon_turu_check 
        CHECK (revizyon_turu IN ('belgeler', 'etkinlik', 'ikisi'))
);

-- İndeksler oluştur
CREATE INDEX IF NOT EXISTS idx_etkinlik_revizyon_gecmisi_basvuru_id 
    ON public.etkinlik_revizyon_gecmisi(basvuru_id);

CREATE INDEX IF NOT EXISTS idx_etkinlik_revizyon_gecmisi_revizyon_tarihi 
    ON public.etkinlik_revizyon_gecmisi(revizyon_tarihi DESC);

CREATE INDEX IF NOT EXISTS idx_etkinlik_revizyon_gecmisi_revizyon_turu 
    ON public.etkinlik_revizyon_gecmisi(revizyon_turu);

-- Tablo yorumu ekle
COMMENT ON TABLE public.etkinlik_revizyon_gecmisi IS 
'Etkinlik başvuruların revizyon geçmişini saklar. Her revizyon öncesi eski durum buraya kaydedilir.';

-- Kolon yorumları
COMMENT ON COLUMN public.etkinlik_revizyon_gecmisi.revizyon_numarasi IS 
'Başvuru için revizyon sırası (1: ilk revizyon, 2: ikinci revizyon, vs.)';

COMMENT ON COLUMN public.etkinlik_revizyon_gecmisi.revizyon_turu IS 
'Hangi tür revizyon yapıldı: belgeler, etkinlik, ikisi';

COMMENT ON COLUMN public.etkinlik_revizyon_gecmisi.degisen_alanlar IS 
'JSON array: Hangi alanların değiştiği ["etkinlik_adi", "aciklama"]';

COMMENT ON COLUMN public.etkinlik_revizyon_gecmisi.eski_etkinlik_yeri IS 
'Revizyon öncesi etkinlik yeri bilgisi: {"fakulte": "...", "detay": "..."}';

COMMENT ON COLUMN public.etkinlik_revizyon_gecmisi.eski_zaman_dilimleri IS 
'Revizyon öncesi zaman dilimi bilgileri JSON array olarak';
