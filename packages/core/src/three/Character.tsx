import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
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
import { PoseLayer } from './PoseLayer';
import { isPoseAllowed, type Aim, type PoseName } from './poses';
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
  /** Thời gian (giây) của đoạn clip jump đã cắt khi phát ở tốc độ 1; null nếu chưa có clip đó */
  jumpSeconds: number | null;
}

/** Yêu cầu phát một tư thế; đổi `n` để phát lại. */
export interface PoseRequest {
  name: PoseName;
  n: number;
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
  /** Hệ số tốc độ phát của clip đang chạy (mặc định 1): ví dụ cho nhịp bước khớp tốc độ đi (xem `locomotionTimeScale`) */
  timeScale?: number;
  /** Báo khi một clip phát một lần đã xong */
  onClipEnd?: (clip: ClipName) => void;
  /**
   * Tư thế code dựng (sad, slide, swing, hurt) trộn lên trên clip đang chạy, vào ra mượt 0,1 giây. Đổi `n` để phát lại.
   * `hurt` chỉ có tác dụng với Tí.
   */
  pose?: PoseRequest;
  /**
   * Hướng nhìn/chỉ về một đáp án (radian, xem `aimFromRects`): nhân vật quay đầu và người về phía đó kèm tư thế point.
   * null hoặc bỏ trống thì thả.
   */
  aim?: Aim | null;

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
  timeScale = 1,
  onClipEnd,
  pose,
  aim,
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
          outer={outer}
          motion={motion}
          facing={facing}
          animation={animation}
          trigger={trigger}
          returnTo={returnTo}
          clips={clips}
          clipConfig={clipConfig}
          fade={fade}
          timeScale={timeScale}
          onClipEnd={onClipEnd}
          pose={pose}
          aim={aim}
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
  outer: RefObject<Group | null>;
  motion: RefObject<Group | null>;
  facing: number;
  animation: ClipName;
  trigger?: number;
  returnTo: ClipName;
  clips: readonly ClipName[];
  clipConfig: ClipConfigTable;
  fade: number;
  timeScale: number;
  pose?: PoseRequest;
  aim?: Aim | null;
  onClipEnd?: (clip: ClipName) => void;
  onReady?: (info: CharacterInfo) => void;
}

/** Mixer, hành động và lớp tư thế của một nhân vật, tạo trong effect (không phải trong render). */
interface Rig {
  mixer: AnimationMixer;
  actions: Partial<Record<ClipName, AnimationAction>>;
  layer: PoseLayer;
}

/** Không vẽ gì; điều khiển AnimationMixer và lớp tư thế của nhân vật có xương. */
function RigAnimator({ id, scene, animations, fit, height, outer, motion, facing, animation, trigger, returnTo, clips, clipConfig, fade, timeScale, pose, aim, onClipEnd, onReady }: RigAnimatorProps) {
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

  // Mixer tạo trong effect, dọn trong cleanup: dừng mọi hành động rồi uncacheRoot. Mỗi lần effect chạy (kể cả lần gắn lại
  // của StrictMode) tạo mixer và hành động mới nên không bao giờ dùng lại hành động đã gỡ (lỗi _cacheIndex).
  const rigRef = useRef<Rig | null>(null);
  const [rig, setRig] = useState<Rig | null>(null);
  useEffect(() => {
    const mixer = new AnimationMixer(scene);
    const actions: Partial<Record<ClipName, AnimationAction>> = {};
    for (const c of CLIP_NAMES) {
      const p = playable[c];
      if (p) actions[c] = mixer.clipAction(p.clip);
    }
    const created: Rig = { mixer, actions, layer: new PoseLayer(scene, outer.current ?? scene, motion.current ?? scene, facing, fit.scale) };
    rigRef.current = created;
    setRig(created);
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      if (rigRef.current === created) rigRef.current = null;
      setRig((r) => (r === created ? null : r));
    };
  }, [scene, playable, outer, motion, facing, fit.scale]);

  const current = useRef<{ name: ClipName; action: AnimationAction } | null>(null);
  const scale = useRef(timeScale);
  scale.current = timeScale;
  const play = useCallback(
    (name: ClipName) => {
      const next = rig?.actions[name];
      const p = playable[name];
      if (!rig || !next || !p) return;
      next.reset();
      next.enabled = true;
      next.setEffectiveTimeScale(scale.current);
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
    [rig, playable, fade],
  );

  // Clip một lần xong thì báo và chuyển về `returnTo`.
  const callbacks = useRef({ onClipEnd, returnTo });
  callbacks.current = { onClipEnd, returnTo };
  useEffect(() => {
    if (!rig) return;
    const mixer = rig.mixer;
    const onFinished = (e: { action: AnimationAction }) => {
      const cur = current.current;
      if (!cur || e.action !== cur.action) return;
      callbacks.current.onClipEnd?.(cur.name);
      if (callbacks.current.returnTo !== cur.name) play(callbacks.current.returnTo);
    };
    mixer.addEventListener('finished', onFinished as never);
    return () => mixer.removeEventListener('finished', onFinished as never);
  }, [rig, play]);

  useEffect(() => {
    play(animation);
  }, [animation, trigger, play]);
  useEffect(() => {
    current.current?.action.setEffectiveTimeScale(timeScale);
  }, [timeScale]);

  // Tư thế code dựng: phát khi `pose.n` đổi (chỉ tư thế được phép với model này); hướng nhìn/chỉ theo `aim`.
  useEffect(() => {
    if (rig && pose && isPoseAllowed(id, pose.name)) rig.layer.play(pose.name);
  }, [rig, pose?.name, pose?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    rig?.layer.setAim(aim ?? null);
  }, [rig, aim?.az, aim?.el, aim === null || aim === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, dt) => {
    const r = rigRef.current;
    if (!r) return;
    r.layer.restore(); // trả các xương đã chỉnh về giá trị gốc, rồi mới cho mixer chạy
    r.mixer.update(dt);
    r.layer.update(state.clock.elapsedTime, dt);
  });

  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    const speed = (c: ClipName) => {
      const src = source(c);
      return src ? rootSpeed(src) * fit.scale : null;
    };
    ready.current?.({ rigged: true, height, walkSpeed: speed('walk'), runSpeed: speed('run'), jumpSeconds: playable.jump?.clip.duration ?? null });
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
    ready.current?.({ rigged: false, height, walkSpeed: null, runSpeed: null, jumpSeconds: null });
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

