import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/verimor': {
        target: 'https://sms.verimor.com.tr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/verimor/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'recharts-vendor': ['recharts'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'radix-vendor': [
            '@radix-ui/react-label',
            '@radix-ui/react-separator',
            '@radix-ui/react-tabs',
          ],
        },
      },
    },
  },
});
