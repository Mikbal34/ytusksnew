-- Etkinlik belgeleri tablosuna belge notu sütunu ekleme
-- Bu sütun kullanıcının belgeyle ilgili bıraktığı notları tutar

ALTER TABLE etkinlik_belgeleri 
ADD COLUMN IF NOT EXISTS belge_notu TEXT;

-- İndeks ekle (not araması için)
CREATE INDEX IF NOT EXISTS idx_etkinlik_belgeleri_belge_notu 
ON etkinlik_belgeleri(belge_notu) WHERE belge_notu IS NOT NULL;

-- Yorum ekle
COMMENT ON COLUMN etkinlik_belgeleri.belge_notu IS 'Kullanıcının belgeyle ilgili bıraktığı not/açıklama';

-- Ek belgeleri tablosuna da belge notu sütunu ekle (tutarlılık için)
ALTER TABLE ek_belgeler 
ADD COLUMN IF NOT EXISTS belge_notu TEXT;

-- Yorum ekle
COMMENT ON COLUMN ek_belgeler.belge_notu IS 'Kullanıcının belgeyle ilgili bıraktığı not/açıklama (aciklama sütunundan farklı)';
