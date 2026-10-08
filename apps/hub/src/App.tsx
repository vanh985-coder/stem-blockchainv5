import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router';
import { AccountBar, Button, Panel, accountRoutes, URLS, fmt, levelUrl, ui, type VillageId } from '@so-chung/core';

const MAN_BAI_HOC: { id: VillageId; man: number; bai: number }[] = [
  { id: 'lang-giay', man: 1, bai: 1 },
  { id: 'lang-det', man: 4, bai: 2 },
  { id: 'lang-khac-dau', man: 7, bai: 3 },
  { id: 'lang-bac', man: 10, bai: 4 },
];

// Trang kiểm tra: chỉ có khi chạy dev (không vào bản build).
const DevAssets = import.meta.env.DEV ? lazy(() => import('./DevAssets')) : null;
const DevUi = import.meta.env.DEV ? lazy(() => import('./DevUi')) : null;

function TrangChu() {
  const navigate = useNavigate();
  return (
    <main className="grid min-h-screen place-items-center p-4 text-center">
      <Panel className="w-full max-w-md space-y-4">
        <h1 className="text-3xl">{ui.hub.tenGame}</h1>
        <p>{ui.hub.trangChuTam}</p>
        <Button onClick={() => navigate('/ban-do')}>{ui.hub.denBanDo}</Button>
        <AccountBar />
      </Panel>
    </main>
  );
}

function BanDo() {
  return (
    <main className="p-4">
      <Panel className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl">{ui.hub.banDoTam}</h1>
        <ul className="space-y-3">
          {MAN_BAI_HOC.map((m) => (
            <li key={m.id}>
              <a
                href={levelUrl(URLS, m.id, m.man)}
                className="block min-h-11 rounded-nut border-2 border-nau-go bg-giay px-4 py-3 font-display text-lg font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
              >
                {fmt(ui.hub.dongBanDo, { lang: ui.lang[m.id], bai: m.bai, man: m.man })}
              </a>
            </li>
          ))}
        </ul>
        <AccountBar className="justify-start" />
        <Link to="/" className="inline-block min-h-11 py-2 underline">
          {ui.hub.veTrangChu}
        </Link>
      </Panel>
    </main>
  );
}

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
      <Route path="/" element={<TrangChu />} />
      <Route path="/ban-do" element={<BanDo />} />
      {accountRoutes.map((r) => (
        <Route key={r.path} path={r.path} element={r.element} />
      ))}
      {DevAssets && <Route path="/dev/assets" element={<Lazy page={DevAssets} />} />}
      {DevUi && <Route path="/dev/ui" element={<Lazy page={DevUi} />} />}
      <Route path="*" element={<TrangChu />} />
    </Routes>
  );
}
