import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router';
import { URLS, levelUrl, type VillageId } from '@so-chung/core';

const MAN_BAI_HOC: { id: VillageId; ten: string; man: number; bai: number }[] = [
  { id: 'lang-giay', ten: 'Làng Giấy', man: 1, bai: 1 },
  { id: 'lang-det', ten: 'Làng Dệt', man: 4, bai: 2 },
  { id: 'lang-khac-dau', ten: 'Làng Khắc Dấu', man: 7, bai: 3 },
  { id: 'lang-bac', ten: 'Làng Bạc', man: 10, bai: 4 },
];

// Trang kiểm tra đồ họa: chỉ có khi chạy dev (không vào bản build).
const DevAssets = import.meta.env.DEV ? lazy(() => import('./DevAssets')) : null;

function TrangChu() {
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Giấc mơ Sổ Chung</h1>
        <p>Trang chủ tạm.</p>
        <Link to="/ban-do" className="inline-block rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white">
          Đến bản đồ
        </Link>
      </div>
    </main>
  );
}

function BanDo() {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Bản đồ (tạm)</h1>
        <ul className="space-y-3">
          {MAN_BAI_HOC.map((m) => (
            <li key={m.id}>
              <a
                href={levelUrl(URLS, m.id, m.man)}
                className="block rounded-xl border border-stone-300 px-4 py-3 font-semibold"
              >
                {m.ten} — Bài học {m.bai} (màn {m.man})
              </a>
            </li>
          ))}
        </ul>
        <Link to="/" className="underline">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<TrangChu />} />
      <Route path="/ban-do" element={<BanDo />} />
      {DevAssets && (
        <Route
          path="/dev/assets"
          element={
            <Suspense fallback={<p className="p-6">Đang tải…</p>}>
              <DevAssets />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<TrangChu />} />
    </Routes>
  );
}
