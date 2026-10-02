import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app'
    ],
    proxy: {
      '/api': 'http://localhost:3001',
      '/webhook': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
