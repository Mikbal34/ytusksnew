import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, PlusCircle, ArrowLeft, Trash2, LogOut, Edit3, X, Upload, Users, Building2 } from 'lucide-react';
import { EtkinlikBasvuru } from '../types';
import { getBasvurular, clearStorage } from '../utils/supabaseStorage';
import { BasvuruKart } from './BasvuruKart';
import { useAuth } from '../context/AuthContext';
import { createRevizyon, addGorselRevizyon, addKonusmaciRevizyonlari, addSponsorRevizyonlari, RevizyonSecimleri, KonusmaciDelta, SponsorDelta } from '../utils/revizyonService';

export function KulupPaneli() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [basvurular, setBasvurular] = useState<EtkinlikBasvuru[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Revizyon modal state'leri
  const [showRevizyonModal, setShowRevizyonModal] = useState(false);
  const [secilenBasvuru, setSecilenBasvuru] = useState<EtkinlikBasvuru | null>(null);
  const [revizyonSecimleri, setRevizyonSecimleri] = useState<RevizyonSecimleri>({
    gorsel: false,
    konusmaci: false,
    sponsor: false
  });
  const [revizyonAciklama, setRevizyonAciklama] = useState('');
  const [revizyonLoading, setRevizyonLoading] = useState(false);
  
  // Revizyon form state'leri
  const [yeniGorsel, setYeniGorsel] = useState<File | null>(null);
  const [yeniKonusmacilar, setYeniKonusmacilar] = useState<Array<{adSoyad: string, ozgecmis: string, aciklama: string}>>([]);
  const [yeniKonusmaciAdSoyad, setYeniKonusmaciAdSoyad] = useState('');
  const [yeniKonusmaciOzgecmis, setYeniKonusmaciOzgecmis] = useState('');
  const [yeniKonusmaciAciklama, setYeniKonusmaciAciklama] = useState('');
  const [yeniSponsorlar, setYeniSponsorlar] = useState<Array<{firmaAdi: string, detay: string}>>([]);
  const [yeniSponsorFirmaAdi, setYeniSponsorFirmaAdi] = useState('');
  const [yeniSponsorDetay, setYeniSponsorDetay] = useState('');
  const [cikarilacakKonusmacilar, setCikarilacakKonusmacilar] = useState<string[]>([]);
  const [cikarilacakSponsorlar, setCikarilacakSponsorlar] = useState<string[]>([]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const fetchBasvurular = async () => {
    try {
      setLoading(true);
      const data = await getBasvurular();
      
      console.log('Tüm başvurular:', data.length);
      console.log('Revizyon olan başvurular:', data.filter(b => b.revizyon).length);
      
      // Başvuruları, revize edilmiş olanlar da dahil olmak üzere kategoriye göre ayır
      const revizeEdilenBasvuruIdleri = new Set<string>();
      const revizeBasvurular = data.filter(b => b.revizyon);
      
      // Revize edilmiş başvuruların orijinal ID'lerini topla
      revizeBasvurular.forEach(b => {
        if (b.orijinalBasvuruId) {
          revizeEdilenBasvuruIdleri.add(b.orijinalBasvuruId);
          console.log(`Revize başvuru: ${b.id} - Orijinal başvuru: ${b.orijinalBasvuruId}`);
        }
      });
      
      // Revize edilmemiş ve danışman onayı bekleyen başvurular
      const bekleyenler = data.filter(b => {
        const danismanOnayBekliyor = !b.danismanOnay;
        return danismanOnayBekliyor && !b.revizyon;
      });
      
      // Revize edilmemiş ve danışman tarafından onaylanmış, SKS onayı bekleyen başvurular
      const sksOnayiBekleyenler = data.filter(b => {
        return b.danismanOnay?.durum === 'Onaylandı' && !b.sksOnay && !b.revizyon;
      });
      
      // Revize edilmemiş ve SKS tarafından onaylanmış başvurular
      const onaylananlar = data.filter(b => {
        return b.sksOnay?.durum === 'Onaylandı' && !b.revizyon;
      });
      
      // Revize edilmemiş ve reddedilen başvurular (ve henüz revize edilmemişler)
      const reddedilenler = data.filter(b => {
        const reddedildi = (b.danismanOnay?.durum === 'Reddedildi' || b.sksOnay?.durum === 'Reddedildi');
        const revizeEdilmedi = !revizeEdilenBasvuruIdleri.has(b.id);
        return reddedildi && !b.revizyon && revizeEdilmedi;
      });
      
      // Kulüp tarafından revize edilmiş başvurular
      const revizeEdilenler = data.filter(b => b.revizyon);
      
      console.log('Danışman onayı bekleyenler:', bekleyenler.length);
      console.log('SKS onayı bekleyenler:', sksOnayiBekleyenler.length);
      console.log('Onaylananlar:', onaylananlar.length);
      console.log('Reddedilenler:', reddedilenler.length);
      console.log('Revize edilenler:', revizeEdilenler.length);
      console.log('Revize edilen orijinal başvuru ID\'leri:', [...revizeEdilenBasvuruIdleri]);
      
      // 🎯 Sadece aktif başvuruları göster (revize edilenlerin eski hallerini gizle)
      const aktifBasvurular = data.filter(b => {
        // Eğer bu başvuru revize edilmişse, gösterme (çünkü yeni revize hali var)
        if (revizeEdilenBasvuruIdleri.has(b.id)) {
          console.log(`❌ Eski başvuru gizlendi: ${b.id} (${b.etkinlikAdi}) - Revize edilmiş`);
          return false;
        }
        return true;
      });
      
      console.log(`📋 Toplam ${data.length} başvuru → ${aktifBasvurular.length} aktif başvuru gösteriliyor`);
      setBasvurular(aktifBasvurular);
      setError(null);
    } catch (error) {
      console.error('Başvurular alınırken hata oluştu:', error);
      setError('Başvurular yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Tüm başvuruları al
  useEffect(() => {
    fetchBasvurular();
  }, []);

  // Konum değişikliklerinde
  useEffect(() => {
    // Kulüp paneli ana sayfasındaysa başvuruları yükle
    if (location.pathname === '/kulup-paneli') {
      console.log('Kulüp paneline dönüldü, başvurular yeniden yükleniyor...');
      fetchBasvurular();
    }
  }, [location.pathname]);

  const handleRevize = async () => {
    console.log('handleRevize çağrıldı, başvurular yeniden yükleniyor...');
    fetchBasvurular();
  };

  const handleClear = async () => {
    if (window.confirm('Tüm başvuru verilerini silmek istediğinize emin misiniz?')) {
      try {
        setLoading(true);
        await clearStorage();
        setBasvurular([]);
        setError(null);
      } catch (err) {
        console.error('Veriler silinirken hata oluştu:', err);
        setError('Veriler silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Revizyon modal açma
  const handleRevizyonAc = (basvuru: EtkinlikBasvuru) => {
    setSecilenBasvuru(basvuru);
    setRevizyonSecimleri({ gorsel: false, konusmaci: false, sponsor: false });
    setRevizyonAciklama('');
    setYeniGorsel(null);
    setYeniKonusmacilar([]);
    setYeniSponsorlar([]);
    setCikarilacakKonusmacilar([]);
    setCikarilacakSponsorlar([]);
    setShowRevizyonModal(true);
  };

  // Revizyon modal kapatma
  const handleRevizyonKapat = () => {
    setShowRevizyonModal(false);
    setSecilenBasvuru(null);
    setRevizyonSecimleri({ gorsel: false, konusmaci: false, sponsor: false });
    setRevizyonAciklama('');
    setYeniGorsel(null);
    setYeniKonusmacilar([]);
    setYeniSponsorlar([]);
    setCikarilacakKonusmacilar([]);
    setCikarilacakSponsorlar([]);
  };

  // Revizyon gönderme
  const handleRevizyonGonder = async () => {
    if (!secilenBasvuru) return;
    
    // En az bir alan seçilmeli
    if (!revizyonSecimleri.gorsel && !revizyonSecimleri.konusmaci && !revizyonSecimleri.sponsor) {
      alert('Lütfen en az bir alan seçiniz.');
      return;
    }

    // Görsel seçildiyse dosya yüklenmeli
    if (revizyonSecimleri.gorsel && !yeniGorsel) {
      alert('Lütfen yeni etkinlik görseli seçiniz.');
      return;
    }

    setRevizyonLoading(true);
    
    try {
      // Revizyon oluştur
      const revizyonId = await createRevizyon(
        secilenBasvuru.id,
        revizyonSecimleri,
        revizyonAciklama
      );

      // Görsel revizyonu
      if (revizyonSecimleri.gorsel && yeniGorsel) {
        await addGorselRevizyon(revizyonId, secilenBasvuru.id, yeniGorsel, yeniGorsel.name);
      }

      // Konuşmacı revizyonları
      if (revizyonSecimleri.konusmaci) {
        const konusmaciDeltas: KonusmaciDelta[] = [];
        
        // Yeni konuşmacılar ekle
        yeniKonusmacilar.forEach(konusmaci => {
          konusmaciDeltas.push({
            islem: 'ekle',
            yeni_ad_soyad: konusmaci.adSoyad,
            yeni_ozgecmis: konusmaci.ozgecmis,
            yeni_aciklama: konusmaci.aciklama
          });
        });
        
        // Mevcut konuşmacıları çıkar
        cikarilacakKonusmacilar.forEach(konusmaciId => {
          konusmaciDeltas.push({
            islem: 'cikar',
            hedef_konusmaci_id: konusmaciId
          });
        });
        
        if (konusmaciDeltas.length > 0) {
          await addKonusmaciRevizyonlari(revizyonId, secilenBasvuru.id, konusmaciDeltas);
        }
      }

      // Sponsor revizyonları
      if (revizyonSecimleri.sponsor) {
        const sponsorDeltas: SponsorDelta[] = [];
        
        // Yeni sponsorlar ekle
        yeniSponsorlar.forEach(sponsor => {
          sponsorDeltas.push({
            islem: 'ekle',
            yeni_firma_adi: sponsor.firmaAdi,
            yeni_detay: sponsor.detay
          });
        });
        
        // Mevcut sponsorları çıkar
        cikarilacakSponsorlar.forEach(sponsorId => {
          sponsorDeltas.push({
            islem: 'cikar',
            hedef_sponsor_id: sponsorId
          });
        });
        
        if (sponsorDeltas.length > 0) {
          await addSponsorRevizyonlari(revizyonId, secilenBasvuru.id, sponsorDeltas);
        }
      }

      alert('Revizyon talebi başarıyla gönderildi. Onay sürecine alınacaktır.');
      handleRevizyonKapat();
      fetchBasvurular(); // Listeyi yenile
      
    } catch (error) {
      console.error('Revizyon gönderilirken hata:', error);
      alert('Revizyon gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setRevizyonLoading(false);
    }
  };

  // Konuşmacı ekleme (kontrollü)
  const handleKonusmaciEkle = () => {
    const ad = yeniKonusmaciAdSoyad.trim();
    const oz = yeniKonusmaciOzgecmis.trim();
    const ac = yeniKonusmaciAciklama.trim();
    if (!ad) {
      alert('Lütfen konuşmacının ad soyadını giriniz.');
      return;
    }
    setYeniKonusmacilar([...yeniKonusmacilar, { adSoyad: ad, ozgecmis: oz, aciklama: ac }]);
    setYeniKonusmaciAdSoyad('');
    setYeniKonusmaciOzgecmis('');
    setYeniKonusmaciAciklama('');
  };

  // Konuşmacı çıkarma
  const handleKonusmaciCikar = (konusmaciId: string) => {
    setCikarilacakKonusmacilar([...cikarilacakKonusmacilar, konusmaciId]);
  };

  // Sponsor ekleme (kontrollü)
  const handleSponsorEkle = () => {
    const firma = yeniSponsorFirmaAdi.trim();
    const det = yeniSponsorDetay.trim();
    if (!firma) {
      alert('Lütfen sponsor firma adını giriniz.');
      return;
    }
    setYeniSponsorlar([...yeniSponsorlar, { firmaAdi: firma, detay: det }]);
    setYeniSponsorFirmaAdi('');
    setYeniSponsorDetay('');
  };

  // Sponsor çıkarma
  const handleSponsorCikar = (sponsorId: string) => {
    setCikarilacakSponsorlar([...cikarilacakSponsorlar, sponsorId]);
  };

  // Revize edilen ve reddedilen başvurular için filtreleme
  // Önce revize edilmiş başvuruların orijinal ID'lerini topla
  const revizeEdilenBasvuruIdleri = new Set<string>();
  
  // Orijinal başvuru ID bilgisini topla
  basvurular.forEach(basvuru => {
    if (basvuru.revizyon === true && basvuru.orijinalBasvuruId) {
      console.log(`Revize edilmiş başvuru: ${basvuru.id}, Orijinal başvuru: ${basvuru.orijinalBasvuruId}`);
      // Bu set'e orijinal başvuru ID'lerini ekle
      revizeEdilenBasvuruIdleri.add(basvuru.orijinalBasvuruId);
    }
  });

  console.log('Revize edilen başvuruların orijinal ID\'leri:', [...revizeEdilenBasvuruIdleri]);

  // Revize edilmiş başvurular (revizyon=true olanlar)
  const revizeBasvurular = basvurular.filter(b => b.revizyon === true);

  // Reddedilmiş başvurular (Danışman veya SKS tarafından reddedilen ve henüz revize edilmemiş olanlar)
  const reddedilenBasvurular = basvurular.filter(b => {
    const isDanisman = b.danismanOnay?.durum === 'Reddedildi';
    const isSks = b.sksOnay?.durum === 'Reddedildi';
    const isReddedilmis = isDanisman || isSks; // durum kolonu kaldırıldı
    const isRevizyon = b.revizyon === true;
    const isRevizeEdilmemis = !revizeEdilenBasvuruIdleri.has(b.id);
    
    // 🎯 Bu başvuru revize edilmişse gizle (yeni revize hali var)
    if (revizeEdilenBasvuruIdleri.has(b.id)) {
      return false;
    }
    
    return isReddedilmis && !isRevizyon && isRevizeEdilmemis;
  });

  // Revize gerektiren (sadece şu durumlar):
  // - Danışman etkinliği onayladı (SKS bekliyor) ama belgeler danışman tarafından onaylanmamış
  // - SKS etkinliği onayladı ama belgeler SKS tarafından onaylanmamış
  const hasUnapprovedDocsForDanisman = (b: EtkinlikBasvuru) =>
    (b.belgeler && b.belgeler.some(d => !d.danismanOnay)) ||
    (b.ekBelgeler && b.ekBelgeler.some(e => !e.danismanOnay));

  const hasUnapprovedDocsForSks = (b: EtkinlikBasvuru) =>
    (b.belgeler && b.belgeler.some(d => !d.sksOnay)) ||
    (b.ekBelgeler && b.ekBelgeler.some(e => !e.sksOnay));

  const revizeGerektirenBasvurular = basvurular.filter(b => {
    // 🎯 Bu başvuru revize edilmişse gizle (yeni revize hali var)  
    if (revizeEdilenBasvuruIdleri.has(b.id)) {
      return false;
    }
    
    return (b.danismanOnay?.durum === 'Onaylandı' && !b.sksOnay && hasUnapprovedDocsForDanisman(b)) ||
           (b.sksOnay?.durum === 'Onaylandı' && hasUnapprovedDocsForSks(b));
  });

  // Yardımcılar
  const allDocsSksApproved = (b: EtkinlikBasvuru) => {
    const mainOk = (b.belgeler || []).every(doc => !doc || doc.sksOnay?.durum === 'Onaylandı');
    const extraOk = (b.ekBelgeler || []).every(doc => !doc || doc.sksOnay?.durum === 'Onaylandı');
    return mainOk && extraOk;
  };
  const hasAnyDocSksNotApproved = (b: EtkinlikBasvuru) => {
    const mainPending = (b.belgeler || []).some(doc => doc && doc.sksOnay?.durum !== 'Onaylandı');
    const extraPending = (b.ekBelgeler || []).some(doc => doc && doc.sksOnay?.durum !== 'Onaylandı');
    return mainPending || extraPending;
  };

  // Süreç Tamamlandı: SKS onaylı ve tüm belgeler SKS onaylı (veya hiç belge yok)
  const surecTamamlandi = basvurular.filter(b => {
    // 🎯 Bu başvuru revize edilmişse gizle (yeni revize hali var)
    if (revizeEdilenBasvuruIdleri.has(b.id)) {
      return false;
    }
    
    return b.sksOnay?.durum === 'Onaylandı' && allDocsSksApproved(b);
  });

  // Onay Bekleyenler (tek liste): Reddedilmemiş ve tamamlanmamış tüm başvurular
  const isRejected = (b: EtkinlikBasvuru) =>
    b.danismanOnay?.durum === 'Reddedildi' || b.sksOnay?.durum === 'Reddedildi'; // durum kolonu kaldırıldı
  const isCompleted = (b: EtkinlikBasvuru) => b.sksOnay?.durum === 'Onaylandı' && allDocsSksApproved(b);
  const onayBekleyenlerBirlesik = basvurular.filter(b => {
    // 🎯 Bu başvuru revize edilmişse gizle (yeni revize hali var)
    if (revizeEdilenBasvuruIdleri.has(b.id)) {
      return false;
    }
    
    return !isRejected(b) && !isCompleted(b);
  });

  // Başvuruları filtreleme işlemleri
  useEffect(() => {
    if (basvurular.length > 0) {
      console.log('Toplam başvuru sayısı:', basvurular.length);
      console.log('Revize edilen başvurular:', revizeBasvurular.length);
      console.log('Reddedilen başvurular:', reddedilenBasvurular.length);
      console.log('Revize edilmiş başvurular:', basvurular.filter(b => b.revizyon === true).length);
    }
  }, [basvurular]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Başvurular yükleniyor...</p>
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
          <button 
            onClick={() => handleRevize()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kulüp Paneli</h1>
        <button
          onClick={handleLogout}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Çıkış Yap
        </button>
      </div>
      
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            onClick={() => navigate('/kulup-paneli/formlar')}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
          >
            <FileText className="w-4 h-4" /> Formlar
          </button>
          <button
            onClick={() => navigate('/kulup-paneli/yeni-etkinlik-basvuru')}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" /> Yeni Etkinlik Başvurusu
          </button>
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto"
          >
            <Trash2 className="w-4 h-4" /> Temizle
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:col-span-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              Onay Bekleyenler
            </h2>
            <div className="space-y-3">
              {onayBekleyenlerBirlesik.map((basvuru) => (
                <BasvuruKart key={basvuru.id} basvuru={basvuru} onRevize={handleRevize} showDetailedStatuses showHeaderStatus={false} showDocumentStatuses />
              ))}
              {onayBekleyenlerBirlesik.length === 0 && (
                <div className="text-center py-8 text-gray-500">Onay bekleyen başvuru yok.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              Reddedilen Başvurular
            </h2>
            <div className="space-y-3">
              {reddedilenBasvurular.map((basvuru) => (
                <BasvuruKart 
                  key={basvuru.id} 
                  basvuru={basvuru}
                  onRevize={handleRevize}
                  showDocumentStatuses
                />
              ))}
              {reddedilenBasvurular.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Reddedilen başvuru bulunmamaktadır.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              Süreç Tamamlandı
            </h2>
            <div className="space-y-3">
              {surecTamamlandi.map((basvuru) => (
                <div key={basvuru.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{basvuru.etkinlikAdi}</h3>
                      <p className="text-sm text-gray-600 mt-1">{basvuru.kulupAdi}</p>
                      <div className="text-sm text-gray-600 mt-1">
                        {basvuru.zamanDilimleri && basvuru.zamanDilimleri.length > 0 ? (
                          basvuru.zamanDilimleri.map((zaman, index) => (
                            <div key={index}>
                              <div>Başlangıç: {new Date(zaman.baslangic).toLocaleString('tr-TR')}</div>
                              <div>Bitiş: {new Date(zaman.bitis).toLocaleString('tr-TR')}</div>
                              {basvuru.zamanDilimleri!.length > 1 && index < basvuru.zamanDilimleri!.length - 1 && <hr className="my-1" />}
                            </div>
                          ))
                        ) : (
                          <div>
                            <div>Başlangıç: {basvuru.baslangicTarihi ? new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR') : 'Belirtilmemiş'}</div>
                            <div>Bitiş: {basvuru.bitisTarihi ? new Date(basvuru.bitisTarihi).toLocaleString('tr-TR') : 'Belirtilmemiş'}</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          ✅ Süreç Tamamlandı
                        </span>
                        {basvuru.etkinlikGorseli && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            📷 Görsel Mevcut
                          </span>
                        )}
                        {basvuru.konusmacilar && basvuru.konusmacilar.length > 0 && (
                          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            👥 {basvuru.konusmacilar.length} Konuşmacı
                          </span>
                        )}
                        {basvuru.sponsorlar && basvuru.sponsorlar.length > 0 && (
                          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            🏢 {basvuru.sponsorlar.length} Sponsor
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleRevizyonAc(basvuru)}
                        className="flex items-center gap-2 bg-yellow-600 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Revize Et
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {surecTamamlandi.length === 0 && (
                <div className="text-center py-8 text-gray-500">Tamamlanan başvuru bulunmamaktadır.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revizyon Modal */}
      {showRevizyonModal && secilenBasvuru && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">
                Revizyon Talebi - {secilenBasvuru.etkinlikAdi}
              </h3>
              <button
                onClick={handleRevizyonKapat}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Revizyon Alanları Seçimi */}
              <div>
                <h4 className="text-lg font-medium text-gray-700 mb-4">Hangi alanları revize etmek istiyorsunuz?</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={revizyonSecimleri.gorsel}
                      onChange={(e) => setRevizyonSecimleri({...revizyonSecimleri, gorsel: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">📷 Etkinlik Görseli</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={revizyonSecimleri.konusmaci}
                      onChange={(e) => setRevizyonSecimleri({...revizyonSecimleri, konusmaci: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">👥 Konuşmacılar</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={revizyonSecimleri.sponsor}
                      onChange={(e) => setRevizyonSecimleri({...revizyonSecimleri, sponsor: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">🏢 Sponsorlar</span>
                  </label>
                </div>
              </div>

              {/* Revizyon Açıklaması */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revizyon Açıklaması (Opsiyonel)
                </label>
                <textarea
                  value={revizyonAciklama}
                  onChange={(e) => setRevizyonAciklama(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Revizyon yapma sebebinizi açıklayınız..."
                />
              </div>

              {/* Görsel Revizyonu */}
              {revizyonSecimleri.gorsel && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Yeni Etkinlik Görseli
                  </h4>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setYeniGorsel(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {yeniGorsel && (
                    <div className="mt-2 text-sm text-green-600">
                      ✅ Seçilen dosya: {yeniGorsel.name}
                    </div>
                  )}
                </div>
              )}

              {/* Konuşmacı Revizyonu */}
              {revizyonSecimleri.konusmaci && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Konuşmacı Değişiklikleri
                  </h4>
                  
                  {/* Mevcut Konuşmacılar */}
                  {secilenBasvuru.konusmacilar && secilenBasvuru.konusmacilar.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-600 mb-2">Mevcut Konuşmacılar (Çıkarmak için işaretleyin):</h5>
                      <div className="space-y-2">
                        {secilenBasvuru.konusmacilar.map((konusmaci) => (
                          <label key={konusmaci.id} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={cikarilacakKonusmacilar.includes(konusmaci.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleKonusmaciCikar(konusmaci.id);
                                } else {
                                  setCikarilacakKonusmacilar(cikarilacakKonusmacilar.filter(id => id !== konusmaci.id));
                                }
                              }}
                              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            />
                            <span className="text-gray-700">{konusmaci.adSoyad}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Yeni Konuşmacılar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-gray-600">Yeni Konuşmacı Ekle:</h5>
                      <button
                        type="button"
                        onClick={handleKonusmaciEkle}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        + Ekle
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Ad Soyad"
                        value={yeniKonusmaciAdSoyad}
                        onChange={(e) => setYeniKonusmaciAdSoyad(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Özgeçmiş"
                        value={yeniKonusmaciOzgecmis}
                        onChange={(e) => setYeniKonusmaciOzgecmis(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Açıklama"
                        value={yeniKonusmaciAciklama}
                        onChange={(e) => setYeniKonusmaciAciklama(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {yeniKonusmacilar.length > 0 && (
                      <div className="mt-3">
                        <h6 className="text-sm font-medium text-gray-600 mb-2">Eklenecek Konuşmacılar</h6>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {yeniKonusmacilar.map((k, i) => (
                            <li key={i}>{k.adSoyad}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sponsor Revizyonu */}
              {revizyonSecimleri.sponsor && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Sponsor Değişiklikleri
                  </h4>
                  
                  {/* Mevcut Sponsorlar */}
                  {secilenBasvuru.sponsorlar && secilenBasvuru.sponsorlar.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-600 mb-2">Mevcut Sponsorlar (Çıkarmak için işaretleyin):</h5>
                      <div className="space-y-2">
                        {secilenBasvuru.sponsorlar.map((sponsor) => (
                          <label key={sponsor.id} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={cikarilacakSponsorlar.includes(sponsor.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleSponsorCikar(sponsor.id);
                                } else {
                                  setCikarilacakSponsorlar(cikarilacakSponsorlar.filter(id => id !== sponsor.id));
                                }
                              }}
                              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            />
                            <span className="text-gray-700">{sponsor.firmaAdi}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Yeni Sponsorlar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-gray-600">Yeni Sponsor Ekle:</h5>
                      <button
                        type="button"
                        onClick={handleSponsorEkle}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        + Ekle
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Firma Adı"
                        value={yeniSponsorFirmaAdi}
                        onChange={(e) => setYeniSponsorFirmaAdi(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Detay"
                        value={yeniSponsorDetay}
                        onChange={(e) => setYeniSponsorDetay(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {yeniSponsorlar.length > 0 && (
                      <div className="mt-3">
                        <h6 className="text-sm font-medium text-gray-600 mb-2">Eklenecek Sponsorlar</h6>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {yeniSponsorlar.map((s, i) => (
                            <li key={i}>{s.firmaAdi}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Butonlar */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <button
                  onClick={handleRevizyonKapat}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700"
                >
                  İptal
                </button>
                <button
                  onClick={handleRevizyonGonder}
                  disabled={revizyonLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {revizyonLoading ? 'Gönderiliyor...' : 'Revizyon Talebini Gönder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}