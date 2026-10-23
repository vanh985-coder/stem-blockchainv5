import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Box3, Vector3, type AnimationClip, type Group, type Object3D } from 'three';
import { createMulberry32 } from '../lib/rng';
import { BlobShadow } from './BlobShadow';
import { useModel } from './Model';
import { CLIP_CONFIG, type ClipConfigTable } from './clipConfig';
import { buildPlayableClip, rootSpeed, type PlayableClip } from './clipPlayback';
import { CharacterRig } from './characterRig';
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
  /**
   * Tư thế treo tay dựng bằng code (xem `HANG` trong poses.ts): hai tay giơ thẳng lên, đung đưa nhẹ quanh bàn tay. Giữ đến khi false. Hai bàn tay ở độ cao `HANG.handsRatio` × chiều cao
   * trên chân. Dùng cho màn 12 (clip `hang` trong file model sai).
   */
  hang?: boolean;
  /** Đung đưa khi treo (tắt khi "Giảm chuyển động"); mặc định bật */
  hangSway?: boolean;
  /**
   * Vật cầm ở tay phải (gắn vào xương `RightHand`), dựng bằng code theo đơn vị của nhân vật (cao 1,7; tay ở gốc, trục Y dọc bàn tay), ví dụ quạt nan của màn 5. Chiều gắn tự bù tỉ lệ của xương nên vật có cỡ
   * thật như đã dựng; gỡ ra khi đổi hay khi nhân vật bị dọn. Chỉ nhân vật có xương; người dùng tự giải phóng hình học và vật liệu của vật.
   */
  heldProp?: Object3D | null;

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

const fitCache = new WeakMap<Object3D, Map<number, Fit>>();

/**
 * Đo khung bao (chính xác, có tính xương ở tư thế gốc) rồi tính phóng và dịch để cao đúng và chân ở y = 0. Kết quả chỉ phụ thuộc bản model dùng chung và chiều cao nên nhớ lại: nhiều người cùng một model (dân làng)
 * không đo lại (mỗi lần đo xương chừng 20 ms, dựng 3 dân làng trong một khung hình từng gây khựng).
 */
function measureFit(scene: Object3D, height: number): Fit {
  let byHeight = fitCache.get(scene);
  if (!byHeight) fitCache.set(scene, (byHeight = new Map()));
  const known = byHeight.get(height);
  if (known) return known;
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene, true);
  const fit = fitToHeight(box.min.y, box.max.y, height);
  byHeight.set(height, fit);
  return fit;
}

function hasSkinnedMesh(scene: Object3D): boolean {
  let found = false;
  scene.traverse((o) => {
    if ((o as { isSkinnedMesh?: boolean }).isSkinnedMesh) found = true;
  });
  return found;
}

const ALL_CLIPS: readonly ClipName[] = CLIP_NAMES;
const HAND_SCALE = new Vector3();
const ROOT_SCALE = new Vector3();

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
  hang = false,
  hangSway = true,
  heldProp = null,
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
          hang={hang}
          hangSway={hangSway}
          heldProp={heldProp}
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
  hang: boolean;
  hangSway: boolean;
  heldProp: Object3D | null;
  onClipEnd?: (clip: ClipName) => void;
  onReady?: (info: CharacterInfo) => void;
}

/** Không vẽ gì; điều khiển AnimationMixer và lớp tư thế của nhân vật có xương. */
function RigAnimator({ id, scene, animations, fit, height, outer, motion, facing, animation, trigger, returnTo, clips, clipConfig, fade, timeScale, pose, aim, hang, hangSway, heldProp, onClipEnd, onReady }: RigAnimatorProps) {
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

  // Rig (mixer, hành động, lớp tư thế) do một bộ điều khiển thuần giữ (characterRig.ts), dựng trong effect và dọn trong cleanup. Mọi lệnh phát đều tra rig HIỆN TẠI
  // nên không bao giờ dùng hành động của mixer đã dọn (lỗi _cacheIndex làm sập Canvas khi model đổi giữa chừng). `version` tăng mỗi lần dựng lại để các effect bên dưới chạy lại.
  const host = useMemo(() => new CharacterRig<PoseLayer>(), []);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    host.build(scene, playable, () => new PoseLayer(scene, outer.current ?? scene, motion.current ?? scene, facing, fit.scale, height));
    setVersion((v) => v + 1);
    return () => host.dispose();
  }, [host, scene, playable, outer, motion, facing, fit.scale, height]);

  const scale = useRef(timeScale);
  scale.current = timeScale;
  const fadeRef = useRef(fade);
  fadeRef.current = fade;
  const playableRef = useRef(playable);
  playableRef.current = playable;

  // Clip một lần xong thì báo và chuyển về `returnTo`.
  const callbacks = useRef({ onClipEnd, returnTo });
  callbacks.current = { onClipEnd, returnTo };
  useEffect(() => {
    host.onClipEnd = (name) => {
      callbacks.current.onClipEnd?.(name);
      const back = callbacks.current.returnTo;
      if (back !== name) host.play(back, playableRef.current[back], scale.current, fadeRef.current);
    };
    return () => {
      host.onClipEnd = null;
    };
  }, [host]);

  useEffect(() => {
    host.play(animation, playable[animation], scale.current, fade);
  }, [host, version, animation, trigger, playable, fade]);
  useEffect(() => {
    host.setTimeScale(timeScale);
  }, [host, timeScale]);

  // Tư thế code dựng: phát khi `pose.n` đổi (chỉ tư thế được phép với model này); hướng nhìn/chỉ theo `aim`.
  useEffect(() => {
    if (pose && isPoseAllowed(id, pose.name)) host.layer?.play(pose.name);
  }, [host, version, pose?.name, pose?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    host.layer?.setAim(aim ?? null);
  }, [host, version, aim?.az, aim?.el, aim === null || aim === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    host.layer?.setHang(hang, hangSway);
  }, [host, version, hang, hangSway]);

  // Vật cầm ở tay phải: gắn vào xương RightHand, bù tỉ lệ của xương (xương Mixamo tính bằng cm, cả nhân vật còn phóng theo cỡ khung) để vật có cỡ như đã dựng
  useEffect(() => {
    const bone = heldProp ? (scene.getObjectByName('mixamorigRightHand') ?? scene.getObjectByName('mixamorig:RightHand')) : null;
    const root = outer.current;
    if (!heldProp || !bone || !root) return;
    root.updateWorldMatrix(true, true);
    bone.getWorldScale(HAND_SCALE);
    root.getWorldScale(ROOT_SCALE);
    heldProp.scale.setScalar(ROOT_SCALE.x / Math.max(1e-6, HAND_SCALE.x));
    bone.add(heldProp);
    return () => {
      bone.remove(heldProp);
    };
  }, [scene, heldProp, outer, version]);

  useFrame((state, dt) => host.update(state.clock.elapsedTime, dt));

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

