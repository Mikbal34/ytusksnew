import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, getUserProfile, UserRole } from '../../utils/authService';
import { useAuth } from '../../context/AuthContext';
import { Shield, LogIn, ArrowLeft } from 'lucide-react';

const AdminLoginPage: React.FC = () => {
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
      // Giriş yap
      const { user: authUser, session } = await signIn(email, password);
      
      if (!authUser) {
        throw new Error('Giriş yapılamadı');
      }

      // Kullanıcı profilini al
      const userProfile = await getUserProfile(authUser.id, session.access_token);

      // Admin değilse hata ver
      if (userProfile.role !== 'admin') {
        throw new Error('Bu sayfaya erişim için admin yetkisi gerekiyor');
      }

      // Context'e kullanıcı bilgilerini ayarla
      setUser({
        ...userProfile,
        role: userProfile.role as UserRole
      });

      // Admin paneline yönlendir
      navigate('/admin');
    } catch (error: any) {
      console.error('Giriş hatası:', error);
      
      if (error.message === 'Bu sayfaya erişim için admin yetkisi gerekiyor') {
        setError(error.message);
      } else if (error.message === 'Invalid login credentials') {
        setError('Geçersiz e-posta veya şifre');
      } else {
        setError('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="self-start text-blue-600 hover:text-blue-800 mb-6 flex items-center">
            <ArrowLeft size={16} className="mr-1" />
            Ana Sayfaya Dön
          </Link>
          
          <div className="bg-indigo-100 p-3 rounded-full mb-4">
            <Shield className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Girişi</h2>
          <p className="mt-2 text-center text-gray-600">
            YTÜ SKS Admin paneline erişmek için giriş yapın
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              placeholder="admin@yildiz.edu.tr"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center"
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
                Admin Girişi Yap
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage; 