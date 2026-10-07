import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { VillageApp } from '@so-chung/core';
import { langBac } from '@so-chung/village-lang-bac';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <VillageApp village={langBac} />
    </BrowserRouter>
  </StrictMode>,
);
