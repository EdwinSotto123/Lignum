import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        // Fix for Firebase Google Popup Auth COOP issue
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      }
    },
    plugins: [react()],
    // API keys are now protected via Vercel API routes
    // No need to inject them into the client bundle
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
