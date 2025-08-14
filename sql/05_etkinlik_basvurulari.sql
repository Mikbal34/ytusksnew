CREATE TABLE etkinlik_basvurulari (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kulup_id UUID REFERENCES kulupler(id) ON DELETE CASCADE,
  etkinlik_adi VARCHAR NOT NULL,
  etkinlik_fakulte VARCHAR NOT NULL,
  etkinlik_yeri_detay VARCHAR NOT NULL,
  baslangic_tarihi TIMESTAMP WITH TIME ZONE NOT NULL,
  bitis_tarihi TIMESTAMP WITH TIME ZONE NOT NULL,
  etkinlik_turu VARCHAR,
  diger_turu_aciklama VARCHAR,
  aciklama TEXT,
  durum VARCHAR NOT NULL DEFAULT 'Beklemede',
  revizyon BOOLEAN DEFAULT FALSE,
  orijinal_basvuru_id UUID REFERENCES etkinlik_basvurulari(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 