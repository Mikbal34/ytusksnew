import { supabase, supabaseAdmin } from './supabase';

type OnayJson = {
  durum: 'Onaylandı' | 'Reddedildi' | 'Beklemede';
  tarih: string;
  redSebebi?: string | null;
  onaylayanId?: string | null;
} | null;

export type RevizyonSecimleri = {
  gorsel?: boolean;
  konusmaci?: boolean;
  sponsor?: boolean;
};

export type KonusmaciDelta =
  | { islem: 'ekle'; yeni_ad_soyad: string; yeni_ozgecmis?: string | null; yeni_aciklama?: string | null }
  | { islem: 'cikar'; hedef_konusmaci_id: string };

export type SponsorDelta =
  | { islem: 'ekle'; yeni_firma_adi: string; yeni_detay?: string | null }
  | { islem: 'cikar'; hedef_sponsor_id: string };

// Revizyon üst kaydı oluştur
export const createRevizyon = async (
  basvuruId: string,
  secimler: RevizyonSecimleri,
  aciklama?: string
): Promise<string> => {
  const { data: session } = await supabase.auth.getSession();
  const olusturanId = session.session?.user?.id || null;

  const insertData = {
    basvuru_id: basvuruId,
    revize_gorsel: !!secimler.gorsel,
    revize_konusmaci: !!secimler.konusmaci,
    revize_sponsor: !!secimler.sponsor,
    durum: 'beklemede',
    danisman_onay: null as OnayJson,
    sks_onay: null as OnayJson,
    aciklama: aciklama || null,
    olusturan_id: olusturanId
  };

  const { data, error } = await supabaseAdmin
    .from('etkinlik_revizyonlari')
    .insert(insertData)
    .select('id')
    .single();

  if (error) throw new Error(`Revizyon oluşturulamadı: ${error.message}`);
  return data.id as string;
};

// Görsel revizyonu ekle: pending klasörüne yükle ve kayıt oluştur
export const addGorselRevizyon = async (
  revizyonId: string,
  basvuruId: string,
  dosya: File,
  orijinalDosyaAdi: string
): Promise<{ pendingPath: string }> => {
  // Başvurudan kulüp ID ve mevcut görseli al
  const { data: basvuru, error: bErr } = await supabaseAdmin
    .from('etkinlik_basvurulari')
    .select('kulup_id, etkinlik_gorseli')
    .eq('id', basvuruId)
    .single();
  if (bErr) throw new Error(`Başvuru bilgisi alınamadı: ${bErr.message}`);

  const kulupId: string = basvuru.kulup_id;
  const eskiPath: string | null = basvuru.etkinlik_gorseli;

  // Güvenli dosya adı
  const normalize = (s: string) => s
    .replace(/\s+/g, '_')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');

  const safeName = normalize(orijinalDosyaAdi);
  const pendingPath = `pending/${kulupId}/${basvuruId}/${Date.now()}_${safeName}`;

  // Yükle (pending altına)
  const { data: uploadData, error: uErr } = await supabase.storage
    .from('etkinlik-gorselleri')
    .upload(pendingPath, dosya, { contentType: dosya.type, upsert: false });
  if (uErr) throw new Error(`Görsel yüklenemedi: ${uErr.message}`);

  // Revizyon görsel kaydı ekle
  const { error: gErr } = await supabaseAdmin
    .from('etkinlik_gorsel_revizyonlari')
    .insert({
      revizyon_id: revizyonId,
      basvuru_id: basvuruId,
      eski_path: eskiPath,
      yeni_gecici_path: uploadData.path,
      final_path: null
    });
  if (gErr) throw new Error(`Görsel revizyon kaydı eklenemedi: ${gErr.message}`);

  return { pendingPath: uploadData.path };
};

// Konuşmacı delta kayıtlarını ekle
export const addKonusmaciRevizyonlari = async (
  revizyonId: string,
  basvuruId: string,
  islemler: KonusmaciDelta[]
): Promise<void> => {
  if (!islemler || islemler.length === 0) return;
  const rows = islemler.map(op =>
    op.islem === 'ekle'
      ? {
          revizyon_id: revizyonId,
          basvuru_id: basvuruId,
          islem: 'ekle',
          hedef_konusmaci_id: null,
          yeni_ad_soyad: op.yeni_ad_soyad,
          yeni_ozgecmis: op.yeni_ozgecmis || null,
          yeni_aciklama: op.yeni_aciklama || null
        }
      : {
          revizyon_id: revizyonId,
          basvuru_id: basvuruId,
          islem: 'cikar',
          hedef_konusmaci_id: op.hedef_konusmaci_id,
          yeni_ad_soyad: null,
          yeni_ozgecmis: null,
          yeni_aciklama: null
        }
  );

  const { error } = await supabaseAdmin.from('konusmaci_revizyonlari').insert(rows);
  if (error) throw new Error(`Konuşmacı revizyonları eklenemedi: ${error.message}`);
};

// Sponsor delta kayıtlarını ekle
export const addSponsorRevizyonlari = async (
  revizyonId: string,
  basvuruId: string,
  islemler: SponsorDelta[]
): Promise<void> => {
  if (!islemler || islemler.length === 0) return;
  const rows = islemler.map(op =>
    op.islem === 'ekle'
      ? {
          revizyon_id: revizyonId,
          basvuru_id: basvuruId,
          islem: 'ekle',
          hedef_sponsor_id: null,
          yeni_firma_adi: op.yeni_firma_adi,
          yeni_detay: op.yeni_detay || null
        }
      : {
          revizyon_id: revizyonId,
          basvuru_id: basvuruId,
          islem: 'cikar',
          hedef_sponsor_id: op.hedef_sponsor_id,
          yeni_firma_adi: null,
          yeni_detay: null
        }
  );

  const { error } = await supabaseAdmin.from('sponsor_revizyonlari').insert(rows);
  if (error) throw new Error(`Sponsor revizyonları eklenemedi: ${error.message}`);
};

// Revizyonu onayla/red et ve gerekiyorsa uygula
export const onaylaRevizyon = async (
  revizyonId: string,
  onaylayanTip: 'Danışman' | 'SKS',
  kabul: boolean,
  redSebebi?: string
): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  const onaylayanId = user.user?.id || null;

  // Mevcut revizyonu al
  const { data: revizyon, error: rErr } = await supabaseAdmin
    .from('etkinlik_revizyonlari')
    .select('id, basvuru_id, revize_gorsel, revize_konusmaci, revize_sponsor, danisman_onay, sks_onay, durum')
    .eq('id', revizyonId)
    .single();
  if (rErr) throw new Error(`Revizyon bulunamadı: ${rErr.message}`);

  // İlgili JSONB kolonu güncelle
  const onayKolonu = onaylayanTip === 'Danışman' ? 'danisman_onay' : 'sks_onay';
  const onayDegeri: OnayJson = {
    durum: kabul ? 'Onaylandı' : 'Reddedildi',
    tarih: new Date().toISOString(),
    redSebebi: kabul ? null : (redSebebi || null),
    onaylayanId
  };

  const { error: uErr } = await supabaseAdmin
    .from('etkinlik_revizyonlari')
    .update({ [onayKolonu]: onayDegeri })
    .eq('id', revizyonId);
  if (uErr) throw new Error(`Onay güncellenemedi: ${uErr.message}`);

  // Onay geçmişine kayıt
  await supabaseAdmin.from('onay_gecmisi').insert({
    basvuru_id: revizyon.basvuru_id,
    onay_kategorisi: 'Revizyon',
    revizyon_id: revizyonId,
    onay_tipi: onaylayanTip,
    durum: kabul ? 'Onaylandı' : 'Reddedildi',
    tarih: new Date().toISOString(),
    red_sebebi: kabul ? null : (redSebebi || null),
    onaylayan_id: onaylayanId
  });

  // Her iki onay da tamamlandıysa uygula veya biri reddettiyse kapat
  const yeniDanisman = onaylayanTip === 'Danışman' ? onayDegeri : (revizyon.danisman_onay as OnayJson);
  const yeniSKS = onaylayanTip === 'SKS' ? onayDegeri : (revizyon.sks_onay as OnayJson);

  const danismanOk = yeniDanisman && yeniDanisman.durum === 'Onaylandı';
  const sksOk = yeniSKS && yeniSKS.durum === 'Onaylandı';
  const biriRed = (yeniDanisman && yeniDanisman.durum === 'Reddedildi') || (yeniSKS && yeniSKS.durum === 'Reddedildi');

  if (biriRed) {
    // Pending görselleri temizle
    await temizlePendingGorseller(revizyonId);
    await supabaseAdmin
      .from('etkinlik_revizyonlari')
      .update({ durum: 'reddedildi' })
      .eq('id', revizyonId);
    return;
  }

  if (danismanOk && sksOk) {
    // Uygula
    await uygulaRevizyon(revizyonId);
    await supabaseAdmin
      .from('etkinlik_revizyonlari')
      .update({ durum: 'onayli' })
      .eq('id', revizyonId);
  }
};

// Revizyonu uygula: görsel taşı, konuşmacı/sponsor delta işle
export const uygulaRevizyon = async (revizyonId: string): Promise<void> => {
  // Üst kayıt ve alt kayıtları getir
  const { data: revizyon, error: rErr } = await supabaseAdmin
    .from('etkinlik_revizyonlari')
    .select('id, basvuru_id, revize_gorsel, revize_konusmaci, revize_sponsor')
    .eq('id', revizyonId)
    .single();
  if (rErr) throw new Error(`Revizyon bulunamadı: ${rErr.message}`);

  const basvuruId: string = revizyon.basvuru_id;

  if (revizyon.revize_gorsel) {
    await finalizeGorsel(revizyonId, basvuruId);
  }

  if (revizyon.revize_konusmaci) {
    await applyKonusmaciDeltas(revizyonId, basvuruId);
  }

  if (revizyon.revize_sponsor) {
    await applySponsorDeltas(revizyonId, basvuruId);
  }
};

async function finalizeGorsel(revizyonId: string, basvuruId: string): Promise<void> {
  // Görsel revizyon satırını al (son eklenen)
  const { data: gRows, error: gErr } = await supabaseAdmin
    .from('etkinlik_gorsel_revizyonlari')
    .select('id, yeni_gecici_path, eski_path')
    .eq('revizyon_id', revizyonId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (gErr) throw new Error(`Görsel revizyonları alınamadı: ${gErr.message}`);
  const g = gRows && gRows[0];
  if (!g) return; // görsel eklenmemiş olabilir

  // Kulüp ID al
  const { data: basvuru, error: bErr } = await supabaseAdmin
    .from('etkinlik_basvurulari')
    .select('kulup_id')
    .eq('id', basvuruId)
    .single();
  if (bErr) throw new Error(`Kulüp bilgisi alınamadı: ${bErr.message}`);

  const kulupId: string = basvuru.kulup_id;
  const fileName = g.yeni_gecici_path.split('/').pop() as string;
  const finalPath = `${kulupId}/${basvuruId}/gorseller/${fileName}`;

  // Supabase storage'da move yok; copy + delete yap
  const { error: copyErr } = await supabaseAdmin.storage
    .from('etkinlik-gorselleri')
    .copy(g.yeni_gecici_path, finalPath);
  if (copyErr) throw new Error(`Görsel kopyalanamadı: ${copyErr.message}`);

  // Pending'i sil
  await supabaseAdmin.storage.from('etkinlik-gorselleri').remove([g.yeni_gecici_path]);

  // Eski görseli sil (varsa)
  if (g.eski_path) {
    await supabaseAdmin.storage.from('etkinlik-gorselleri').remove([g.eski_path]);
  }

  // Başvuru kaydını güncelle ve görsel revizyon satırına final_path yaz
  const { error: upErr } = await supabaseAdmin
    .from('etkinlik_basvurulari')
    .update({ etkinlik_gorseli: finalPath })
    .eq('id', basvuruId);
  if (upErr) throw new Error(`Başvuru görseli güncellenemedi: ${upErr.message}`);

  await supabaseAdmin
    .from('etkinlik_gorsel_revizyonlari')
    .update({ final_path: finalPath })
    .eq('revizyon_id', revizyonId);
}

async function temizlePendingGorseller(revizyonId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('etkinlik_gorsel_revizyonlari')
    .select('yeni_gecici_path')
    .eq('revizyon_id', revizyonId);
  if (error) return;
  const paths = (data || []).map(r => r.yeni_gecici_path).filter(Boolean);
  if (paths.length > 0) await supabaseAdmin.storage.from('etkinlik-gorselleri').remove(paths);
}

async function applyKonusmaciDeltas(revizyonId: string, basvuruId: string): Promise<void> {
  const { data: rows, error } = await supabaseAdmin
    .from('konusmaci_revizyonlari')
    .select('*')
    .eq('revizyon_id', revizyonId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Konuşmacı delta okunamadı: ${error.message}`);

  for (const r of rows || []) {
    if (r.islem === 'ekle') {
      const { error: insErr } = await supabaseAdmin.from('konusmacilar').insert({
        basvuru_id: basvuruId,
        ad_soyad: r.yeni_ad_soyad,
        ozgecmis: r.yeni_ozgecmis || null,
        aciklama: r.yeni_aciklama || null
      });
      if (insErr) throw new Error(`Konuşmacı eklenemedi: ${insErr.message}`);
    } else if (r.islem === 'cikar' && r.hedef_konusmaci_id) {
      const { error: delErr } = await supabaseAdmin
        .from('konusmacilar')
        .delete()
        .eq('id', r.hedef_konusmaci_id)
        .eq('basvuru_id', basvuruId);
      if (delErr) throw new Error(`Konuşmacı silinemedi: ${delErr.message}`);
    }
  }
}

async function applySponsorDeltas(revizyonId: string, basvuruId: string): Promise<void> {
  const { data: rows, error } = await supabaseAdmin
    .from('sponsor_revizyonlari')
    .select('*')
    .eq('revizyon_id', revizyonId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Sponsor delta okunamadı: ${error.message}`);

  for (const r of rows || []) {
    if (r.islem === 'ekle') {
      const { error: insErr } = await supabaseAdmin.from('sponsorlar').insert({
        basvuru_id: basvuruId,
        firma_adi: r.yeni_firma_adi,
        detay: r.yeni_detay || null
      });
      if (insErr) throw new Error(`Sponsor eklenemedi: ${insErr.message}`);
    } else if (r.islem === 'cikar' && r.hedef_sponsor_id) {
      const { error: delErr } = await supabaseAdmin
        .from('sponsorlar')
        .delete()
        .eq('id', r.hedef_sponsor_id)
        .eq('basvuru_id', basvuruId);
      if (delErr) throw new Error(`Sponsor silinemedi: ${delErr.message}`);
    }
  }
}

// Revizyonları getir
export const getRevizyonlar = async () => {
  const { data, error } = await supabase
    .from('etkinlik_revizyonlari')
    .select(`
      *,
      etkinlik_basvurulari!inner(
        etkinlik_adi,
        kulup_id,
        kulupler!inner(isim)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Revizyonlar getirilirken hata:', error);
    throw error;
  }

  // Her revizyon için konuşmacı ve sponsor detaylarını getir
  const enrichedData = await Promise.all(
    (data || []).map(async (revizyon) => {
      let konusmaciDetaylari: any[] = [];
      let sponsorDetaylari: any[] = [];

      // Konuşmacı revizyonlarını getir
      if (revizyon.revize_konusmaci) {
        const { data: konusmaciData } = await supabase
          .from('konusmaci_revizyonlari')
          .select('*')
          .eq('revizyon_id', revizyon.id);
        konusmaciDetaylari = konusmaciData || [];
      }

      // Sponsor revizyonlarını getir
      if (revizyon.revize_sponsor) {
        const { data: sponsorData } = await supabase
          .from('sponsor_revizyonlari')
          .select('*')
          .eq('revizyon_id', revizyon.id);
        sponsorDetaylari = sponsorData || [];
      }

      return {
        ...revizyon,
        etkinlikAdi: revizyon.etkinlik_basvurulari.etkinlik_adi,
        kulupAdi: revizyon.etkinlik_basvurulari.kulupler.isim,
        konusmaciDetaylari,
        sponsorDetaylari
      };
    })
  );

  return enrichedData;
};
