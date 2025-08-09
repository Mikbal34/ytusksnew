import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBasvuruById, etkinlikBelgeIndir } from '../utils/supabaseStorage';
import { BasvuruDetay } from './BasvuruDetay';
import { ArrowLeft, Calendar, MapPin, User } from 'lucide-react';
import { EtkinlikBasvuru } from '../types';

export function EtkinlikDetay() {
  const { etkinlikId } = useParams<{ etkinlikId: string }>();
  const [basvuru, setBasvuru] = useState<EtkinlikBasvuru | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBasvuru = async () => {
      if (!etkinlikId) return;
      
      try {
        setLoading(true);
        const data = await getBasvuruById(etkinlikId);
        setBasvuru(data);
        setError(null);
      } catch (err) {
        console.error('Etkinlik detayları alınırken hata:', err);
        setError('Etkinlik detayları yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchBasvuru();
  }, [etkinlikId]);

  const handleBelgeIndir = async (belge: string, dosyaAdi: string) => {
    try {
      const downloadUrl = await etkinlikBelgeIndir(belge);
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

  const handleEkBelgeGuncellendi = async () => {
    // Etkinlik bilgilerini yeniden yükle
    if (!etkinlikId) return;
      
    try {
      const data = await getBasvuruById(etkinlikId);
      setBasvuru(data);
    } catch (err) {
      console.error('Etkinlik detayları güncellenirken hata:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Etkinlik bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !basvuru) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-8">
            <h2 className="text-xl text-red-600 mb-2">Hata</h2>
            <p className="text-gray-600">{error || 'Etkinlik bulunamadı'}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Başvurularıma Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Başvurularıma Dön
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="border-b pb-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{basvuru.etkinlikAdi}</h1>
            <p className="text-lg text-blue-600">{basvuru.kulupAdi}</p>
            
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                <span>
                  {new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {basvuru.etkinlikYeri && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-2 text-red-500" />
                  <span>
                    {basvuru.etkinlikYeri.fakulte}
                    {basvuru.etkinlikYeri.detay && ` (${basvuru.etkinlikYeri.detay})`}
                  </span>
                </div>
              )}
              
              <div className="flex items-center text-gray-600">
                <User className="w-5 h-5 mr-2 text-green-500" />
                <span>
                  Durum: 
                  <span className={`ml-1 font-medium ${
                    basvuru.durum === 'Onaylandı' ? 'text-green-600' :
                    basvuru.durum === 'Reddedildi' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {basvuru.durum}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <BasvuruDetay
            basvuru={basvuru}
            showHistory={true}
            showBelgeler={true}
            onBelgeIndir={handleBelgeIndir}
            userRole="kulup_baskani"
            showEkBelgeler={true}
            onEkBelgeGuncellendi={handleEkBelgeGuncellendi}
          />
        </div>
      </div>
    </div>
  );
} 