import { supabase, supabaseAdmin } from './supabase';
import { UserProfile, UserRole } from './authService';

// Admin service for handling all admin operations
// This service should only be used by users with admin role

/**
 * Verifies if the current user has admin privileges
 * @returns true if user is admin, false otherwise
 */
export const verifyAdminAccess = async (): Promise<boolean> => {
  try {
    console.log('Checking admin access...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Oturum açmanız gerekiyor.');
      return false;
    }

    console.log('User found, checking profile:', user.id);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.error('Kullanıcı profili bulunamadı:', error);
      return false;
    }

    console.log('User profile found, role:', profile.role);
    if (profile.role !== 'admin') {
      console.error('Bu işlem için admin yetkisi gerekiyor. Mevcut rol:', profile.role);
      return false;
    }

    console.log('Admin access verified successfully');
    return true;
  } catch (error) {
    console.error('Admin yetki kontrolünde hata:', error);
    return false;
  }
};

/**
 * Get all users with a specific role
 */
export const getUsersByRole = async (role: UserRole): Promise<UserProfile[]> => {
  // Verify admin access
  await verifyAdminAccess();
  
  // Get users by role
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role);

  if (error) {
    console.error('Kullanıcılar alınırken hata:', error);
    throw error;
  }

  return data.map(profile => ({
    id: profile.id,
    email: profile.email,
    adSoyad: profile.ad_soyad,
    role: profile.role,
    kulupId: profile.kulup_id,
    danismanId: profile.danisman_id,
    avatarUrl: profile.avatar_url
  }));
};

/**
 * Create a new user with specified role
 */
export const createUser = async (
  email: string,
  password: string,
  adSoyad: string,
  role: UserRole,
  extraData: {
    kulupId?: string;
    danismanId?: string;
    telefon?: string;
    bolum?: string;
    fakulte?: string;
    odaNo?: string;
    departman?: string;
    gorev?: string;
  }
) => {
  // Verify admin access
  await verifyAdminAccess();
  
  console.log('Admin: Kullanıcı oluşturma başlatılıyor', { email, role });
  
  try {
    // 1. Create auth user - use supabaseAdmin for admin operations
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm email
      user_metadata: {
        role,
        ad_soyad: adSoyad,
        gorev: extraData.gorev || ''
        // departman alanı kaldırıldı
      }
    });

    if (authError) {
      console.error('Auth kullanıcı oluşturma hatası:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Kullanıcı oluşturulamadı');
    }

    const userId = authData.user.id;
    console.log('Auth kullanıcısı oluşturuldu:', userId);

    // 2. Create role-specific records
    let roleSpecificId;
    
    if (role === 'danisman') {
      const { data: danismanData, error: danismanError } = await supabase
        .from('akademik_danismanlar')
        .insert({
          ad_soyad: adSoyad,
          eposta: email,
          telefon: extraData.telefon || '',
          bolum: extraData.bolum || '',
          fakulte: extraData.fakulte || '',
          oda_no: extraData.odaNo || ''
        })
        .select();
      
      if (danismanError) {
        console.error('Danışman kaydı hatası:', danismanError);
        // Cleanup auth user on error
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw danismanError;
      }
      
      roleSpecificId = danismanData?.[0]?.id;
      console.log('Danışman kaydı oluşturuldu:', roleSpecificId);
    }
    
    if (role === 'sks') {
      try {
        // SKS kullanıcısını oluşturalım
        const { data: sksData, error: sksError } = await supabase
          .from('sks_kullanicilari')
          .insert({
            ad_soyad: adSoyad,
            eposta: email,
            telefon: extraData.telefon || '',
            rol: extraData.gorev || 'Personel'
            // Departman alanı kaldırıldı
          })
          .select();
          
        if (sksError) {
          console.error('SKS personeli kaydı hatası:', sksError);
          // Cleanup auth user on error
          await supabaseAdmin.auth.admin.deleteUser(userId);
          throw sksError;
        }
        
        console.log('SKS personeli kaydı oluşturuldu:', sksData);
      } catch (sksInsertError) {
        console.error('SKS insert işlemi genel hatası:', sksInsertError);
        // Cleanup auth user on error
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw sksInsertError;
      }
    }
    
    if (role === 'kulup_baskani' && extraData.kulupId) {
      // Update kulup with new president info
      const { error: kulupError } = await supabase
        .from('kulupler')
        .update({
          baskan_ad_soyad: adSoyad,
          baskan_eposta: email,
          baskan_telefon: extraData.telefon || ''
        })
        .eq('id', extraData.kulupId);
      
      if (kulupError) {
        console.error('Kulüp başkanı güncelleme hatası:', kulupError);
        // Cleanup auth user on error
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw kulupError;
      }
      
      console.log('Kulüp başkanı bilgileri güncellendi');
    }

    // 3. Create user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        ad_soyad: adSoyad,
        role,
        kulup_id: role === 'kulup_baskani' ? extraData.kulupId : null,
        danisman_id: role === 'danisman' ? roleSpecificId : extraData.danismanId || null
      });

    if (profileError) {
      console.error('Profil oluşturma hatası:', profileError);
      console.error('Hata detayları:', JSON.stringify(profileError, null, 2));
      // Cleanup auth user on error
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    console.log('Kullanıcı profili oluşturuldu');
    return { user: authData.user };
  } catch (error) {
    console.error('Kullanıcı oluşturma genel hatası:', error);
    throw error;
  }
};

/**
 * Delete a user by ID
 */
export const deleteUser = async (userId: string) => {
  // Verify admin access
  await verifyAdminAccess();
  
  try {
    console.log('Admin: Kullanıcı silme başlatılıyor', userId);
    
    // 1. Get user details first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Kullanıcı profili bulunamadı:', profileError);
      throw profileError;
    }
    
    // 2. Delete role-specific records if needed
    if (profile.role === 'danisman' && profile.danisman_id) {
      const { error: danismanError } = await supabase
        .from('akademik_danismanlar')
        .delete()
        .eq('id', profile.danisman_id);
      
      if (danismanError) {
        console.error('Danışman kaydı silinemedi:', danismanError);
        throw danismanError;
      }
    }
    
    if (profile.role === 'sks') {
      const { error: sksError } = await supabase
        .from('sks_kullanicilari')
        .delete()
        .eq('eposta', profile.email);
      
      if (sksError) {
        console.error('SKS personeli kaydı silinemedi:', sksError);
        throw sksError;
      }
    }
    
    // 3. Delete profile
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (deleteProfileError) {
      console.error('Kullanıcı profili silinemedi:', deleteProfileError);
      throw deleteProfileError;
    }
    
    // 4. Delete auth user - use supabaseAdmin for admin operations
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      console.error('Auth kullanıcısı silinemedi:', deleteAuthError);
      throw deleteAuthError;
    }
    
    console.log('Kullanıcı başarıyla silindi:', userId);
    return { success: true };
  } catch (error) {
    console.error('Kullanıcı silme genel hatası:', error);
    throw error;
  }
};

/**
 * Get all kulup records
 */
export const getAllKulupler = async () => {
  // Verify admin access
  await verifyAdminAccess();
  
  const { data, error } = await supabase
    .from('kulupler')
    .select('*, akademik_danismanlar(*)');
  
  if (error) {
    console.error('Kulüpler alınırken hata:', error);
    throw error;
  }
  
  return data;
};

/**
 * Kulübün danışmanlarını getir (çoklu)
 */
export const getKulupDanismanlari = async (kulupId: string) => {
  await verifyAdminAccess();
  const { data, error } = await supabase
    .from('kulup_danismanlar')
    .select(`*, akademik_danismanlar(*)`)
    .eq('kulup_id', kulupId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.akademik_danismanlar.id,
    adSoyad: r.akademik_danismanlar.ad_soyad,
    eposta: r.akademik_danismanlar.eposta,
    bolum: r.akademik_danismanlar.bolum,
    telefon: r.akademik_danismanlar.telefon,
    fakulte: r.akademik_danismanlar.fakulte,
    odaNo: r.akademik_danismanlar.oda_no,
    aktif: r.aktif,
    iliskiId: r.id,
    baslangic_tarihi: r.baslangic_tarihi,
    bitis_tarihi: r.bitis_tarihi,
    gorev_talep_dilekcesi: r.gorev_talep_dilekcesi,
    gorev_fesih_dilekcesi: r.gorev_fesih_dilekcesi,
  }));
};

/**
 * Kulübe danışman ekle (maks 2). Görev talep dilekçesi zorunlu.
 * dilekcePath: storage'da dosya yolu (dummy olabilir).
 */
export const addKulupDanisman = async (kulupId: string, danismanId: string, dilekcePath: string) => {
  await verifyAdminAccess();
  // Mevcut aktif sayısı kontrolü
  const { data: aktifler, error: cErr } = await supabase
    .from('kulup_danismanlar')
    .select('id')
    .eq('kulup_id', kulupId)
    .eq('aktif', true);
  if (cErr) throw cErr;
  if ((aktifler?.length || 0) >= 2) {
    throw new Error('Bir kulübe en fazla 2 aktif danışman eklenebilir');
  }
  if (!dilekcePath) {
    throw new Error('Görev Talep Dilekçesi yüklenmelidir');
  }
  const { error } = await supabase
    .from('kulup_danismanlar')
    .insert({ kulup_id: kulupId, danisman_id: danismanId, aktif: true, gorev_talep_dilekcesi: dilekcePath })
    .select();
  if (error) throw error;
  return true;
};

/**
 * Kulüpten danışman çıkar (aktif kaydı pasife alır). Görev fesih dilekçesi zorunlu.
 */
export const removeKulupDanisman = async (
  kulupId: string, 
  iliskiId: string, 
  fesihDilekcesiPath: string
) => {
  await verifyAdminAccess();
  if (!fesihDilekcesiPath) {
    throw new Error('Görev Fesih Dilekçesi yüklenmelidir');
  }
  const { error } = await supabase
    .from('kulup_danismanlar')
    .update({ aktif: false, bitis_tarihi: new Date().toISOString(), gorev_fesih_dilekcesi: fesihDilekcesiPath })
    .eq('id', iliskiId)
    .eq('kulup_id', kulupId)
    .eq('aktif', true);
  if (error) throw error;
  return true;
};

/**
 * Create a new kulup
 */
export const createKulup = async (kulupData: {
  isim: string;
  akademik_danisman_id?: string;
  baskan_ad_soyad: string;
  baskan_eposta: string;
  baskan_telefon: string;
  oda_no?: string;
  diger_tesisler?: string;
  tuzuk?: string;
  logo?: string;
}) => {
  try {
    // Verify admin access
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      const error = new Error('Bu işlem için admin yetkisi gerekiyor. Lütfen admin olarak giriş yapın.');
      console.error(error.message);
      throw error;
    }
    
    console.log('Admin: Kulüp oluşturma başlatılıyor', kulupData.isim);
    
    const { data, error } = await supabase
      .from('kulupler')
      .insert(kulupData)
      .select();
    
    if (error) {
      console.error('Kulüp oluşturma hatası:', error);
      const customError = new Error(`Kulüp oluşturulurken bir hata oluştu: ${error.message}`);
      throw customError;
    }
    
    if (!data || data.length === 0) {
      const error = new Error('Kulüp oluşturuldu ancak veri döndürülemedi.');
      console.error(error.message);
      throw error;
    }
    
    console.log('Kulüp başarıyla oluşturuldu:', data[0].id);
    return data[0];
  } catch (error) {
    console.error('Kulüp oluşturma genel hatası:', error);
    throw error;
  }
};

/**
 * Update an existing kulup
 */
export const updateKulup = async (
  kulupId: string,
  kulupData: {
    isim?: string;
    akademik_danisman_id?: string;
    baskan_ad_soyad?: string;
    baskan_eposta?: string;
    baskan_telefon?: string;
    oda_no?: string;
    diger_tesisler?: string;
    tuzuk?: string;
    logo?: string;
  }
) => {
  try {
    // Verify admin access
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      const error = new Error('Bu işlem için admin yetkisi gerekiyor. Lütfen admin olarak giriş yapın.');
      console.error(error.message);
      throw error;
    }

    const { data, error } = await supabase
      .from('kulupler')
      .update(kulupData)
      .eq('id', kulupId)
      .select();

    if (error) {
      console.error('Kulüp güncelleme hatası:', error);
      throw error;
    }

    return data?.[0];
  } catch (error) {
    console.error('Kulüp güncelleme genel hatası:', error);
    throw error;
  }
};

/**
 * Get all akademik_danismanlar records
 */
export const getAllDanismanlar = async () => {
  try {
    // Verify admin access
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      console.error('Bu işlem için admin yetkisi gerekiyor.');
      return []; // Hata durumunda boş dizi döndür
    }
    
    const { data, error } = await supabase
      .from('akademik_danismanlar')
      .select('*');
    
    if (error) {
      console.error('Danışmanlar alınırken hata:', error);
      return []; // Hata durumunda boş dizi döndür
    }
    
    // Map database fields (snake_case) to component expected fields (camelCase)
    return data ? data.map(danisman => ({
      id: danisman.id,
      adSoyad: danisman.ad_soyad,
      eposta: danisman.eposta,
      bolum: danisman.bolum,
      telefon: danisman.telefon,
      fakulte: danisman.fakulte,
      odaNo: danisman.oda_no
    })) : [];
  } catch (error) {
    console.error('Danışmanlar alınırken genel hata:', error);
    return []; // Hata durumunda boş dizi döndür
  }
};

/**
 * Create a new akademik_danisman
 */
export const createDanisman = async (danismanData: {
  ad_soyad: string;
  eposta: string;
  telefon?: string;
  bolum: string;
  fakulte: string;
  oda_no?: string;
}) => {
  // Verify admin access
  await verifyAdminAccess();
  
  try {
    console.log('Admin: Danışman oluşturma başlatılıyor', danismanData.ad_soyad);
    
    const { data, error } = await supabase
      .from('akademik_danismanlar')
      .insert(danismanData)
      .select();
    
    if (error) {
      console.error('Danışman oluşturma hatası:', error);
      throw error;
    }
    
    console.log('Danışman başarıyla oluşturuldu:', data?.[0]?.id);
    return data?.[0];
  } catch (error) {
    console.error('Danışman oluşturma genel hatası:', error);
    throw error;
  }
};

/**
 * Update RLS policies
 */
export const updateRlsPolicies = async () => {
  // Verify admin access
  await verifyAdminAccess();
  
  try {
    console.log('Admin: RLS politikalarını güncelleme başlatılıyor');
    
    const { data, error } = await supabase.rpc('update_rls_policies');
    
    if (error) {
      console.error('RLS politikaları güncelleme hatası:', error);
      throw error;
    }
    
    console.log('RLS politikaları başarıyla güncellendi');
    return data;
  } catch (error) {
    console.error('RLS politikaları güncelleme genel hatası:', error);
    throw error;
  }
};

/**
 * Get all akademik_danismanlar records without admin verification
 * This is a fallback for components that need to access danismanlar but might not have admin privileges
 */
export const getDanismanlarWithoutVerification = async () => {
  try {
    console.log('Fetching danismanlar without admin verification');
    
    const { data, error } = await supabase
      .from('akademik_danismanlar')
      .select('*');
    
    if (error) {
      console.error('Danışmanlar alınırken hata:', error);
      return []; // Hata durumunda boş dizi döndür
    }
    
    // Map database fields (snake_case) to component expected fields (camelCase)
    return data ? data.map(danisman => ({
      id: danisman.id,
      adSoyad: danisman.ad_soyad,
      eposta: danisman.eposta,
      bolum: danisman.bolum,
      telefon: danisman.telefon,
      fakulte: danisman.fakulte,
      odaNo: danisman.oda_no
    })) : [];
  } catch (error) {
    console.error('Danışmanlar alınırken genel hata:', error);
    return []; // Hata durumunda boş dizi döndür
  }
}; 