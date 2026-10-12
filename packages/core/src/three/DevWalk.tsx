import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { asset, useManifest } from '../assets/store';
import { CHARACTERS, fmt, speakerLabel } from '../content/characters';
import { ui } from '../content/ui';
import { useSettings } from '../settings/SettingsProvider';
import { Panel } from '../ui/Panel';
import { MouseSensitivityRow } from '../ui/SettingsPanel';
import { VnDialog, type VnTurn } from '../ui/VnDialog';
import { Scene3D } from './Scene3D';
import { Villager } from './Villager';
import { WalkControls } from './WalkControls';
import { WalkWorld } from './WalkWorld';
import { box, circle, type Obstacle } from './collision';
import type { Interactable } from './interaction';
import { QUALITY_CHOICES, type QualityChoice } from './quality';
import { useQuality } from './useQuality';
import { createWalkApi } from './walkApi';
import type { Waypoint } from './wander';

/** Nền đất phẳng bán kính 20 (spec: trang /dev/walk). */
const GROUND_RADIUS = 20;
const GROUND_TEXTURE = 'ui/textures/duong-dat';

interface Pillar {
  x: number;
  z: number;
  r: number;
  h: number;
  color: string;
}
const PILLARS: readonly Pillar[] = [
  { x: 6, z: 4, r: 1.2, h: 2.4, color: '#C9744A' },
  { x: -8, z: 7, r: 0.8, h: 2, color: '#6F9E5B' },
  { x: 2, z: -9, r: 1.6, h: 2.8, color: '#7E6BC9' },
  { x: -3, z: -4, r: 0.5, h: 1.6, color: '#D9A441' },
];
interface Block {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  h: number;
  color: string;
}
/** Vài hộp, trong đó hai hộp vuông góc (chữ L) để thử đi xéo vào góc. */
const BLOCKS: readonly Block[] = [
  { minX: -10, maxX: -6, minZ: -3, maxZ: -1, h: 1.6, color: '#B5835A' },
  { minX: 7, maxX: 12, minZ: -8, maxZ: -6, h: 1.4, color: '#8C6A4A' },
  { minX: -4, maxX: 2, minZ: 10, maxZ: 11, h: 1.8, color: '#A46B3E' },
  { minX: -4, maxX: -3, minZ: 10, maxZ: 15, h: 1.8, color: '#A46B3E' },
];
const SIGNPOST = { x: 0, z: 8 };
const MAILBOX = { x: -7, z: -7 };

const OBSTACLES: readonly Obstacle[] = [
  ...PILLARS.map((p) => circle(p.x, p.z, p.r)),
  ...BLOCKS.map((b) => box(b.minX, b.maxX, b.minZ, b.maxZ)),
  circle(SIGNPOST.x, SIGNPOST.z, 0.3),
  circle(MAILBOX.x, MAILBOX.z, 0.35),
];

const VILLAGER_PATH: readonly Waypoint[] = [
  [10, 10],
  [13, 6],
  [9, 1],
  [12, -2],
];

/** Vật thử ở mặt đất: cột tròn, hộp, biển gỗ và hòm thư. */
function Props() {
  return (
    <group>
      {PILLARS.map((p, i) => (
        <mesh key={`p${i}`} position={[p.x, p.h / 2, p.z]} castShadow receiveShadow>
          <cylinderGeometry args={[p.r, p.r, p.h, 28]} />
          <meshStandardMaterial color={p.color} roughness={0.8} />
        </mesh>
      ))}
      {BLOCKS.map((b, i) => (
        <mesh key={`b${i}`} position={[(b.minX + b.maxX) / 2, b.h / 2, (b.minZ + b.maxZ) / 2]} castShadow receiveShadow>
          <boxGeometry args={[b.maxX - b.minX, b.h, b.maxZ - b.minZ]} />
          <meshStandardMaterial color={b.color} roughness={0.85} />
        </mesh>
      ))}
      <group position={[SIGNPOST.x, 0, SIGNPOST.z]}>
        <mesh position={[0, 0.8, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 1.6, 12]} />
          <meshStandardMaterial color="#7A5230" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow>
          <boxGeometry args={[1.1, 0.5, 0.1]} />
          <meshStandardMaterial color="#E8C98A" roughness={0.8} />
        </mesh>
      </group>
      <group position={[MAILBOX.x, 0, MAILBOX.z]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.5, 0.9, 0.4]} />
          <meshStandardMaterial color="#C0463A" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

/** Đo FPS, báo ra ngoài mỗi nửa giây (chỉ cấp phát khi báo). */
function WalkStats({ onFps }: { onFps: (fps: number) => void }) {
  const clock = useMemo(() => ({ last: performance.now(), frames: 0 }), []);
  useFrame(() => {
    clock.frames++;
    const now = performance.now();
    const elapsed = now - clock.last;
    if (elapsed >= 500) {
      onFps((clock.frames * 1000) / elapsed);
      clock.last = now;
      clock.frames = 0;
    }
  });
  return null;
}

const QUALITY_LABEL: Record<QualityChoice, string> = {
  auto: ui.caiDat.chatLuongTuDong,
  low: ui.caiDat.chatLuongThap,
  medium: ui.caiDat.chatLuongVua,
  high: ui.caiDat.chatLuongCao,
};

/** Sau khi đóng hộp thoại, Esc vừa đóng không được tính là mở menu (chỉ dùng khi không có khóa chuột). */
const MENU_GUARD_MS = 250;
/** Hết chờ này mà trình duyệt chưa trả lời yêu cầu khóa chuột thì coi như chưa khóa được và hiện lại lời nhắc. */
const LOCK_PENDING_MS = 1500;

/** Trình duyệt có khóa chuột và con trỏ chính là chuột (không phải cảm ứng). */
function detectLockMode(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return 'requestPointerLock' in Element.prototype && window.matchMedia('(pointer: fine)').matches;
}

function QualitySelect({ value, onChange }: { value: QualityChoice; onChange: (v: QualityChoice) => void }) {
  return (
    <label className="flex items-center gap-1">
      <span>{ui.devWalk.chatLuong}</span>
      <select
        className="min-h-11 rounded-nut border-2 border-nau-go bg-giay px-1"
        value={value}
        onChange={(e) => {
          onChange(e.target.value as QualityChoice);
          e.currentTarget.blur(); // trả phím về cho việc đi lại
        }}
      >
        {QUALITY_CHOICES.map((c) => (
          <option key={c} value={c}>
            {QUALITY_LABEL[c]}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Trang /dev/walk (spec 03 mục 10, mốc 2 bước 6): nền đất phẳng bán kính 20, vài cột tròn và hộp để thử va chạm, hai vật tương
 * tác được (mở hộp thoại ngắn), một dân làng đi lại, bộ đếm FPS và chọn mức chất lượng. Máy tính: bấm vào khung để khóa chuột,
 * rê chuột xoay camera; nhả khóa (Esc, chuyển cửa sổ) thì hiện menu tạm dừng "Bấm để chơi tiếp". Điện thoại dùng cần điều khiển
 * và hai nút (mở bằng `pnpm dev:hub --host`).
 */
export function DevWalk() {
  const manifest = useManifest();
  const { settings, update } = useSettings();
  const api = useMemo(() => createWalkApi(0), []);
  const lockMode = useMemo(detectLockMode, []);
  // Chỉ khi chạy dev: mở cầu nối điều khiển ra window để kiểm tra bằng trình duyệt (góc camera, khóa chuột).
  if (import.meta.env.DEV) (window as unknown as { __walkApi?: typeof api }).__walkApi = api;
  const [choice, setChoice] = useState<QualityChoice>(settings.quality);
  const { level } = useQuality(choice);
  const [fps, setFps] = useState(0);
  const [near, setNear] = useState(-1);
  const [dialog, setDialog] = useState<number | null>(null);
  const [menu, setMenu] = useState(false); // menu mở bằng Esc khi không có khóa chuột
  const [locked, setLocked] = useState(false);
  const [lockPending, setLockPending] = useState(false);
  const [menuCount, setMenuCount] = useState(0);
  // Có khóa chuột: menu hiện đúng khi chưa khóa (kể cả lúc mới vào) và không có hộp thoại. Không có: Esc bật tắt menu.
  const menuOpen = lockMode ? !locked && !lockPending && dialog === null : menu;
  const paused = dialog !== null || (lockMode ? !locked : menu);
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  const groundUrl = useMemo(() => (manifest ? asset(GROUND_TEXTURE) : null), [manifest]);
  const interactables = useMemo<Interactable[]>(
    () => [
      { id: 'bienGo', x: SIGNPOST.x, z: SIGNPOST.z },
      { id: 'homThu', x: MAILBOX.x, z: MAILBOX.z },
    ],
    [],
  );
  const labels = useMemo(() => [ui.devWalk.vatBienGo, ui.devWalk.vatHomThu], []);
  const turns = useMemo<VnTurn[][]>(() => {
    const speaker = speakerLabel('bacAn');
    const portrait = CHARACTERS.bacAn.portrait;
    return [
      [
        { speaker, portrait, text: fmt(ui.devWalk.bienGoLuot1) },
        { speaker, portrait, text: fmt(ui.devWalk.bienGoLuot2) },
      ],
      [{ speaker, portrait, text: fmt(ui.devWalk.homThuLuot1) }],
    ];
  }, []);

  // Giá trị mới nhất cho các hàm gọi từ sự kiện (không đăng ký lại mỗi lần vẽ).
  const state = useRef({ near, dialog, menu, locked });
  state.current = { near, dialog, menu, locked };
  const lastDialogClose = useRef(0);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Xin khóa chuột. Phải gọi ngay trong sự kiện bấm. Bị từ chối thì `onLockError` hiện lại lời nhắc. */
  const lock = useCallback(() => {
    if (!lockMode || state.current.locked) return;
    setLockPending(true);
    clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => setLockPending(false), LOCK_PENDING_MS);
    api.lock.request();
  }, [api, lockMode]);
  const onLockChange = useCallback((isLocked: boolean) => {
    clearTimeout(pendingTimer.current);
    setLockPending(false);
    setLocked(isLocked);
    // Nhả khóa (Esc, chuyển cửa sổ) khi không phải để mở hộp thoại: coi là sự kiện mở menu.
    if (!isLocked && state.current.dialog === null) setMenuCount((c) => c + 1);
  }, []);
  const onLockError = useCallback(() => {
    clearTimeout(pendingTimer.current);
    setLockPending(false); // hiện lại lời nhắc "Bấm để chơi tiếp", không báo lỗi
  }, []);
  useEffect(() => () => clearTimeout(pendingTimer.current), []);

  const interact = useCallback(() => {
    const s = state.current;
    if (s.dialog !== null || s.menu || s.near < 0) return;
    setDialog(s.near);
    api.lock.exit(); // nhả khóa để bấm được lựa chọn trong hộp thoại
  }, [api]);
  const toggleMenu = useCallback(() => {
    if (lockMode) return; // có khóa chuột: Esc do trình duyệt xử lý (nhả khóa), menu hiện theo trạng thái khóa
    const s = state.current;
    if (s.dialog !== null || performance.now() - lastDialogClose.current < MENU_GUARD_MS) return;
    setMenuCount((c) => c + 1);
    setMenu((m) => !m);
  }, [lockMode]);
  const closeDialog = useCallback(() => {
    lastDialogClose.current = performance.now();
    setDialog(null);
    lock(); // đóng bằng cú bấm thì khóa lại ngay trong chính sự kiện bấm đó
  }, [lock]);

  useEffect(() => {
    document.title = ui.devWalk.tieuDe;
  }, []);

  const onFps = useCallback((v: number) => setFps(v), []);
  const onNearest = useCallback((i: number) => setNear(i), []);

  return (
    <div className="fixed inset-0 bg-giay">
      <WalkControls
        api={api}
        paused={paused}
        lockMode={lockMode}
        mouseSensitivity={settings.mouseSensitivity}
        onLockChange={onLockChange}
        onLockError={onLockError}
        interactLabel={near >= 0 ? labels[near] : null}
        onInteract={interact}
        onMenu={toggleMenu}
        className="size-full"
      >
        <Scene3D quality={choice === 'auto' ? undefined : choice} camera={{ position: [0, 4, -7], fov: 50 }} lookAt={[0, 1.3, 0]} shadowExtent={GROUND_RADIUS + 2}>
          <WalkWorld api={api} paused={paused} obstacles={OBSTACLES} boundsRadius={GROUND_RADIUS} interactables={interactables} onNearestChange={onNearest} groundUrl={groundUrl}>
            <Props />
            <Villager id="characters/dan-lang-ba-cu" waypoints={VILLAGER_PATH} seed={5} />
          </WalkWorld>
          <WalkStats onFps={onFps} />
        </Scene3D>

        {/* Bảng thông tin: không bắt đầu khóa chuột, kéo camera hay cần điều khiển */}
        <div data-walk-ui className="absolute left-2 top-2 z-10 max-w-[min(22rem,calc(100vw-1rem))] space-y-1 rounded-bang border-2 border-nau-go/60 bg-giay/90 p-2 text-sm shadow-md">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-base font-extrabold">{ui.devWalk.tieuDe}</h1>
            <a href="/" className="rounded-nut border-2 border-nau-go bg-giay px-2 py-1 text-xs font-bold">
              {ui.devWalk.veTrangChu}
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold" role="status">
              {fmt(ui.devWalk.fps, { so: Math.round(fps) })}
            </span>
            <QualitySelect value={choice} onChange={setChoice} />
          </div>
          <p>{fmt(ui.devWalk.mucDangDung, { muc: QUALITY_LABEL[level] })}</p>
          <details open={!coarse}>
            <summary className="min-h-8 cursor-pointer font-bold">{ui.devWalk.huongDan}</summary>
            <p>{coarse ? ui.devWalk.huongDanDienThoai : ui.devWalk.huongDanMayTinh}</p>
            <p>{ui.devWalk.thuHienVa}</p>
          </details>
          {menuCount > 0 && <p className="font-bold">{fmt(ui.devWalk.suKienMenu, { so: menuCount })}</p>}
        </div>

        {/* Lời nhắc tương tác ở máy tính (điện thoại hiện trên nút ✋) */}
        {near >= 0 && !paused && (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 hidden justify-center [@media(pointer:fine)]:flex">
            <span className="rounded-nut bg-black/70 px-4 py-2 font-display text-lg font-extrabold text-white" role="status">
              {fmt(ui.dungDi.nhacTuongTac, { vat: labels[near] })}
            </span>
          </div>
        )}

        {/* Dấu chấm giữa màn hình khi đã khóa chuột (con trỏ bị ẩn) */}
        {lockMode && locked && <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 ring-1 ring-black/40" />}
      </WalkControls>

      {dialog !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-3">
          <div className="flex w-full max-w-[960px] justify-center">
            <VnDialog turns={turns[dialog]} onFinish={closeDialog} />
          </div>
        </div>
      )}

      {menuOpen && (
        // Bấm vào đâu ngoài các điều khiển thì khóa chuột lại (trong chính sự kiện bấm này).
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={lockMode ? lock : undefined}>
          <Panel role="dialog" aria-labelledby="walk-menu" className="w-full max-w-sm space-y-3 text-center">
            <h2 id="walk-menu" className="text-2xl">
              {ui.devWalk.menuTieuDe}
            </h2>
            <p>{ui.devWalk.menuMoTa}</p>
            {lockMode ? (
              <button
                type="button"
                autoFocus
                onClick={(e) => {
                  e.stopPropagation();
                  lock();
                }}
                className="min-h-11 w-full cursor-pointer rounded-nut border-2 border-xanh-la-dam bg-xanh-la px-4 font-display text-lg font-extrabold text-white"
              >
                {ui.devWalk.baiDeChoiTiep}
              </button>
            ) : (
              <button type="button" autoFocus onClick={() => setMenu(false)} className="min-h-11 cursor-pointer rounded-nut border-2 border-xanh-la-dam bg-xanh-la px-4 font-bold text-white">
                {ui.devWalk.menuTiepTuc}
              </button>
            )}
            <div className="space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
              <MouseSensitivityRow value={settings.mouseSensitivity} onChange={(v) => update({ mouseSensitivity: v })} />
              <QualitySelect value={choice} onChange={setChoice} />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
