import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, FileDown, Users, Calendar, X, Eye, FileText, LogOut, AlertCircle, Trash2 } from 'lucide-react';
import { EtkinlikBasvuru, Kulup, EkBelge } from '../types';
import { getBasvurular, updateBasvuru, getKulupler, etkinlikBelgeIndir, belgeOnayla, belgeReddet, ekBelgeIndir, ekBelgeOnayla, ekBelgeReddet, temizleTekrarOnaylari } from '../utils/supabaseStorage';
import { generatePDF } from '../utils/pdf';
import { Takvim } from './Takvim';
import { BasvuruDetay } from './BasvuruDetay';
import { useAuth } from '../context/AuthContext';
import { EkBelgeListesi } from './EkBelgeListesi';
import { sendSksOnayNotification, sendSksRedNotification } from '../utils/emailService';

// Genişletilmiş EkBelge tipi - etkinlik bilgilerini içerir
interface ExtendedEkBelge extends EkBelge {
  etkinlikAdi: string;
  kulupAdi: string;
}

export const SKSPaneli: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [aramaMetni, setAramaMetni] = useState('');
  const [kulupAramaMetni, setKulupAramaMetni] = useState('');
  const [etkinlikAramaMetni, setEtkinlikAramaMetni] = useState('');
  // const [belgeAramaMetni] = useState('');
  const [secilenBasvuru, setSecilenBasvuru] = useState<EtkinlikBasvuru | null>(null);
  const [detayBasvuru, setDetayBasvuru] = useState<EtkinlikBasvuru | null>(null);
  const [redSebebi, setRedSebebi] = useState('');
  const [basvurular, setBasvurular] = useState<EtkinlikBasvuru[]>([]);
  const [onaylananEtkinlikler, setOnaylananEtkinlikler] = useState<EtkinlikBasvuru[]>([]);
  const [kulupler, setKulupler] = useState<Kulup[]>([]);
  const [showKulupDetay, setShowKulupDetay] = useState<Kulup | null>(null);
  const [showEtkinlikler, setShowEtkinlikler] = useState(false);
  const [tumBasvurular, setTumBasvurular] = useState<EtkinlikBasvuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEkBelgeYonetimi, setShowEkBelgeYonetimi] = useState(false);
  const [ekBelgesiOlanEtkinlikler, setEkBelgesiOlanEtkinlikler] = useState<EtkinlikBasvuru[]>([]);
  const [bekleyenEkBelgeSayisi, setBekleyenEkBelgeSayisi] = useState(0);
  const [tumEkBelgeler, setTumEkBelgeler] = useState<ExtendedEkBelge[]>([]);
  // const [belgeFiltresi] = useState<'hepsi' | 'bekleyen' | 'onaylanan' | 'reddedilen'>('hepsi');
  // const [belgeSiralama] = useState<'yeni' | 'eski'>('yeni');
  // const [activeRedBelgeId] = useState<string | null>(null);
  const [temizlemeLoading, setTemizlemeLoading] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    console.log('SKSPaneli bileşeni yükleniyor...');
    const fetchBasvurular = async () => {
      try {
        setLoading(true);
        const allBasvurular = await getBasvurular();
        
        if (Array.isArray(allBasvurular)) {
          console.log('Tüm başvurular:', allBasvurular.length);
          
          // Ek belgesi olan etkinlikleri filtrele - daha geniş bir filtreleme kullanıyoruz
          const ekBelgesiOlanlar = allBasvurular.filter(basvuru => {
            const hasEkBelgeler = basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0;
            if (hasEkBelgeler) {
              console.log(`Ek belgesi olan etkinlik bulundu: ${basvuru.id} - ${basvuru.etkinlikAdi}`);
              console.log('Ek belgeler:', basvuru.ekBelgeler);
            }
            return hasEkBelgeler;
          });
          
          console.log('Ek belgesi olan etkinlikler:', ekBelgesiOlanlar.length);
          setEkBelgesiOlanEtkinlikler(ekBelgesiOlanlar);
          
          // Tüm ek belgeleri düz bir listede topla (yalnızca danışman onayından geçenler SKS'e düşsün)
          const tumBelgeler: ExtendedEkBelge[] = [];
          allBasvurular.forEach(basvuru => {
            if (basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0) {
              basvuru.ekBelgeler
                .filter(belge => belge.danismanOnay?.durum === 'Onaylandı')
                .forEach(belge => {
                  tumBelgeler.push({
                    ...belge,
                    etkinlikAdi: basvuru.etkinlikAdi,
                    kulupAdi: basvuru.kulupAdi
                  });
                });
            }
          });
          
          console.log('Toplam ek belge sayısı:', tumBelgeler.length);
          setTumEkBelgeler(tumBelgeler);
          
          // Onaylanmamış ek belgesi olan başvuruları tespit et
          const onaylanmamisEkBelgesiOlanlar = allBasvurular.filter(basvuru => 
            basvuru.ekBelgeler && 
            basvuru.ekBelgeler.some(belge => belge.danismanOnay?.durum === 'Onaylandı' && !belge.sksOnay)
          );
          
          console.log('Onaylanmamış ek belgesi olan etkinlikler:', onaylanmamisEkBelgesiOlanlar.length);
          setBekleyenEkBelgeSayisi(onaylanmamisEkBelgesiOlanlar.length);
          
          // SKS onayı bekleyen başvurular (danışman onaylı ama SKS onaysız)
          const bekleyenBasvurular = allBasvurular.filter(b => 
            b.danismanOnay?.durum === 'Onaylandı' && !b.sksOnay
          );
          console.log('Bekleyen başvurular:', bekleyenBasvurular);
          setBasvurular(bekleyenBasvurular);
          
          // SKS onaylı başvurular
          const onaylananlar = allBasvurular.filter(b => 
            b.danismanOnay?.durum === 'Onaylandı' && b.sksOnay?.durum === 'Onaylandı'
          );
          console.log('Onaylanan etkinlikler:', onaylananlar);
          setOnaylananEtkinlikler(onaylananlar);
          
          // SKS tarafından incelenmiş tüm başvurular
          const incelenenler = allBasvurular.filter(b => b.sksOnay);
          console.log('İncelenen tüm başvurular:', incelenenler);
          setTumBasvurular(incelenenler);
          
          console.log('Kulüpler getiriliyor...');
          const kuluplerData = await getKulupler();
          console.log('Kulüpler alındı:', kuluplerData.length);
          setKulupler(kuluplerData);
          setError(null);
        }
      } catch (error) {
        console.error('Başvuruları getirme hatası:', error);
        setError('Başvuruları yüklerken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBasvurular();
  }, []);

  const filtrelenmisBasvurular = basvurular.filter(basvuru =>
    basvuru.etkinlikAdi.toLowerCase().includes(aramaMetni.toLowerCase()) ||
    basvuru.kulupAdi.toLowerCase().includes(aramaMetni.toLowerCase())
  );

  const filtrelenmisKulupler = kulupler.filter(kulup =>
    kulup.isim.toLowerCase().includes(kulupAramaMetni.toLowerCase())
  );

  const filtrelenmisEtkinlikler = tumBasvurular.filter(basvuru =>
    basvuru.etkinlikAdi.toLowerCase().includes(etkinlikAramaMetni.toLowerCase()) ||
    basvuru.kulupAdi.toLowerCase().includes(etkinlikAramaMetni.toLowerCase())
  );

  // Yardımcı: SKS tarafından onaylanmamış (bekleyen) belge var mı?
  const hasAnyDocSksNotApproved = (b: EtkinlikBasvuru) => {
    const mainPending = (b.belgeler || []).some(doc => doc && doc.sksOnay?.durum !== 'Onaylandı');
    const extraPending = (b.ekBelgeler || []).some(doc => doc && doc.sksOnay?.durum !== 'Onaylandı');
    return mainPending || extraPending;
  };

  // Etkinlik SKS onaylı, belgeler SKS onayı bekliyor
  const etkinlikOnayliBelgelerBekleyen = tumBasvurular.filter(b => 
    b.sksOnay?.durum === 'Onaylandı' && hasAnyDocSksNotApproved(b)
  );

  const handleBelgeIndir = async (dosya: string, dosyaAdi: string) => {
    try {
      const downloadUrl = await etkinlikBelgeIndir(dosya);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = dosyaAdi;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Belge indirilemedi. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (error) {
      console.error('Belge indirme hatası:', error);
      alert('Belge indirme işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const handleEkBelgeIndir = async (dosya: string, dosyaAdi: string) => {
    try {
      const downloadUrl = await ekBelgeIndir(dosya);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = dosyaAdi;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Belge indirilemedi. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (error) {
      console.error('Belge indirme hatası:', error);
      alert('Belge indirme işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const handleEkBelgeOnayla = async (belgeId: string) => {
    try {
      const success = await ekBelgeOnayla(belgeId, 'SKS');
      if (success) {
        alert('Belge başarıyla onaylandı.');
        
        // Başvuruları yeniden yükle
        const guncelBasvurular = await getBasvurular();
        
        // Ek belgeleri güncelle (yalnızca danışman onaylı olanlar)
        const tumBelgeler: ExtendedEkBelge[] = [];
        guncelBasvurular.forEach(basvuru => {
          if (basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0) {
            basvuru.ekBelgeler
              .filter(belge => belge.danismanOnay?.durum === 'Onaylandı')
              .forEach(belge => {
                tumBelgeler.push({
                  ...belge,
                  etkinlikAdi: basvuru.etkinlikAdi,
                  kulupAdi: basvuru.kulupAdi
                });
              });
          }
        });
        setTumEkBelgeler(tumBelgeler);
        
        // Diğer state'leri güncelle
        const ekBelgesiOlanlar = guncelBasvurular.filter(basvuru => 
          basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0
        );
        setEkBelgesiOlanEtkinlikler(ekBelgesiOlanlar);
        
        const bekleyenEkBelgeSayisi = tumBelgeler.filter(belge => !belge.sksOnay).length;
        setBekleyenEkBelgeSayisi(bekleyenEkBelgeSayisi);
        
        // Detay gösterilen başvuruyu güncelle
        if (detayBasvuru) {
          const guncelDetayBasvuru = guncelBasvurular.find(b => b.id === detayBasvuru.id);
          if (guncelDetayBasvuru) {
            setDetayBasvuru(guncelDetayBasvuru);
          }
        }
      } else {
        alert('Belge onaylanırken bir hata oluştu. Lütfen tekrar deneyiniz.');
      }
    } catch (error) {
      console.error('Belge onaylama hatası:', error);
      alert('Belge onaylanırken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
  };

  const handleEkBelgeReddet = async (belgeId: string, redSebebi: string) => {
    try {
      if (!redSebebi.trim()) {
        alert('Lütfen red sebebini belirtiniz!');
        return;
      }
      
      const success = await ekBelgeReddet(belgeId, 'SKS', redSebebi);
      if (success) {
        alert('Belge başarıyla reddedildi.');
        
        // Başvuruları yeniden yükle
        const guncelBasvurular = await getBasvurular();
        
        // Ek belgeleri güncelle (yalnızca danışman onaylı olanlar)
        const tumBelgeler: ExtendedEkBelge[] = [];
        guncelBasvurular.forEach(basvuru => {
          if (basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0) {
            basvuru.ekBelgeler
              .filter(belge => belge.danismanOnay?.durum === 'Onaylandı')
              .forEach(belge => {
                tumBelgeler.push({
                  ...belge,
                  etkinlikAdi: basvuru.etkinlikAdi,
                  kulupAdi: basvuru.kulupAdi
                });
              });
          }
        });
        setTumEkBelgeler(tumBelgeler);
        
        // Diğer state'leri güncelle
        const ekBelgesiOlanlar = guncelBasvurular.filter(basvuru => 
          basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0
        );
        setEkBelgesiOlanEtkinlikler(ekBelgesiOlanlar);
        
        const bekleyenEkBelgeSayisi = tumBelgeler.filter(belge => !belge.sksOnay).length;
        setBekleyenEkBelgeSayisi(bekleyenEkBelgeSayisi);
        
        // Detay gösterilen başvuruyu güncelle
        if (detayBasvuru) {
          const guncelDetayBasvuru = guncelBasvurular.find(b => b.id === detayBasvuru.id);
          if (guncelDetayBasvuru) {
            setDetayBasvuru(guncelDetayBasvuru);
          }
        }
      } else {
        alert('Belge reddedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
      }
    } catch (error) {
      console.error('Belge reddetme hatası:', error);
      alert('Belge reddedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
  };

  // Normal belge onaylama işlemi
  const handleBelgeOnayla = async (belgeId: string) => {
    try {
      const success = await belgeOnayla(belgeId, 'SKS');
      if (success) {
        alert('Belge başarıyla onaylandı.');
        
        // Başvuruları yeniden yükle
        const guncelBasvurular = await getBasvurular();
        
        // SKS onayı bekleyen başvurular listesini güncelle (danışman onaylı + SKS onaysız)
        const bekleyenBasvurular = guncelBasvurular.filter(b => 
          b.danismanOnay?.durum === 'Onaylandı' && !b.sksOnay
        );
        setBasvurular(bekleyenBasvurular);
        
        // Detay gösterilen başvuruyu güncelle
        if (detayBasvuru) {
          const guncelDetayBasvuru = guncelBasvurular.find(b => b.id === detayBasvuru.id);
          if (guncelDetayBasvuru) {
            setDetayBasvuru(guncelDetayBasvuru);
          }
        }
      } else {
        alert('Belge onaylanırken bir hata oluştu. Lütfen tekrar deneyiniz.');
      }
    } catch (error) {
      console.error('Belge onaylama hatası:', error);
      alert('Belge onaylanırken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
  };

  // Belge reddetme işlemi
  const handleBelgeReddet = async (belgeId: string, redSebebi: string) => {
    try {
      if (!redSebebi.trim()) {
        alert('Lütfen red sebebini belirtiniz!');
        return;
      }
      
      const success = await belgeReddet(belgeId, 'SKS', redSebebi);
      if (success) {
        alert('Belge başarıyla reddedildi.');
        
        // Başvuruları yeniden yükle
        const guncelBasvurular = await getBasvurular();
        
        // SKS onayı bekleyen başvurular listesini güncelle
        const bekleyenBasvurular = guncelBasvurular.filter(b => 
          b.danismanOnay?.durum === 'Onaylandı' && !b.sksOnay
        );
        setBasvurular(bekleyenBasvurular);
        
        // Detay gösterilen başvuruyu güncelle
        if (detayBasvuru) {
          const guncelDetayBasvuru = guncelBasvurular.find(b => b.id === detayBasvuru.id);
          if (guncelDetayBasvuru) {
            setDetayBasvuru(guncelDetayBasvuru);
          }
        }
      } else {
        alert('Belge reddedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
      }
    } catch (error) {
      console.error('Belge reddetme hatası:', error);
      alert('Belge reddedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
  };

  // Kullanılmıyor: Ek belge listesi ayrı modülde gösteriliyor
  // const filtrelenmisEkBelgeler = ...

  // Not used in this view
  // const getBelgeDurumBilgisi = (belge: ExtendedEkBelge) => { /* ... */ };

  // Başvuru onaylama işlemi
  const handleOnay = async (basvuru: EtkinlikBasvuru) => {
    try {
      console.log('Başvuru onaylanıyor:', basvuru.id);
      
      // Belgeler ve ek belgeler için durumlar
      const hasRejectedMainDocs = !!(basvuru.belgeler && basvuru.belgeler.some(b => b.sksOnay?.durum === 'Reddedildi'));
      const hasRejectedAdditionalDocs = !!(basvuru.ekBelgeler && basvuru.ekBelgeler.some(b => b.sksOnay?.durum === 'Reddedildi'));
      const hasUnreviewedMainDocs = !!(basvuru.belgeler && basvuru.belgeler.some(b => !b.sksOnay));
      const hasUnreviewedAdditionalDocs = !!(basvuru.ekBelgeler && basvuru.ekBelgeler.some(b => !b.sksOnay));

      // Uyarı/Onay akışı: Reddedilmiş veya incelenmemiş belge varsa yine de onaylama imkanı ver
      if (hasRejectedMainDocs || hasRejectedAdditionalDocs || hasUnreviewedMainDocs || hasUnreviewedAdditionalDocs) {
        const reasons: string[] = [];
        if (hasRejectedMainDocs) reasons.push('reddedilmiş ana belge var');
        if (hasRejectedAdditionalDocs) reasons.push('reddedilmiş ek belge var');
        if (hasUnreviewedMainDocs) reasons.push('incelenmemiş ana belge var');
        if (hasUnreviewedAdditionalDocs) reasons.push('incelenmemiş ek belge var');
        const msg = `Dikkat: Bu başvuru için ${reasons.join(', ')}. Etkinliği yine de onaylıyor musunuz?`;
        const confirmed = window.confirm(msg);
        if (!confirmed) return;
      }
      
      // Durum kontrolü - eğer danışman zaten onaylamışsa durum "Onaylandı" olmalı
      let durum = basvuru.durum;
      if (basvuru.danismanOnay?.durum === 'Onaylandı') {
        durum = 'Onaylandı';
        console.log('Danışman zaten onaylamış, durum "Onaylandı" olarak güncelleniyor');
      }
      
      const guncelBasvuru: EtkinlikBasvuru = {
        ...basvuru,
        sksOnay: {
          durum: 'Onaylandı',
          tarih: new Date().toISOString()
        },
        durum: durum
      };
      
      await updateBasvuru(guncelBasvuru);
      console.log('Başvuru başarıyla onaylandı');
      
      // Email bildirimini gönder
      try {
        await sendSksOnayNotification(guncelBasvuru);
        console.log('SKS onay bildirimi gönderildi');
      } catch (emailError) {
        console.error('Onay e-posta bildirimi gönderilirken hata:', emailError);
        // E-posta gönderiminde hata olsa bile işleme devam et
      }
      
      setBasvurular(basvurular.filter(b => b.id !== basvuru.id));
      setOnaylananEtkinlikler([...onaylananEtkinlikler, guncelBasvuru]);
      setTumBasvurular([...tumBasvurular, guncelBasvuru]);
    } catch (error) {
      console.error('Başvuru onaylanırken hata oluştu:', error);
      alert('Başvuru onaylanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  // Başvuru reddetme işlemi
  const handleRed = async () => {
    if (!redSebebi.trim() || !secilenBasvuru) {
      alert('Lütfen red sebebini belirtiniz!');
      return;
    }
    
    try {
      console.log('Başvuru reddediliyor:', secilenBasvuru.id);
      const guncelBasvuru: EtkinlikBasvuru = {
        ...secilenBasvuru,
        sksOnay: {
          durum: 'Reddedildi',
          tarih: new Date().toISOString(),
          redSebebi
        },
        durum: 'Reddedildi'
      };
      
      await updateBasvuru(guncelBasvuru);
      console.log('Başvuru başarıyla reddedildi');
      
      // Email bildirimini gönder
      try {
        await sendSksRedNotification(guncelBasvuru, redSebebi);
        console.log('SKS red bildirimi gönderildi');
      } catch (emailError) {
        console.error('Red e-posta bildirimi gönderilirken hata:', emailError);
        // E-posta gönderiminde hata olsa bile işleme devam et
      }
      
      setBasvurular(basvurular.filter(b => b.id !== secilenBasvuru.id));
      setSecilenBasvuru(null);
      setRedSebebi('');
      setTumBasvurular([...tumBasvurular, guncelBasvuru]);
    } catch (error) {
      console.error('Başvuru reddedilirken hata oluştu:', error);
      alert('Başvuru reddedilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  // Tekrarlanan onay kayıtlarını temizleme fonksiyonu
  const handleTemizleOnayKayitlari = async () => {
    if (window.confirm('Tekrarlanan onay kayıtlarını temizlemek istediğinize emin misiniz?')) {
      setTemizlemeLoading(true);
      try {
        const { silinmis, hata } = await temizleTekrarOnaylari();
        
        if (hata) {
          alert(`Hata oluştu: ${hata.message || JSON.stringify(hata)}`);
        } else {
          if (silinmis > 0) {
            alert(`${silinmis} adet tekrarlanan onay kaydı başarıyla temizlendi.`);
            
            // Başvuruları yeniden yükle
            const guncelBasvurular = await getBasvurular();
            
        // SKS onayı bekleyen başvurular (danışman onaylı + SKS onaysız)
        const bekleyenBasvurular = guncelBasvurular.filter(b => 
          b.danismanOnay?.durum === 'Onaylandı' && !b.sksOnay
        );
            setBasvurular(bekleyenBasvurular);
            
            // SKS onaylı başvurular
            const onaylananlar = guncelBasvurular.filter(b => 
              b.danismanOnay?.durum === 'Onaylandı' && b.sksOnay?.durum === 'Onaylandı'
            );
            setOnaylananEtkinlikler(onaylananlar);
            
            // SKS tarafından incelenmiş tüm başvurular
            const incelenenler = guncelBasvurular.filter(b => b.sksOnay);
            setTumBasvurular(incelenenler);
            
          } else {
            alert('Temizlenecek tekrarlanan onay kaydı bulunamadı.');
          }
        }
      } catch (error) {
        console.error('Temizleme işlemi hatası:', error);
        alert('Temizleme işlemi sırasında bir hata oluştu.');
      } finally {
        setTemizlemeLoading(false);
      }
    }
  };

  const refreshBasvurular = async () => {
    try {
      const guncelBasvurular = await getBasvurular();
      
      // SKS onayı bekleyen başvurular (danışman onaylı ama SKS onaysız)
      const bekleyenBasvurular = guncelBasvurular.filter(b => 
        b.danismanOnay?.durum === 'Onaylandı' && !b.sksOnay
      );
      setBasvurular(bekleyenBasvurular);
    } catch (error) {
      console.error('Başvuruları yenileme hatası:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Hata!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">SKS Onay Paneli</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowEkBelgeYonetimi(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex-grow sm:flex-grow-0"
            >
              <FileText className="w-4 h-4" />
              Ek Belge Yönetimi
              {bekleyenEkBelgeSayisi > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {bekleyenEkBelgeSayisi}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowEtkinlikler(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-grow sm:flex-grow-0"
            >
              <Calendar className="w-4 h-4" />
              Tüm Etkinlikler
            </button>
            <button
              onClick={handleTemizleOnayKayitlari}
              disabled={temizlemeLoading}
              className={`flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex-grow sm:flex-grow-0 ${temizlemeLoading ? 'cursor-not-allowed' : ''}`}
            >
              <Trash2 className="w-4 h-4" />
              Tekrarlı Onayları Temizle
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex-grow sm:flex-grow-0"
            >
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Etkinlik veya kulüp ara..."
                  value={aramaMetni}
                  onChange={(e) => setAramaMetni(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
                Hem Etkinlik Hem Belgeler Onay Bekliyor
              </h2>
              <div className="space-y-4">
                {filtrelenmisBasvurular.map((basvuru) => {
                  // Belgeler arasında reddedilmiş veya onaylanmamış belge var mı kontrol et
                  const hasRejectedDocuments = basvuru.belgeler && basvuru.belgeler.some(belge => belge.sksOnay?.durum === 'Reddedildi');
                  const hasUnreviewedDocuments = basvuru.belgeler && basvuru.belgeler.some(belge => !belge.sksOnay);
                  
                  // Ek belgeleri var mı kontrol et
                  const hasAdditionalDocs = basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0;
                  const hasUnreviewedAdditionalDocs = hasAdditionalDocs && basvuru.ekBelgeler && basvuru.ekBelgeler.some(belge => !belge.sksOnay);
                  
                  // Onay düğmesi her durumda aktif; onay öncesi uyarı/confirm verilecek
                  const isApproveButtonActive = true;
                  
                  return (
                    <div key={basvuru.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-800">{basvuru.etkinlikAdi}</h3>
                          {basvuru.revizyon && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              Revize Edilmiş Başvuru
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{basvuru.kulupAdi}</p>
                        <div className="text-sm text-gray-600 mt-1">
                          <div>Başlangıç: {new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR')}</div>
                          <div>Bitiş: {new Date(basvuru.bitisTarihi).toLocaleString('tr-TR')}</div>
                        </div>
                        
                        {/* Eğer reddedilmiş veya onaylanmamış belge varsa uyarı göster */}
                        {hasRejectedDocuments && (
                          <div className="mt-2 text-red-600 text-xs font-medium">
                            Reddedilmiş belgesi olan bir başvuru!
                          </div>
                        )}
                        {!hasRejectedDocuments && hasUnreviewedDocuments && (
                          <div className="mt-2 text-yellow-600 text-xs font-medium">
                            Henüz incelenmemiş belgeler mevcut.
                          </div>
                        )}
                        {hasAdditionalDocs && (
                          <div className="mt-2 text-blue-600 text-xs font-medium">
                            Bu başvurunun ek belgeleri var{hasUnreviewedAdditionalDocs ? ' (incelenmemiş)' : ''}.
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            // Onaylanmamış veya reddedilmiş belge olabilir; handleOnay içinde kapsamlı confirm var
                            handleOnay(basvuru);
                          }}
                          className={`flex items-center gap-2 ${
                            isApproveButtonActive
                              ? 'bg-emerald-600 hover:bg-emerald-700' 
                              : 'bg-gray-400 cursor-not-allowed'
                          } text-white px-3 py-1.5 rounded-lg transition-colors`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Onayla
                        </button>
                        <button 
                          onClick={() => setSecilenBasvuru(basvuru)}
                          className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Reddet
                        </button>
                        <button
                          onClick={() => setDetayBasvuru(basvuru)}
                          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                        >
                          <Eye className="w-4 h-4" />
                          Detaylar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filtrelenmisBasvurular.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Arama kriterlerine uygun başvuru bulunamadı.
                  </div>
                )}
              </div>
            </div>

            {/* Etkinlik Onaylı, Belgeler Onay Bekliyor */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                Etkinlik Onaylı, Belgeler Onay Bekliyor
              </h2>
              <div className="space-y-4">
                {etkinlikOnayliBelgelerBekleyen.length === 0 && (
                  <div className="text-center py-8 text-gray-500">Bu ölçüte uyan başvuru bulunmuyor.</div>
                )}
                {etkinlikOnayliBelgelerBekleyen.map((basvuru) => (
                  <div key={basvuru.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-800">{basvuru.etkinlikAdi}</h3>
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Belgeler bekliyor</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{basvuru.kulupAdi}</p>
                      <div className="text-sm text-gray-600 mt-1">
                        <div>Başlangıç: {new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR')}</div>
                        <div>Bitiş: {new Date(basvuru.bitisTarihi).toLocaleString('tr-TR')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setDetayBasvuru(basvuru)}
                        className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                      >
                        <Eye className="w-4 h-4" />
                        Detaylar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Takvim onaylananEtkinlikler={onaylananEtkinlikler} />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-semibold text-gray-800">Kulüp Listesi</h2>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Kulüp ara..."
                value={kulupAramaMetni}
                onChange={(e) => setKulupAramaMetni(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-4">
              {filtrelenmisKulupler.map((kulup) => (
                <button
                  key={kulup.id}
                  onClick={() => setShowKulupDetay(kulup)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <h3 className="font-medium text-gray-800">{kulup.isim}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Danışman: {kulup.akademikDanisman.adSoyad}
                  </p>
                  <p className="text-sm text-gray-600">
                    Başkan: {kulup.baskan.adSoyad}
                  </p>
                </button>
              ))}
              {filtrelenmisKulupler.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Arama kriterlerine uygun kulüp bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>

        {secilenBasvuru && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Red Sebebi</h3>
              <textarea
                value={redSebebi}
                onChange={(e) => setRedSebebi(e.target.value)}
                placeholder="Red sebebini giriniz..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
                rows={4}
              />
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setSecilenBasvuru(null);
                    setRedSebebi('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700"
                >
                  İptal
                </button>
                <button
                  onClick={handleRed}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reddet
                </button>
              </div>
            </div>
          </div>
        )}

        {showKulupDetay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-gray-800">{showKulupDetay.isim}</h3>
                <button
                  onClick={() => setShowKulupDetay(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Akademik Danışman</h4>
                  <p className="text-gray-800">{showKulupDetay.akademikDanisman.adSoyad}</p>
                  <p className="text-sm text-gray-600">{showKulupDetay.akademikDanisman.bolum}</p>
                  <p className="text-sm text-gray-600">{showKulupDetay.akademikDanisman.eposta}</p>
                  <p className="text-sm text-gray-600">{showKulupDetay.akademikDanisman.telefon}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Yönetim Kurulu Başkanı</h4>
                  <p className="text-gray-800">{showKulupDetay.baskan.adSoyad}</p>
                  <p className="text-sm text-gray-600">{showKulupDetay.baskan.eposta}</p>
                  <p className="text-sm text-gray-600">{showKulupDetay.baskan.telefon}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Kulüp Odası</h4>
                  <p className="text-gray-800">{showKulupDetay.odaNo}</p>
                  {showKulupDetay.digerTesisler && (
                    <>
                      <h4 className="font-medium text-gray-700 mt-4 mb-2">Diğer Tesisler</h4>
                      <p className="text-gray-800">{showKulupDetay.digerTesisler}</p>
                    </>
                  )}
                </div>

                {showKulupDetay.altTopluluklar && showKulupDetay.altTopluluklar.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Alt Topluluklar</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {showKulupDetay.altTopluluklar.map((topluluk, index) => (
                        <li key={index} className="text-gray-800">{topluluk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowKulupDetay(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {detayBasvuru && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  {detayBasvuru.etkinlikAdi} - Başvuru Detayları
                </h3>
                <button
                  onClick={() => setDetayBasvuru(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <BasvuruDetay
                basvuru={detayBasvuru}
                showHistory={true}
                showBelgeler={true}
                onBelgeIndir={handleBelgeIndir}
                onBelgeOnayla={(belgeId) => {
                  handleBelgeOnayla(belgeId).then(() => {
                    refreshBasvurular();
                  });
                }}
                onBelgeReddet={(belgeId, redSebebi) => {
                  handleBelgeReddet(belgeId, redSebebi).then(() => {
                    refreshBasvurular();
                  });
                }}
                userRole="sks"
                showEkBelgeler={false}
                onEkBelgeGuncellendi={() => {
                  // Etkinliği yeniden yükle
                  getBasvurular().then(guncelBasvurular => {
                    const guncelBasvuru = guncelBasvurular.find(b => b.id === detayBasvuru.id);
                    if (guncelBasvuru) {
                      setDetayBasvuru(guncelBasvuru);
                      
                      // Ek belge listelerini güncelle
                      const ekBelgesiOlanlar = guncelBasvurular.filter(basvuru => 
                        basvuru.ekBelgeler && 
                        basvuru.ekBelgeler.length > 0
                      );
                      
                      const onaylanmamisEkBelgesiOlanlar = guncelBasvurular.filter(basvuru => 
                        basvuru.ekBelgeler && 
                        basvuru.ekBelgeler.some(belge => !belge.sksOnay)
                      );
                      
                      setEkBelgesiOlanEtkinlikler(ekBelgesiOlanlar);
                      setBekleyenEkBelgeSayisi(onaylanmamisEkBelgesiOlanlar.length);
                      
                      // Ana başvuru listesini de güncelle
                      refreshBasvurular();
                    }
                  });
                }}
              />
              
              {/* Belgeler hakkında bilgilendirme */}
              {detayBasvuru.ekBelgeler && detayBasvuru.ekBelgeler.length > 0 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
                  <strong>Bilgi:</strong> Bu başvurunun ek belgeleri var. Belgeleri "Ek Belge Yönetimi" bölümünden inceleyebilirsiniz.
                </div>
              )}

              {/* Diğer bilgilendirmeler */}
              {detayBasvuru.belgeler && detayBasvuru.belgeler.some(belge => belge.sksOnay?.durum === 'Reddedildi') && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
                  <strong>Dikkat:</strong> Bu başvuruda reddedilmiş belgeler var.
                </div>
              )}

              {detayBasvuru.belgeler && detayBasvuru.belgeler.some(belge => !belge.sksOnay) && (
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800">
                  <strong>Uyarı:</strong> Bu başvuruda henüz incelenmemiş belgeler var.
                </div>
              )}

              <div className="flex justify-between items-center pt-6 border-t">
                <button
                  onClick={() => generatePDF(detayBasvuru)}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Başvuru Formunu İndir
                </button>
                <button
                  onClick={() => setDetayBasvuru(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {showEtkinlikler && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Etkinlik Geçmişi</h3>
                <button
                  onClick={() => setShowEtkinlikler(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Etkinlik veya kulüp ara..."
                  value={etkinlikAramaMetni}
                  onChange={(e) => setEtkinlikAramaMetni(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Onaylanan Başvurular
                  </h4>
                  <div className="space-y-3">
                    {filtrelenmisEtkinlikler
                      .filter(b => b.sksOnay?.durum === 'Onaylandı')
                      .map(basvuru => {
                        const hasUnapprovedForSks =
                          (basvuru.belgeler && basvuru.belgeler.some(b => !b.sksOnay)) ||
                          (basvuru.ekBelgeler && basvuru.ekBelgeler.some(b => !b.sksOnay));
                        return (
                        <div key={basvuru.id} className="p-4 border rounded-lg">
                          <div className="font-medium text-gray-800 flex items-center gap-2">
                            {basvuru.etkinlikAdi}
                            {hasUnapprovedForSks && (
                              <span title="Onaylanmamış belge mevcut" className="inline-flex items-center text-yellow-600">
                                <AlertCircle className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{basvuru.kulupAdi}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>Başlangıç: {new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR')}</div>
                            <div>Bitiş: {new Date(basvuru.bitisTarihi).toLocaleString('tr-TR')}</div>
                          </div>
                          <div className="text-sm text-green-600 mt-2">
                            Onay Tarihi: {basvuru.sksOnay?.tarih ? new Date(basvuru.sksOnay.tarih).toLocaleString('tr-TR') : '-'}
                          </div>
                          <button
                            onClick={() => setDetayBasvuru(basvuru)}
                            className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Detayları Görüntüle
                          </button>
                        </div>
                      );})}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Reddedilen Başvurular
                  </h4>
                  <div className="space-y-3">
                    {filtrelenmisEtkinlikler
                      .filter(b => b.sksOnay?.durum === 'Reddedildi')
                      .map(basvuru => (
                        <div key={basvuru.id} className="p-4 border rounded-lg">
                          <div className="font-medium text-gray-800">{basvuru.etkinlikAdi}</div>
                          <div className="text-sm text-gray-600">{basvuru.kulupAdi}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>Başlangıç: {new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR')}</div>
                            <div>Bitiş: {new Date(basvuru.bitisTarihi).toLocaleString('tr-TR')}</div>
                          </div>
                          <div className="text-sm text-red-600 mt-2">
                            Red Tarihi: {basvuru.sksOnay?.tarih ? new Date(basvuru.sksOnay.tarih).toLocaleString('tr-TR') : '-'}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Red Sebebi: {basvuru.sksOnay?.redSebebi}
                          </div>
                          <button
                            onClick={() => setDetayBasvuru(basvuru)}
                            className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Detayları Görüntüle
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ek Belge Yönetimi Modal */}
        {showEkBelgeYonetimi && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Ek Belge Yönetimi</h3>
                <button
                  onClick={() => setShowEkBelgeYonetimi(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {bekleyenEkBelgeSayisi > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <span className="font-medium">Dikkat!</span> {bekleyenEkBelgeSayisi} adet onay bekleyen ek belge bulunuyor.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <EkBelgeListesi
                ekBelgeler={tumEkBelgeler}
                etkinlikler={ekBelgesiOlanEtkinlikler}
                userRole="sks"
                onBelgeIndir={handleEkBelgeIndir}
                onBelgeOnayla={handleEkBelgeOnayla}
                onBelgeReddet={handleEkBelgeReddet}
                onViewEtkinlik={(etkinlik) => setDetayBasvuru(etkinlik)}
                bekleyenBelgeSayisi={bekleyenEkBelgeSayisi}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}