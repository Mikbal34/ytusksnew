import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../utils/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    console.log('ProtectedRoute yükleniyor...');
    console.log('Kullanıcı:', user);
    console.log('Yükleniyor:', loading);
    console.log('İzin verilen roller:', allowedRoles);
    console.log('Mevcut konum:', location.pathname);
  }, [user, loading, allowedRoles, location]);

  if (loading) {
    console.log('Kullanıcı bilgisi yükleniyor...');
    // Kullanıcı bilgisi yüklenirken gösterilecek içerik
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Oturum açılmamışsa, ana sayfaya yönlendir
  if (!user) {
    console.log('Kullanıcı oturum açmamış, ana sayfaya yönlendiriliyor...');
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Rol kontrolü
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('Kullanıcının rolü uygun değil:', user.role);
    console.log('İzin verilen roller:', allowedRoles);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('Erişim izni verildi:', location.pathname);
  return <>{children}</>;
};

export default ProtectedRoute; 