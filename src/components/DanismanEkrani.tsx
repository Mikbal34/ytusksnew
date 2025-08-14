import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Calendar, X, Search, Eye, LogOut, FileEdit, AlertCircle } from 'lucide-react';
import { EtkinlikBasvuru } from '../types';
import { getBasvurular, updateBasvuru, etkinlikBelgeIndir, belgeOnayla, belgeReddet } from '../utils/supabaseStorage';
import { sendDanismanOnayNotification, sendDanismanRedNotification } from '../utils/emailService';
import { BasvuruDetay } from './BasvuruDetay';
import { useAuth } from '../context/AuthContext';
// import { EkBelgeListesi } from './EkBelgeListesi';
import { EkBelgeYonetimi } from './EkBelgeYonetimi';

export function DanismanEkrani() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [redSebebi, setRedSebebi] = useState('');
  const [secilenBasvuru, setSecilenBasvuru] = useState<EtkinlikBasvuru | null>(null);
  const [detayBasvuru, setDetayBasvuru] = useState<EtkinlikBasvuru | null>(null);
  // Kaldırıldı: yeniBasvurular ve revizeBasvurular
  const [showEtkinlikler, setShowEtkinlikler] = useState(false);
  const [tumBasvurular, setTumBasvurular] = useState<EtkinlikBasvuru[]>([]);
  const [etkinlikAramaMetni, setEtkinlikAramaMetni] = useState('');
  const [loading, setLoading] = useState(true);
  const [bekleyenEkBelgeSayisi, setBekleyenEkBelgeSayisi] = useState(0);
  const [showEkBelgeYonetimi, setShowEkBelgeYonetimi] = useState(false);
  const [ekBelgesiOlanEtkinlikler, setEkBelgesiOlanEtkinlikler] = useState<EtkinlikBasvuru[]>([]);
  const [, setError] = useState<string | null>(null);
  const [onaylanmamisEkBelgeler, setOnaylanmamisEkBelgeler] = useState<{
    etkinlikId: string;
    etkinlikAdi: string;
    kulupAdi: string;
    belgeSayisi: number;
  }[]>([]);
  const [etkinligiOnaylanmisBelgeleriBekleyen, setEtkinligiOnaylanmisBelgeleriBekleyen] = useState<{
    etkinlikId: string;
    etkinlikAdi: string;
    kulupAdi: string;
    belgeSayisi: number;
  }[]>([]);
  const [etkinlikVeBelgelerOnayBekleyenler, setEtkinlikVeBelgelerOnayBekleyenler] = useState<EtkinlikBasvuru[]>([]);

  useEffect(() => {
    const fetchBasvurular = async () => {
      try {
        setLoading(true);
        const allBasvurular = await getBasvurular();
        
        if (Array.isArray(allBasvurular)) {
          console.log('Tüm başvurular:', allBasvurular.length);
          
          // Ek belgesi olan etkinlikleri filtrele
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
          
          // Onaylanmamış ek belgesi olan başvuruları tespit et
          const onaylanmamisEkBelgesiOlanlar = allBasvurular.filter(basvuru => 
            basvuru.ekBelgeler && 
            basvuru.ekBelgeler.some(belge => !belge.danismanOnay)
          );
          
          console.log('Onaylanmamış ek belgesi olan etkinlikler:', onaylanmamisEkBelgesiOlanlar.length);
          setBekleyenEkBelgeSayisi(onaylanmamisEkBelgesiOlanlar.length);
          
          // 1. Başvuruları danışman onayı olmayanlar (bekleyenler) ve olanlar (incelenenler) olarak ayır
          // FIXME: Burada !b.danismanOnay kullanarak danışman onayı olmayanları alıyoruz
          // Bu şekilde, hem undefined olanlar (hiç onaylanmış) hem de null olanlar (revize edilmiş) dahil olacak
          const bekleyenBasvurular = allBasvurular.filter(b => {
            // DanışmanOnay null veya undefined olabilir, her ikisi de onay bekliyor demektir
            const danismanOnayYok = b.danismanOnay === undefined || b.danismanOnay === null;
            console.log(`Başvuru ${b.id} - Danışman onayı: ${danismanOnayYok ? 'YOK' : 'VAR'}, revizyon: ${b.revizyon}`);
            return danismanOnayYok;
          });
          
          console.log(`${bekleyenBasvurular.length} bekleyen başvuru bulundu`);
          // 2. Onay bekleyen (hem etkinlik hem belgeler) listesi
          setEtkinlikVeBelgelerOnayBekleyenler(bekleyenBasvurular);
          
          // Danışman tarafından onaylanan veya reddedilen başvurular
          const incelenenBasvurular = allBasvurular.filter(b => b.danismanOnay !== undefined && b.danismanOnay !== null);
          console.log(`${incelenenBasvurular.length} incelenmiş başvuru bulundu`);
          setTumBasvurular(incelenenBasvurular);

          // Danışman onayı bekleyen ek belgeleri listele ("Onaylanmamış Belgeler" bölümü için)
          const bekleyenEkBelgelerListesi: {
            etkinlikId: string;
            etkinlikAdi: string;
            kulupAdi: string;
            belgeSayisi: number;
          }[] = [];
          allBasvurular.forEach(b => {
            const bekleyen = (b.ekBelgeler || []).filter(ek => !ek.danismanOnay);
            if (bekleyen.length > 0) {
              bekleyenEkBelgelerListesi.push({
                etkinlikId: b.id,
                etkinlikAdi: b.etkinlikAdi,
                kulupAdi: b.kulupAdi,
                belgeSayisi: bekleyen.length,
              });
            }
          });
          setOnaylanmamisEkBelgeler(bekleyenEkBelgelerListesi);

          // Etkinliği onaylanmış, ana belgeleri onay bekleyen başvurular
          const etkinlikOnayliBelgeleriBekleyenListesi: {
            etkinlikId: string;
            etkinlikAdi: string;
            kulupAdi: string;
            belgeSayisi: number;
          }[] = [];
          allBasvurular.forEach(b => {
            const etkinlikOnayli = b.danismanOnay?.durum === 'Onaylandı';
            const bekleyenAnaBelgeler = (b.belgeler || []).filter(doc => !doc.danismanOnay);
            if (etkinlikOnayli && bekleyenAnaBelgeler.length > 0) {
              etkinlikOnayliBelgeleriBekleyenListesi.push({
                etkinlikId: b.id,
                etkinlikAdi: b.etkinlikAdi,
                kulupAdi: b.kulupAdi,
                belgeSayisi: bekleyenAnaBelgeler.length,
              });
            }
          });
          setEtkinligiOnaylanmisBelgeleriBekleyen(etkinlikOnayliBelgeleriBekleyenListesi);
          
          // Ek belgeleri kontrol edelim
          console.log('Ek belge kontrolü başlıyor...');
          allBasvurular.forEach(basvuru => {
            if (basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0) {
              console.log(`Başvuru ID: ${basvuru.id}, Etkinlik: ${basvuru.etkinlikAdi}, Ek Belge Sayısı: ${basvuru.ekBelgeler.length}`);
            }
          });
        } else {
          console.error('getBasvurular did not return an array:', allBasvurular);
          // Kaldırıldı: revize/yeni state temizliği
          setTumBasvurular([]);
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

  const refreshLists = async () => {
    try {
      const allBasvurular = await getBasvurular();
      // Bekleyenler (danışman onayı olmayanlar)
      const bekleyenBasvurular = allBasvurular.filter(b => b.danismanOnay === undefined || b.danismanOnay === null);
      setEtkinlikVeBelgelerOnayBekleyenler(bekleyenBasvurular);
      // İncelenenler (danışman onayı var)
      const incelenen = allBasvurular.filter(b => b.danismanOnay !== undefined && b.danismanOnay !== null);
      setTumBasvurular(incelenen);
      // Ek belgeler istatistikleri
      const bekleyenEk = allBasvurular.filter(b => b.ekBelgeler && b.ekBelgeler.some(ek => !ek.danismanOnay));
      setBekleyenEkBelgeSayisi(bekleyenEk.length);
      const etkinlikOnayliBelgeleriBekleyenListesi: { etkinlikId: string; etkinlikAdi: string; kulupAdi: string; belgeSayisi: number; }[] = [];
      allBasvurular.forEach(b => {
        const etkinlikOnayli = b.danismanOnay?.durum === 'Onaylandı';
        const bekleyenAnaBelgeler = (b.belgeler || []).filter(doc => !doc.danismanOnay);
        if (etkinlikOnayli && bekleyenAnaBelgeler.length > 0) {
          etkinlikOnayliBelgeleriBekleyenListesi.push({ etkinlikId: b.id, etkinlikAdi: b.etkinlikAdi, kulupAdi: b.kulupAdi, belgeSayisi: bekleyenAnaBelgeler.length });
        }
      });
      setEtkinligiOnaylanmisBelgeleriBekleyen(etkinlikOnayliBelgeleriBekleyenListesi);
    } catch (e) {
      console.error('Listeler yenilenemedi:', e);
    }
  };

  const filtrelenmisEtkinlikler = tumBasvurular.filter(basvuru =>
    basvuru.etkinlikAdi.toLowerCase().includes(etkinlikAramaMetni.toLowerCase()) ||
    basvuru.kulupAdi.toLowerCase().includes(etkinlikAramaMetni.toLowerCase())
  );

  const handleBasvuruSec = (basvuru: EtkinlikBasvuru) => {
    setSecilenBasvuru(basvuru);
    setRedSebebi('');
  };

  const handleOnay = async () => {
    if (secilenBasvuru) {
      // Kural: Danışman etkinlik bilgisini belgelerden bağımsız onaylayabilir.
      // SKS listesine düşme, etkinlik onayıyla olur; danışman onaylı belgeler geldikçe bu etkinliğe referanslı olarak SKS ek belge listesine ayrı ayrı düşer.
      
      let durum = secilenBasvuru.durum;
      if (secilenBasvuru.sksOnay?.durum === 'Onaylandı') {
        durum = 'Onaylandı';
      }
      
      const guncelBasvuru: EtkinlikBasvuru = {
        ...secilenBasvuru,
        danismanOnay: {
          durum: 'Onaylandı',
          tarih: new Date().toISOString()
        },
        sksOnay: secilenBasvuru.sksOnay,
        durum: durum
      };
      
      try {
        await updateBasvuru(guncelBasvuru);
        alert('Başvuru danışman tarafından onaylandı.');
        await refreshLists();
        
        // Email bildirimini gönder
        try {
          await sendDanismanOnayNotification(guncelBasvuru);
          console.log('Danışman onay bildirimi gönderildi');
        } catch (emailError) {
          console.error('Onay e-posta bildirimi gönderilirken hata:', emailError);
          // E-posta gönderiminde hata olsa bile işleme devam et
        }
        
        // Kaldırıldı: Onaylanan başvuruyu revize/yeni listelerinden çıkarma
        setSecilenBasvuru(null);
        // refreshLists zaten state'leri güncelledi
      } catch (error) {
        console.error('Başvuru onaylama hatası:', error);
        alert('Başvuru onaylanırken bir hata oluştu. Lütfen tekrar deneyiniz.');
      }
    }
  };

  const handleRed = async () => {
    if (!redSebebi.trim() || !secilenBasvuru) {
      alert('Lütfen red sebebini belirtiniz!');
      return;
    }
    
    const guncelBasvuru: EtkinlikBasvuru = {
      ...secilenBasvuru,
      danismanOnay: {
        durum: 'Reddedildi',
        tarih: new Date().toISOString(),
        redSebebi
      },
      sksOnay: secilenBasvuru.sksOnay,
      durum: 'Reddedildi'
    };
    
    try {
      await updateBasvuru(guncelBasvuru);
      
      // Email bildirimini gönder
      try {
        await sendDanismanRedNotification(guncelBasvuru, redSebebi);
        console.log('Danışman red bildirimi gönderildi');
      } catch (emailError) {
        console.error('Red e-posta bildirimi gönderilirken hata:', emailError);
        // E-posta gönderiminde hata olsa bile işleme devam et
      }
      
      // Kaldırıldı: Reddedilen başvuruyu revize/yeni listelerinden çıkarma
      setSecilenBasvuru(null);
      setRedSebebi('');
      setTumBasvurular([...tumBasvurular, guncelBasvuru]);
    } catch (error) {
      console.error('Başvuru reddetme hatası:', error);
      alert('Başvuru reddedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
  };

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
        alert('Belge indirilemedi');
      }
    } catch (error) {
      console.error('Belge indirme hatası:', error);
      alert('Belge indirme sırasında bir hata oluştu');
    }
  };

  // Not used anymore

  const handleBelgeOnayla = async (belgeId: string) => {
    try {
      const success = await belgeOnayla(belgeId, 'Danışman');
      if (success) {
        alert('Belge başarıyla onaylandı.');
        // Başvuruyu yeniden yükle
        if (secilenBasvuru) {
          const guncelBasvurular = await getBasvurular();
          const guncelBasvuru = guncelBasvurular.find(b => b.id === secilenBasvuru.id);
          if (guncelBasvuru) {
            setSecilenBasvuru(guncelBasvuru);
            
            // Kaldırıldı: revize/yeni listelerinin güncellenmesi
            
            // Detay modale gösterilen başvuruyu da güncelle
            if (detayBasvuru && detayBasvuru.id === guncelBasvuru.id) {
              setDetayBasvuru(guncelBasvuru);
            }
          }
        } else if (detayBasvuru) {
          // Eğer seçili başvuru yoksa ama detay modalde bir başvuru gösteriliyorsa
          const guncelBasvurular = await getBasvurular();
          const guncelBasvuru = guncelBasvurular.find(b => b.id === detayBasvuru.id);
          if (guncelBasvuru) {
            setDetayBasvuru(guncelBasvuru);
            
            // Kaldırıldı: revize/yeni listelerinin güncellenmesi
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

  const handleBelgeReddet = async (belgeId: string, redSebebi: string) => {
    try {
      if (!redSebebi.trim()) {
        alert('Lütfen red sebebini belirtiniz!');
        return;
      }
      
      const success = await belgeReddet(belgeId, 'Danışman', redSebebi);
      if (success) {
        alert('Belge başarıyla reddedildi. NOT: Reddedilen belgesi olan bir başvuruyu onaylayamazsınız. Başvuruyu reddetmek için "Reddet" butonunu kullanabilirsiniz.');
        // Başvuruyu yeniden yükle
        if (secilenBasvuru) {
          const guncelBasvurular = await getBasvurular();
          const guncelBasvuru = guncelBasvurular.find(b => b.id === secilenBasvuru.id);
          if (guncelBasvuru) {
            setSecilenBasvuru(guncelBasvuru);
            
            // Kaldırıldı: revize/yeni listelerinin güncellenmesi
            
            // Detay başvuruyu da güncelle
            if (detayBasvuru && detayBasvuru.id === guncelBasvuru.id) {
              setDetayBasvuru(guncelBasvuru);
            }
            
            // Artık başvuruyu otomatik reddetmiyoruz
            // Kullanıcı kendisi red butonuna tıklayarak reddetmeli
          }
        } else if (detayBasvuru) {
          // Detay modalde gösterilen bir başvuru varsa
          const guncelBasvurular = await getBasvurular();
          const guncelBasvuru = guncelBasvurular.find(b => b.id === detayBasvuru.id);
          if (guncelBasvuru) {
            setDetayBasvuru(guncelBasvuru);
            
            // Kaldırıldı: revize/yeni listelerinin güncellenmesi
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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Danışman Onay Paneli</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowEkBelgeYonetimi(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex-grow sm:flex-grow-0"
            >
              <FileEdit className="w-4 h-4" />
              Ek Belge Yönetimi
              {bekleyenEkBelgeSayisi > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {bekleyenEkBelgeSayisi}
                </span>
              )}
            </button>
            {onaylanmamisEkBelgeler.length > 0 && (
              <button
                onClick={() => setShowEtkinlikler(true)}
                className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex-grow sm:flex-grow-0"
                title="Onaylanmamış Belgeler"
              >
                <AlertCircle className="w-4 h-4" />
                Onaylanmamış Belgeler
                <span className="bg-white/20 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {onaylanmamisEkBelgeler.length}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowEtkinlikler(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-grow sm:flex-grow-0"
            >
              <Calendar className="w-4 h-4" />
              İncelenen Başvurular
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

        {/* Uyarı bandı kaldırıldı veya sadeleştirilebilir */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            {/* Onay Bekleyenler: Hem etkinlik hem belgeler bekleyenler */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-yellow-300">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Hem Etkinlik Hem Belgeler Onay Bekliyor
                <span className="bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {etkinlikVeBelgelerOnayBekleyenler.length}
                </span>
              </h2>
              {etkinlikVeBelgelerOnayBekleyenler.length === 0 ? (
                <div className="text-gray-500">Onay bekleyen başvuru bulunmuyor.</div>
              ) : (
                <div className="space-y-3">
                  {etkinlikVeBelgelerOnayBekleyenler.map(basvuru => (
                    <button
                      key={basvuru.id}
                      onClick={() => setSecilenBasvuru(basvuru)}
                      className="w-full text-left p-3 rounded-lg border border-yellow-200 hover:bg-yellow-50"
                    >
                      <div className="font-medium text-gray-800">{basvuru.etkinlikAdi}</div>
                      <div className="text-sm text-gray-600">{basvuru.kulupAdi}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Etkinlik Onaylı, Belgeler Onay Bekliyor */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-blue-300">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Etkinlik Onaylı, Belgeler Onay Bekliyor
                <span className="bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {etkinligiOnaylanmisBelgeleriBekleyen.length}
                </span>
              </h2>
              {etkinligiOnaylanmisBelgeleriBekleyen.length === 0 ? (
                <div className="text-gray-500">Bu ölçüte uyan başvuru bulunmuyor.</div>
              ) : (
                <div className="space-y-3">
                  {etkinligiOnaylanmisBelgeleriBekleyen.map(item => (
                    <button
                      key={item.etkinlikId}
                      onClick={async () => {
                        const basvuru = tumBasvurular.find(b => b.id === item.etkinlikId) || etkinlikVeBelgelerOnayBekleyenler.find(b => b.id === item.etkinlikId);
                        if (basvuru) {
                          setSecilenBasvuru(basvuru);
                        }
                      }}
                      className="w-full text-left p-3 rounded-lg border border-blue-200 hover:bg-blue-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{item.etkinlikAdi}</div>
                          <div className="text-sm text-gray-600">{item.kulupAdi}</div>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{item.belgeSayisi} belge</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Revize edilmiş başvurular bölümü kaldırıldı */}

            {/* Yeni Başvurular bölümü kaldırıldı */}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Başvuru Detayı</h2>
            {secilenBasvuru ? (
              <div className="space-y-6">
                <BasvuruDetay 
                  basvuru={secilenBasvuru} 
                  showHistory={true} 
                  showBelgeler={true}
                  onBelgeIndir={handleBelgeIndir}
                  onBelgeOnayla={handleBelgeOnayla}
                  onBelgeReddet={handleBelgeReddet}
                  userRole="danisman"
                  showEkBelgeler={false}
                />

                {/* Ek belge bilgilendirmesi */}
                {secilenBasvuru.ekBelgeler && secilenBasvuru.ekBelgeler.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
                    <strong>Bilgi:</strong> Bu başvurunun ek belgeleri var. Belgeleri "Ek Belge Yönetimi" bölümünden inceleyebilirsiniz.
                  </div>
                )}

                {/* Reddedilmiş belge uyarısı */}
                {secilenBasvuru.belgeler && secilenBasvuru.belgeler.some(belge => belge.danismanOnay?.durum === 'Reddedildi') && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
                    <strong>Dikkat:</strong> Bu başvuruda reddedilmiş belge(ler) bulunmaktadır. Etkinlik bilgilerini yine de onaylayabilirsiniz; belgeler revize edilmelidir.
                  </div>
                )}

                {/* Onaylanmamış belge uyarısı */}
                {secilenBasvuru.belgeler && secilenBasvuru.belgeler.some(belge => !belge.danismanOnay) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800">
                    <strong>Uyarı:</strong> Bu başvuruda henüz incelenmemiş belge(ler) bulunmaktadır. İsterseniz yalnızca etkinlik bilgilerini onaylayabilirsiniz.
                  </div>
                )}

                <div className="space-y-4 pt-6 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Red Sebebi</label>
                    <textarea
                      value={redSebebi}
                      onChange={(e) => setRedSebebi(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Başvuruyu reddetmek için sebep belirtiniz..."
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleOnay}
                      className={`flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Onayla
                    </button>
                    <button
                      onClick={handleRed}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                      Reddet
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                İncelemek için sol taraftan bir başvuru seçiniz.
              </div>
            )}
          </div>
        </div>
      </div>

      {showEtkinlikler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">İncelenen Başvurular</h3>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    .filter(b => b.danismanOnay?.durum === 'Onaylandı')
                    .map(basvuru => (
                      <div key={basvuru.id} className="p-4 border rounded-lg">
                        <div className="font-medium text-gray-800">{basvuru.etkinlikAdi}</div>
                        <div className="text-sm text-gray-600">{basvuru.kulupAdi}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          <div>Başlangıç: {new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR')}</div>
                          <div>Bitiş: {new Date(basvuru.bitisTarihi).toLocaleString('tr-TR')}</div>
                        </div>
                        <div className="text-sm text-green-600 mt-2">
                          Onay Tarihi: {basvuru.danismanOnay && new Date(basvuru.danismanOnay.tarih).toLocaleString('tr-TR')}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            Revize Edilmiş Başvuru
                          </span>
                          {basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                              <span className="mr-1">Ek Belgeler</span>
                              <span className="bg-blue-800 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center ml-1">
                                {basvuru.ekBelgeler.length}
                              </span>
                            </span>
                          )}
                          {basvuru.ekBelgeler && basvuru.ekBelgeler.some(belge => !belge.danismanOnay) && (
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              Onaylanmamış Ek Belge
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setDetayBasvuru(basvuru)}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Detayları Görüntüle
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Reddedilen Başvurular
                </h4>
                <div className="space-y-3">
                  {filtrelenmisEtkinlikler
                    .filter(b => b.danismanOnay?.durum === 'Reddedildi')
                    .map(basvuru => (
                      <div key={basvuru.id} className="p-4 border rounded-lg">
                        <div className="font-medium text-gray-800">{basvuru.etkinlikAdi}</div>
                        <div className="text-sm text-gray-600">{basvuru.kulupAdi}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          <div>Başlangıç: {new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR')}</div>
                          <div>Bitiş: {new Date(basvuru.bitisTarihi).toLocaleString('tr-TR')}</div>
                        </div>
                        <div className="text-sm text-red-600 mt-2">
                          Red Tarihi: {basvuru.danismanOnay && new Date(basvuru.danismanOnay.tarih).toLocaleString('tr-TR')}
                        </div>
                        <div className="text-sm mt-1">
                          <span className="font-medium">Red Sebebi:</span>{' '}
                          {basvuru.danismanOnay?.redSebebi || 'Belirtilmemiş'}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            Revize Edilmiş Başvuru
                          </span>
                          {basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                              <span className="mr-1">Ek Belgeler</span>
                              <span className="bg-blue-800 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center ml-1">
                                {basvuru.ekBelgeler.length}
                              </span>
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setDetayBasvuru(basvuru)}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
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

      {/* Detay görüntüleme modalı */}
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
              onBelgeOnayla={handleBelgeOnayla}
              onBelgeReddet={handleBelgeReddet}
              userRole="danisman"
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
                      basvuru.ekBelgeler.some(belge => !belge.danismanOnay)
                    );
                    
                    setEkBelgesiOlanEtkinlikler(ekBelgesiOlanlar);
                    setBekleyenEkBelgeSayisi(onaylanmamisEkBelgesiOlanlar.length);
                  }
                });
              }}
            />
            
            {/* Bilgilendirme */}
            {detayBasvuru.ekBelgeler && detayBasvuru.ekBelgeler.length > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
                <strong>Bilgi:</strong> Bu başvurunun ek belgeleri var. Belgeleri "Ek Belge Yönetimi" bölümünden inceleyebilirsiniz.
              </div>
            )}

            <div className="flex justify-end items-center pt-6 mt-6 border-t">
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

      {/* Ek Belge Yönetimi Modalı */}
      {showEkBelgeYonetimi && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Ek Belge Yönetimi</h3>
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
            
            {ekBelgesiOlanEtkinlikler.map(etkinlik => (
              <div key={etkinlik.id} className="mb-8 border-b pb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{etkinlik.etkinlikAdi}</h4>
                    <p className="text-sm text-gray-600">{etkinlik.kulupAdi}</p>
                  </div>
                  
                  <button
                    onClick={() => setDetayBasvuru(etkinlik)}
                    className="mt-2 md:mt-0 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Başvuru Detaylarını Gör
                  </button>
                </div>
                
                <EkBelgeYonetimi
                  etkinlik={etkinlik}
                  userRole="danisman"
                  onEkBelgeGuncellendi={() => {
                    // Güncel verileri al
                    getBasvurular().then(guncelBasvurular => {
                      // Ek belgesi olan etkinlikleri filtrele
                      const ekBelgesiOlanlar = guncelBasvurular.filter(basvuru => 
                        basvuru.ekBelgeler && basvuru.ekBelgeler.length > 0
                      );
                      
                      // Onaylanmamış ek belgesi olan başvuruları tespit et
                      const onaylanmamisEkBelgesiOlanlar = guncelBasvurular.filter(basvuru => 
                        basvuru.ekBelgeler && 
                        basvuru.ekBelgeler.some(belge => !belge.danismanOnay)
                      );
                      
                      setEkBelgesiOlanEtkinlikler(ekBelgesiOlanlar);
                      setBekleyenEkBelgeSayisi(onaylanmamisEkBelgesiOlanlar.length);
                      
                      // Etkinlik detayı görüntüleniyorsa güncelle
                      if (detayBasvuru) {
                        const guncelBasvuru = guncelBasvurular.find(b => b.id === detayBasvuru.id);
                        if (guncelBasvuru) {
                          setDetayBasvuru(guncelBasvuru);
                        }
                      }
                    });
                  }}
                />
              </div>
            ))}
            
            {ekBelgesiOlanEtkinlikler.length === 0 && (
              <div className="text-center py-8 border rounded-lg bg-gray-50">
                <p className="text-gray-600">Hiçbir etkinlik için henüz ek belge yüklenmemiş.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}