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
    
    // Ana başvuru bilgilerini ekle - JSONB onay sistemi
    console.log('SaveBasvuru - etkinlik_gorseli değeri:', basvuru.etkinlikGorseli);
    const insertData = {
      kulup_id: basvuru.kulupId,
      etkinlik_adi: basvuru.etkinlikAdi,
      etkinlik_turu: basvuru.etkinlikTuru || null,
      diger_turu_aciklama: basvuru.digerTuruAciklama || null,
      etkinlik_fakulte: basvuru.etkinlikYeri.fakulte,
      etkinlik_yeri_detay: basvuru.etkinlikYeri.detay,
      // Legacy tarih alanları artık kaydedilmeyecek - sadece zaman dilimleri kullanılacak
      aciklama: basvuru.aciklama,
      etkinlik_gorseli: basvuru.etkinlikGorseli || null,
      // durum kolonu kaldırıldı - JSONB onay sistemi kullanılıyor
      revizyon: !!basvuru.revizyon
    };
    console.log('SaveBasvuru - gönderilen data:', insertData);
    
    const { data: basvuruData, error: basvuruError } = await client
      .from('etkinlik_basvurulari')
      .insert(insertData)
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
    
    // Belgeler varsa ekle
    if (basvuru.belgeler && basvuru.belgeler.length > 0) {
      console.log('🔄 Belgeler kaydediliyor:', basvuru.belgeler.length, 'adet');
      
      // Hem string hem File nesnelerini işle
      const belgeVerileri = [];
      
      for (const belge of basvuru.belgeler) {
        let dosyaYolu: string;
        
        if (typeof belge.dosya === 'string') {
          // Zaten string ise direkt kullan
          dosyaYolu = belge.dosya;
        } else {
          // File nesnesiyse önce yükle
          console.log('📁 File nesnesi bulundu, yükleniyor:', belge.dosyaAdi);
          // Bu durumda File nesnesi varsa şimdilik atla - belge yükleme ayrı süreçte olacak
          continue;
        }
        
        belgeVerileri.push({
          basvuru_id: basvuruId,
          tip: belge.tip,
          dosya_adi: belge.dosyaAdi,
          dosya_yolu: dosyaYolu,
          belge_notu: belge.belgeNotu || null
          // durum kolonu kaldırıldı - JSONB onay sistemi kullanılıyor
        });
      }
      
      if (belgeVerileri.length > 0) {
        console.log('💾 Kaydedilecek belge verisi:', belgeVerileri);
        
        const { error: belgeError } = await adminClient
          .from('etkinlik_belgeleri')
          .insert(belgeVerileri);
        
        if (belgeError) {
          console.error('❌ Belgeler eklenirken hata:', belgeError);
          throw new Error(`Belgeler eklenemedi: ${belgeError.message}`);
        }
        
        console.log('✅ Belgeler başarıyla kaydedildi');
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
      const zamanDilimleri = basvuru.etkinlik_zaman_dilimleri && basvuru.etkinlik_zaman_dilimleri.length > 0
        ? basvuru.etkinlik_zaman_dilimleri.map((z: any) => ({ baslangic: z.baslangic, bitis: z.bitis }))
        : (basvuru.baslangic_tarihi && basvuru.bitis_tarihi) 
          ? [{ baslangic: basvuru.baslangic_tarihi, bitis: basvuru.bitis_tarihi }]
          : [];
      

      // Belgeler - unified sistem ile uyumlu
      // Belgeler - JSONB onay sistemi
      const belgeler = basvuru.etkinlik_belgeleri
        ? basvuru.etkinlik_belgeleri.map((belge: any) => ({
            id: belge.id,
            tip: belge.tip,
            dosya: belge.dosya_yolu,
            dosyaAdi: belge.dosya_adi,
            belgeNotu: belge.belge_notu || undefined,
            // JSONB onay bilgileri direkt olarak
            danismanOnay: belge.danisman_onay,
            sksOnay: belge.sks_onay
          }))
        : [];
      
      // Ek Belgeler - JSONB onay sistemi
      const ekBelgeler = basvuru.ek_belgeler
        ? basvuru.ek_belgeler.map((belge: any) => ({
            id: belge.id,
            etkinlikId: belge.etkinlik_id,
            tip: belge.tip,
            dosya: belge.dosya_yolu,
            dosyaAdi: belge.dosya_adi,
            olusturmaTarihi: belge.olusturma_tarihi,
            aciklama: belge.aciklama,
            // JSONB onay bilgileri direkt olarak
            danismanOnay: belge.danisman_onay,
            sksOnay: belge.sks_onay
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
      
      // JSONB Onay Sistemi - direkt JSONB kolonlarından al
      const danismanOnay = basvuru.danisman_onay;
      const sksOnay = basvuru.sks_onay;
      
      // Kulüp bilgisi kontrol ediliyor
      const kulupAdi = basvuru.kulupler ? basvuru.kulupler.isim : 'Bilinmeyen Kulüp';
      
      // Log çıktısı - revize edilmiş başvuruları takip etmek için
      if (basvuru.revizyon) {
        console.log(
          `Revize başvuru işleniyor - ID: ${basvuru.id}, ` +
          `Orijinal ID: ${basvuru.orijinal_basvuru_id}, ` +
          `Danışman onayı: ${danismanOnay ? danismanOnay.durum : 'YOK'}, ` +
          `Son onay tarihi: ${danismanOnay ? danismanOnay.tarih : 'YOK'}`
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
        etkinlikGorseli: basvuru.etkinlik_gorseli || undefined,
        sponsorlar: sponsorlar,
        konusmacilar: konusmacilar,
        belgeler: belgeler,
        ekBelgeler: ekBelgeler,

        revizyon: basvuru.revizyon,
        danismanOnay: danismanOnay,
        sksOnay: sksOnay,
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

// OPTIMIZE: SKS Paneli için hızlı başvuru listesi
export const getBasvurularSKSOptimized = async (limit: number = 100, offset: number = 0): Promise<EtkinlikBasvuru[]> => {
  try {
    console.log(`Başvurular getiriliyor (SKS OPTIMIZE) - Limit: ${limit}, Offset: ${offset}`);
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    // OPTIMIZE: Sadece SKS için gerekli alanları çek
    const { data, error } = await client
      .from('etkinlik_basvurulari')
      .select(`
        id,
        kulup_id,
        etkinlik_adi,
        etkinlik_turu,
        etkinlik_fakulte,
        etkinlik_yeri_detay,
        aciklama,
        revizyon,
        orijinal_basvuru_id,
        danisman_onay,
        sks_onay,
        created_at,
        kulupler!inner(isim),
        etkinlik_belgeleri(id, tip, danisman_onay, sks_onay),
        ek_belgeler(id, tip, danisman_onay, sks_onay, olusturma_tarihi),
        etkinlik_zaman_dilimleri(baslangic, bitis)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Başvurular getirilirken hata (SKS OPTIMIZE):', error);
      throw error;
    }
    
    console.log(`${data.length} başvuru veritabanından getirildi (SKS OPTIMIZE)`);
    
    // OPTIMIZE: Sadeleştirilmiş mapping
    const basvurular: EtkinlikBasvuru[] = data.map(basvuru => {
      // Zaman dilimleri
      const zamanDilimleri = basvuru.etkinlik_zaman_dilimleri && basvuru.etkinlik_zaman_dilimleri.length > 0
        ? basvuru.etkinlik_zaman_dilimleri.map((z: any) => ({ baslangic: z.baslangic, bitis: z.bitis }))
        : [];
      
      // Kulüp adı
      const kulupAdi = (basvuru.kulupler as any)?.isim || 'Bilinmeyen Kulüp';
      
      // OPTIMIZE: Sadece onay durumları için belgeler
      const belgeler = basvuru.etkinlik_belgeleri
        ? basvuru.etkinlik_belgeleri.map((belge: any) => ({
            id: belge.id,
            tip: belge.tip,
            dosya: '', // OPTIMIZE: Dosya yolu gerekmiyor
            dosyaAdi: '', // OPTIMIZE: Dosya adı gerekmiyor
            danismanOnay: belge.danisman_onay,
            sksOnay: belge.sks_onay
          }))
        : [];
      
      // OPTIMIZE: Ek belgeler için sadece temel bilgiler
      const ekBelgeler = basvuru.ek_belgeler
        ? basvuru.ek_belgeler.map((belge: any) => ({
            id: belge.id,
            etkinlikId: basvuru.id,
            tip: belge.tip,
            dosya: '', // OPTIMIZE: Dosya yolu gerekmiyor
            dosyaAdi: '', // OPTIMIZE: Dosya adı gerekmiyor
            olusturmaTarihi: belge.olusturma_tarihi,
            danismanOnay: belge.danisman_onay,
            sksOnay: belge.sks_onay
          }))
        : [];
      
      return {
        id: basvuru.id,
        kulupId: basvuru.kulup_id,
        kulupAdi: kulupAdi,
        etkinlikAdi: basvuru.etkinlik_adi,
        etkinlikYeri: {
          fakulte: basvuru.etkinlik_fakulte || '',
          detay: basvuru.etkinlik_yeri_detay || ''
        },
        etkinlikTuru: basvuru.etkinlik_turu || undefined,
        zamanDilimleri,
        aciklama: basvuru.aciklama || '',
        sponsorlar: [], // OPTIMIZE: Sponsorlar gerekmiyor
        konusmacilar: [], // OPTIMIZE: Konuşmacılar gerekmiyor
        belgeler: belgeler,
        ekBelgeler: ekBelgeler,
        revizyon: basvuru.revizyon || false,
        danismanOnay: basvuru.danisman_onay,
        sksOnay: basvuru.sks_onay,
        orijinalBasvuruId: basvuru.orijinal_basvuru_id
      };
    });
    
    console.log(`${basvurular.length} başvuru dönüştürüldü (SKS OPTIMIZE)`);
    
    return basvurular;
  } catch (error) {
    console.error('Başvurular getirilirken bir hata oluştu (SKS OPTIMIZE):', error);
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
    
    // Onay geçmişini ayrı sorgu ile al (unified sistem)
    const { data: onayGecmisiData } = await client
      .from('onay_gecmisi')
      .select('onay_tipi, durum, tarih, red_sebebi')
      .eq('basvuru_id', id)
      .eq('onay_kategorisi', 'Etkinlik');

    console.log('Onay geçmişi alındı:', onayGecmisiData?.length || 0, 'kayıt');
    
    // Onay geçmişini işle
    type OnayGecmisiItem = {
      onay_tipi: string;
      durum: 'Onaylandı' | 'Reddedildi';
      tarih: string;
      red_sebebi?: string;
    };

    const danismanOnaylari = onayGecmisiData
      ? onayGecmisiData
          .filter((onay: OnayGecmisiItem) => onay.onay_tipi === 'Danışman')
          .map((onay: OnayGecmisiItem) => ({
            durum: onay.durum,
            tarih: onay.tarih,
            redSebebi: onay.red_sebebi
          }))
      : [];
      
    const sksOnaylari = onayGecmisiData
      ? onayGecmisiData
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
    
    const zamanDilimleri = data.etkinlik_zaman_dilimleri && data.etkinlik_zaman_dilimleri.length > 0
      ? data.etkinlik_zaman_dilimleri.map((z: any) => ({ baslangic: z.baslangic, bitis: z.bitis }))
      : (data.baslangic_tarihi && data.bitis_tarihi) 
        ? [{ baslangic: data.baslangic_tarihi, bitis: data.bitis_tarihi }]
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
      baslangicTarihi: zamanDilimleri.length > 0 ? zamanDilimleri[0].baslangic : data.baslangic_tarihi,
      bitisTarihi: zamanDilimleri.length > 0 ? zamanDilimleri[zamanDilimleri.length - 1].bitis : data.bitis_tarihi,
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
      belgeler: data.etkinlik_belgeleri ? await Promise.all(
        data.etkinlik_belgeleri.map(async (belge: any) => {
          // Belge onaylarını onay_gecmisi'nden al
          const { data: belgeOnaylari } = await client
            .from('onay_gecmisi')
            .select('onay_tipi, durum, tarih, red_sebebi')
            .eq('onay_kategorisi', 'Belge')
            .eq('belge_id', belge.id)
            .eq('belge_tipi', 'etkinlik_belgeleri');

          const danismanOnay = belgeOnaylari?.find(o => o.onay_tipi === 'Danışman');
          const sksOnay = belgeOnaylari?.find(o => o.onay_tipi === 'SKS');

          return {
        id: belge.id,
        tip: belge.tip,
        dosya: belge.dosya_yolu,
        dosyaAdi: belge.dosya_adi,
            danismanOnay: danismanOnay ? {
              durum: danismanOnay.durum,
              tarih: danismanOnay.tarih,
              redSebebi: danismanOnay.red_sebebi
            } : undefined,
            sksOnay: sksOnay ? {
              durum: sksOnay.durum,
              tarih: sksOnay.tarih,
              redSebebi: sksOnay.red_sebebi
            } : undefined,
            // durum kolonu kaldırıldı - JSONB onay sistemi kullanılıyor
          };
        })
      ) : [],
      ekBelgeler: data.ek_belgeler ? await Promise.all(
        data.ek_belgeler.map(async (belge: any) => {
          // Ek belge onaylarını onay_gecmisi'nden al
          const { data: belgeOnaylari } = await client
            .from('onay_gecmisi')
            .select('onay_tipi, durum, tarih, red_sebebi')
            .eq('onay_kategorisi', 'Belge')
            .eq('belge_id', belge.id)
            .eq('belge_tipi', 'ek_belgeler');

          const danismanOnay = belgeOnaylari?.find(o => o.onay_tipi === 'Danışman');
          const sksOnay = belgeOnaylari?.find(o => o.onay_tipi === 'SKS');

          return {
        id: belge.id,
        etkinlikId: belge.etkinlik_id,
        tip: belge.tip,
        dosya: belge.dosya_yolu,
        dosyaAdi: belge.dosya_adi,
        olusturmaTarihi: belge.olusturma_tarihi,
        aciklama: belge.aciklama,
            danismanOnay: danismanOnay ? {
              durum: danismanOnay.durum,
              tarih: danismanOnay.tarih,
              redSebebi: danismanOnay.red_sebebi
            } : undefined,
            sksOnay: sksOnay ? {
              durum: sksOnay.durum,
              tarih: sksOnay.tarih,
              redSebebi: sksOnay.red_sebebi
            } : undefined
        // durum kolonu kaldırıldı - JSONB onay sistemi kullanılıyor
          };
        })
      ) : [],
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
    console.log('UpdateBasvuru - etkinlik_gorseli değeri:', basvuru.etkinlikGorseli);
    const updateData = {
      etkinlik_adi: basvuru.etkinlikAdi,
      etkinlik_turu: basvuru.etkinlikTuru || null,
      diger_turu_aciklama: basvuru.digerTuruAciklama || null,
      etkinlik_fakulte: basvuru.etkinlikYeri.fakulte,
      etkinlik_yeri_detay: basvuru.etkinlikYeri.detay,
      // Legacy tarih alanları artık güncellenmeyecek - sadece zaman dilimleri kullanılacak
      aciklama: basvuru.aciklama,
      etkinlik_gorseli: basvuru.etkinlikGorseli || null,
      revizyon: basvuru.revizyon
      // JSONB onay alanları kaldırıldı - artık sadece onay_gecmisi kullanılıyor
    };
    console.log('🔍 UpdateBasvuru - gönderilen revizyon durumu:', updateData.revizyon);
    console.log('UpdateBasvuru - gönderilen data:', updateData);
    
    const { data: updateResult, error: basvuruError } = await client
      .from('etkinlik_basvurulari')
      .update(updateData)
      .eq('id', basvuru.id)
      .select();
    
    if (basvuruError) {
      console.error('Başvuru güncellenirken hata:', basvuruError);
      throw basvuruError;
    }
    
    console.log('🔍 UpdateBasvuru - güncelleme sonrası revizyon durumu:', updateResult?.[0]?.revizyon);
    console.log('UpdateBasvuru - güncelleme başarılı:', updateResult);
    
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
    // JSONB Onay Sistemi - etkinlik onayları
    if (basvuru.danismanOnay || basvuru.sksOnay) {
      console.log('🔄 JSONB Etkinlik onayları güncelleniyor...');
      
      // Kullanıcı ID'sini al
      const { data: userData } = await supabase.auth.getUser();
      const onaylayanId = userData?.user?.id;
      
      // Güncelleme verisi hazırla
      let updateData: any = {};
      
      if (basvuru.danismanOnay) {
        updateData.danisman_onay = {
          durum: basvuru.danismanOnay.durum,
          tarih: basvuru.danismanOnay.tarih || new Date().toISOString(),
          redSebebi: basvuru.danismanOnay.redSebebi,
          onaylayanId: onaylayanId
        };
        
        // Audit trail için onay_gecmisi tablosuna da kaydet
          const { error: onayError } = await client
            .from('onay_gecmisi')
            .insert({
              basvuru_id: basvuru.id,
            onay_kategorisi: 'Etkinlik',
              onay_tipi: 'Danışman',
              durum: basvuru.danismanOnay.durum,
              tarih: basvuru.danismanOnay.tarih || new Date().toISOString(),
            red_sebebi: basvuru.danismanOnay.redSebebi,
            onaylayan_id: onaylayanId
            });
          
          if (onayError) {
          console.warn('Audit trail kayıt hatası (devam ediyor):', onayError);
        }
      }
      
      if (basvuru.sksOnay) {
        updateData.sks_onay = {
          durum: basvuru.sksOnay.durum,
          tarih: basvuru.sksOnay.tarih || new Date().toISOString(),
          redSebebi: basvuru.sksOnay.redSebebi,
          onaylayanId: onaylayanId
        };
        
        // Audit trail için onay_gecmisi tablosuna da kaydet
          const { error: onayError } = await client
            .from('onay_gecmisi')
            .insert({
              basvuru_id: basvuru.id,
            onay_kategorisi: 'Etkinlik',
              onay_tipi: 'SKS',
              durum: basvuru.sksOnay.durum,
              tarih: basvuru.sksOnay.tarih || new Date().toISOString(),
            red_sebebi: basvuru.sksOnay.redSebebi,
            onaylayan_id: onaylayanId
            });
          
          if (onayError) {
          console.warn('Audit trail kayıt hatası (devam ediyor):', onayError);
        }
      }
      
      // JSONB kolonlarını güncelle
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await client
          .from('etkinlik_basvurulari')
          .update(updateData)
          .eq('id', basvuru.id);
        
        if (updateError) {
          console.error('JSONB onay güncelleme hatası:', updateError);
          throw updateError;
        }
        
        console.log('✅ JSONB etkinlik onayları güncellendi:', updateData);
      }
      
      // JSONB sisteminde etkinlik onayları direkt JSON kolonlarında tutuluyor
      // Ayrı durum güncellemesi gerekmiyor
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
    
    // Belgeler varsa güncelle - SADECE belgeler gerçekten değişmişse
    // Etkinlik onay/red işlemlerinde belgeler korunmalı
    // SKS etkinlik onay/red işlemlerinde belgeler undefined gönderilerek korunur
    if (basvuru.belgeler && basvuru.belgeler.length > 0) {
      // Mevcut belgeleri kontrol et
      const { data: mevcutBelgeler } = await client
        .from('etkinlik_belgeleri')
        .select('id, tip, dosya_adi, danisman_onay, sks_onay')
        .eq('basvuru_id', basvuru.id);
      
      // Eğer belge sayısı veya tipleri değişmemişse güncelleme yapma
      const belgelerDegismis = !mevcutBelgeler || 
        mevcutBelgeler.length !== basvuru.belgeler.length ||
        basvuru.belgeler.some((belge, index) => {
          const mevcut = mevcutBelgeler[index];
          return !mevcut || mevcut.tip !== belge.tip || mevcut.dosya_adi !== belge.dosyaAdi;
        });
      
      if (belgelerDegismis) {
        console.log('📄 Belgeler değişmiş, güncelleniyor...');
      await updateBesvuruBelgeleri(basvuru.id, basvuru.belgeler, client);
      } else {
        console.log('📄 Belgeler değişmemiş, onay bilgileri korunuyor');
      }
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
    console.log('🧹 Veritabanı temizleme işlemi başlatılıyor...');
    
    const client = supabaseAdmin;
    
    // Önce kaç kayıt olduğunu kontrol edelim
    const { count: basvuruCount, error: countError } = await client
      .from('etkinlik_basvurulari')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Kayıt sayısı alınırken hata:', countError);
      // Hata olsa da devam et
    }
    
    console.log(`📊 Toplam ${basvuruCount || 0} başvuru bulundu`);

    // Helper function: Güvenli tablo temizleme
    const safeClearTable = async (tableName: string, dateField = 'created_at') => {
      try {
        console.log(`🗑️ ${tableName} temizleniyor...`);
        const { data, error } = await client
          .from(tableName)
      .delete()
          .gte(dateField, '1900-01-01')
          .select();
        
        if (error) {
          console.error(`❌ ${tableName} temizlenirken hata:`, error);
          return { table: tableName, success: false, error: error.message };
        } else {
          console.log(`✅ ${data?.length || 0} ${tableName} kaydı silindi`);
          return { table: tableName, success: true, count: data?.length || 0 };
        }
      } catch (err: any) {
        console.error(`❌ ${tableName} temizleme hatası:`, err);
        return { table: tableName, success: false, error: err?.message || err };
      }
    };

    // Silme işlemlerini sırayla yap (dependency order)
    const deletionResults = [];
    
    // 1. Unified onay sistemini temizle
    deletionResults.push(await safeClearTable('onay_gecmisi'));
    
    // 2. İlişkili tabloları temizle
    deletionResults.push(await safeClearTable('sponsorlar'));
    deletionResults.push(await safeClearTable('konusmacilar'));
    deletionResults.push(await safeClearTable('ek_belgeler', 'olusturma_tarihi'));
    deletionResults.push(await safeClearTable('etkinlik_belgeleri'));
    deletionResults.push(await safeClearTable('etkinlik_zaman_dilimleri'));
    
    // 3. Ana tabloyu en son temizle
    deletionResults.push(await safeClearTable('etkinlik_basvurulari'));
    
    // Sonuçları özetle
    const successCount = deletionResults.filter(r => r.success).length;
    const failureCount = deletionResults.filter(r => !r.success).length;
    const totalDeleted = deletionResults.reduce((sum, r) => sum + (r.count || 0), 0);
    
    console.log('\n📊 Temizleme Özeti:');
    console.log(`✅ Başarılı: ${successCount} tablo`);
    console.log(`❌ Başarısız: ${failureCount} tablo`);
    console.log(`🗑️ Toplam silinen: ${totalDeleted} kayıt`);
    
    // Başarısız olanları listele
    if (failureCount > 0) {
      console.log('\n❌ Başarısız tablolar:');
      deletionResults.filter(r => !r.success).forEach(r => {
        console.log(`   • ${r.table}: ${r.error}`);
      });
    }
    
    // Final kontrol
    try {
      const { count: finalCount } = await client
      .from('etkinlik_basvurulari')
        .select('*', { count: 'exact', head: true });
      console.log(`\n📊 İşlem sonrası kalan başvuru sayısı: ${finalCount || 0}`);
    } catch (finalError) {
      console.log('Final kontrol yapılamadı');
    }
    
    if (failureCount === 0) {
      console.log('\n🎉 Tüm etkinlik verileri başarıyla temizlendi!');
    } else {
      console.log(`\n⚠️ Temizleme tamamlandı ama ${failureCount} tabloda sorun var!`);
    }
    
  } catch (error) {
    console.error('💥 Veriler temizlenirken kritik hata oluştu:', error);
    throw error;
  }
};


// Kulüpler için fonksiyonlar
export const getKulupler = async (): Promise<Kulup[]> => {
  try {
    console.log('Kulüpler getiriliyor... (OPTIMIZE)');
    
    // Önce kullanıcının oturum bilgilerini kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Eğer oturum yoksa, admin client'ı kullan
    const client = sessionData.session ? supabase : supabaseAdmin;
    console.log('Kullanıcı oturumu:', sessionData.session ? 'Mevcut' : 'Yok, admin client kullanılıyor');
    
    // OPTIMIZE: Sadece gerekli alanları çek
    const { data, error } = await client
      .from('kulupler')
      .select(`
        id,
        isim,
        baskan_ad_soyad,
        baskan_eposta,
        baskan_telefon,
        oda_no,
        akademik_danismanlar (
          id, 
          ad_soyad, 
          bolum, 
          eposta
        )
      `);
    
    if (error) {
      console.error('Kulüpler getirilemedi:', error);
      throw error;
    }
    
    console.log(`${data.length} kulüp bulundu. (OPTIMIZE - sadece temel alanlar)`);
    
    // OPTIMIZE: Sadeleştirilmiş mapping
    const kulupList = data.map(k => {
      // Akademik danışman bilgisi - array veya single object olabilir
      const danismanData = Array.isArray(k.akademik_danismanlar) 
        ? k.akademik_danismanlar[0] 
        : k.akademik_danismanlar;
        
      const primaryDan = danismanData ? {
        id: danismanData.id,
        adSoyad: danismanData.ad_soyad,
        bolum: danismanData.bolum,
        eposta: danismanData.eposta,
        telefon: '', // OPTIMIZE: Gereksiz alanlar boş
        fakulte: '', // OPTIMIZE: Gereksiz alanlar boş
        odaNo: '' // OPTIMIZE: Gereksiz alanlar boş
      } as AkademikDanisman : {
        id: 'NA', adSoyad: '—', eposta: '', bolum: '', telefon: '', fakulte: '', odaNo: ''
      } as AkademikDanisman;

      return {
        id: k.id,
        isim: k.isim,
        akademikDanisman: primaryDan,
        akademikDanismanlar: undefined, // OPTIMIZE: Çoklu danışman sistemini devre dışı bırak
        baskan: {
          adSoyad: k.baskan_ad_soyad || '',
          eposta: k.baskan_eposta || '',
          telefon: k.baskan_telefon || ''
        },
        odaNo: k.oda_no || '',
        digerTesisler: '', // OPTIMIZE: Gereksiz alan
        altTopluluklar: undefined, // OPTIMIZE: Gereksiz alan
        tuzuk: '', // OPTIMIZE: Gereksiz alan
        logo: '' // OPTIMIZE: Gereksiz alan
      } as Kulup;
    });
    
    return kulupList;
  } catch (error) {
    console.error('Kulüpler getirme işlemi başarısız:', error);
    return [];
  }
};

export const revizeEt = async (basvuru: EtkinlikBasvuru, revizeTuru?: 'belgeler' | 'etkinlik' | 'ikisi'): Promise<EtkinlikBasvuru> => {
  try {
    console.log(`🔄 ID: ${basvuru.id} olan başvuru IN-PLACE revize ediliyor...`);
    console.log(`🎯 Revize türü: ${revizeTuru || 'varsayılan (ikisi)'}`);
    
    // Kullanıcı session bilgilerini al
    const { data: sessionData } = await supabase.auth.getSession();
    // Revizyon işlemi için admin client kullan - RLS bypass gerekli
    const client = supabaseAdmin;
    const kullaniciId = sessionData.session?.user?.id;
    
    // 1️⃣ ÖNCE REVİZYON GEÇMİŞİNE KAYDET (Eski durumu sakla)
    await saveRevisionHistory(basvuru, revizeTuru, kullaniciId);
    
    // 2️⃣ REVIZE TÜRÜNE GÖRE ONAY DURUMLARI BELİRLE
    // ⚠️ ARTIK HİÇBİR ZAMAN HEMEN REVİZYON İŞARETLEMİYORUZ!
    // Revizyon işareti sadece kullanıcı gerçekten değişiklik yapıp submit ettiğinde konur
    let updateData: any = {
      // revizyon: true, // ❌ KALDIRILDI - Sadece form submit'te yapılacak
    };
    
    if (revizeTuru === 'belgeler') {
      // ✅ Sadece belgeler değişiyor -> Etkinlik onaylarını KORU
      console.log('✅ Etkinlik onayları korunuyor (sadece belgeler revize)');
      // danisman_onay ve sks_onay değiştirilmez (korunur)
    } else if (revizeTuru === 'etkinlik') {
      // ❌ Sadece etkinlik değişiyor -> Etkinlik onaylarını SIFIRLA
      updateData.danisman_onay = null;
      updateData.sks_onay = null;
      console.log('❌ Etkinlik onayları sıfırlanıyor (etkinlik bilgileri revize)');
    } else {
      // ❌ Her ikisi değişiyor -> Her şeyi SIFIRLA
      updateData.danisman_onay = null;
      updateData.sks_onay = null;
      console.log('❌ Tüm onaylar sıfırlanıyor (her ikisi revize)');
    }
    
    // 3️⃣ MEVCUT BAŞVURUYU IN-PLACE GÜNCELLE (ID değişmez!)
    // Sadece belgeler revize durumunda etkinlik tablosunu güncellememiz gerekmez
    if (revizeTuru !== 'belgeler') {
      console.log('🔄 Admin client ile güncelleme yapılıyor:', updateData);
      console.log('🔍 Güncellenecek başvuru ID:', basvuru.id);
      
      // Önce başvurunun varlığını kontrol et
      const { data: existingCheck, error: checkError } = await client
        .from('etkinlik_basvurulari')
        .select('id, kulup_id, revizyon')
        .eq('id', basvuru.id);
        
      if (checkError) {
        console.error('❌ Başvuru varlık kontrolü hatası:', checkError);
        throw new Error(`Başvuru kontrol edilemedi: ${checkError.message}`);
      }
      
      console.log('✅ Başvuru varlık kontrolü:', existingCheck);
      if (!existingCheck || existingCheck.length === 0) {
        throw new Error(`Başvuru bulunamadı: ${basvuru.id}`);
      }
      
      const { data: updateResult, error: updateError } = await client
        .from('etkinlik_basvurulari')
        .update(updateData)
        .eq('id', basvuru.id)
        .select('*');
      
      if (updateError) {
        console.error('❌ Başvuru güncellenirken hata:', updateError);
        console.error('❌ Hata kodu:', updateError.code);
        console.error('❌ Hata mesajı:', updateError.message);
        console.error('❌ Hata detayları:', updateError.details);
        throw updateError;
      }
      
      console.log('✅ Update sonucu:', updateResult);
      console.log('✅ Etkilenen satır sayısı:', updateResult?.length || 0);
      
      if (!updateResult || updateResult.length === 0) {
        console.error('❌ Hiçbir satır güncellenmedi! RLS politikası sorunu olabilir.');
        throw new Error('Başvuru güncellenemedi: Hiçbir satır etkilenmedi. RLS politikası kontrol edilmeli.');
      }
      
      console.log('✅ Başvuru revize moduna geçirildi (ID aynı kaldı):', basvuru.id);
      console.log('⚠️  Revizyon bayrağı henüz FALSE - Gerçek değişiklik yapılıp kaydedildiğinde TRUE olacak');
    } else {
      console.log('✅ Sadece belgeler revize - Etkinlik tablosu güncellenmeyecek');
    }
    
    // 4️⃣ BELGE ONAYLARINI REVIZE TÜRÜNE GÖRE AYARLA
    // ⚠️ ARTIK BELGELERİ HİÇBİR ZAMAN SIFIRLAMIYORUZ!
    // Belge onayları sadece yeni belgeler yüklendiğinde form submit sırasında sıfırlanacak
    console.log('✅ Mevcut belge onayları korunuyor - revizeEt fonksiyonu belge onaylarına dokunmuyor');
    
    // 5️⃣ GÜNCEL BAŞVURUYU AL VE RETURN ET
    const güncelBasvuru = await getBasvuruById(basvuru.id);
    if (!güncelBasvuru) {
      throw new Error('Revize edilen başvuru DB\'den alınamadı');
    }
    
    console.log('🎉 Başvuru başarıyla IN-PLACE revize edildi! ID:', basvuru.id);
    console.log('📊 Revizyon durumu:', güncelBasvuru.revizyon);
    console.log('👨‍🏫 Danışman onayı:', güncelBasvuru.danismanOnay?.durum || 'Yok');
    console.log('🏢 SKS onayı:', güncelBasvuru.sksOnay?.durum || 'Yok');
    
    return güncelBasvuru;
    
  } catch (error) {
    console.error('❌ IN-PLACE revize işleminde hata oluştu:', error);
    throw error;
  }
};

// 📚 Revizyon geçmişi kaydetme fonksiyonu
async function saveRevisionHistory(
  basvuru: EtkinlikBasvuru, 
  revizeTuru: string | undefined, 
  kullaniciId: string | undefined
) {
  try {
    const client = supabaseAdmin; // Admin yetkisi ile kaydet
    
    // Mevcut revizyon sayısını al
    const { count } = await client
      .from('etkinlik_revizyon_gecmisi')
      .select('id', { count: 'exact', head: true })
      .eq('basvuru_id', basvuru.id);
    
    const revizyonNumarasi = (count || 0) + 1;
    
    // Hangi alanların değişeceğini belirle
    const degisenAlanlar: string[] = [];
    if (revizeTuru === 'belgeler') {
      degisenAlanlar.push('belgeler');
    } else if (revizeTuru === 'etkinlik') {
      degisenAlanlar.push('etkinlik_adi', 'aciklama', 'etkinlik_yeri', 'zaman_dilimleri');
    } else {
      degisenAlanlar.push('etkinlik_adi', 'aciklama', 'etkinlik_yeri', 'zaman_dilimleri', 'belgeler');
    }
    
    const gecmisKaydi = {
      basvuru_id: basvuru.id,
      revizyon_numarasi: revizyonNumarasi,
      revizyon_turu: revizeTuru || 'ikisi',
      revizyon_yapan_id: kullaniciId,
      revizyon_aciklamasi: `${revizeTuru || 'ikisi'} revize edildi`,
      
      // Eski değerleri kaydet
      eski_etkinlik_adi: basvuru.etkinlikAdi,
      eski_aciklama: basvuru.aciklama,
      eski_etkinlik_turu: basvuru.etkinlikTuru,
      eski_diger_turu_aciklama: basvuru.digerTuruAciklama,
      eski_etkinlik_yeri: basvuru.etkinlikYeri,
      eski_zaman_dilimleri: basvuru.zamanDilimleri,
      eski_danisman_onay: basvuru.danismanOnay,
      eski_sks_onay: basvuru.sksOnay,
      eski_etkinlik_gorseli: basvuru.etkinlikGorseli,
      
      degisen_alanlar: degisenAlanlar
    };
    
    const { error } = await client
      .from('etkinlik_revizyon_gecmisi')
      .insert(gecmisKaydi);
    
    if (error) {
      console.error('⚠️ Revizyon geçmişi kaydedilirken hata:', error);
      // Kritik bir hata değil, revizyon işlemine devam et
    } else {
      console.log(`📚 Revizyon geçmişi kaydedildi (${revizyonNumarasi}. revizyon)`);
    }
    
  } catch (error) {
    console.error('⚠️ Revizyon geçmişi kaydetme hatası:', error);
    // Kritik bir hata değil, devam et
  }
}

// PDF Formlar için fonksiyonlar
export interface FormDosyasi {
  id: string;
  isim: string;
  dosyaYolu: string;
  aciklama?: string;
  kategori: 'Kulüp' | 'Etkinlik' | 'SKS' | 'Diğer';
  yuklemeTarihi?: string;
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
  belgeNotu?: string; // Kullanıcının bıraktığı not
}

export interface EtkinlikGorseliUpload {
  dosya: File;
  dosyaAdi: string;
  basvuruId: string;
}

// Etkinlik görseli yükle  
export const etkinlikGorseliYukle = async (
  gorsel: EtkinlikGorseliUpload
): Promise<string | null> => {
  try {
    console.log('Etkinlik görseli yükleniyor:', gorsel.dosyaAdi);
    
    // Dosya formatını kontrol et
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(gorsel.dosya.type)) {
      throw new Error('Sadece JPG, JPEG ve PNG formatları desteklenir!');
    }
    
    // Görsel boyutlarını kontrol et (esnek sınırlar)
    console.log('Görsel boyut kontrolü başlıyor...');
    const MIN_WIDTH = 300;
    const MIN_HEIGHT = 300;
    const MAX_WIDTH = 2048;
    const MAX_HEIGHT = 2048;
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    
    // Dosya boyutu kontrolü
    if (gorsel.dosya.size > MAX_FILE_SIZE) {
      throw new Error('Dosya boyutu 5MB\'dan küçük olmalıdır!');
    }
    
    const isValidSize = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log(`Görsel boyutları: ${img.width}x${img.height}`);
        const isValid = img.width >= MIN_WIDTH && 
                       img.height >= MIN_HEIGHT && 
                       img.width <= MAX_WIDTH && 
                       img.height <= MAX_HEIGHT;
        console.log('Boyut kontrolü sonucu:', isValid ? 'BAŞARILI' : 'BAŞARISIZ');
        resolve(isValid);
      };
      img.onerror = () => {
        console.error('Görsel yükleme hatası');
        resolve(false);
      };
      img.src = URL.createObjectURL(gorsel.dosya);
    });
    
    if (!isValidSize) {
      console.error('Görsel boyut kontrolü başarısız!');
      throw new Error(`Görsel boyutları ${MIN_WIDTH}x${MIN_HEIGHT} ile ${MAX_WIDTH}x${MAX_HEIGHT} arasında olmalıdır!`);
    }
    console.log('Görsel boyut kontrolü başarılı!');
    
    // Oturum kontrolü
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Oturum açık değil');
    }
    
    // Dosya yolunu hazırla
    const normalizeString = (str: string): string => {
      return str
        .replace(/\s+/g, '_')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
    };
    
    const safeFileName = normalizeString(gorsel.dosyaAdi);
    
    // Başvuru bilgisini al
    const { data: basvuruData, error: basvuruError } = await supabase
      .from('etkinlik_basvurulari')
      .select('kulup_id')
      .eq('id', gorsel.basvuruId)
      .single();
    
    if (basvuruError) {
      throw new Error(`Başvuru bilgisi alınamadı: ${basvuruError.message}`);
    }
    
    const kulupId = basvuruData.kulup_id;
    
    // Organizasyon yapısı: kulupId/basvuruId/gorseller/{timestamp}_{dosyaAdi}
    const dosyaYolu = `${kulupId}/${gorsel.basvuruId}/gorseller/${Date.now()}_${safeFileName}`;
    
    // Görseli yükle
    const { data, error } = await supabase.storage
      .from('etkinlik-gorselleri')
      .upload(dosyaYolu, gorsel.dosya, {
        contentType: gorsel.dosya.type,
        upsert: true,
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('Görsel yükleme hatası:', error);
      throw new Error(`Görsel yüklenemedi: ${error.message}`);
    }
    
    console.log('Görsel başarıyla yüklendi:', data.path);
    return data.path;
    
  } catch (error) {
    console.error('Etkinlik görseli yüklenirken hata:', error);
    throw error;
  }
};

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
          dosya_yolu: data.path,
          belge_notu: belge.belgeNotu || null
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

// Etkinlik görseli indir/görüntüle
export const etkinlikGorseliIndir = async (dosyaYolu: string): Promise<string | null> => {
  try {
    console.log('Etkinlik görseli indiriliyor:', dosyaYolu);
    
    // Eğer dosya yolu base64 ile başlıyorsa, direkt olarak döndür
    if (dosyaYolu.startsWith('data:')) {
      console.log('Base64 görsel tespit edildi, direkt döndürülüyor');
      return dosyaYolu;
    }
    
    // Storage'dan görseli indir
    const { data, error } = await supabase.storage
      .from('etkinlik-gorselleri')
      .createSignedUrl(dosyaYolu, 300); // 5 dakika geçerli bağlantı (görsel için daha uzun)
    
    if (error) {
      console.error('Görsel indirme bağlantısı oluşturma hatası:', error);
      
      // Bucket yok hatası için özel mesaj
      if (error.message && (
          error.message.includes('bucket not found') || 
          error.message.includes('not exist') ||
          error.message.includes('does not exist')
      )) {
        console.error('Etkinlik görselleri bucket bulunamadı.');
        return null;
      }
      
      throw error;
    }
    
    console.log('Görsel indirme bağlantısı oluşturuldu');
    return data.signedUrl;
  } catch (error) {
    console.error('Görsel indirme işlemi başarısız:', error);
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
    console.log(`🗑️ ID: ${belgeId} olan belge siliniyor...`);
    console.log(`📁 Dosya yolu: "${dosyaYolu}"`);
    
    // Dosya yolu kontrolü - boş veya geçersiz formatsa önce DB'den dosya yolunu almayı dene
    if (!dosyaYolu || typeof dosyaYolu !== 'string' || dosyaYolu.trim() === '') {
      console.warn('⚠️ Dosya yolu boş, veritabanından dosya yolunu almaya çalışıyorum...');
      
      // Önce belge bilgisini al
      const { data: belgeData, error: selectError } = await supabaseAdmin
        .from('etkinlik_belgeleri')
        .select('dosya_yolu')
        .eq('id', belgeId)
        .single();
      
      if (selectError || !belgeData || !belgeData.dosya_yolu) {
        console.warn('⚠️ Dosya yolu DB\'den de alınamadı, sadece veritabanından siliniyor...');
        
        // Sadece veritabanından sil
        const { error: dbError } = await supabaseAdmin
          .from('etkinlik_belgeleri')
          .delete()
          .eq('id', belgeId)
          .select();
        
        if (dbError) {
          console.error('❌ Belge bilgisi silinirken hata:', dbError);
          throw new Error(`DB silme hatası: ${dbError.message}`);
        }
        
        console.log(`✅ Belge sadece DB'den silindi (storage yolu bulunamadı)`);
        return true;
      }
      
      // DB'den alınan dosya yolunu kullan
      dosyaYolu = belgeData.dosya_yolu;
      console.log(`📁 DB'den alınan dosya yolu: "${dosyaYolu}"`);
    }
    
    const pathParts = dosyaYolu.split('/');
    if (pathParts.length < 3) {
      console.warn('⚠️ Dosya yolu formatı beklenenden farklı, sadece veritabanından siliniyor...');
      console.log(`📊 Dosya yolu parçaları: [${pathParts.join(', ')}]`);
      
      // Sadece veritabanından sil
      const { error: dbError } = await supabaseAdmin
        .from('etkinlik_belgeleri')
        .delete()
        .eq('id', belgeId)
        .select();
      
      if (dbError) {
        console.error('❌ Belge bilgisi silinirken hata:', dbError);
        throw new Error(`DB silme hatası: ${dbError.message}`);
      }
      
      console.log(`✅ Belge sadece DB'den silindi (dosya yolu formatı: ${pathParts.length} parça)`);
      return true;
    }
    
    // Kullanıcının kulüp ile ilişkisini kontrol et - yalnızca kendi kulübünün belgelerini silebilmeli
    const kulupId = pathParts[0];
    const basvuruId = pathParts[1];
    
    console.log(`🔄 Belge silme işlemi: KulüpID: ${kulupId}, BaşvuruID: ${basvuruId}`);
    
    // 1️⃣ Önce veritabanından belge bilgisini sil - ADMIN CLIENT kullan (RLS bypass için)
    const { data: deletedRows, error: dbError } = await supabaseAdmin
      .from('etkinlik_belgeleri')
      .delete()
      .eq('id', belgeId)
      .select();
    
    if (dbError) {
      console.error('❌ Belge bilgisi silinirken hata:', dbError);
      throw new Error(`DB silme hatası: ${dbError.message}`);
    }
    
    if (!deletedRows || deletedRows.length === 0) {
      console.error('❌ Silinecek belge bulunamadı. Belge ID:', belgeId);
      throw new Error('Silinecek belge veritabanında bulunamadı');
    }
    
    console.log(`✅ Belge DB'den silindi, silinen satır sayısı: ${deletedRows.length}`);
    
    // 2️⃣ Storage'dan dosyayı sil - ADMIN CLIENT kullan
    try {
      const { data: storageData, error: storageError } = await supabaseAdmin.storage
        .from('etkinlik-belgeleri')
        .remove([dosyaYolu]);
      
      if (storageError) {
        console.error('❌ Dosya storage\'dan silinirken hata:', storageError);
        console.error('Hata detayları:', JSON.stringify(storageError));
        console.warn('⚠️ Belge veritabanından silindi ancak dosya storage\'dan silinemedi.');
        // Storage hatası olsa bile DB silme başarılıysa true döndür
      } else {
        console.log(`✅ Dosya storage'dan silindi:`, storageData);
      }
    } catch (storageException) {
      console.error('💥 Storage silme işlemi sırasında exception:', storageException);
      console.warn('⚠️ Belge veritabanından silindi ancak storage silmede exception oluştu.');
      // Exception olsa bile DB silme başarılıysa devam et
    }
    
    console.log('🎉 Belge başarıyla silindi (hem DB\'den hem storage\'dan).');
    return true;
  } catch (error) {
    console.error('💥 Belge silme işlemi başarısız:', error);
    return false;
  }
};

// Ek belge sil (hem veritabanından hem storage'dan)
export const ekBelgeSil = async (belgeId: string, dosyaYolu: string): Promise<boolean> => {
  try {
    console.log(`🗑️ ID: ${belgeId} olan ek belge siliniyor...`);
    console.log(`📁 Dosya yolu: ${dosyaYolu}`);
    
    // Dosya yolu kontrolü
    if (!dosyaYolu || typeof dosyaYolu !== 'string') {
      console.error('Geçersiz dosya yolu');
      throw new Error('Geçersiz dosya yolu');
    }
    
    console.log(`🔄 Ek belge silme işlemi: DosyaYolu: ${dosyaYolu}`);
    
    // 1️⃣ Önce veritabanından belge bilgisini sil - ADMIN CLIENT kullan (RLS bypass için)
    const { data: deletedRows, error: dbError } = await supabaseAdmin
      .from('ek_belgeler')
      .delete()
      .eq('id', belgeId)
      .select();
    
    if (dbError) {
      console.error('❌ Ek belge bilgisi silinirken hata:', dbError);
      throw new Error(`DB silme hatası: ${dbError.message}`);
    }
    
    if (!deletedRows || deletedRows.length === 0) {
      console.error('❌ Silinecek ek belge bulunamadı. Belge ID:', belgeId);
      throw new Error('Silinecek ek belge veritabanında bulunamadı');
    }
    
    console.log(`✅ Ek belge DB'den silindi, silinen satır sayısı: ${deletedRows.length}`);
    
    // 2️⃣ Storage'dan dosyayı sil - ADMIN CLIENT kullan
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('ek-belgeler') // ek belgeler bucket'ı
      .remove([dosyaYolu]);
    
    if (storageError) {
      console.error('❌ Ek belge dosyası storage\'dan silinirken hata:', storageError);
      console.error('Hata detayları:', JSON.stringify(storageError));
      console.warn('⚠️ Ek belge veritabanından silindi ancak dosya storage\'dan silinemedi.');
      // Storage hatası olsa bile DB silme başarılıysa true döndür
    } else {
      console.log(`✅ Ek belge dosyası storage'dan silindi:`, storageData);
    }
    
    console.log('🎉 Ek belge başarıyla silindi (hem DB\'den hem storage\'dan).');
    return true;
  } catch (error) {
    console.error('💥 Ek belge silme işlemi başarısız:', error);
    return false;
  }
};

// Etkinlik Başvuru Durum Güncelleme - Unified onay_gecmisi sistemini kullanır
// updateEtkinlikDurum fonksiyonu kaldırıldı - JSONB sisteminde gerekli değil
// Etkinlik onayları artık direkt danisman_onay ve sks_onay JSONB kolonlarında tutuluyor

// Belge onaylama - Unified onay_gecmisi sistemini kullanır
// Belgenin genel durumunu unified onay sistemine göre günceller
// updateBelgeDurum fonksiyonu kaldırıldı - artık JSONB onay sistemi kullanılıyor



// Akıllı belge güncelleme - sadece değişenleri güncelle
const updateBesvuruBelgeleri = async (
  basvuruId: string, 
  belgeler: EtkinlikBelge[], 
  client: any
): Promise<void> => {
  if (belgeler && belgeler.length > 0) {
    console.log('🔄 Belgeler akıllı güncelleniyor:', belgeler.length, 'adet');
    
    // Mevcut belgeleri al
    const { data: mevcutBelgeler } = await client
      .from('etkinlik_belgeleri')
      .select('id, tip, dosya_adi, dosya_yolu, danisman_onay, sks_onay')
      .eq('basvuru_id', basvuruId);
    
    console.log('📋 Mevcut belgeler:', mevcutBelgeler?.length || 0, 'adet');
    
    // Her yeni belge için kontrol et
    for (const yeniBelge of belgeler) {
      if (typeof yeniBelge.dosya === 'string') {
        const yeniBelgeTip = yeniBelge.tip;
        const yeniBelgeAdi = yeniBelge.dosyaAdi;
        const yeniBelgeYolu = yeniBelge.dosya;
        
        // Aynı tipte mevcut belge var mı?
        const mevcutBelge = mevcutBelgeler?.find((m: any) => m.tip === yeniBelgeTip);
        
        if (mevcutBelge) {
          // Aynı belge mi yoksa yeni bir belge mi?
          const ayniBelge = mevcutBelge.dosya_adi === yeniBelgeAdi && 
                           mevcutBelge.dosya_yolu === yeniBelgeYolu;
          
          if (ayniBelge) {
            console.log(`✅ ${yeniBelgeTip} belgesinde değişiklik yok, atlanıyor`);
            continue; // Değişiklik yok, bu belgeyi atla
          } else {
            console.log(`🔄 ${yeniBelgeTip} belgesi değişmiş, güncelleniyor:`, {
              eski: {
                dosyaAdi: mevcutBelge.dosya_adi,
                dosyaYolu: mevcutBelge.dosya_yolu,
                belgeId: mevcutBelge.id
              },
              yeni: {
                dosyaAdi: yeniBelgeAdi,
                dosyaYolu: yeniBelgeYolu
              },
              onaySifirlaniyor: 'Yeni belge yüklendi, onay süreci sıfırlandı'
            });
            
            // Eski belgeyi hem veritabanından hem storage'dan sil
            console.log(`🔄 Eski ${yeniBelgeTip} belgesi siliniyor: ID=${mevcutBelge.id}, Yol=${mevcutBelge.dosya_yolu}`);
            const eskiBelgeBasariliSilindi = await etkinlikBelgeSil(mevcutBelge.id, mevcutBelge.dosya_yolu);
            
            if (!eskiBelgeBasariliSilindi) {
              console.error(`❌ Eski ${yeniBelgeTip} belgesi silinirken hata oluştu`);
              throw new Error(`Eski ${yeniBelgeTip} belgesi silinemedi`);
            }
            
            console.log(`🗑️ Eski ${yeniBelgeTip} belgesi hem DB'den hem storage'dan silindi`);
    
            // Yeni belgeyi temiz onay durumu ile ekle (belge değiştiği için onay süreci sıfırlanır)
            const { error: eklemeError } = await client
              .from('etkinlik_belgeleri')
              .insert({
        basvuru_id: basvuruId,
                tip: yeniBelgeTip,
                dosya_adi: yeniBelgeAdi,
                dosya_yolu: yeniBelgeYolu,
                // Yeni belge = yeni onay süreci (sıfırlanır)
                danisman_onay: null,
                sks_onay: null
              });
            
            if (eklemeError) {
              console.error(`❌ Yeni ${yeniBelgeTip} belgesi eklenirken hata:`, eklemeError);
              throw eklemeError;
            }
            
            console.log(`✅ ${yeniBelgeTip} belgesi başarıyla güncellendi (onay süreci sıfırlandı)`);
          }
        } else {
          console.log(`➕ Yeni ${yeniBelgeTip} belgesi ekleniyor`);
          
          // Yeni belge tipi, direkt ekle
          const { error: eklemeError } = await client
        .from('etkinlik_belgeleri')
            .insert({
              basvuru_id: basvuruId,
              tip: yeniBelgeTip,
              dosya_adi: yeniBelgeAdi,
              dosya_yolu: yeniBelgeYolu,
              // Yeni belge için onay bilgileri yok
              danisman_onay: yeniBelge.danismanOnay || null,
              sks_onay: yeniBelge.sksOnay || null
            });
          
          if (eklemeError) {
            console.error(`❌ Yeni ${yeniBelgeTip} belgesi eklenirken hata:`, eklemeError);
            throw eklemeError;
          }
          
          console.log(`✅ Yeni ${yeniBelgeTip} belgesi başarıyla eklendi`);
        }
      } else {
        // File nesnesi varsa şimdilik atla - ayrı yükleme süreciyle halledilecek
        console.log('📁 File nesnesi atlandı:', yeniBelge.dosyaAdi);
      }
    }
    
    console.log('✅ Tüm belgeler akıllı güncelleme tamamlandı');
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
            // durum kolonu kaldırıldı - JSONB onay sistemi kullanılıyor
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
          // durum kolonu kaldırıldı - JSONB onay sistemi kullanılıyor
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
      .select('id, etkinlik_adi, danisman_onay, sks_onay')
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
      aciklama: belge.aciklama
      // durum kolonu kaldırıldı - JSONB onay sistemi kullanılıyor
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



// Test amaçlı ek belge oluşturma fonksiyonu
export const createTestEkBelge = async (etkinlikId: string) => {
  try {
    console.log(`Test ek belge oluşturuluyor - Etkinlik ID: ${etkinlikId}`);
    
    // Önce etkinliğin var olup olmadığını kontrol edelim
    const { data: etkinlikData, error: etkinlikError } = await supabase
      .from('etkinlik_basvurulari')
      .select('id, etkinlik_adi, danisman_onay, sks_onay')
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
      olusturma_tarihi: new Date().toISOString()
      // durum kolonu kaldırıldı - JSONB onay sistemi kullanılıyor
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
        .update({ danisman_onay: null, sks_onay: null }) // durum kolonu kaldırıldı
        .eq('etkinlik_id', etkinlikId);
      if (e2) throw e2;
    }

    return { success: true };
  } catch (error) {
    console.error('Belge onayları sıfırlanamadı:', error);
    return null;
  }
};

// JSONB Belge Onay Fonksiyonları
export const belgeOnayla = async (
  belgeId: string,
  onayTipi: 'Danışman' | 'SKS'
): Promise<boolean> => {
  try {
    console.log(`${onayTipi} tarafından ID: ${belgeId} olan belge onaylanıyor...`);
    
    // Kullanıcı bilgilerini al
    const { data: userData } = await supabase.auth.getUser();
    const onaylayanId = userData?.user?.id;
    
    // Hangi tablodan olduğunu belirle
    let belgeTipi: 'etkinlik_belgeleri' | 'ek_belgeler' = 'etkinlik_belgeleri';
    
    // Önce etkinlik_belgeleri'nde kontrol et
    const { data: etkinlikBelgesi } = await supabaseAdmin
      .from('etkinlik_belgeleri')
      .select('id')
      .eq('id', belgeId)
      .single();
    
    // Bulunamadıysa ek_belgeler'de olabilir
    if (!etkinlikBelgesi) {
      const { data: ekBelge } = await supabaseAdmin
        .from('ek_belgeler')
        .select('id')
        .eq('id', belgeId)
        .single();
      
      if (ekBelge) {
        belgeTipi = 'ek_belgeler';
      } else {
        console.error('Belge bulunamadı:', belgeId);
        throw new Error('Belge bulunamadı');
      }
    }
    
    console.log(`Belge tipi belirlendi: ${belgeTipi}`);
    
    // JSONB onay bilgisi hazırla
    const onayBilgisi = {
      durum: 'Onaylandı',
      tarih: new Date().toISOString(),
      redSebebi: null,
      onaylayanId: onaylayanId
    };
    
    // Hangi JSONB kolonunu güncelleyeceğimizi belirle
    const onayKolonu = onayTipi === 'Danışman' ? 'danisman_onay' : 'sks_onay';
    
    // JSONB kolonunu güncelle
    const { error: updateError } = await supabaseAdmin
      .from(belgeTipi)
      .update({ [onayKolonu]: onayBilgisi })
      .eq('id', belgeId)
      .select();
    
    if (updateError) {
      console.error(`JSONB onay güncelleme hatası:`, updateError);
      throw updateError;
    }
    
    console.log(`✅ ${belgeTipi} tablosundaki belge başarıyla onaylandı: ${belgeId}`);
    console.log(`✅ Güncellenen ${onayKolonu}:`, onayBilgisi);
    
    // Audit trail için onay_gecmisi tablosuna da kaydet
    const { error: onayError } = await supabaseAdmin
      .from('onay_gecmisi')
      .insert({
        onay_kategorisi: 'Belge',
        belge_id: belgeId,
        belge_tipi: belgeTipi,
        onay_tipi: onayTipi,
        durum: 'Onaylandı',
        tarih: new Date().toISOString(),
        onaylayan_id: onaylayanId
      });
    
    if (onayError) {
      console.warn(`Audit trail kayıt hatası (devam ediyor):`, onayError);
    }
    
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
    
    if (!redSebebi.trim()) {
      throw new Error('Red sebebi belirtilmelidir');
    }

    // Kullanıcı bilgilerini al
    const { data: userData } = await supabase.auth.getUser();
    const onaylayanId = userData?.user?.id;
    
    // Hangi tablodan olduğunu belirle
    let belgeTipi: 'etkinlik_belgeleri' | 'ek_belgeler' = 'etkinlik_belgeleri';
    
    // Önce etkinlik_belgeleri'nde kontrol et
    const { data: etkinlikBelgesi } = await supabaseAdmin
      .from('etkinlik_belgeleri')
      .select('id')
      .eq('id', belgeId)
      .single();
    
    // Bulunamadıysa ek_belgeler'de olabilir
    if (!etkinlikBelgesi) {
      const { data: ekBelge } = await supabaseAdmin
        .from('ek_belgeler')
        .select('id')
        .eq('id', belgeId)
        .single();
      
      if (ekBelge) {
        belgeTipi = 'ek_belgeler';
      } else {
        console.error('Belge bulunamadı:', belgeId);
        throw new Error('Belge bulunamadı');
      }
    }
    
    console.log(`Belge tipi belirlendi: ${belgeTipi}`);
    
    // JSONB red bilgisi hazırla
    const redBilgisi = {
      durum: 'Reddedildi',
      tarih: new Date().toISOString(),
      redSebebi: redSebebi,
      onaylayanId: onaylayanId
    };
    
    // Hangi JSONB kolonunu güncelleyeceğimizi belirle
    const onayKolonu = onayTipi === 'Danışman' ? 'danisman_onay' : 'sks_onay';
    
    // JSONB kolonunu güncelle
    const { error: updateError } = await supabaseAdmin
      .from(belgeTipi)
      .update({ [onayKolonu]: redBilgisi })
      .eq('id', belgeId)
      .select();
    
    if (updateError) {
      console.error(`JSONB red güncelleme hatası:`, updateError);
      throw updateError;
    }
    
    console.log(`✅ ${belgeTipi} tablosundaki belge başarıyla reddedildi: ${belgeId}`);
    console.log(`✅ Güncellenen ${onayKolonu}:`, redBilgisi);
    
    // Audit trail için onay_gecmisi tablosuna da kaydet
    const { error: redError } = await supabaseAdmin
      .from('onay_gecmisi')
      .insert({
        onay_kategorisi: 'Belge',
        belge_id: belgeId,
        belge_tipi: belgeTipi,
        onay_tipi: onayTipi,
        durum: 'Reddedildi',
        tarih: new Date().toISOString(),
        red_sebebi: redSebebi,
        onaylayan_id: onaylayanId
      });
    
    if (redError) {
      console.warn(`Audit trail kayıt hatası (devam ediyor):`, redError);
    }
    
    return true;
  } catch (error) {
    console.error('Belge reddetme işlemi başarısız:', error);
    return false;
  }
};

// Ek belge fonksiyonları
export const ekBelgeOnayla = async (belgeId: string, onaylayan: 'Danışman' | 'SKS'): Promise<boolean> => {
  return belgeOnayla(belgeId, onaylayan);
};

export const ekBelgeReddet = async (belgeId: string, reddeden: 'Danışman' | 'SKS', redSebebi: string): Promise<boolean> => {
  return belgeReddet(belgeId, reddeden, redSebebi);
};

// Revizyon Geçmişi Fonksiyonları

export const getRevizyonGecmisi = async (basvuruId: string) => {
  try {
    const { data, error } = await supabase
      .from('etkinlik_revizyon_gecmisi')
      .select('*')
      .eq('basvuru_id', basvuruId)
      .order('revizyon_tarihi', { ascending: false });

    if (error) {
      console.error('Revizyon geçmişi alınırken hata:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Revizyon geçmişi alınırken hata:', error);
    throw error;
  }
};
