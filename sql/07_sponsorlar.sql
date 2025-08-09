CREATE TABLE sponsorlar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basvuru_id UUID REFERENCES etkinlik_basvurulari(id) ON DELETE CASCADE,
  firma_adi VARCHAR NOT NULL,
  detay TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 