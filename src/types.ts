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
  danismanOnay?: OnayDurumu;
  sksOnay?: OnayDurumu;
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
  durum: 'Beklemede' | 'Onaylandı' | 'Reddedildi';
}

export interface EtkinlikBasvuru {
  id: string;
  kulupAdi: string;
  kulupId?: string;
  etkinlikAdi: string;
  etkinlikYeri: {
    fakulte: string;
    detay: string;
  };
  baslangicTarihi: string; // legacy alan
  bitisTarihi: string;     // legacy alan
  zamanDilimleri?: Array<{ baslangic: string; bitis: string }>; // çoklu
  sponsorlar?: Sponsor[];
  konusmacilar?: Konusmaci[];
  aciklama: string;
  belgeler?: EtkinlikBelge[];
  ekBelgeler?: EkBelge[];
  durum: 'Beklemede' | 'Onaylandı' | 'Reddedildi';
  revizyon: boolean;
  orijinalBasvuruId?: string;
  danismanOnay?: OnayDurumu;
  sksOnay?: OnayDurumu;
  onayGecmisi: {
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