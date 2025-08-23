import { useState } from 'react';
import { EtkinlikBasvuru } from '../types';

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

  if (!basvuru) {
    return null;
  }

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
            <div className="mt-1 text-gray-900">{basvuru.baslangicTarihi ? new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR') : 'Belirtilmemiş'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
            <div className="mt-1 text-gray-900">{basvuru.bitisTarihi ? new Date(basvuru.bitisTarihi).toLocaleString('tr-TR') : 'Belirtilmemiş'}</div>
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
                ? basvuru.belgeler.filter(b => 
                    // SKS: Sadece danışman onaylamış belgeleri veya henüz hiç onaylanmamış belgeleri göster
                    !b.danismanOnay || b.danismanOnay.durum === 'Onaylandı'
                  ) 
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
  );
}