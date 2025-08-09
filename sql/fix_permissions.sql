-- Fix permissions for etkinlik_basvurulari related tables

-- Sponsorlar tablosu için politikalar
ALTER TABLE sponsorlar ENABLE ROW LEVEL SECURITY;

-- Herkes sponsorları görebilir (başvuru bilgisine göre filtrelenir)
CREATE POLICY "Sponsorları görüntüleme politikası" 
ON sponsorlar FOR SELECT 
TO authenticated 
USING (
  -- Admin ve SKS hepsini görebilir
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
  )
  OR
  -- Kulüp başkanları sadece kendi kulüplerinin başvurularına ait sponsorları görebilir
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN etkinlik_basvurulari e ON e.kulup_id = p.kulup_id
    WHERE p.id = auth.uid() AND p.role = 'kulup_baskani' AND e.id = sponsorlar.basvuru_id
  )
  OR
  -- Danışmanlar kendi danışmanı oldukları kulüplerin başvurularına ait sponsorları görebilir
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN kulupler k ON k.akademik_danisman_id = p.danisman_id
    JOIN etkinlik_basvurulari e ON e.kulup_id = k.id
    WHERE p.id = auth.uid() AND p.role = 'danisman' AND e.id = sponsorlar.basvuru_id
  )
);

-- Kulüp başkanları sponsorları ekleyebilir
CREATE POLICY "Kulüp başkanları sponsorları ekleyebilir" 
ON sponsorlar FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN etkinlik_basvurulari e ON e.kulup_id = p.kulup_id
    WHERE p.id = auth.uid() AND p.role = 'kulup_baskani' AND e.id = sponsorlar.basvuru_id
  )
);

-- Kulüp başkanları sponsorları güncelleyebilir
CREATE POLICY "Kulüp başkanları sponsorları güncelleyebilir" 
ON sponsorlar FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN etkinlik_basvurulari e ON e.kulup_id = p.kulup_id
    WHERE p.id = auth.uid() AND p.role = 'kulup_baskani' AND e.id = sponsorlar.basvuru_id
  )
);

-- Konuşmacılar tablosu için politikalar
ALTER TABLE konusmacilar ENABLE ROW LEVEL SECURITY;

-- Herkes konuşmacıları görebilir (başvuru bilgisine göre filtrelenir)
CREATE POLICY "Konuşmacıları görüntüleme politikası" 
ON konusmacilar FOR SELECT 
TO authenticated 
USING (
  -- Admin ve SKS hepsini görebilir
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
  )
  OR
  -- Kulüp başkanları sadece kendi kulüplerinin başvurularına ait konuşmacıları görebilir
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN etkinlik_basvurulari e ON e.kulup_id = p.kulup_id
    WHERE p.id = auth.uid() AND p.role = 'kulup_baskani' AND e.id = konusmacilar.basvuru_id
  )
  OR
  -- Danışmanlar kendi danışmanı oldukları kulüplerin başvurularına ait konuşmacıları görebilir
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN kulupler k ON k.akademik_danisman_id = p.danisman_id
    JOIN etkinlik_basvurulari e ON e.kulup_id = k.id
    WHERE p.id = auth.uid() AND p.role = 'danisman' AND e.id = konusmacilar.basvuru_id
  )
);

-- Kulüp başkanları konuşmacıları ekleyebilir
CREATE POLICY "Kulüp başkanları konuşmacıları ekleyebilir" 
ON konusmacilar FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN etkinlik_basvurulari e ON e.kulup_id = p.kulup_id
    WHERE p.id = auth.uid() AND p.role = 'kulup_baskani' AND e.id = konusmacilar.basvuru_id
  )
);

-- Kulüp başkanları konuşmacıları güncelleyebilir
CREATE POLICY "Kulüp başkanları konuşmacıları güncelleyebilir" 
ON konusmacilar FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN etkinlik_basvurulari e ON e.kulup_id = p.kulup_id
    WHERE p.id = auth.uid() AND p.role = 'kulup_baskani' AND e.id = konusmacilar.basvuru_id
  )
);

-- Etkinlik belgeleri tablosu için politikalar
ALTER TABLE etkinlik_belgeleri ENABLE ROW LEVEL SECURITY;

-- Herkes etkinlik belgelerini görebilir (başvuru bilgisine göre filtrelenir)
CREATE POLICY "Etkinlik belgelerini görüntüleme politikası" 
ON etkinlik_belgeleri FOR SELECT 
TO authenticated 
USING (
  -- Admin ve SKS hepsini görebilir
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
  )
  OR
  -- Kulüp başkanları sadece kendi kulüplerinin başvurularına ait belgeleri görebilir
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN etkinlik_basvurulari e ON e.kulup_id = p.kulup_id
    WHERE p.id = auth.uid() AND p.role = 'kulup_baskani' AND e.id = etkinlik_belgeleri.basvuru_id
  )
  OR
  -- Danışmanlar kendi danışmanı oldukları kulüplerin başvurularına ait belgeleri görebilir
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN kulupler k ON k.akademik_danisman_id = p.danisman_id
    JOIN etkinlik_basvurulari e ON e.kulup_id = k.id
    WHERE p.id = auth.uid() AND p.role = 'danisman' AND e.id = etkinlik_belgeleri.basvuru_id
  )
);

-- Kulüp başkanları etkinlik belgelerini ekleyebilir
CREATE POLICY "Kulüp başkanları etkinlik belgelerini ekleyebilir" 
ON etkinlik_belgeleri FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN etkinlik_basvurulari e ON e.kulup_id = p.kulup_id
    WHERE p.id = auth.uid() AND p.role = 'kulup_baskani' AND e.id = etkinlik_belgeleri.basvuru_id
  )
);

-- Kulüp başkanları etkinlik belgelerini güncelleyebilir
CREATE POLICY "Kulüp başkanları etkinlik belgelerini güncelleyebilir" 
ON etkinlik_belgeleri FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN etkinlik_basvurulari e ON e.kulup_id = p.kulup_id
    WHERE p.id = auth.uid() AND p.role = 'kulup_baskani' AND e.id = etkinlik_belgeleri.basvuru_id
  )
); 