import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Users } from 'lucide-react';
import { Kulup } from '../../types';
import { getKulupler } from '../../utils/supabaseStorage';
import { useAuth } from '../../context/AuthContext';

const KulupListesi = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kulupler, setKulupler] = useState<Kulup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setError('Bu sayfaya erişim için admin yetkileri gerekiyor.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const list = await getKulupler();
        setKulupler(list);
      } catch (e) {
        setError('Kulüpler alınamadı');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filtered = kulupler.filter(k => {
    const q = search.toLowerCase();
    const danAd = k.akademikDanisman?.adSoyad?.toLowerCase?.() || '';
    const multi = (k.akademikDanismanlar || []).map(d => d.adSoyad.toLowerCase());
    return k.isim.toLowerCase().includes(q) || danAd.includes(q) || multi.some(n => n.includes(q));
  });

  if (loading) {
    return (
      <div className="p-8 text-gray-600">Yükleniyor...</div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-600">{error}</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Kulüp Listesi
            </h1>
            <p className="text-sm text-gray-600">Logoları ve danışman bilgileriyle tüm kulüpler</p>
          </div>
          <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-4 h-4" /> Admin Paneline Dön
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kulüp veya danışman ara..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(k => (
            <button onClick={() => navigate(`/admin/kulupler/${k.id}`)} key={k.id} className="bg-white rounded-lg shadow p-4 flex gap-3 text-left hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">
                {k.logo ? (
                  <img
                    src={k.logo}
                    alt={k.isim}
                    className="w-14 h-14 rounded object-contain bg-gray-50 border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded bg-gray-100 flex items-center justify-center text-gray-500 border">
                    {k.isim.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{k.isim}</div>
                <div className="text-sm text-gray-600">
                  Danışman: {k.akademikDanismanlar && k.akademikDanismanlar.length > 0
                    ? k.akademikDanismanlar.map(d => d.adSoyad).join(', ')
                    : k.akademikDanisman?.adSoyad}
                </div>
                {k.odaNo && (
                  <div className="text-xs text-gray-500 mt-1">Oda: {k.odaNo}</div>
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-gray-500">Kayıt bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KulupListesi;

