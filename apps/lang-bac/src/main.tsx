import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider, ProgressProvider, SettingsProvider, VillageApp } from '@so-chung/core';
import { langBac, loadMan12 } from '@so-chung/village-lang-bac';
import '@so-chung/core/styles/fonts';
import './index.css';

// Trang thử màn 12 khi còn coming-soon (chỉ khi chạy dev, không vào bản build): /dev/man-12
const DevMan12 = import.meta.env.DEV ? lazy(loadMan12) : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <ProgressProvider>
          <BrowserRouter>
            <Routes>
              {DevMan12 && (
                <Route
                  path="/dev/man-12"
                  element={
                    <Suspense fallback={null}>
                      <DevMan12 />
                    </Suspense>
                  }
                />
              )}
              <Route path="*" element={<VillageApp village={langBac} />} />
            </Routes>
          </BrowserRouter>
        </ProgressProvider>
      </AuthProvider>
    </SettingsProvider>
  </StrictMode>,
);
