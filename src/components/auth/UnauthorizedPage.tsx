import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldX } from 'lucide-react';

const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-100 mb-4">
          <ShieldX className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Erişim Engellendi</h1>
        
        <p className="text-gray-600 mb-8">
          Bu sayfaya erişim için yetkiniz bulunmuyor. 
          {user ? ` ${user.role} rolüne sahip kullanıcılar bu sayfaya erişemez.` : ''}
        </p>
        
        <div className="space-y-4">
          <Link 
            to="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors duration-150"
          >
            Ana Sayfaya Dön
          </Link>
          
          {user && (
            <button
              onClick={() => logout()}
              className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md font-medium transition-colors duration-150"
            >
              Çıkış Yap
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage; 