export type UserRole = 'admin' | 'sks' | 'danisman' | 'kulup_baskani';

export interface OnayDurumu {
  durum: 'Onaylandı' | 'Reddedildi';
  tarih: string;
  redSebebi?: string;
}

export interface Sponsor {
  firmaAdi: string;
  detay: string;
}

export interface Konusmaci {
  adSoyad: string;
  ozgecmis: string;
  aciklama: string;
}

export interface EtkinlikBelge {
  id?: string;
  tip: 'Afiş' | 'KatilimciListesi' | 'KumanyaTalep' | 'AracIstek' | 'AfisBasim' | 'Diger';
  dosya: string | File; // Base64 encoded PDF or File object
  dosyaAdi: string;
  belgeNotu?: string; // Kullanıcının bıraktığı not
  danismanOnay?: OnayDurumu;
  sksOnay?: OnayDurumu;
  durum?: 'Beklemede' | 'Onaylandı' | 'Reddedildi'; // Backward compatibility
}

export interface EkBelge {
  id?: string;
  etkinlikId: string;
  tip: 'Afiş' | 'KatilimciListesi' | 'KumanyaTalep' | 'AracIstek' | 'AfisBasim' | 'Diger';
  dosya: string | File;
  dosyaAdi: string;
  olusturmaTarihi: string;
  danismanOnay?: OnayDurumu;
  sksOnay?: OnayDurumu;
  aciklama?: string;
  durum?: 'Beklemede' | 'Onaylandı' | 'Reddedildi'; // Backward compatibility
}

export interface EtkinlikBasvuru {
  id: string;
  kulupAdi: string;
  kulupId?: string;
  etkinlikAdi: string;
  etkinlikTuru?:
    | 'Sempozyum / Kongre / Zirve'
    | 'Panel / Seminer / Söyleşi'
    | 'Sosyal Sorumluluk Projesi'
    | 'Gezi / Tur / Kamp'
    | 'Eğitim / Workshop'
    | 'Sportif Aktivite'
    | 'Sanatsal Aktivite'
    | 'Eğlence / Festival / Panayır'
    | 'Basılı / Dijital Yayın'
    | 'Yarışma Düzenleme'
    | 'Yarışma / Etkinlik Katılımı'
    | 'Stant'
    | 'Toplantı'
    | 'Diğer';
  digerTuruAciklama?: string;
  etkinlikYeri: {
    fakulte: string;
    detay: string;
  };
  baslangicTarihi?: string; // legacy alan - opsiyonel
  bitisTarihi?: string;     // legacy alan - opsiyonel  
  zamanDilimleri?: Array<{ baslangic: string; bitis: string }>; // çoklu - yeni sistem
  sponsorlar?: Sponsor[];
  konusmacilar?: Konusmaci[];
  aciklama: string;
  etkinlikGorseli?: string; // Storage bucket yolu (1080x1080 pixel)
  belgeler?: EtkinlikBelge[];
  ekBelgeler?: EkBelge[];
  revizyon: boolean;
  orijinalBasvuruId?: string;
  danismanOnay?: OnayDurumu;
  sksOnay?: OnayDurumu;
  durum?: 'Beklemede' | 'Onaylandı' | 'Reddedildi'; // Backward compatibility
  onayGecmisi?: {
    danismanOnaylari: OnayDurumu[];
    sksOnaylari: OnayDurumu[];
  };
}

export interface AkademikDanisman {
  id: string;
  adSoyad: string;
  eposta: string;
  bolum: string;
  telefon?: string;
  fakulte?: string;
  odaNo?: string;
}

export interface KulupBaskani {
  adSoyad: string;
  eposta: string;
  telefon: string;
}

export interface EtkinlikRevizyonGecmisi {
  id: string;
  basvuru_id: string;
  revizyon_numarasi: number;
  revizyon_tarihi: string;
  revizyon_turu: 'belgeler' | 'etkinlik' | 'ikisi';
  revizyon_yapan_id?: string;
  revizyon_aciklamasi?: string;
  eski_etkinlik_adi: string;
  eski_aciklama?: string;
  eski_etkinlik_turu?: string;
  eski_diger_turu_aciklama?: string;
  eski_etkinlik_yeri?: {
    fakulte: string;
    detay: string;
  };
  eski_zaman_dilimleri?: Array<{ baslangic: string; bitis: string }>;
  eski_danisman_onay?: OnayDurumu;
  eski_sks_onay?: OnayDurumu;
  eski_etkinlik_gorseli?: string;
  degisen_alanlar?: {
    [key: string]: any;
  };
  created_at: string;
}

export interface Kulup {
  id: string;
  isim: string;
  akademikDanisman: AkademikDanisman; // legacy single
  akademikDanismanlar?: AkademikDanisman[]; // yeni çoklu destek
  baskan: KulupBaskani;
  odaNo?: string;
  digerTesisler?: string;
  altTopluluklar?: string[];
  tuzuk?: string;
  logo?: string;
}