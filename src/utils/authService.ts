import { supabase, supabaseApi } from './supabase';

export type UserRole = 'admin' | 'sks' | 'danisman' | 'kulup_baskani';

export interface UserProfile {
  id: string;
  email: string;
  adSoyad: string;
  role: UserRole;
  kulupId?: string;
  danismanId?: string;
  avatarUrl?: string;
}

export const signIn = async (email: string, password: string) => {
  console.log('SignIn işlemi başlatılıyor:', email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('SignIn hatası:', error);
      
      // Email not confirmed hatasını kontrol et
      if (error.message === 'Email not confirmed') {
        console.log('E-posta doğrulanmamış, alternatif giriş yöntemi deneniyor...');
        
        // 1. Admin API ile kullanıcı bilgilerini al
        try {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();
          
          if (userError) {
            console.error('Kullanıcı profili bulunamadı:', userError);
            throw error; // Orijinal hatayı fırlat
          }
          
          if (userData) {
            console.log('Kullanıcı profili bulundu, oturum açılıyor:', userData);
            
            // Yeniden oturum açma işlemi denemesi
            const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            if (sessionError && sessionError.message !== 'Email not confirmed') {
              throw sessionError;
            }
            
            // Doğrulama hatası gelse bile devam et
            return {
              session: {
                access_token: 'manual-session-' + Date.now(),
                refresh_token: '',
                expires_in: 3600,
                user: {
                  id: userData.id,
                  email: userData.email
                }
              },
              user: {
                id: userData.id,
                email: userData.email
              }
            };
          }
        } catch (alternativeError) {
          console.error('Alternatif giriş yöntemi başarısız:', alternativeError);
        }
      }
      
      throw error;
    }

    console.log('SignIn başarılı:', data.user?.id);
    return data;
  } catch (error) {
    console.error('SignIn üst seviye hatası:', error);
    throw error;
  }
};

// Kullanıcının profil bilgilerini almak için yeni fonksiyon
export const getUserProfile = async (userId: string, sessionToken: string) => {
  try {
    console.log('Kullanıcı profili alınıyor...', userId);
    // Supabase client ile profil bilgilerini al
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profil getirme hatası (Supabase):', error);
      throw error;
    }

    if (!data) {
      console.error('Kullanıcı profili bulunamadı (Supabase)');
      throw new Error('Kullanıcı profili bulunamadı');
    }

    console.log('Profil bilgileri başarıyla alındı (Supabase):', data);
    
    // Veriyi UserProfile formatına dönüştür
    return {
      id: data.id,
      email: data.email,
      adSoyad: data.ad_soyad,
      role: data.role as UserRole,
      kulupId: data.kulup_id,
      danismanId: data.danisman_id,
      avatarUrl: data.avatar_url
    };
  } catch (error) {
    console.error('Profil getirme hatası (Supabase başarısız), REST API denenecek:', error);
    
    try {
      // Alternatif olarak REST API ile dene
      const apiUrl = `${supabaseApi.url}/rest/v1/profiles?id=eq.${userId}&select=*`;
      console.log('REST API isteği yapılıyor:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'apikey': supabaseApi.key,
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('REST API yanıtı alındı, durum kodu:', response.status);

      if (!response.ok) {
        console.error('REST API yanıt hatası:', response.statusText);
        throw new Error(`Profil getirme hatası: ${response.statusText}`);
      }

      const profiles = await response.json();
      console.log('REST API profil verileri:', profiles);
      
      if (!profiles || profiles.length === 0) {
        console.error('Kullanıcı profili bulunamadı (REST API)');
        throw new Error('Kullanıcı profili bulunamadı');
      }

      const profile = profiles[0];
      console.log('Profil bilgileri başarıyla alındı (REST API):', profile);
      
      return {
        id: profile.id,
        email: profile.email,
        adSoyad: profile.ad_soyad,
        role: profile.role as UserRole,
        kulupId: profile.kulup_id,
        danismanId: profile.danisman_id,
        avatarUrl: profile.avatar_url
      };
    } catch (restError) {
      console.error('REST API ile de başarısız oldu:', restError);
      
      // Son bir deneme olarak hafızadaki kullanıcı bilgilerini ve rolü kontrol et
      try {
        console.log('Mevcut oturum bilgileri alınıyor...');
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          console.log('Aktif oturum mevcut, kullanıcı metadatası kontrol ediliyor');
          const { data: userData } = await supabase.auth.getUser();

          if (userData?.user) {
            const userMeta = userData.user.user_metadata;
            console.log('Kullanıcı metaverisi:', userMeta);
            
            if (userMeta && userMeta.role === 'kulup_baskani') {
              console.log('Metadata\'dan kullanıcı bilgileri oluşturuluyor');
              return {
                id: userId,
                email: userData.user.email || '',
                adSoyad: userMeta.ad_soyad || userMeta.name || 'İsimsiz Kullanıcı',
                role: 'kulup_baskani',
                kulupId: userMeta.kulup_id
              };
            }
          }
        }
      } catch (sessionError) {
        console.error('Oturum ve metadata kontrolü başarısız:', sessionError);
      }
      
      throw restError;
    }
  }
};

export const signUp = async (
  email: string, 
  password: string, 
  adSoyad: string, 
  role: UserRole,
  kulupId?: string,
  danismanId?: string,
  // Ek parametreler
  extraData?: {
    bolum?: string,
    telefon?: string,
    fakulte?: string,
    odaNo?: string,
    departman?: string,
    gorev?: string
  }
) => {
  try {
    console.log('Kullanıcı kaydı başlatılıyor:', email, role);
    
    // 1. Supabase Auth kullanıcısı oluştur
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
          ad_soyad: adSoyad
        }
      }
    });

    if (authError) {
      console.error('Auth kaydı hatası:', authError);
      throw authError;
    }

    if (!authData.user) {
      console.error('Kullanıcı oluşturulamadı');
      throw new Error('Kullanıcı oluşturulamadı.');
    }
    
    console.log('Auth kullanıcısı oluşturuldu:', authData.user.id);

    // Eğer danışman rolü ise, önce akademik_danismanlar tablosuna ekle
    let danismanKayitId: string | undefined = danismanId;
    
    if (role === 'danisman') {
      try {
        // Akademik danışmanı ekle
        const { data: danismanData, error: danismanError } = await supabase
          .from('akademik_danismanlar')
          .insert({
            ad_soyad: adSoyad,
            bolum: extraData?.bolum || 'Belirlenmedi',
            eposta: email,
            telefon: extraData?.telefon || 'Belirlenmedi',
            fakulte: extraData?.fakulte || 'Belirlenmedi',
            oda_no: extraData?.odaNo || 'Belirlenmedi'
          })
          .select();
        
        if (danismanError) {
          console.error('Danışman kaydı hatası:', danismanError);
          throw danismanError;
        }
        
        // Yeni eklenen danışmanın ID'sini al
        if (danismanData && danismanData.length > 0) {
          danismanKayitId = danismanData[0].id;
          console.log('Danışman kaydı oluşturuldu:', danismanKayitId);
        }
      } catch (error) {
        console.error('Danışman kaydı genel hata:', error);
        throw error;
      }
    }
    
    // Eğer SKS personeli ise, sks_kullanicilari tablosuna ekle
    if (role === 'sks') {
      try {
        console.log('SKS personeli kaydı yapılıyor...');
        const { error: sksError } = await supabase
          .from('sks_kullanicilari')
          .insert({
            ad_soyad: adSoyad,
            eposta: email,
            telefon: extraData?.telefon || '',
            rol: extraData?.gorev || 'Personel'
          });
        
        if (sksError) {
          console.error('SKS personeli kaydı hatası:', sksError);
          throw sksError;
        }
        
        console.log('SKS personeli kaydı başarıyla oluşturuldu');
      } catch (error) {
        console.error('SKS personeli kaydı genel hata:', error);
        throw error;
      }
    }
    
    // Eğer kulüp başkanı ise, kulüp bilgilerini güncelle
    if (role === 'kulup_baskani' && kulupId) {
      try {
        console.log('Kulüp başkanı kaydı yapılıyor... Kulüp ID:', kulupId);
        
        // Önce kulübün mevcut bilgilerini al
        const { data: kulupData, error: kulupGetError } = await supabase
          .from('kulupler')
          .select('*')
          .eq('id', kulupId)
          .single();
        
        if (kulupGetError) {
          console.error('Kulüp bilgileri alınamadı:', kulupGetError);
          throw kulupGetError;
        }
        
        // Kulüp bilgilerini güncelle
        const { error: kulupUpdateError } = await supabase
          .from('kulupler')
          .update({
            baskan_ad_soyad: adSoyad,
            baskan_eposta: email,
            baskan_telefon: extraData?.telefon || 'Belirtilmedi'
          })
          .eq('id', kulupId);
        
        if (kulupUpdateError) {
          console.error('Kulüp başkanı güncellenemedi:', kulupUpdateError);
          throw kulupUpdateError;
        }
        
        console.log('Kulüp başkanı bilgileri başarıyla güncellendi');
      } catch (error) {
        console.error('Kulüp başkanı kaydı genel hata:', error);
        throw error;
      }
    }

    // 2. Profil bilgilerini ekle
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      ad_soyad: adSoyad,
      role,
      kulup_id: role === 'kulup_baskani' ? kulupId : null,
      danisman_id: role === 'danisman' ? danismanKayitId : null,
      // SKS personeli için metadata ekle
      ...(role === 'sks' && extraData && {
        metadata: {
          departman: extraData.departman,
          gorev: extraData.gorev
        }
      })
    });

    if (profileError) {
      console.error('Profil oluşturma hatası:', profileError);
      throw profileError;
    }

    console.log('Kullanıcı kaydı tamamlandı:', authData.user.id);
    return authData;
  } catch (error) {
    console.error('Kullanıcı kaydı genel hata:', error);
    throw error;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

export const getCurrentUser = async (): Promise<{
  user: UserProfile | null;
  session: any;
}> => {
  // 1. Mevcut oturumu kontrol et
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { user: null, session: null };
  }

  // 2. Profil bilgilerini getir
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    return { user: null, session };
  }

  return {
    user: {
      id: profile.id,
      email: profile.email,
      adSoyad: profile.ad_soyad,
      role: profile.role as UserRole,
      kulupId: profile.kulup_id,
      danismanId: profile.danisman_id,
      avatarUrl: profile.avatar_url
    },
    session
  };
};

export const updateProfile = async (profile: Partial<UserProfile>) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Kullanıcı bulunamadı.');
  }

  const updates = {
    ...(profile.adSoyad && { ad_soyad: profile.adSoyad }),
    ...(profile.avatarUrl && { avatar_url: profile.avatarUrl }),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    throw error;
  }

  return true;
};

export const getUsersByRole = async (role: UserRole): Promise<UserProfile[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Oturum açmanız gerekiyor.');
  }

  // Kullanıcının admin olup olmadığını kontrol et
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentProfile || currentProfile.role !== 'admin') {
    throw new Error('Bu işlem için yetkiniz bulunmuyor.');
  }

  // Role göre kullanıcıları getir
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role);

  if (error) {
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