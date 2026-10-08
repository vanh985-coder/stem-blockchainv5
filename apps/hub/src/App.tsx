import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router';
import {
  AccountBar,
  Button,
  GuestBar,
  LEVELS,
  Panel,
  URLS,
  VILLAGE_ORDER,
  accountRoutes,
  fmt,
  levelById,
  levelUrl,
  ui,
  useProgress,
} from '@so-chung/core';

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

const STATE_TEXT = {
  locked: ui.moKhoa.khoa,
  open: ui.moKhoa.mo,
  done: ui.moKhoa.xong,
  'coming-soon': ui.moKhoa.sapRaMat,
} as const;
const STATE_ICON = { locked: '🔒', open: '▶', done: '✓', 'coming-soon': '⏳' } as const;

function BanDo() {
  const { unlock, coins, goldenPages } = useProgress();
  return (
    <>
      <GuestBar />
      <main className="p-4">
        <Panel className="mx-auto max-w-lg space-y-4">
          <h1 className="text-2xl">{ui.hub.banDoTam}</h1>
          <p className="flex flex-wrap gap-x-6 font-display text-lg font-extrabold">
            <span>{fmt(ui.moKhoa.trangSoVang, { so: goldenPages, max: VILLAGE_ORDER.length })}</span>
            <span>{fmt(ui.tienDo.xu, { so: coins })}</span>
          </p>
          <ul className="space-y-2">
            {unlock.levels.map((u) => {
              const def = LEVELS.find((l) => l.id === u.id)!;
              const blocker = u.lockedBy ? levelById(u.lockedBy) : undefined;
              const playable = def.kind === 'lesson' && (u.state === 'open' || u.state === 'done');
              const inner = (
                <>
                  <span className="flex flex-wrap items-center gap-x-3">
                    <span className="min-w-0 flex-1">
                      {fmt(ui.tienDo.manSo, { so: def.id, man: fmt(def.ten) })}
                      <span className="block text-sm font-normal text-nau-go-dam">{ui.lang[def.lang]}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-nau-go px-2 py-0.5 text-sm font-bold">
                      <span aria-hidden="true">{STATE_ICON[u.state]}</span>
                      {STATE_TEXT[u.state]}
                    </span>
                  </span>
                  {blocker && (
                    <span className="mt-1 block text-sm font-normal text-nau-go-dam">
                      {fmt(ui.moKhoa.hoanThanh, { so: blocker.id, man: fmt(blocker.ten) })}
                    </span>
                  )}
                </>
              );
              const cls =
                'block min-h-11 rounded-nut border-2 border-nau-go bg-giay px-4 py-3 font-display text-lg font-extrabold';
              return (
                <li key={u.id}>
                  {playable ? (
                    <a
                      href={levelUrl(URLS, def.lang, def.id)}
                      className={`${cls} focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim`}
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className={`${cls} opacity-75`}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <AccountBar className="justify-start" />
          <Link to="/" className="inline-block min-h-11 py-2 underline">
            {ui.hub.veTrangChu}
          </Link>
        </Panel>
      </main>
    </>
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
