import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, signIn, signOut, UserProfile } from '../utils/authService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

// Default context değerleri
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  setUser: () => {}
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sayfa yüklendiğinde kullanıcı bilgilerini al
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Kullanıcı oturum kontrolü başlatılıyor...');
      setLoading(true);
      const { user } = await getCurrentUser();
      console.log('Oturum kontrolü tamamlandı:', user);
      setUser(user);
      setError(null);
    } catch (err) {
      console.error('Oturum kontrolü hatası:', err);
      setUser(null);
      setError('Oturum bilgileri alınamadı.');
    } finally {
      setLoading(false);
      console.log('Oturum kontrolü tamamlandı');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await signIn(email, password);
      await checkAuth(); // Kullanıcı bilgilerini yeniden al
    } catch (err) {
      setUser(null);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Giriş yapılırken bir hata oluştu.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Çıkış yapılırken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        checkAuth,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 