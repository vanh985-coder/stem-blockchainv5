import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { SettingsProvider, VillageApp } from '@so-chung/core';
import { langGiay } from '@so-chung/village-lang-giay';
import '@so-chung/core/styles/fonts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <BrowserRouter>
        <VillageApp village={langGiay} />
      </BrowserRouter>
    </SettingsProvider>
  </StrictMode>,
);
