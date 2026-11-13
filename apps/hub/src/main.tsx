import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider, ProgressProvider, SettingsProvider } from '@so-chung/core';
import { DEMO_ACTIVE, DEMO_MEN, DEMO_START, DEMO_TRON, TRON_FROM } from '@so-chung/core/demo/config';
import { applyDemoPreset } from '@so-chung/core/demo/preset';
import { applyTronPreset } from '@so-chung/core/demo/tron/preset';
import { metaOfCode } from '@so-chung/core/demo/tron/starts';
import { resetDemoProgress } from '@so-chung/core/demo/reset';
import { App } from './App';
import '@so-chung/core/styles/fonts';
import './index.css';

// Demo (quay video): bắt đầu như người mới, trước khi tiến độ được đọc
if (DEMO_ACTIVE && !DEMO_START) resetDemoProgress();
// Chế độ trọn (?kieu=tron): &tu=<mã đoạn> dựng sẵn tiến độ của đơn vị cảnh chứa đoạn đó
if (DEMO_TRON && TRON_FROM) {
  const u = metaOfCode(TRON_FROM);
  if (u) applyTronPreset(u.start);
}
// Chế độ danh sách màn (?man=): tiến độ khách tối thiểu để vào được từng màn (chỉ cookie trên máy này, không gọi máy chủ)
if (DEMO_MEN) applyDemoPreset(DEMO_MEN);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <ProgressProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ProgressProvider>
      </AuthProvider>
    </SettingsProvider>
  </StrictMode>,
);
