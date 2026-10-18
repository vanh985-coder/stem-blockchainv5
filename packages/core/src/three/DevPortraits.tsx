import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { ACESFilmicToneMapping, Box3, type Group, type PerspectiveCamera } from 'three';
import { Bi } from './Bi';
import { BI_SIZE } from './biMotion';
import { Character } from './Character';
import { CHARACTER_HEIGHT } from './modelSizes';
import { PORTRAIT_ITEMS, PORTRAIT_PX, portraitCamera, type PortraitCamera as Cam, type PortraitItem } from './portraitFrame';

/** Bi là khối nhỏ: lấy cả khối (share = 1) với viền rộng; nâng lên để tâm khối ở giữa khung. */
const BI_HEIGHT = BI_SIZE * 1.2;

function cameraFor(item: PortraitItem) {
  return item.model === 'bi' ? portraitCamera(BI_HEIGHT, { share: 1, pad: 1.9, yawDeg: 20, pitchDeg: 6 }) : portraitCamera(CHARACTER_HEIGHT, { share: item.share });
}

/**
 * Đặt camera chụp theo mục đang chọn. Nhân vật có xương đứng ở tư thế idle (lưng hơi còng, đầu lệch) nên khối bao lúc chưa phát clip không còn đúng:
 * `fitRef.current()` đo lại khối bao thật của tư thế đang đứng rồi đặt lại camera (gọi một lần sau khi model đã dựng, không chạy mỗi khung hình).
 */
function PortraitRig({ item, holder, fitRef }: { item: PortraitItem; holder: RefObject<Group | null>; fitRef: MutableRefObject<() => void> }) {
  const camera = useThree((st) => st.camera) as PerspectiveCamera;
  useEffect(() => {
    const apply = (c: Cam) => {
      camera.fov = c.fov;
      camera.near = 0.05;
      camera.far = 20;
      camera.position.set(...c.position);
      camera.lookAt(...c.target);
      camera.updateProjectionMatrix();
    };
    apply(cameraFor(item));
    fitRef.current = () => {
      const obj = holder.current;
      if (!obj || item.model === 'bi') return;
      obj.updateMatrixWorld(true);
      const box = new Box3().setFromObject(obj, true);
      if (box.isEmpty()) return;
      if (import.meta.env.DEV) (window as unknown as { __portraitBox?: unknown }).__portraitBox = { item: item.name, min: box.min.toArray(), max: box.max.toArray() };
      apply(portraitCamera(box.max.y, { share: item.share, base: box.min.y, center: [(box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2] }));
    };
  }, [camera, item, holder, fitRef]);
  return null;
}

/** Ánh sáng chụp: ánh sáng chính từ phía trước bên trái, bù sáng mềm, không đổ bóng (nền trong suốt). */
function PortraitLights() {
  return (
    <>
      <hemisphereLight args={['#FFF6E5', '#B9A98F', 1.1]} />
      <directionalLight position={[-2.5, 3.5, 4]} intensity={2.4} color="#FFF3DD" />
      <directionalLight position={[3, 1.5, 2]} intensity={0.7} color="#DCE9FF" />
    </>
  );
}

interface Capture {
  name: string;
  /** Ảnh PNG dạng data URL */
  dataUrl: string;
}

interface DevApi {
  names: string[];
  /** Chọn một mục, trả về khi model đã dựng xong và vẽ được vài khung hình */
  select: (name: string) => Promise<void>;
  /** Chụp mục đang chọn (PNG 512×512, nền trong suốt) dạng data URL */
  capture: () => string;
}

/**
 * /dev/portraits (spec 03 mục 3.6): chụp đầu và vai của 10 nhân vật và Bi từ model 3D thành PNG 512×512 nền trong suốt.
 * Cách làm: bấm "Tai tat ca" (hoặc từng ảnh), chép các file vào `assets/ui/portraits/`, chạy lại `pnpm assets:build`. Lúc chơi chỉ đọc ảnh có sẵn.
 */
export function DevPortraits() {
  const [index, setIndex] = useState(0);
  const item = PORTRAIT_ITEMS[index] as PortraitItem;
  const state = useRef({ name: item.name, ready: false });
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);
  const holder = useRef<Group>(null);
  const fitRef = useRef<() => void>(() => {});

  const markReady = useCallback(() => {
    state.current.ready = true;
    setReady(true);
  }, []);

  const select = useCallback(async (name: string) => {
    const i = PORTRAIT_ITEMS.findIndex((p) => p.name === name);
    if (i < 0) throw new Error(`khong co ${name}`);
    state.current = { name, ready: false };
    setReady(false);
    setIndex(i);
    const t0 = performance.now();
    while (!(state.current.name === name && state.current.ready)) {
      if (performance.now() - t0 > 30000) throw new Error(`model ${name} khong tai xong`);
      await new Promise((r) => setTimeout(r, 40));
    }
    const frames = async (n: number) => {
      for (let k = 0; k < n; k++) await new Promise((r) => requestAnimationFrame(() => r(null)));
    };
    await frames(10);
    fitRef.current();
    await frames(4);
  }, []);

  const capture = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('chua co khung ve');
    return canvas.toDataURL('image/png');
  }, []);

  const download = useCallback((c: Capture) => {
    const a = document.createElement('a');
    a.href = c.dataUrl;
    a.download = `${c.name}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const downloadOne = useCallback(
    async (name: string) => {
      await select(name);
      download({ name, dataUrl: capture() });
    },
    [capture, download, select],
  );

  const downloadAll = useCallback(async () => {
    setBusy(true);
    try {
      for (const p of PORTRAIT_ITEMS) {
        await downloadOne(p.name);
        await new Promise((r) => setTimeout(r, 250));
      }
    } finally {
      setBusy(false);
    }
  }, [downloadOne]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const api: DevApi = { names: PORTRAIT_ITEMS.map((p) => p.name), select, capture };
    (window as unknown as { __portraits?: DevApi }).__portraits = api;
    return () => {
      delete (window as unknown as { __portraits?: DevApi }).__portraits;
    };
  }, [select, capture]);

  // Bi không có model để chờ tải: báo sẵn sàng ngay khi dựng xong
  useEffect(() => {
    if (item.model === 'bi') markReady();
  }, [item, markReady]);

  const camera = useMemo(() => cameraFor(PORTRAIT_ITEMS[0] as PortraitItem), []);

  return (
    <div className="min-h-screen bg-giay p-4 text-nau-go" data-testid="dev-portraits">
      <h1 className="text-xl font-bold">/dev/portraits</h1>
      <p className="mb-3 text-sm">
        Chup dau va vai tu model 3D (khung 35% phia tren, goc 3/4, nen trong suot, {PORTRAIT_PX}x{PORTRAIT_PX}). Bam &quot;Tai tat ca&quot;, chep cac file vao assets/ui/portraits/ roi chay lai pnpm assets:build.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {PORTRAIT_ITEMS.map((p, i) => (
          <button
            key={p.name}
            type="button"
            className={`rounded-lg border-2 border-nau-go px-3 py-1 text-sm ${i === index ? 'bg-vang font-bold' : 'bg-white'}`}
            onClick={() => void select(p.name)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="mb-3 flex gap-2">
        <button type="button" disabled={busy} className="rounded-lg border-2 border-nau-go bg-vang px-3 py-1 font-bold disabled:opacity-50" onClick={() => void downloadAll()}>
          Tai tat ca
        </button>
        <button type="button" disabled={busy || !ready} className="rounded-lg border-2 border-nau-go bg-white px-3 py-1 disabled:opacity-50" onClick={() => void downloadOne(item.name)}>
          Tai {item.name}.png
        </button>
        <span className="self-center text-sm">{ready ? 'san sang' : 'dang tai model...'}</span>
      </div>
      {/* Ô vuông caro để thấy nền trong suốt */}
      <div
        className="inline-block border-2 border-nau-go"
        style={{ width: PORTRAIT_PX, height: PORTRAIT_PX, backgroundImage: 'conic-gradient(#d9d9d9 25%, #ffffff 0 50%, #d9d9d9 0 75%, #ffffff 0)', backgroundSize: '24px 24px' }}
      >
        <Canvas
          dpr={1}
          style={{ width: PORTRAIT_PX, height: PORTRAIT_PX }}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping }}
          camera={{ position: camera.position, fov: camera.fov, near: 0.05, far: 20 }}
          onCreated={({ gl }) => {
            canvasRef.current = gl.domElement;
            gl.setClearColor(0x000000, 0);
          }}
        >
          <PortraitRig item={item} holder={holder} fitRef={fitRef} />
          <PortraitLights />
          <Suspense fallback={null}>
            {item.model === 'bi' ? (
              <Bi key={item.name} position={[0, BI_HEIGHT / 2, 0]} seed={3} />
            ) : (
              <group ref={holder}>
              <Character key={item.name} id={item.model} clips={['idle']} animation="idle" mood={item.mood ?? 'idle'} lookAt={item.mood === 'talking' ? [1.2, 1.5, 3] : undefined} seed={5} castShadow={false} onReady={markReady} />
              </group>
            )}
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
