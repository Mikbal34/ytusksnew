import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import { updateKulup, getAllDanismanlar, getKulupDanismanlari, addKulupDanisman, removeKulupDanisman } from '../../utils/adminService';
import { formYukle } from '../../utils/supabaseStorage';

const KulupDuzenle = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [danismanlar, setDanismanlar] = useState<{id:string; adSoyad:string;}[]>([]);
  const [kulupDanismanlari, setKulupDanismanlari] = useState<any[]>([]);
  const [seciliEkleDanismanId, setSeciliEkleDanismanId] = useState<string>('');
  const [talepDilekcesi, setTalepDilekcesi] = useState<File | null>(null);
  const [fesihDilekcesi, setFesihDilekcesi] = useState<File | null>(null);
  const [form, setForm] = useState({
    isim: '',
    baskan_ad_soyad: '',
    baskan_eposta: '',
    baskan_telefon: '',
    oda_no: '',
    diger_tesisler: '',
    logo: ''
  });
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setError('Bu sayfaya erişim için admin yetkileri gerekiyor.');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('kulupler')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setForm({
          isim: data.isim || '',
          baskan_ad_soyad: data.baskan_ad_soyad || '',
          baskan_eposta: data.baskan_eposta || '',
          baskan_telefon: data.baskan_telefon || '',
          oda_no: data.oda_no || '',
          diger_tesisler: data.diger_tesisler || '',
          logo: data.logo || ''
        });

        // Danışman listeleri
        const [all, mevcut] = await Promise.all([
          getAllDanismanlar(),
          getKulupDanismanlari(id as string)
        ]);
        setDanismanlar(all.map((d:any)=>({id:d.id, adSoyad:d.adSoyad})));
        setKulupDanismanlari(mevcut);
      } catch (e) {
        setError('Kulüp bilgileri alınamadı');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, id]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir görsel dosyası yükleyin!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(prev => ({ ...prev, logo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await updateKulup(id as string, {
        isim: form.isim,
        baskan_ad_soyad: form.baskan_ad_soyad,
        baskan_eposta: form.baskan_eposta,
        baskan_telefon: form.baskan_telefon,
        oda_no: form.oda_no,
        diger_tesisler: form.diger_tesisler,
        logo: form.logo || undefined
      });
      setSuccess('Kulüp bilgileri güncellendi');
      setTimeout(() => navigate('/admin/kulupler'), 1500);
    } catch (err) {
      setError('Güncelleme sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Admin geçici: dosyayı storage'a yüklemek yerine dummy path oluştur
  const uploadOrDummy = async (file: File | null, tip: 'talep'|'fesih') => {
    if (!file) {
      if (tip === 'fesih') {
        // dümenden koy: admin tarafında fesih dilekçesi dummy olabilir
        return `dummy/${tip}/${Date.now()}_${id}.pdf`;
      }
      // talep için dosya zorunlu
      return '';
    }
    // Gerçek yükleme: form-dosyalari bucket'ına yükle
    const sonuc = await formYukle(file, {
      isim: tip === 'talep' ? 'Görev Talep Dilekçesi' : 'Görev Fesih Dilekçesi',
      kategori: 'Kulüp',
      aciklama: `Kulüp ${id} için ${tip} dilekçesi`
    });
    return sonuc?.dosyaYolu || '';
  };

  const handleDanismanEkle = async () => {
    try {
      if (!id || !seciliEkleDanismanId) return;
      if (!talepDilekcesi) {
        alert('Görev Talep Dilekçesi (PDF) yüklemek zorunludur.');
        return;
      }
      const talepPath = await uploadOrDummy(talepDilekcesi, 'talep');
      await addKulupDanisman(id as string, seciliEkleDanismanId, talepPath);
      const guncel = await getKulupDanismanlari(id as string);
      setKulupDanismanlari(guncel);
      setSeciliEkleDanismanId('');
      setTalepDilekcesi(null);
    } catch (err:any) {
      alert(err.message || 'Danışman eklenemedi');
    }
  };

  const handleDanismanCikar = async (iliskiId: string) => {
    try {
      if (!id) return;
      const fesihPath = await uploadOrDummy(fesihDilekcesi, 'fesih');
      await removeKulupDanisman(id as string, iliskiId, fesihPath);
      const guncel = await getKulupDanismanlari(id as string);
      setKulupDanismanlari(guncel);
      setFesihDilekcesi(null);
    } catch (err:any) {
      alert(err.message || 'Danışman çıkarılamadı');
    }
  };

  if (loading) return <div className="p-8 text-gray-600">Yükleniyor...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>

        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-xl font-semibold mb-4">Kulüp Düzenle</h1>
          {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded">{success}</div>}
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kulüp İsmi</label>
              <input value={form.isim} onChange={(e) => setForm({ ...form, isim: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başkan Ad Soyad</label>
                <input value={form.baskan_ad_soyad} onChange={(e) => setForm({ ...form, baskan_ad_soyad: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başkan E-posta</label>
                <input type="email" value={form.baskan_eposta} onChange={(e) => setForm({ ...form, baskan_eposta: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başkan Telefon</label>
                <input value={form.baskan_telefon} onChange={(e) => setForm({ ...form, baskan_telefon: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kulüp Odası</label>
                <input value={form.oda_no} onChange={(e) => setForm({ ...form, oda_no: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diğer Tesisler</label>
              <input value={form.diger_tesisler} onChange={(e) => setForm({ ...form, diger_tesisler: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo (opsiyonel)</label>
              <input type="file" ref={logoRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
              <button type="button" onClick={() => logoRef.current?.click()} className="px-3 py-2 border rounded inline-flex items-center gap-2">
                <Upload className="w-4 h-4" /> Logo Yükle
              </button>
              {form.logo && <div className="mt-2"><img src={form.logo} alt="logo" className="w-16 h-16 object-contain border rounded" /></div>}
            </div>
            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400">Kaydet</button>
            </div>
          </form>

          {/* Danışman Yönetimi */}
          <div className="mt-8 border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Akademik Danışmanlar (Maks. 2)</h2>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Mevcut Danışmanlar</div>
              <div className="space-y-2">
                {kulupDanismanlari.map(d => (
                  <div key={d.iliskiId} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{d.adSoyad}</div>
                      <div className="text-xs text-gray-500">{d.bolum} • {d.eposta}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="file" accept="application/pdf" onChange={(e)=> setFesihDilekcesi(e.target.files?.[0] || null)} className="text-sm" />
                      <button type="button" onClick={() => handleDanismanCikar(d.iliskiId)} className="px-3 py-1.5 bg-red-600 text-white rounded">Sil</button>
                    </div>
                  </div>
                ))}
                {kulupDanismanlari.length === 0 && (
                  <div className="text-sm text-gray-500">Danışman bulunmuyor.</div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-gray-600 mb-2">Yeni Danışman Ekle</div>
              <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                <select value={seciliEkleDanismanId} onChange={(e)=> setSeciliEkleDanismanId(e.target.value)} className="border rounded px-3 py-2">
                  <option value="">Danışman seçin</option>
                  {danismanlar
                    .filter(d => !kulupDanismanlari.some(kd => kd.id === d.id))
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.adSoyad}</option>
                    ))}
                </select>
                <input type="file" accept="application/pdf" onChange={(e)=> setTalepDilekcesi(e.target.files?.[0] || null)} className="text-sm" />
                <button type="button" onClick={handleDanismanEkle} disabled={!seciliEkleDanismanId} className="px-3 py-2 bg-emerald-600 text-white rounded disabled:bg-gray-300">Ekle</button>
              </div>
              <div className="text-xs text-gray-500 mt-2">Yeni danışman eklerken "Görev Talep Dilekçesi" zorunludur. Silme işleminde "Görev Fesih Dilekçesi" zorunludur.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KulupDuzenle;

