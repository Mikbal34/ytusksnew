-- Kullanıcı rolleri için enum tipi
CREATE TYPE user_role AS ENUM ('admin', 'sks', 'danisman', 'kulup_baskani');

-- Kullanıcı profilleri tablosu
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR NOT NULL UNIQUE,
  ad_soyad VARCHAR NOT NULL,
  role user_role NOT NULL,
  kulup_id UUID REFERENCES kulupler(id),
  danisman_id UUID REFERENCES akademik_danismanlar(id),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 