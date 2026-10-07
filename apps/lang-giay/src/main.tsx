import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { VillageApp } from '@so-chung/core';
import { langGiay } from '@so-chung/village-lang-giay';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <VillageApp village={langGiay} />
    </BrowserRouter>
  </StrictMode>,
);
