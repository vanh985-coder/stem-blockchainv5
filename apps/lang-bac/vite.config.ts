import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Biến môi trường dùng chung: một file .env.local ở gốc repo cho cả 5 app.
  envDir: '../..',
  plugins: [react(), tailwindcss()],
  server: { port: 5177, strictPort: true },
});
