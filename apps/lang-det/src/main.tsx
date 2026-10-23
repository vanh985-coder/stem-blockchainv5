import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider, ProgressProvider, SettingsProvider, VillageApp } from '@so-chung/core';
import { langDet } from '@so-chung/village-lang-det';
import '@so-chung/core/styles/fonts';
import './index.css';

// Trang chọn điểm 4 làn của màn 5 (chỉ khi chạy dev): /dev/man-05-lanes
const DevMan05Lanes = import.meta.env.DEV ? lazy(() => import('@so-chung/village-lang-det/dev')) : null;
const devLanes = DevMan05Lanes !== null && window.location.pathname === '/dev/man-05-lanes';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      {devLanes && DevMan05Lanes ? (
        <Suspense fallback={null}>
          <DevMan05Lanes />
        </Suspense>
      ) : (
        <AuthProvider>
          <ProgressProvider>
            <BrowserRouter>
              <VillageApp village={langDet} />
            </BrowserRouter>
          </ProgressProvider>
        </AuthProvider>
      )}
    </SettingsProvider>
  </StrictMode>,
);
