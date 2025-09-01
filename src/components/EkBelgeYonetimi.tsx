import React, { useState, useEffect } from 'react';
import { FileDown, CheckCircle, XCircle, AlertCircle, Upload, Plus, X, Download, Clock, File } from 'lucide-react';
import { EtkinlikBasvuru, EkBelge } from '../types';
import { ekBelgeYukle, getEkBelgeler, ekBelgeIndir, ekBelgeOnayla, ekBelgeReddet } from '../utils/supabaseStorage';

interface EkBelgeYonetimiProps {
  etkinlik: EtkinlikBasvuru;
  userRole?: 'admin' | 'sks' | 'danisman' | 'kulup_baskani';
  onEkBelgeGuncellendi?: () => void;
}

export function EkBelgeYonetimi({ etkinlik, userRole, onEkBelgeGuncellendi }: EkBelgeYonetimiProps) {
  const [ekBelgeler, setEkBelgeler] = useState<EkBelge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yeniBelge, setYeniBelge] = useState<{
    tip: 'Afiş' | 'KatilimciListesi' | 'KumanyaTalep' | 'AracIstek' | 'AfisBasim' | 'Diger';
    aciklama: string;
    dosya: File | null;
  }>({
    tip: 'Diger',
    aciklama: '',
    dosya: null
  });
  const [showYeniBelgeForm, setShowYeniBelgeForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeRedBelgeId, setActiveRedBelgeId] = useState<string | null>(null);
  const [redSebebi, setRedSebebi] = useState('');

  useEffect(() => {
    const fetchEkBelgeler = async () => {
      if (!etkinlik?.id) {
        return;
      }
      
      try {
        setLoading(true);
        const belgeler = await getEkBelgeler(etkinlik.id);
        setEkBelgeler(belgeler);
        setError(null);
      } catch (error) {
        console.error('Ek belgeleri getirme hatası:', error);
        setError('Ek belgeleri yüklerken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEkBelgeler();
  }, [etkinlik?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setYeniBelge({
        ...yeniBelge,
        dosya: e.target.files[0]
      });
    }
  };

  const handleTipChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYeniBelge({
      ...yeniBelge,
      tip: e.target.value as 'Afiş' | 'KatilimciListesi' | 'KumanyaTalep' | 'AracIstek' | 'AfisBasim' | 'Diger'
    });
  };

  const handleAciklamaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setYeniBelge({
      ...yeniBelge,
      aciklama: e.target.value
    });
  };

  const handleEkBelgeYukle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!yeniBelge.dosya || !yeniBelge.tip.trim()) {
      alert('Lütfen belge tipi belirtin ve bir dosya seçin');
      return;
    }
    
    try {
      setUploading(true);
      
      const dosyaYuklendi = await ekBelgeYukle({
        etkinlikId: etkinlik.id,
        tip: yeniBelge.tip,
        dosya: yeniBelge.dosya,
        dosyaAdi: yeniBelge.dosya.name,
        aciklama: yeniBelge.aciklama
      });
      
      if (dosyaYuklendi) {
        alert('Ek belge başarıyla yüklendi');
        
        // Formu sıfırla
        setYeniBelge({
          tip: 'Diger',
          aciklama: '',
          dosya: null
        });
        setShowYeniBelgeForm(false);
        
        // Belgeleri yeniden yükle
        const belgeler = await getEkBelgeler(etkinlik.id);
        setEkBelgeler(belgeler);
        
        // Üst bileşeni bilgilendir
        if (onEkBelgeGuncellendi) {
          onEkBelgeGuncellendi();
        }
      } else {
        alert('Belge yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Belge yükleme hatası:', error);
      alert('Belge yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleBelgeIndir = async (belge: EkBelge) => {
    if (!belge.dosya) {
      alert('Belge yolu bulunamadı');
      return;
    }
    
    try {
      // Dosyayı string olarak kontrol et
      if (typeof belge.dosya !== 'string') {
        alert('Geçersiz belge formatı');
        return;
      }
      
      console.log('İndirilmeye çalışılan dosya yolu:', belge.dosya);
      
      const downloadUrl = await ekBelgeIndir(belge.dosya);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = belge.dosyaAdi;
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

  const handleBelgeOnayla = async (belge: EkBelge) => {
    if (!belge.id) {
      alert('Belge ID bulunamadı');
      return;
    }
    
    try {
      const onaylayan = userRole === 'danisman' ? 'Danışman' : 'SKS';
      const success = await ekBelgeOnayla(belge.id, onaylayan);
      
      if (success) {
        alert('Belge başarıyla onaylandı');
        // Belgeleri yeniden yükle
        const belgeler = await getEkBelgeler(etkinlik.id);
        setEkBelgeler(belgeler);
        
        // Üst bileşeni bilgilendir
        if (onEkBelgeGuncellendi) {
          onEkBelgeGuncellendi();
        }
      } else {
        alert('Belge onaylanırken bir hata oluştu');
      }
    } catch (error) {
      console.error('Belge onaylama hatası:', error);
      alert('Belge onaylanırken bir hata oluştu');
    }
  };

  const handleBelgeReddetBaslat = (belgeId: string) => {
    setActiveRedBelgeId(belgeId);
    setRedSebebi('');
  };
  
  const handleBelgeReddetIptal = () => {
    setActiveRedBelgeId(null);
    setRedSebebi('');
  };

  const handleBelgeReddet = async (belge: EkBelge) => {
    if (!belge.id) {
      alert('Belge ID bulunamadı');
      return;
    }
    
    try {
      if (!redSebebi.trim()) {
        alert('Lütfen red sebebini belirtiniz');
        return;
      }
      
      const reddeden = userRole === 'danisman' ? 'Danışman' : 'SKS';
      const success = await ekBelgeReddet(belge.id, reddeden, redSebebi);
      
      if (success) {
        alert('Belge başarıyla reddedildi');
        setActiveRedBelgeId(null);
        setRedSebebi('');
        
        // Belgeleri yeniden yükle
        const belgeler = await getEkBelgeler(etkinlik.id);
        setEkBelgeler(belgeler);
        
        // Üst bileşeni bilgilendir
        if (onEkBelgeGuncellendi) {
          onEkBelgeGuncellendi();
        }
      } else {
        alert('Belge reddedilirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Belge reddetme hatası:', error);
      alert('Belge reddedilirken bir hata oluştu');
    }
  };

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Ek Belgeler</h3>
        
        {userRole === 'kulup_baskani' && (
          <button
            onClick={() => setShowYeniBelgeForm(!showYeniBelgeForm)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            {showYeniBelgeForm ? (
              <>
                <X className="w-4 h-4 mr-1" />
                Vazgeç
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Ek Belge Ekle
              </>
            )}
          </button>
        )}
      </div>
      
      {showYeniBelgeForm && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <form onSubmit={handleEkBelgeYukle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Belge Tipi</label>
              <select
                value={yeniBelge.tip}
                onChange={handleTipChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              >
                <option value="Afiş">Afiş</option>
                <option value="KatilimciListesi">Katılımcı Listesi</option>
                <option value="KumanyaTalep">Kumanya Talep Formu</option>
                <option value="AracIstek">Araç İstek Formu</option>
                <option value="AfisBasim">Afiş Basım Formu</option>
                <option value="Diger">Diğer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Açıklama</label>
              <textarea
                value={yeniBelge.aciklama}
                onChange={handleAciklamaChange}
                placeholder="Belge ile ilgili not ekleyin (opsiyonel)"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Dosya</label>
              <div className="mt-1 flex items-center">
                <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <span>Dosya Seç</span>
                  <input
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                  />
                </label>
                <span className="ml-3 text-sm text-gray-500">
                  {yeniBelge.dosya ? yeniBelge.dosya.name : 'Dosya seçilmedi'}
                </span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading || !yeniBelge.dosya || !yeniBelge.tip.trim()}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  uploading || !yeniBelge.dosya || !yeniBelge.tip.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Yükle
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-sm text-gray-500">Belgeler yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>{error}</p>
        </div>
      ) : ekBelgeler.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-5 rounded-md text-center">
          <File className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm">Bu etkinlik için henüz ek belge bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ekBelgeler.map((belge) => (
            <div 
              key={belge.id} 
              className={`border rounded-lg p-3 ${
                !belge.danismanOnay && userRole === 'danisman' ? 'bg-yellow-50 border-yellow-200' : 
                !belge.sksOnay && userRole === 'sks' ? 'bg-yellow-50 border-yellow-200' : 
                'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{belgeTipiGoster(belge.tip)}</h4>
                  <p className="text-sm text-gray-500 mt-1">{belge.aciklama}</p>
                  <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                    <span>{new Date(belge.olusturmaTarihi).toLocaleDateString('tr-TR')}</span>
                    <span>{belge.dosyaAdi}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBelgeIndir(belge)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                    title="Belgeyi İndir"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  {userRole === 'danisman' && !belge.danismanOnay && (
                    <>
                      {activeRedBelgeId === belge.id ? (
                        <div className="ml-2 flex flex-col space-y-2">
                          <textarea
                            value={redSebebi}
                            onChange={(e) => setRedSebebi(e.target.value)}
                            placeholder="Red sebebi giriniz..."
                            className="p-2 border border-gray-300 rounded text-sm w-full"
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleBelgeReddet(belge)}
                              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                            >
                              Reddet
                            </button>
                            <button
                              onClick={handleBelgeReddetIptal}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleBelgeOnayla(belge)}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-md"
                            title="Belgeyi Onayla"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleBelgeReddetBaslat(belge.id || '')}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                            title="Belgeyi Reddet"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                  
                  {userRole === 'sks' && !belge.sksOnay && (
                    <>
                      {activeRedBelgeId === belge.id ? (
                        <div className="ml-2 flex flex-col space-y-2">
                          <textarea
                            value={redSebebi}
                            onChange={(e) => setRedSebebi(e.target.value)}
                            placeholder="Red sebebi giriniz..."
                            className="p-2 border border-gray-300 rounded text-sm w-full"
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleBelgeReddet(belge)}
                              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                            >
                              Reddet
                            </button>
                            <button
                              onClick={handleBelgeReddetIptal}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleBelgeOnayla(belge)}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-md"
                            title="Belgeyi Onayla"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleBelgeReddetBaslat(belge.id || '')}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                            title="Belgeyi Reddet"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-2 flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-xs font-medium mr-2">Danışman:</span>
                  {belge.danismanOnay?.durum === 'Onaylandı' ? (
                    <span className="inline-flex items-center text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3 mr-1" /> Onaylandı
                    </span>
                  ) : belge.danismanOnay?.durum === 'Reddedildi' ? (
                    <span className="inline-flex items-center text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                      <XCircle className="w-3 h-3 mr-1" /> Reddedildi
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3 mr-1" /> Beklemede
                    </span>
                  )}
                </div>
                
                <div className="flex items-center">
                  <span className="text-xs font-medium mr-2">SKS:</span>
                  {belge.sksOnay?.durum === 'Onaylandı' ? (
                    <span className="inline-flex items-center text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3 mr-1" /> Onaylandı
                    </span>
                  ) : belge.sksOnay?.durum === 'Reddedildi' ? (
                    <span className="inline-flex items-center text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                      <XCircle className="w-3 h-3 mr-1" /> Reddedildi
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3 mr-1" /> Beklemede
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 