-- Eski RLS politikasını düzelt - durum kolonu artık yok, JSONB onay sistemi kullanıyoruz

-- Mevcut eski politikayı kaldır
DROP POLICY IF EXISTS "Kulüp başkanları başvurularını güncelleyebilir" ON etkinlik_basvurulari;

-- Yeni politika - JSONB onay sistemi ile uyumlu
CREATE POLICY "Kulüp başkanları başvurularını güncelleyebilir" 
ON etkinlik_basvurulari FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'kulup_baskani' AND kulup_id = etkinlik_basvurulari.kulup_id
  )
  AND
  -- JSONB onay sistemi kontrolü: henüz tam onaylanmamış başvurular güncellenebilir
  (
    -- Danışman henüz onaylamamış VEYA reddedmiş 
    (danisman_onay IS NULL OR (danisman_onay->>'durum')::text != 'Onaylandı')
    OR
    -- SKS henüz onaylamamış VEYA reddedmiş
    (sks_onay IS NULL OR (sks_onay->>'durum')::text != 'Onaylandı')
    OR
    -- Revizyon başvuruları her zaman güncellenebilir
    revizyon = true
  )
);
