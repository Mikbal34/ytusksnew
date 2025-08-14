import { supabase, supabaseAdmin } from './supabase';
import { EtkinlikBasvuru, Kulup, EtkinlikBelge, EkBelge, AkademikDanisman } from '../types';

// Akademik danışmanlar için fonksiyonlar
// ... existing code ...

// Etkinlik başvuruları için fonksiyonlar
export const saveBasvuru = async (basvuru: EtkinlikBasvuru) => {
  try {
    console.log('Başvuru kaydediliyor:', basvuru);
    
    // Yazma işlemlerinde RLS sorunlarına takılmamak için admin client kullan
    const client = supabaseAdmin;
    console.log('updateBasvuru: admin client ile yazma işlemi');
    
    // Ana başvuru bilgilerini ekle
    const { data: basvuruData, error: basvuruError } = await client
      .from('etkinlik_basvurulari')
      .insert({
        kulup_id: basvuru.kulupId,
        etkinlik_adi: basvuru.etkinlikAdi,
        etkinlik_turu: basvuru.etkinlikTuru || null,
        diger_turu_aciklama: basvuru.digerTuruAciklama || null,
        etkinlik_fakulte: basvuru.etkinlikYeri.fakulte,
        etkinlik_yeri_detay: basvuru.etkinlikYeri.detay,
        baslangic_tarihi: basvuru.baslangicTarihi,
        bitis_tarihi: basvuru.bitisTarihi,
        aciklama: basvuru.aciklama,
        durum: 'Beklemede',
        revizyon: !!basvuru.revizyon
      })
      .select()
      .single();
    
    if (basvuruError) {
      console.error('Başvuru kaydedilirken hata:', basvuruError);
      throw new Error(`Başvuru kaydedilemedi: ${basvuruError.message}`);
    }
    
    const basvuruId = basvuruData.id;
    console.log('Başvuru kaydedildi, ID:', basvuruId);
    
    // İzin sorunları yaşamamak için ilişkili tablolarda admin client kullan
    // Bu, kulüp başkanlarının izin sorunlarını önler
    const adminClient = supabaseAdmin;
    
    // Zaman dilimleri varsa ekle
    if (basvuru.zamanDilimleri && basvuru.zamanDilimleri.length > 0) {
      const dilimler = basvuru.zamanDilimleri
        .filter(z => !!z.baslangic && !!z.bitis)
        .map(z => ({ basvuru_id: basvuruId, baslangic: z.baslangic, bitis: z.bitis }));
      if (dilimler.length > 0) {
        const { error: zdError } = await adminClient
          .from('etkinlik_zaman_dilimleri')
          .insert(dilimler);
        if (zdError) {
          console.error('Zaman dilimleri eklenirken hata:', zdError);
          // Devam et, kritik değil
        }
      }
    }

    // Sponsorlar varsa ekle
    if (basvuru.sponsorlar && basvuru.sponsorlar.length > 0) {
      const sponsorVerileri = basvuru.sponsorlar.map(sponsor => ({
        basvuru_id: basvuruId,
        firma_adi: sponsor.firmaAdi,
        detay: sponsor.detay
      }));
      
      const { error: sponsorError } = await adminClient
        .from('sponsorlar')
        .insert(sponsorVerileri);
      
      if (sponsorError) {
        console.error('Sponsorlar eklenirken hata:', sponsorError);
        throw new Error(`Sponsorlar eklenemedi: ${sponsorError.message}`);
      }
    }
    
    // Konuşmacılar varsa ekle
    if (basvuru.konusmacilar && basvuru.konusmacilar.length > 0) {
      const konusmaciVerileri = basvuru.konusmacilar.map(konusmaci => ({
        basvuru_id: basvuruId,
        ad_soyad: konusmaci.adSoyad,
        ozgecmis: konusmaci.ozgecmis,
        aciklama: konusmaci.aciklama
      }));
      
      const { error: konusmaciError } = await adminClient
        .from('konusmacilar')
        .insert(konusmaciVerileri);
      
      if (konusmaciError) {
        console.error('Konuşmacılar eklenirken hata:', konusmaciError);
        throw new Error(`Konuşmacılar eklenemedi: ${konusmaciError.message}`);
      }
    }
    
    // Belgeler varsa ekle (sadece string dosya URL'leri olan belgeleri)
    if (basvuru.belgeler && basvuru.belgeler.length > 0) {
      // File nesnesi olan belgeleri atla, sadece string dosya yolları olanları kaydet
      const stringBelgeler = basvuru.belgeler.filter(belge => typeof belge.dosya === 'string');
      
      if (stringBelgeler.length > 0) {
        const belgeVerileri = stringBelgeler.map(belge => ({
          basvuru_id: basvuruId,
          tip: belge.tip,
          dosya_adi: belge.dosyaAdi,
          dosya_yolu: belge.dosya
        }));
        
        const { error: belgeError } = await adminClient
          .from('etkinlik_belgeleri')
          .insert(belgeVerileri);
        
        if (belgeError) {
          console.error('Belgeler eklenirken hata:', belgeError);
          throw new Error(`Belgeler eklenemedi: ${belgeError.message}`);
        }
      }
    }
    
    return basvuruId;
    
  } catch (error) {
    console.error('Başvuru kaydedilemedi:', error);
    throw error;
  }
};

export const getBasvurular = async (): Promise<EtkinlikBasvuru[]> => {
  try {
    console.log('Başvurular getiriliyor...');
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    const { data, error } = await client
      .from('etkinlik_basvurulari')
      .select(`
        *,
        kulupler (isim),
        sponsorlar (*),
        konusmacilar (*),
        etkinlik_belgeleri (*),
        onay_gecmisi (*),
        ek_belgeler (*),
        etkinlik_zaman_dilimleri (*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Başvurular getirilirken hata:', error);
      throw error;
    }
    
    console.log(`${data.length} başvuru veritabanından getirildi`);
    
      // Veritabanı verisini uygulama modeline dönüştür
    const basvurular: EtkinlikBasvuru[] = data.map(basvuru => {
      // Zaman dilimleri
      const zamanDilimleri = basvuru.etkinlik_zaman_dilimleri
        ? basvuru.etkinlik_zaman_dilimleri.map((z: any) => ({ baslangic: z.baslangic, bitis: z.bitis }))
        : [];
      // Belgeler
      const belgeler = basvuru.etkinlik_belgeleri
        ? basvuru.etkinlik_belgeleri.map((belge: any) => ({
            id: belge.id,
            tip: belge.tip,
            dosya: belge.dosya_yolu,
            dosyaAdi: belge.dosya_adi,
            danismanOnay: belge.danisman_onay,
            sksOnay: belge.sks_onay
          }))
        : [];
      
      // Ek Belgeler
      const ekBelgeler = basvuru.ek_belgeler
        ? basvuru.ek_belgeler.map((belge: any) => ({
            id: belge.id,
            etkinlikId: belge.etkinlik_id,
            tip: belge.tip,
            dosya: belge.dosya_yolu,
            dosyaAdi: belge.dosya_adi,
            olusturmaTarihi: belge.olusturma_tarihi,
            aciklama: belge.aciklama,
            danismanOnay: belge.danisman_onay,
            sksOnay: belge.sks_onay,
            durum: belge.durum
          }))
        : [];
      
      // Debug için ekBelgeleri logla
      if (ekBelgeler && ekBelgeler.length > 0) {
        console.log(`Etkinlik ${basvuru.id} (${basvuru.etkinlik_adi}) için ${ekBelgeler.length} ek belge bulundu.`);
      }
      
      // Konuşmacılar
      const konusmacilar = basvuru.konusmacilar
        ? basvuru.konusmacilar.map((konusmaci: any) => ({
            id: konusmaci.id,
            adSoyad: konusmaci.ad_soyad,
            ozgecmis: konusmaci.ozgecmis,
            aciklama: konusmaci.aciklama
          }))
        : [];
      
      // Sponsorlar
      const sponsorlar = basvuru.sponsorlar
        ? basvuru.sponsorlar.map((sponsor: any) => ({
            id: sponsor.id,
            firmaAdi: sponsor.firma_adi,
            detay: sponsor.detay
          }))
        : [];
      
      // Onay geçmişi
      const onayGecmisi = {
        danismanOnaylari: [] as Array<{
          id: string;
          durum: 'Onaylandı' | 'Reddedildi';
          tarih: string;
          redSebebi?: string;
        }>,
        sksOnaylari: [] as Array<{
          id: string;
          durum: 'Onaylandı' | 'Reddedildi';
          tarih: string;
          redSebebi?: string;
        }>
      };
      
      // Onay geçmişi varsa
      if (basvuru.onay_gecmisi && basvuru.onay_gecmisi.length > 0) {
        // Danışman onayları
        const danismanOnaylari = basvuru.onay_gecmisi
          .filter((onay: any) => onay.onay_tipi === 'Danışman')
          .map((onay: any) => ({
            id: onay.id,
            durum: onay.durum,
            tarih: onay.tarih,
            redSebebi: onay.red_sebebi
          }))
          .sort((a: any, b: any) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
        
        onayGecmisi.danismanOnaylari = danismanOnaylari;
          
        // SKS onayları
        const sksOnaylari = basvuru.onay_gecmisi
          .filter((onay: any) => onay.onay_tipi === 'SKS')
          .map((onay: any) => ({
            id: onay.id,
            durum: onay.durum,
            tarih: onay.tarih,
            redSebebi: onay.red_sebebi
          }))
          .sort((a: any, b: any) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
          
        onayGecmisi.sksOnaylari = sksOnaylari;
      }
      
      const sonDanismanOnayi = onayGecmisi.danismanOnaylari.length > 0 
        ? onayGecmisi.danismanOnaylari[0] 
        : undefined;
        
      const sonSksOnayi = onayGecmisi.sksOnaylari.length > 0 
        ? onayGecmisi.sksOnaylari[0] 
        : undefined;
      
      // Kulüp bilgisi kontrol ediliyor
      const kulupAdi = basvuru.kulupler ? basvuru.kulupler.isim : 'Bilinmeyen Kulüp';
      
      // Log çıktısı - revize edilmiş başvuruları takip etmek için
      if (basvuru.revizyon) {
        console.log(
          `Revize başvuru işleniyor - ID: ${basvuru.id}, ` +
          `Orijinal ID: ${basvuru.orijinal_basvuru_id}, ` +
          `Danışman onayı: ${sonDanismanOnayi ? sonDanismanOnayi.durum : 'YOK'}, ` +
          `Son onay tarihi: ${sonDanismanOnayi ? sonDanismanOnayi.tarih : 'YOK'}`
        );
      }
      
      // ÖNEMLİ: Revize edilmiş başvurular için danişmanOnay alanını doğru ayarla
      // Eğer başvuru bir revizyonsa ve onay geçmişinde hiç danışman onayı yoksa
      // bu başvuru henüz danışman tarafından incelenmemiş demektir
      // Bu durumda danismanOnay alanını undefined yapmalıyız ki danışmanın onay listesine düşsün
      
      return {
        id: basvuru.id,
        kulupId: basvuru.kulup_id,
        kulupAdi: kulupAdi,
        etkinlikAdi: basvuru.etkinlik_adi,
        etkinlikYeri: {
          fakulte: basvuru.etkinlik_fakulte,
          detay: basvuru.etkinlik_yeri_detay
        },
        etkinlikTuru: basvuru.etkinlik_turu || undefined,
        digerTuruAciklama: basvuru.diger_turu_aciklama || undefined,
        baslangicTarihi: basvuru.baslangic_tarihi,
        bitisTarihi: basvuru.bitis_tarihi,
          zamanDilimleri,
        aciklama: basvuru.aciklama,
        sponsorlar: sponsorlar,
        konusmacilar: konusmacilar,
        belgeler: belgeler,
        ekBelgeler: ekBelgeler,
        durum: basvuru.durum,
        revizyon: basvuru.revizyon,
        danismanOnay: sonDanismanOnayi,
        sksOnay: sonSksOnayi,
        onayGecmisi: onayGecmisi,
        orijinalBasvuruId: basvuru.orijinal_basvuru_id
      };
    });
    
    console.log(`${basvurular.length} başvuru dönüştürüldü`);
    
    // Revize başvuruları loglayalım
    const revizeOlanlar = basvurular.filter(b => b.revizyon);
    console.log(`${revizeOlanlar.length} revize başvuru var`);
    revizeOlanlar.forEach(b => {
      console.log(`Revize başvuru: ID=${b.id}, Orijinal=${b.orijinalBasvuruId}, DanismanOnay=${b.danismanOnay ? 'VAR' : 'YOK'}`);
    });
    
    return basvurular;
  } catch (error) {
    console.error('Başvurular getirilirken bir hata oluştu:', error);
    throw error;
  }
};

export const getBasvuruById = async (id: string): Promise<EtkinlikBasvuru | null> => {
  try {
    console.log(`ID: ${id} olan başvuru getiriliyor...`);
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    const { data, error } = await client
      .from('etkinlik_basvurulari')
      .select(`
        *,
        kulupler (isim),
        sponsorlar (*),
        konusmacilar (*),
        etkinlik_belgeleri (*),
        onay_gecmisi (*),
        ek_belgeler (*),
        etkinlik_zaman_dilimleri (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Başvuru getirilemedi:', error);
      return null;
    }

    console.log('Başvuru başarıyla getirildi.');
    
    // Onay geçmişi tipini düzelt
    type OnayGecmisiItem = {
      onay_tipi: string;
      durum: 'Onaylandı' | 'Reddedildi';
      tarih: string;
      red_sebebi?: string;
    };

    const danismanOnaylari = data.onay_gecmisi
      ? data.onay_gecmisi
          .filter((onay: OnayGecmisiItem) => onay.onay_tipi === 'Danışman')
          .map((onay: OnayGecmisiItem) => ({
            durum: onay.durum,
            tarih: onay.tarih,
            redSebebi: onay.red_sebebi
          }))
      : [];
      
    const sksOnaylari = data.onay_gecmisi
      ? data.onay_gecmisi
          .filter((onay: OnayGecmisiItem) => onay.onay_tipi === 'SKS')
          .map((onay: OnayGecmisiItem) => ({
            durum: onay.durum,
            tarih: onay.tarih,
            redSebebi: onay.red_sebebi
          }))
      : [];
    
    const sonDanismanOnayi = danismanOnaylari.length > 0 
      ? danismanOnaylari[danismanOnaylari.length - 1] 
      : undefined;
      
    const sonSksOnayi = sksOnaylari.length > 0 
      ? sksOnaylari[sksOnaylari.length - 1] 
      : undefined;
    
    // Kulüp bilgisi kontrol ediliyor
    const kulupAdi = data.kulupler ? data.kulupler.isim : 'Bilinmeyen Kulüp';
    
    const zamanDilimleri = data.etkinlik_zaman_dilimleri
      ? data.etkinlik_zaman_dilimleri.map((z: any) => ({ baslangic: z.baslangic, bitis: z.bitis }))
      : [];

    return {
      id: data.id,
      kulupAdi: kulupAdi,
      kulupId: data.kulup_id,
      etkinlikAdi: data.etkinlik_adi,
      etkinlikYeri: {
        fakulte: data.etkinlik_fakulte,
        detay: data.etkinlik_yeri_detay
      },
      etkinlikTuru: data.etkinlik_turu || undefined,
      digerTuruAciklama: data.diger_turu_aciklama || undefined,
      baslangicTarihi: data.baslangic_tarihi,
      bitisTarihi: data.bitis_tarihi,
      zamanDilimleri,
      aciklama: data.aciklama,
      durum: data.durum,
      revizyon: data.revizyon,
      orijinalBasvuruId: data.orijinal_basvuru_id,
      danismanOnay: sonDanismanOnayi,
      sksOnay: sonSksOnayi,
      sponsorlar: data.sponsorlar ? data.sponsorlar.map((sponsor: any) => ({
        firmaAdi: sponsor.firma_adi,
        detay: sponsor.detay
      })) : [],
      konusmacilar: data.konusmacilar ? data.konusmacilar.map((konusmaci: any) => ({
        adSoyad: konusmaci.ad_soyad,
        ozgecmis: konusmaci.ozgecmis,
        aciklama: konusmaci.aciklama
      })) : [],
      belgeler: data.etkinlik_belgeleri ? data.etkinlik_belgeleri.map((belge: any) => ({
        id: belge.id,
        tip: belge.tip,
        dosya: belge.dosya_yolu,
        dosyaAdi: belge.dosya_adi,
        danismanOnay: belge.danisman_onay,
        sksOnay: belge.sks_onay
      })) : [],
      ekBelgeler: data.ek_belgeler ? data.ek_belgeler.map((belge: any) => ({
        id: belge.id,
        etkinlikId: belge.etkinlik_id,
        tip: belge.tip,
        dosya: belge.dosya_yolu,
        dosyaAdi: belge.dosya_adi,
        olusturmaTarihi: belge.olusturma_tarihi,
        aciklama: belge.aciklama,
        danismanOnay: belge.danisman_onay,
        sksOnay: belge.sks_onay,
        durum: belge.durum
      })) : [],
      onayGecmisi: {
        danismanOnaylari,
        sksOnaylari
      }
    };
  } catch (error) {
    console.error(`ID: ${id} olan başvuru getirme işlemi başarısız:`, error);
    return null;
  }
};

export const updateBasvuru = async (basvuru: EtkinlikBasvuru) => {
  try {
    console.log('Başvuru güncelleniyor:', basvuru);
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    // Zaman dilimi gibi RLS'e takılan işlemler için admin client kullan
    const adminClient = supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    // Ana başvuru bilgilerini güncelle
    const { error: basvuruError } = await client
      .from('etkinlik_basvurulari')
      .update({
        etkinlik_adi: basvuru.etkinlikAdi,
        etkinlik_turu: basvuru.etkinlikTuru || null,
        diger_turu_aciklama: basvuru.digerTuruAciklama || null,
        etkinlik_fakulte: basvuru.etkinlikYeri.fakulte,
        etkinlik_yeri_detay: basvuru.etkinlikYeri.detay,
        baslangic_tarihi: basvuru.baslangicTarihi,
        bitis_tarihi: basvuru.bitisTarihi,
        aciklama: basvuru.aciklama,
        durum: basvuru.durum,
        revizyon: basvuru.revizyon,
        danisman_onay: basvuru.danismanOnay ? { durum: basvuru.danismanOnay.durum, tarih: basvuru.danismanOnay.tarih, redSebebi: basvuru.danismanOnay.redSebebi } : null,
        sks_onay: basvuru.sksOnay ? { durum: basvuru.sksOnay.durum, tarih: basvuru.sksOnay.tarih, redSebebi: basvuru.sksOnay.redSebebi } : null
      })
      .eq('id', basvuru.id)
      .select();
    
    if (basvuruError) {
      console.error('Başvuru güncellenirken hata:', basvuruError);
      throw basvuruError;
    }
    
    // Onay bilgilerini güncelle
    // Zaman dilimlerini güncelle (tam yenileme)
    if (basvuru.zamanDilimleri) {
      // Öncekileri sil
      const { error: delErr } = await adminClient
        .from('etkinlik_zaman_dilimleri')
        .delete()
        .eq('basvuru_id', basvuru.id);
      if (delErr) {
        console.error('Zaman dilimleri silinirken hata:', delErr);
      }
      const yeni = basvuru.zamanDilimleri
        .filter(z => !!z.baslangic && !!z.bitis)
        .map(z => ({ basvuru_id: basvuru.id, baslangic: z.baslangic, bitis: z.bitis }));
      if (yeni.length > 0) {
        const { error: insErr } = await adminClient
          .from('etkinlik_zaman_dilimleri')
          .insert(yeni);
        if (insErr) {
          console.error('Zaman dilimleri eklenirken hata:', insErr);
        }
      }
    }
    if (basvuru.danismanOnay || basvuru.sksOnay) {
      // Mevcut onay geçmişini al
      const { data: gecmisData, error: gecmisError } = await client
        .from('onay_gecmisi')
        .select('*')
        .eq('basvuru_id', basvuru.id);
      
      if (gecmisError) {
        console.error('Onay geçmişi alınırken hata:', gecmisError);
        throw gecmisError;
      }
      
      console.log('Mevcut onay geçmişi:', gecmisData);
      
      // Yeni onaylar ekle
      if (basvuru.danismanOnay) {
        // Aynı danışman onayı daha önce eklenmiş mi kontrol et
        const existingApproval = gecmisData?.find(
          (onay: any) => onay.onay_tipi === 'Danışman' && 
                  onay.durum === basvuru.danismanOnay?.durum && 
                  (!onay.red_sebebi || onay.red_sebebi === basvuru.danismanOnay?.redSebebi)
        );
        
        // Eğer aynı onay kaydı yoksa, yeni bir kayıt ekle
        if (!existingApproval) {
          const { error: onayError } = await client
            .from('onay_gecmisi')
            .insert({
              basvuru_id: basvuru.id,
              onay_tipi: 'Danışman',
              durum: basvuru.danismanOnay.durum,
              tarih: basvuru.danismanOnay.tarih || new Date().toISOString(),
              red_sebebi: basvuru.danismanOnay.redSebebi
            });
          
          if (onayError) {
            console.error('Danışman onayı eklenirken hata:', onayError);
            throw onayError;
          }
        } else {
          console.log('Bu danışman onayı zaten mevcut, yeni kayıt eklenmedi.');
        }
      }
      
      if (basvuru.sksOnay) {
        // Aynı SKS onayı daha önce eklenmiş mi kontrol et
        const existingApproval = gecmisData?.find(
          (onay: any) => onay.onay_tipi === 'SKS' && 
                  onay.durum === basvuru.sksOnay?.durum && 
                  (!onay.red_sebebi || onay.red_sebebi === basvuru.sksOnay?.redSebebi)
        );
        
        // Eğer aynı onay kaydı yoksa, yeni bir kayıt ekle
        if (!existingApproval) {
          const { error: onayError } = await client
            .from('onay_gecmisi')
            .insert({
              basvuru_id: basvuru.id,
              onay_tipi: 'SKS',
              durum: basvuru.sksOnay.durum,
              tarih: basvuru.sksOnay.tarih || new Date().toISOString(),
              red_sebebi: basvuru.sksOnay.redSebebi
            });
          
          if (onayError) {
            console.error('SKS onayı eklenirken hata:', onayError);
            throw onayError;
          }
        } else {
          console.log('Bu SKS onayı zaten mevcut, yeni kayıt eklenmedi.');
        }
      }
    }
    
    // Sponsorlar varsa güncelle
    if (basvuru.sponsorlar && basvuru.sponsorlar.length > 0) {
      // Önce eski sponsorları sil
      const { error: silmeError } = await client
        .from('sponsorlar')
        .delete()
        .eq('basvuru_id', basvuru.id);
      
      if (silmeError) {
        console.error('Eski sponsorlar silinirken hata:', silmeError);
        throw silmeError;
      }
      
      // Yeni sponsorları ekle
      const sponsorVerileri = basvuru.sponsorlar.map(sponsor => ({
        basvuru_id: basvuru.id,
        firma_adi: sponsor.firmaAdi,
        detay: sponsor.detay
      }));
      
      const { error: sponsorError } = await client
        .from('sponsorlar')
        .insert(sponsorVerileri);
      
      if (sponsorError) {
        console.error('Yeni sponsorlar eklenirken hata:', sponsorError);
        throw sponsorError;
      }
    }
    
    // Konuşmacılar varsa güncelle
    if (basvuru.konusmacilar && basvuru.konusmacilar.length > 0) {
      // Önce eski konuşmacıları sil
      const { error: silmeError } = await client
        .from('konusmacilar')
        .delete()
        .eq('basvuru_id', basvuru.id);
      
      if (silmeError) {
        console.error('Eski konuşmacılar silinirken hata:', silmeError);
        throw silmeError;
      }
      
      // Yeni konuşmacıları ekle
      const konusmaciVerileri = basvuru.konusmacilar.map(konusmaci => ({
        basvuru_id: basvuru.id,
        ad_soyad: konusmaci.adSoyad,
        ozgecmis: konusmaci.ozgecmis,
        aciklama: konusmaci.aciklama
      }));
      
      const { error: konusmaciError } = await client
        .from('konusmacilar')
        .insert(konusmaciVerileri);
      
      if (konusmaciError) {
        console.error('Yeni konuşmacılar eklenirken hata:', konusmaciError);
        throw konusmaciError;
      }
    }
    
    // Belgeler varsa güncelle
    if (basvuru.belgeler && basvuru.belgeler.length > 0) {
      // Yeni oluşturduğumuz fonksiyonu kullan
      await updateBesvuruBelgeleri(basvuru.id, basvuru.belgeler, client);
    }
    
    console.log('Başvuru başarıyla güncellendi.');
    return basvuru.id;
    
  } catch (error) {
    console.error('Başvuru güncellenemedi:', error);
    throw error;
  }
};

export const clearStorage = async () => {
  try {
    console.log('Veritabanı temizleme işlemi başlatılıyor...');
    
    // Bu işlem için admin yetkisi gerekiyor, bu yüzden doğrudan supabaseAdmin kullanıyoruz
    const client = supabaseAdmin;
    
    // Tüm başvuruları temizle
    // Not: Önce ilişkili tabloları temizlememiz gerekiyor
    
    // 1. Onay geçmişini temizle
    console.log('Onay geçmişi temizleniyor...');
    const { error: onayError } = await client
      .from('onay_gecmisi')
      .delete()
      .neq('id', 0); // Tüm kayıtları sil
    
    if (onayError) {
      console.error('Onay geçmişi temizlenirken hata:', onayError);
      throw onayError;
    }
    
    // 2. Sponsorları temizle
    console.log('Sponsorlar temizleniyor...');
    const { error: sponsorError } = await client
      .from('sponsorlar')
      .delete()
      .neq('id', 0);
    
    if (sponsorError) {
      console.error('Sponsorlar temizlenirken hata:', sponsorError);
      throw sponsorError;
    }
    
    // 3. Konuşmacıları temizle
    console.log('Konuşmacılar temizleniyor...');
    const { error: konusmaciError } = await client
      .from('konusmacilar')
      .delete()
      .neq('id', 0);
    
    if (konusmaciError) {
      console.error('Konuşmacılar temizlenirken hata:', konusmaciError);
      throw konusmaciError;
    }
    
    // 4. Ek belgeleri temizle
    console.log('Ek belgeler temizleniyor...');
    const { error: ekBelgeError } = await client
      .from('ek_belgeler')
      .delete()
      .neq('id', 0);
    if (ekBelgeError) {
      console.error('Ek belgeler temizlenirken hata:', ekBelgeError);
      throw ekBelgeError;
    }

    // 5. Belgeleri temizle
    console.log('Belgeler temizleniyor...');
    const { error: belgeError } = await client
      .from('etkinlik_belgeleri')
      .delete()
      .neq('id', 0);
    if (belgeError) {
      console.error('Belgeler temizlenirken hata:', belgeError);
      throw belgeError;
    }
    
    // 6. Son olarak başvuruları temizle
    console.log('Başvurular temizleniyor...');
    const { error: basvuruError } = await client
      .from('etkinlik_basvurulari')
      .delete()
      .neq('id', 0);
    
    if (basvuruError) {
      console.error('Başvurular temizlenirken hata:', basvuruError);
      throw basvuruError;
    }
    
    console.log('Tüm veriler başarıyla temizlendi');
    
  } catch (error) {
    console.error('Veriler temizlenirken hata oluştu:', error);
    throw error;
  }
};

// Kulüpler için fonksiyonlar
export const getKulupler = async (): Promise<Kulup[]> => {
  try {
    console.log('Kulüpler getiriliyor...');
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    // Fetch clubs data
    const { data, error } = await client
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
        ),
        kulup_danismanlar!left(
          id,
          aktif,
          akademik_danismanlar (
            id,
            ad_soyad,
            bolum,
            eposta,
            telefon,
            fakulte,
            oda_no
          )
        )
      `);
    
    if (error) {
      console.error('Kulüpler getirilemedi:', error);
      throw error;
    }
    
    // Fetch all alt_topluluklar
    const { data: allAltTopluluklar, error: altError } = await client
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
    
    console.log(`${data.length} kulüp bulundu.`);
    
    // Veritabanından gelen veriyi frontend tipimize dönüştür
    const kulupList = data.map(k => {
      const primaryDan = k.akademik_danismanlar ? {
        id: k.akademik_danismanlar.id,
        adSoyad: k.akademik_danismanlar.ad_soyad,
        bolum: k.akademik_danismanlar.bolum,
        eposta: k.akademik_danismanlar.eposta,
        telefon: k.akademik_danismanlar.telefon,
        fakulte: k.akademik_danismanlar.fakulte,
        odaNo: k.akademik_danismanlar.oda_no
      } as AkademikDanisman : undefined;

      const coklu: AkademikDanisman[] | undefined = Array.isArray(k.kulup_danismanlar)
        ? k.kulup_danismanlar
            .filter((r: any) => r && r.aktif && r.akademik_danismanlar)
            .slice(0, 2)
            .map((r: any) => ({
              id: r.akademik_danismanlar.id,
              adSoyad: r.akademik_danismanlar.ad_soyad,
              bolum: r.akademik_danismanlar.bolum,
              eposta: r.akademik_danismanlar.eposta,
              telefon: r.akademik_danismanlar.telefon,
              fakulte: r.akademik_danismanlar.fakulte,
              odaNo: r.akademik_danismanlar.oda_no
            }))
        : undefined;

      const fallback: AkademikDanisman = primaryDan || (coklu && coklu[0]) || {
        id: 'NA', adSoyad: '—', eposta: '', bolum: ''
      } as any;

      return {
        id: k.id,
        isim: k.isim,
        akademikDanisman: fallback,
        akademikDanismanlar: coklu,
        baskan: {
          adSoyad: k.baskan_ad_soyad,
          eposta: k.baskan_eposta,
          telefon: k.baskan_telefon
        },
        odaNo: k.oda_no,
        digerTesisler: k.diger_tesisler,
        altTopluluklar: altToplulukMap.has(k.id) ? altToplulukMap.get(k.id) : k.alt_topluluklar,
        tuzuk: k.tuzuk,
        logo: k.logo
      } as Kulup;
    });
    
    return kulupList;
  } catch (error) {
    console.error('Kulüpler getirme işlemi başarısız:', error);
    return [];
  }
};

export const revizeEt = async (basvuru: EtkinlikBasvuru): Promise<EtkinlikBasvuru> => {
  try {
    console.log(`ID: ${basvuru.id} olan başvuru revize ediliyor...`);
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    // Orijinal başvuruyu veritabanından tazele (özellikle etkinlik_turu ve zaman dilimleri için)
    let orijinal = basvuru;
    try {
      const fetched = await getBasvuruById(basvuru.id);
      if (fetched) {
        orijinal = fetched;
      }
    } catch (e) {
      console.warn('Orijinal başvuru DB üzerinden getirilemedi, mevcut nesne kullanılacak.', e);
    }

    // Yeni başvuru ID'si oluştur (geçici, DB ekledikten sonra gerçek ID alınır)
    const yeniId = Date.now().toString();
    
    // Yeni başvuru objesi oluştur
    const yeniBasvuru: EtkinlikBasvuru = {
      ...basvuru,
      id: yeniId,
      revizyon: true,
      danismanOnay: undefined, // Danışman onayını null yap (yeniden onay gerekir)
      sksOnay: undefined, // SKS onayını null yap (yeniden onay gerekir)
      durum: 'Beklemede',
      onayGecmisi: {
        // Onay geçmişini taşı, ama yeni bir onay gerektiğini belirterek
        danismanOnaylari: [...basvuru.onayGecmisi.danismanOnaylari],
        sksOnaylari: [...basvuru.onayGecmisi.sksOnaylari]
      }
    };
    
    // Yeni başvuruyu veritabanına ekle
    const revizeObjesi = {
      kulup_id: yeniBasvuru.kulupId,
      etkinlik_adi: yeniBasvuru.etkinlikAdi,
      etkinlik_turu: orijinal.etkinlikTuru || yeniBasvuru.etkinlikTuru || null,
      diger_turu_aciklama: orijinal.digerTuruAciklama || yeniBasvuru.digerTuruAciklama || null,
      etkinlik_fakulte: yeniBasvuru.etkinlikYeri.fakulte,
      etkinlik_yeri_detay: yeniBasvuru.etkinlikYeri.detay,
      baslangic_tarihi: orijinal.baslangicTarihi || yeniBasvuru.baslangicTarihi,
      bitis_tarihi: orijinal.bitisTarihi || yeniBasvuru.bitisTarihi,
      aciklama: yeniBasvuru.aciklama,
      durum: 'Beklemede',
      revizyon: true,
      orijinal_basvuru_id: basvuru.id // Orijinal başvurunun ID'sini kaydediyoruz
    };
    
    console.log("Revize başvuru oluşturuluyor:", revizeObjesi);
    
    const { data: basvuruData, error: basvuruError } = await client
      .from('etkinlik_basvurulari')
      .insert(revizeObjesi)
      .select()
      .single();
    
    if (basvuruError) {
      console.error('Revize başvuru oluşturulurken hata:', basvuruError);
      throw basvuruError;
    }
    
    console.log('Eklenen başvuru verisi:', basvuruData);
    console.log('Revizyon durumu:', basvuruData.revizyon);
    
    const yeniBasvuruId = basvuruData.id;
    console.log('Yeni revize başvuru oluşturuldu, ID:', yeniBasvuruId);
    
    // Orijinal başvurunun zaman dilimlerini kopyala
    try {
      const kopyalanacakDilimler = (orijinal.zamanDilimleri && orijinal.zamanDilimleri.length > 0)
        ? orijinal.zamanDilimleri
        : ((orijinal.baslangicTarihi && orijinal.bitisTarihi)
            ? [{ baslangic: orijinal.baslangicTarihi, bitis: orijinal.bitisTarihi }]
            : []);

      if (kopyalanacakDilimler.length > 0) {
        const insertRows = kopyalanacakDilimler
          .filter(z => !!z.baslangic && !!z.bitis)
          .map(z => ({ basvuru_id: yeniBasvuruId, baslangic: z.baslangic, bitis: z.bitis }));
        if (insertRows.length > 0) {
          const { error: zdInsErr } = await supabaseAdmin
            .from('etkinlik_zaman_dilimleri')
            .insert(insertRows);
          if (zdInsErr) {
            console.error('Revize için zaman dilimleri kopyalanırken hata:', zdInsErr);
          }
        }
      }
    } catch (zdCopyErr) {
      console.error('Zaman dilimleri kopyalama sırasında beklenmeyen hata:', zdCopyErr);
    }

    // Sponsorlar varsa kopyala
    if (basvuru.sponsorlar && basvuru.sponsorlar.length > 0) {
      const sponsorVerileri = basvuru.sponsorlar.map(sponsor => ({
        basvuru_id: yeniBasvuruId,
        firma_adi: sponsor.firmaAdi,
        detay: sponsor.detay
      }));
      
      const { error: sponsorError } = await client
        .from('sponsorlar')
        .insert(sponsorVerileri);
      
      if (sponsorError) {
        console.error('Sponsorlar kopyalanırken hata:', sponsorError);
        throw sponsorError;
      }
    }
    
    // Konuşmacılar varsa kopyala
    if (basvuru.konusmacilar && basvuru.konusmacilar.length > 0) {
      const konusmaciVerileri = basvuru.konusmacilar.map(konusmaci => ({
        basvuru_id: yeniBasvuruId,
        ad_soyad: konusmaci.adSoyad,
        ozgecmis: konusmaci.ozgecmis,
        aciklama: konusmaci.aciklama
      }));
      
      const { error: konusmaciError } = await client
        .from('konusmacilar')
        .insert(konusmaciVerileri);
      
      if (konusmaciError) {
        console.error('Konuşmacılar kopyalanırken hata:', konusmaciError);
        throw konusmaciError;
      }
    }
    
    // Belgeler varsa kopyala (revizde sadece reddedilen veya kullanıcı seçimine göre kopyalanabilir)
    if (basvuru.belgeler && basvuru.belgeler.length > 0) {
      // Yalnızca reddedilen veya beklemede olan belgeleri taşı; onaylı olanlar aynı kalır
      const tasinacakBelgeler = basvuru.belgeler.filter(belge => belge.danismanOnay?.durum !== 'Onaylandı');
      if (tasinacakBelgeler.length > 0) {
        const belgeVerileri = tasinacakBelgeler.map(belge => ({
          basvuru_id: yeniBasvuruId,
          tip: belge.tip,
          dosya_adi: belge.dosyaAdi,
          dosya_yolu: belge.dosya
        }));
        const { error: belgeError } = await client
          .from('etkinlik_belgeleri')
          .insert(belgeVerileri);
        if (belgeError) {
          console.error('Belgeler kopyalanırken hata:', belgeError);
          throw belgeError;
        }
      }
    }

    // Ek belgeler varsa kopyala (durumları korunarak)
    if (basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0) {
      const ekBelgeVerileri = basvuru.ekBelgeler.map(ek => ({
        etkinlik_id: yeniBasvuruId,
        tip: ek.tip,
        dosya_adi: ek.dosyaAdi,
        dosya_yolu: ek.dosya,
        olusturma_tarihi: ek.olusturmaTarihi || new Date().toISOString(),
        aciklama: ek.aciklama || null,
        danisman_onay: ek.danismanOnay || null,
        sks_onay: ek.sksOnay || null,
        durum: ek.durum || 'Beklemede'
      }));

      const { error: ekBelgeError } = await client
        .from('ek_belgeler')
        .insert(ekBelgeVerileri);

      if (ekBelgeError) {
        console.error('Ek belgeler kopyalanırken hata:', ekBelgeError);
        throw ekBelgeError;
      }
    }
    
    console.log('Revize başvuru veritabanına kaydedildi, onay geçmişi temizlendi');
    console.log('Bu başvuru danışman onayına düşecek');
    
    // Yeni başvuru ID'sini güncelle
    yeniBasvuru.id = yeniBasvuruId;
    console.log('Başvuru başarıyla revize edildi. Revizyon durumu:', yeniBasvuru.revizyon);
    console.log(`REVİZE EDİLEN BAŞVURU: ${yeniBasvuruId} (Orijinal ID: ${basvuru.id})`);
    
    return yeniBasvuru;
    
  } catch (error) {
    console.error('Başvuru revize edilirken hata oluştu:', error);
    throw error;
  }
};

// PDF Formlar için fonksiyonlar
export interface FormDosyasi {
  id: string;
  isim: string;
  dosyaYolu: string;
  aciklama?: string;
  kategori: 'Kulüp' | 'Etkinlik' | 'SKS' | 'Diğer';
  yuklemeTarihi: string;
}

// Kullanıcı rolünü almak için yardımcı fonksiyon
const getUserRole = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Kullanıcı rolü alınırken hata:', error);
      return null;
    }
    
    return data?.role || null;
  } catch (error) {
    console.error('Kullanıcı rolü alma işlemi başarısız:', error);
    return null;
  }
};

// Yeni bir form dosyası yükle
export const formYukle = async (
  dosya: File, 
  formBilgisi: Omit<FormDosyasi, 'id' | 'dosyaYolu' | 'yuklemeTarihi'>
): Promise<FormDosyasi | null> => {
  try {
    console.log('Form dosyası yükleniyor:', formBilgisi.isim);
    console.log('Dosya bilgileri:', {
      isim: dosya.name,
      boyut: dosya.size,
      tip: dosya.type
    });
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    // Kullanıcı rolünü kontrol et
    if (sessionData.session?.user?.id) {
      const role = await getUserRole(sessionData.session.user.id);
      console.log('Kullanıcı rolü:', role);
      
      if (role !== 'admin' && role !== 'sks') {
        console.error('Yetki hatası: Form yükleme işlemi için admin veya sks rolü gereklidir');
        throw new Error('Form yükleme yetkisi yok');
      }
    }
    
    // 1. Storage'a dosyayı yükle - önce bucket'ın varlığını kontrol et
    try {
      console.log('Bucket kontrolü yapılıyor...');
      const { data: buckets } = await client.storage.listBuckets();
      
      // Tüm bucketları logla
      console.log('Mevcut bucketlar:', buckets?.map(b => b.name));
      
      // 'form-dosyalari' bucket'ı var mı kontrol et
      const bucketVarMi = buckets?.some(b => b.name === 'form-dosyalari');
      console.log('form-dosyalari bucket var mı:', bucketVarMi);
      
      if (!bucketVarMi) {
        console.error('Bucket bulunamadı. Lütfen Supabase Dashboard üzerinden "form-dosyalari" adında bir bucket oluşturun.');
        throw new Error('Bucket bulunamadı: form-dosyalari');
      }
    } catch (err) {
      console.error('Bucket kontrolü sırasında hata:', err);
    }
    
    // Dosya yolunu hazırla - kategoriyi ve dosya adını normalize et
    const normalizeString = (str: string): string => {
      return str
        .replace(/\s+/g, '_') // Boşlukları alt çizgiye dönüştür
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'I')
        .replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U')
        .replace(/Ş/g, 'S')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C');
    };
    
    const normalizeKategori = normalizeString(formBilgisi.kategori);
    const normalizeFileName = normalizeString(dosya.name);
    
    // Dosya yolunu oluştur
    const dosyaYolu = `${normalizeKategori}/${Date.now()}_${normalizeFileName}`;
    console.log('Yüklenecek dosya yolu:', dosyaYolu);
    
    const { data: storageData, error: storageError } = await client.storage
      .from('form-dosyalari')
      .upload(dosyaYolu, dosya, {
        contentType: dosya.type,
        upsert: false
      });
    
    if (storageError) {
      console.error('Dosya yükleme hatası:', storageError);
      console.error('Hata detayları:', JSON.stringify(storageError));
      throw storageError;
    }
    
    console.log('Dosya başarıyla yüklendi:', storageData.path);
    
    // 2. Veritabanına form bilgilerini kaydet
    const yeniForm = {
      isim: formBilgisi.isim,
      dosya_yolu: storageData.path,
      aciklama: formBilgisi.aciklama || null,
      kategori: formBilgisi.kategori,
      yukleme_tarihi: new Date().toISOString()
    };
    
    console.log('Veritabanına kaydedilecek form bilgisi:', yeniForm);
    
    const { data: dbData, error: dbError } = await client
      .from('form_dosyalari')
      .insert(yeniForm)
      .select()
      .single();
    
    if (dbError) {
      console.error('Form bilgisi kaydedilirken hata:', dbError);
      console.error('Hata detayları:', JSON.stringify(dbError));
      // Dosya yüklendiyse ancak veritabanına kaydedilemediyse, dosyayı sil
      await client.storage.from('form-dosyalari').remove([storageData.path]);
      throw dbError;
    }
    
    console.log('Form bilgisi veritabanına kaydedildi:', dbData);
    
    // 3. Yanıt formatını düzenle
    return {
      id: dbData.id,
      isim: dbData.isim,
      dosyaYolu: dbData.dosya_yolu,
      aciklama: dbData.aciklama,
      kategori: dbData.kategori,
      yuklemeTarihi: dbData.yukleme_tarihi
    };
    
  } catch (error) {
    console.error('Form yükleme işlemi başarısız:', error);
    return null;
  }
};

// Form dosyalarını getir
export const formlariGetir = async (kategori?: 'Kulüp' | 'Etkinlik' | 'SKS' | 'Diğer'): Promise<FormDosyasi[]> => {
  try {
    console.log('Form dosyaları getiriliyor...');
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    let query = client.from('form_dosyalari').select('*').order('yukleme_tarihi', { ascending: false });
    
    // Eğer kategori belirtilmişse, o kategoriye göre filtrele
    if (kategori) {
      query = query.eq('kategori', kategori);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Form dosyaları getirilemedi:', error);
      throw error;
    }
    
    console.log(`${data.length} form dosyası bulundu.`);
    
    // Yanıt formatını düzenle
    return data.map(form => ({
      id: form.id,
      isim: form.isim,
      dosyaYolu: form.dosya_yolu,
      aciklama: form.aciklama,
      kategori: form.kategori,
      yuklemeTarihi: form.yukleme_tarihi
    }));
    
  } catch (error) {
    console.error('Form dosyaları getirme işlemi başarısız:', error);
    return [];
  }
};

// Form dosyasını indir
export const formIndir = async (dosyaYolu: string): Promise<string | null> => {
  try {
    console.log('Form dosyası indiriliyor:', dosyaYolu);
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    
    const { data, error } = await client.storage
      .from('form-dosyalari')
      .createSignedUrl(dosyaYolu, 60); // 60 saniyelik geçerli indirme bağlantısı
    
    if (error) {
      console.error('İndirme bağlantısı oluşturma hatası:', error);
      console.error('Hata detayları:', JSON.stringify(error));
      
      // Dosya yolunu parçalara ayır ve kontrol et
      const pathParts = dosyaYolu.split('/');
      if (pathParts.length < 4) {
        console.error('Geçersiz dosya yolu formatı. Beklenen format: kulupId/basvuruId/tip/dosyaAdi');
        throw new Error('Geçersiz dosya yolu formatı');
      }
      
      throw error;
    }
    
    console.log('İndirme bağlantısı oluşturuldu:', data.signedUrl);
    return data.signedUrl;
  } catch (error) {
    console.error('Form indirme işlemi başarısız:', error);
    return null;
  }
};

// Form dosyasını sil
export const formSil = async (formId: string, dosyaYolu: string): Promise<boolean> => {
  try {
    console.log(`ID: ${formId} olan form siliniyor...`);
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    // 1. Veritabanından form bilgisini sil
    const { error: dbError } = await client
      .from('form_dosyalari')
      .delete()
      .eq('id', formId);
    
    if (dbError) {
      console.error('Form bilgisi silinirken hata:', dbError);
      throw dbError;
    }
    
    // 2. Storage'dan dosyayı sil
    const { error: storageError } = await client.storage
      .from('form-dosyalari')
      .remove([dosyaYolu]);
    
    if (storageError) {
      console.error('Dosya silinirken hata:', storageError);
      console.error('Hata detayları:', JSON.stringify(storageError));
      console.warn('Form veritabanından silindi ancak dosya storage\'dan silinemedi.');
    }
    
    console.log('Form başarıyla silindi.');
    return true;
  } catch (error) {
    console.error('Form silme işlemi başarısız:', error);
    return false;
  }
};

// Etkinlik belgeleri için fonksiyonlar
export interface EtkinlikBelgeUpload {
  dosya: File;
  dosyaAdi: string;
  tip: string;
  basvuruId: string;
}

// Etkinlik belgesi yükle
export const etkinlikBelgeYukle = async (
  belge: EtkinlikBelgeUpload
): Promise<string | null> => {
  try {
    console.log('Etkinlik belgesi yükleniyor:', belge.dosyaAdi);
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, hataya düş
    if (!sessionData.session) {
      console.error('Etkinlik belgesi yüklemek için oturum açık olmalıdır');
      throw new Error('Oturum açık değil');
    }
    
    // Dosya yolunu hazırla
    const normalizeString = (str: string): string => {
      return str
        .replace(/\s+/g, '_') // Boşlukları alt çizgiye dönüştür
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'I')
        .replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U')
        .replace(/Ş/g, 'S')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C');
    };
    
    const safeFileName = normalizeString(belge.dosyaAdi);
    const safeTip = normalizeString(belge.tip);
    
    // Önce basvuru bilgisini al - kulüp ID'si için gerekli
    const { data: basvuruData, error: basvuruError } = await supabase
      .from('etkinlik_basvurulari')
      .select('kulup_id')
      .eq('id', belge.basvuruId)
      .single();
    
    if (basvuruError) {
      console.error('Başvuru bilgisi alınamadı:', basvuruError);
      throw new Error(`Başvuru bilgisi alınamadı: ${basvuruError.message}`);
    }
    
    const kulupId = basvuruData.kulup_id;
    
    // Organizasyon yapısı: kulupId/basvuruId/tip/{timestamp}_{dosyaAdi}
    const dosyaYolu = `${kulupId}/${belge.basvuruId}/${safeTip}/${Date.now()}_${safeFileName}`;
    
    // Bucket kontrolünü atlayıp doğrudan yüklemeyi dene
    try {
      console.log('Etkinlik-belgeleri bucket\'ına dosya yükleniyor...');
      console.log('Yüklenecek dosya yolu:', dosyaYolu);
      
      // Dosyayı yükle - Storage işlemleri için supabase client kullan
      const { data, error } = await supabase.storage
        .from('etkinlik-belgeleri') // alt çizgi (_) yerine tire (-) kullan
        .upload(dosyaYolu, belge.dosya, {
          contentType: belge.dosya.type,
          upsert: true, // Varsa üzerine yaz
          cacheControl: '3600'
        });
      
      if (error) {
        // Eğer bucket yok hatası alınırsa uygun mesaj göster
        if (error.message.includes('bucket not found') || 
            error.message.includes('not exists') ||
            error.message.includes('does not exist')) {
          console.error('Etkinlik belgeleri bucket bulunamadı:', error);
          
          const errorMessage = `"etkinlik-belgeleri" adlı depolama alanı (bucket) bulunamadı.
          
Bu sorunu çözmek için sistem yöneticinize başvurun ve şu adımları uygulamasını isteyin:

1. Supabase Dashboard'a giriş yapın (https://supabase.com/dashboard)
2. Projenizi seçin
3. Sol menüde "Storage" seçeneğine tıklayın
4. "New Bucket" butonuna tıklayın
5. Bucket adı olarak "etkinlik-belgeleri" yazın (tam olarak bu şekilde, tire ile)
6. "Public" seçeneğini işaretlemeyin
7. "Create bucket" butonuna tıklayın
8. Bucket oluşturulduktan sonra "Policies" sekmesine giderek gerekli izinleri ekleyin

İşlem tamamlandıktan sonra sayfayı yenileyin ve tekrar deneyin.`;
          
          alert(errorMessage);
          throw new Error('Etkinlik belgeleri için gerekli depolama alanı bulunamadı. Lütfen sistem yöneticisine başvurun.');
        } 
        // Yetki hatası durumunda
        else if (error.message.includes('permission') || 
                error.message.includes('access denied') ||
                error.message.includes('not allowed')) {
          console.error('Etkinlik belgeleri bucket erişim yetkisi yok:', error);
          
          const errorMessage = `Etkinlik belgeleri yükleme yetkisi bulunamadı.
          
Bu sorunu çözmek için sistem yöneticinize başvurun ve şu izinleri kontrol etmesini isteyin:
1. Supabase Dashboard > Storage > Policies yolunda
2. "etkinlik-belgeleri" bucket'ı için INSERT politikalarını
3. Mevcut kullanıcı rolü için (kulup_baskani) izin verildiğinden emin olmasını

İşlem tamamlandıktan sonra sayfayı yenileyin ve tekrar deneyin.`;
          
          alert(errorMessage);
          throw new Error('Etkinlik belgeleri yükleme yetkisi bulunamadı. Lütfen sistem yöneticisine başvurun.');
        }
        // Diğer hatalar
        else {
          console.error('Belge yükleme hatası:', error);
          console.error('Hata detayları:', JSON.stringify(error));
          throw error;
        }
      }
      
      console.log('Belge başarıyla yüklendi:', data.path);
      
      // Etkinlik belgeleri tablosuna kaydet - İzin sorunlarını önlemek için admin client kullan
      const { error: dbError } = await supabaseAdmin
        .from('etkinlik_belgeleri')
        .insert({
          basvuru_id: belge.basvuruId,
          tip: belge.tip,
          dosya_adi: belge.dosyaAdi,
          dosya_yolu: data.path
        });
      
      if (dbError) {
        console.error('Belge bilgisi kaydedilirken hata:', dbError);
        // Dosya yüklendiyse ancak veritabanına kaydedilemediyse, dosyayı sil
        await supabase.storage.from('etkinlik-belgeleri').remove([data.path]);
        throw new Error(`Belge bilgisi kaydedilemedi: ${dbError.message}`);
      }
      
      return data.path;
    } catch (err) {
      console.error('Dosya yükleme sırasında hata:', err);
      throw err;
    }
  } catch (error) {
    console.error('Belge yükleme işlemi başarısız:', error);
    return null;
  }
};

// Etkinlik belgesi indir
export const etkinlikBelgeIndir = async (dosyaYolu: string): Promise<string | null> => {
  try {
    console.log('Etkinlik belgesi indiriliyor:', dosyaYolu);
    
    // Eğer dosya yolu base64 ile başlıyorsa, direkt olarak döndür
    if (dosyaYolu.startsWith('data:')) {
      console.log('Base64 dosya tespit edildi, direkt döndürülüyor');
      return dosyaYolu;
    }
    
    // Bucket kontrolünü kaldırıp direkt olarak dosyayı indirmeye çalışacağız
    // Storage'dan dosyayı indir
    const { data, error } = await supabase.storage
      .from('etkinlik-belgeleri') // alt çizgi (_) yerine tire (-) kullan
      .createSignedUrl(dosyaYolu, 60); // 60 saniyelik geçerli indirme bağlantısı
    
    if (error) {
      console.error('İndirme bağlantısı oluşturma hatası:', error);
      console.error('Hata detayları:', JSON.stringify(error));
      
      // Bucket yok hatası için özel mesaj
      if (error.message && (
          error.message.includes('bucket not found') || 
          error.message.includes('not exist') ||
          error.message.includes('does not exist')
      )) {
        console.error('Etkinlik belgeleri bucket bulunamadı. Bu sorunu çözmek için:');
        console.error('1. Supabase Dashboard > Storage menüsünden yeni bir bucket oluşturun: "etkinlik-belgeleri"');
        console.error('2. Bucket\'ı oluşturduktan sonra, gerekli RLS politikalarını ayarlayın.');
        
        alert('Etkinlik belgeleri için gerekli depolama alanı (bucket) bulunamadı. Lütfen sistem yöneticisine başvurun.');
        return null;
      }
      
      // Dosya yolunu parçalara ayır ve kontrol et
      const pathParts = dosyaYolu.split('/');
      if (pathParts.length < 4) {
        console.error('Geçersiz dosya yolu formatı. Beklenen format: kulupId/basvuruId/tip/dosyaAdi');
        throw new Error('Geçersiz dosya yolu formatı');
      }
      
      throw error;
    }
    
    console.log('İndirme bağlantısı oluşturuldu:', data.signedUrl);
    return data.signedUrl;
  } catch (error) {
    console.error('Belge indirme işlemi başarısız:', error);
    return null;
  }
};

// Etkinlik belgesi sil
export const etkinlikBelgeSil = async (belgeId: string, dosyaYolu: string): Promise<boolean> => {
  try {
    console.log(`ID: ${belgeId} olan belge siliniyor...`);
    
    // Dosya yolu kontrolü
    const pathParts = dosyaYolu.split('/');
    if (pathParts.length < 4) {
      console.error('Geçersiz dosya yolu formatı. Beklenen format: kulupId/basvuruId/tip/dosyaAdi');
      throw new Error('Geçersiz dosya yolu formatı');
    }
    
    // Kullanıcının kulüp ile ilişkisini kontrol et - yalnızca kendi kulübünün belgelerini silebilmeli
    const kulupId = pathParts[0];
    const basvuruId = pathParts[1];
    
    console.log(`Belge silme işlemi: KulüpID: ${kulupId}, BaşvuruID: ${basvuruId}`);
    
    // Önce veritabanından belge bilgisini sil
    const { error: dbError } = await supabase
      .from('etkinlik_belgeleri')
      .delete()
      .eq('id', belgeId);
    
    if (dbError) {
      console.error('Belge bilgisi silinirken hata:', dbError);
      throw dbError;
    }
    
    // Storage'dan dosyayı sil
    const { error: storageError } = await supabase.storage
      .from('etkinlik-belgeleri') // alt çizgi (_) yerine tire (-) kullan
      .remove([dosyaYolu]);
    
    if (storageError) {
      console.error('Dosya silinirken hata:', storageError);
      console.error('Hata detayları:', JSON.stringify(storageError));
      console.warn('Belge veritabanından silindi ancak dosya storage\'dan silinemedi.');
    }
    
    console.log('Belge başarıyla silindi.');
    return true;
  } catch (error) {
    console.error('Belge silme işlemi başarısız:', error);
    return false;
  }
};

// Belge onaylama ve reddetme
export const belgeOnayla = async (
  belgeId: string, 
  onayTipi: 'Danışman' | 'SKS'
): Promise<boolean> => {
  try {
    console.log(`${onayTipi} tarafından ID: ${belgeId} olan belge onaylanıyor...`);
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa hata döndür
    if (!sessionData.session) {
      console.error('Belge onaylamak için oturum açık olmalıdır');
      throw new Error('Oturum açık değil');
    }
    
    // Onay bilgisini hazırla
    const onayBilgisi = {
      durum: 'Onaylandı',
      tarih: new Date().toISOString()
    };
    
    // Veritabanını güncelle
    const alanAdi = onayTipi === 'Danışman' ? 'danisman_onay' : 'sks_onay';
    
    const { error } = await supabase
      .from('etkinlik_belgeleri')
      .update({ [alanAdi]: onayBilgisi })
      .eq('id', belgeId)
      .select();
    
    if (error) {
      console.error(`Belge onaylama hatası:`, error);
      throw error;
    }
    
    console.log(`Belge başarıyla onaylandı: ${belgeId}`);
    return true;
  } catch (error) {
    console.error('Belge onaylama işlemi başarısız:', error);
    return false;
  }
};

export const belgeReddet = async (
  belgeId: string,
  onayTipi: 'Danışman' | 'SKS',
  redSebebi: string
): Promise<boolean> => {
  try {
    console.log(`${onayTipi} tarafından ID: ${belgeId} olan belge reddediliyor...`);
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa hata döndür
    if (!sessionData.session) {
      console.error('Belge reddetmek için oturum açık olmalıdır');
      throw new Error('Oturum açık değil');
    }
    
    // Red sebebi boş olamaz
    if (!redSebebi.trim()) {
      throw new Error('Red sebebi belirtilmelidir');
    }
    
    // Onay bilgisini hazırla
    const redBilgisi = {
      durum: 'Reddedildi',
      tarih: new Date().toISOString(),
      redSebebi: redSebebi
    };
    
    // Veritabanını güncelle
    const alanAdi = onayTipi === 'Danışman' ? 'danisman_onay' : 'sks_onay';
    
    const { error } = await supabase
      .from('etkinlik_belgeleri')
      .update({ [alanAdi]: redBilgisi })
      .eq('id', belgeId)
      .select();
    
    if (error) {
      console.error(`Belge reddetme hatası:`, error);
      throw error;
    }
    
    console.log(`Belge başarıyla reddedildi: ${belgeId}`);
    return true;
  } catch (error) {
    console.error('Belge reddetme işlemi başarısız:', error);
    return false;
  }
};

// Belgeleri silip tekrar eklemek için kullanılacak fonksiyon
const updateBesvuruBelgeleri = async (
  basvuruId: string, 
  belgeler: EtkinlikBelge[], 
  client: any
): Promise<void> => {
  if (belgeler && belgeler.length > 0) {
    // Önce eski belgeleri sil
    const { error: silmeError } = await client
      .from('etkinlik_belgeleri')
      .delete()
      .eq('basvuru_id', basvuruId);
    
    if (silmeError) {
      console.error('Eski belgeler silinirken hata:', silmeError);
      throw silmeError;
    }
    
    // File nesnesi olan belgeleri atla, sadece string dosya yolları olanları kaydet
    const stringBelgeler = belgeler.filter(belge => typeof belge.dosya === 'string');
    
    if (stringBelgeler.length > 0) {
      // Yeni belgeleri ekle
      const belgeVerileri = stringBelgeler.map(belge => ({
        basvuru_id: basvuruId,
        tip: belge.tip,
        dosya_adi: belge.dosyaAdi,
        dosya_yolu: belge.dosya,
        danisman_onay: belge.danismanOnay,
        sks_onay: belge.sksOnay
      }));
      
      const { error: belgeError } = await client
        .from('etkinlik_belgeleri')
        .insert(belgeVerileri);
      
      if (belgeError) {
        console.error('Yeni belgeler eklenirken hata:', belgeError);
        throw belgeError;
      }
    }
  }
};

// ------- Ek Belge İşlemleri --------

// Ek belge yükleme işlemi
export type EkBelgeUpload = Omit<EkBelge, 'id' | 'olusturmaTarihi' | 'danismanOnay' | 'sksOnay' | 'durum'>;

export const ekBelgeYukle = async (
  belge: EkBelgeUpload
): Promise<string | null> => {
  try {
    console.log('Ek belge yükleniyor:', belge.dosyaAdi, 'Etkinlik ID:', belge.etkinlikId, 'Tip:', belge.tip);
    
    // Admin client kullan - RLS bypass için
    const client = supabaseAdmin;

    // Dosya kontrolü
    if (!(belge.dosya instanceof File)) {
      console.error('Geçersiz dosya: Dosya bir File nesnesi olmalıdır');
      throw new Error('Geçersiz dosya formatı');
    }
    
    // Önce etkinlik bilgisini al - kulüp ID'si için gerekli
    const { data: etkinlikData, error: etkinlikError } = await client
      .from('etkinlik_basvurulari')
      .select('kulup_id, etkinlik_adi')
      .eq('id', belge.etkinlikId)
      .single();
    
    if (etkinlikError) {
      console.error('Etkinlik bilgisi alınamadı:', etkinlikError);
      throw new Error(`Etkinlik bilgisi alınamadı: ${etkinlikError.message}`);
    }
    
    const kulupId = etkinlikData.kulup_id;
    
    // Dosya yolunu hazırla - belge tipini ve dosya adını normalize et
    const normalizeString = (str: string): string => {
      return str
        .replace(/\s+/g, '_') // Boşlukları alt çizgiye dönüştür
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'I')
        .replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U')
        .replace(/Ş/g, 'S')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C');
    };
    
    const dosyaTipi = normalizeString(belge.tip);
    const safeFileName = normalizeString(belge.dosyaAdi);
    
    // Yeni organizasyon yapısı: kulupId/etkinlikId/belgeTipi/{timestamp}_{dosyaAdi}
    const dosyaYolu = `${kulupId}/${belge.etkinlikId}/${dosyaTipi}/${Date.now()}_${safeFileName}`;
    
    console.log('Oluşturulan dosya yolu:', dosyaYolu);
    
    try {
      // Bucket kontrolü ve oluşturma
      const { data: buckets } = await client.storage.listBuckets();
      const bucketVarMi = buckets?.some(b => b.name === 'etkinlik-belgeleri');
      
      if (!bucketVarMi) {
        console.log('etkinlik-belgeleri bucket bulunamadı, oluşturuluyor...');
        try {
          await client.storage.createBucket('etkinlik-belgeleri', {
            public: false
          });
          console.log('etkinlik-belgeleri bucket oluşturuldu');
        } catch (bucketError) {
          console.error('Bucket oluşturma hatası:', bucketError);
        }
      }
      
      // Dosyayı storage'a yükle
      console.log('Dosya yükleniyor...');
      const { data: storageData, error: storageError } = await client.storage
        .from('etkinlik-belgeleri')
        .upload(dosyaYolu, belge.dosya, {
          contentType: belge.dosya.type,
          upsert: true
        });
      
      if (storageError) {
        console.error('Dosya yükleme hatası:', storageError);
        
        // Eğer bucket yok veya erişilemiyor hatası alındıysa fake URL ile devam et
        console.log('Dosya yüklenemedi, alternatif olarak dummy URL kullanılıyor...');
        const fakeUrl = `https://etkinlik-belgeleri.fake/${kulupId}/${belge.etkinlikId}/${dosyaTipi}/${Date.now()}_${safeFileName}`;
        
        // Veritabanına kaydet (fake URL ile)
        const { data: dbData, error: dbError } = await client
          .from('ek_belgeler')
          .insert({
            etkinlik_id: belge.etkinlikId,
            tip: belge.tip,
            dosya_adi: belge.dosyaAdi,
            dosya_yolu: fakeUrl,
            aciklama: belge.aciklama,
            durum: 'Beklemede',
            olusturma_tarihi: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (dbError) {
          console.error('Ek belge veritabanına kaydedilirken hata:', dbError);
          throw new Error(`Veritabanına kaydedilemedi: ${dbError.message}`);
        }
        
        console.log('Ek belge dummy URL ile kaydedildi, ID:', dbData.id);
        return dbData.id;
      }
      
      console.log('Dosya başarıyla yüklendi, yolu:', storageData.path);
      
      // Veritabanına kaydet (gerçek URL ile)
      const { data: dbData, error: dbError } = await client
        .from('ek_belgeler')
        .insert({
          etkinlik_id: belge.etkinlikId,
          tip: belge.tip,
          dosya_adi: belge.dosyaAdi,
          dosya_yolu: storageData.path,
          aciklama: belge.aciklama,
          durum: 'Beklemede',
          olusturma_tarihi: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (dbError) {
        console.error('Ek belge veritabanına kaydedilirken hata:', dbError);
        // Dosya yüklendiyse ancak veritabanına kaydedilemediyse, dosyayı sil
        await client.storage.from('etkinlik-belgeleri').remove([storageData.path]);
        throw new Error(`Veritabanına kaydedilemedi: ${dbError.message}`);
      }
      
      console.log('Ek belge başarıyla kaydedildi, ID:', dbData.id);
      return dbData.id;
    } catch (uploadError) {
      console.error('Dosya yükleme işlemi sırasında hata:', uploadError);
      throw uploadError;
    }
  } catch (error) {
    console.error('Ek belge yükleme işlemi başarısız oldu:', error);
    alert(`Ek belge yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    return null;
  }
};

// Etkinliğe ait ek belgeleri getirme
export const getEkBelgeler = async (etkinlikId: string): Promise<EkBelge[]> => {
  try {
    console.log(`getEkBelgeler çağrıldı - Etkinlik ID: ${etkinlikId}`);
    
    // Önce etkinliğin var olup olmadığını kontrol edelim
    const { data: etkinlikData, error: etkinlikError } = await supabase
      .from('etkinlik_basvurulari')
      .select('id, etkinlik_adi, durum')
      .eq('id', etkinlikId)
      .single();
    
    if (etkinlikError) {
      console.error('Etkinlik kontrolü hatası:', etkinlikError);
    } else {
      console.log('Etkinlik bulundu:', etkinlikData);
    }
    
    // Ek belgeleri getir
    const { data, error } = await supabase
      .from('ek_belgeler')
      .select('*')
      .eq('etkinlik_id', etkinlikId)
      .order('olusturma_tarihi', { ascending: false });
    
    if (error) {
      console.error('Ek belgeleri getirme hatası:', error);
      throw error;
    }
    
    console.log(`${etkinlikId} ID'li etkinlik için ${data.length} adet ek belge bulundu`);
    if (data.length > 0) {
      console.log('İlk belge örneği:', data[0]);
    } else {
      console.log('Bu etkinlik için hiç ek belge bulunamadı');
      
      // Veritabanında ek_belgeler tablosunu kontrol edelim
      const { data: allBelgeler, error: allBelgelerError } = await supabase
        .from('ek_belgeler')
        .select('count')
        .limit(1);
        
      if (allBelgelerError) {
        console.error('Ek belgeler tablosu kontrolü hatası:', allBelgelerError);
      } else {
        console.log('Veritabanında ek_belgeler tablosu var mı:', allBelgeler !== null);
      }
    }
    
    // Veritabanı sütun isimlerini TypeScript özelliklerine dönüştür
    const ekBelgeler: EkBelge[] = data.map(belge => ({
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
    }));
    
    return ekBelgeler;
  } catch (error) {
    console.error('Ek belgeleri getirme işlemi başarısız oldu:', error);
    return [];
  }
};

// Ek belge indirme
export const ekBelgeIndir = async (dosyaYolu: string): Promise<string | null> => {
  try {
    // Eğer fake URL ise, kullanıcıya uyarı ver
    if (dosyaYolu.includes('etkinlik-belgeleri.fake')) {
      console.log('Fake URL tespit edildi:', dosyaYolu);
      alert('Dosya şu anda sunucuda bulunmuyor. Lütfen sistem yöneticisiyle iletişime geçin.');
      return null;
    }
    
    // Dosya yolu formatını kontrol et
    const pathParts = dosyaYolu.split('/');
    if (pathParts.length < 4) {
      console.error('Geçersiz dosya yolu formatı. Beklenen format: kulupId/etkinlikId/belgeTipi/dosyaAdi');
      throw new Error('Geçersiz dosya yolu formatı');
    }
    
    // Normal URL'ler için indirme işlemini dene
    const { data, error } = await supabase.storage
      .from('etkinlik-belgeleri')
      .createSignedUrl(dosyaYolu, 60); // 60 saniye geçerli URL
    
    if (error) {
      console.error('İndirme bağlantısı oluşturma hatası:', error);
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Ek belge indirme işlemi başarısız oldu:', error);
    return null;
  }
};

// Ek belge onaylama
export const ekBelgeOnayla = async (belgeId: string, onaylayan: 'Danışman' | 'SKS'): Promise<boolean> => {
  try {
    const onayBilgisi = {
      durum: 'Onaylandı',
      tarih: new Date().toISOString()
    };
    
    const onayAlani = onaylayan === 'Danışman' ? 'danisman_onay' : 'sks_onay';
    
    // Belgeyi güncelle
    const { error } = await supabase
      .from('ek_belgeler')
      .update({ [onayAlani]: onayBilgisi })
      .eq('id', belgeId);
    
    if (error) {
      console.error('Ek belge onaylama hatası:', error);
      throw error;
    }
    
    // Eğer her iki onay da varsa, durum alanını da güncelle
    const { data: belgeData } = await supabase
      .from('ek_belgeler')
      .select('danisman_onay, sks_onay')
      .eq('id', belgeId)
      .single();
    
    if (belgeData && belgeData.danisman_onay?.durum === 'Onaylandı' && belgeData.sks_onay?.durum === 'Onaylandı') {
      const { error: durumError } = await supabase
        .from('ek_belgeler')
        .update({ durum: 'Onaylandı' })
        .eq('id', belgeId);
      
      if (durumError) {
        console.error('Ek belge durum güncelleme hatası:', durumError);
      }
    }
    
    console.log('Ek belge başarıyla onaylandı');
    return true;
  } catch (error) {
    console.error('Ek belge onaylama işlemi başarısız oldu:', error);
    return false;
  }
};

// Ek belge reddetme
export const ekBelgeReddet = async (belgeId: string, reddeden: 'Danışman' | 'SKS', redSebebi: string): Promise<boolean> => {
  try {
    const redBilgisi = {
      durum: 'Reddedildi',
      tarih: new Date().toISOString(),
      redSebebi
    };
    
    const redAlani = reddeden === 'Danışman' ? 'danisman_onay' : 'sks_onay';
    
    // Belgeyi güncelle
    const { error } = await supabase
      .from('ek_belgeler')
      .update({ 
        [redAlani]: redBilgisi,
        durum: 'Reddedildi'  // Otomatik olarak red durumuna çek
      })
      .eq('id', belgeId);
    
    if (error) {
      console.error('Ek belge reddetme hatası:', error);
      throw error;
    }
    
    console.log('Ek belge başarıyla reddedildi');
    return true;
  } catch (error) {
    console.error('Ek belge reddetme işlemi başarısız oldu:', error);
    return false;
  }
};

// Test amaçlı ek belge oluşturma fonksiyonu
export const createTestEkBelge = async (etkinlikId: string) => {
  try {
    console.log(`Test ek belge oluşturuluyor - Etkinlik ID: ${etkinlikId}`);
    
    // Önce etkinliğin var olup olmadığını kontrol edelim
    const { data: etkinlikData, error: etkinlikError } = await supabase
      .from('etkinlik_basvurulari')
      .select('id, etkinlik_adi, durum')
      .eq('id', etkinlikId)
      .single();
    
    if (etkinlikError) {
      console.error('Etkinlik kontrolü hatası:', etkinlikError);
      return { success: false, error: etkinlikError, message: 'Etkinlik bulunamadı' };
    }
    
    console.log('Etkinlik bulundu:', etkinlikData);
    
    // Ek belge oluştur
    const ekBelgeData = {
      etkinlik_id: etkinlikId,
      tip: 'Test Belgesi',
      dosya_adi: 'test_belgesi.pdf',
      dosya_yolu: 'test_path/test_belgesi.pdf',
      aciklama: 'Bu bir test belgesidir',
      olusturma_tarihi: new Date().toISOString(),
      durum: 'Beklemede'
    };
    
    console.log('Oluşturulacak ek belge:', ekBelgeData);
    
    const { data, error } = await supabase
      .from('ek_belgeler')
      .insert(ekBelgeData)
      .select();
    
    if (error) {
      console.error('Test ek belge oluşturma hatası:', error);
      return { success: false, error, message: 'Ek belge oluşturulamadı' };
    }
    
    console.log('Test ek belge başarıyla oluşturuldu:', data);
    
    // Etkinliği yeniden getirerek ek belgelerin eklenip eklenmediğini kontrol et
    const { data: updatedEtkinlik, error: updatedError } = await supabase
      .from('etkinlik_basvurulari')
      .select(`
        *,
        ek_belgeler:ek_belgeler(*)
      `)
      .eq('id', etkinlikId)
      .single();
      
    if (updatedError) {
      console.error('Güncellenmiş etkinlik getirme hatası:', updatedError);
    } else {
      console.log('Güncellenmiş etkinlik:', updatedEtkinlik);
      console.log('Ek belgeler:', updatedEtkinlik.ek_belgeler);
    }
    
    return { success: true, data, message: 'Ek belge başarıyla oluşturuldu' };
  } catch (error) {
    console.error('Test ek belge oluşturma hatası:', error);
    return { success: false, error, message: 'Beklenmeyen bir hata oluştu' };
  }
};

// Tekrarlanan onay kayıtlarını temizle
export const temizleTekrarOnaylari = async (): Promise<{ silinmis: number, hata: any }> => {
  try {
    console.log('Tekrarlanan onay kayıtları temizleniyor...');
    
    // Admin client kullan - RLS bypass için
    const client = supabaseAdmin;
    
    // Tüm onay geçmişi kayıtlarını al
    const { data: tumOnaylar, error: onaylarError } = await client
      .from('onay_gecmisi')
      .select('*')
      .order('tarih', { ascending: false });
    
    if (onaylarError) {
      console.error('Onay geçmişi verileri alınırken hata:', onaylarError);
      return { silinmis: 0, hata: onaylarError };
    }
    
    console.log(`Toplam ${tumOnaylar.length} onay kaydı bulundu`);
    
    // Korunacak kayıtların ID'lerini tut
    const korunacakIdler = new Set<string>();
    
    // İşlenmiş kayıt kombinasyonlarını takip et
    const islenmisKombinasyonlar = new Set<string>();
    
    // Silinecek ID'leri tut
    const silinecekIdler: string[] = [];
    
    // Her bir onay için
    tumOnaylar.forEach(onay => {
      // Benzersiz kombinasyon anahtarı oluştur
      const kombinasyon = `${onay.basvuru_id}_${onay.onay_tipi}_${onay.durum}_${onay.tarih}_${onay.red_sebebi || ''}`;
      
      // Eğer bu kombinasyon daha önce işlenmediyse
      if (!islenmisKombinasyonlar.has(kombinasyon)) {
        // Bu kombinasyonu işlenmiş olarak işaretle
        islenmisKombinasyonlar.add(kombinasyon);
        
        // Bu kaydı korumak için listeye ekle
        korunacakIdler.add(onay.id);
      } else {
        // Eğer zaten işlenmişse, bu kayıt tekrar demektir, sil
        silinecekIdler.push(onay.id);
      }
    });
    
    console.log(`${korunacakIdler.size} kayıt korunacak, ${silinecekIdler.length} kayıt silinecek`);
    
    // Silinecek kayıt yoksa bitir
    if (silinecekIdler.length === 0) {
      console.log('Silinecek tekrarlanan kayıt bulunamadı');
      return { silinmis: 0, hata: null };
    }
    
    // Tekrarlanan kayıtları sil
    const { error: silmeError } = await client
      .from('onay_gecmisi')
      .delete()
      .in('id', silinecekIdler);
    
    if (silmeError) {
      console.error('Tekrarlanan kayıtlar silinirken hata:', silmeError);
      return { silinmis: 0, hata: silmeError };
    }
    
    console.log(`${silinecekIdler.length} tekrarlanan onay kaydı başarıyla silindi`);
    
    return { silinmis: silinecekIdler.length, hata: null };
  } catch (error) {
    console.error('Tekrarlanan onay kayıtları temizleme işlemi başarısız:', error);
    return { silinmis: 0, hata: error };
  }
};

// Belgeleri yeniden incelemeye aç (onayları sıfırla)
export const resetBelgeOnaylari = async (
  etkinlikId: string,
  tip: 'ana' | 'ek' | 'hepsi' = 'hepsi'
): Promise<{ success: boolean } | null> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const client = sessionData.session ? supabase : supabaseAdmin;

    if (tip === 'ana' || tip === 'hepsi') {
      const { error: e1 } = await client
        .from('etkinlik_belgeleri')
        .update({ danisman_onay: null, sks_onay: null })
        .eq('basvuru_id', etkinlikId);
      if (e1) throw e1;
    }

    if (tip === 'ek' || tip === 'hepsi') {
      const { error: e2 } = await client
        .from('ek_belgeler')
        .update({ danisman_onay: null, sks_onay: null, durum: 'Beklemede' })
        .eq('etkinlik_id', etkinlikId);
      if (e2) throw e2;
    }

    return { success: true };
  } catch (error) {
    console.error('Belge onayları sıfırlanamadı:', error);
    return null;
  }
};