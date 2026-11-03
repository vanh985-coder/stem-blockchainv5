import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider, ProgressProvider, SettingsProvider } from '@so-chung/core';
import { DEMO_ACTIVE, DEMO_START } from '@so-chung/core/demo/config';
import { resetDemoProgress } from '@so-chung/core/demo/reset';
import { App } from './App';
import '@so-chung/core/styles/fonts';
import './index.css';

// Demo (quay video): bắt đầu như người mới, trước khi tiến độ được đọc
if (DEMO_ACTIVE && !DEMO_START) resetDemoProgress();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <ProgressProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ProgressProvider>
      </AuthProvider>
    </SettingsProvider>
  </StrictMode>,
);
