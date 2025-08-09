import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Upload, Trash2, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import { 
  formlariGetir, 
  formYukle, 
  formIndir, 
  formSil, 
  FormDosyasi 
} from '../utils/supabaseStorage';

export function FormYonetimi() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [formlar, setFormlar] = useState<FormDosyasi[]>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState<string>(isAdmin ? 'tümü' : 'SKS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Yeni form yükleme state'leri
  const [dosya, setDosya] = useState<File | null>(null);
  const [formAdi, setFormAdi] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const [formKategori, setFormKategori] = useState<'Kulüp' | 'Etkinlik' | 'SKS' | 'Diğer'>(isAdmin ? 'Kulüp' : 'SKS');
  const [yuklemeLoading, setYuklemeLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form silme state'i
  const [silinecekForm, setSilinecekForm] = useState<FormDosyasi | null>(null);

  useEffect(() => {
    fetchFormlar();
  }, []);

  const fetchFormlar = async () => {
    try {
      setLoading(true);
      const data = isAdmin ? await formlariGetir() : await formlariGetir('SKS');
      setFormlar(data);
      setError(null);
    } catch (err) {
      console.error('Formlar yüklenirken hata oluştu:', err);
      setError('Formlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormIndir = async (dosyaYolu: string, formAdi: string) => {
    try {
      const indirmeBaglantisi = await formIndir(dosyaYolu);
      if (!indirmeBaglantisi) {
        setError('Form indirme bağlantısı oluşturulamadı.');
        return;
      }
      
      // İndirme bağlantısını yeni sekmede aç
      window.open(indirmeBaglantisi, '_blank');
    } catch (err) {
      console.error('Form indirilirken hata oluştu:', err);
      setError('Form indirilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const handleFormSil = async () => {
    if (!silinecekForm) return;
    
    try {
      const sonuc = await formSil(silinecekForm.id, silinecekForm.dosyaYolu);
      if (sonuc) {
        setFormlar(formlar.filter(f => f.id !== silinecekForm.id));
        setSuccessMessage(`"${silinecekForm.isim}" formu başarıyla silindi.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Form silinirken bir hata oluştu.');
      }
      setSilinecekForm(null);
    } catch (err) {
      console.error('Form silinirken hata oluştu:', err);
      setError('Form silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setSilinecekForm(null);
    }
  };

  const handleFormYukle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dosya || !formAdi.trim()) {
      setError('Lütfen bir dosya seçin ve form adını girin.');
      return;
    }
    
    try {
      setYuklemeLoading(true);
      const yeniForm = await formYukle(dosya, {
        isim: formAdi,
        aciklama: formAciklama,
        kategori: formKategori
      });
      
      if (yeniForm) {
        setFormlar([yeniForm, ...formlar]);
        setSuccessMessage(`"${formAdi}" formu başarıyla yüklendi.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        
        // Formu temizle
        setDosya(null);
        setFormAdi('');
        setFormAciklama('');
        setFormKategori('Kulüp');
        setShowForm(false);
      } else {
        setError('Form yüklenirken bir hata oluştu.');
      }
    } catch (err) {
      console.error('Form yüklenirken hata oluştu:', err);
      setError('Form yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setYuklemeLoading(false);
    }
  };

  // Form uzantısını al (PDF, DOCX, vb.)
  const getFileFormat = (dosyaYolu: string): string => {
    const parcalar = dosyaYolu.split('.');
    return parcalar.length > 1 ? parcalar[parcalar.length - 1].toUpperCase() : 'BELGE';
  };

  const filtrelenmisFormlar = formlar
    .filter(form => 
      form.isim.toLowerCase().includes(aramaMetni.toLowerCase()) &&
      (kategoriFilter === 'tümü' || form.kategori.toLowerCase() === kategoriFilter.toLowerCase())
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <button
        onClick={() => navigate(isAdmin ? '/admin' : '/sks-paneli')}
        className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {isAdmin ? 'Admin Paneline Dön' : 'SKS Paneline Dön'}
      </button>
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Form Yönetimi</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 ${showForm ? 'bg-gray-600' : 'bg-blue-600'} text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors`}
          >
            {showForm ? 'İptal' : 'Yeni Form Yükle'}
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
            <button 
              onClick={() => setError(null)} 
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Yeni Form Yükle</h2>
            <form onSubmit={handleFormYukle}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="formAdi" className="block text-sm font-medium text-gray-700 mb-1">
                    Form Adı *
                  </label>
                  <input
                    type="text"
                    id="formAdi"
                    value={formAdi}
                    onChange={(e) => setFormAdi(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="formAciklama" className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    id="formAciklama"
                    value={formAciklama}
                    onChange={(e) => setFormAciklama(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
                
                <div>
                  <label htmlFor="formKategori" className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    id="formKategori"
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Kulüp">Kulüp</option>
                    <option value="Etkinlik">Etkinlik</option>
                    <option value="SKS">SKS</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="dosya" className="block text-sm font-medium text-gray-700 mb-1">
                    Dosya *
                  </label>
                  <div className="flex items-center">
                    <input
                      type="file"
                      id="dosya"
                      onChange={(e) => setDosya(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      required
                    />
                    <label
                      htmlFor="dosya"
                      className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors flex-grow"
                    >
                      {dosya ? dosya.name : 'Dosya seçin...'}
                    </label>
                    {dosya && (
                      <button
                        type="button"
                        onClick={() => setDosya(null)}
                        className="ml-2 text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    PDF, Word, Excel ve PowerPoint dosyaları desteklenir.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={yuklemeLoading || !dosya || !formAdi.trim()}
                >
                  {yuklemeLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Yükleniyor...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Formu Yükle
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
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
            
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="w-full sm:w-auto py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="tümü">Tüm Kategoriler</option>
              <option value="Kulüp">Kulüp</option>
              <option value="Etkinlik">Etkinlik</option>
              <option value="SKS">SKS</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
          
          <div className="space-y-4">
            {filtrelenmisFormlar.map((form) => (
              <div key={form.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex-grow">
                  <h3 className="font-medium text-gray-800">{form.isim}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {form.kategori}
                    </span>
                    <span className="text-sm text-gray-500">
                      {getFileFormat(form.dosyaYolu)} formatında
                    </span>
                  </div>
                  {form.aciklama && (
                    <p className="text-sm text-gray-600 mt-1">{form.aciklama}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Yüklenme: {new Date(form.yuklemeTarihi).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleFormIndir(form.dosyaYolu, form.isim)}
                    className="text-blue-600 hover:text-blue-700 p-1"
                    title="İndir"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setSilinecekForm(form)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Sil"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {filtrelenmisFormlar.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {aramaMetni || kategoriFilter !== 'tümü' 
                  ? 'Aradığınız kriterlere uygun form bulunamadı.' 
                  : 'Henüz yüklenmiş form bulunmamaktadır.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form silme onay modalı */}
      {silinecekForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Formu Sil</h3>
            <p className="text-gray-600 mb-6">
              <span className="font-medium">{silinecekForm.isim}</span> formunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSilinecekForm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleFormSil}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 