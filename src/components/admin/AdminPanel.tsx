import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Users, 
  Clipboard, 
  ChevronRight,
  FileText,
  LogOut,
  GraduationCap,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clearStorage } from '../../utils/supabaseStorage';

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isClearing, setIsClearing] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 bg-red-50 text-red-600 rounded-lg shadow-sm">
        <h1 className="text-xl font-bold mb-2">Erişim Engellendi</h1>
        <p className="mb-4">Bu sayfaya erişim için admin yetkileri gerekiyor.</p>
        <Link to="/" className="text-blue-600 hover:underline">Ana sayfaya dön</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Paneli</h1>
            <p className="mt-2 text-sm text-gray-600">
              Sistem yönetimi için gerekli araçlara erişim sağlayın
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Çıkış Yap
          </button>
        </div>
        
        {/* Etkinlik verilerini temizleme */}
        <div className="mb-8 bg-white border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <Trash2 className="w-5 h-5" />
                Etkinlik Verilerini Temizle
              </div>
              <p className="text-sm text-red-600 mt-1">
                Bu işlem etkinlik başvuruları, belgeler, ek belgeler, konuşmacılar, sponsorlar ve onay geçmişi dahil tüm etkinlik verilerini siler. Geri alınamaz.
              </p>
            </div>
            <button
              disabled={isClearing}
              onClick={async () => {
                if (!window.confirm('Tüm etkinlik verilerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
                try {
                  setIsClearing(true);
                  await clearStorage();
                  alert('Etkinlik verileri başarıyla temizlendi.');
                } catch (e) {
                  console.error(e);
                  alert('Veriler temizlenirken bir hata oluştu.');
                } finally {
                  setIsClearing(false);
                }
              }}
              className={`px-4 py-2 rounded-md flex items-center gap-2 ${isClearing ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
              <Trash2 className="w-4 h-4" />
              {isClearing ? 'Temizleniyor...' : 'Tüm Etkinlik Verilerini Sil'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div 
            onClick={() => navigate('/admin/kulupler')}
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-lg font-medium text-gray-900">Kulüp Listesi</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Tüm kulüpleri logolarıyla görüntüleyin.
                </p>
                <div className="mt-4 flex items-center text-indigo-600 text-sm font-medium">
                  <span>Listeye git</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/admin/danismanlar')}
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-purple-100 p-3 rounded-lg">
                <GraduationCap className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-lg font-medium text-gray-900">Akademik Danışmanlar</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Tüm akademik danışmanların listesini görüntüleyin.
                </p>
                <div className="mt-4 flex items-center text-purple-600 text-sm font-medium">
                  <span>Listeye git</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
          <div 
            onClick={() => navigate('/admin/kullanici-yonetimi')}
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-lg font-medium text-gray-900">Kullanıcı Yönetimi</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Admin, SKS personeli, danışman ve kulüp başkanı kullanıcılarını yönetin.
                </p>
                <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                  <span>Yönetim paneline git</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
          
          <div 
            onClick={() => navigate('/admin/form-yonetimi')}
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-teal-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-lg font-medium text-gray-900">Form Yönetimi</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Sistemdeki formları düzenleyin, yeni formlar ekleyin ve yönetin.
                </p>
                <div className="mt-4 flex items-center text-teal-600 text-sm font-medium">
                  <span>Form yönetimine git</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
          
          <div 
            onClick={() => {
              try {
                navigate('/admin/yeni-kulup-ekle');
              } catch (error) {
                console.error('Yönlendirme hatası:', error);
                alert('Yeni kulüp ekleme sayfasına yönlendirme sırasında bir hata oluştu.');
              }
            }}
            className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-green-100 p-3 rounded-lg">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-lg font-medium text-gray-900">Yeni Kulüp Ekle</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Sisteme yeni öğrenci kulübü ekleyin ve gerekli bilgilerini tanımlayın.
                </p>
                <div className="mt-4 flex items-center text-green-600 text-sm font-medium">
                  <span>Kulüp ekle</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-amber-100 p-3 rounded-lg">
                <Clipboard className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-lg font-medium text-gray-900">Rapor & İstatistikler</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Sistem raporlarını görüntüleyin ve önemli istatistikleri analiz edin.
                </p>
                <div className="mt-4 flex items-center text-amber-600 text-sm font-medium">
                  <span>Raporlara git</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};