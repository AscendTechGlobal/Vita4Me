/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_CONTROLLER_LEGAL_NAME?: string;
  readonly VITE_DPO_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
