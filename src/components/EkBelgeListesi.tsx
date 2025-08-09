import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, FileDown, Eye, Clock, Filter, SortAsc, SortDesc } from 'lucide-react';
import { EkBelge, EtkinlikBasvuru } from '../types';

// Extended EkBelge type with event information
interface ExtendedEkBelge extends EkBelge {
  etkinlikAdi: string;
  kulupAdi: string;
}

interface EkBelgeListesiProps {
  ekBelgeler: ExtendedEkBelge[];
  etkinlikler: EtkinlikBasvuru[];
  userRole: 'admin' | 'sks' | 'danisman' | 'kulup_baskani';
  onBelgeIndir: (dosya: string, dosyaAdi: string) => Promise<void>;
  onBelgeOnayla?: (belgeId: string) => Promise<void>;
  onBelgeReddet?: (belgeId: string, redSebebi: string) => Promise<void>;
  onViewEtkinlik?: (etkinlik: EtkinlikBasvuru) => void;
  bekleyenBelgeSayisi?: number;
}

// Belge tiplerinin insan dostu gösterimi için yardımcı fonksiyon
const belgeTipiGoster = (tip: string): string => {
  switch (tip) {
    case 'Afiş': return 'Afiş';
    case 'KatilimciListesi': return 'Katılımcı Listesi';
    case 'KumanyaTalep': return 'Kumanya Talep Formu';
    case 'AracIstek': return 'Araç İstek Formu';
    case 'AfisBasim': return 'Afiş Basım Formu';
    case 'Diger': return 'Diğer';
    default: return tip;
  }
};

export const EkBelgeListesi: React.FC<EkBelgeListesiProps> = ({
  ekBelgeler,
  etkinlikler,
  userRole,
  onBelgeIndir,
  onBelgeOnayla,
  onBelgeReddet,
  onViewEtkinlik,
  bekleyenBelgeSayisi = 0,
}) => {
  const [belgeAramaMetni, setBelgeAramaMetni] = useState('');
  const [belgeFiltresi, setBelgeFiltresi] = useState<'hepsi' | 'bekleyen' | 'onaylanan' | 'reddedilen'>('hepsi');
  const [belgeSiralama, setBelgeSiralama] = useState<'yeni' | 'eski'>('yeni');
  const [activeRedBelgeId, setActiveRedBelgeId] = useState<string | null>(null);
  const [redSebebi, setRedSebebi] = useState('');

  // Filter documents based on search text, filter type, and sorting
  const filtrelenmisEkBelgeler = ekBelgeler
    .filter(belge => {
      // Status filter
      if (belgeFiltresi === 'bekleyen') {
        return userRole === 'sks' ? !belge.sksOnay : !belge.danismanOnay;
      } else if (belgeFiltresi === 'onaylanan') {
        return userRole === 'sks' 
          ? belge.sksOnay?.durum === 'Onaylandı' 
          : belge.danismanOnay?.durum === 'Onaylandı';
      } else if (belgeFiltresi === 'reddedilen') {
        return userRole === 'sks' 
          ? belge.sksOnay?.durum === 'Reddedildi' 
          : belge.danismanOnay?.durum === 'Reddedildi';
      }
      return true; // 'all' case
    })
    .filter(belge => {
      // Search filter
      const searchLower = belgeAramaMetni.toLowerCase();
      return (
        belge.tip.toLowerCase().includes(searchLower) ||
        belge.etkinlikAdi.toLowerCase().includes(searchLower) ||
        belge.kulupAdi.toLowerCase().includes(searchLower) ||
        (belge.aciklama && belge.aciklama.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      // Sorting
      const dateA = new Date(a.olusturmaTarihi).getTime();
      const dateB = new Date(b.olusturmaTarihi).getTime();
      return belgeSiralama === 'yeni' ? dateB - dateA : dateA - dateB;
    });

  // Get document status information (color, icon, status text)
  const getBelgeDurumBilgisi = (belge: ExtendedEkBelge) => {
    const onay = userRole === 'sks' ? belge.sksOnay : belge.danismanOnay;
    
    if (!onay) {
      return {
        renk: 'bg-yellow-100 text-yellow-800',
        simge: <Clock className="w-4 h-4" />,
        durum: 'Beklemede'
      };
    } else if (onay.durum === 'Onaylandı') {
      return {
        renk: 'bg-green-100 text-green-800',
        simge: <CheckCircle className="w-4 h-4" />,
        durum: 'Onaylandı'
      };
    } else {
      return {
        renk: 'bg-red-100 text-red-800',
        simge: <XCircle className="w-4 h-4" />,
        durum: 'Reddedildi'
      };
    }
  };

  // Handle document rejection
  const handleReddet = async (belgeId: string) => {
    if (!redSebebi.trim() || !onBelgeReddet) {
      alert('Lütfen red sebebini belirtiniz!');
      return;
    }
    
    await onBelgeReddet(belgeId, redSebebi);
    setActiveRedBelgeId(null);
    setRedSebebi('');
  };

  return (
    <div className="space-y-6">
      {/* Search and Filtering */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Belge ara..."
            value={belgeAramaMetni}
            onChange={(e) => setBelgeAramaMetni(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex gap-2">
          <select
            value={belgeFiltresi}
            onChange={(e) => setBelgeFiltresi(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="hepsi">Tüm Belgeler</option>
            <option value="bekleyen">Bekleyenler</option>
            <option value="onaylanan">Onaylananlar</option>
            <option value="reddedilen">Reddedilenler</option>
          </select>
          
          <button
            onClick={() => setBelgeSiralama(belgeSiralama === 'yeni' ? 'eski' : 'yeni')}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {belgeSiralama === 'yeni' ? (
              <>
                <SortDesc className="w-4 h-4 mr-1" />
                En Yeni
              </>
            ) : (
              <>
                <SortAsc className="w-4 h-4 mr-1" />
                En Eski
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Documents List */}
      <div className="space-y-4">
        {filtrelenmisEkBelgeler.length > 0 ? (
          filtrelenmisEkBelgeler.map((belge) => {
            const durumBilgisi = getBelgeDurumBilgisi(belge);
            const canApprove = userRole === 'sks' ? !belge.sksOnay : !belge.danismanOnay;
            
            return (
              <div key={belge.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{belgeTipiGoster(belge.tip)}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full flex items-center ${durumBilgisi.renk}`}>
                        {durumBilgisi.simge}
                        <span className="ml-1">{durumBilgisi.durum}</span>
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{belge.dosyaAdi}</div>
                    {belge.aciklama && (
                      <div className="text-sm text-gray-600 mt-1">{belge.aciklama}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">{belge.etkinlikAdi}</span> - {belge.kulupAdi}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Yükleme: {new Date(belge.olusturmaTarihi).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canApprove && onBelgeOnayla && onBelgeReddet ? (
                      <>
                        {activeRedBelgeId === belge.id ? (
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
                                onClick={() => handleReddet(belge.id!)}
                                className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                              >
                                Reddet
                              </button>
                              <button
                                onClick={() => {
                                  setActiveRedBelgeId(null);
                                  setRedSebebi('');
                                }}
                                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                              >
                                İptal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => onBelgeOnayla(belge.id!)}
                              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Onayla
                            </button>
                            <button
                              onClick={() => setActiveRedBelgeId(belge.id || null)}
                              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reddet
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-sm">
                        {userRole === 'sks' && belge.sksOnay ? (
                          belge.sksOnay.durum === 'Onaylandı' ? (
                            <span className="text-green-600">
                              {new Date(belge.sksOnay.tarih).toLocaleDateString('tr-TR')} tarihinde onaylandı
                            </span>
                          ) : (
                            <span className="text-red-600" title={belge.sksOnay.redSebebi || ''}>
                              {new Date(belge.sksOnay.tarih).toLocaleDateString('tr-TR')} tarihinde reddedildi
                            </span>
                          )
                        ) : userRole === 'danisman' && belge.danismanOnay ? (
                          belge.danismanOnay.durum === 'Onaylandı' ? (
                            <span className="text-green-600">
                              {new Date(belge.danismanOnay.tarih).toLocaleDateString('tr-TR')} tarihinde onaylandı
                            </span>
                          ) : (
                            <span className="text-red-600" title={belge.danismanOnay.redSebebi || ''}>
                              {new Date(belge.danismanOnay.tarih).toLocaleDateString('tr-TR')} tarihinde reddedildi
                            </span>
                          )
                        ) : null}
                      </div>
                    )}
                    
                    <button
                      onClick={() => onBelgeIndir(belge.dosya as string, belge.dosyaAdi)}
                      className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                      title="İndir"
                    >
                      <FileDown className="w-5 h-5" />
                    </button>
                    
                    {onViewEtkinlik && (
                      <button
                        onClick={() => {
                          const etkinlik = etkinlikler.find(e => e.id === belge.etkinlikId);
                          if (etkinlik) {
                            onViewEtkinlik(etkinlik);
                          }
                        }}
                        className="p-2 text-blue-600 hover:text-blue-700 rounded-full hover:bg-blue-50"
                        title="Etkinlik Detayları"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Status indicators */}
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center">
                    <span className="font-medium mr-2">Danışman:</span>
                    {belge.danismanOnay ? (
                      belge.danismanOnay.durum === 'Onaylandı' ? (
                        <span className="inline-flex items-center text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3 mr-1" /> Onaylandı
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-700 bg-red-50 px-2 py-0.5 rounded-full" title={belge.danismanOnay.redSebebi || ''}>
                          <XCircle className="w-3 h-3 mr-1" /> Reddedildi
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 mr-1" /> Beklemede
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <span className="font-medium mr-2">SKS:</span>
                    {belge.sksOnay ? (
                      belge.sksOnay.durum === 'Onaylandı' ? (
                        <span className="inline-flex items-center text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3 mr-1" /> Onaylandı
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-700 bg-red-50 px-2 py-0.5 rounded-full" title={belge.sksOnay.redSebebi || ''}>
                          <XCircle className="w-3 h-3 mr-1" /> Reddedildi
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 mr-1" /> Beklemede
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            Hiç belge bulunamadı
          </div>
        )}
      </div>
    </div>
  );
}; 