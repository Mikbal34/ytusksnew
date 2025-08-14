-- Etkinlik türü alanlarını ekler
ALTER TABLE etkinlik_basvurulari
  ADD COLUMN IF NOT EXISTS etkinlik_turu VARCHAR;

ALTER TABLE etkinlik_basvurulari
  ADD COLUMN IF NOT EXISTS diger_turu_aciklama VARCHAR;


