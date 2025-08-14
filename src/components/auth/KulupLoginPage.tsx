import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, getUserProfile, UserRole } from '../../utils/authService';
import { useAuth } from '../../context/AuthContext';
import { Users, LogIn, ArrowLeft } from 'lucide-react';

const KulupLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Kulüp başkanı girişi başlatılıyor...');
      
      // Giriş yap
      const { user: authUser, session } = await signIn(email, password);
      
      if (!authUser) {
        console.error('Kullanıcı bilgileri alınamadı');
        throw new Error('Giriş yapılamadı');
      }
      
      console.log('Giriş başarılı, kullanıcı ID:', authUser.id);
      console.log('Session bilgileri alındı');

      try {
        // Kullanıcı profilini al
        console.log('Kullanıcı profili alınıyor...');
        const userProfile = await getUserProfile(authUser.id, session.access_token);
        console.log('Kullanıcı profili alındı:', userProfile);

        // Kulüp başkanı değilse hata ver
        if (userProfile.role !== 'kulup_baskani') {
          console.error('Kullanıcı rolü kulüp başkanı değil:', userProfile.role);
          throw new Error('Bu sayfaya erişim için kulüp başkanı yetkisi gerekiyor');
        }

        console.log('Kulüp başkanı rolü doğrulandı');

        // Context'e kullanıcı bilgilerini ayarla
        setUser({
          ...userProfile,
          role: userProfile.role as UserRole
        });
        console.log('Kullanıcı bilgileri context\'e ayarlandı');

        // Kulüp paneline yönlendir
        console.log('Kulüp paneline yönlendiriliyor...');
        navigate('/kulup-paneli');
      } catch (profileError: any) {
        console.error('Profil alınırken hata oluştu:', profileError);
        
        if (profileError.message.includes('kulüp başkanı yetkisi')) {
          setError(profileError.message);
        } else if (profileError.message.includes('profili bulunamadı')) {
          setError('Kullanıcı profili bulunamadı. Lütfen sistem yöneticisiyle iletişime geçin.');
        } else {
          setError('Profil bilgileri alınırken bir hata oluştu: ' + profileError.message);
        }
      }
    } catch (error: any) {
      console.error('Genel giriş hatası:', error);
      
      if (error.message === 'Bu sayfaya erişim için kulüp başkanı yetkisi gerekiyor') {
        setError(error.message);
      } else if (error.message === 'Invalid login credentials') {
        setError('Geçersiz e-posta veya şifre');
      } else if (error.message === 'Email not confirmed') {
        setError('E-posta hesabınız henüz doğrulanmamış. Sistem yöneticisi ile iletişime geçiniz.');
      } else if (error.code === 'auth/user-not-found') {
        setError('Bu e-posta adresine kayıtlı kullanıcı bulunamadı');
      } else if (error.code === 'auth/wrong-password') {
        setError('Hatalı şifre girdiniz');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin');
      } else {
        setError('Giriş yapılırken bir hata oluştu: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="self-start text-blue-600 hover:text-blue-800 mb-6 flex items-center">
            <ArrowLeft size={16} className="mr-1" />
            Ana Sayfaya Dön
          </Link>
          
          <div className="bg-blue-100 p-3 rounded-full mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Kulüp Başkanı Girişi</h2>
          <p className="mt-2 text-center text-gray-600">
            Öğrenci Kulüpleri Yönetim Paneli'ne erişmek için giriş yapınız.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="kulup@yildiz.edu.tr"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Giriş Yapılıyor...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-2" />
                Kulüp Başkanı Girişi Yap
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default KulupLoginPage; 