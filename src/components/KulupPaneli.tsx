import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, PlusCircle, ArrowLeft, Trash2, LogOut } from 'lucide-react';
import { EtkinlikBasvuru } from '../types';
import { getBasvurular, clearStorage } from '../utils/supabaseStorage';
import { BasvuruKart } from './BasvuruKart';
import { useAuth } from '../context/AuthContext';

export function KulupPaneli() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [basvurular, setBasvurular] = useState<EtkinlikBasvuru[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
                <BasvuruKart key={basvuru.id} basvuru={basvuru} onRevize={handleRevize} showDetailedStatuses showDocumentStatuses />
              ))}
              {surecTamamlandi.length === 0 && (
                <div className="text-center py-8 text-gray-500">Tamamlanan başvuru bulunmamaktadır.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}