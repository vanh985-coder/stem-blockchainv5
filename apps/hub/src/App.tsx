import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Route, Routes } from 'react-router';
import { RequireStory, accountRoutes, ui } from '@so-chung/core';
import { Home } from './pages/Home';

// Trang tải theo route để trang đầu nhẹ (spec 04, spec 03 mục 9).
const Story = lazy(() => import('./pages/Story'));
const BanDo = lazy(() => import('./ban-do/BanDoPage'));
const Teacher = lazy(() => import('./pages/Teacher'));

// Trang kiểm tra: chỉ có khi chạy dev (không vào bản build).
const DevAssets = import.meta.env.DEV ? lazy(() => import('./DevAssets')) : null;
const DevUi = import.meta.env.DEV ? lazy(() => import('./DevUi')) : null;
const DevHotspots = import.meta.env.DEV ? lazy(() => import('./ban-do/DevHotspots')) : null;
const DevNen = import.meta.env.DEV ? lazy(() => import('./DevNen')) : null;
const DevMiniGame = import.meta.env.DEV ? lazy(() => import('./DevMiniGame')) : null;
const DevGuide = import.meta.env.DEV ? lazy(() => import('./DevGuide')) : null;
// Lõi 3D (three, R3F, drei) nằm ở chunk riêng, chỉ tải khi vào trang 3D (spec 03 mục 9).
const Dev3D = import.meta.env.DEV ? lazy(() => import('@so-chung/core/three/index').then((m) => ({ default: m.DevModelViewer }))) : null;
// Chợ phiên 3D (mốc 2): trang riêng, chưa nối từ trang chủ. Lõi 3D ở chunk riêng.
const Cho = lazy(() => import('@so-chung/core/three/index').then((m) => ({ default: m.WorldPage })));
const Dev25D = import.meta.env.DEV ? lazy(() => import('@so-chung/core/three/index').then((m) => ({ default: m.Dev25D }))) : null;
const DevWalk = import.meta.env.DEV ? lazy(() => import('@so-chung/core/three/index').then((m) => ({ default: m.DevWalk }))) : null;
const DevPortraits = import.meta.env.DEV ? lazy(() => import('@so-chung/core/three/index').then((m) => ({ default: m.DevPortraits }))) : null;

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
      <Route
        path="/cho"
        element={
          <RequireStory>
            <Lazy page={Cho} />
          </RequireStory>
        }
      />
      <Route path="/giao-vien" element={<Lazy page={Teacher} />} />
      <Route path="/giao-vien/:classId" element={<Lazy page={Teacher} />} />
      {accountRoutes.map((r) => (
        <Route key={r.path} path={r.path} element={r.element} />
      ))}
      {DevAssets && <Route path="/dev/assets" element={<Lazy page={DevAssets} />} />}
      {DevUi && <Route path="/dev/ui" element={<Lazy page={DevUi} />} />}
      {DevNen && <Route path="/dev/nen" element={<Lazy page={DevNen} />} />}
      {DevMiniGame && <Route path="/dev/minigame" element={<Lazy page={DevMiniGame} />} />}
      {DevGuide && <Route path="/dev/guide" element={<Lazy page={DevGuide} />} />}
      {Dev3D && <Route path="/dev/3d" element={<Lazy page={Dev3D} />} />}
      {Dev25D && <Route path="/dev/25d" element={<Lazy page={Dev25D} />} />}
      {DevWalk && <Route path="/dev/walk" element={<Lazy page={DevWalk} />} />}
      {DevPortraits && <Route path="/dev/portraits" element={<Lazy page={DevPortraits} />} />}
      {DevHotspots && <Route path="/dev/ban-do-hotspots" element={<Lazy page={DevHotspots} />} />}
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
