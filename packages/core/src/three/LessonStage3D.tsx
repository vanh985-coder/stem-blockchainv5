import { PerspectiveCamera, View } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { ForcedCrash, forcedCanvasCrash } from './ForcedCrash';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { shouldHideForFps, type FrameLayout } from '../lesson2d/frames';
import { Character } from './Character';
import { DayLight } from './DayLight';
import { FpsGuard } from './FpsGuard';
import { QualityContext } from './QualityContext';
import { type Reaction, choiceReactions } from './choiceReactions';
import { preloadModel, releaseModel, retainModel } from './modelLoader';
import { aimFromRects } from './poses';
import { effectiveDpr, type QualityLevel } from './quality';
import { useQuality } from './useQuality';
import { rectOf, useReaction } from './useReaction';

/** Hai nhân vật ở hai bên bảng bài học: học sinh bên trái, {phanDien} (Tí) bên phải (spec 03 mục 4). */
export const LESSON_STUDENT = 'characters/hoc-sinh-nam';
export const LESSON_RIVAL = 'characters/ti';
const CLIPS = ['idle', 'cheer'] as const;

export interface LessonStage3DProps {
  /** Cỡ và chỗ đặt của hai khung (ô trống hai bên bảng), xem `lessonFrameLayout` */
  layout: FrameLayout;
  /** Tải model lỗi hoặc dựng lỗi: nơi gọi ẩn khung */
  onFail: () => void;
  /** FPS dưới 30 trong 3 giây đầu: nơi gọi ẩn khung (và gỡ component này, giải phóng bộ nhớ) */
  onSlow: (fps: number) => void;
}

const pose = (r: Reaction) => (r.pose ? { name: r.pose, n: r.poseN } : undefined);

/** Tab đang hiện và ít nhất một khung còn trong màn hình: đang xem mới vẽ. */
function useActive(left: RefObject<HTMLElement | null>, right: RefObject<HTMLElement | null>): boolean {
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState === 'visible');
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const on = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  useEffect(() => {
    const els = [left.current, right.current].filter((e): e is HTMLElement => !!e);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target, e.isIntersecting);
      setInView([...seen.values()].some(Boolean));
    });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [left, right]);
  return tabVisible && inView;
}

/** Mặt phẳng trong suốt chỉ hiện bóng đổ của nhân vật (nền của khung trong suốt, không có sàn). */
function ShadowCatcher() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} receiveShadow>
      <planeGeometry args={[8, 8]} />
      <shadowMaterial transparent opacity={0.3} />
    </mesh>
  );
}

/** Một khung: camera, ánh sáng ban ngày và bóng, trong suốt. */
function FrameScene({ level, children }: { level: QualityLevel; children: ReactNode }) {
  return (
    <QualityContext.Provider value={level}>
      <PerspectiveCamera makeDefault position={[0, 1.0, 5.4]} fov={24} onUpdate={(c) => c.lookAt(0, 0.95, 0)} />
      <DayLight level={level} sunPosition={[2.5, 5, 4]} shadowExtent={3} />
      <ShadowCatcher />
      {children}
    </QualityContext.Provider>
  );
}

/**
 * Hai khung 3D ở trang bài học, vẽ bằng MỘT Canvas (một WebGL context) với drei `View`: mỗi nhân vật được vẽ vào ô trống
 * của nó (`left`, `right`, đo mỗi khung hình). Nền trong suốt. Nghe kho `choiceReactions`: học sinh quay đầu và người về
 * phía nút đang rê/focus kèm point; đúng thì học sinh cheer ({phanDien} giữ idle), sai thì học sinh sad và {phanDien} cheer.
 *
 * Chỉ được dựng sau khi cả hai model đã tải xong; tải lỗi thì gọi `onFail` (nơi gọi ẩn khung, không báo lỗi).
 * Ngừng vẽ khi tab bị ẩn hoặc cả hai khung ra khỏi màn hình. Gỡ component này thì Canvas và model được giải phóng.
 * Nằm trong chunk 3D: chỉ import qua `lazy(() => import(...))`.
 */
export default function LessonStage3D({ layout, onFail, onSlow }: LessonStage3DProps) {
  // Mỗi <View> tự render một <div> rồi theo dõi chính div đó (prop `track` bị bỏ qua khi View nằm ngoài Canvas): div là khung.
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const { level } = useQuality();
  const state = useReaction(choiceReactions);
  const active = useActive(left, right);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);
  const crash = useState(forcedCanvasCrash)[0];

  // Tải đúng 2 model; thiếu file hoặc lỗi (đang là hình thay thế) thì báo lỗi. Giữ model suốt thời gian khung tồn tại.
  useEffect(() => {
    let cancelled = false;
    const ids = [LESSON_STUDENT, LESSON_RIVAL];
    void Promise.all(ids.map((id) => preloadModel(id))).then(
      (models) => {
        if (cancelled) return;
        if (models.some((m) => m.placeholder)) {
          ids.forEach((id) => {
            retainModel(id);
            releaseModel(id); // không dùng nữa: để bộ nhớ đệm dọn
          });
          onFail();
        } else setReady(true);
      },
      () => !cancelled && onFail(),
    );
    return () => {
      cancelled = true;
    };
  }, [onFail]);

  // Hiện dần khi đã dựng xong khung hình đầu.
  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [ready]);

  // Hướng nhìn của học sinh: từ tâm khung bên trái tới nút đang rê/focus.
  const aim = useMemo(() => {
    const el = left.current;
    return el && state.target ? aimFromRects(rectOf(el), state.target) : null;
  }, [state.target, left]);

  if (!ready) return null;
  return (
    <>
      <View ref={left} data-lesson-frame="student" className="pointer-events-none fixed z-30" style={{ width: layout.width, height: layout.height, bottom: layout.bottom, left: layout.inset }}>
        <FrameScene level={level}>
          <Character id={LESSON_STUDENT} clips={CLIPS} animation={state.student.clip} trigger={state.student.clipN} pose={pose(state.student)} aim={aim} />
        </FrameScene>
      </View>
      <View ref={right} data-lesson-frame="rival" className="pointer-events-none fixed z-30" style={{ width: layout.width, height: layout.height, bottom: layout.bottom, right: layout.inset }}>
        <FrameScene level={level}>
          <Character id={LESSON_RIVAL} rotation={[0, -0.35, 0]} clips={CLIPS} animation={state.rival.clip} trigger={state.rival.clipN} pose={pose(state.rival)} />
        </FrameScene>
      </View>
      <div aria-hidden="true" className={`pointer-events-none fixed inset-0 z-30 transition-opacity duration-500 ${shown ? 'opacity-100' : 'opacity-0'}`}>
        <Canvas
          frameloop={active ? 'always' : 'never'}
          dpr={effectiveDpr(level, window.devicePixelRatio)}
          shadows="percentage"
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
          eventSource={document.body}
          style={{ pointerEvents: 'none' }}
        >
          {crash && <ForcedCrash />}
          <View.Port />
          {active && <FpsGuard isLow={shouldHideForFps} onLow={onSlow} />}
        </Canvas>
      </div>
    </>
  );
}
