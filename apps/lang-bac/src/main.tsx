import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider, ProgressProvider, SettingsProvider, VillageApp } from '@so-chung/core';
import { langBac } from '@so-chung/village-lang-bac';
import '@so-chung/core/styles/fonts';
import './index.css';

// Trang chỉnh chỗ 8 ô lá trên cây của màn 11 (chỉ khi chạy dev): /dev/man-11-slots
const DevMan11Slots = import.meta.env.DEV ? lazy(() => import('@so-chung/village-lang-bac/dev')) : null;
const devSlots = DevMan11Slots !== null && window.location.pathname === '/dev/man-11-slots';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      {devSlots && DevMan11Slots ? (
        <Suspense fallback={null}>
          <DevMan11Slots />
        </Suspense>
      ) : (
        <AuthProvider>
          <ProgressProvider>
            <BrowserRouter>
              <VillageApp village={langBac} />
            </BrowserRouter>
          </ProgressProvider>
        </AuthProvider>
      )}
    </SettingsProvider>
  </StrictMode>,
);
