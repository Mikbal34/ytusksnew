-- Etkinlik başvuruları tablosuna etkinlik görseli sütunu ekleme
-- Bu sütun etkinlik görselinin storage path'ini tutar

ALTER TABLE etkinlik_basvurulari 
ADD COLUMN IF NOT EXISTS etkinlik_gorseli TEXT;

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_etkinlik_basvurulari_etkinlik_gorseli 
ON etkinlik_basvurulari(etkinlik_gorseli) WHERE etkinlik_gorseli IS NOT NULL;

-- Yorum ekle
COMMENT ON COLUMN etkinlik_basvurulari.etkinlik_gorseli IS 'Etkinlik görselinin storage bucket yolu (300x300-2048x2048 pixel, max 5MB, jpg/jpeg/png formatında)';
