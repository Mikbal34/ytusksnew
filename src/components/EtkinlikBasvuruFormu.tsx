import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Upload } from 'lucide-react';
import { EtkinlikBasvuru, Sponsor, Konusmaci, EtkinlikBelge, Kulup } from '../types';
import { saveBasvuru, getBasvuruById, updateBasvuru, etkinlikBelgeYukle, getKulupler } from '../utils/supabaseStorage';
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
  'İşletme Fakültesi',
  'Tarihi Hamam',
  'Kongre Merkezi',
  'Şevket Erk Konferans Salonu',
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
  fakulte: string;
  adresDetay: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  aciklama: string;
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
    fakulte: '',
    adresDetay: '',
    baslangicTarihi: '',
    bitisTarihi: '',
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
  const [kulup, setKulup] = useState<Kulup | null>(null);
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
              fakulte: basvuru.etkinlikYeri.fakulte,
              adresDetay: basvuru.etkinlikYeri.detay,
              baslangicTarihi: basvuru.baslangicTarihi,
              bitisTarihi: basvuru.bitisTarihi,
              aciklama: basvuru.aciklama
            });
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

  const handleBelgeReplaceChange = (tip: EtkinlikBelge['tip'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files || [])[0] || null;
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Lütfen PDF yükleyin'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Dosya boyutu 5MBı aşmamalı'); return; }
    // Değiştirilecek belgeyi, yeni belge olarak ekleme sırasına koyuyoruz; not alanını boş bırakıyoruz.
    setBelgeler(prev => ({
      ...prev,
      [tip]: [ ...(prev[tip] || []), { file, note: '' } ]
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      // Form verilerini doğrula
      if (!formData.etkinlikAdi || !formData.fakulte || !formData.adresDetay || zamanDilimleri.length === 0) {
        setError('Lütfen tüm zorunlu alanları doldurun.');
        setLoading(false);
        return;
      }
      
      // Tekil tarih alanları kaldırıldığı için sadece dilimler doğrulanır

      // Zaman dilimleri kontrolü
      for (const z of zamanDilimleri) {
        if (!z.baslangic || !z.bitis) {
          setError('Tüm zaman dilimlerinde başlangıç ve bitiş girilmelidir.');
          setLoading(false);
          return;
        }
        const b1 = new Date(z.baslangic);
        const b2 = new Date(z.bitis);
        if (b1 >= b2) {
          setError('Zaman dilimlerinde bitiş, başlangıçtan sonra olmalıdır.');
          setLoading(false);
          return;
        }
      }
      
      // Kulüp bilgisini al
      if (!kulup) {
        setError('Kulüp bilgisi bulunamadı.');
        setLoading(false);
        return;
      }

      console.log('Başvuru oluşturuluyor, kulüp:', kulup);
      
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
        baslangicTarihi: zamanDilimleri[0]?.baslangic || '',
        bitisTarihi: zamanDilimleri[zamanDilimleri.length - 1]?.bitis || '',
        zamanDilimleri,
        aciklama: formData.aciklama,
        durum: 'Beklemede',
        revizyon: mevcutBasvuru?.revizyon || false,
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
      
      // Belgeleri yükle
      const yuklenenBelgePaths: EtkinlikBelge[] = [];
      for (const tip of Object.keys(belgeler)) {
        const items = (belgeler as any)[tip] as SelectedBelge[];
        if (!items || items.length === 0) continue;
        for (let i = 0; i < items.length; i++) {
          const file = items[i].file as File;
          const note = (items[i].note || '').trim();
          const safeNote = note ? `_${note.substring(0, 50).replace(/\s+/g, '_')}` : '';
          try {
            console.log(`${tip} belgesi #${i + 1} yükleniyor...`);
            const uniqueSuffix = `_${Date.now()}_${i + 1}`;
            const dosyaAdi = `${formData.etkinlikAdi}_${tip}${safeNote}${uniqueSuffix}`;
            const dosyaYolu = await etkinlikBelgeYukle({
              dosya: file,
              dosyaAdi,
              tip,
              basvuruId
            });
            if (dosyaYolu) {
              yuklenenBelgePaths.push({
                tip: tip as EtkinlikBelge['tip'],
                dosyaAdi,
                dosya: dosyaYolu
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
            await updateBasvuru(birlesik);
          } else {
            // Yeni başvuru durumunda belgeler kaydedilmiş olmalı
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
                  Etkinlik Adı
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
                <div>
                  <label htmlFor="fakulte" className="block text-sm font-medium text-gray-700 mb-1">
                    Etkinlik Yeri
                  </label>
                  <select
                    id="fakulte"
                    value={formData.fakulte}
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
                      const isSalon = ['Tarihi Hamam', 'Kongre Merkezi', 'Şevket Erk'].some(s => formData.fakulte.includes(s));
                      const isFaculty = !isSalon && formData.fakulte.includes('Fakültesi');
                      if (isSalon) {
                        return (
                          <div className="mt-2 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            *İlgili salon için iletişim koordinatörlüğünden randevu alınması zorunludur.
                          </div>
                        );
                      }
                      if (isFaculty) {
                        return (
                          <div className="mt-2 text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            *İlgili fakülteden randevu alınması zorunludur.
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
                      Adres Detayı
                    </label>
                    <input
                      type="text"
                      id="adresDetay"
                      value={formData.adresDetay}
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
                    <span className="text-sm font-medium text-gray-800">Zaman Planı</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{zamanDilimleri.length} dilim</span>
                    {(formData.baslangicTarihi && formData.bitisTarihi) && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Tekil aralık etkin</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(formData.baslangicTarihi && formData.bitisTarihi) && (
                      <button
                        type="button"
                        onClick={() => setZamanDilimleri(prev => [...prev, { baslangic: formData.baslangicTarihi, bitis: formData.bitisTarihi }])}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Tekil aralığı dilimlere ekle
                      </button>
                    )}
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
                  <div className="mt-2 text-xs text-gray-500">Örn: İlk gün 15:00-18:00, ikinci gün 08:00-12:00 gibi birden fazla aralığı burada tanımlayın.</div>
                )}
                {zamanDilimleri.map((z, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end mt-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Başlangıç</label>
                      <input
                        type="datetime-local"
                        value={z.baslangic}
                        onChange={(e) => setZamanDilimleri(prev => prev.map((d, i) => i === idx ? { ...d, baslangic: e.target.value } : d))}
                        className={`w-full px-3 py-2 border rounded ${(!z.baslangic || (z.baslangic && z.bitis && new Date(z.baslangic) >= new Date(z.bitis))) ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Bitiş</label>
                      <input
                        type="datetime-local"
                        value={z.bitis}
                        onChange={(e) => setZamanDilimleri(prev => prev.map((d, i) => i === idx ? { ...d, bitis: e.target.value } : d))}
                        className={`w-full px-3 py-2 border rounded ${(!z.bitis || (z.baslangic && z.bitis && new Date(z.baslangic) >= new Date(z.bitis))) ? 'border-red-300' : 'border-gray-300'}`}
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
                      {idx === zamanDilimleri.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setZamanDilimleri(prev => [...prev, { baslangic: '', bitis: '' }])}
                          className="px-3 py-2 bg-gray-50 text-gray-700 rounded border text-sm"
                        >
                          Bir tane daha
                        </button>
                      )}
                    </div>
                    {z.baslangic && z.bitis && new Date(z.baslangic) >= new Date(z.bitis) && (
                      <div className="sm:col-span-3 text-[11px] text-red-600">Bu dilimde bitiş, başlangıçtan sonra olmalıdır.</div>
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

              <div>
              <label htmlFor="aciklama" className="block text-sm font-medium text-gray-700 mb-1">
                Etkinlik Açıklaması
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
            </>
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
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        <span className={`px-2 py-0.5 rounded ${pillCls('danisman')}`}>Danışman: {b.danismanOnay?.durum || 'Bekliyor'}</span>
                                        <span className={`px-2 py-0.5 rounded ${pillCls('sks')}`}>SKS: {b.sksOnay?.durum || 'Bekliyor'}</span>
                                      </div>
                                    </div>
                                      <div className="flex items-center gap-2">
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
                                placeholder={tip === 'AfisBasim' ? 'Afiş talebi hakkında not...' : 'Belge ile ilgili not...'}
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
                                <span className="text-sm text-gray-700 truncate">{item.file.name}{item.note ? ` — ${item.note}` : ''}</span>
                                <button type="button" onClick={() => handleBelgeSil(tip, idx)} className="text-red-600 hover:text-red-700 text-xs">Kaldır</button>
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
  );
}