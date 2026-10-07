import React from 'react';
import { Outlet } from 'react-router-dom';
import { ProgressProvider } from './ProgressContext';

export const Layout: React.FC = () => {
  return (
    <ProgressProvider>
      <div className="min-h-screen flex flex-col bg-[#F6F5FB] text-[#2A2340] antialiased">
        {/* Vùng đọc thông báo toàn cục cho Screen Reader */}
        <div id="a11y-live-region" aria-live="polite" className="sr-only" />

        {/* Nội dung trang */}
        <div className="flex-1 flex flex-col">
          <Outlet />
        </div>
      </div>
    </ProgressProvider>
  );
};
