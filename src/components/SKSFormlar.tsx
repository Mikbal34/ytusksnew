import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download } from 'lucide-react';
import { formlariGetir, formIndir, FormDosyasi } from '../utils/supabaseStorage';

export function SKSFormlar() {
  const navigate = useNavigate();
  const [aramaMetni, setAramaMetni] = useState('');
  const [formlar, setFormlar] = useState<FormDosyasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFormlar() {
      try {
        setLoading(true);
        // Sadece SKS kategorisindeki formları getir
        const data = await formlariGetir('SKS');
        setFormlar(data);
        setError(null);
      } catch (err) {
        console.error('Formlar yüklenirken hata oluştu:', err);
        setError('Formlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    }

    fetchFormlar();
  }, []);

  const handleFormIndir = async (dosyaYolu: string, formAdi: string) => {
    try {
      const indirmeBaglantisi = await formIndir(dosyaYolu);
      if (!indirmeBaglantisi) {
        alert('Form indirme bağlantısı oluşturulamadı.');
        return;
      }
      
      // İndirme bağlantısını yeni sekmede aç
      window.open(indirmeBaglantisi, '_blank');
    } catch (err) {
      console.error('Form indirilirken hata oluştu:', err);
      alert('Form indirilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  // Form uzantısını al (PDF, DOCX, vb.)
  const getFileFormat = (dosyaYolu: string): string => {
    const parcalar = dosyaYolu.split('.');
    return parcalar.length > 1 ? parcalar[parcalar.length - 1].toUpperCase() : 'BELGE';
  };

  const filtrelenmisFormlar = formlar
    .filter(form => 
      form.isim.toLowerCase().includes(aramaMetni.toLowerCase())
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Formlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Hata</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/sks-paneli')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            SKS Paneline Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <button
        onClick={() => navigate('/sks-paneli')}
        className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> SKS Paneline Dön
      </button>
      
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">SKS Formları</h1>
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Form ara..."
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="space-y-4">
          {filtrelenmisFormlar.map((form) => (
            <div key={form.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div>
                <h3 className="font-medium text-gray-800">{form.isim}</h3>
                <div className="flex gap-2 items-center mt-1">
                  <span className="text-sm text-gray-500">
                    {getFileFormat(form.dosyaYolu)} formatında
                  </span>
                </div>
                {form.aciklama && (
                  <p className="text-sm text-gray-600 mt-1">{form.aciklama}</p>
                )}
              </div>
              <button 
                onClick={() => handleFormIndir(form.dosyaYolu, form.isim)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4" />
                İndir
              </button>
            </div>
          ))}
          {filtrelenmisFormlar.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {aramaMetni 
                ? 'Aradığınız kriterlere uygun form bulunamadı.' 
                : 'Henüz yüklenmiş form bulunmamaktadır.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 