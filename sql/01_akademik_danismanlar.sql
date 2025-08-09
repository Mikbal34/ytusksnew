CREATE TABLE akademik_danismanlar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_soyad VARCHAR NOT NULL,
  bolum VARCHAR NOT NULL,
  eposta VARCHAR NOT NULL,
  telefon VARCHAR NOT NULL,
  fakulte VARCHAR NOT NULL,
  oda_no VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 