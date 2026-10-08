import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider, SettingsProvider, VillageApp } from '@so-chung/core';
import { langKhacDau } from '@so-chung/village-lang-khac-dau';
import '@so-chung/core/styles/fonts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <VillageApp village={langKhacDau} />
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  </StrictMode>,
);
