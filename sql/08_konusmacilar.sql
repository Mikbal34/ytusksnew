CREATE TABLE konusmacilar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basvuru_id UUID REFERENCES etkinlik_basvurulari(id) ON DELETE CASCADE,
  ad_soyad VARCHAR NOT NULL,
  ozgecmis TEXT,
  aciklama TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 