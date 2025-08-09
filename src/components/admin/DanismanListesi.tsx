import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, GraduationCap } from 'lucide-react';
import { getAllDanismanlar } from '../../utils/adminService';
import { useAuth } from '../../context/AuthContext';

type Danisman = {
  id: string;
  adSoyad: string;
  eposta: string;
  bolum: string;
  telefon?: string;
  fakulte?: string;
  odaNo?: string;
};

const DanismanListesi = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<Danisman[]>([]);
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
        const list = await getAllDanismanlar();
        setData(list);
      } catch (e) {
        setError('Danışmanlar alınamadı');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filtered = data.filter(d =>
    d.adSoyad.toLowerCase().includes(search.toLowerCase()) ||
    (d.eposta || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.bolum || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-gray-600">Yükleniyor...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" /> Akademik Danışmanlar
            </h1>
            <p className="text-sm text-gray-600">Tüm akademik danışmanların listesi</p>
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
            placeholder="Ad, eposta veya bölüm ara..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Soyad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-posta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bölüm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fakülte</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oda No</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 whitespace-nowrap">{d.adSoyad}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{d.eposta}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{d.bolum}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{d.fakulte || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{d.telefon || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap">{d.odaNo || '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Kayıt bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DanismanListesi;

