import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Upload, Info, Image } from 'lucide-react';
import { EtkinlikBasvuru, Sponsor, Konusmaci, EtkinlikBelge, Kulup } from '../types';
import { saveBasvuru, getBasvuruById, updateBasvuru, etkinlikBelgeYukle, getKulupler, etkinlikBelgeSil, etkinlikGorseliYukle, etkinlikGorseliIndir } from '../utils/supabaseStorage';
import { BasvuruDetay } from './BasvuruDetay';
import { useAuth } from '../context/AuthContext';
import { sendEtkinlikBasvuruNotification } from '../utils/emailService';

const FAKULTELER = [
  'Elektrik-Elektronik Fakültesi',
  'İnşaat Fakültesi',
  'Makine Fakültesi',
  'Kimya-Metalurji Fakültesi',
  'Gemi İnşaatı ve Denizcilik Fakültesi',
  'Fen-Edebiyat Fakültesi',
  'Mimarlık Fakültesi',
  'İktisadi İdari Bilimler Fakültesi',
  'Eğitim Fakültesi',
  'Sanat Tasarım Fakültesi',
  'Yabancı Diller Yüksekokulu',
  'Kulüpler Vadisi',
  'Oditoryum',
  'Tarihi Hamam',
  'Kongre ve Kültür Merkezi',
  'Şevket Erk Konferans Salonu',
  'Online',
  'Diğer (Okul İçi)',
  'Diğer (Okul Dışı)',
  'Diğer'
];

const BELGE_TIPLERI: { tip: EtkinlikBelge['tip']; label: string }[] = [
  { tip: 'Afiş', label: 'Etkinlik Afişi' },
  { tip: 'KatilimciListesi', label: 'Dışarıdan Katılımcı Listesi' },
  { tip: 'KumanyaTalep', label: 'Kumanya Talep Formu' },
  { tip: 'AracIstek', label: 'Araç İstek Formu' },
  { tip: 'AfisBasim', label: 'Afiş Basım Talep Formu' },
  { tip: 'Diger', label: 'Diğer' }
];

  interface FormData {
  etkinlikAdi: string;
    etkinlikTuru: string;
    digerTuruAciklama?: string;
  fakulte: string;
  adresDetay: string;
  aciklama: string;
  etkinlikGorseli?: File;
}

type SelectedBelge = { file: File; note: string };

export function EtkinlikBasvuruFormu() {
  const navigate = useNavigate();
  const { basvuruId } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const revizeModu = searchParams.get('revize'); // 'belgeler' | 'etkinlik' | 'ikisi' | null
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    etkinlikAdi: '',
    etkinlikTuru: '',
    fakulte: '',
    adresDetay: '',
    aciklama: ''
  });
  const [zamanDilimleri, setZamanDilimleri] = useState<Array<{ baslangic: string; bitis: string }>>([]);

  const [sponsorVarMi, setSponsorVarMi] = useState(false);
  const [sponsorlar, setSponsorlar] = useState<Sponsor[]>([]);
  const [yeniSponsor, setYeniSponsor] = useState({ firmaAdi: '', detay: '' });

  const [konusmacilar, setKonusmacilar] = useState<Konusmaci[]>([]);
  const [yeniKonusmaci, setYeniKonusmaci] = useState({ adSoyad: '', ozgecmis: '', aciklama: '' });

  const [seciliBelgeler, setSeciliBelgeler] = useState<Set<EtkinlikBelge['tip']>>(new Set());
  const [belgeler, setBelgeler] = useState<{ [key: string]: SelectedBelge[] }>({});
  const [geciciBelge, setGeciciBelge] = useState<{ [key: string]: File | null }>({});
  const [geciciNot, setGeciciNot] = useState<{ [key: string]: string }>({});
  // const [mevcutBelgeler, setMevcutBelgeler] = useState<EtkinlikBelge[]>([]);
  const belgeInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  // Mevcut belge satırındaki "Belgeyi Değiştir" aksiyonu için ayrı input ve index takibi
  const belgeReplaceInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Tarih girişleri için yıl aralığını sınırla
  const MIN_YEAR = 2000;
  const MAX_YEAR = 2100;



  // ISO/timestamp değerlerini date input için çevir (YYYY-MM-DD)
  const toInputDate = (value?: string): string => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // ISO/timestamp değerlerini saat inputu için çevir (HH:mm)
  const toInputTime = (value?: string): string => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  };

  // YYYY-MM-DD ve HH:mm formatlarını ISO timestamp'a çevir
  const toISODateTime = (dateStr: string, timeStr: string): string => {
    if (!dateStr || !timeStr) return '';
    const [yyyy, mm, dd] = dateStr.split('-');
    const [hh, min] = timeStr.split(':');
    if (!dd || !mm || !yyyy || !hh || !min) return '';
    const date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min));
    if (isNaN(date.getTime())) return '';
    return date.toISOString();
  };

  // HTML5 date input kullanıldığı için formatDateInput ve validateDateFormat fonksiyonları kaldırıldı

  // Belge adı formatı: Kulup_Etkinlik_BelgeTur+Versiyon_Tarih (ddMMyyyy)
  const toSlug = (value: string): string => {
    return (value || '')
      .toLowerCase()
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  };

  const tipToSlug = (tip: string): string => {
    switch (tip) {
      case 'Afiş': return 'afis';
      case 'KatilimciListesi': return 'katilimci';
      case 'KumanyaTalep': return 'kumanya';
      case 'AracIstek': return 'arac';
      case 'AfisBasim': return 'afisbasim';
      case 'Diger': return 'diger';
      default: return toSlug(tip);
    }
  };

  const formatTodayDDMMYYYY = (): string => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}${mm}${yyyy}`;
  };

  const [mevcutBasvuru, setMevcutBasvuru] = useState<EtkinlikBasvuru | null>(null);
  const isAdvisorApproved = !!mevcutBasvuru?.danismanOnay;
  const belgelerRevizeModu = revizeModu === 'belgeler' || revizeModu === 'ikisi';
  const etkinlikRevizeModu = revizeModu === 'etkinlik' || revizeModu === 'ikisi';
  // Revize modunda belge yükleme girişleri butonla açılıp kapanır
  const isRevize = belgelerRevizeModu;
  const [yuklemeAcik, setYuklemeAcik] = useState<{ [key: string]: boolean }>({});
  const showEventSections = !revizeModu || etkinlikRevizeModu;
  const showBelgeSection = !revizeModu || belgelerRevizeModu;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gorselError, setGorselError] = useState<string | null>(null);
  const [kulup, setKulup] = useState<Kulup | null>(null);
  const [mevcutGorsel, setMevcutGorsel] = useState<string | null>(null);
  
  // Görsel popup için state'ler  
  const [gorselPopup, setGorselPopup] = useState<{
    isOpen: boolean;
    gorselUrl: string;
    etkinlikAdi: string;
  }>({
    isOpen: false,
    gorselUrl: '',
    etkinlikAdi: ''
  });
  
  // Belge notu popup için state'ler
  const [belgeNotuPopup, setBelgeNotuPopup] = useState<{
    isOpen: boolean;
    belgeAdi: string;
    belgeNotu: string;
  }>({
    isOpen: false,
    belgeAdi: '',
    belgeNotu: ''
  });
  
  // Revize akışında "Belgeyi Değiştir" için aktif tip bilgisi gerekirse kullanılabilir
  // Ek belge yükleme modal akışı ileride eklenecek

  useEffect(() => {
    const fetchBasvuru = async () => {
      if (basvuruId) {
        try {
          setLoading(true);
          const basvuru = await getBasvuruById(basvuruId);
          if (basvuru) {
            console.log('Başvuru başarıyla alındı:', basvuru);
            setMevcutBasvuru(basvuru);
            setFormData({
              etkinlikAdi: basvuru.etkinlikAdi,
              etkinlikTuru: basvuru.etkinlikTuru || '',
              digerTuruAciklama: basvuru.digerTuruAciklama || '',
              fakulte: basvuru.etkinlikYeri.fakulte,
              adresDetay: basvuru.etkinlikYeri.detay,
              aciklama: basvuru.aciklama
            });
            if (basvuru.etkinlikGorseli) {
              setMevcutGorsel(basvuru.etkinlikGorseli);
            }
            if (basvuru.sponsorlar?.length) {
              setSponsorVarMi(true);
              setSponsorlar(basvuru.sponsorlar);
            }
            if (basvuru.konusmacilar?.length) {
              setKonusmacilar(basvuru.konusmacilar);
            }
            if (basvuru.belgeler?.length) {
              setSeciliBelgeler(new Set(basvuru.belgeler.map(b => b.tip)));
            }
            if (basvuru.zamanDilimleri && basvuru.zamanDilimleri.length > 0) {
              setZamanDilimleri(basvuru.zamanDilimleri);
            } else {
              if (basvuru.baslangicTarihi && basvuru.bitisTarihi) {
                setZamanDilimleri([{ 
                  baslangic: basvuru.baslangicTarihi, 
                  bitis: basvuru.bitisTarihi 
                }]);
              } else {
                setZamanDilimleri([]);
              }
            }
          }
        } catch (err) {
          console.error('Başvuru yüklenirken hata oluştu:', err);
          setError('Başvuru yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchBasvuru();
  }, [basvuruId]);

  useEffect(() => {
    const fetchKulupler = async () => {
      try {
        console.log('Tüm kulüpleri getirme işlemi başlatılıyor...');
        const kulupler = await getKulupler();
        console.log('Kulüpler başarıyla alındı:', kulupler);
        return kulupler;
      } catch (err) {
        console.error('Kulüpler alınırken hata:', err);
        setError('Kulüpler alınamadı. Lütfen daha sonra tekrar deneyin.');
        return [];
      }
    };

    const fetchKulup = async () => {
      console.log('Kulüp bilgisi alınıyor... User:', user);
      
      try {
        const kulupler = await fetchKulupler();
        
        // Başvurudan kulüp ID'si kontrolü
        if (mevcutBasvuru?.kulupId) {
          console.log('Başvurudan kulüp ID bulundu:', mevcutBasvuru.kulupId);
          const basvuruKulup = kulupler.find(k => k.id === mevcutBasvuru.kulupId);
          
          if (basvuruKulup) {
            console.log('Başvuruya ait kulüp bulundu:', basvuruKulup);
            setKulup(basvuruKulup);
            return;
          } else {
            console.warn('Başvuruya ait kulüp bulunamadı:', mevcutBasvuru.kulupId);
          }
        }
        
        // Kullanıcıdan kulüp ID'si kontrolü
        if (user?.kulupId) {
          console.log('Kullanıcıdan kulüp ID bulundu:', user.kulupId);
          const userKulup = kulupler.find(k => k.id === user.kulupId);
          
          if (userKulup) {
            console.log('Kullanıcıya ait kulüp bulundu:', userKulup);
            setKulup(userKulup);
            return;
          } else {
            console.warn('Kullanıcıya ait kulüp bulunamadı:', user.kulupId);
          }
        }
        
        // Kulüp bulunamadıysa ve kullanıcı kulüp başkanı ise
        if (user?.role === 'kulup_baskani' && kulupler.length > 0) {
          // Kullanıcının e-posta adresine göre kulübü bulmayı dene
          const matchingKulup = kulupler.find(k => 
            k.baskan?.eposta?.toLowerCase() === user.email.toLowerCase()
          );
          
          if (matchingKulup) {
            console.log('E-posta eşleşmesine göre kulüp bulundu:', matchingKulup);
            setKulup(matchingKulup);
            return;
          }
          
          // Son çare: İlk kulübü kullan
          console.warn('Kulüp bulunamadı, ilk kulüp kullanılıyor:', kulupler[0]);
          setKulup(kulupler[0]);
          return;
        }
        
        // Hiçbir şekilde kulüp bulunamadı
        console.error('Kulüp bilgisi bulunamadı');
        setError('Kulüp bilgisi bulunamadı. Lütfen sistem yöneticisine başvurun.');
        
      } catch (err) {
        console.error('Kulüp bilgisi alınırken hata:', err);
        setError('Kulüp bilgisi alınamadı.');
      }
    };

    fetchKulup();
  }, [user, mevcutBasvuru]);

  const handleSponsorEkle = () => {
    if (yeniSponsor.firmaAdi.trim() && yeniSponsor.detay.trim()) {
      setSponsorlar([...sponsorlar, { ...yeniSponsor }]);
      setYeniSponsor({ firmaAdi: '', detay: '' });
    }
  };

  const handleSponsorSil = (index: number) => {
    setSponsorlar(sponsorlar.filter((_, i) => i !== index));
  };

  const handleKonusmaciEkle = () => {
    if (yeniKonusmaci.adSoyad.trim() && yeniKonusmaci.ozgecmis.trim()) {
      setKonusmacilar([...konusmacilar, { ...yeniKonusmaci }]);
      setYeniKonusmaci({ adSoyad: '', ozgecmis: '', aciklama: '' });
    }
  };

  const handleKonusmaciSil = (index: number) => {
    setKonusmacilar(konusmacilar.filter((_, i) => i !== index));
  };

  const handleBelgeChange = (tip: EtkinlikBelge['tip'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files || [])[0] || null;
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Lütfen PDF formatında bir dosya yükleyin!');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name}: Dosya boyutu 5MB'dan küçük olmalıdır!`);
      return;
    }
    setGeciciBelge(prev => ({ ...prev, [tip]: file }));
  };

  const handleBelgeSil = (tip: EtkinlikBelge['tip'], index: number) => {
    setBelgeler(prev => {
      const arr = [...(prev[tip] || [])];
      arr.splice(index, 1);
      const next = { ...prev } as { [key: string]: SelectedBelge[] };
      if (arr.length) next[tip] = arr; else delete next[tip];
      return next;
    });
  };

  const handleBelgeEkle = (tip: EtkinlikBelge['tip']) => {
    const file = geciciBelge[tip] || null;
    if (!file) return;
    setBelgeler(prev => ({
      ...prev,
      [tip]: [ ...(prev[tip] || []), { file, note: geciciNot[tip] || '' } ]
    }));
    // temizle
    setGeciciBelge(prev => ({ ...prev, [tip]: null }));
    setGeciciNot(prev => ({ ...prev, [tip]: '' }));
    if (belgeInputRefs.current[tip]) {
      try { (belgeInputRefs.current[tip] as HTMLInputElement).value = ''; } catch {}
    }
  };

  // Mevcut belgeyi "değiştir" akışı: sadece geçici alana yeni dosyayı koyar, kullanıcı Ekle ile listeye ekler
  const handleBelgeDegistirSec = (tip: EtkinlikBelge['tip']) => {
    belgeReplaceInputRefs.current[tip]?.click();
  };

  const handleBelgeReplaceChange = async (tip: EtkinlikBelge['tip'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files || [])[0] || null;
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Lütfen PDF yükleyin'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Dosya boyutu 5MBı aşmamalı'); return; }
    
    // Sadece seçilen belgeyi veritabanından sil (aynı tipte birden fazla belge varsa sadece ilkini)
    if (mevcutBasvuru?.belgeler) {
      const eskiBelgeler = mevcutBasvuru.belgeler.filter(b => b.tip === tip);
      const eskiBelge = eskiBelgeler[0]; // Sadece ilk belgeyi al
      
      if (eskiBelge && eskiBelge.id && typeof eskiBelge.dosya === 'string') {
        try {
          console.log(`Eski belge siliniyor: ${eskiBelge.id}, dosya yolu: ${eskiBelge.dosya}`);
          const silindi = await etkinlikBelgeSil(eskiBelge.id, eskiBelge.dosya);
          if (silindi) {
            console.log('Eski belge veritabanından başarıyla silindi');
            // Başvuruyu yeniden yükle ve state'i güncelle
            if (basvuruId) {
              try {
                const guncelBasvuru = await getBasvuruById(basvuruId);
                if (guncelBasvuru) {
                  setMevcutBasvuru(guncelBasvuru);
                }
              } catch (refreshError) {
                console.error('Başvuru yeniden yüklenirken hata:', refreshError);
              }
            }
          } else {
            console.error('Eski belge silinemedi');
          }
        } catch (error) {
          console.error('Eski belge silinirken hata:', error);
          // Hata olsa da devam et
        }
      }
    }
    
    // Eski belgeleri temizle ve yeni belgeyi ekle (belge değiştirme işlemi)
    setBelgeler(prev => ({
      ...prev,
      [tip]: [{ file, note: '' }] // Eski belgeleri sil, sadece yeni belgeyi ekle
    }));
    
    // Geçici input temizliği
    setTimeout(() => {
      if (belgeReplaceInputRefs.current[tip]) {
        try { (belgeReplaceInputRefs.current[tip] as HTMLInputElement).value = ''; } catch {}
      }
    }, 0);
  };

  const handleBelgeTipiToggle = (tip: EtkinlikBelge['tip']) => {
    const yeniSeciliBelgeler = new Set(seciliBelgeler);
    if (seciliBelgeler.has(tip)) {
      yeniSeciliBelgeler.delete(tip);
    } else {
      yeniSeciliBelgeler.add(tip);
    }
    setSeciliBelgeler(yeniSeciliBelgeler);
  };

  // Belge notunu popup'ta göster
  const handleBelgeNotuGoster = (belgeAdi: string, belgeNotu: string) => {
    setBelgeNotuPopup({
      isOpen: true,
      belgeAdi,
      belgeNotu
    });
  };

  // Belge notu popup'ını kapat
  const handleBelgeNotuKapat = () => {
    setBelgeNotuPopup({
      isOpen: false,
      belgeAdi: '',
      belgeNotu: ''
    });
  };

  // Mevcut etkinlik görselini göster
  const handleMevcutGorselGoster = async () => {
    if (!mevcutGorsel) return;
    
    try {
      const gorselUrl = await etkinlikGorseliIndir(mevcutGorsel);
      if (gorselUrl) {
        setGorselPopup({
          isOpen: true,
          gorselUrl,
          etkinlikAdi: formData.etkinlikAdi || 'Etkinlik'
        });
      } else {
        alert('Görsel yüklenemiyor. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      alert('Görsel yüklenirken bir hata oluştu.');
    }
  };

  // Görsel popup'ını kapat
  const handleGorselPopupKapat = () => {
    setGorselPopup({
      isOpen: false,
      gorselUrl: '',
      etkinlikAdi: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      // Form verilerini doğrula (yalnız etkinlik revizyonu yapılıyorsa zorunlu)
      if (etkinlikRevizeModu) {
        if (!formData.etkinlikAdi || !formData.fakulte || !formData.adresDetay) {
          setError('Lütfen tüm zorunlu alanları doldurun.');
          setLoading(false);
          return;
        }
        if (!formData.etkinlikTuru) {
          setError('Lütfen etkinlik türünü seçiniz.');
          setLoading(false);
          return;
        }
        if (formData.etkinlikTuru === 'Diğer' && !formData.digerTuruAciklama?.trim()) {
          setError('Diğer etkinlik türü için açıklama giriniz.');
          setLoading(false);
          return;
        }
      }
      
      // Zaman dilimleri kontrolü: artık zorunlu
      if (zamanDilimleri.length === 0) {
        setError('En az bir zaman dilimi eklemeniz gerekiyor.');
        setLoading(false);
        return;
      }
      
      if (zamanDilimleri.length > 0) {
        for (const z of zamanDilimleri) {
          if (!z.baslangic || !z.bitis) {
            setError('Tüm zaman dilimlerinde başlangıç ve bitiş girilmelidir.');
            setLoading(false);
            return;
          }
          const b1 = new Date(z.baslangic);
          const b2 = new Date(z.bitis);

          // Geçerli tarih aralığı doğrulaması (yıl sınırı + kronolojik sıra)
          if (isNaN(b1.getTime()) || isNaN(b2.getTime())) {
            setError('Geçersiz tarih formatı. Lütfen geçerli bir tarih ve saat giriniz.');
            setLoading(false);
            return;
          }
          if (b1.getFullYear() < MIN_YEAR || b1.getFullYear() > MAX_YEAR || 
              b2.getFullYear() < MIN_YEAR || b2.getFullYear() > MAX_YEAR) {
            setError(`Tarih aralığı geçersiz. Yıl ${MIN_YEAR} ile ${MAX_YEAR} arasında olmalıdır.`);
            setLoading(false);
            return;
          }
          if (b1 >= b2) {
            setError('Zaman dilimlerinde bitiş, başlangıçtan sonra olmalıdır.');
            setLoading(false);
            return;
          }
        }
      }
      
      // Kulüp bilgisini al
      if (!kulup) {
        setError('Kulüp bilgisi bulunamadı.');
        setLoading(false);
        return;
      }

      console.log('Başvuru oluşturuluyor, kulüp:', kulup);
      console.log('FormData etkinlikGorseli:', formData.etkinlikGorseli ? 'VAR' : 'YOK');
      if (formData.etkinlikGorseli) {
        console.log('Görsel dosya adı:', formData.etkinlikGorseli.name);
        console.log('Görsel dosya boyutu:', formData.etkinlikGorseli.size);
        console.log('Görsel dosya tipi:', formData.etkinlikGorseli.type);
      }
      
              // Debug: Mevcut başvuru revizyon durumunu logla
        console.log('🔍 Submit Debug - Mevcut başvuru revizyon durumu:', mevcutBasvuru?.revizyon);
        
        // Gerçek değişiklik olup olmadığını kontrol et
        const hasEtkinlikChanges = mevcutBasvuru && (
          mevcutBasvuru.etkinlikAdi !== formData.etkinlikAdi ||
          mevcutBasvuru.etkinlikTuru !== formData.etkinlikTuru ||
          mevcutBasvuru.digerTuruAciklama !== (formData.etkinlikTuru === 'Diğer' ? formData.digerTuruAciklama : undefined) ||
          mevcutBasvuru.etkinlikYeri.fakulte !== formData.fakulte ||
          mevcutBasvuru.etkinlikYeri.detay !== formData.adresDetay ||
          mevcutBasvuru.aciklama !== formData.aciklama ||
          JSON.stringify(mevcutBasvuru.zamanDilimleri) !== JSON.stringify(zamanDilimleri) ||
          JSON.stringify(mevcutBasvuru.sponsorlar) !== JSON.stringify(sponsorlar) ||
          JSON.stringify(mevcutBasvuru.konusmacilar) !== JSON.stringify(konusmacilar)
        );
        
        const hasBelgeChanges = Object.keys(belgeler).length > 0; // Yeni belgeler yüklenmiş
        const hasGorselChanges = !!formData.etkinlikGorseli; // Yeni görsel yüklenmiş
        
        // Sadece gerçek değişiklik varsa revizyon işaretle
        const isRevizyon = mevcutBasvuru && (hasEtkinlikChanges || hasBelgeChanges || hasGorselChanges);
        
        console.log('🔍 Değişiklik Kontrolü:');
        console.log('  - Etkinlik değişiklikleri:', hasEtkinlikChanges);
        console.log('  - Belge değişiklikleri:', hasBelgeChanges);
        console.log('  - Görsel değişiklikleri:', hasGorselChanges);
        console.log('  - Revizyon işaretlenecek mi:', isRevizyon);
        
        // Yeni başvuru oluştur
        const yeniBasvuru: EtkinlikBasvuru = {
        id: mevcutBasvuru?.id || '',
        kulupId: kulup.id,
        kulupAdi: kulup.isim,
        etkinlikAdi: formData.etkinlikAdi,
        etkinlikYeri: {
          fakulte: formData.fakulte,
          detay: formData.adresDetay
        },
        etkinlikTuru: formData.etkinlikTuru as any,
        digerTuruAciklama: formData.etkinlikTuru === 'Diğer' ? (formData.digerTuruAciklama || '') : undefined,
        baslangicTarihi: zamanDilimleri[0]?.baslangic || '',
        bitisTarihi: zamanDilimleri[zamanDilimleri.length - 1]?.bitis || '',
        zamanDilimleri,
        aciklama: formData.aciklama,
         durum: 'Beklemede',
         // Sadece gerçek değişiklik varsa revizyon işaretle
         revizyon: isRevizyon || false,
        sponsorlar: sponsorlar.map(s => ({
          firmaAdi: s.firmaAdi,
          detay: s.detay
        })),
        konusmacilar: konusmacilar.map(k => ({
          adSoyad: k.adSoyad,
          ozgecmis: k.ozgecmis,
          aciklama: k.aciklama
        })),
        belgeler: [],
        onayGecmisi: mevcutBasvuru?.onayGecmisi || {
          danismanOnaylari: [],
          sksOnaylari: []
        }
      };
      
      // Önce başvuruyu kaydet
      let basvuruId: string;
      
      try {
        if (mevcutBasvuru) {
          // Mevcut başvuruyu güncelle
          await updateBasvuru(yeniBasvuru);
          basvuruId = mevcutBasvuru.id;
          console.log('Başvuru güncellendi:', basvuruId);
        } else {
          // Yeni başvuru oluştur
          basvuruId = await saveBasvuru(yeniBasvuru);
          console.log('Yeni başvuru oluşturuldu:', basvuruId);
          
          // Yeni başvuru oluşturulduysa e-posta bildirimi gönder
          try {
            yeniBasvuru.id = basvuruId; // Oluşturulan ID'yi set et
            await sendEtkinlikBasvuruNotification(yeniBasvuru);
            console.log('Etkinlik başvuru bildirimleri gönderildi');
          } catch (emailError) {
            console.error('E-posta bildirimi gönderilirken hata:', emailError);
            // E-posta gönderiminde hata olsa bile işleme devam et
          }
        }
      } catch (err) {
        console.error('Başvuru kaydedilirken hata:', err);
        if (err instanceof Error) {
          setError(`Başvuru kaydedilemedi: ${err.message}`);
        } else {
          setError('Başvuru kaydedilemedi: Bilinmeyen bir hata oluştu.');
        }
        setLoading(false);
        return;
      }
      
      // Etkinlik görseli varsa yükle
      let gorselYolu: string | null = null;
      if (formData.etkinlikGorseli) {
        try {
          console.log('Etkinlik görseli yükleniyor...');
          const kulupSlug = toSlug(kulup.isim);
          const etkinlikSlug = toSlug(formData.etkinlikAdi);
          const tarih = formatTodayDDMMYYYY();
          const gorselAdi = `${kulupSlug}_${etkinlikSlug}_gorsel_${tarih}.${formData.etkinlikGorseli.name.split('.').pop()}`;
          
          gorselYolu = await etkinlikGorseliYukle({
            dosya: formData.etkinlikGorseli,
            dosyaAdi: gorselAdi,
            basvuruId
          });
          
          if (gorselYolu) {
            console.log('Etkinlik görseli yüklendi:', gorselYolu);
            // Başvuruya görsel yolunu ekle
            yeniBasvuru.etkinlikGorseli = gorselYolu;
            console.log('🔍 UpdateBasvuru çağrılmadan önce revizyon durumu:', yeniBasvuru.revizyon);
            console.log('Başvuru güncelleniyor, yeni başvuru objesi:', yeniBasvuru);
            const guncellenmisSonuc = await updateBasvuru(yeniBasvuru);
            console.log('Başvuru güncelleme sonucu:', guncellenmisSonuc);
          }
        } catch (gorselError) {
          console.error('Etkinlik görseli yüklenirken hata:', gorselError);
          setError(`Etkinlik görseli yüklenemedi: ${gorselError instanceof Error ? gorselError.message : 'Bilinmeyen hata'}. Ancak başvuru kaydedildi.`);
          // Görsel yüklenemese bile işleme devam et
        }
      }
      
      // Belgeleri yükle
      const yuklenenBelgePaths: EtkinlikBelge[] = [];
      for (const tip of Object.keys(belgeler)) {
        const items = (belgeler as any)[tip] as SelectedBelge[];
        if (!items || items.length === 0) continue;
        for (let i = 0; i < items.length; i++) {
          const file = items[i].file as File;
          // Not alanı isimlendirmede kullanılmıyor
          try {
            console.log(`${tip} belgesi #${i + 1} yükleniyor...`);
            const kulupSlug = toSlug(kulup.isim);
            const etkinlikSlug = toSlug(formData.etkinlikAdi);
            const belgeTur = tipToSlug(tip);
            const versiyon = `${i + 1}`; // aynı tip için yükleme sırası
            const tarih = formatTodayDDMMYYYY();
            const dosyaAdi = `${kulupSlug}_${etkinlikSlug}_${belgeTur}${versiyon}_${tarih}`;
            const dosyaYolu = await etkinlikBelgeYukle({
              dosya: file,
              dosyaAdi,
              tip,
              basvuruId,
              belgeNotu: items[i].note || undefined // Not bilgisini ekle
            });
            if (dosyaYolu) {
              yuklenenBelgePaths.push({
                tip: tip as EtkinlikBelge['tip'],
                dosyaAdi,
                dosya: dosyaYolu,
                durum: 'Beklemede' // YENİ: Unified sistem için durum
              });
              console.log(`${tip} belgesi yüklendi:`, dosyaYolu);
            } else {
              console.error(`${tip} belgesi yüklenemedi.`);
              setError(`${tip} belgesi yüklenemedi. Lütfen daha sonra tekrar deneyin.`);
            }
          } catch (err) {
            console.error(`${tip} belgesi yüklenirken hata:`, err);
            setError(`${tip} belgesi yüklenemedi.`);
          }
        }
      }
      
      // Yüklenen belgeleri başvuruya ekle
      if (yuklenenBelgePaths.length > 0) {
        try {
          yeniBasvuru.belgeler = yuklenenBelgePaths;
          
          if (mevcutBasvuru) {
            // Mevcut başvuruya yeni yüklenen belgeleri eklerken diğer belgeleri kaybetmemek için birleştir
            const birlesik = {
              ...yeniBasvuru,
              belgeler: [
                ...(mevcutBasvuru.belgeler || []).filter(b => typeof b.dosya === 'string'),
                ...yuklenenBelgePaths,
              ],
            } as EtkinlikBasvuru;
            console.log('🔍 Birleşik başvuru revizyon durumu:', birlesik.revizyon);
            await updateBasvuru(birlesik);
          } else {
            // Yeni başvuru durumunda da yüklenen belgeleri database'e kaydet
            console.log('🔄 Yeni başvuruya belgeler ekleniyor:', yuklenenBelgePaths.length, 'adet');
            const belgeliBasvuru = {
              ...yeniBasvuru,
              id: basvuruId,
              belgeler: yuklenenBelgePaths,
            } as EtkinlikBasvuru;
            console.log('🔍 Belgeli başvuru revizyon durumu:', belgeliBasvuru.revizyon);
            await updateBasvuru(belgeliBasvuru);
            console.log('✅ Belgeler başarıyla eklendi');
          }
        } catch (err) {
          console.error('Belgeler başvuruya eklenirken hata:', err);
          if (err instanceof Error) {
            setError(`Belgeler başvuruya eklenemedi: ${err.message}. Ancak başvuru kaydedildi.`);
          } else {
            setError('Belgeler başvuruya eklenemedi: Bilinmeyen bir hata oluştu. Ancak başvuru kaydedildi.');
          }
          // Başvuru kaydedildiği için kulüp paneline yönlendir
          setTimeout(() => {
            navigate('/kulup-paneli');
          }, 3000);
          return;
        }
      }
      
      navigate('/kulup-paneli');
    } catch (err) {
      console.error('Başvuru kaydedilirken hata oluştu:', err);
      if (err instanceof Error) {
        setError(`Başvuru kaydedilemedi: ${err.message}`);
      } else {
        setError('Başvuru kaydedilemedi: Bilinmeyen bir hata oluştu.');
      }
      setLoading(false);
    }
  };

  if (loading && basvuruId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Başvuru yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Hata</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tekrar Dene
            </button>
            <button
              onClick={() => navigate('/kulup-paneli')}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Kulüp Paneline Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Belge Notu Popup Modal */}
      {belgeNotuPopup.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-96 overflow-hidden">
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Info className="w-5 h-5" />
                Belge Notu
              </h3>
              <button
                onClick={handleBelgeNotuKapat}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Belge:</h4>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg break-words">
                  {belgeNotuPopup.belgeAdi}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Not:</h4>
                <div className="text-gray-900 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="whitespace-pre-wrap break-words">
                    {belgeNotuPopup.belgeNotu || 'Not bulunmuyor.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <button
                onClick={handleBelgeNotuKapat}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Etkinlik Görseli Popup Modal */}
      {gorselPopup.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Image className="w-5 h-5" />
                Etkinlik Görseli - {gorselPopup.etkinlikAdi}
              </h3>
              <button
                onClick={handleGorselPopupKapat}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-gray-50">
              <img
                src={gorselPopup.gorselUrl}
                alt={`${gorselPopup.etkinlikAdi} etkinlik görseli`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="text-gray-600 p-8 text-center"><p>Görsel yüklenemedi</p></div>';
                  }
                }}
              />
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <button
                onClick={handleGorselPopupKapat}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <button
        onClick={() => navigate('/kulup-paneli')}
        className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kulüp Paneline Dön
      </button>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              {mevcutBasvuru?.revizyon ? 'Başvuru Revizyonu' : 'Yeni Etkinlik Başvurusu'}
            </h1>
            {revizeModu && (
              <div className="mt-2 text-xs text-gray-600">
                Görünüm: {belgelerRevizeModu && !etkinlikRevizeModu ? 'Sadece Belgeler' : etkinlikRevizeModu && !belgelerRevizeModu ? 'Sadece Etkinlik Bilgileri' : 'Etkinlik + Belgeler'}
              </div>
            )}
          </div>

          {mevcutBasvuru?.revizyon && (
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h2 className="font-semibold text-yellow-800 mb-2">Revizyon Bilgisi</h2>
                <p className="text-yellow-700">
                  Bu başvuru daha önce reddedilmiş bir başvurunun revizyonudur. 
                  Gerekli düzeltmeleri yaparak tekrar onaya gönderebilirsiniz.
                </p>
              </div>
              
              {mevcutBasvuru && <BasvuruDetay basvuru={mevcutBasvuru} showHistory={true} />}
              
              <div className="border-b my-6"></div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {showEventSections && (
            <>
              <div>
                <label htmlFor="etkinlikAdi" className="block text-sm font-medium text-gray-700 mb-1">
                  Etkinlik Adı <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="etkinlikAdi"
                  value={formData.etkinlikAdi}
                  onChange={(e) => setFormData({...formData, etkinlikAdi: e.target.value})}
                  disabled={isAdvisorApproved && !etkinlikRevizeModu}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

               <div className="space-y-4">
                 {/* Etkinlik Türü */}
                 <div>
                  <label htmlFor="etkinlikTuru" className="block text-sm font-medium text-gray-700 mb-1">
                    Etkinlik Türü <span className="text-red-600">*</span>
                  </label>
                   <select
                     id="etkinlikTuru"
                     value={formData.etkinlikTuru || mevcutBasvuru?.etkinlikTuru || ''}
                     onChange={(e) => setFormData({ ...formData, etkinlikTuru: e.target.value })}
                     disabled={isAdvisorApproved && !etkinlikRevizeModu}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     required
                   >
                     <option value="">Seçiniz</option>
                     <option>Sempozyum / Kongre / Zirve</option>
                     <option>Panel / Seminer / Söyleşi</option>
                     <option>Sosyal Sorumluluk Projesi</option>
                     <option>Gezi / Tur / Kamp</option>
                     <option>Eğitim / Workshop</option>
                     <option>Sportif Aktivite</option>
                     <option>Sanatsal Aktivite</option>
                     <option>Eğlence / Festival / Panayır</option>
                     <option>Basılı / Dijital Yayın</option>
                     <option>Yarışma Düzenleme</option>
                     <option>Yarışma / Etkinlik Katılımı</option>
                     <option>Stant</option>
                     <option>Toplantı</option>
                     <option>Diğer</option>
                   </select>
                   {(formData.etkinlikTuru || mevcutBasvuru?.etkinlikTuru) === 'Diğer' && (
                     <div className="mt-2">
                       <label className="block text-xs text-gray-600 mb-1">Diğer Tür Açıklaması <span className="text-red-600">*</span></label>
                       <input
                         type="text"
                         value={formData.digerTuruAciklama ?? mevcutBasvuru?.digerTuruAciklama ?? ''}
                         onChange={(e) => setFormData({ ...formData, digerTuruAciklama: e.target.value })}
                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                         placeholder="Etkinlik türünü belirtiniz"
                         required
                       />
                     </div>
                   )}
                 </div>
                <div>
                  <label htmlFor="fakulte" className="block text-sm font-medium text-gray-700 mb-1">
                    Etkinlik Yeri <span className="text-red-600">*</span>
                  </label>
                   <select
                    id="fakulte"
                     value={formData.fakulte || mevcutBasvuru?.etkinlikYeri.fakulte || ''}
                    onChange={(e) => setFormData({...formData, fakulte: e.target.value})}
                     disabled={isAdvisorApproved && !etkinlikRevizeModu}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Yer seçiniz</option>
                    {FAKULTELER.map((fakulte) => (
                      <option key={fakulte} value={fakulte}>{fakulte}</option>
                    ))}
                  </select>
                  {formData.fakulte && (
                    (() => {
                      const isSalon = ['Tarihi Hamam', 'Kongre ve Kültür Merkezi', 'Şevket Erk', 'Oditoryum'].some(s => formData.fakulte.includes(s));
                      const isFaculty = !isSalon && formData.fakulte.includes('Fakültesi');
                      const isOkulDisi = formData.fakulte.includes('Okul Dışı');
                      if (isSalon) {
                        return (
                          <div className="mt-2 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            *İletişim Koordinatörlüğü'nden randevu alınması zorunludur.
                          </div>
                        );
                      }
                      if (isFaculty) {
                        return (
                          <div className="mt-2 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            *İlgili fakülte sekreterliğinden randevu/onay alınması zorunludur.
                          </div>
                        );
                      }
                      if (isOkulDisi) {
                        return (
                          <div className="mt-2 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            * Tüm katılımcılar için feragatname belgesi düzenlenmesi zorunludur.
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>

                {formData.fakulte && (
                  <div>
                    <label htmlFor="adresDetay" className="block text-sm font-medium text-gray-700 mb-1">
                      Adres Detayı <span className="text-red-600">*</span>
                    </label>
                     <input
                      type="text"
                      id="adresDetay"
                       value={formData.adresDetay || mevcutBasvuru?.etkinlikYeri.detay || ''}
                      onChange={(e) => setFormData({...formData, adresDetay: e.target.value})}
                       disabled={isAdvisorApproved && !etkinlikRevizeModu}
                      placeholder="BZ01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Tekil tarih alanları kaldırıldı; sadece zaman dilimleri kullanılacak */}

              {/* Çoklu Zaman Dilimleri (opsiyonel) */}
              <div className="mt-4 border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">Zaman Planı <span className="text-red-600">*</span></span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{zamanDilimleri.length} dilim</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setZamanDilimleri(prev => [...prev, { baslangic: '', bitis: '' }])}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + Dilim Ekle
                    </button>
                  </div>
                </div>
                 {zamanDilimleri.length === 0 && (
                   <div className="mt-2 text-xs text-gray-500">En az bir zaman dilimi eklemeniz gerekiyor.</div>
                 )}
                 
                {zamanDilimleri.map((z, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end mt-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Başlangıç Tarihi <span className="text-red-600">*</span></label>
                      <input
                        type="date"
                        value={toInputDate(z.baslangic) || ''}
                        onChange={(e) => {
                          const dateValue = e.target.value; // YYYY-MM-DD formatında
                          const timeStr = toInputTime(z.baslangic) || '00:00';
                          const isoV = dateValue ? toISODateTime(dateValue, timeStr) : '';
                          setZamanDilimleri(prev => prev.map((d, i) => i === idx ? { ...d, baslangic: isoV } : d));
                        }}
                        min={`${MIN_YEAR}-01-01`}
                        max={`${MAX_YEAR}-12-31`}
                        className={`w-full px-3 py-2 border rounded text-sm ${(!z.baslangic || (z.baslangic && z.bitis && new Date(z.baslangic) >= new Date(z.bitis))) ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Saat <span className="text-red-600">*</span></label>
                      <input
                        type="time"
                        value={toInputTime(z.baslangic) || ''}
                        onChange={(e) => {
                          const timeStr = e.target.value;
                          const dateStr = toInputDate(z.baslangic) || '';
                          const isoV = toISODateTime(dateStr, timeStr);
                          setZamanDilimleri(prev => prev.map((d, i) => i === idx ? { ...d, baslangic: isoV } : d));
                        }}
                        className={`w-full px-3 py-2 border rounded text-sm ${(!z.baslangic || (z.baslangic && z.bitis && new Date(z.baslangic) >= new Date(z.bitis))) ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Bitiş Tarihi <span className="text-red-600">*</span></label>
                      <input
                        type="date"
                        value={toInputDate(z.bitis) || ''}
                        onChange={(e) => {
                          const dateValue = e.target.value; // YYYY-MM-DD formatında
                          const timeStr = toInputTime(z.bitis) || '23:59';
                          const isoV = dateValue ? toISODateTime(dateValue, timeStr) : '';
                          setZamanDilimleri(prev => prev.map((d, i) => i === idx ? { ...d, bitis: isoV } : d));
                        }}
                        min={`${MIN_YEAR}-01-01`}
                        max={`${MAX_YEAR}-12-31`}
                        className={`w-full px-3 py-2 border rounded text-sm ${(!z.bitis || (z.baslangic && z.bitis && new Date(z.baslangic) >= new Date(z.bitis))) ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Saat <span className="text-red-600">*</span></label>
                      <input
                        type="time"
                        value={toInputTime(z.bitis) || ''}
                        onChange={(e) => {
                          const timeStr = e.target.value;
                          const dateStr = toInputDate(z.bitis) || '';
                          const isoV = toISODateTime(dateStr, timeStr);
                          setZamanDilimleri(prev => prev.map((d, i) => i === idx ? { ...d, bitis: isoV } : d));
                        }}
                        className={`w-full px-3 py-2 border rounded text-sm ${(!z.bitis || (z.baslangic && z.bitis && new Date(z.baslangic) >= new Date(z.bitis))) ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setZamanDilimleri(prev => prev.filter((_, i) => i !== idx))}
                        className="px-3 py-2 bg-red-50 text-red-700 rounded border border-red-200 text-sm"
                      >
                        Kaldır
                      </button>
                    </div>
                    {z.baslangic && z.bitis && new Date(z.baslangic) >= new Date(z.bitis) && (
                      <div className="sm:col-span-5 text-[11px] text-red-600">Bu dilimde bitiş, başlangıçtan sonra olmalıdır.</div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etkinlik Sponsoru
                </label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!sponsorVarMi}
                         onChange={() => setSponsorVarMi(false)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-2">Hayır</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={sponsorVarMi}
                         onChange={() => setSponsorVarMi(true)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-2">Evet</span>
                    </label>
                  </div>

                  {sponsorVarMi && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Firma Adı"
                          value={yeniSponsor.firmaAdi}
                          onChange={(e) => setYeniSponsor({...yeniSponsor, firmaAdi: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Sponsor Detayı"
                            value={yeniSponsor.detay}
                            onChange={(e) => setYeniSponsor({...yeniSponsor, detay: e.target.value})}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                             onClick={handleSponsorEkle}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {sponsorlar.map((sponsor, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                            <div>
                              <div className="font-medium">{sponsor.firmaAdi}</div>
                              <div className="text-sm text-gray-600">{sponsor.detay}</div>
                            </div>
                            <button
                              type="button"
                           onClick={() => handleSponsorSil(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etkinlik Konuşmacıları
                </label>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <input
                      type="text"
                      placeholder="Ad Soyad"
                      value={yeniKonusmaci.adSoyad}
                      onChange={(e) => setYeniKonusmaci({...yeniKonusmaci, adSoyad: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Özgeçmiş"
                      value={yeniKonusmaci.ozgecmis}
                      onChange={(e) => setYeniKonusmaci({...yeniKonusmaci, ozgecmis: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Açıklama"
                        value={yeniKonusmaci.aciklama}
                        onChange={(e) => setYeniKonusmaci({...yeniKonusmaci, aciklama: e.target.value})}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                       onClick={handleKonusmaciEkle}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {konusmacilar.map((konusmaci, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                        <div>
                          <div className="font-medium">{konusmaci.adSoyad}</div>
                          <div className="text-sm text-gray-600">{konusmaci.ozgecmis}</div>
                          <div className="text-sm text-gray-600">{konusmaci.aciklama}</div>
                        </div>
                        <button
                          type="button"
                           onClick={() => handleKonusmaciSil(index)}
                          className="text-red-600 hover:text-red-700 ml-4"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </>
            )}

            {/* Etkinlik Görseli - Belge bölümünde görünsün */}
            {(showEventSections || showBelgeSection) && (
            <div className="space-y-6">
              <div>
                <label htmlFor="etkinlikGorseli" className="block text-sm font-medium text-gray-700 mb-1">
                  Etkinlik Görseli
                </label>
                  <div className="text-xs text-gray-500 mb-2">
                    300x300 ile 2048x2048 pixel arasında, maksimum 5MB, JPG/JPEG/PNG formatında
                    <div className="flex items-center gap-2 mt-1">
                      {mevcutGorsel ? (
                        <>
                          <span className="block font-medium text-blue-600">• Mevcut görsel var, yeni yüklerseniz değiştirilecektir</span>
                          <button
                            type="button"
                            onClick={handleMevcutGorselGoster}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            <Image className="w-3 h-3" />
                            Mevcut Görseli Gör
                          </button>
                        </>
                      ) : (
                        <span className="block font-medium text-gray-600">• Henüz etkinlik görseli yüklenmemiş</span>
                      )}
                    </div>
                  </div>
                  {/* Gizli file input */}
                  <input
                    type="file"
                    id="etkinlikGorseli"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      
                      // Hata mesajını sıfırla
                      setGorselError(null);
                      
                      if (!file) {
                        setFormData({...formData, etkinlikGorseli: undefined});
                        return;
                      }

                      // Dosya tipi kontrolü
                      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                      if (!allowedTypes.includes(file.type)) {
                        setGorselError('Lütfen sadece JPG, JPEG veya PNG formatında resim dosyası yükleyiniz!');
                        e.target.value = ''; // Input'u temizle
                        setFormData({...formData, etkinlikGorseli: undefined});
                        return;
                      }

                      // Dosya boyutu kontrolü (5MB)
                      const maxSize = 5 * 1024 * 1024; // 5MB
                      if (file.size > maxSize) {
                        setGorselError(`Dosya boyutu çok büyük! Maksimum ${maxSize / 1024 / 1024}MB olmalıdır.`);
                        e.target.value = ''; // Input'u temizle
                        setFormData({...formData, etkinlikGorseli: undefined});
                        return;
                      }

                      // Dosya boyutları kontrolü (image load ile)
                      const img = new window.Image();
                      img.onload = () => {
                        const { width, height } = img;
                        if (width < 300 || height < 300 || width > 2048 || height > 2048) {
                          setGorselError('Görsel boyutu 300x300 ile 2048x2048 pixel arasında olmalıdır!');
                          e.target.value = ''; // Input'u temizle
                          setFormData({...formData, etkinlikGorseli: undefined});
                          return;
                        }
                        
                        // Tüm kontroller başarılı, dosyayı kabul et
                        setFormData({...formData, etkinlikGorseli: file});
                      };
                      img.onerror = () => {
                        setGorselError('Geçersiz resim dosyası! Lütfen geçerli bir JPG, JPEG veya PNG dosyası seçiniz.');
                        e.target.value = ''; // Input'u temizle
                        setFormData({...formData, etkinlikGorseli: undefined});
                        return;
                      };
                      img.src = URL.createObjectURL(file);
                    }}
                    disabled={false}
                    className="hidden"
                  />

                  {/* Görsel seçim butonu */}
                  <button
                    type="button"
                    onClick={() => {
                      const fileInput = document.getElementById('etkinlikGorseli') as HTMLInputElement;
                      if (fileInput) {
                        fileInput.click();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
                  >
                    <Upload className="w-5 h-5" />
                    {mevcutGorsel ? 'Görsel Değiştir' : 'Görsel Seç'}
                  </button>
                  
                  {/* Seçilen yeni görsel bilgisi */}
                  {formData.etkinlikGorseli && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">✅ Yeni görsel seçildi:</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        {formData.etkinlikGorseli.name} - 
                        {(formData.etkinlikGorseli.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-green-500 mt-1">
                        Kaydet butonuna bastığınızda görsel yüklenecek
                        {mevcutGorsel && " ve mevcut görsel değiştirilecek"}
                      </p>
                    </div>
                  )}

                  {/* Görsel hata mesajı */}
                  {gorselError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600 font-medium">Hata:</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">{gorselError}</p>
                    </div>
                  )}
                  
                  {/* Mevcut görsel bilgisi ve görüntüleme butonu */}
                  {mevcutGorsel && !formData.etkinlikGorseli && !gorselError && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-blue-800 font-medium">Mevcut Görsel</div>
                          <div className="text-xs text-blue-600">{mevcutGorsel.split('/').pop()}</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleMevcutGorselGoster}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                        >
                          <Image className="w-4 h-4" />
                          Görüntüle
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Yeni seçilen görsel */}
                  {formData.etkinlikGorseli && !gorselError && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">Başarılı:</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Görsel seçildi: {formData.etkinlikGorseli.name}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                <label htmlFor="aciklama" className="block text-sm font-medium text-gray-700 mb-1">
                  Etkinlik Açıklaması <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="aciklama"
                  value={formData.aciklama}
                  onChange={(e) => setFormData({...formData, aciklama: e.target.value})}
                  disabled={isAdvisorApproved && !etkinlikRevizeModu}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            )}

            {showBelgeSection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Belgeler
              </label>
              {/* Ek belge yükleme butonu kaldırıldı */}
              <div className="space-y-4 divide-y">
                {BELGE_TIPLERI.map(({ tip, label }) => (
                  <div key={tip} className="pt-4 first:pt-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={seciliBelgeler.has(tip)}
                          onChange={() => handleBelgeTipiToggle(tip)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-2 font-medium">{label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-500">
                          {(mevcutBasvuru?.belgeler || []).filter(b => b.tip === tip).length} mevcut • {(belgeler[tip]?.length || 0)} eklenecek
                        </span>
                        {isRevize && (
                          <button
                            type="button"
                            onClick={() => setYuklemeAcik(prev => ({ ...prev, [tip]: !prev[tip] }))}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                          >
                            {yuklemeAcik[tip] ? 'Yüklemeyi Gizle' : 'Belge Yükle'}
                          </button>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center text-xs text-gray-500">Bu başlık altındaki tüm mevcut ve yeni belgeler</label>
                    
                     {seciliBelgeler.has(tip) && (
                      <div className="flex-1 space-y-2">
                        {/* Mevcut belgeler listesi (onaylı/red/beklemede) */}
                        {mevcutBasvuru?.belgeler && mevcutBasvuru.belgeler.filter(b => b.tip === tip).length > 0 && (
                          <div className="space-y-2">
                            {mevcutBasvuru.belgeler
                              .filter(b => b.tip === tip)
                              .map((b, idx) => {
                                const status = b.danismanOnay?.durum || 'Bekliyor';
                                const cls = status === 'Onaylandı' ? 'border-green-200' : status === 'Reddedildi' ? 'border-red-200' : 'border-yellow-200';
                                const pillCls = (who: 'danisman'|'sks') => {
                                  const st = who === 'danisman' ? (b.danismanOnay?.durum || 'Bekliyor') : (b.sksOnay?.durum || 'Bekliyor');
                                  return st === 'Onaylandı' ? 'bg-green-100 text-green-800' : st === 'Reddedildi' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                                };
                                return (
                                  <div key={idx} className={`flex items-center justify-between border rounded-md px-3 py-2 text-xs ${cls}`}>
                                    <div className="min-w-0">
                                      <div className="truncate text-gray-800 font-medium">{b.dosyaAdi}</div>
                                      {/* Belge notu kaldırıldı - artık popup'ta gösterilecek */}
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        <span className={`px-2 py-0.5 rounded ${pillCls('danisman')}`}>Danışman: {b.danismanOnay?.durum || 'Bekliyor'}</span>
                                        <span className={`px-2 py-0.5 rounded ${pillCls('sks')}`}>SKS: {b.sksOnay?.durum || 'Bekliyor'}</span>
                                      </div>
                                    </div>
                                      <div className="flex items-center gap-2">
                                        {/* Info butonu - belge notu varsa göster */}
                                        {b.belgeNotu && (
                                          <button
                                            type="button"
                                            onClick={() => handleBelgeNotuGoster(b.dosyaAdi, b.belgeNotu || '')}
                                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                                            title="Belge notunu gör"
                                          >
                                            <Info className="w-4 h-4" />
                                          </button>
                                        )}
                                       <button type="button" onClick={() => handleBelgeDegistirSec(tip)} className="text-blue-600 hover:text-blue-700">Belgeyi Değiştir</button>
                                       {/* Gizli input (sadece değiştir akışı için) */}
                                       <input
                                         type="file"
                                         ref={el => belgeReplaceInputRefs.current[tip] = el}
                                         accept="application/pdf"
                                         onChange={(e) => handleBelgeReplaceChange(tip, e)}
                                         className="hidden"
                                         disabled={isAdvisorApproved && !belgelerRevizeModu}
                                       />
                                     </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                        {/* 1 adet belge seçme alanı (revizelerde butonla açılır) */}
                        {(!isRevize || yuklemeAcik[tip]) && (
                          <>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="file"
                                ref={el => belgeInputRefs.current[tip] = el}
                                accept="application/pdf"
                                onChange={(e) => handleBelgeChange(tip, e)}
                                className="hidden"
                                disabled={isAdvisorApproved && !belgelerRevizeModu}
                              />
                              <button
                                type="button"
                                onClick={() => belgeInputRefs.current[tip]?.click()}
                                disabled={isAdvisorApproved && !belgelerRevizeModu}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors ${
                                  geciciBelge[tip]
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                                }`}
                              >
                                <Upload className="w-5 h-5" />
                                {geciciBelge[tip] ? (geciciBelge[tip] as File).name : 'Belge Seç'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBelgeEkle(tip)}
                                disabled={!geciciBelge[tip] || (isAdvisorApproved && !belgelerRevizeModu)}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                Ekle
                              </button>
                            </div>
                            {/* Not alanı (geçici yükleme için) */}
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Not (opsiyonel)</label>
                              <input
                                type="text"
                                value={geciciNot[tip] || ''}
                                onChange={(e) => setGeciciNot(prev => ({ ...prev, [tip]: e.target.value }))}
                                disabled={isAdvisorApproved && !belgelerRevizeModu}
                                placeholder={tip === 'AfisBasim' ? 'Afiş talebi hakkında not ekleyin (opsiyonel)' : 'Belge ile ilgili not ekleyin (opsiyonel)'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            </div>
                          </>
                        )}
                        {/* Eklenmiş belgeler listesi */}
                        {(belgeler[tip] && belgeler[tip].length > 0) && (
                          <div className="space-y-1">
                            {belgeler[tip].map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-1 rounded">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-sm text-gray-700 truncate">{item.file.name}</span>
                                  {item.note && (
                                    <button
                                      type="button"
                                      onClick={() => handleBelgeNotuGoster(item.file.name, item.note)}
                                      className="p-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full flex-shrink-0"
                                      title="Belge notunu gör"
                                    >
                                      <Info className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <button type="button" onClick={() => handleBelgeSil(tip, idx)} className="text-red-600 hover:text-red-700 text-xs ml-2">Kaldır</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )}

      <button
              type="submit"
        disabled={loading || (isAdvisorApproved && !belgelerRevizeModu && !etkinlikRevizeModu)}
              className={`w-full font-medium py-3 px-6 rounded-lg transition-colors ${
                loading ? 'bg-gray-400 cursor-not-allowed' :
                mevcutBasvuru?.revizyon
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
        {loading ? 'Kaydediliyor...' : 
         mevcutBasvuru?.revizyon ? (belgelerRevizeModu || etkinlikRevizeModu ? 'Revizyonu Gönder' : 'Revize Edilmiş Başvuruyu Gönder') : 'Danışman Onayına Gönder'}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}