-- etkinlik_basvurulari tablosuna danışman ve SKS onay sütunlarını ekler
-- Bu sütunlar başvuruların onay durumlarını JSONB formatında tutar

ALTER TABLE etkinlik_basvurulari 
ADD COLUMN IF NOT EXISTS danisman_onay JSONB;

ALTER TABLE etkinlik_basvurulari 
ADD COLUMN IF NOT EXISTS sks_onay JSONB;

-- İndeksler ekliyoruz
CREATE INDEX IF NOT EXISTS idx_etkinlik_basvurulari_danisman_onay 
ON etkinlik_basvurulari USING GIN (danisman_onay);

CREATE INDEX IF NOT EXISTS idx_etkinlik_basvurulari_sks_onay 
ON etkinlik_basvurulari USING GIN (sks_onay);

-- Yorum ekleyalım
COMMENT ON COLUMN etkinlik_basvurulari.danisman_onay IS 'Danışman onay bilgisi: { durum: "Onaylandı/Reddedildi", tarih: ISO date, redSebebi?: string }';
COMMENT ON COLUMN etkinlik_basvurulari.sks_onay IS 'SKS onay bilgisi: { durum: "Onaylandı/Reddedildi", tarih: ISO date, redSebebi?: string }';
