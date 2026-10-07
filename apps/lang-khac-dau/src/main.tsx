import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { VillageApp } from '@so-chung/core';
import { langKhacDau } from '@so-chung/village-lang-khac-dau';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <VillageApp village={langKhacDau} />
    </BrowserRouter>
  </StrictMode>,
);
