import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Route, Routes } from 'react-router';
import { accountRoutes, ui } from '@so-chung/core';
import { Home } from './pages/Home';

// Trang tải theo route để trang đầu nhẹ (spec 04, spec 03 mục 9).
const Story = lazy(() => import('./pages/Story'));
const BanDo = lazy(() => import('./ban-do/BanDoPage'));
const Teacher = lazy(() => import('./pages/Teacher'));

// Trang kiểm tra: chỉ có khi chạy dev (không vào bản build).
const DevAssets = import.meta.env.DEV ? lazy(() => import('./DevAssets')) : null;
const DevUi = import.meta.env.DEV ? lazy(() => import('./DevUi')) : null;
const DevHotspots = import.meta.env.DEV ? lazy(() => import('./ban-do/DevHotspots')) : null;

function Lazy({ page: Page }: { page: LazyExoticComponent<ComponentType> }) {
  return (
    <Suspense fallback={<p className="p-6">{ui.chung.dangTai}</p>}>
      <Page />
    </Suspense>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/truyen" element={<Lazy page={Story} />} />
      <Route path="/ban-do" element={<Lazy page={BanDo} />} />
      <Route path="/giao-vien" element={<Lazy page={Teacher} />} />
      {accountRoutes.map((r) => (
        <Route key={r.path} path={r.path} element={r.element} />
      ))}
      {DevAssets && <Route path="/dev/assets" element={<Lazy page={DevAssets} />} />}
      {DevUi && <Route path="/dev/ui" element={<Lazy page={DevUi} />} />}
      {DevHotspots && <Route path="/dev/ban-do-hotspots" element={<Lazy page={DevHotspots} />} />}
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
