import { useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3, type Group, type Texture } from 'three';
import { Bi } from './Bi';
import { dampFactor } from './biMotion';
import { cameraClearance, type CameraBlocker } from './cameraCollision';
import { CAMERA_FOLLOW_RATE, CAMERA_LOOK_HEIGHT, CAMERA_MIN_Y, cameraOffset, type Vec3Out } from './cameraRig';
import { Character, type CharacterInfo } from './Character';
import type { Obstacle } from './collision';
import type { ClipName } from './clips';
import { nearestInteractable, type Interactable } from './interaction';
import { RUN_SPEED, WALK_SPEED, animationFor, createPlayerState, jumpTimeScale, locomotionTimeScale, stepPlayer, type MoveInput, type PlayerState, type World } from './playerMotion';
import { shadowFocus } from './shadowFocus';
import { combineInput, type WalkApi } from './walkApi';

/** Người chơi ở cảnh đi lại là học sinh (spec 03 mục 3.1). */
export const WALK_PLAYER = 'characters/hoc-sinh-nam';
const CLIPS: readonly ClipName[] = ['idle', 'walk', 'run', 'jump'];
const NO_BLOCKERS: readonly CameraBlocker[] = [];

/** Trạng thái người chơi cho các thành phần con của cảnh (ví dụ khung xem va chạm); null ngoài <WalkWorld>. */
const PlayerStateContext = createContext<PlayerState | null>(null);
export function usePlayerState(): PlayerState | null {
  return useContext(PlayerStateContext);
}
/** Một ô texture đất phủ bấy nhiêu đơn vị cảnh. */
const GROUND_TILE = 5;

export interface WalkWorldProps {
  /** Cầu nối với `WalkControls` (phím, chạm, góc camera) */
  api: WalkApi;
  /** Đang mở hộp thoại hoặc menu: bỏ lệnh đi và nhảy */
  paused: boolean;
  obstacles: readonly Obstacle[];
  /** Bán kính nền đất (và biên đi lại) */
  boundsRadius: number;
  interactables: readonly Interactable[];
  /** Độ cao mặt đi được tại (x, z) (cầu tàu, dốc); bỏ trống thì mặt đất phẳng. Xem `playerMotion.World.groundHeight`. */
  groundHeight?: (x: number, z: number) => number;
  /** Vật cao chắn camera (nhà, cổng, cây): camera được kéo lại gần thay vì xuyên qua. Bỏ trống thì camera không tránh gì. */
  cameraBlockers?: readonly CameraBlocker[];
  /** Báo chỉ số vật tương tác gần nhất (−1 nếu không có) mỗi khi nó đổi */
  onNearestChange: (index: number) => void;
  /** Đường dẫn ảnh nền đất (lấy từ manifest); null thì dùng màu thay thế */
  groundUrl: string | null;
  /** Vị trí xuất phát [x, z] */
  start?: readonly [number, number];
  /** true: không dùng camera bám theo người chơi (nơi dùng tự đặt camera, ví dụ góc nhìn từ trên cao để chụp ảnh) */
  freeCamera?: boolean;
  /** Mỗi khung hình ghi vị trí của Bi vào đây (để làm vật tương tác) */
  biTrack?: { x: number; z: number };
  /** Vẽ nền đất phẳng hình tròn mặc định (false khi cảnh tự dựng nền) */
  showGround?: boolean;
  /** Các vật khác của cảnh (hộp, cột, dân làng…) */
  children?: ReactNode;
}

/** Nền đất phẳng hình tròn phủ texture lặp (tải bằng TextureLoader, giải phóng khi rời cảnh). Chưa có ảnh thì dùng màu đất. */
function Ground({ radius, url }: { radius: number; url: string | null }) {
  const [tex, setTex] = useState<Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let loaded: Texture | null = null;
    new TextureLoader().load(
      url,
      (t) => {
        if (cancelled) {
          t.dispose();
          return;
        }
        t.wrapS = RepeatWrapping;
        t.wrapT = RepeatWrapping;
        t.repeat.set((radius * 2) / GROUND_TILE, (radius * 2) / GROUND_TILE);
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 4;
        loaded = t;
        setTex(t);
      },
      undefined,
      () => undefined, // tải lỗi: giữ màu thay thế
    );
    return () => {
      cancelled = true;
      loaded?.dispose();
      setTex(null);
    };
  }, [url, radius]);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[radius, 72]} />
      <meshStandardMaterial key={tex ? 'co-anh' : 'chua-co-anh'} map={tex ?? undefined} color={tex ? '#FFFFFF' : '#B79B6C'} roughness={1} />
    </mesh>
  );
}

/** Cạnh quanh điểm nhìn: camera bị chặn thì kéo lại gần ngay (không bao giờ xuyên), hết bị chặn thì đi ra từ từ. */
const CLEARANCE_OUT_RATE = 3;

/**
 * Camera bám sau lưng người chơi, cách 7 cao 4, mượt; góc xoay lấy từ `api.camera`. Có vật cản thì kéo camera lại gần (xem
 * `cameraClearance`): vào nhanh, ra chậm, và kiểm tra lại vị trí đã làm mượt để chắc chắn không xuyên tường. Không cấp phát trong useFrame.
 */
function ChaseCamera({ api, player, blockers }: { api: WalkApi; player: PlayerState; blockers: readonly CameraBlocker[] }) {
  const camera = useThree((st) => st.camera);
  if (import.meta.env.DEV) (window as unknown as { __walkCamera?: typeof camera }).__walkCamera = camera;
  const tmp = useMemo(() => ({ off: { x: 0, y: 0, z: 0 } as Vec3Out, want: new Vector3(), look: new Vector3(), lookWant: new Vector3(), focus: new Vector3(), init: false, scale: 1 }), []);
  useFrame((_, dt) => {
    const a = api.camera;
    cameraOffset(a.yaw, a.pitch, tmp.off);
    // chân người chơi trên đất; nhảy chỉ kéo camera lên một nửa để khỏi nhấp nhô
    const baseY = player.y * 0.5;
    const fx = player.x;
    const fy = baseY + CAMERA_LOOK_HEIGHT;
    const fz = player.z;
    tmp.lookWant.set(fx, fy, fz);
    let wx = fx + tmp.off.x;
    let wy = Math.max(CAMERA_MIN_Y, baseY + tmp.off.y);
    let wz = fz + tmp.off.z;
    if (blockers.length > 0) {
      const t = cameraClearance(fx, fy, fz, wx, wy, wz, blockers);
      tmp.scale = t < tmp.scale ? t : tmp.scale + (t - tmp.scale) * dampFactor(Math.min(dt, 0.1), CLEARANCE_OUT_RATE);
      wx = fx + (wx - fx) * tmp.scale;
      wy = fy + (wy - fy) * tmp.scale;
      wz = fz + (wz - fz) * tmp.scale;
    }
    tmp.want.set(wx, wy, wz);
    if (!tmp.init) {
      camera.position.copy(tmp.want);
      tmp.look.copy(tmp.lookWant);
      tmp.init = true;
    } else {
      const k = dampFactor(Math.min(dt, 0.1), CAMERA_FOLLOW_RATE);
      camera.position.lerp(tmp.want, k);
      tmp.look.lerp(tmp.lookWant, k);
    }
    if (blockers.length > 0) {
      // vị trí đã làm mượt có thể đi cắt góc tường: kéo lại nếu vẫn bị chặn
      const c = camera.position;
      const t2 = cameraClearance(fx, fy, fz, c.x, c.y, c.z, blockers);
      if (t2 < 1) camera.position.set(fx + (c.x - fx) * t2, fy + (c.y - fy) * t2, fz + (c.z - fz) * t2);
    }
    camera.lookAt(tmp.look);
  });
  return null;
}

/** Học sinh: di chuyển, nhảy, va chạm, clip theo trạng thái; Bi bay theo. Mọi logic ở `playerMotion.ts` (hàm thuần). */
function Player({ api, paused, world, interactables, onNearestChange, player, start, biTrack }: { api: WalkApi; paused: boolean; world: World; interactables: readonly Interactable[]; onNearestChange: (i: number) => void; player: PlayerState; start: readonly [number, number]; biTrack?: { x: number; z: number } }) {
  const root = useRef<Group>(null);
  const input = useMemo<MoveInput>(() => ({ x: 0, y: 0, run: false, jump: false }), []);
  const live = useRef({ paused, world, interactables, onNearestChange });
  live.current = { paused, world, interactables, onNearestChange };

  const [anim, setAnim] = useState<ClipName>('idle');
  const [jumpN, setJumpN] = useState(0);
  const shown = useRef<ClipName>('idle');
  const nearest = useRef(-1);
  const [info, setInfo] = useState<CharacterInfo | null>(null);

  useFrame((_, dt0) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(dt0, 0.05);
    const l = live.current;
    combineInput(api.input, input);
    const jumped = stepPlayer(player, input, api.camera.yaw, dt, l.world, l.paused);
    g.position.set(player.x, player.y, player.z);
    g.rotation.y = player.yaw;
    shadowFocus.x = player.x;
    shadowFocus.y = player.y;
    shadowFocus.z = player.z;

    const a = animationFor(player);
    if (a !== shown.current) {
      shown.current = a;
      setAnim(a);
    }
    if (jumped) setJumpN((n) => n + 1);

    const idx = nearestInteractable(player.x, player.z, l.interactables);
    if (idx !== nearest.current) {
      nearest.current = idx;
      l.onNearestChange(idx);
    }
  });

  const timeScale = anim === 'walk' ? locomotionTimeScale(WALK_SPEED, info?.walkSpeed ?? null) : anim === 'run' ? locomotionTimeScale(RUN_SPEED, info?.runSpeed ?? null) : anim === 'jump' ? jumpTimeScale(info?.jumpSeconds ?? null) : 1;

  return (
    <>
      <group ref={root} position={[start[0], 0, start[1]]}>
        <Character id={WALK_PLAYER} clips={CLIPS} animation={anim} trigger={jumpN} returnTo="jump" timeScale={timeScale} onReady={setInfo} />
      </group>
      <Bi target={root} track={biTrack} />
    </>
  );
}

/**
 * Cảnh đi lại (spec 03 mục 3.7): nền đất phẳng, người chơi (học sinh) điều khiển bằng `WalkControls`, camera sau lưng, Bi bay
 * theo sau vai phải. Đặt trong <Scene3D>; các vật của cảnh (hộp, cột, dân làng) là `children`, còn dữ liệu va chạm và tương tác
 * truyền riêng qua `obstacles` và `interactables`.
 */
export function WalkWorld({ api, paused, obstacles, boundsRadius, interactables, cameraBlockers = NO_BLOCKERS, groundHeight, onNearestChange, groundUrl, start = [0, 0], showGround = true, freeCamera = false, biTrack, children }: WalkWorldProps) {
  const player = useMemo(() => createPlayerState(start[0], start[1], 0), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Chỉ khi chạy dev: mở trạng thái người chơi ra window để kiểm tra bằng trình duyệt.
  if (import.meta.env.DEV) (window as unknown as { __walkPlayer?: PlayerState }).__walkPlayer = player;
  const world = useMemo<World>(() => ({ obstacles, boundsRadius, groundHeight }), [obstacles, boundsRadius, groundHeight]);
  return (
    <>
      {showGround && <Ground radius={boundsRadius} url={groundUrl} />}
      <Player api={api} paused={paused} world={world} interactables={interactables} onNearestChange={onNearestChange} player={player} start={start} biTrack={biTrack} />
      {!freeCamera && <ChaseCamera api={api} player={player} blockers={cameraBlockers} />}
      <PlayerStateContext.Provider value={player}>{children}</PlayerStateContext.Provider>
    </>
  );
}
