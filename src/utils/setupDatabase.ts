import { supabase } from './supabase';
import { AkademikDanisman, Kulup } from '../types';

// Örnek akademik danışman
const ornekDanisman: AkademikDanisman = {
  id: '',
  adSoyad: 'Prof. Dr. Ahmet Yılmaz',
  bolum: 'Bilgisayar Mühendisliği',
  eposta: 'ahmet.yilmaz@yildiz.edu.tr',
  telefon: '0212 123 4567',
  fakulte: 'Elektrik-Elektronik Fakültesi',
  odaNo: 'D-204'
};

// Örnek kulüp
const ornekKulup = (danisman: AkademikDanisman): Kulup => ({
  id: '',
  isim: 'Bilgisayar Kulübü',
  akademikDanisman: danisman,
  baskan: {
    adSoyad: 'Ali Can',
    eposta: 'alican@yildiz.edu.tr',
    telefon: '0532 123 4567'
  },
  odaNo: 'K-101',
  digerTesisler: 'Bilgisayar Laboratuvarı',
  altTopluluklar: ['Yazılım Grubu', 'Donanım Grubu'],
  tuzuk: 'Base64 encoded PDF content',
  logo: 'Base64 encoded image content'
});

/**
 * Test için örnek verileri ekler
 */
export const setupTestData = async () => {
  try {
    console.log('Veritabanı test verisi yükleniyor...');
    
    // Akademik danışman ekle
    const { data: danismanData, error: danismanError } = await supabase
      .from('akademik_danismanlar')
      .insert({
        ad_soyad: ornekDanisman.adSoyad,
        bolum: ornekDanisman.bolum,
        eposta: ornekDanisman.eposta,
        telefon: ornekDanisman.telefon,
        fakulte: ornekDanisman.fakulte,
        oda_no: ornekDanisman.odaNo
      })
      .select()
      .single();
    
    if (danismanError) throw danismanError;
    
    console.log('Akademik danışman eklendi:', danismanData);
    
    // Kulüp ekle
    const kulup = ornekKulup({
      ...ornekDanisman,
      id: danismanData.id
    });
    
    const { data: kulupData, error: kulupError } = await supabase
      .from('kulupler')
      .insert({
        isim: kulup.isim,
        akademik_danisman_id: danismanData.id,
        baskan_ad_soyad: kulup.baskan.adSoyad,
        baskan_eposta: kulup.baskan.eposta,
        baskan_telefon: kulup.baskan.telefon,
        oda_no: kulup.odaNo,
        diger_tesisler: kulup.digerTesisler,
        tuzuk: kulup.tuzuk,
        logo: kulup.logo
      })
      .select()
      .single();
    
    if (kulupError) throw kulupError;
    
    console.log('Kulüp eklendi:', kulupData);
    
    return {
      danisman: danismanData,
      kulup: kulupData
    };
    
  } catch (error) {
    console.error('Örnek veri oluşturulurken hata oluştu:', error);
    throw error;
  }
};

/**
 * Veritabanı tabloları oluşturuldu mu kontrol eder
 */
export const checkDatabaseTables = async () => {
  try {
    console.log('Veritabanı tabloları kontrol ediliyor...');
    
    // akademik_danismanlar tablosunu kontrol et
    const { error: danismanError } = await supabase
      .from('akademik_danismanlar')
      .select('count')
      .limit(1);
    
    // kulupler tablosunu kontrol et
    const { error: kulupError } = await supabase
      .from('kulupler')
      .select('count')
      .limit(1);
    
    // etkinlik_basvurulari tablosunu kontrol et
    const { error: basvuruError } = await supabase
      .from('etkinlik_basvurulari')
      .select('count')
      .limit(1);
    
    if (danismanError) {
      console.error('akademik_danismanlar tablosu bulunamadı:', danismanError);
      return false;
    }
    
    if (kulupError) {
      console.error('kulupler tablosu bulunamadı:', kulupError);
      return false;
    }
    
    if (basvuruError) {
      console.error('etkinlik_basvurulari tablosu bulunamadı:', basvuruError);
      return false;
    }
    
    console.log('Temel veritabanı tabloları mevcut!');
    return true;
    
  } catch (error) {
    console.error('Veritabanı kontrol edilirken hata oluştu:', error);
    return false;
  }
}; 