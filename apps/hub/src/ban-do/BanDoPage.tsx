import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  AssetImage,
  BAN_DO_HOTSPOTS,
  BottomSheet,
  GuestBar,
  NenTrangTri,
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
import { BIG_MIN_WIDTH, GAP, MAP_RATIO, PANEL_W, fitMap, markerScale, type MapFit } from './fit';
import { LevelDot, STATE_TEXT, VillageDetails } from './parts';

// Lời giới thiệu làng chỉ tải khi cần (lần đầu bấm vào làng, hoặc bấm "Xem lại giới thiệu").
const VillageIntro = lazy(() => import('./VillageIntro'));

/** Màn hình khớp một truy vấn (ví dụ rộng từ 768px hoặc từ 1024px). */
function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Vùng chứa bản đồ có kích thước thế nào: đo bằng ResizeObserver rồi tính cỡ bản đồ to nhất vừa vùng đó. */
function useMapFit(ref: React.RefObject<HTMLElement | null>, enabled: boolean, ratio: number): MapFit | null {
  const [fit, setFit] = useState<MapFit | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setFit(null);
      return;
    }
    const PAD = 24; // lề 12px mỗi bên
    const measure = () => setFit(fitMap(el.clientWidth - PAD, el.clientHeight - PAD, ratio));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, enabled, ratio]);
  return fit;
}

/** 4 ô Trang Sổ Vàng ở góc trên: ô đã nhận sáng màu, ô chưa nhận mờ và xám (kèm chữ). `cell` là cạnh mỗi ô (px). */
function GoldenCells({ count, cell = 44 }: { count: number; cell?: number }) {
  return (
    <ul className="flex items-center gap-1.5" aria-label={fmt(ui.moKhoa.trangSoVang, { so: count, max: VILLAGE_ORDER.length })}>
      {VILLAGE_ORDER.map((_, i) => {
        const got = i < count;
        return (
          <li
            key={i}
            title={got ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
            style={{ width: cell, height: cell }}
            className={`grid place-items-center rounded-xl border-2 ${got ? 'border-vang-dam bg-vang/40' : 'border-dashed border-nau-go bg-giay/60'}`}
          >
            <AssetImage
              path="ui/icons/trang-vang"
              alt=""
              style={{ width: Math.round(cell * 0.72), height: Math.round(cell * 0.72) }}
              className={`object-contain ${got ? '' : 'grayscale opacity-30'}`}
            />
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
  const wide = useMedia('(min-width: 768px)');
  const big = useMedia(`(min-width: ${BIG_MIN_WIDTH}px)`);
  const stageRef = useRef<HTMLDivElement>(null);
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
  const ratio = dim ? dim.width / dim.height : MAP_RATIO;
  // Từ 1024px: bản đồ to hết mức có thể (giữ tỉ lệ ảnh), bảng làng bên phải cao bằng bản đồ, cả cụm căn giữa, không cuộn trang.
  const fit = useMapFit(stageRef, big, ratio);
  const sc = markerScale(fit?.w ?? 0);
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

  const cell = big ? 48 : 44;
  const nameCls = big ? 'font-display text-2xl font-extrabold' : 'font-display text-lg font-extrabold';
  const profileCls = `inline-flex items-center rounded-nut border-2 border-nau-go bg-giay font-display font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${big ? 'min-h-12 px-5 text-xl' : 'min-h-11 px-3'}`;
  const fitted = big && fit !== null && fit.w > 0;

  const header = (
    <header
      style={fitted ? { width: fit.total } : undefined}
      className={`mx-auto flex w-full flex-wrap items-center justify-between gap-3 ${fitted ? '' : 'max-w-[1280px]'} p-3`}
    >
      <GoldenCells count={goldenPages} cell={cell} />
      <div className="flex items-center gap-3">
        <span className={nameCls}>{name}</span>
        <Link to="/ho-so" className={profileCls}>
          {ui.banDo.hoSo}
        </Link>
      </div>
    </header>
  );

  const mapBox = (
    <div
      style={fitted ? { width: fit.w, height: fit.h, flex: 'none' } : undefined}
      className="relative min-w-0 flex-1 overflow-hidden rounded-bang border-4 border-nau-go shadow-[0_4px_0_0_var(--color-nau-go-dam)]"
    >
      <AssetImage
        path="ui/ban-do"
        alt=""
        className={`block w-full ${fitted ? 'h-full object-cover' : 'h-auto'}`}
        style={fitted ? undefined : { width: '100%', aspectRatio: aspect }}
      />
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
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, ...(fitted ? { minHeight: sc.target, minWidth: sc.target } : {}) }}
            className={`absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-nut border-4 border-nau-go bg-giay/95 px-2 py-1 text-center shadow-[0_3px_0_0_var(--color-nau-go-dam)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim ${on ? 'ring-4 ring-muc-tim' : ''}`}
          >
            {got && (
              <AssetImage
                path="ui/icons/trang-vang"
                alt=""
                style={fitted ? { width: sc.gold, height: sc.gold, right: -sc.gold * 0.4, top: -sc.gold * 0.5 } : undefined}
                className={`absolute object-contain drop-shadow ${fitted ? '' : '-right-3 -top-4 size-8'}`}
              />
            )}
            <span
              style={fitted ? { fontSize: sc.font } : undefined}
              className={`block font-display font-extrabold leading-tight ${fitted ? 'max-w-none' : 'max-w-[7.5rem] text-sm sm:max-w-none sm:text-base'}`}
            >
              {ui.lang[id]}
            </span>
            <span className="mt-1 flex justify-center gap-1">
              {states.map((s, i) => (
                <LevelDot key={i} state={s} size={fitted ? sc.dot : undefined} />
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
  );

  const sidePanel = wide ? (
    <aside style={fitted ? { width: PANEL_W, height: fit.h, flex: 'none' } : undefined} className={fitted ? '' : 'mt-0 w-80 shrink-0'}>
      <Panel className={fitted ? 'h-full overflow-y-auto' : undefined}>{details || <p className="font-semibold">{ui.banDo.chonLang}</p>}</Panel>
    </aside>
  ) : (
    !selected && <p className="mt-3 text-center font-semibold">{ui.banDo.chonLang}</p>
  );

  return (
    <div className={big ? 'flex h-dvh flex-col overflow-hidden' : undefined}>
      <NenTrangTri />
      <GuestBar />
      {header}

      {big ? (
        <div ref={stageRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
          <main className="flex items-start" style={{ gap: GAP }}>
            {mapBox}
            {sidePanel}
          </main>
        </div>
      ) : (
        <main className="mx-auto w-full max-w-[1280px] gap-4 p-3 pt-0 md:flex md:items-start">
          {mapBox}
          {sidePanel}
        </main>
      )}

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
    </div>
  );
}
