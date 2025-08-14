import { useState } from 'react';
import { EtkinlikBasvuru } from '../types';
import { OnayGecmisi } from './OnayGecmisi';
import { FileDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { EkBelgeYonetimi } from './EkBelgeYonetimi';

interface BasvuruDetayProps {
  basvuru: EtkinlikBasvuru;
  showHistory?: boolean;
  showBelgeler?: boolean;
  onBelgeIndir?: (belge: string, dosyaAdi: string) => void;
  onBelgeOnayla?: (belgeId: string) => void;
  onBelgeReddet?: (belgeId: string, redSebebi: string) => void;
  userRole?: 'admin' | 'sks' | 'danisman' | 'kulup_baskani';
  onEkBelgeGuncellendi?: () => void;
  showEkBelgeler?: boolean;
}

export function BasvuruDetay({ 
  basvuru, 
  showHistory = false, 
  showBelgeler = false, 
  onBelgeIndir,
  onBelgeOnayla,
  onBelgeReddet,
  userRole,
  onEkBelgeGuncellendi,
  showEkBelgeler = false
}: BasvuruDetayProps) {
  const [redSebebi, setRedSebebi] = useState<string>('');
  const [activeRedBelgeId, setActiveRedBelgeId] = useState<string | null>(null);

  if (!basvuru) {
    return null;
  }

  // Belge onay göstergesi ve onay/red butonları
  const renderOnayDurumu = (belgeId: string, danismanOnay: any, sksOnay: any) => {
    // Kullanıcı rolüne göre onay durumunu ve butonları göster
    const isUserDanisman = userRole === 'danisman';
    const isUserSKS = userRole === 'sks';
    
    // Hangi onay durumunu kontrol edeceğiz?
    const onayDurumu = isUserDanisman ? danismanOnay : (isUserSKS ? sksOnay : null);
    // const otherOnayDurumu = isUserDanisman ? sksOnay : (isUserSKS ? danismanOnay : null);
    
    // Kullanıcı onay/red butonlarını görebilmeli mi?
    const canApprove = (isUserDanisman || isUserSKS) && onBelgeOnayla && onBelgeReddet;
    
    // Belge zaten onaylanmış veya reddedilmiş mi?
    const isApproved = onayDurumu?.durum === 'Onaylandı';
    const isRejected = onayDurumu?.durum === 'Reddedildi';
    
    // Aktif red işlemi var mı?
    const isActiveRejection = activeRedBelgeId === belgeId;
    
    return (
      <div className="flex space-x-3 items-center">
        {/* Danışman ve SKS onay durumları her zaman görünür */}
        <div className="flex space-x-2">
          <div className="flex items-center">
            <span className="text-xs mr-1">Danışman:</span>
            {danismanOnay ? (
              danismanOnay.durum === 'Onaylandı' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <span title={danismanOnay.redSebebi || 'Reddedildi'} className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  {isUserDanisman && danismanOnay.redSebebi && (
                    <span className="text-[11px] text-red-600">Red: {danismanOnay.redSebebi}</span>
                  )}
                </span>
              )
            ) : (
              <AlertCircle className="w-4 h-4 text-gray-400" />
            )}
          </div>
          
          <div className="flex items-center">
            <span className="text-xs mr-1">SKS:</span>
            {sksOnay ? (
              sksOnay.durum === 'Onaylandı' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <span title={sksOnay.redSebebi || 'Reddedildi'} className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  {isUserSKS && sksOnay.redSebebi && (
                    <span className="text-[11px] text-red-600">Red: {sksOnay.redSebebi}</span>
                  )}
                </span>
              )
            ) : (
              <AlertCircle className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
        
        {/* Sadece danisman veya sks onaylama/reddetme yapabilir */}
        {canApprove && !isApproved && !isRejected && !isActiveRejection && (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                onBelgeOnayla?.(belgeId);
                // Call the update callback to notify parent component
                onEkBelgeGuncellendi?.();
              }}
              className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-md"
              title="Belgeyi Onayla"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveRedBelgeId(belgeId)}
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
              title="Belgeyi Reddet"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Red sebebi giriş alanı */}
        {canApprove && isActiveRejection && (
          <div className="flex flex-col space-y-2">
            <textarea
              value={redSebebi}
              onChange={(e) => setRedSebebi(e.target.value)}
              placeholder="Red sebebi giriniz..."
              className="p-2 border border-gray-300 rounded text-sm w-full"
              rows={2}
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (redSebebi.trim()) {
                    onBelgeReddet?.(belgeId, redSebebi);
                    setActiveRedBelgeId(null);
                    setRedSebebi('');
                    // Call the update callback to notify parent component
                    onEkBelgeGuncellendi?.();
                  } else {
                    alert('Lütfen red sebebini belirtiniz!');
                  }
                }}
                className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
              >
                Reddet
              </button>
              <button
                onClick={() => {
                  setActiveRedBelgeId(null);
                  setRedSebebi('');
                }}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {basvuru.revizyon && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800">
            Bu başvuru revize edilmiştir
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Kulüp Adı</label>
          <div className="mt-1 text-gray-900">{basvuru.kulupAdi}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Etkinlik Adı</label>
          <div className="mt-1 text-gray-900">{basvuru.etkinlikAdi}</div>
        </div>

        {basvuru.etkinlikTuru && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Etkinlik Türü</label>
            <div className="mt-1 text-gray-900">
              {basvuru.etkinlikTuru}
              {basvuru.etkinlikTuru === 'Diğer' && basvuru.digerTuruAciklama ? (
                <span className="text-gray-600"> — {basvuru.digerTuruAciklama}</span>
              ) : null}
            </div>
          </div>
        )}

        {basvuru.etkinlikYeri && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Etkinlik Yeri</label>
            <div className="mt-1 text-gray-900">
              {basvuru.etkinlikYeri.fakulte}
              {basvuru.etkinlikYeri.detay && (
                <span className="text-gray-600"> - {basvuru.etkinlikYeri.detay}</span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
            <div className="mt-1 text-gray-900">{new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR')}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
            <div className="mt-1 text-gray-900">{new Date(basvuru.bitisTarihi).toLocaleString('tr-TR')}</div>
          </div>
        </div>

        {basvuru.sponsorlar && basvuru.sponsorlar.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Sponsorlar</label>
            <div className="mt-1 space-y-2">
              {basvuru.sponsorlar.map((sponsor, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded">
                  <div className="font-medium">{sponsor.firmaAdi}</div>
                  <div className="text-sm text-gray-600">{sponsor.detay}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {basvuru.konusmacilar && basvuru.konusmacilar.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Konuşmacılar</label>
            <div className="mt-1 space-y-3">
              {basvuru.konusmacilar.map((konusmaci, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  <div className="font-medium">{konusmaci.adSoyad}</div>
                  <div className="text-sm text-gray-700 mt-1">{konusmaci.ozgecmis}</div>
                  {konusmaci.aciklama && (
                    <div className="text-sm text-gray-600 mt-1">{konusmaci.aciklama}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Açıklama</label>
          <div className="mt-1 text-gray-900 whitespace-pre-wrap">{basvuru.aciklama}</div>
        </div>

        {showBelgeler && basvuru.belgeler && basvuru.belgeler.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yüklenen Belgeler</label>
            <div className="space-y-2">
              {(userRole === 'sks' 
                ? basvuru.belgeler.filter(b => b.danismanOnay?.durum === 'Onaylandı')
                : basvuru.belgeler
              ).map((belge, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex flex-col">
                    <span className="text-gray-900">{belge.tip}</span>
                    <span className="text-xs text-gray-500">{belge.dosyaAdi}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {renderOnayDurumu(belge.id!, belge.danismanOnay, belge.sksOnay)}
                    
                    <button
                      onClick={() => onBelgeIndir?.(typeof belge.dosya === 'string' ? belge.dosya : '', belge.dosyaAdi)}
                      className="p-1 text-gray-600 hover:text-gray-900"
                    >
                      <FileDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showHistory && basvuru.onayGecmisi && (
          <div className="mt-6 pt-6 border-t">
            <OnayGecmisi 
              danismanOnaylari={basvuru.onayGecmisi.danismanOnaylari}
              sksOnaylari={basvuru.onayGecmisi.sksOnaylari}
            />
          </div>
        )}
        
        {showEkBelgeler && (
          <div className="mt-6 pt-6 border-t">
            <EkBelgeYonetimi
              etkinlik={basvuru}
              userRole={userRole}
              onEkBelgeGuncellendi={onEkBelgeGuncellendi}
            />
          </div>
        )}
      </div>
    </div>
  );
}