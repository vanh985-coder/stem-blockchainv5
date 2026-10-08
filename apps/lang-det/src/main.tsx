import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { SettingsProvider, VillageApp } from '@so-chung/core';
import { langDet } from '@so-chung/village-lang-det';
import '@so-chung/core/styles/fonts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <BrowserRouter>
        <VillageApp village={langDet} />
      </BrowserRouter>
    </SettingsProvider>
  </StrictMode>,
);
