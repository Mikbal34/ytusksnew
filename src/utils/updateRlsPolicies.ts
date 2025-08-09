import { supabase } from './supabase';

/**
 * Kulüpler için INSERT politikası ekler
 */
export const updateKuluplerInsertPolicy = async () => {
  try {
    console.log('Kulüpler için INSERT politikası ekleniyor...');
    
    // Drop existing policy if it exists
    try {
      await supabase.rpc('drop_policy_if_exists', { 
        table_name: 'kulupler',
        policy_name: 'Admin ve SKS kulüpleri oluşturabilir'
      });
    } catch (error: any) {
      console.error('Varolan politikayı kaldırırken hata oluştu:', error);
    }
    
    // Create new policy
    const { error } = await supabase.rpc('create_policy', {
      table_name: 'kulupler',
      policy_name: 'Admin ve SKS kulüpleri oluşturabilir',
      policy_definition: `
        FOR INSERT 
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
          )
        )
      `
    });
    
    if (error) {
      throw error;
    }
    
    console.log('Kulüpler için INSERT politikası başarıyla eklendi!');
    return true;
  } catch (error) {
    console.error('INSERT politikası eklenirken hata oluştu:', error);
    return false;
  }
};

/**
 * Alt topluluklar için RLS politikalarını ekler
 */
export const updateAltTopluluklarRlsPolicies = async () => {
  try {
    console.log('Alt topluluklar için RLS politikaları ekleniyor...');
    
    // Enable RLS on table
    try {
      await supabase.rpc('enable_row_level_security', { 
        table_name: 'alt_topluluklar' 
      });
    } catch (error: any) {
      console.warn('RLS etkinleştirme hatası (zaten etkin olabilir):', error);
    }
    
    // SELECT policy
    try {
      await supabase.rpc('drop_policy_if_exists', { 
        table_name: 'alt_topluluklar',
        policy_name: 'Alt toplulukları herkes görebilir'
      });
    } catch (error: any) {
      console.warn('SELECT politikasını kaldırırken hata:', error);
    }
    
    try {
      await supabase.rpc('create_policy', {
        table_name: 'alt_topluluklar',
        policy_name: 'Alt toplulukları herkes görebilir',
        policy_definition: `
          FOR SELECT 
          TO authenticated 
          USING (true)
        `
      });
    } catch (error: any) {
      console.error('SELECT politikası eklenirken hata:', error);
    }
    
    // Admin/SKS INSERT policy
    try {
      await supabase.rpc('drop_policy_if_exists', { 
        table_name: 'alt_topluluklar',
        policy_name: 'Admin ve SKS alt toplulukları ekleyebilir'
      });
    } catch (error: any) {
      console.warn('Admin INSERT politikasını kaldırırken hata:', error);
    }
    
    try {
      await supabase.rpc('create_policy', {
        table_name: 'alt_topluluklar',
        policy_name: 'Admin ve SKS alt toplulukları ekleyebilir',
        policy_definition: `
          FOR INSERT 
          TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() AND (role = 'admin' OR role = 'sks')
            )
          )
        `
      });
    } catch (error: any) {
      console.error('Admin INSERT politikası eklenirken hata:', error);
    }
    
    console.log('Alt topluluklar için RLS politikaları başarıyla eklendi!');
    return true;
  } catch (error) {
    console.error('RLS politikaları eklenirken hata oluştu:', error);
    return false;
  }
};

/**
 * Tüm RLS politikalarını günceller
 */
export const updateAllRlsPolicies = async () => {
  const results = await Promise.all([
    updateKuluplerInsertPolicy(),
    updateAltTopluluklarRlsPolicies()
  ]);
  
  return results.every(Boolean);
}; 