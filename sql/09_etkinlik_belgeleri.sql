CREATE TABLE etkinlik_belgeleri (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basvuru_id UUID REFERENCES etkinlik_basvurulari(id) ON DELETE CASCADE,
  tip VARCHAR NOT NULL, -- Afiş, KatilimciListesi, KumanyaTalep, AracIstek, AfisBasim, Diger
  dosya_adi VARCHAR NOT NULL,
  dosya_yolu TEXT,
  danisman_onay JSONB, -- { durum: 'Onaylandı/Reddedildi', tarih: ISO date, redSebebi?: string }
  sks_onay JSONB, -- { durum: 'Onaylandı/Reddedildi', tarih: ISO date, redSebebi?: string }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 