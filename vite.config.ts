import fs from 'fs';
import dotenv from 'dotenv';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const envPath = path.resolve(__dirname, '.env');
  const fileEnv = fs.existsSync(envPath)
    ? dotenv.parse(fs.readFileSync(envPath))
    : {};

  const pickEnv = (...keys: string[]) => {
    for (const k of keys) {
      const val = (fileEnv[k] ?? process.env[k] ?? '').trim();
      if (val && val !== 'undefined' && val !== 'null') {
        return val;
      }
    }
    return '';
  };

  const resolvedUrl = pickEnv(
    'VITE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL'
  );
  const resolvedAnonKey = pickEnv(
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY'
  );

  if (resolvedUrl) {
    process.env.VITE_SUPABASE_URL = resolvedUrl;
  }
  if (resolvedAnonKey) {
    process.env.VITE_SUPABASE_ANON_KEY = resolvedAnonKey;
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      ...(resolvedUrl
        ? { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(resolvedUrl) }
        : {}),
      ...(resolvedAnonKey
        ? { 'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(resolvedAnonKey) }
        : {}),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
