/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_EMAIL_USER?: string;
  readonly VITE_EMAIL_PASSWORD?: string;
  readonly VITE_EMAIL_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
