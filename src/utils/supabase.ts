import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qdeqfugjvfbvltcalrwk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZXFmdWdqdmZidmx0Y2FscndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwODYyOTgsImV4cCI6MjA2MjY2MjI5OH0.zclUVxFEXqAQzaZfhGF29wzfAxoMk9rtFEMaknau04w';

// Bu anahtarı Supabase projenizden almalısınız (Settings > API > service_role key)
// DİKKAT: Bu anahtar yalnızca güvenli ortamlarda kullanılmalıdır, istemci tarafında değil
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZXFmdWdqdmZidmx0Y2FscndrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA4NjI5OCwiZXhwIjoyMDYyNjYyMjk4fQ.IDm2hZ9yQJVzAlnFo9C0Pgb52LiJr7_4H8KXADPhc3I';

// Supabase bağlantı ayarları için ek seçenekler
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'ytusks-supabase-auth' // Storage key'i belirterek çakışmaları önle
  },
  global: {
    fetch: fetch.bind(globalThis),
    headers: {
      'X-Client-Info': 'ytusks-client'
    }
  },
  realtime: {
    timeout: 30000 // ms
  }
};

// Singleton pattern - tek bir instance kullanımı için
let _supabase = null;
let _supabaseAdmin = null;

// Normal kullanıcı işlemleri için anonim anahtar ile client
export const supabase = _supabase || (_supabase = createClient(supabaseUrl, supabaseAnonKey, options));

// Admin işlemleri için service role anahtar ile client 
// Bu client yalnızca admin işlemlerinde kullanılmalıdır
// RLS (Row Level Security) politikalarını bypass eder
const adminOptions = {
  ...options,
  db: {
    schema: 'public'
  },
  auth: {
    ...options.auth,
    autoRefreshToken: false,
    persistSession: false
  }
};

export const supabaseAdmin = _supabaseAdmin || (_supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, adminOptions));

// API erişimi için yardımcı fonksiyon
export const supabaseApi = {
  url: supabaseUrl,
  key: supabaseAnonKey
}; 