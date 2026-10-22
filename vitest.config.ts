import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.{ts,tsx}', 'apps/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Mặc định 5 giây không đủ khi máy bận (đo trình duyệt chạy cùng): các ca quét lưới, dò đường, đọc model thật và mô phỏng 300 ván chạy lâu hơn.
    testTimeout: 30_000,
  },
});
