import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { AnimationMixer, Box3, LoopOnce, LoopRepeat, type AnimationAction, type AnimationClip, type Group, type Object3D } from 'three';
import { createMulberry32 } from '../lib/rng';
import { BlobShadow } from './BlobShadow';
import { useModel } from './Model';
import { CLIP_CONFIG, type ClipConfigTable } from './clipConfig';
import { buildPlayableClip, rootSpeed, type PlayableClip } from './clipPlayback';
import { CLIP_NAMES, borrowClips, type ClipName } from './clips';
import { useQualityLevel } from './QualityContext';
import { CHARACTER_HEIGHT, fitToHeight, sizeOf, type Fit } from './modelSizes';
import { readModel, releaseModel, retainModel } from './modelLoader';
import { createStaticPose, phaseFrom, staticPose, turnToward, yawTowards, type Mood } from './staticMotion';
import { useShadowFlags } from './useShadowFlags';

type GroupProps = Omit<ThreeElements['group'], 'id'>;

/** Thông tin báo ra khi nhân vật đã sẵn sàng. */
export interface CharacterInfo {
  /** Có xương (4 nhân vật) hay đứng yên (6 nhân vật) */
  rigged: boolean;
  /** Chiều cao trong cảnh (đơn vị) */
  height: number;
  /**
   * Tốc độ tiến (đơn vị/giây trong cảnh) mà clip walk/run ngầm có, đã tính theo cỡ nhân vật; null nếu chưa có clip đó.
   * Cho nhân vật đi đúng tốc độ này thì chân không trượt.
   */
  walkSpeed: number | null;
  runSpeed: number | null;
}

export interface CharacterProps extends GroupProps {
  /** Đường dẫn trong models/, ví dụ "characters/hoc-sinh-nam" */
  id: string;

  // --- Nhân vật có xương ---
  /** Clip đang phát (mặc định idle) */
  animation?: ClipName;
  /** Đổi giá trị này để phát lại cùng một clip (ví dụ nhảy liên tiếp) */
  trigger?: number;
  /** Clip phát một lần (jump, cheer) xong thì chuyển sang clip này (mặc định idle) */
  returnTo?: ClipName;
  /** Các clip cần dùng. Thiếu clip nào thì mượn của model khác; chỉ nên liệt kê clip thật sự cần để khỏi tải thừa. */
  clips?: readonly ClipName[];
  /** Đoạn phát từng clip (mặc định `CLIP_CONFIG`) */
  clipConfig?: ClipConfigTable;
  /** Thời gian chuyển mượt giữa hai clip (giây, mặc định 0,2) */
  fade?: number;
  /** Báo khi một clip phát một lần đã xong */
  onClipEnd?: (clip: ClipName) => void;

  // --- Nhân vật đứng yên ---
  /** "talking": nghiêng đầu và quay mặt về `lookAt` */
  mood?: Mood;
  /** Đổi giá trị này để bật lên hai lần (vui) */
  happyTrigger?: number;
  /** Điểm (x, y, z) trong hệ tọa độ của cha, thường là người chơi, để quay mặt về khi đang nói */
  lookAt?: readonly [number, number, number];
  /** Hạt giống cho pha lệch ngẫu nhiên (mặc định ngẫu nhiên mỗi lần dựng) */
  seed?: number;

  /** Đổ bóng bằng bản đồ bóng ở mức Vừa và Cao (mặc định bật) */
  castShadow?: boolean;
  onReady?: (info: CharacterInfo) => void;
}

/** Đo khung bao (chính xác, có tính xương ở tư thế gốc) rồi tính phóng và dịch để cao đúng và chân ở y = 0. */
function measureFit(scene: Object3D, height: number): Fit {
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene, true);
  return fitToHeight(box.min.y, box.max.y, height);
}

function hasSkinnedMesh(scene: Object3D): boolean {
  let found = false;
  scene.traverse((o) => {
    if ((o as { isSkinnedMesh?: boolean }).isSkinnedMesh) found = true;
  });
  return found;
}

const ALL_CLIPS: readonly ClipName[] = CLIP_NAMES;

/**
 * Nhân vật (spec 03 mục 3): cao 1,7, chân ở y = 0, mặt quay +Z (nhân bản bằng useModel).
 * - Có xương (học sinh, Tí, bà cụ, nông dân): phát clip theo từ khóa, khóa chuyển động gốc, mượn clip của model khác,
 *   chuyển mượt 0,2 giây, phát đoạn clip theo `CLIP_CONFIG`.
 * - Đứng yên (6 người còn lại): nhún, lắc, nghiêng khi nói, bật lên khi vui, lệch pha ngẫu nhiên.
 * Vệt bóng tròn dưới chân ở mức Thấp; bóng thật ở mức Vừa và Cao. Dùng trong <Scene3D>.
 */
export function Character({
  id,
  animation = 'idle',
  trigger,
  returnTo = 'idle',
  clips = ALL_CLIPS,
  clipConfig = CLIP_CONFIG,
  fade = 0.2,
  onClipEnd,
  mood = 'idle',
  happyTrigger,
  lookAt,
  seed,
  castShadow = true,
  onReady,
  ...group
}: CharacterProps) {
  const { scene, animations } = useModel(id);
  const level = useQualityLevel();
  const size = sizeOf(id);
  const height = size?.height ?? CHARACTER_HEIGHT;
  const facing = size?.facingYaw ?? 0;
  const fit = useMemo(() => measureFit(scene, height), [scene, height]);
  const rigged = useMemo(() => hasSkinnedMesh(scene), [scene]);
  const outer = useRef<Group>(null);
  const motion = useRef<Group>(null);
  useShadowFlags(scene, castShadow && level !== 'low', castShadow && level !== 'low');

  return (
    <group ref={outer} {...group}>
      <BlobShadow radius={height * 0.3} />
      <group ref={motion} rotation-y={facing}>
        <group scale={fit.scale} position-y={fit.offsetY}>
          <primitive object={scene} />
        </group>
      </group>
      {rigged ? (
        <RigAnimator
          id={id}
          scene={scene}
          animations={animations}
          fit={fit}
          height={height}
          animation={animation}
          trigger={trigger}
          returnTo={returnTo}
          clips={clips}
          clipConfig={clipConfig}
          fade={fade}
          onClipEnd={onClipEnd}
          onReady={onReady}
        />
      ) : (
        <StaticMotion motion={motion} outer={outer} facing={facing} height={height} mood={mood} happyTrigger={happyTrigger} lookAt={lookAt} seed={seed} onReady={onReady} />
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Nhân vật có xương

interface RigAnimatorProps {
  id: string;
  scene: Object3D;
  animations: AnimationClip[];
  fit: Fit;
  height: number;
  animation: ClipName;
  trigger?: number;
  returnTo: ClipName;
  clips: readonly ClipName[];
  clipConfig: ClipConfigTable;
  fade: number;
  onClipEnd?: (clip: ClipName) => void;
  onReady?: (info: CharacterInfo) => void;
}

/** Không vẽ gì; điều khiển AnimationMixer của nhân vật có xương. */
function RigAnimator({ id, scene, animations, fit, height, animation, trigger, returnTo, clips, clipConfig, fade, onClipEnd, onReady }: RigAnimatorProps) {
  // Mượn clip của model khác nếu thiếu. Hỏi tên clip của model cho mượn một cách lười: chỉ tải khi thật sự cần.
  const ownNames = animations.map((a) => a.name);
  const sources = borrowClips(id, (mid) => (mid === id ? ownNames : readModel(mid).animations.map((a) => a.name)), clips);
  const sourceKey = CLIP_NAMES.map((c) => (sources[c] ? `${sources[c].model}|${sources[c].name}` : '-')).join(',');
  const donors = useMemo(() => [...new Set(Object.values(sources).map((s) => s.model).filter((m) => m !== id))], [sourceKey, id]);
  useEffect(() => {
    donors.forEach(retainModel);
    return () => donors.forEach(releaseModel);
  }, [donors]);

  const source = (c: ClipName): AnimationClip | undefined => {
    const s = sources[c];
    if (!s) return undefined;
    return (s.model === id ? animations : readModel(s.model).animations).find((a) => a.name === s.name);
  };

  const playable = useMemo(() => {
    const out: Partial<Record<ClipName, PlayableClip>> = {};
    for (const c of CLIP_NAMES) {
      const src = source(c);
      if (src) out[c] = buildPlayableClip(src, c, clipConfig[c]);
    }
    return out;
  }, [sourceKey, clipConfig, animations]);

  const mixer = useMemo(() => new AnimationMixer(scene), [scene]);

  const actions = useMemo(() => {
    const out: Partial<Record<ClipName, AnimationAction>> = {};
    for (const c of CLIP_NAMES) {
      const p = playable[c];
      if (p) out[c] = mixer.clipAction(p.clip);
    }
    return out;
  }, [mixer, playable]);
  // Chỉ dừng các hành động khi gỡ, không "uncache": StrictMode (và đổi cấu hình ở /dev/3d) gắn lại effect với đúng các
  // action cũ, mà action đã uncache thì không dùng lại được (lỗi _cacheIndex). Mixer và bản nhân bản cùng bị thu gom.
  useEffect(
    () => () => {
      mixer.stopAllAction();
    },
    [mixer, playable],
  );

  const current = useRef<{ name: ClipName; action: AnimationAction } | null>(null);
  const play = useCallback(
    (name: ClipName) => {
      const next = actions[name];
      const p = playable[name];
      if (!next || !p) return;
      next.reset();
      next.enabled = true;
      next.setEffectiveTimeScale(1);
      next.setEffectiveWeight(1);
      if (p.loop) {
        next.setLoop(LoopRepeat, Infinity);
        next.clampWhenFinished = false;
      } else {
        next.setLoop(LoopOnce, 1);
        next.clampWhenFinished = true;
      }
      next.play();
      const prev = current.current?.action;
      if (prev && prev !== next) prev.crossFadeTo(next, fade, false);
      current.current = { name, action: next };
    },
    [actions, playable, fade],
  );

  // Clip một lần xong thì báo và chuyển về `returnTo`.
  const callbacks = useRef({ onClipEnd, returnTo });
  callbacks.current = { onClipEnd, returnTo };
  useEffect(() => {
    const onFinished = (e: { action: AnimationAction }) => {
      const cur = current.current;
      if (!cur || e.action !== cur.action) return;
      callbacks.current.onClipEnd?.(cur.name);
      if (callbacks.current.returnTo !== cur.name) play(callbacks.current.returnTo);
    };
    mixer.addEventListener('finished', onFinished as never);
    return () => mixer.removeEventListener('finished', onFinished as never);
  }, [mixer, play]);

  useEffect(() => {
    play(animation);
  }, [animation, trigger, play]);

  useFrame((_, dt) => {
    mixer.update(dt);
  });

  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    const speed = (c: ClipName) => {
      const src = source(c);
      return src ? rootSpeed(src) * fit.scale : null;
    };
    ready.current?.({ rigged: true, height, walkSpeed: speed('walk'), runSpeed: speed('run') });
  }, [sourceKey, fit.scale, height, animations]);

  return null;
}

// ---------------------------------------------------------------------------
// Nhân vật đứng yên

interface StaticMotionProps {
  motion: RefObject<Group | null>;
  outer: RefObject<Group | null>;
  facing: number;
  height: number;
  mood: Mood;
  happyTrigger?: number;
  lookAt?: readonly [number, number, number];
  seed?: number;
  onReady?: (info: CharacterInfo) => void;
}

/** Tốc độ quay mặt về phía người chơi (radian/giây). */
const LOOK_TURN_RATE = 3;

/** Không vẽ gì; làm nhún, lắc, nghiêng, bật lên cho nhân vật không có xương (spec 03 mục 3.4). */
function StaticMotion({ motion, outer, facing, height, mood, happyTrigger, lookAt, seed, onReady }: StaticMotionProps) {
  const phase = useMemo(() => phaseFrom(createMulberry32(seed ?? Math.floor(Math.random() * 2 ** 31))()), [seed]);
  const pose = useMemo(createStaticPose, []);
  const st = useRef({ yaw: facing, targetYaw: facing, happyAt: -1, pendingHappy: false });

  useEffect(() => {
    if (happyTrigger !== undefined) st.current.pendingHappy = true;
  }, [happyTrigger]);

  useEffect(() => {
    const o = outer.current;
    if (!o || !lookAt) return;
    st.current.targetYaw = facing + yawTowards(o.position.x, o.position.z, lookAt[0], lookAt[2]) - o.rotation.y;
  }, [lookAt, outer, facing]);

  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    ready.current?.({ rigged: false, height, walkSpeed: null, runSpeed: null });
  }, [height]);

  useFrame((state, dt) => {
    const m = motion.current;
    if (!m) return;
    const s = st.current;
    const t = state.clock.elapsedTime;
    if (s.pendingHappy) {
      s.pendingHappy = false;
      s.happyAt = t;
    }
    if (mood === 'talking' && lookAt) s.yaw = turnToward(s.yaw, s.targetYaw, LOOK_TURN_RATE * dt);
    staticPose(pose, t, phase, mood, s.happyAt < 0 ? -1 : t - s.happyAt);
    m.rotation.y = s.yaw;
    m.rotation.z = pose.rollZ;
    m.scale.y = pose.scaleY;
    m.position.y = pose.hopY;
  });
  return null;
}

