CREATE TABLE kulupler (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isim VARCHAR NOT NULL,
  akademik_danisman_id UUID REFERENCES akademik_danismanlar(id),
  baskan_ad_soyad VARCHAR NOT NULL,
  baskan_eposta VARCHAR NOT NULL,
  baskan_telefon VARCHAR NOT NULL,
  oda_no VARCHAR,
  diger_tesisler TEXT,
  tuzuk TEXT,
  logo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 