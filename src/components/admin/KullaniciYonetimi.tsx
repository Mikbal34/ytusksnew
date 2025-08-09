import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, UserRole } from '../../utils/authService';
import { getUsersByRole, createUser, deleteUser } from '../../utils/adminService';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Edit, Trash2, Users, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../../utils/supabase';

// Kullanıcı yönetimi bileşeni
const KullaniciYonetimi: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal kontrolleri
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Kullanıcı listesi filtreleme
  const [selectedRole, setSelectedRole] = useState<UserRole>('kulup_baskani');
  // Yeni eklenecek kullanıcı tipi
  const [selectedAddRole, setSelectedAddRole] = useState<UserRole | null>(null);
  
  // Form verileri
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adSoyad: '',
    kulupId: '',
    danismanId: '',
    // Akademik danışman için ek alanlar
    bolum: '',
    telefon: '',
    fakulte: '', 
    odaNo: '',
    // SKS personeli için ek alanlar
    gorev: ''
  });
  
  // Kulüpler listesi
  const [kulupler, setKulupler] = useState<{id: string, isim: string}[]>([]);
  // Danışmanlar listesi
  const [danismanlar, setDanismanlar] = useState<{id: string, adSoyad: string}[]>([]);
  
  useEffect(() => {
    // Admin kontrolü
    if (currentUser?.role !== 'admin') {
      setError('Bu sayfaya erişim için admin yetkileri gerekiyor.');
      setLoading(false);
      return;
    }
    
    const fetchKulupler = async () => {
      const { data, error } = await supabase
        .from('kulupler')
        .select('id, isim');
      
      if (error) {
        console.error('Kulüpler getirilemedi:', error);
        return [];
      }
      
      return data || [];
    };
    
    const fetchDanismanlar = async () => {
      const { data, error } = await supabase
        .from('akademik_danismanlar')
        .select('id, ad_soyad');
      
      if (error) {
        console.error('Danışmanlar getirilemedi:', error);
        return [];
      }
      
      return data.map(d => ({
        id: d.id,
        adSoyad: d.ad_soyad
      })) || [];
    };
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Kulüpleri ve danışmanları getir
        const [kuluplerData, danismanlarData] = await Promise.all([
          fetchKulupler(),
          fetchDanismanlar()
        ]);
        
        setKulupler(kuluplerData);
        setDanismanlar(danismanlarData);
        
        // İlk başta kulüp başkanlarını göster
        const userList = await getUsersByRole('kulup_baskani');
        setUsers(userList);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Kullanıcılar yüklenirken bir hata oluştu');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUser]);
  
  const handleRoleChange = async (role: UserRole) => {
    try {
      setLoading(true);
      setSelectedRole(role);
      const userList = await getUsersByRole(role);
      setUsers(userList);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Kullanıcılar yüklenirken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Rol seçim butonları için işlev
  const handleRoleSelect = (role: UserRole) => {
    console.log("Rol seçildi:", role);
    setSelectedAddRole(role);
    setShowRoleSelector(false);
    setShowAddForm(true);
  };
  
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      if (!selectedAddRole) {
        setError('Lütfen bir kullanıcı rolü seçin');
        return;
      }
      
      // Seçilen role göre özel validasyonlar
      if (selectedAddRole === 'kulup_baskani' && !formData.kulupId) {
        setError('Lütfen bir kulüp seçin');
        return;
      }
      
      // Akademik danışman için validasyonlar
      if (selectedAddRole === 'danisman') {
        if (!formData.bolum) {
          setError('Lütfen bölüm bilgisini girin');
          return;
        }
        if (!formData.fakulte) {
          setError('Lütfen fakülte bilgisini girin');
          return;
        }
      }
      
      // Yeni kullanıcı oluştur
      await createUser(
        formData.email,
        formData.password,
        formData.adSoyad,
        selectedAddRole,
        {
          kulupId: selectedAddRole === 'kulup_baskani' ? formData.kulupId : undefined,
          danismanId: selectedAddRole !== 'danisman' ? formData.danismanId : undefined,
          telefon: formData.telefon,
          bolum: formData.bolum,
          fakulte: formData.fakulte,
          odaNo: formData.odaNo,
          gorev: formData.gorev
        }
      );
      
      // Kullanıcı listesini güncelle
      const userList = await getUsersByRole(selectedRole);
      setUsers(userList);
      
      // Formu sıfırla
      resetForm();
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Kullanıcı oluşturulurken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      adSoyad: '',
      kulupId: '',
      danismanId: '',
      // Akademik danışman için ek alanlar
      bolum: '',
      telefon: '',
      fakulte: '', 
      odaNo: '',
      // SKS personeli için ek alanlar
      gorev: ''
    });
    setSelectedAddRole(null);
    setShowAddForm(false);
    setShowRoleSelector(false);
  };
  
  const handleDeleteUser = async (userId: string) => {
    const confirm = window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?');
    if (!confirm) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Kullanıcıyı sil
      await deleteUser(userId);
      
      // Kullanıcı listesini güncelle
      const userList = await getUsersByRole(selectedRole);
      setUsers(userList);
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Kullanıcı silinirken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'sks':
        return 'SKS Personeli';
      case 'danisman':
        return 'Akademik Danışman';
      case 'kulup_baskani':
        return 'Kulüp Başkanı';
      default:
        return role;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kullanıcı Yönetimi</h1>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Admin Paneline Dön
          </button>
        </div>
        
        <button
          onClick={() => {
            // Form yerine rol seçim modalını aç
            setShowRoleSelector(true);
            setShowAddForm(false);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Yeni Kullanıcı Ekle
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {/* Rol seçim ekranı */}
      {showRoleSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Kullanıcı Rolü Seçin</h2>
              <button 
                onClick={resetForm} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelect('admin')}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-md flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <div className="font-medium">Admin</div>
                  <div className="text-sm text-gray-500">Sistem yöneticisi</div>
                </div>
              </button>
              
              <button
                onClick={() => handleRoleSelect('sks')}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-md flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <div className="font-medium">SKS Personeli</div>
                  <div className="text-sm text-gray-500">SKS görevlisi</div>
                </div>
              </button>
              
              <button
                onClick={() => handleRoleSelect('danisman')}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-md flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <div className="font-medium">Akademik Danışman</div>
                  <div className="text-sm text-gray-500">Kulüp danışmanı</div>
                </div>
              </button>
              
              <button
                onClick={() => handleRoleSelect('kulup_baskani')}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-md flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <div className="font-medium">Kulüp Başkanı</div>
                  <div className="text-sm text-gray-500">Öğrenci kulübü başkanı</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Kullanıcı ekleme formu - Rol seçildikten sonra */}
      {showAddForm && selectedAddRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Yeni {getRoleDisplayName(selectedAddRole)} Ekle</h2>
              <button 
                onClick={resetForm} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Şifre
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label htmlFor="adSoyad" className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    id="adSoyad"
                    name="adSoyad"
                    value={formData.adSoyad}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                {selectedAddRole === 'kulup_baskani' && (
                  <>
                    <div>
                      <label htmlFor="kulupId" className="block text-sm font-medium text-gray-700 mb-1">
                        Kulüp
                      </label>
                      <select
                        id="kulupId"
                        name="kulupId"
                        value={formData.kulupId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Seçiniz</option>
                        {kulupler.map(kulup => (
                          <option key={kulup.id} value={kulup.id}>
                            {kulup.isim}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="telefon" className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <input
                        type="text"
                        id="telefon"
                        name="telefon"
                        value={formData.telefon}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="05XX XXX XX XX"
                      />
                    </div>
                  </>
                )}
                
                {/* Akademik danışman için ek alanlar */}
                {selectedAddRole === 'danisman' && (
                  <>
                    <div>
                      <label htmlFor="bolum" className="block text-sm font-medium text-gray-700 mb-1">
                        Bölüm
                      </label>
                      <input
                        type="text"
                        id="bolum"
                        name="bolum"
                        value={formData.bolum}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="telefon" className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <input
                        type="text"
                        id="telefon"
                        name="telefon"
                        value={formData.telefon}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="fakulte" className="block text-sm font-medium text-gray-700 mb-1">
                        Fakülte
                      </label>
                      <input
                        type="text"
                        id="fakulte"
                        name="fakulte"
                        value={formData.fakulte}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="odaNo" className="block text-sm font-medium text-gray-700 mb-1">
                        Oda No
                      </label>
                      <input
                        type="text"
                        id="odaNo"
                        name="odaNo"
                        value={formData.odaNo}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )}
                
                {/* SKS personeli için ek alanlar */}
                {selectedAddRole === 'sks' && (
                  <>
                    <div>
                      <label htmlFor="gorev" className="block text-sm font-medium text-gray-700 mb-1">
                        Görev
                      </label>
                      <input
                        type="text"
                        id="gorev"
                        name="gorev"
                        value={formData.gorev}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Kullanıcı listesi filtreleme butonları */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => handleRoleChange('admin')}
          className={`flex items-center px-3 py-1.5 rounded-md ${
            selectedRole === 'admin' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          <Users className="w-4 h-4 mr-1" />
          Adminler
        </button>
        <button
          onClick={() => handleRoleChange('sks')}
          className={`flex items-center px-3 py-1.5 rounded-md ${
            selectedRole === 'sks' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          <Users className="w-4 h-4 mr-1" />
          SKS Personelleri
        </button>
        <button
          onClick={() => handleRoleChange('danisman')}
          className={`flex items-center px-3 py-1.5 rounded-md ${
            selectedRole === 'danisman' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          <Users className="w-4 h-4 mr-1" />
          Danışmanlar
        </button>
        <button
          onClick={() => handleRoleChange('kulup_baskani')}
          className={`flex items-center px-3 py-1.5 rounded-md ${
            selectedRole === 'kulup_baskani' 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          <Users className="w-4 h-4 mr-1" />
          Kulüp Başkanları
        </button>
      </div>
      
      {/* Kullanıcı tablosu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kullanıcı
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-posta
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  Yükleniyor...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  Kullanıcı bulunamadı.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {user.avatarUrl ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                        ) : (
                          <span className="text-blue-600 font-medium">
                            {user.adSoyad.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.adSoyad}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      title="Düzenle"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Sil"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KullaniciYonetimi; 