import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { asset, useManifest } from '../assets/store';
import { CHARACTERS, fmt, speakerLabel } from '../content/characters';
import { ui } from '../content/ui';
import { useSettings } from '../settings/SettingsProvider';
import { MouseSensitivityRow } from '../ui/SettingsPanel';
import { VnDialog, type VnTurn } from '../ui/VnDialog';
import { Scene3D } from './Scene3D';
import { Villager } from './Villager';
import { WalkControls } from './WalkControls';
import { WalkLockOverlay } from './WalkLockOverlay';
import { useWalkSession } from './useWalkSession';
import { WalkWorld } from './WalkWorld';
import type { CameraBlocker } from './cameraCollision';
import { box, circle, obox, type Obstacle } from './collision';
import { ColliderDebug } from './cho/ColliderDebug';
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

/**
 * Vật cản của các vật thử, đúng bằng hình đã dựng (bước 7b): cột tròn và hộp đúng cỡ; biển gỗ là tấm biển 1,1 × 0,1 (phần chạm tới tầm
 * 1,5 từ đất, hộp xoay theo trục), hòm thư là hộp 0,5 × 0,4. Mỗi cái kèm chiều cao để vẽ khung xem va chạm (`?debug=colliders`).
 */
export const DEV_WALK_COLLIDERS: readonly CameraBlocker[] = [
  ...PILLARS.map((p) => ({ shape: circle(p.x, p.z, p.r) as Obstacle, height: p.h })),
  ...BLOCKS.map((b) => ({ shape: box(b.minX, b.maxX, b.minZ, b.maxZ) as Obstacle, height: b.h })),
  { shape: obox(SIGNPOST.x, SIGNPOST.z, 0.55, 0.05, 0), height: 1.65 },
  { shape: obox(MAILBOX.x, MAILBOX.z, 0.25, 0.2, 0), height: 0.9 },
];
const OBSTACLES: readonly Obstacle[] = DEV_WALK_COLLIDERS.map((c) => c.shape);

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
  // Chỉ khi chạy dev: mở cầu nối điều khiển ra window để kiểm tra bằng trình duyệt (góc camera, khóa chuột).
  if (import.meta.env.DEV) (window as unknown as { __walkApi?: typeof api }).__walkApi = api;
  const [choice, setChoice] = useState<QualityChoice>(settings.quality);
  const { level } = useQuality(choice);
  const [fps, setFps] = useState(0);
  const [near, setNear] = useState(-1);
  const [dialog, setDialog] = useState<number | null>(null);
  const session = useWalkSession(api, dialog !== null);
  const { paused, lockMode } = session;
  const debugColliders = useMemo(() => new URLSearchParams(window.location.search).get('debug') === 'colliders', []);
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

  const nearRef = useRef(near);
  nearRef.current = near;
  const dialogRef = useRef(dialog);
  dialogRef.current = dialog;

  const interact = useCallback(() => {
    if (dialogRef.current !== null || nearRef.current < 0) return;
    setDialog(nearRef.current);
    api.lock.exit(); // nhả khóa để bấm được lựa chọn trong hộp thoại
  }, [api]);
  const closeDialog = useCallback(() => {
    setDialog(null);
    session.dialogClosed(); // đóng bằng cú bấm thì khóa lại ngay trong chính sự kiện bấm đó
  }, [session]);

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
        onLockChange={session.onLockChange}
        onLockError={session.onLockError}
        interactLabel={near >= 0 ? labels[near] : null}
        onInteract={interact}
        onMenu={session.toggleMenu}
        className="size-full"
      >
        <Scene3D quality={choice === 'auto' ? undefined : choice} camera={{ position: [0, 4, -7], fov: 50 }} lookAt={[0, 1.3, 0]} shadowExtent={GROUND_RADIUS + 2}>
          <WalkWorld api={api} paused={paused} obstacles={OBSTACLES} boundsRadius={GROUND_RADIUS} interactables={interactables} onNearestChange={onNearest} groundUrl={groundUrl}>
            <Props />
            {debugColliders && <ColliderDebug colliders={DEV_WALK_COLLIDERS} dynamic={[]} />}
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
          {session.menuCount > 0 && <p className="font-bold">{fmt(ui.devWalk.suKienMenu, { so: session.menuCount })}</p>}
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
        {lockMode && session.locked && <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 ring-1 ring-black/40" />}
      </WalkControls>

      {dialog !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-3">
          <div className="flex w-full max-w-[960px] justify-center">
            <VnDialog turns={turns[dialog]} onFinish={closeDialog} />
          </div>
        </div>
      )}

      <WalkLockOverlay session={session}>
        <MouseSensitivityRow value={settings.mouseSensitivity} onChange={(v) => update({ mouseSensitivity: v })} />
        <QualitySelect value={choice} onChange={setChoice} />
      </WalkLockOverlay>
    </div>
  );
}
