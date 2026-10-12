/**
 * Tư thế code dựng cho nhân vật có xương Mixamo (spec 03 mục 3.3) và hướng nhìn/chỉ về đáp án (mục 4).
 * Hàm thuần, không import three. Mọi góc tính bằng độ (trừ chỗ ghi radian), trong **hệ tọa độ của nhân vật**:
 * +Y lên, +Z là hướng mặt, +X là bên trái nhân vật (nhân vật nhìn về +Z thì tay phải của họ ở phía -X).
 * Quay quanh +X một góc dương thì đỉnh đầu ngả về phía +Z (cúi tới trước); quanh +Y một góc dương thì mặt quay từ +Z về +X.
 *
 * Các tư thế chỉ là độ lệch cộng thêm lên clip đang chạy (xem PoseLayer), nên nhân bản đúng với mọi clip.
 */

export type PoseName = 'sad' | 'slide' | 'swing' | 'hurt';
export const POSE_NAMES: readonly PoseName[] = ['sad', 'slide', 'swing', 'hurt'];

/** Vào và ra mượt trong 0,1 giây. */
export const POSE_FADE = 0.1;
/** Thời lượng từng tư thế (giây), spec 03 mục 3.3. `point` không có thời lượng: giữ đến khi thả. */
export const POSE_DURATION: Readonly<Record<PoseName, number>> = { sad: 1, slide: 0.6, swing: 0.25, hurt: 0.6 };

/** Chỉ Tí có `hurt` (ôm mông). */
export function isPoseAllowed(modelId: string, pose: PoseName): boolean {
  return pose !== 'hurt' || modelId === 'characters/ti';
}

// ---------------------------------------------------------------------------
// Đường cong trọng số

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Trọng số (0 đến 1) của tư thế có thời lượng `duration`, `t` giây sau khi bắt đầu: vào trong `fade`, giữ, ra trong `fade`.
 * Tư thế ngắn hơn 2×fade thì không bao giờ đạt đủ 1 ở giữa (vào và ra gặp nhau). Ngoài [0, duration) thì 0.
 */
export function poseWeight(t: number, duration: number, fade: number = POSE_FADE): number {
  if (t < 0 || t >= duration) return 0;
  return clamp01(Math.min(t / fade, (duration - t) / fade));
}

/**
 * Trọng số của tư thế giữ cho tới khi thả (point). `sinceOn`: giây từ lúc bắt đầu giữ. `sinceOff`: giây từ lúc thả
 * (undefined nếu chưa thả). Thả giữa chừng lúc đang vào thì ra từ mức đã đạt, không nhảy.
 */
export function heldWeight(sinceOn: number, sinceOff: number | undefined, fade: number = POSE_FADE): number {
  if (sinceOn < 0) return 0;
  if (sinceOff === undefined) return clamp01(sinceOn / fade);
  const reached = clamp01((sinceOn - sinceOff) / fade);
  return clamp01(reached * (1 - sinceOff / fade));
}

// ---------------------------------------------------------------------------
// Xương và giới hạn khớp

/** Các xương mà tư thế được xoay. Tên xương Mixamo là `mixamorig` + tên ở `MIXAMO_BONE_NAME`. */
export const BONE_KEYS = [
  'hips',
  'spine',
  'spine1',
  'spine2',
  'neck',
  'head',
  'leftShoulder',
  'rightShoulder',
  'leftArm',
  'rightArm',
  'leftForeArm',
  'rightForeArm',
  'leftUpLeg',
  'rightUpLeg',
  'leftLeg',
  'rightLeg',
] as const;
export type BoneKey = (typeof BONE_KEYS)[number];

/** Xương chỉ để đo (hướng cẳng tay, chiều dài chân), không xoay. */
export type ReferenceBoneKey = 'rightHand' | 'leftFoot';

export const MIXAMO_BONE_NAME: Readonly<Record<BoneKey | ReferenceBoneKey, string>> = {
  hips: 'Hips',
  spine: 'Spine',
  spine1: 'Spine1',
  spine2: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  leftShoulder: 'LeftShoulder',
  rightShoulder: 'RightShoulder',
  leftArm: 'LeftArm',
  rightArm: 'RightArm',
  leftForeArm: 'LeftForeArm',
  rightForeArm: 'RightForeArm',
  leftUpLeg: 'LeftUpLeg',
  rightUpLeg: 'RightUpLeg',
  leftLeg: 'LeftLeg',
  rightLeg: 'RightLeg',
  rightHand: 'RightHand',
  leftFoot: 'LeftFoot',
};

export const boneIndex = (b: BoneKey): number => BONE_KEYS.indexOf(b);

type Range = readonly [number, number];
interface JointLimit {
  x: Range;
  y: Range;
  z: Range;
}

/**
 * Giới hạn góc (độ) của từng khớp để tay chân không gãy khi nhiều tư thế chồng nhau.
 * Khớp gối chỉ gập một chiều; khuỷu gập về phía trước (x âm) hoặc duỗi, riêng `hurt` cho tay ra sau nên cho x tới +90.
 */
export const JOINT_LIMITS: Readonly<Record<BoneKey, JointLimit>> = {
  hips: { x: [-45, 45], y: [-60, 60], z: [-30, 30] },
  spine: { x: [-50, 50], y: [-45, 45], z: [-30, 30] },
  spine1: { x: [-50, 50], y: [-45, 45], z: [-30, 30] },
  spine2: { x: [-50, 50], y: [-45, 45], z: [-30, 30] },
  neck: { x: [-40, 40], y: [-60, 60], z: [-30, 30] },
  head: { x: [-45, 50], y: [-80, 80], z: [-35, 35] },
  leftShoulder: { x: [-20, 20], y: [-20, 20], z: [-25, 25] },
  rightShoulder: { x: [-20, 20], y: [-20, 20], z: [-25, 25] },
  leftArm: { x: [-200, 70], y: [-90, 90], z: [-100, 100] },
  rightArm: { x: [-200, 70], y: [-90, 90], z: [-100, 100] },
  leftForeArm: { x: [-150, 90], y: [-30, 30], z: [-30, 30] },
  rightForeArm: { x: [-150, 90], y: [-30, 30], z: [-30, 30] },
  leftUpLeg: { x: [-110, 40], y: [-45, 45], z: [-40, 40] },
  rightUpLeg: { x: [-110, 40], y: [-45, 45], z: [-40, 40] },
  leftLeg: { x: [0, 150], y: [-10, 10], z: [-10, 10] },
  rightLeg: { x: [0, 150], y: [-10, 10], z: [-10, 10] },
};

const clampTo = (v: number, [lo, hi]: Range) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Khung tư thế (cộng dồn nhiều tư thế)

/** Tổng độ lệch của mọi tư thế đang chạy. Cấp sẵn một lần rồi ghi lại mỗi khung hình. */
export interface PoseFrame {
  /** Góc (độ) quanh X, Y, Z của hệ nhân vật, 3 số cho mỗi xương theo thứ tự `BONE_KEYS` */
  rot: Float64Array;
  /** Hạ `Hips` xuống bấy nhiêu (đơn vị cảnh) */
  hipsDrop: number;
  /** Nâng cả người lên bấy nhiêu (đơn vị cảnh) */
  lift: number;
}

export function createPoseFrame(): PoseFrame {
  return { rot: new Float64Array(BONE_KEYS.length * 3), hipsDrop: 0, lift: 0 };
}

export function clearPoseFrame(f: PoseFrame): void {
  f.rot.fill(0);
  f.hipsDrop = 0;
  f.lift = 0;
}

const AXIS = { x: 0, y: 1, z: 2 } as const;
type Axis = keyof typeof AXIS;

/** Cộng `deg` độ quanh trục `axis` của xương `bone` vào khung. */
export function addRot(f: PoseFrame, bone: BoneKey, axis: Axis, deg: number): void {
  f.rot[boneIndex(bone) * 3 + AXIS[axis]] += deg;
}

export function getRot(f: PoseFrame, bone: BoneKey, axis: Axis): number {
  return f.rot[boneIndex(bone) * 3 + AXIS[axis]];
}

/** Giữ mọi góc trong giới hạn khớp. */
export function clampFrame(f: PoseFrame): void {
  for (const bone of BONE_KEYS) {
    const lim = JOINT_LIMITS[bone];
    const i = boneIndex(bone) * 3;
    f.rot[i] = clampTo(f.rot[i], lim.x);
    f.rot[i + 1] = clampTo(f.rot[i + 1], lim.y);
    f.rot[i + 2] = clampTo(f.rot[i + 2], lim.z);
  }
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeInOut = (u: number) => u * u * (3 - 2 * u);

/** Độ cao nảy của `hurt` (đơn vị cảnh; nhân vật cao 1,7). */
export const HURT_BOUNCE = 0.3;
/** Độ hạ `Hips` của `slide` (đơn vị cảnh). */
export const SLIDE_HIPS_DROP = 0.5;
/** Góc cánh tay (độ quanh X) lúc đầu và cuối cú vung của `swing`: từ trên cao (-175) quét xuống trước người (-20). */
export const SWING_FROM = -175;
export const SWING_TO = -20;

/**
 * Cộng tư thế `name` vào khung. `t`: giây kể từ lúc bắt đầu; `w`: trọng số 0..1 (xem `poseWeight`).
 * - sad: Head cúi 20°, Spine2 gập 10°, hai vai rũ.
 * - slide: Spine ngả về sau 35°, Hips hạ 0,5 (chân gập theo, xem `squatLegAngles`).
 * - swing: RightArm quét một vòng cung từ trên cao xuống trong 0,25 giây.
 * - hurt: nảy lên 0,3; hai tay ra sau ôm mông; rung.
 */
export function addPose(f: PoseFrame, name: PoseName, t: number, w: number): void {
  if (w <= 0) return;
  switch (name) {
    case 'sad':
      addRot(f, 'head', 'x', 20 * w);
      addRot(f, 'spine2', 'x', 10 * w);
      // vai rũ: vai trái (phía +X) hạ xuống là quay âm quanh Z, vai phải (phía -X) là quay dương
      addRot(f, 'leftShoulder', 'z', -8 * w);
      addRot(f, 'rightShoulder', 'z', 8 * w);
      break;
    case 'slide':
      addRot(f, 'spine', 'x', -35 * w);
      f.hipsDrop += SLIDE_HIPS_DROP * w;
      break;
    case 'swing': {
      const e = easeInOut(clamp01(t / POSE_DURATION.swing));
      addRot(f, 'rightArm', 'x', lerp(SWING_FROM, SWING_TO, e) * w);
      addRot(f, 'rightForeArm', 'x', lerp(-5, -25, e) * w);
      addRot(f, 'spine', 'x', lerp(-6, 10, e) * w);
      break;
    }
    case 'hurt': {
      const u = clamp01(t / POSE_DURATION.hurt);
      f.lift += HURT_BOUNCE * Math.sin(Math.PI * u) * w;
      // hai tay ra sau và vào trong, khuỷu hơi gập: tay ở gần mông
      addRot(f, 'rightArm', 'x', 35 * w);
      addRot(f, 'leftArm', 'x', 35 * w);
      addRot(f, 'rightArm', 'z', 15 * w);
      addRot(f, 'leftArm', 'z', -15 * w);
      addRot(f, 'rightForeArm', 'x', 25 * w);
      addRot(f, 'leftForeArm', 'x', 25 * w);
      // rung
      const shake = Math.sin(Math.PI * 2 * 14 * t) * w;
      addRot(f, 'spine', 'z', 5 * shake);
      addRot(f, 'hips', 'z', 3 * shake);
      break;
    }
  }
}

/**
 * Hạ Hips `drop` thì chân phải gập để bàn chân vẫn ở mặt đất: đùi ra trước góc a, gối gập 2a (đùi và cẳng chân dài bằng nhau,
 * chân đang duỗi dài `legLength`). Trả về góc a (độ), tối đa 75° để khớp gối không quá 150°.
 */
export function squatAngle(drop: number, legLength: number): number {
  if (drop <= 0 || legLength <= 1e-6) return 0;
  const c = clamp01((legLength - drop) / legLength);
  return Math.min(75, (Math.acos(c) * 180) / Math.PI);
}

/** Thêm góc chân cho độ hạ Hips đã cộng trong khung (đùi quay âm quanh X là ra trước, gối quay dương là gập). */
export function addSquatLegs(f: PoseFrame, legLength: number): void {
  const a = squatAngle(f.hipsDrop, legLength);
  if (a <= 0) return;
  addRot(f, 'leftUpLeg', 'x', -a);
  addRot(f, 'rightUpLeg', 'x', -a);
  addRot(f, 'leftLeg', 'x', 2 * a);
  addRot(f, 'rightLeg', 'x', 2 * a);
}

// ---------------------------------------------------------------------------
// Hướng nhìn và chỉ về một điểm (point, ChoiceReaction)

const RAD = Math.PI / 180;

/** Hướng về đáp án: `az` quay quanh trục đứng (dương về +X), `el` ngẩng lên (dương là lên). Đơn vị radian. */
export interface Aim {
  az: number;
  el: number;
}

/** Giới hạn hướng nhìn để đầu và tay không vặn quá mức. */
export const AIM_LIMITS = { azMax: 75 * RAD, elMin: -35 * RAD, elMax: 45 * RAD };

export function clampAim(az: number, el: number): Aim {
  return {
    az: Math.min(AIM_LIMITS.azMax, Math.max(-AIM_LIMITS.azMax, az)),
    el: Math.min(AIM_LIMITS.elMax, Math.max(AIM_LIMITS.elMin, el)),
  };
}

/** Độ dài tham chiếu (pixel) để đổi khoảng lệch trên màn hình ra góc: càng nhỏ càng dễ quay gắt. */
export const AIM_REFERENCE_PX = 450;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Góc nhìn từ nhân vật (đứng ở giữa ngang và ở khoảng 40% chiều cao của khung 3D `frame`) tới tâm của `target`,
 * cả hai tính bằng pixel màn hình. Nhân vật nhìn ra màn hình nên bên phải màn hình là bên trái của họ (+X): `az` dương
 * khi đáp án nằm bên phải khung, `el` dương khi nằm cao hơn.
 */
export function aimFromRects(frame: Rect, target: Rect): Aim {
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height * 0.4;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;
  return clampAim(Math.atan2(tx - cx, AIM_REFERENCE_PX), Math.atan2(cy - ty, AIM_REFERENCE_PX));
}

/** Vector đơn vị hướng về đáp án, trong hệ nhân vật: (sin az cos el, sin el, cos az cos el). Ghi vào `out`. */
export function aimDirection(out: { x: number; y: number; z: number }, a: Aim): void {
  const ce = Math.cos(a.el);
  out.x = Math.sin(a.az) * ce;
  out.y = Math.sin(a.el);
  out.z = Math.cos(a.az) * ce;
}

export interface AimSplit {
  /** Quay cả người quanh trục đứng (radian) */
  bodyYaw: number;
  /** Vặn thân, tổng cộng; chia đều cho Spine, Spine1, Spine2 (radian) */
  spineTwist: number;
  /** Quay đầu thêm (radian) */
  headYaw: number;
  /** Ngẩng/cúi đầu (radian quanh X: âm là ngẩng) */
  headPitch: number;
  /** Ngẩng/cúi cổ (radian quanh X) */
  neckPitch: number;
}

/**
 * Chia hướng nhìn cho cả người, thân, đầu và cổ (nhân vật "quay đầu và người về phía đáp án").
 * Cả người 30% + vặn thân 40% + đầu 40% của góc ngang (tổng hơi quá một chút cho dễ nhìn thấy);
 * ngẩng/cúi 70% ở đầu, 30% ở cổ.
 */
export function splitAim(out: AimSplit, a: Aim): AimSplit {
  out.bodyYaw = 0.3 * a.az;
  out.spineTwist = 0.4 * a.az;
  out.headYaw = 0.4 * a.az;
  out.headPitch = -0.7 * a.el;
  out.neckPitch = -0.3 * a.el;
  return out;
}

export function createAimSplit(): AimSplit {
  return { bodyYaw: 0, spineTwist: 0, headYaw: 0, headPitch: 0, neckPitch: 0 };
}

/** Một cánh tay không được xoay quá góc này (radian) khỏi tư thế đang có để chỉ về đáp án. */
export const POINT_MAX_ROTATION = 160 * RAD;
