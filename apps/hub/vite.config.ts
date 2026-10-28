import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DEFAULT_HUB_URL = 'https://stem-block.blockchainptit.com';

/** Địa chỉ ảnh chia sẻ (og:image) phải đầy đủ: thay `__HUB_URL__` trong index.html bằng VITE_HUB_URL (mặc định là địa chỉ web chính). */
function hubUrlInHtml(mode: string): Plugin {
  const env = loadEnv(mode, '../..', 'VITE_');
  const hubUrl = (env.VITE_HUB_URL || DEFAULT_HUB_URL).replace(/\/+$/, '');
  return {
    name: 'hub-url-in-html',
    transformIndexHtml: (html) => html.replaceAll('__HUB_URL__', hubUrl),
  };
}

export default defineConfig(({ mode }) => ({
  // Biến môi trường dùng chung: một file .env.local ở gốc repo cho cả 5 app.
  envDir: '../..',
  plugins: [react(), tailwindcss(), hubUrlInHtml(mode)],
  server: { port: 5173, strictPort: true },
}));
