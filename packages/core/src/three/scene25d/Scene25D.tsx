import { Canvas, useThree, type ThreeElements } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LinearFilter, SRGBColorSpace, TextureLoader, type OrthographicCamera, type Texture } from 'three';
import { lookupAsset } from '../../assets/manifest';
import { ASSETS_URL, useManifest } from '../../assets/store';
import { fmt } from '../../content/characters';
import { ui } from '../../content/ui';
import { devWarn } from '../../lib/dev';
import { CanvasErrorBoundary } from '../CanvasErrorBoundary';
import { FpsGuard } from '../FpsGuard';
import { LoadingScreen } from '../LoadingScreen';
import { QualityContext } from '../QualityContext';
import { SceneWarmup } from '../SceneWarmup';
import { StatsProbe } from '../StatsProbe';
import { effectiveDpr, type QualityChoice, type QualityLevel } from '../quality';
import { lowerSessionCap } from '../qualityStore';
import { useQuality } from '../useQuality';
import {
  CAMERA_FAR,
  CAMERA_NEAR,
  CAMERA_Z,
  aspectOf,
  coverSize,
  fitFrame,
  frameMode,
  frustum,
  layerZ,
  spriteSize,
  worldSize,
  type FrameMode,
  type LayerName,
  type Size,
} from './layout25d';

/** Một hình rời 2D (PNG trong suốt) đặt trên mặt phẳng ở một lớp. Tọa độ theo đơn vị thế giới: gốc ở tâm khung, x sang phải, y lên trên (xem layout25d). */
export interface Sprite25D {
  /** Khóa riêng của hình trong cảnh */
  key: string;
  /** Đường dẫn trong manifest, ví dụ "sprites/man-03-ghep-so/ro-trang-gia" */
  asset: string;
  x: number;
  y: number;
  /** Lớp theo trục Z (mặc định 'back': sau nhân vật) */
  layer?: LayerName;
  /** Độ lệch nhỏ trên Z để sắp thứ tự trong cùng lớp */
  bias?: number;
  /** Cho chiều cao hoặc chiều rộng (đơn vị thế giới); cạnh kia theo tỉ lệ ảnh */
  height?: number;
  width?: number;
  flipX?: boolean;
  opacity?: number;
  /** Góc xoay trong mặt phẳng (radian) */
  rotation?: number;
}

export interface Scene25DProps {
  /** Ảnh nền, đường dẫn trong manifest (ví dụ "scenes/man-03-xuong-giay"), phủ kín khung kiểu `cover` */
  background: string;
  /** Hình rời 2D xếp lớp */
  sprites?: readonly Sprite25D[];
  /** Phần tử R3F của cảnh: nhân vật 3D (`Actor25D`), hình code vẽ... đặt theo cùng hệ tọa độ */
  children?: ReactNode;
  /** Lớp HTML phủ lên trên khung (bảng điểm, nút, câu hỏi) */
  overlay?: ReactNode;
  /** Cho phép khung dọc 9:16 khi điện thoại xoay dọc (màn 12). Mặc định: xoay dọc thì hiện nhắc "Xoay ngang để chơi". */
  allowPortrait?: boolean;
  /** Thay cho cài đặt "Chất lượng đồ họa" (dùng ở /dev/25d); có giá trị này thì không tự hạ mức */
  quality?: QualityChoice;
  /** Tự hạ một mức nếu FPS dưới 40 trong 3 giây đầu (mặc định bật) */
  autoDowngrade?: boolean;
  /** Báo khi cảnh đã tải xong (ảnh, model; màn hình tải đã tắt) */
  onReady?: () => void;
  /** Báo mức mới khi vừa tự hạ mức vì FPS thấp */
  onQualityLowered?: (fps: number, level: QualityLevel) => void;
  /** Báo khi chế độ khung đổi (ngang, dọc, nhắc xoay) */
  onModeChange?: (mode: FrameMode) => void;
  /** Hộp báo lỗi phủ kín cả màn hình khi cảnh lỗi */
  errorCovers?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Nạp trước ảnh

/** Màu ô thay thế khi thiếu ảnh (nền giấy dó), không để cảnh lỗi. */
const PLACEHOLDER_COLOR = '#e8d9b5';

interface SceneTextures {
  /** Texture đã tải, hoặc null nếu ảnh thiếu/lỗi (vẽ ô màu thay thế) */
  get(path: string): Texture | null;
  /** Tất cả ảnh đã có kết quả (tải xong hoặc báo thiếu) */
  done: boolean;
}

/**
 * Nạp trước mọi ảnh của cảnh (nền và hình rời) trước khi tắt màn hình tải. Thiếu file hoặc ảnh lỗi thì dùng ô màu thay thế. Texture không dùng mipmap (hình phẳng
 * đứng trước camera trực giao) và được giải phóng khi rời cảnh.
 */
function useSceneTextures(paths: readonly string[]): SceneTextures {
  const manifest = useManifest();
  const store = useRef(new Map<string, Texture | null>());
  const pending = useRef(new Set<string>());
  const [version, setVersion] = useState(0);
  const key = paths.join('|');

  useEffect(() => {
    if (!manifest) return;
    let alive = true;
    const loader = new TextureLoader();
    for (const path of key === '' ? [] : key.split('|')) {
      if (store.current.has(path)) continue;
      const url = lookupAsset(manifest, ASSETS_URL, path);
      if (!url) {
        devWarn(fmt(ui.dev.thieuAnh, { path }));
        store.current.set(path, null);
        setVersion((v) => v + 1);
        continue;
      }
      store.current.set(path, null);
      loader.load(
        url,
        (t) => {
          if (!alive) return t.dispose();
          t.colorSpace = SRGBColorSpace;
          t.generateMipmaps = false;
          t.minFilter = LinearFilter;
          t.magFilter = LinearFilter;
          store.current.set(path, t);
          pending.current.delete(path);
          setVersion((v) => v + 1);
        },
        undefined,
        () => {
          devWarn(fmt(ui.dev.anhLoi, { path, src: url }));
          pending.current.delete(path);
          setVersion((v) => v + 1);
        },
      );
      pending.current.add(path);
    }
    return () => {
      alive = false;
    };
  }, [manifest, key]);

  // giải phóng khi rời cảnh
  useEffect(() => {
    const textures = store.current;
    return () => {
      for (const t of textures.values()) t?.dispose();
      textures.clear();
    };
  }, []);

  return useMemo<SceneTextures>(() => {
    const unique = key === '' ? [] : [...new Set(key.split('|'))];
    const done = !!manifest && unique.every((p) => store.current.has(p) && !pending.current.has(p));
    return { get: (p) => store.current.get(p) ?? null, done };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest, key, version]);
}

// ---------------------------------------------------------------------------
// Trong khung vẽ

function imageSize(t: Texture | null): Size {
  const img = t?.image as { width?: number; height?: number } | undefined;
  return { width: img?.width ?? 0, height: img?.height ?? 0 };
}

/** Ảnh nền: một mặt phẳng phủ kín khung kiểu `cover`, ở lớp xa nhất. */
function Backdrop({ texture, world }: { texture: Texture | null; world: Size }) {
  const size = coverSize(imageSize(texture), world);
  return (
    <mesh position={[0, 0, layerZ('background')]} renderOrder={-10}>
      <planeGeometry args={[size.width, size.height]} />
      <meshBasicMaterial map={texture} color={texture ? '#ffffff' : PLACEHOLDER_COLOR} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/** Một hình rời: mặt phẳng có texture trong suốt, đặt ở lớp của nó. Thiếu ảnh thì hiện ô màu mờ đúng chỗ. */
function SpriteMesh({ sprite, texture }: { sprite: Sprite25D; texture: Texture | null }) {
  const size = spriteSize(imageSize(texture), { width: sprite.width, height: sprite.height ?? (sprite.width === undefined ? 2 : undefined) });
  return (
    <mesh position={[sprite.x, sprite.y, layerZ(sprite.layer ?? 'back', sprite.bias ?? 0)]} rotation-z={sprite.rotation ?? 0} scale-x={sprite.flipX ? -1 : 1}>
      <planeGeometry args={[size.width, size.height]} />
      <meshBasicMaterial map={texture} color={texture ? '#ffffff' : PLACEHOLDER_COLOR} transparent opacity={(sprite.opacity ?? 1) * (texture ? 1 : 0.5)} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/** Khung nhìn trực giao phủ đúng khung thế giới (camera `manual`: R3F không tự đổi khung nhìn theo kích thước canvas). */
function FrustumSync({ world }: { world: Size }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  useLayoutEffect(() => {
    const f = frustum(world);
    camera.left = f.left;
    camera.right = f.right;
    camera.top = f.top;
    camera.bottom = f.bottom;
    camera.zoom = 1;
    camera.updateProjectionMatrix();
  }, [camera, world]);
  return null;
}

/** Component rỗng đặt trong Suspense: chỉ gắn vào khi mọi model phía trên đã tải xong. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

type GroupProps = Omit<ThreeElements['group'], 'id' | 'position'>;

export interface Actor25DProps extends GroupProps {
  /** Vị trí chân trong khung (đơn vị thế giới): x sang phải, y là độ cao của chân (âm là dưới tâm khung) */
  x: number;
  y: number;
  /** Lớp của nhân vật (mặc định 'actors'); hai nhân vật khác lớp thì cách nhau ≥ 1 đơn vị trên Z */
  layer?: LayerName;
  /** Chiều cao nhân vật trên màn hình (đơn vị thế giới; khung cao 9). Mặc định 3,6. */
  height?: number;
  /** Quay mặt về phía nào (mặc định nhìn thẳng ra người chơi) */
  facing?: 'front' | 'left' | 'right';
  children?: ReactNode;
}

const FACING_YAW = { front: 0, left: -Math.PI / 2, right: Math.PI / 2 } as const;

/**
 * Chỗ đứng của một nhân vật 3D trong Scene25D: đặt `<Character id=... />` làm con. Phóng theo `height` (nhân vật gốc cao 1,7), chân ở y, quay mặt ra người chơi.
 */
export function Actor25D({ x, y, layer = 'actors', height = 3.6, facing = 'front', children, ...rest }: Actor25DProps) {
  const k = height / 1.7;
  return (
    <group {...rest} position={[x, y, layerZ(layer)]} rotation-y={FACING_YAW[facing]} scale={k}>
      {children}
    </group>
  );
}

/** Lời nhắc xoay ngang phủ kín (điện thoại xoay dọc, cảnh chỉ chơi ngang). */
function RotatePrompt() {
  return (
    <div role="alert" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-giay p-6 text-center">
      <svg aria-hidden="true" viewBox="0 0 64 64" className="size-20 animate-pulse text-nau-go">
        <rect x="22" y="6" width="20" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M12 46h40m0 0-8-8m8 8-8 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="font-display text-2xl font-extrabold">{ui.canh25d.xoayNgang}</p>
      <p className="max-w-xs text-nau-go-dam">{ui.canh25d.xoayGoiY}</p>
    </div>
  );
}

/** Đo kích thước phần tử (ResizeObserver, có đo ngay lúc gắn). */
function useElementSize(): [React.RefObject<HTMLDivElement | null>, Size] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize((s) => (s.width === el.clientWidth && s.height === el.clientHeight ? s : { width: el.clientWidth, height: el.clientHeight }));
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

function Scene25DInner({ background, sprites = [], children, overlay, allowPortrait = false, quality, autoDowngrade = true, onReady, onQualityLowered, onModeChange, className = '' }: Scene25DProps) {
  const { level } = useQuality(quality);
  const [hostRef, host] = useElementSize();
  const mode = frameMode(host, allowPortrait);
  const world = useMemo(() => worldSize(mode), [mode]);
  const frame = fitFrame(host, aspectOf(mode));
  const [antialias] = useState(level !== 'low');
  const dpr = effectiveDpr(level, typeof window === 'undefined' ? 1 : window.devicePixelRatio);
  const [sceneReady, setSceneReady] = useState(false);
  const spriteKey = sprites.map((s) => s.asset).join('|');
  const paths = useMemo(() => [background, ...(spriteKey === '' ? [] : spriteKey.split('|'))], [background, spriteKey]);
  const textures = useSceneTextures(paths);
  const ready = sceneReady && textures.done;
  const notified = useRef(false);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);
  useEffect(() => {
    if (ready && !notified.current) {
      notified.current = true;
      onReady?.();
    }
  }, [ready, onReady]);

  const markReady = useCallback(() => setSceneReady(true), []);
  const handleLow = useCallback(
    (fps: number) => {
      onQualityLowered?.(fps, lowerSessionCap(level));
    },
    [level, onQualityLowered],
  );

  return (
    <div ref={hostRef} className={`relative size-full overflow-hidden bg-black ${className}`} data-testid="scene25d" data-mode={mode}>
      {frame.width > 0 && (
        <div className="absolute overflow-hidden" style={{ left: frame.left, top: frame.top, width: frame.width, height: frame.height }} data-testid="scene25d-frame">
          <Canvas
            dpr={dpr}
            orthographic
            gl={{ antialias, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, CAMERA_Z], near: CAMERA_NEAR, far: CAMERA_FAR, manual: true, left: -8, right: 8, top: 4.5, bottom: -4.5 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <QualityContext.Provider value={level}>
              <FrustumSync world={world} />
              <hemisphereLight args={['#fff4dc', '#8a6a4a', 1.6]} />
              <directionalLight position={[4, 8, 10]} intensity={2.4} />
              <Suspense fallback={null}>
                <Backdrop texture={textures.get(background)} world={world} />
                {sprites.map((s) => (
                  <SpriteMesh key={s.key} sprite={s} texture={textures.get(s.asset)} />
                ))}
                {children}
                <ReadySignal onReady={markReady} />
                {autoDowngrade && !quality && level !== 'low' && <FpsGuard key={level} onLow={handleLow} />}
                <StatsProbe />
                <SceneWarmup key={`${level}-${textures.done}`} />
              </Suspense>
            </QualityContext.Provider>
          </Canvas>
          <div className="absolute inset-0" style={{ pointerEvents: ready ? 'auto' : 'none' }}>
            {overlay}
          </div>
        </div>
      )}
      <LoadingScreen visible={!ready} />
      {mode === 'rotate' && <RotatePrompt />}
    </div>
  );
}

/**
 * Cảnh 2.5D (spec 03 mục 0, loại C): R3F với camera trực giao; ảnh nền phủ kín khung kiểu `cover`, hình rời 2D sắp lớp theo trục Z, nhân vật vẫn là model 3D có ánh sáng riêng
 * (hemisphere và directional), bảng điểm/nút/câu hỏi là HTML phủ lên (`overlay`). Khung 16:9 co giãn theo phần tử cha (dải đen hai bên hoặc trên dưới); điện thoại xoay dọc thì hiện
 * "Xoay ngang để chơi" (riêng cảnh có `allowPortrait`, màn 12, dùng khung dọc 9:16). Ảnh được nạp trước cùng model trước khi tắt màn hình tải (thiếu ảnh thì hiện ô màu thay thế,
 * không lỗi trang), có lớp chặn lỗi 3D, và giải phóng texture khi rời cảnh.
 *
 * Nằm trong chunk riêng (kéo three): chỉ import ở trang 3D, qua React.lazy / import().
 */
export function Scene25D(props: Scene25DProps) {
  return (
    <CanvasErrorBoundary covers={props.errorCovers}>
      <Scene25DInner {...props} />
    </CanvasErrorBoundary>
  );
}
