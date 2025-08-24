import React, { useEffect, useState } from 'react';
import { X, Info, FileEdit, Calendar, User, MessageCircle, Clock } from 'lucide-react';
import { EtkinlikRevizyonGecmisi } from '../types';
import { getRevizyonGecmisi } from '../utils/supabaseStorage';

interface RevizyonGecmisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  basvuruId: string;
  etkinlikAdi: string;
}

export const RevizyonGecmisiModal: React.FC<RevizyonGecmisiModalProps> = ({
  isOpen,
  onClose,
  basvuruId,
  etkinlikAdi,
}) => {
  const [revizyonlar, setRevizyonlar] = useState<EtkinlikRevizyonGecmisi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && basvuruId) {
      fetchRevizyonGecmisi();
    }
  }, [isOpen, basvuruId]);

  const fetchRevizyonGecmisi = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRevizyonGecmisi(basvuruId);
      setRevizyonlar(data);
    } catch (error) {
      console.error('Revizyon geçmişi yüklenirken hata:', error);
      setError('Revizyon geçmişi yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatTarih = (tarih: string) => {
    return new Date(tarih).toLocaleString('tr-TR');
  };

  const getRevizyonTuruText = (turu: string) => {
    switch (turu) {
      case 'belgeler':
        return 'Sadece Belgeler';
      case 'etkinlik':
        return 'Sadece Etkinlik Bilgileri';
      case 'ikisi':
        return 'Etkinlik Bilgileri ve Belgeler';
      default:
        return turu;
    }
  };

  const getRevizyonTuruIcon = (turu: string) => {
    switch (turu) {
      case 'belgeler':
        return '📄';
      case 'etkinlik':
        return '📅';
      case 'ikisi':
        return '📋';
      default:
        return '🔄';
    }
  };

  const getDegisimAlanları = (degisen_alanlar: any) => {
    if (!degisen_alanlar || typeof degisen_alanlar !== 'object') {
      return [];
    }
    
    const alanlar = [];
    for (const [key, value] of Object.entries(degisen_alanlar)) {
      if (value) {
        alanlar.push(key);
      }
    }
    return alanlar;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            Revizyon Geçmişi
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Etkinlik:</h4>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
              {etkinlikAdi}
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Revizyon geçmişi yükleniyor...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">❌ {error}</div>
              <button
                onClick={fetchRevizyonGecmisi}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {!loading && !error && revizyonlar.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Bu başvuru için henüz revizyon geçmişi bulunmuyor.</p>
            </div>
          )}

          {!loading && !error && revizyonlar.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Toplam {revizyonlar.length} revizyon bulundu
              </div>

              {revizyonlar.map((revizyon, index) => (
                <div
                  key={revizyon.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getRevizyonTuruIcon(revizyon.revizyon_turu)}</span>
                      <div>
                        <h5 className="font-semibold text-gray-800">
                          Revizyon #{revizyon.revizyon_numarasi}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {getRevizyonTuruText(revizyon.revizyon_turu)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Calendar className="w-3 h-3" />
                        {formatTarih(revizyon.revizyon_tarihi)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTarih(revizyon.created_at)}
                      </div>
                    </div>
                  </div>

                  {revizyon.revizyon_aciklamasi && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1">
                        <MessageCircle className="w-3 h-3" />
                        Açıklama:
                      </div>
                      <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border-l-4 border-blue-500">
                        {revizyon.revizyon_aciklamasi}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-gray-700 mb-2">Eski Bilgiler:</div>
                      <div className="space-y-1 text-gray-600">
                        <div><strong>Etkinlik Adı:</strong> {revizyon.eski_etkinlik_adi}</div>
                        {revizyon.eski_etkinlik_turu && (
                          <div><strong>Tür:</strong> {revizyon.eski_etkinlik_turu}</div>
                        )}
                        {revizyon.eski_etkinlik_yeri && (
                          <div>
                            <strong>Yer:</strong> {revizyon.eski_etkinlik_yeri.fakulte} - {revizyon.eski_etkinlik_yeri.detay}
                          </div>
                        )}
                        {revizyon.eski_zaman_dilimleri && revizyon.eski_zaman_dilimleri.length > 0 && (
                          <div>
                            <strong>Tarih:</strong> {new Date(revizyon.eski_zaman_dilimleri[0].baslangic).toLocaleDateString('tr-TR')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-gray-700 mb-2">Onay Durumları:</div>
                      <div className="space-y-1 text-gray-600">
                        {revizyon.eski_danisman_onay && (
                          <div>
                            <strong>Danışman:</strong> 
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              revizyon.eski_danisman_onay.durum === 'Onaylandı' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {revizyon.eski_danisman_onay.durum}
                            </span>
                          </div>
                        )}
                        {revizyon.eski_sks_onay && (
                          <div>
                            <strong>SKS:</strong>
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              revizyon.eski_sks_onay.durum === 'Onaylandı' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {revizyon.eski_sks_onay.durum}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {revizyon.degisen_alanlar && getDegisimAlanları(revizyon.degisen_alanlar).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-semibold text-gray-700 mb-1">Değişen Alanlar:</div>
                      <div className="flex flex-wrap gap-1">
                        {getDegisimAlanları(revizyon.degisen_alanlar).map((alan, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-800"
                          >
                            {alan}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
