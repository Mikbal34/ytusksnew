CREATE TABLE ek_belgeler (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etkinlik_id UUID REFERENCES etkinlik_basvurulari(id) ON DELETE CASCADE,
  tip VARCHAR NOT NULL,
  dosya_adi VARCHAR NOT NULL,
  dosya_yolu TEXT,
  olusturma_tarihi TIMESTAMP WITH TIME ZONE DEFAULT now(),
  danisman_onay JSONB,
  sks_onay JSONB,
  aciklama TEXT,
  durum VARCHAR DEFAULT 'Beklemede'
);

-- Güvenlik politikası
ALTER TABLE ek_belgeler ENABLE ROW LEVEL SECURITY;

-- Kulüp başkanları kendi etkinliklerine ait ek belgeleri görebilir
CREATE POLICY ek_belgeler_kulup_baskani_select
  ON ek_belgeler
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM etkinlik_basvurulari eb
      JOIN profiles p ON eb.kulup_id = p.kulup_id
      WHERE eb.id = etkinlik_id
      AND p.id = auth.uid()
      AND p.role = 'kulup_baskani'
    )
  );

-- Kulüp başkanı kendi kulübünün etkinliklerine ait ek belge ekleyebilir
CREATE POLICY ek_belgeler_kulup_baskani_insert
  ON ek_belgeler
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM etkinlik_basvurulari eb
      JOIN profiles p ON eb.kulup_id = p.kulup_id
      WHERE eb.id = etkinlik_id
      AND p.id = auth.uid()
      AND p.role = 'kulup_baskani'
    )
  );

-- Kulüp başkanı kendi kulübünün etkinliklerine ait ek belgeleri güncelleyebilir
CREATE POLICY ek_belgeler_kulup_baskani_update
  ON ek_belgeler
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM etkinlik_basvurulari eb
      JOIN profiles p ON eb.kulup_id = p.kulup_id
      WHERE eb.id = etkinlik_id
      AND p.id = auth.uid()
      AND p.role = 'kulup_baskani'
    )
  );

-- Kulüp başkanı kendi kulübünün etkinliklerine ait ek belgeleri silebilir
CREATE POLICY ek_belgeler_kulup_baskani_delete
  ON ek_belgeler
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM etkinlik_basvurulari eb
      JOIN profiles p ON eb.kulup_id = p.kulup_id
      WHERE eb.id = etkinlik_id
      AND p.id = auth.uid()
      AND p.role = 'kulup_baskani'
    )
  );

-- Danışmanlar ve SKS tüm ek belgeleri görebilir
CREATE POLICY ek_belgeler_danisman_select
  ON ek_belgeler
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      WHERE p.role IN ('danisman', 'sks', 'admin')
    )
  );

-- Danışmanlar ve SKS ek belgeleri güncelleyebilir (onaylama veya reddetme için)
CREATE POLICY ek_belgeler_danisman_update
  ON ek_belgeler
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      WHERE p.role IN ('danisman', 'sks', 'admin')
    )
  );

-- Admin her şeyi yapabilir
CREATE POLICY ek_belgeler_admin_all
  ON ek_belgeler
  USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      WHERE p.role = 'admin'
    )
  ); 