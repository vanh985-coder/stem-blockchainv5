import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider, ProgressProvider, SettingsProvider, VillageApp } from '@so-chung/core';
import { langKhacDau } from '@so-chung/village-lang-khac-dau';
import '@so-chung/core/styles/fonts';
import './index.css';

// Trang chọn điểm 3 làn của màn 9 (chỉ khi chạy dev): /dev/man-09-lanes
const DevMan09Lanes = import.meta.env.DEV ? lazy(() => import('@so-chung/village-lang-khac-dau/dev')) : null;
const devLanes = DevMan09Lanes !== null && window.location.pathname === '/dev/man-09-lanes';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      {devLanes && DevMan09Lanes ? (
        <Suspense fallback={null}>
          <DevMan09Lanes />
        </Suspense>
      ) : (
        <AuthProvider>
          <ProgressProvider>
            <BrowserRouter>
              <VillageApp village={langKhacDau} />
            </BrowserRouter>
          </ProgressProvider>
        </AuthProvider>
      )}
    </SettingsProvider>
  </StrictMode>,
);
