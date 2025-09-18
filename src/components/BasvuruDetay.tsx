import { useState } from 'react';
import { EtkinlikBasvuru } from '../types';
import { etkinlikGorseliIndir } from '../utils/supabaseStorage';
import { FileDown, CheckCircle, XCircle, AlertCircle, Info, Image, X } from 'lucide-react';
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
  onClose?: () => void;
  onApprove?: (basvuru: EtkinlikBasvuru) => void;
  onReject?: (basvuru: EtkinlikBasvuru) => void;
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
  showEkBelgeler = false,
  onClose,
  onApprove,
  onReject
}: BasvuruDetayProps) {
  const [redSebebi, setRedSebebi] = useState<string>('');
  const [activeRedBelgeId, setActiveRedBelgeId] = useState<string | null>(null);
  
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

  if (!basvuru) {
    return null;
  }

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

  // Etkinlik görselini göster
  const handleGorselGoster = async () => {
    if (!basvuru.etkinlikGorseli) return;
    
    try {
      const gorselUrl = await etkinlikGorseliIndir(basvuru.etkinlikGorseli);
      if (gorselUrl) {
        setGorselPopup({
          isOpen: true,
          gorselUrl,
          etkinlikAdi: basvuru.etkinlikAdi
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

  // Belge onay göstergesi ve onay/red butonları (JSONB Sistem)
  const renderOnayDurumu = (belgeId: string, belge?: any) => {
    // Kullanıcı rolüne göre onay durumunu ve butonları göster
    const isUserDanisman = userRole === 'danisman';
    const isUserSKS = userRole === 'sks';
    
    // JSONB sistemde danismanOnay ve sksOnay kullanıyoruz
    const danismanOnay = belge?.danismanOnay;
    const sksOnay = belge?.sksOnay;
    
    // Kullanıcı onay/red butonlarını görebilmeli mi?
    const canApprove = (isUserDanisman || isUserSKS) && onBelgeOnayla && onBelgeReddet;
    
    // Belge durumuna göre kontrol (JSONB sistem)
    const isDanismanApproved = danismanOnay?.durum === 'Onaylandı';
    const isDanismanRejected = danismanOnay?.durum === 'Reddedildi';
    const isSksApproved = sksOnay?.durum === 'Onaylandı';
    const isSksRejected = sksOnay?.durum === 'Reddedildi';
    
    const isFullyApproved = isDanismanApproved && isSksApproved;
    const isRejected = isDanismanRejected || isSksRejected;
    
    // Kullanıcının bu belge için aksiyon alıp alamayacağını belirle
    const canUserTakeAction = () => {
      if (isRejected || isFullyApproved) return false; // Final durumlar
      
      if (isUserDanisman) {
        // Danışman: Henüz danışman onayı yoksa aksiyon alabilir
        return !danismanOnay;
      }
      
      if (isUserSKS) {
        // SKS: Henüz SKS onayı yoksa aksiyon alabilir
        return !sksOnay;
      }
      
      return false;
    };
    
    // Aktif red işlemi var mı?
    const isActiveRejection = activeRedBelgeId === belgeId;
    
    return (
      <div className="flex space-x-3 items-center">
        {/* JSONB sistem - belge durumu göstergesi */}
        <div className="flex items-center">
          <span className="text-xs mr-2">Durum:</span>
          {isFullyApproved ? (
            <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded text-xs">
              <CheckCircle className="w-4 h-4 mr-1" />
              Onaylandı
            </div>
          ) : isRejected ? (
            <div className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
              <XCircle className="w-4 h-4 mr-1" />
              Reddedildi
            </div>
          ) : isDanismanApproved && !isSksApproved ? (
            <div className="flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
              <CheckCircle className="w-4 h-4 mr-1" />
              👨‍🏫 Danışman Onaylandı
            </div>
          ) : isSksApproved && !isDanismanApproved ? (
            <div className="flex items-center text-purple-600 bg-purple-50 px-2 py-1 rounded text-xs">
              <CheckCircle className="w-4 h-4 mr-1" />
              🏛️ SKS Onaylandı
            </div>
          ) : (
            <div className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">
              <AlertCircle className="w-4 h-4 mr-1" />
              Beklemede
            </div>
          )}
        </div>
        
        {/* Sadece danisman veya sks onaylama/reddetme yapabilir (Aşamalı Sistem) */}
        {canApprove && canUserTakeAction() && !isActiveRejection && (
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
        
        {/* Red sebebi giriş alanı (Aşamalı Sistem) */}
        {canApprove && canUserTakeAction() && isActiveRejection && (
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
                <XCircle className="w-6 h-6" />
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

        {/* Zaman Dilimleri */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Etkinlik Zaman Dilimleri</label>
          {basvuru.zamanDilimleri && basvuru.zamanDilimleri.length > 0 ? (
            <div className="space-y-2">
              {basvuru.zamanDilimleri.map((zaman, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-800">
                      {index + 1}. Zaman Dilimi:
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="text-sm">
                      <strong>Başlangıç:</strong> {new Date(zaman.baslangic).toLocaleString('tr-TR')}
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="text-sm">
                      <strong>Bitiş:</strong> {new Date(zaman.bitis).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500 text-sm">
              Zaman dilimi belirtilmemiş
            </div>
          )}
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

        {/* Etkinlik Görseli - Her zaman görünsün */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Etkinlik Görseli</label>
          {basvuru.etkinlikGorseli ? (
            <button
              onClick={handleGorselGoster}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              <Image className="w-4 h-4" />
              Görseli Görüntüle
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-500 rounded-lg border border-gray-200">
              <Image className="w-4 h-4" />
              Görsel yüklenmemiş
            </div>
          )}
        </div>

        {showBelgeler && basvuru.belgeler && basvuru.belgeler.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yüklenen Belgeler</label>
            <div className="space-y-2">
              {(userRole === 'sks' 
                ? basvuru.belgeler.filter(b => 
                    // SKS: Sadece danışman tarafından onaylanmış belgeleri göster
                    b.danismanOnay?.durum === 'Onaylandı'
                  ) 
                : basvuru.belgeler
              ).map((belge, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{belge.tip}</span>
                      {belge.belgeNotu && (
                        <button
                          onClick={() => handleBelgeNotuGoster(belge.dosyaAdi, belge.belgeNotu)}
                          className="p-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full flex-shrink-0"
                          title="Belge notunu gör"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{belge.dosyaAdi}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {renderOnayDurumu(belge.id!, belge)}
                    
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

        {showHistory && (
          <div className="mt-6 pt-6 border-t">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Onay Geçmişi</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {basvuru.danismanOnay && (
                  <div>
                    <strong>Danışman:</strong> {basvuru.danismanOnay.durum} 
                    {basvuru.danismanOnay.tarih && ` (${new Date(basvuru.danismanOnay.tarih).toLocaleString('tr-TR')})`}
                    {basvuru.danismanOnay.redSebebi && (
                      <div className="text-red-600 ml-4">Red Sebebi: {basvuru.danismanOnay.redSebebi}</div>
                    )}
                  </div>
                )}
                {basvuru.sksOnay && (
                  <div>
                    <strong>SKS:</strong> {basvuru.sksOnay.durum}
                    {basvuru.sksOnay.tarih && ` (${new Date(basvuru.sksOnay.tarih).toLocaleString('tr-TR')})`}
                    {basvuru.sksOnay.redSebebi && (
                      <div className="text-red-600 ml-4">Red Sebebi: {basvuru.sksOnay.redSebebi}</div>
                    )}
                  </div>
                )}
                {!basvuru.danismanOnay && !basvuru.sksOnay && (
                  <div>Henüz onay/red işlemi yapılmamış</div>
                )}
              </div>
            </div>
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
        
        {/* Action buttons for SKS and Danışman */}
        {(userRole === 'sks' || userRole === 'danisman') && (onApprove || onReject) && (
          <div className="mt-6 pt-6 border-t flex justify-end gap-4">
            {onReject && (
              <button
                onClick={() => onReject(basvuru)}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reddet
              </button>
            )}
            {onApprove && (
              <button
                onClick={() => onApprove(basvuru)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Onayla
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}