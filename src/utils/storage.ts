import { EtkinlikBasvuru, OnayDurumu, AkademikDanisman, Kulup } from '../types';
import { supabase } from './supabase';

const BASVURULAR_KEY = 'etkinlik_basvurulari';
const DANISMANLAR_KEY = 'akademik_danismanlar';
const KULUPLER_KEY = 'ogrenci_kulupleri';

// Supabase akademik danışman ekleme fonksiyonu
export const saveAkademikDanisman = async (danisman: Omit<AkademikDanisman, 'id'>) => {
  try {
    // Akademik danışmanı Supabase'e ekle
    const { data, error } = await supabase
      .from('akademik_danismanlar')
      .insert({
        ad_soyad: danisman.adSoyad,
        bolum: danisman.bolum,
        eposta: danisman.eposta,
        telefon: danisman.telefon,
        fakulte: danisman.fakulte,
        oda_no: danisman.odaNo
      })
      .select();
    
    if (error) {
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('Akademik danışman eklenirken hata oluştu:', error);
    throw error;
  }
};

// Supabase'den akademik danışmanları getirme
export const getAkademikDanismanlar = async (): Promise<AkademikDanisman[]> => {
  try {
    const { data, error } = await supabase
      .from('akademik_danismanlar')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    // Veritabanından gelen veriyi frontend tipimize dönüştür
    return data.map(d => ({
      id: d.id,
      adSoyad: d.ad_soyad,
      bolum: d.bolum,
      eposta: d.eposta,
      telefon: d.telefon,
      fakulte: d.fakulte,
      odaNo: d.oda_no
    }));
  } catch (error) {
    console.error('Akademik danışmanlar getirilirken hata oluştu:', error);
    return [];
  }
};

// Etkinlik başvuruları için fonksiyonlar
export const saveBasvuru = async (basvuru: EtkinlikBasvuru) => {
  try {
    const { data, error } = await supabase
      .from('etkinlik_basvurulari')
      .insert({
        id: basvuru.id,
        kulup_adi: basvuru.kulupAdi,
        kulup_id: basvuru.kulupId || null,
        etkinlik_adi: basvuru.etkinlikAdi,
        etkinlik_yeri_fakulte: basvuru.etkinlikYeri.fakulte,
        etkinlik_yeri_detay: basvuru.etkinlikYeri.detay,
        baslangic_tarihi: basvuru.baslangicTarihi,
        bitis_tarihi: basvuru.bitisTarihi,
        sponsorlar: basvuru.sponsorlar || null,
        konusmacilar: basvuru.konusmacilar || null,
        aciklama: basvuru.aciklama,
        belgeler: basvuru.belgeler || null,
        durum: basvuru.durum || 'Beklemede',
        revizyon: false,
        danisman_onay: null,
        sks_onay: null,
        onay_gecmisi: {
          danismanOnaylari: [],
          sksOnaylari: []
        }
      })
      .select();
    
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Başvuru kaydedilirken hata oluştu:', error);
    // Fallback to localStorage if Supabase fails
    const localData = localStorage.getItem(BASVURULAR_KEY);
    const basvurular = localData ? JSON.parse(localData) : [];
    basvurular.push({
      ...basvuru,
      revizyon: false,
      onayGecmisi: {
        danismanOnaylari: [],
        sksOnaylari: []
      }
    });
    localStorage.setItem(BASVURULAR_KEY, JSON.stringify(basvurular));
  }
};

export const getBasvurular = async (): Promise<EtkinlikBasvuru[]> => {
  try {
    console.log('getBasvurular çağrıldı - Ek belge yönetimi debugger');
    const { data, error } = await supabase
      .from('etkinlik_basvurulari')
      .select(`
        *,
        ek_belgeler:ek_belgeler(*)
      `);
    
    if (error) throw error;
    
    console.log('Başvurular alındı:', data.length);
    console.log('Ham veri örneği:', data[0]); // İlk veriyi göster
    
    // ek_belgeler tablosunun yapısını kontrol et
    const { data: ekBelgelerTablosu, error: ekBelgelerError } = await supabase
      .from('ek_belgeler')
      .select('*')
      .limit(5);
      
    if (ekBelgelerError) {
      console.error('Ek belgeler tablosu kontrolü hatası:', ekBelgelerError);
    } else {
      console.log('Ek belgeler tablosu örnek veriler:', ekBelgelerTablosu);
    }
    
    // Veritabanından gelen veriyi frontend tipimize dönüştür
    const basvurular = data.map(b => {
      // Ek belgeleri dönüştür
      const ekBelgeler = b.ek_belgeler ? b.ek_belgeler.map((belge: any) => {
        console.log('Dönüştürülen ek belge:', belge);
        return {
          id: belge.id,
          etkinlikId: belge.etkinlik_id,
          tip: belge.tip,
          dosya: belge.dosya_yolu,
          dosyaAdi: belge.dosya_adi,
          olusturmaTarihi: belge.olusturma_tarihi,
          danismanOnay: belge.danisman_onay,
          sksOnay: belge.sks_onay,
          aciklama: belge.aciklama,
          durum: belge.durum
        };
      }) : [];
      
      if (ekBelgeler.length > 0) {
        console.log(`${b.id} ID'li etkinlik için ${ekBelgeler.length} adet ek belge bulundu`);
      }
      
      return {
        id: b.id,
        kulupAdi: b.kulup_adi,
        kulupId: b.kulup_id,
        etkinlikAdi: b.etkinlik_adi,
        etkinlikYeri: {
          fakulte: b.etkinlik_yeri_fakulte,
          detay: b.etkinlik_yeri_detay
        },
        baslangicTarihi: b.baslangic_tarihi,
        bitisTarihi: b.bitis_tarihi,
        sponsorlar: b.sponsorlar,
        konusmacilar: b.konusmacilar,
        aciklama: b.aciklama,
        belgeler: b.belgeler,
        ekBelgeler: ekBelgeler,
        durum: b.durum,
        revizyon: b.revizyon,
        danismanOnay: b.danisman_onay,
        sksOnay: b.sks_onay,
        onayGecmisi: b.onay_gecmisi || {
          danismanOnaylari: [],
          sksOnaylari: []
        }
      };
    });
    
    // Ek belgesi olan etkinlikleri kontrol et
    const ekBelgesiOlanlar = basvurular.filter(b => b.ekBelgeler && b.ekBelgeler.length > 0);
    console.log('Ek belgesi olan etkinlikler:', ekBelgesiOlanlar.length);
    if (ekBelgesiOlanlar.length > 0) {
      console.log('Örnek ek belgesi olan etkinlik:', ekBelgesiOlanlar[0]);
    }
    
    return basvurular;
  } catch (error) {
    console.error('Başvuruları getirme hatası:', error);
    return [];
  }
};

// LocalStorage'dan veri alma yardımcı fonksiyonu
const getLocalBasvurular = (): EtkinlikBasvuru[] => {
  const data = localStorage.getItem(BASVURULAR_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateBasvuru = async (basvuru: EtkinlikBasvuru) => {
  try {
    // Önce mevcut başvuruyu getir
    const { data: existingData, error: getError } = await supabase
      .from('etkinlik_basvurulari')
      .select('*')
      .eq('id', basvuru.id)
      .single();
    
    if (getError) throw getError;
    
    const eskiBasvuru = existingData;
    const onayGecmisi = {
      danismanOnaylari: [...(eskiBasvuru.onay_gecmisi?.danismanOnaylari || [])],
      sksOnaylari: [...(eskiBasvuru.onay_gecmisi?.sksOnaylari || [])]
    };
    
    // Onay geçmişini güncelle
    if (basvuru.danismanOnay && 
        (!eskiBasvuru.danisman_onay || 
         eskiBasvuru.danisman_onay.tarih !== basvuru.danismanOnay.tarih)) {
      onayGecmisi.danismanOnaylari.push(basvuru.danismanOnay);
    }

    if (basvuru.sksOnay && 
        (!eskiBasvuru.sks_onay || 
         eskiBasvuru.sks_onay.tarih !== basvuru.sksOnay.tarih)) {
      onayGecmisi.sksOnaylari.push(basvuru.sksOnay);
    }
    
    // Başvuruyu güncelle
    const { error: updateError } = await supabase
      .from('etkinlik_basvurulari')
      .update({
        kulup_adi: basvuru.kulupAdi,
        kulup_id: basvuru.kulupId || null,
        etkinlik_adi: basvuru.etkinlikAdi,
        etkinlik_yeri_fakulte: basvuru.etkinlikYeri.fakulte,
        etkinlik_yeri_detay: basvuru.etkinlikYeri.detay,
        baslangic_tarihi: basvuru.baslangicTarihi,
        bitis_tarihi: basvuru.bitisTarihi,
        sponsorlar: basvuru.sponsorlar || null,
        konusmacilar: basvuru.konusmacilar || null,
        aciklama: basvuru.aciklama,
        belgeler: basvuru.belgeler || null,
        durum: basvuru.durum,
        revizyon: basvuru.revizyon,
        danisman_onay: basvuru.danismanOnay || null,
        sks_onay: basvuru.sksOnay || null,
        onay_gecmisi: onayGecmisi
      })
      .eq('id', basvuru.id);
    
    if (updateError) throw updateError;
  } catch (error) {
    console.error('Başvuru güncellenirken hata oluştu:', error);
    // Fallback to localStorage
    const basvurular = getLocalBasvurular();
    const index = basvurular.findIndex((b: EtkinlikBasvuru) => b.id === basvuru.id);
    if (index !== -1) {
      const eskiBasvuru = basvurular[index];
      
      if (basvuru.danismanOnay && 
          (!eskiBasvuru.danismanOnay || 
           eskiBasvuru.danismanOnay.tarih !== basvuru.danismanOnay.tarih)) {
        basvuru.onayGecmisi.danismanOnaylari = [
          ...(eskiBasvuru.onayGecmisi?.danismanOnaylari || []),
          basvuru.danismanOnay
        ];
      }

      if (basvuru.sksOnay && 
          (!eskiBasvuru.sksOnay || 
           eskiBasvuru.sksOnay.tarih !== basvuru.sksOnay.tarih)) {
        basvuru.onayGecmisi.sksOnaylari = [
          ...(eskiBasvuru.onayGecmisi?.sksOnaylari || []),
          basvuru.sksOnay
        ];
      }

      basvurular[index] = basvuru;
      localStorage.setItem(BASVURULAR_KEY, JSON.stringify(basvurular));
    }
  }
};

export const getBasvuruById = async (id: string): Promise<EtkinlikBasvuru | null> => {
  try {
    const { data, error } = await supabase
      .from('etkinlik_basvurulari')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) return null;
    
    return {
      id: data.id,
      kulupAdi: data.kulup_adi,
      kulupId: data.kulup_id,
      etkinlikAdi: data.etkinlik_adi,
      etkinlikYeri: {
        fakulte: data.etkinlik_yeri_fakulte,
        detay: data.etkinlik_yeri_detay
      },
      baslangicTarihi: data.baslangic_tarihi,
      bitisTarihi: data.bitis_tarihi,
      sponsorlar: data.sponsorlar,
      konusmacilar: data.konusmacilar,
      aciklama: data.aciklama,
      belgeler: data.belgeler,
      durum: data.durum,
      revizyon: data.revizyon,
      danismanOnay: data.danisman_onay,
      sksOnay: data.sks_onay,
      onayGecmisi: data.onay_gecmisi || {
        danismanOnaylari: [],
        sksOnaylari: []
      }
    };
  } catch (error) {
    console.error('Başvuru getirilirken hata oluştu:', error);
    // Fallback to localStorage
    const basvurular = getLocalBasvurular();
    return basvurular.find((b: EtkinlikBasvuru) => b.id === id) || null;
  }
};

export const revizeEt = async (basvuru: EtkinlikBasvuru): Promise<EtkinlikBasvuru> => {
  try {
    const yeniId = Date.now().toString();
    const yeniBasvuru: EtkinlikBasvuru = {
      ...basvuru,
      id: yeniId,
      revizyon: true,
      danismanOnay: undefined,
      sksOnay: undefined,
      durum: 'Beklemede',
      onayGecmisi: {
        danismanOnaylari: [...basvuru.onayGecmisi.danismanOnaylari],
        sksOnaylari: [...basvuru.onayGecmisi.sksOnaylari]
      }
    };
    
    // Yeni başvuruyu kaydet
    const { data, error } = await supabase
      .from('etkinlik_basvurulari')
      .insert({
        id: yeniBasvuru.id,
        kulup_adi: yeniBasvuru.kulupAdi,
        kulup_id: yeniBasvuru.kulupId || null,
        etkinlik_adi: yeniBasvuru.etkinlikAdi,
        etkinlik_yeri_fakulte: yeniBasvuru.etkinlikYeri.fakulte,
        etkinlik_yeri_detay: yeniBasvuru.etkinlikYeri.detay,
        baslangic_tarihi: yeniBasvuru.baslangicTarihi,
        bitis_tarihi: yeniBasvuru.bitisTarihi,
        sponsorlar: yeniBasvuru.sponsorlar || null,
        konusmacilar: yeniBasvuru.konusmacilar || null,
        aciklama: yeniBasvuru.aciklama,
        belgeler: yeniBasvuru.belgeler || null,
        durum: yeniBasvuru.durum,
        revizyon: true,
        danisman_onay: null,
        sks_onay: null,
        onay_gecmisi: {
          danismanOnaylari: yeniBasvuru.onayGecmisi.danismanOnaylari,
          sksOnaylari: yeniBasvuru.onayGecmisi.sksOnaylari
        }
      })
      .select();
    
    if (error) throw error;
    
    return yeniBasvuru;
  } catch (error) {
    console.error('Başvuru revize edilirken hata oluştu:', error);
    // Fallback to localStorage
    const yeniBasvuru: EtkinlikBasvuru = {
      ...basvuru,
      id: Date.now().toString(),
      revizyon: true,
      danismanOnay: undefined,
      sksOnay: undefined,
      durum: 'Beklemede',
      onayGecmisi: {
        danismanOnaylari: [...basvuru.onayGecmisi.danismanOnaylari],
        sksOnaylari: [...basvuru.onayGecmisi.sksOnaylari]
      }
    };

    const basvurular = getLocalBasvurular().filter((b: EtkinlikBasvuru) => b.id !== basvuru.id);
    basvurular.push(yeniBasvuru);
    localStorage.setItem(BASVURULAR_KEY, JSON.stringify(basvurular));

    return yeniBasvuru;
  }
};

// Akademik danışmanlar için fonksiyonlar
export const getDanismanlar = (): AkademikDanisman[] => {
  const data = localStorage.getItem(DANISMANLAR_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveDanisman = (danisman: AkademikDanisman) => {
  const danismanlar = getDanismanlar();
  danismanlar.push(danisman);
  localStorage.setItem(DANISMANLAR_KEY, JSON.stringify(danismanlar));
};

export const getDanismanById = (id: string): AkademikDanisman | null => {
  const danismanlar = getDanismanlar();
  return danismanlar.find(d => d.id === id) || null;
};

// Kulüpler için fonksiyonlar
export const getKulupler = async (): Promise<Kulup[]> => {
  try {
    // Fetch clubs data
    const { data, error } = await supabase
      .from('kulupler')
      .select(`
        *,
        akademik_danismanlar (
          id, 
          ad_soyad, 
          bolum, 
          eposta, 
          telefon, 
          fakulte, 
          oda_no
        )
      `);
    
    if (error) {
      throw error;
    }
    
    // Fetch all alt_topluluklar
    const { data: allAltTopluluklar, error: altError } = await supabase
      .from('alt_topluluklar')
      .select('kulup_id, isim');
    
    if (altError) {
      console.error('Alt topluluklar getirilirken hata oluştu:', altError);
      // Continue without alt_topluluklar
    }
    
    // Group alt_topluluklar by kulup_id
    const altToplulukMap = new Map();
    if (allAltTopluluklar) {
      allAltTopluluklar.forEach(at => {
        if (!altToplulukMap.has(at.kulup_id)) {
          altToplulukMap.set(at.kulup_id, []);
        }
        altToplulukMap.get(at.kulup_id).push(at.isim);
      });
    }
    
    // Veritabanından gelen veriyi frontend tipimize dönüştür
    return data.map(k => ({
      id: k.id,
      isim: k.isim,
      akademikDanisman: {
        id: k.akademik_danismanlar.id,
        adSoyad: k.akademik_danismanlar.ad_soyad,
        bolum: k.akademik_danismanlar.bolum,
        eposta: k.akademik_danismanlar.eposta,
        telefon: k.akademik_danismanlar.telefon,
        fakulte: k.akademik_danismanlar.fakulte,
        odaNo: k.akademik_danismanlar.oda_no
      },
      baskan: {
        adSoyad: k.baskan_ad_soyad,
        eposta: k.baskan_eposta,
        telefon: k.baskan_telefon
      },
      odaNo: k.oda_no,
      digerTesisler: k.diger_tesisler,
      // Get alt_topluluklar from the separate table, or fall back to the array in kulupler if it exists
      altTopluluklar: altToplulukMap.has(k.id) ? altToplulukMap.get(k.id) : k.alt_topluluklar,
      tuzuk: k.tuzuk,
      logo: k.logo
    }));
  } catch (error) {
    console.error('Kulüpler getirilirken hata oluştu:', error);
    return [];
  }
};

export const saveKulup = async (kulup: Omit<Kulup, 'id'>) => {
  try {
    // Önce aynı isimde kulüp var mı kontrol et
    const { data: existingKulup, error: checkError } = await supabase
      .from('kulupler')
      .select('id')
      .eq('isim', kulup.isim)
      .maybeSingle();
    
    if (checkError) {
      throw checkError;
    }
    
    if (existingKulup) {
      throw new Error(`"${kulup.isim}" isimli bir kulüp zaten mevcut.`);
    }
    
    // Yeni kulüp oluştur - alt_topluluklar alanı yoksa hata vermemesi için kontrol ediyoruz
    try {
      const { data, error } = await supabase
        .from('kulupler')
        .insert({
          isim: kulup.isim,
          akademik_danisman_id: kulup.akademikDanisman.id,
          baskan_ad_soyad: kulup.baskan.adSoyad,
          baskan_eposta: kulup.baskan.eposta,
          baskan_telefon: kulup.baskan.telefon,
          oda_no: kulup.odaNo,
          diger_tesisler: kulup.digerTesisler || null,
          alt_topluluklar: kulup.altTopluluklar || [],
          tuzuk: kulup.tuzuk || null,
          logo: kulup.logo || null
        })
        .select();
      
      if (error) {
        // alt_topluluklar alanı bulunamadıysa, bu alan olmadan tekrar dene
        if (error.message && error.message.includes("alt_topluluklar")) {
          console.warn("alt_topluluklar alanı bulunamadı, bu alan olmadan kaydetmeye çalışılıyor...");
          
          const { data: dataWithoutAltTopluluklar, error: errorWithoutAltTopluluklar } = await supabase
            .from('kulupler')
            .insert({
              isim: kulup.isim,
              akademik_danisman_id: kulup.akademikDanisman.id,
              baskan_ad_soyad: kulup.baskan.adSoyad,
              baskan_eposta: kulup.baskan.eposta,
              baskan_telefon: kulup.baskan.telefon,
              oda_no: kulup.odaNo,
              diger_tesisler: kulup.digerTesisler || null,
              tuzuk: kulup.tuzuk || null,
              logo: kulup.logo || null
            })
            .select();
          
          if (errorWithoutAltTopluluklar) {
            throw errorWithoutAltTopluluklar;
          }
          
          return dataWithoutAltTopluluklar[0];
        } else {
          throw error;
        }
      }
      
      return data[0];
    } catch (insertError: any) {
      // Eğer hala alt_topluluklar hatası alınıyorsa ve farklı bir hata mesajıyla geldiyse
      if (insertError.message && insertError.message.includes("alt_topluluklar")) {
        console.warn("alt_topluluklar alanı için farklı bir hata. Bu alan olmadan kaydetmeye çalışılıyor...");
        
        const { data: dataWithoutAltTopluluklar, error: errorWithoutAltTopluluklar } = await supabase
          .from('kulupler')
          .insert({
            isim: kulup.isim,
            akademik_danisman_id: kulup.akademikDanisman.id,
            baskan_ad_soyad: kulup.baskan.adSoyad,
            baskan_eposta: kulup.baskan.eposta,
            baskan_telefon: kulup.baskan.telefon,
            oda_no: kulup.odaNo,
            diger_tesisler: kulup.digerTesisler || null,
            tuzuk: kulup.tuzuk || null,
            logo: kulup.logo || null
          })
          .select();
        
        if (errorWithoutAltTopluluklar) {
          throw errorWithoutAltTopluluklar;
        }
        
        return dataWithoutAltTopluluklar[0];
      } else {
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Kulüp kaydedilirken hata oluştu:', error);
    throw error;
  }
};

export const getKulupById = async (id: string): Promise<Kulup | null> => {
  try {
    // Fetch kulup data
    const { data, error } = await supabase
      .from('kulupler')
      .select(`
        *,
        akademik_danismanlar (
          id, 
          ad_soyad, 
          bolum, 
          eposta, 
          telefon, 
          fakulte, 
          oda_no
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) return null;
    
    // Fetch alt_topluluklar for this kulup
    const { data: altTopluluklar, error: altToplulukError } = await supabase
      .from('alt_topluluklar')
      .select('isim')
      .eq('kulup_id', id);
      
    if (altToplulukError) {
      console.error('Alt topluluklar çekilirken hata oluştu:', altToplulukError);
      // Continue without alt_topluluklar
    }
    
    return {
      id: data.id,
      isim: data.isim,
      akademikDanisman: {
        id: data.akademik_danismanlar.id,
        adSoyad: data.akademik_danismanlar.ad_soyad,
        bolum: data.akademik_danismanlar.bolum,
        eposta: data.akademik_danismanlar.eposta,
        telefon: data.akademik_danismanlar.telefon,
        fakulte: data.akademik_danismanlar.fakulte,
        odaNo: data.akademik_danismanlar.oda_no
      },
      baskan: {
        adSoyad: data.baskan_ad_soyad,
        eposta: data.baskan_eposta,
        telefon: data.baskan_telefon
      },
      odaNo: data.oda_no,
      digerTesisler: data.diger_tesisler,
      // Get alt_topluluklar from the separate table, or fall back to the array in kulupler if it exists
      altTopluluklar: altTopluluklar ? altTopluluklar.map(at => at.isim) : data.alt_topluluklar,
      tuzuk: data.tuzuk,
      logo: data.logo
    };
  } catch (error) {
    console.error('Kulüp getirilirken hata oluştu:', error);
    return null;
  }
};

export const saveAltTopluluk = async (kulupId: string, isim: string) => {
  try {
    const { data, error } = await supabase
      .from('alt_topluluklar')
      .insert({
        kulup_id: kulupId,
        isim: isim
      })
      .select();
    
    if (error) {
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('Alt topluluk eklenirken hata oluştu:', error);
    throw error;
  }
};

export const getAltTopluluklar = async (kulupId: string) => {
  try {
    const { data, error } = await supabase
      .from('alt_topluluklar')
      .select('*')
      .eq('kulup_id', kulupId);
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Alt topluluklar getirilirken hata oluştu:', error);
    return [];
  }
};

export const clearStorage = async () => {
  try {
    // Tüm başvuruları silme
    const { error } = await supabase
      .from('etkinlik_basvurulari')
      .delete()
      .neq('id', '0'); // Tüm kayıtları silmek için
    
    if (error) throw error;
  } catch (error) {
    console.error('Veritabanı temizlenirken hata oluştu:', error);
  }
  
  // Fallback olarak localStorage'ı da temizle
  localStorage.removeItem(BASVURULAR_KEY);
  localStorage.removeItem(DANISMANLAR_KEY);
  localStorage.removeItem(KULUPLER_KEY);
};