import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  AssetImage,
  BAN_DO_HOTSPOTS,
  BottomSheet,
  GuestBar,
  Panel,
  VILLAGE_ORDER,
  fmt,
  levelsOfVillage,
  shouldShowIntro,
  ui,
  useAuth,
  useManifest,
  useProgress,
  type VillageId,
} from '@so-chung/core';
import { LevelDot, STATE_TEXT, VillageDetails } from './parts';

// Lời giới thiệu làng chỉ tải khi cần (lần đầu bấm vào làng, hoặc bấm "Xem lại giới thiệu").
const VillageIntro = lazy(() => import('./VillageIntro'));

/** Đang ở màn hình rộng (máy tính) hay hẹp (điện thoại). */
function useWide(): boolean {
  const q = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/** 4 ô Trang Sổ Vàng ở góc trên: ô đã nhận sáng màu, ô chưa nhận mờ và xám (kèm chữ). */
function GoldenCells({ count }: { count: number }) {
  return (
    <ul className="flex items-center gap-1" aria-label={fmt(ui.moKhoa.trangSoVang, { so: count, max: VILLAGE_ORDER.length })}>
      {VILLAGE_ORDER.map((_, i) => {
        const got = i < count;
        return (
          <li
            key={i}
            title={got ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
            className={`grid size-11 place-items-center rounded-xl border-2 ${got ? 'border-vang-dam bg-vang/40' : 'border-dashed border-nau-go bg-giay/60'}`}
          >
            <AssetImage path="ui/icons/trang-vang" alt="" className={`size-8 object-contain ${got ? '' : 'grayscale opacity-30'}`} />
            <span className="sr-only">
              {fmt(ui.banDo.trangSo, { so: i + 1 })}: {got ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Bản đồ 2D /ban-do (spec 04 mục 7). */
export default function BanDoPage() {
  const wide = useWide();
  const manifest = useManifest();
  const { profile } = useAuth();
  const { unlock, progress, goldenPages, mode, synced, markVillageIntroSeen } = useProgress();
  const [selected, setSelected] = useState<VillageId | null>(null);
  const [intro, setIntro] = useState<VillageId | null>(null);
  // Biết chắc đã xem hay chưa: chơi thử, hoặc đã kéo xong dữ liệu từ máy chủ (tránh hiện lại ở máy khác).
  const introKnown = mode === 'guest' || (mode === 'user' && synced);

  const pickVillage = (id: VillageId) => {
    if (selected === id) return setSelected(null);
    if (introKnown && shouldShowIntro(progress.game.data, id)) return setIntro(id);
    setSelected(id);
  };
  const endIntro = () => {
    if (!intro) return;
    markVillageIntroSeen(intro);
    setSelected(intro);
    setIntro(null);
  };

  const dim = manifest?.['ui/ban-do'];
  const aspect = dim ? `${dim.width} / ${dim.height}` : '1920 / 1047';
  const name = profile?.display_name ?? fmt('{Ten}');

  const details = selected && (
    <VillageDetails
      villageId={selected}
      unlockLevels={unlock.levels}
      progress={progress}
      goldenEarned={VILLAGE_ORDER.indexOf(selected) < goldenPages}
      onClose={wide ? undefined : () => setSelected(null)}
      onReplayIntro={() => setIntro(selected)}
    />
  );

  return (
    <>
      <GuestBar />
      <header className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 p-3">
        <GoldenCells count={goldenPages} />
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-extrabold">{name}</span>
          <Link
            to="/ho-so"
            className="inline-flex min-h-11 items-center rounded-nut border-2 border-nau-go bg-giay px-3 font-display font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
          >
            {ui.banDo.hoSo}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] gap-4 p-3 pt-0 md:flex md:items-start">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-bang border-4 border-nau-go shadow-[0_4px_0_0_var(--color-nau-go-dam)]">
          <AssetImage path="ui/ban-do" alt="" className="block h-auto w-full" style={{ width: '100%', aspectRatio: aspect }} />
          {VILLAGE_ORDER.map((id, vi) => {
            const pos = BAN_DO_HOTSPOTS[id];
            const levels = levelsOfVillage(id);
            const states = levels.map((l) => unlock.levels.find((u) => u.id === l.id)?.state ?? 'locked');
            const got = vi < goldenPages;
            const on = selected === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => pickVillage(id)}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className={`absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-nut border-4 border-nau-go bg-giay/95 px-2 py-1 text-center shadow-[0_3px_0_0_var(--color-nau-go-dam)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${on ? 'ring-4 ring-muc-tim' : ''}`}
              >
                {got && (
                  <AssetImage
                    path="ui/icons/trang-vang"
                    alt=""
                    className="absolute -right-3 -top-4 size-8 object-contain drop-shadow"
                  />
                )}
                <span className="block max-w-[7.5rem] font-display text-sm font-extrabold leading-tight sm:max-w-none sm:text-base">
                  {ui.lang[id]}
                </span>
                <span className="mt-1 flex justify-center gap-1">
                  {states.map((s, i) => (
                    <LevelDot key={i} state={s} />
                  ))}
                </span>
                <span className="sr-only">
                  {levels.map((l, i) => fmt(ui.banDo.nhanCham, { man: fmt(l.ten), trangThai: STATE_TEXT[states[i]] })).join('; ')}
                  {got ? `; ${ui.banDo.trangDaNhan}` : ''}
                </span>
              </button>
            );
          })}
        </div>

        {wide ? (
          <aside className="mt-0 w-80 shrink-0">
            <Panel>{details || <p className="font-semibold">{ui.banDo.chonLang}</p>}</Panel>
          </aside>
        ) : (
          !selected && <p className="mt-3 text-center font-semibold">{ui.banDo.chonLang}</p>
        )}
      </main>

      {!wide && (
        <BottomSheet isOpen={selected !== null} onClose={() => setSelected(null)} className="max-h-[85vh] overflow-y-auto">
          {details}
        </BottomSheet>
      )}

      {intro && (
        <Suspense fallback={null}>
          <VillageIntro village={intro} unlockLevels={unlock.levels} onDone={endIntro} />
        </Suspense>
      )}
    </>
  );
}
