import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0', // Ensure it listens on all interfaces
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
      '/pollinations': {
        target: 'https://image.pollinations.ai',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pollinations/, ''),
        secure: false,
      },
      // Note: /api proxy removed to avoid Conflict with Vercel if running purely locally, 
      // but strictly required if running `vite dev` and wanting to hit local functions?
      // Actually, if using `vercel dev`, it handles /api. If using `vite`, /api won't work without a backend.
      // Assuming Mauro is running `vercel dev` or needs pure frontend dev.
      // Keeping it simple and robust for now.
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
