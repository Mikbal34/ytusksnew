import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, FileEdit, Eye, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { EtkinlikBasvuru } from '../types';
import { revizeEt } from '../utils/supabaseStorage';

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
  const [isRevizing, setIsRevizing] = useState(false);
  const [revizeSecimAcik, setRevizeSecimAcik] = useState(false);
  const [showDocDetails, setShowDocDetails] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const handleRevize = async () => {
    try {
      setIsRevizing(true);
      console.log("Revize edilecek başvuru:", basvuru);
      
      // Revizyon işlemini başlat
      const yeniBasvuru = await revizeEt(basvuru);
      console.log("Revize edilen başvuru:", yeniBasvuru);
      console.log("Revizyon durumu:", yeniBasvuru.revizyon);
      console.log("Danışman onayı:", yeniBasvuru.danismanOnay);
      
      // Revize işlemini takip etmek için log ekle
      console.log("Revize edilen başvuru danışman onayına gönderiliyor...");
      
      // Revize işlemi başarılı olduktan sonra, düzenleme sayfasına yönlendir
      navigate(`/kulup-paneli/basvuru-duzenle/${yeniBasvuru.id}`);
      
      // Yönlendirmeden sonra başvuruları yenileme fonksiyonunu çağır
      // Bu çağrı asenkron olarak çalışır, ancak yönlendirme tamamlandığı için
      // kullanıcı zaten başka bir sayfada olacaktır
      onRevize();
    } catch (error) {
      console.error('Başvuru revize edilirken hata oluştu:', error);
      alert('Başvuru revize edilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setIsRevizing(false);
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

  const canEditBeforeAdvisorApproval = !basvuru.danismanOnay; // Danışman onayı yoksa düzenleme yapılabilir

  const etkinlikOnayliBelgelerOnaysiz = basvuru.sksOnay?.durum === 'Onaylandı' && (
    (basvuru.belgeler && basvuru.belgeler.some(d => d.sksOnay?.durum !== 'Onaylandı')) ||
    (basvuru.ekBelgeler && basvuru.ekBelgeler.some(d => d.sksOnay?.durum !== 'Onaylandı'))
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-800">{basvuru.etkinlikAdi}</h3>
        {showHeaderStatus && getDurumBilgisi()}
      </div>

      <div className="text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <CalendarClock className="w-4 h-4" />
          <span>
            {basvuru.zamanDilimleri && basvuru.zamanDilimleri.length > 0 
              ? new Date(basvuru.zamanDilimleri[0].baslangic).toLocaleDateString('tr-TR')
              : basvuru.baslangicTarihi 
                ? new Date(basvuru.baslangicTarihi).toLocaleDateString('tr-TR')
                : 'Tarih belirtilmemiş'
            }
          </span>
        </div>
      </div>

      {showStatusBadges && !showDetailedStatuses && (
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Etkinlik Durum Badge (Unified Sistem) */}
          {basvuru.durum === 'Onaylandı' ? (
            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-green-100 text-green-800">✅ Tam Onaylandı</span>
          ) : basvuru.durum === 'Danışman Onaylandı' ? (
            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">👨‍🏫 Danışman Onaylandı</span>
          ) : basvuru.durum === 'SKS Onaylandı' ? (
            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">🏛️ SKS Onaylandı</span>
          ) : basvuru.durum === 'Reddedildi' ? (
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
                const belgeler = (basvuru.belgeler || []).concat(basvuru.ekBelgeler || []);
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
                  <span className="font-medium text-gray-700">{label}</span>
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
                            <span className="text-gray-600">{timeText}</span>
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
                    onClick={() => navigate(`/kulup-paneli/basvuru-duzenle/${basvuru.id}?revize=belgeler`)}
                  >
                    Sadece Belgeler
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
                    onClick={() => navigate(`/kulup-paneli/basvuru-duzenle/${basvuru.id}?revize=etkinlik`)}
                  >
                    Sadece Etkinlik Bilgileri
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
                    onClick={() => navigate(`/kulup-paneli/basvuru-duzenle/${basvuru.id}?revize=ikisi`)}
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
  );
};