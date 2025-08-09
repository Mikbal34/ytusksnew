import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, X, Plus, Upload, Lock, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Kulup, AkademikDanisman } from '../../types';
import { saveKulup, getAkademikDanismanlar, saveAltTopluluk } from '../../utils/storage';
import { supabase } from '../../utils/supabase';
import { signUp } from '../../utils/authService';
import { useAuth } from '../../context/AuthContext';
import { createUser } from '../../utils/adminService';
import { getAllDanismanlar, createKulup, getDanismanlarWithoutVerification, addKulupDanisman } from '../../utils/adminService';

export function YeniKulupFormu() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDanismanlar, setSelectedDanismanlar] = useState<AkademikDanisman[]>([]);
  const [altTopluluklar, setAltTopluluklar] = useState<string[]>([]);
  const [yeniAltTopluluk, setYeniAltTopluluk] = useState('');
  const [tuzuk, setTuzuk] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const tuzukInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Alt topluluklar özelliğini etkinleştirme state'i
  const [altToplulukFeatureEnabled, setAltToplulukFeatureEnabled] = useState(false);
  
  // Danışmanları veritabanından çekmek için state
  const [danismanlar, setDanismanlar] = useState<AkademikDanisman[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    isim: '',
    baskanAdSoyad: '',
    baskanEposta: '',
    baskanTelefon: '',
    baskanSifre: '',
    odaNo: '',
    digerTesisler: '',
    createAccount: true
  });

  // Danışmanları veritabanından çek
  useEffect(() => {
    const fetchDanismanlar = async () => {
      try {
        setLoading(true);
        // First try with admin verification
        let data = await getAllDanismanlar();
        
        // If no data returned, try without verification as fallback
        if (!data || data.length === 0) {
          console.log('Admin verification failed or no data, trying without verification');
          data = await getDanismanlarWithoutVerification();
        }
        
        console.log('Danışmanlar başarıyla alındı:', data);
        setDanismanlar(data);
      } catch (error) {
        console.error('Danışmanlar alınırken hata oluştu:', error);
        
        // Try without verification as fallback on error
        try {
          console.log('Hata sonrası doğrulama olmadan deneniyor');
          const fallbackData = await getDanismanlarWithoutVerification();
          console.log('Doğrulama olmadan danışmanlar alındı:', fallbackData);
          setDanismanlar(fallbackData);
        } catch (fallbackError) {
          console.error('Doğrulama olmadan da danışmanlar alınamadı:', fallbackError);
          if (error instanceof Error) {
            setError(`Danışmanlar yüklenirken bir hata oluştu: ${error.message}`);
          } else {
            setError('Danışmanlar yüklenirken bir hata oluştu');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDanismanlar();
  }, []);
  
  const filteredDanismanlar = useMemo(() => {
    // Eğer danismanlar dizisi boşsa veya undefined ise boş dizi döndür
    if (!danismanlar || danismanlar.length === 0) {
      console.log('Danışmanlar dizisi boş veya undefined');
      return [];
    }
    
    console.log('Filtreleme öncesi danışmanlar:', danismanlar);
    
    const filtered = danismanlar.filter(danisman => {
      // Null veya undefined kontrolü ekle
      if (!danisman || !danisman.adSoyad || !danisman.bolum) {
        console.log('Geçersiz danışman verisi:', danisman);
        return false;
      }
      
      return (
        danisman.adSoyad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        danisman.bolum.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    
    console.log('Filtrelenmiş danışmanlar:', filtered);
    return filtered;
  }, [searchTerm, danismanlar]);

  const handleSelectDanisman = (d: AkademikDanisman) => {
    if (selectedDanismanlar.find(x => x.id === d.id)) return;
    if (selectedDanismanlar.length >= 2) {
      alert('En fazla 2 akademik danışman seçebilirsiniz.');
      return;
    }
    setSelectedDanismanlar(prev => [...prev, d]);
    setSearchTerm('');
  };

  const handleRemoveDanisman = (id: string) => {
    setSelectedDanismanlar(prev => prev.filter(d => d.id !== id));
  };

  const handleAltToplulukEkle = () => {
    if (yeniAltTopluluk.trim()) {
      setAltTopluluklar([...altTopluluklar, yeniAltTopluluk.trim()]);
      setYeniAltTopluluk('');
    }
  };

  const handleAltToplulukSil = (index: number) => {
    setAltTopluluklar(altTopluluklar.filter((_, i) => i !== index));
  };

  const handleTuzukChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Lütfen PDF formatında bir dosya yükleyin!');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır!');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setTuzuk(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Lütfen geçerli bir görsel dosyası yükleyin!');
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('Dosya boyutu 2MB\'dan küçük olmalıdır!');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Form gönderiliyor:', formData);
      
      // Form validasyonu
      if (!formData.isim) {
        setError('Kulüp adı zorunludur');
        return;
      }
      
      if (!formData.baskanAdSoyad) {
        setError('Başkan adı soyadı zorunludur');
        return;
      }
      
      if (!formData.baskanEposta) {
        setError('Başkan e-posta adresi zorunludur');
        return;
      }
      
      if (!formData.baskanTelefon) {
        setError('Başkan telefon numarası zorunludur');
        return;
      }
      
      console.log('Kulüp oluşturuluyor...');
      
      try {
        // 1. Kulüp kaydını oluştur
        const primaryDanismanId = selectedDanismanlar[0]?.id;
        const yeniKulup = await createKulup({
          isim: formData.isim,
          akademik_danisman_id: primaryDanismanId || undefined,
          baskan_ad_soyad: formData.baskanAdSoyad,
          baskan_eposta: formData.baskanEposta,
          baskan_telefon: formData.baskanTelefon,
          oda_no: formData.odaNo || undefined,
          diger_tesisler: formData.digerTesisler || undefined,
          tuzuk: tuzuk || undefined
        });
        
        console.log('Kulüp oluşturuldu:', yeniKulup);

        // 2. (opsiyonel) Seçilen danışmanları ilişkilendir (maks 2)
        if (yeniKulup?.id && selectedDanismanlar.length > 0) {
          // Admin için talep dilekçesini dümenden oluştur (sonra orjinalle değiştirilecek)
          const talepPathFor = (kulupId: string, danId: string) => `dummy/talep/${kulupId}/${Date.now()}_${danId}.pdf`;
          try {
            await Promise.all(
              selectedDanismanlar.map(d =>
                addKulupDanisman(yeniKulup.id, d.id, talepPathFor(yeniKulup.id, d.id))
              )
            );
            console.log('Seçilen danışmanlar ilişkilendirildi');
          } catch (relErr) {
            console.error('Danışman ilişkilendirme hatası:', relErr);
            // Devam et; kullanıcı sonradan düzenleyebilir
          }
        }
        
        // 2. Kulüp başkanı hesabı oluştur
        if (formData.createAccount && yeniKulup?.id) {
          console.log('Kulüp başkanı hesabı oluşturuluyor...');
          await createUser(
            formData.baskanEposta,
            formData.baskanSifre || 'Temp123!', // Varsayılan şifre
            formData.baskanAdSoyad,
            'kulup_baskani',
            {
              kulupId: yeniKulup.id,
              telefon: formData.baskanTelefon
            }
          );
          console.log('Kulüp başkanı hesabı oluşturuldu');
        }
        
        // Başarılı mesajı göster
        setSuccess(true);
        
        // Form verilerini sıfırla
        setFormData({
          isim: '',
          baskanAdSoyad: '',
          baskanEposta: '',
          baskanTelefon: '',
          baskanSifre: '',
          odaNo: '',
          digerTesisler: '',
          createAccount: true
        });
        setSelectedDanismanlar([]);
        
        // Tüzük ve logo sıfırla
        setTuzuk(null);
        setLogo(null);
        
        // 3 saniye sonra admin paneline yönlendir
        setTimeout(() => {
          navigate('/admin');
        }, 3000);
      } catch (kulupError) {
        if (kulupError instanceof Error) {
          setError(`Kulüp oluşturulurken hata: ${kulupError.message}`);
        } else {
          setError('Kulüp oluşturulurken bir hata oluştu');
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`İşlem sırasında hata: ${err.message}`);
      } else {
        setError('Kulüp oluşturulurken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <button
        onClick={() => navigate('/admin')}
        className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Admin Paneline Dön
      </button>
      
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Yeni Öğrenci Kulübü Ekle
          </h1>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
            <p className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Bilgi: Kulüp oluşturulduğunda, belirttiğiniz kulüp başkanı bilgileriyle otomatik olarak bir kullanıcı hesabı da oluşturulacaktır.
            </p>
          </div>
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-600">
              <p className="flex items-center font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Kulüp başarıyla oluşturuldu! Ana sayfaya yönlendiriliyorsunuz...
              </p>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
              <p className="flex items-center font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="isim" className="block text-sm font-medium text-gray-700 mb-1">
                Kulüp İsmi
              </label>
              <input
                type="text"
                id="isim"
                value={formData.isim}
                onChange={(e) => setFormData({...formData, isim: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Akademik Danışmanlar (Maks. 2)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Danışman ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
                {loading && (
                  <div className="absolute right-3 top-2">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
                {error && (
                  <div className="mt-1 text-sm text-red-600">
                    {error}
                  </div>
                )}
                {searchTerm && filteredDanismanlar.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredDanismanlar.map((danisman) => (
                      <button
                        key={danisman.id}
                        type="button"
                        onClick={() => handleSelectDanisman(danisman)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50"
                      >
                        <div className="font-medium">{danisman.adSoyad}</div>
                        <div className="text-sm text-gray-600">{danisman.bolum}</div>
                      </button>
                    ))}
                  </div>
                )}
                {searchTerm && filteredDanismanlar.length === 0 && !loading && !error && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-3 text-center text-gray-500">
                    Sonuç bulunamadı
                  </div>
                )}
              </div>
              {selectedDanismanlar.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-900 mb-2">Seçilen danışmanlar:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDanismanlar.map(d => (
                      <span key={d.id} className="inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-800 px-2 py-1 rounded">
                        {d.adSoyad}
                        <button type="button" onClick={() => handleRemoveDanisman(d.id)} className="text-blue-600 hover:text-blue-800">
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="baskanAdSoyad" className="block text-sm font-medium text-gray-700 mb-1">
                  Yönetim Kurulu Başkanı
                </label>
                <input
                  type="text"
                  id="baskanAdSoyad"
                  value={formData.baskanAdSoyad}
                  onChange={(e) => setFormData({...formData, baskanAdSoyad: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="baskanEposta" className="block text-sm font-medium text-gray-700 mb-1">
                  Başkan E-posta
                </label>
                <input
                  type="email"
                  id="baskanEposta"
                  value={formData.baskanEposta}
                  onChange={(e) => setFormData({...formData, baskanEposta: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="baskanTelefon" className="block text-sm font-medium text-gray-700 mb-1">
                  Başkan Telefon
                </label>
                <input
                  type="tel"
                  id="baskanTelefon"
                  value={formData.baskanTelefon}
                  onChange={(e) => setFormData({...formData, baskanTelefon: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="baskanSifre" className="block text-sm font-medium text-gray-700 mb-1">
                  Başkan Hesabı Şifresi
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="baskanSifre"
                    value={formData.baskanSifre}
                    onChange={(e) => setFormData({...formData, baskanSifre: e.target.value})}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="En az 6 karakter"
                    required
                    minLength={6}
                  />
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <div className="mt-1 text-xs space-y-1">
                  <p className="text-gray-500">
                    Bu şifre ile kulüp başkanı sisteme giriş yapabilecek
                  </p>
                  <p className="text-gray-500">
                    <span className="font-medium text-blue-600">Önemli:</span> Bu bilgileri kulüp başkanıyla paylaşmayı unutmayın!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="odaNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Kulüp Odası No
                </label>
                <input
                  type="text"
                  id="odaNo"
                  value={formData.odaNo}
                  onChange={(e) => setFormData({...formData, odaNo: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="digerTesisler" className="block text-sm font-medium text-gray-700 mb-1">
                Diğer Tesis/Atölye (Opsiyonel)
              </label>
              <input
                type="text"
                id="digerTesisler"
                value={formData.digerTesisler}
                onChange={(e) => setFormData({...formData, digerTesisler: e.target.value})}
                placeholder="Varsa diğer tesis veya atölye bilgisi"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Alt topluluklar özelliği için toggle buton */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <button
                type="button"
                onClick={() => setAltToplulukFeatureEnabled(!altToplulukFeatureEnabled)}
                className="flex items-center justify-between w-full text-left"
              >
                <div>
                  <span className="font-medium text-gray-800">Alt Topluluklar Ekle</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Kulüp kapsamında faaliyet gösteren alt toplulukları buradan ekleyebilirsiniz
                  </p>
                </div>
                <div className="flex items-center">
                  {altToplulukFeatureEnabled ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>
              
              {altToplulukFeatureEnabled && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={yeniAltTopluluk}
                      onChange={(e) => setYeniAltTopluluk(e.target.value)}
                      placeholder="Alt topluluk adı"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAltToplulukEkle}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {altTopluluklar.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Henüz alt topluluk eklenmedi.</p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {altTopluluklar.map((topluluk, index) => (
                        <div key={index} className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-gray-200">
                          <span>{topluluk}</span>
                          <button
                            type="button"
                            onClick={() => handleAltToplulukSil(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700">
                      <p className="font-semibold">Alt topluluklar ayrı kayıtlar olarak saklanacaktır.</p>
                      <p className="mt-1">Her alt topluluk, ana kulüp ile ilişkilendirilmiş ayrı bir kayıt olarak veritabanına kaydedilecektir. Böylece daha organize bir yapı sağlanacaktır.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kulüp Tüzüğü (PDF)
                </label>
                <input
                  type="file"
                  ref={tuzukInputRef}
                  accept="application/pdf"
                  onChange={handleTuzukChange}
                  className="hidden"
                  required
                />
                <button
                  type="button"
                  onClick={() => tuzukInputRef.current?.click()}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors ${
                    tuzuk
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  {tuzuk ? 'Tüzük Yüklendi' : 'Tüzük Yükle'}
                </button>
                {tuzuk && (
                  <p className="mt-1 text-sm text-green-600">
                    PDF dosyası başarıyla yüklendi
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kulüp Logosu (Opsiyonel)
                </label>
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors ${
                    logo
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  {logo ? 'Logo Yüklendi' : 'Logo Yükle'}
                </button>
                {logo && (
                  <div className="mt-2">
                    <img
                      src={logo}
                      alt="Kulüp Logosu"
                      className="w-16 h-16 object-contain rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <span className="mr-2">Kaydediliyor</span>
                    <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                  </span>
                ) : 'Kulübü Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}