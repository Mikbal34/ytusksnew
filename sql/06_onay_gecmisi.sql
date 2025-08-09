CREATE TABLE onay_gecmisi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basvuru_id UUID REFERENCES etkinlik_basvurulari(id) ON DELETE CASCADE,
  onay_tipi VARCHAR NOT NULL, -- Danışman veya SKS
  durum VARCHAR NOT NULL, -- Onaylandı veya Reddedildi
  tarih TIMESTAMP WITH TIME ZONE DEFAULT now(),
  red_sebebi TEXT,
  onaylayan_id UUID, -- Danışman veya SKS ID'si
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 