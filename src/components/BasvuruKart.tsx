import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit, Eye, AlertCircle, CheckCircle, XCircle, Info, X } from 'lucide-react';
import { EtkinlikBasvuru } from '../types';
import { revizeEt, getBasvuruById } from '../utils/supabaseStorage';
import { RevizyonGecmisiModal } from './RevizyonGecmisiModal';

interface BasvuruKartProps {
  basvuru: EtkinlikBasvuru;
  onRevize: () => void;
  showStatusBadges?: boolean; // eski basit rozetler
  showDetailedStatuses?: boolean; // Etkinlik Bilgisi / Belgeler için danışman ve SKS durumları
  showHeaderStatus?: boolean; // Kart başlığındaki sağ üst durum rozetini göster
  showDocumentStatuses?: boolean; // Belge bazında durumları listele
}

export const BasvuruKart: React.FC<BasvuruKartProps> = ({ basvuru, onRevize, showStatusBadges = false, showDetailedStatuses = false, showHeaderStatus = false, showDocumentStatuses = false }) => {
  const navigate = useNavigate();
  const [revizeSecimAcik, setRevizeSecimAcik] = useState(false);
  const [showDocDetails, setShowDocDetails] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [revizyonGecmisiAcik, setRevizyonGecmisiAcik] = useState(false);
  
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

  const handleRevize = async (revizeTuru?: 'belgeler' | 'etkinlik' | 'ikisi') => {
    console.log("🚀 REVIZE ET BUTONUNA BASILDI!");
    console.log("Revize türü:", revizeTuru);
    console.log("Başvuru durumu:", basvuru.danismanOnay, basvuru.sksOnay);
    try {
      console.log("Revize edilecek başvuru:", basvuru);

      // Önce güncel başvuruyu çek (cache sorunu için)
      console.log("📡 Güncel başvuru verisi çekiliyor...");
      const guncelBasvuru = await getBasvuruById(basvuru.id);
      if (!guncelBasvuru) {
        console.error("❌ Güncel başvuru çekilemedi");
        return;
      }
      console.log("✅ Güncel başvuru alındı:", guncelBasvuru);

      // Başvuruyu revize moduna geçir (revizyon bayrağı henüz false)
      const yeniBasvuru = await revizeEt(guncelBasvuru, revizeTuru);
      console.log("Başvuru revize moduna geçirildi:", yeniBasvuru);
      console.log("⚠️ Revizyon durumu:", yeniBasvuru.revizyon, "(Henüz false - gerçek değişiklik yapılınca true olacak)");
      console.log("Danışman onayı:", yeniBasvuru.danismanOnay);
      
      // Kullanıcı artık değişiklik yapabilir
      console.log("✅ Kullanıcı revize sayfasına yönlendiriliyor...");
      
      // Yönlendirme işlemi dropdown butonlarında yapılacak, burada yapmıyoruz
      // navigate(`/kulup-paneli/basvuru-duzenle/${yeniBasvuru.id}`);
      
      // Yönlendirmeden sonra başvuruları yenileme fonksiyonunu çağır
      // Bu çağrı asenkron olarak çalışır, ancak yönlendirme tamamlandığı için
      // kullanıcı zaten başka bir sayfada olacaktır
      onRevize();
      
      return yeniBasvuru; // Yeni başvuruyu return et
    } catch (error) {
      console.error('Başvuru revize edilirken hata oluştu:', error);
      alert('Başvuru revize edilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      return null;
    }
  };

  const getDurumBilgisi = () => {
    if (basvuru.revizyon) {
      return (
        <div className="flex items-center gap-1 text-purple-600">
          <FileEdit className="w-4 h-4" />
          <span>Revize Edildi</span>
        </div>
      );
    }

    if (basvuru.danismanOnay?.durum === 'Reddedildi') {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <XCircle className="w-4 h-4" />
          <span>Danışman Reddetti</span>
        </div>
      );
    }

    if (basvuru.sksOnay?.durum === 'Reddedildi') {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <XCircle className="w-4 h-4" />
          <span>SKS Reddetti</span>
        </div>
      );
    }

    if (basvuru.danismanOnay?.durum === 'Onaylandı' && basvuru.sksOnay?.durum === 'Onaylandı') {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>Onaylandı</span>
        </div>
      );
    }

    if (basvuru.danismanOnay?.durum === 'Onaylandı') {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <AlertCircle className="w-4 h-4" />
          <span>SKS Onayı Bekliyor</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-yellow-600">
        <AlertCircle className="w-4 h-4" />
        <span>Danışman Onayı Bekliyor</span>
      </div>
    );
  };

  const redSebebi = basvuru.danismanOnay?.durum === 'Reddedildi' 
    ? basvuru.danismanOnay.redSebebi 
    : basvuru.sksOnay?.redSebebi;

  // Revize butonu artık her durumda tek bir buton olarak gösterilecek

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

    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1">
          <h3 className="font-medium text-gray-800">{basvuru.etkinlikAdi}</h3>
          <button
            onClick={() => setRevizyonGecmisiAcik(true)}
            className="flex-shrink-0 p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full transition-colors"
            title="Revizyon geçmişini görüntüle"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        {showHeaderStatus && getDurumBilgisi()}
      </div>


      {showStatusBadges && !showDetailedStatuses && (
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Etkinlik Durum Badge (JSONB Onay Sistemi) */}
          {basvuru.danismanOnay?.durum === 'Onaylandı' && basvuru.sksOnay?.durum === 'Onaylandı' ? (
            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-green-100 text-green-800">✅ Tam Onaylandı</span>
          ) : basvuru.danismanOnay?.durum === 'Onaylandı' ? (
            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">👨‍🏫 Danışman Onaylandı</span>
          ) : basvuru.sksOnay?.durum === 'Onaylandı' ? (
            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">🏛️ SKS Onaylandı</span>
          ) : basvuru.danismanOnay?.durum === 'Reddedildi' || basvuru.sksOnay?.durum === 'Reddedildi' ? (
            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-red-100 text-red-800">❌ Reddedildi</span>
          ) : (
            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">⏳ Beklemede</span>
          )}
        </div>
      )}

      {showDetailedStatuses && (
        <div className="space-y-2 mb-3">
          {/* Etkinlik Onay Durumları - İki Ayrı Kutucuk */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Etkinlik Onayları</div>
            <div className="flex flex-wrap gap-2">
              {/* Danışman Onay Durumu */}
              {(() => {
                const danismanOnay = basvuru.danismanOnay;
                if (!danismanOnay) {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">👨‍🏫 Danışman: Beklemede</span>;
                } else if (danismanOnay.durum === 'Onaylandı') {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-green-100 text-green-800">👨‍🏫 Danışman: Onaylandı</span>;
                } else if (danismanOnay.durum === 'Reddedildi') {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-800" title={danismanOnay.redSebebi || ''}>👨‍🏫 Danışman: Reddedildi</span>;
                }
                return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">👨‍🏫 Danışman: Beklemede</span>;
              })()}
              
              {/* SKS Onay Durumu */}
              {(() => {
                const sksOnay = basvuru.sksOnay;
                if (!sksOnay) {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">🏛️ SKS: Beklemede</span>;
                } else if (sksOnay.durum === 'Onaylandı') {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-green-100 text-green-800">🏛️ SKS: Onaylandı</span>;
                } else if (sksOnay.durum === 'Reddedildi') {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-800" title={sksOnay.redSebebi || ''}>🏛️ SKS: Reddedildi</span>;
                }
                return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">🏛️ SKS: Beklemede</span>;
              })()}
            </div>
          </div>
          {/* Belgeler Durumları */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Belgeler</div>
            <div className="flex flex-wrap gap-2">
              {/* Danışman Belgeleri */}
              {(() => {
                const belgeler = (basvuru.belgeler || []).concat(basvuru.ekBelgeler || []);
                if (belgeler.length === 0) {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">Danışman: Belge Yok</span>;
                }
                const anyRejected = belgeler.some(b => b.danismanOnay?.durum === 'Reddedildi');
                const allApproved = belgeler.length > 0 && belgeler.every(b => b.danismanOnay?.durum === 'Onaylandı');
                if (anyRejected) {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-800">Danışman: Reddedilen Belge Var</span>;
                }
                if (allApproved) {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-green-100 text-green-800">Danışman: Belgeler Onaylı</span>;
                }
                return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">Danışman: Onay Bekleyen Belge Var</span>;
              })()}
              {/* SKS Belgeleri */}
              {(() => {
                // Sadece danışman onaylı belgeleri SKS'ye göster
                const danismanOnayliEtkinlikBelgeleri = (basvuru.belgeler || []).filter(b => b.danismanOnay?.durum === 'Onaylandı');
                const danismanOnayliEkBelgeler = (basvuru.ekBelgeler || []).filter(b => b.danismanOnay?.durum === 'Onaylandı');
                const belgeler = danismanOnayliEtkinlikBelgeleri.concat(danismanOnayliEkBelgeler);
                
                if (belgeler.length === 0) {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">SKS: Belge Yok</span>;
                }
                const anyRejected = belgeler.some(b => b.sksOnay?.durum === 'Reddedildi');
                const allApproved = belgeler.length > 0 && belgeler.every(b => b.sksOnay?.durum === 'Onaylandı');
                if (anyRejected) {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-800">SKS: Reddedilen Belge Var</span>;
                }
                if (allApproved) {
                  return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-green-100 text-green-800">SKS: Belgeler Onaylı</span>;
                }
                return <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">SKS: Onay Bekleyen Belge Var</span>;
              })()}
            </div>
          </div>
        </div>
      )}

      {showDocumentStatuses && (
        <div className="mb-3">
          <button
            onClick={() => setShowDocDetails(v => !v)}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            {showDocDetails ? 'Belge Durumlarını Gizle' : 'Belge Durumlarını Göster'}
          </button>
          {showDocDetails && (() => {
            const allDocs = ([
              ...(basvuru.belgeler || []).map((b, i) => ({...b, isEk: false, _order: i, _time: i})),
              ...(basvuru.ekBelgeler || []).map((b: any, i) => ({...b, isEk: true, _order: i, _time: (new Date(b.olusturmaTarihi || 0)).getTime()}))
            ] as any[]);
            if (allDocs.length === 0) {
              return <div className="mt-2 text-xs text-gray-500">Bu başvuru için yüklenmiş belge bulunmuyor.</div>;
            }
            // Grupla: isEk + tip
            const groups = new Map<string, any[]>();
            allDocs.forEach(doc => {
              const key = `${doc.isEk ? 'ek' : 'main'}:${doc.tip}`;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(doc);
            });
            // Her grup için sadece en güncel belgeyi göster (eski reddedilenler gizlenir)
            const groupRows = Array.from(groups.entries()).map(([key, arr]) => {
              // sırala: ek belgelerde tarihe göre, ana belgelerde eklenen sıraya göre
              const sorted = arr.sort((a, b) => b._time - a._time);
              const latest = sorted[0];
              const count = arr.length;
              const label = latest.tip;
              const danisman = latest.danismanOnay?.durum || 'Bekliyor';
              const sks = latest.sksOnay?.durum || 'Bekliyor';
              const danismanClass = danisman === 'Onaylandı' ? 'bg-green-100 text-green-800' : danisman === 'Reddedildi' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
              const sksClass = sks === 'Onaylandı' ? 'bg-green-100 text-green-800' : sks === 'Reddedildi' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
              const isExpanded = !!expandedGroups[key];
              return (
                <div key={key} className="flex flex-wrap items-center gap-2 text-xs py-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">{label}</span>
                    {latest.belgeNotu && (
                      <button
                        onClick={() => handleBelgeNotuGoster(latest.dosyaAdi || label, latest.belgeNotu)}
                        className="p-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full flex-shrink-0"
                        title="Belge notunu gör"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {latest.isEk && <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">Ek</span>}
                  {count > 1 && (
                    <button
                      type="button"
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                      title="Belgeleri ayrı ayrı gör"
                    >
                      {count} belge
                    </button>
                  )}
                  <span className={`px-2 py-0.5 rounded ${danismanClass}`} title={latest.danismanOnay?.redSebebi ? `Red: ${latest.danismanOnay.redSebebi}` : ''}>
                    Danışman: {danisman}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${sksClass}`} title={latest.sksOnay?.redSebebi ? `Red: ${latest.sksOnay.redSebebi}` : ''}>
                    SKS: {sks}
                  </span>
                  {isExpanded && (
                    <div className="w-full mt-1 pl-4 border-l border-gray-200 space-y-1">
                      {sorted.map((doc: any, i: number) => {
                        const dStat = doc.danismanOnay?.durum || 'Bekliyor';
                        const sStat = doc.sksOnay?.durum || 'Bekliyor';
                        const dCls = dStat === 'Onaylandı' ? 'bg-green-100 text-green-800' : dStat === 'Reddedildi' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                        const sCls = sStat === 'Onaylandı' ? 'bg-green-100 text-green-800' : sStat === 'Reddedildi' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                        const timeText = doc.isEk && doc.olusturmaTarihi
                          ? new Date(doc.olusturmaTarihi).toLocaleString('tr-TR')
                          : (doc.dosyaAdi || `Belge ${sorted.length - i}`);
                        return (
                          <div key={i} className="flex flex-wrap items-center gap-2 text-[11px]">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">{timeText}</span>
                              {doc.belgeNotu && (
                                <button
                                  onClick={() => handleBelgeNotuGoster(doc.dosyaAdi || timeText, doc.belgeNotu)}
                                  className="p-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full flex-shrink-0"
                                  title="Belge notunu gör"
                                >
                                  <Info className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded ${dCls}`} title={doc.danismanOnay?.redSebebi ? `Red: ${doc.danismanOnay.redSebebi}` : ''}>Danışman: {dStat}</span>
                            <span className={`px-2 py-0.5 rounded ${sCls}`} title={doc.sksOnay?.redSebebi ? `Red: ${doc.sksOnay.redSebebi}` : ''}>SKS: {sStat}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
            return <div className="mt-2">{groupRows}</div>;
          })()}
        </div>
      )}

      {redSebebi && (
        <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded text-sm text-red-800">
          <div className="font-medium mb-1">Red Sebebi:</div>
          <div>{redSebebi}</div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(`/etkinlik-detay/${basvuru.id}`)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
        >
          <Eye className="w-4 h-4" />
          Detayları Görüntüle
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setRevizeSecimAcik((v) => !v)}
              className="text-sm px-3 py-1 rounded-md bg-purple-600 text-white hover:bg-purple-700"
              title="Revize Et"
            >
              Revize Et
            </button>
            {revizeSecimAcik && (
              <div className="absolute z-20 mt-2 right-0 bg-white border rounded-md shadow-lg p-3 w-64">
                <div className="text-sm font-medium text-gray-700 mb-2">Neyi revize etmek istiyorsunuz?</div>
                <div className="space-y-2">
                  <button
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
                    onClick={async () => {
                      console.log("🚀 BELGELER REVİZE BAŞLADI!");
                      setRevizeSecimAcik(false);
                      const yeniBasvuru = await handleRevize('belgeler');
                      if (yeniBasvuru) {
                        navigate(`/kulup-paneli/basvuru-duzenle/${yeniBasvuru.id}?revize=belgeler`);
                      }
                    }}
                  >
                    Sadece Belgeler
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
                    onClick={async () => {
                      console.log("🚀 ETKİNLİK REVİZE BAŞLADI!");
                      setRevizeSecimAcik(false);
                      const yeniBasvuru = await handleRevize('etkinlik');
                      if (yeniBasvuru) {
                        navigate(`/kulup-paneli/basvuru-duzenle/${yeniBasvuru.id}?revize=etkinlik`);
                      }
                    }}
                  >
                    Sadece Etkinlik Bilgileri
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
                    onClick={async () => {
                      console.log("🚀 HER İKİSİ REVİZE BAŞLADI!");
                      setRevizeSecimAcik(false);
                      const yeniBasvuru = await handleRevize('ikisi');
                      if (yeniBasvuru) {
                        navigate(`/kulup-paneli/basvuru-duzenle/${yeniBasvuru.id}?revize=ikisi`);
                      }
                    }}
                  >
                    Etkinlik Bilgileri ve Belgeler
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Tek revize butonu kullanıldığı için ayrı "Düzenle" ve ikinci revize butonu kaldırıldı */}
        </div>
      </div>
    </div>

    {/* Revizyon Geçmişi Modal */}
    <RevizyonGecmisiModal
      isOpen={revizyonGecmisiAcik}
      onClose={() => setRevizyonGecmisiAcik(false)}
      basvuruId={basvuru.id}
      etkinlikAdi={basvuru.etkinlikAdi}
    />
    </>
  );
};