CREATE TABLE alt_topluluklar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kulup_id UUID REFERENCES kulupler(id) ON DELETE CASCADE,
  isim VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); 