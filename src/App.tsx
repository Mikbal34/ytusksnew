import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, Building2, GraduationCap, LogOut } from 'lucide-react';
import { KulupPaneli } from './components/KulupPaneli';
import { EtkinlikBasvuruFormu } from './components/EtkinlikBasvuruFormu';
import { EtkinlikDetay } from './components/EtkinlikDetay';
import { Formlar } from './components/Formlar';
import { DanismanEkrani } from './components/DanismanEkrani';
import { SKSPaneli } from './components/SKSPaneli';
import { FormYonetimi } from './components/FormYonetimi';
import { SKSFormlar } from './components/SKSFormlar';
import { AdminPanel } from './components/admin/AdminPanel';
import KulupListesi from './components/admin/KulupListesi';
import DanismanListesi from './components/admin/DanismanListesi';
import KulupDuzenle from './components/admin/KulupDuzenle';
import { YeniKulupFormu } from './components/admin/YeniKulupFormu';
import KullaniciYonetimi from './components/admin/KullaniciYonetimi';
import AdminLoginPage from './components/auth/AdminLoginPage';
import KulupLoginPage from './components/auth/KulupLoginPage';
import DanismanLoginPage from './components/auth/DanismanLoginPage';
import SksLoginPage from './components/auth/SksLoginPage';
import UnauthorizedPage from './components/auth/UnauthorizedPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase, supabaseAdmin } from './utils/supabase';

function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navigateBasedOnRole = () => {
    if (!user) return;
    
    switch (user.role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'kulup_baskani':
        navigate('/kulup-paneli');
        break;
      case 'danisman':
        navigate('/danisman-paneli');
        break;
      case 'sks':
        navigate('/sks-paneli');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        {user ? (
          <div className="mb-8">
            <div className="flex justify-between items-center bg-white px-6 py-4 rounded-lg shadow-md">
              <div>
                <p className="font-medium text-gray-900">{user.adSoyad}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {user.role === 'admin' && 'Sistem Yöneticisi'}
                  {user.role === 'kulup_baskani' && 'Kulüp Başkanı'}
                  {user.role === 'danisman' && 'Akademik Danışman'}
                  {user.role === 'sks' && 'SKS Personeli'}
                </p>
              </div>
              <div>
                <button
                  onClick={navigateBasedOnRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Panele Git
                </button>
              </div>
            </div>
          </div>
        ) : null}
      
        <div className="flex flex-col items-center mb-8 sm:mb-12">
          <img 
            src="/Yıldız_Technical_University_logo_variant.svg" 
            alt="Yıldız Teknik Üniversitesi" 
            className="h-24 sm:h-32 mb-6"
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-gray-800">
            Sağlık Kültür Spor Daire Başkanlığı  Öğrenci Kulüpleri Yönetim Paneli
          </h1>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <button 
            onClick={() => navigate('/kulup-login')}
            className="flex items-center justify-center gap-3 bg-white hover:bg-blue-50 text-blue-600 font-medium py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Users className="w-5 h-5" />
            <span>Kulüp Ekranı</span>
          </button>

          <button 
            onClick={() => navigate('/admin-login')}
            className="flex items-center justify-center gap-3 bg-white hover:bg-blue-50 text-purple-600 font-medium py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Admin Ekranı</span>
          </button>

          <button 
            onClick={() => navigate('/sks-login')}
            className="flex items-center justify-center gap-3 bg-white hover:bg-blue-50 text-emerald-600 font-medium py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Building2 className="w-5 h-5" />
            <span>SKS Ekranı</span>
          </button>

          <button 
            onClick={() => navigate('/danisman-login')}
            className="flex items-center justify-center gap-3 bg-white hover:bg-blue-50 text-orange-600 font-medium py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <GraduationCap className="w-5 h-5" />
            <span>Danışman Ekranı</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Ana sayfa (public) */}
      <Route path="/" element={<HomePage />} />
      
      {/* Public routes */}
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/kulup-login" element={<KulupLoginPage />} />
      <Route path="/danisman-login" element={<DanismanLoginPage />} />
      <Route path="/sks-login" element={<SksLoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      
      {/* Kulüp başkanı rotaları */}
      <Route path="/kulup-paneli" element={
        <ProtectedRoute allowedRoles={['kulup_baskani', 'admin']}>
          <KulupPaneli />
        </ProtectedRoute>
      } />
      <Route path="/kulup-paneli/yeni-etkinlik-basvuru" element={
        <ProtectedRoute allowedRoles={['kulup_baskani', 'admin']}>
          <EtkinlikBasvuruFormu />
        </ProtectedRoute>
      } />
      <Route path="/kulup-paneli/basvuru-duzenle/:basvuruId" element={
        <ProtectedRoute allowedRoles={['kulup_baskani', 'admin']}>
          <EtkinlikBasvuruFormu />
        </ProtectedRoute>
      } />
      <Route path="/kulup-paneli/formlar" element={
        <ProtectedRoute allowedRoles={['kulup_baskani', 'admin']}>
          <Formlar />
        </ProtectedRoute>
      } />
      <Route path="/etkinlik-detay/:etkinlikId" element={
        <ProtectedRoute allowedRoles={['kulup_baskani', 'admin', 'danisman', 'sks']}>
          <EtkinlikDetay />
        </ProtectedRoute>
      } />
      
      {/* Danışman rotaları */}
      <Route path="/danisman-paneli" element={
        <ProtectedRoute allowedRoles={['danisman', 'admin']}>
          <DanismanEkrani />
        </ProtectedRoute>
      } />
      
      {/* SKS rotaları */}
      <Route path="/sks-paneli" element={
        <ProtectedRoute allowedRoles={['sks', 'admin']}>
          <SKSPaneli />
        </ProtectedRoute>
      } />
      <Route path="/sks-paneli/formlar" element={
        <ProtectedRoute allowedRoles={['sks', 'admin']}>
          <SKSFormlar />
        </ProtectedRoute>
      } />
      <Route path="/sks-paneli/form-yonetimi" element={
        <ProtectedRoute allowedRoles={['sks', 'admin']}>
          <FormYonetimi />
        </ProtectedRoute>
      } />
      
      {/* Admin rotaları */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminPanel />
        </ProtectedRoute>
      } />
      <Route path="/admin/kulupler" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <KulupListesi />
        </ProtectedRoute>
      } />
      <Route path="/admin/danismanlar" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DanismanListesi />
        </ProtectedRoute>
      } />
      <Route path="/admin/kulupler/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <KulupDuzenle />
        </ProtectedRoute>
      } />
      <Route path="/admin/kullanici-yonetimi" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <KullaniciYonetimi />
        </ProtectedRoute>
      } />
      <Route path="/admin/form-yonetimi" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <FormYonetimi />
        </ProtectedRoute>
      } />
      <Route path="/admin/yeni-kulup-ekle" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <YeniKulupFormu />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  const { user, loading } = useAuth();
  
  // Bucket varlığını kontrol et ve oluştur
  useEffect(() => {
    const setupBuckets = async () => {
      try {
        // Admin yetkisi gerektiğinden, sadece admin kullanıcılar için çalıştır
        if (user?.role === 'admin') {
          console.log('Admin kullanıcı olarak bucket kontrolü yapılıyor');
          
          // Tüm bucketları listele
          const { data: buckets, error: listError } = await supabase.storage.listBuckets();
          
          if (listError) {
            console.error('Bucket listesi alınamadı:', listError);
            return;
          }
          
          console.log('Mevcut bucketlar:', buckets);
          
          // etkinlik-belgeleri bucket kontrolü
          const etkinlikBelgeleriVarMi = buckets?.some(b => b.name === 'etkinlik-belgeleri');
          
          if (!etkinlikBelgeleriVarMi) {
            console.log('etkinlik-belgeleri bucketı bulunamadı, oluşturuluyor...');
            
            try {
              const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket('etkinlik-belgeleri', {
                public: false,
                fileSizeLimit: 10485760 // 10MB
              });
              
              if (createError) {
                console.error('etkinlik-belgeleri bucket oluşturma hatası:', createError);
              } else {
                console.log('etkinlik-belgeleri bucket başarıyla oluşturuldu.');
                
                // Bucket izinlerini ayarla
                // NOT: Bu kısım Supabase client'ta doğrudan yapılamaz
                // Bu işlem için SQL dosyasını Supabase dashboard üzerinden çalıştırmanız gerekir
              }
            } catch (err) {
              console.error('Bucket oluşturma sırasında hata:', err);
            }
          }
        }
      } catch (error) {
        console.error('Bucket kontrolü sırasında hata:', error);
      }
    };
    
    if (user && !loading) {
      setupBuckets();
    }
  }, [user, loading]);
  
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;