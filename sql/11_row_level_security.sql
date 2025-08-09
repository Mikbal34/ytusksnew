-- Profiles tablosu için RLS politikaları
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Herkes kendi profilini görebilir
CREATE POLICY "Kullanıcılar kendi profillerini görüntüleyebilir" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Kullanıcılar sadece kendi profillerini güncelleyebilir
CREATE POLICY "Kullanıcılar kendi profillerini güncelleyebilir" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Admin tüm profillere erişebilir
CREATE POLICY "Admin tüm profillere erişebilir" 
ON profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Kulüp tablosu için politikalar
ALTER TABLE kulupler ENABLE ROW LEVEL SECURITY;

-- Herkes kulüpleri görebilir
CREATE POLICY "Kulüpleri herkes görebilir" 
ON kulupler FOR SELECT 
TO authenticated 
USING (true);

-- Admin ve SKS kulüpleri oluşturabilir
CREATE POLICY "Admin ve SKS kulüpleri oluşturabilir" 
ON kulupler FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
  )
);

-- Admin ve SKS tüm kulüpleri düzenleyebilir
CREATE POLICY "Admin ve SKS kulüpleri düzenleyebilir" 
ON kulupler FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
  )
);

-- Kulüp başkanları kendi kulüplerini düzenleyebilir
CREATE POLICY "Kulüp başkanları kendi kulüplerini düzenleyebilir" 
ON kulupler FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'kulup_baskani' AND kulup_id = kulupler.id
  )
);

-- Etkinlik başvuruları için politikalar
ALTER TABLE etkinlik_basvurulari ENABLE ROW LEVEL SECURITY;

-- Herkes başvuruları görebilir (kulüp bilgisine göre filtrelenir)
CREATE POLICY "Başvuruları görüntüleme politikası" 
ON etkinlik_basvurulari FOR SELECT 
TO authenticated 
USING (
  -- Admin ve SKS hepsini görebilir
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
  )
  OR
  -- Kulüp başkanları sadece kendi kulüplerinin başvurularını görebilir
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'kulup_baskani' AND kulup_id = etkinlik_basvurulari.kulup_id
  )
  OR
  -- Danışmanlar kendi danışmanı oldukları kulüplerin başvurularını görebilir
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN kulupler k ON k.akademik_danisman_id = p.danisman_id
    WHERE p.id = auth.uid() AND p.role = 'danisman' AND k.id = etkinlik_basvurulari.kulup_id
  )
);

-- Kulüp başkanları başvuru oluşturabilir
CREATE POLICY "Kulüp başkanları başvuru oluşturabilir" 
ON etkinlik_basvurulari FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'kulup_baskani' AND kulup_id = etkinlik_basvurulari.kulup_id
  )
);

-- Kulüp başkanları kendi başvurularını güncelleyebilir
CREATE POLICY "Kulüp başkanları başvurularını güncelleyebilir" 
ON etkinlik_basvurulari FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'kulup_baskani' AND kulup_id = etkinlik_basvurulari.kulup_id
  )
  AND
  -- Sadece beklemede veya reddedilmiş başvurular güncellenebilir
  (etkinlik_basvurulari.durum = 'Beklemede' OR etkinlik_basvurulari.durum = 'Reddedildi')
);

-- SKS başvuruları onaylayabilir veya reddedebilir
CREATE POLICY "SKS başvuruları değerlendirebilir" 
ON etkinlik_basvurulari FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'sks'
  )
);

-- Danışmanlar başvuruları onaylayabilir veya reddedebilir
CREATE POLICY "Danışmanlar başvuruları değerlendirebilir" 
ON etkinlik_basvurulari FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN kulupler k ON k.akademik_danisman_id = p.danisman_id
    WHERE p.id = auth.uid() AND p.role = 'danisman' AND k.id = etkinlik_basvurulari.kulup_id
  )
);

-- Alt Topluluklar tablosu için politikalar
ALTER TABLE alt_topluluklar ENABLE ROW LEVEL SECURITY;

-- Herkes alt toplulukları görebilir
CREATE POLICY "Alt toplulukları herkes görebilir" 
ON alt_topluluklar FOR SELECT 
TO authenticated 
USING (true);

-- Admin ve SKS alt toplulukları ekleyebilir
CREATE POLICY "Admin ve SKS alt toplulukları ekleyebilir" 
ON alt_topluluklar FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
  )
);

-- Admin ve SKS alt toplulukları düzenleyebilir
CREATE POLICY "Admin ve SKS alt toplulukları düzenleyebilir" 
ON alt_topluluklar FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
  )
);

-- Kulüp başkanları kendi kulüplerinin alt topluluklarını düzenleyebilir
CREATE POLICY "Kulüp başkanları kendi alt topluluklarını düzenleyebilir" 
ON alt_topluluklar FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'kulup_baskani' AND kulup_id = alt_topluluklar.kulup_id
  )
);

-- Kulüp başkanları kendi kulüplerine alt topluluk ekleyebilir
CREATE POLICY "Kulüp başkanları kendi kulüplerine alt topluluk ekleyebilir" 
ON alt_topluluklar FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'kulup_baskani' AND kulup_id = alt_topluluklar.kulup_id
  )
);

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