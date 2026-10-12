import { Euler, Quaternion, Vector3, type Object3D } from 'three';
import { dampFactor } from './biMotion';
import {
  BONE_KEYS,
  MIXAMO_BONE_NAME,
  POINT_MAX_ROTATION,
  POSE_DURATION,
  POSE_FADE,
  POSE_NAMES,
  addPose,
  addRot,
  addSquatLegs,
  aimDirection,
  clampFrame,
  clearPoseFrame,
  createAimSplit,
  createPoseFrame,
  heldWeight,
  poseWeight,
  splitAim,
  type Aim,
  type BoneKey,
  type PoseName,
} from './poses';

const RAD = Math.PI / 180;
/** Độ gắt khi hướng nhìn chuyển từ đáp án này sang đáp án khác. */
const AIM_FOLLOW_RATE = 14;

function findBone(root: Object3D, name: string): Object3D | null {
  return root.getObjectByName(`mixamorig${name}`) ?? root.getObjectByName(`mixamorig:${name}`) ?? null;
}

/**
 * Lớp tư thế (spec 03 mục 3.3): trộn các tư thế code dựng và hướng nhìn/chỉ lên trên clip đang chạy.
 *
 * Mỗi khung hình AnimationMixer ghi lại xoay của mọi xương, rồi `update` cộng thêm độ lệch của các tư thế lên trên.
 * Độ lệch được định nghĩa trong hệ tọa độ của nhân vật (`frame`, +Z là hướng mặt) rồi đổi sang hệ cục bộ của từng xương:
 * `local' = P⁻¹ · C · R · C⁻¹ · P · local`, với P là xoay thế giới của xương cha, C là xoay thế giới của `frame`, R là
 * phép xoay mong muốn. Nhờ vậy "cúi đầu 20°" luôn là cúi tới trước dù xương Mixamo có trục cục bộ thế nào.
 *
 * **Thứ tự mỗi khung hình: `restore()`, `mixer.update(dt)`, `update(now, dt)`.** AnimationMixer (PropertyMixer) chỉ ghi lại một
 * xương khi giá trị của clip đổi so với khung trước; nếu clip không đổi (ví dụ vị trí Hips khi idle) thì độ lệch của lớp này
 * không bị ghi đè và sẽ cộng dồn từng khung. `restore()` trả các xương đã chỉnh về giá trị gốc trước khi mixer chạy.
 *
 * Mọi đối tượng tạm đều cấp sẵn trong constructor: `update` không cấp phát (dùng được trong useFrame).
 */
export class PoseLayer {
  /** Có đủ xương để chạy không (nhân vật không xương thì false, mọi lệnh bị bỏ qua) */
  readonly ok: boolean;

  private readonly bones: (Object3D | null)[];
  private readonly rightArm: Object3D | null;
  private readonly rightForeArm: Object3D | null;
  private readonly rightHand: Object3D | null;
  private readonly hips: Object3D | null;
  private readonly frameObj: Object3D;
  private readonly motion: Object3D;
  private readonly facing: number;
  private readonly fitScale: number;
  private readonly legLength: number;

  private readonly frame = createPoseFrame();
  private readonly split = createAimSplit();

  // trạng thái
  private readonly start: Record<PoseName, number> = { sad: -1, slide: -1, swing: -1, hurt: -1 };
  private readonly pendingPose: Record<PoseName, boolean> = { sad: false, slide: false, swing: false, hurt: false };
  private pendingAim: { has: boolean; aim: Aim | null } = { has: false, aim: null };
  private aimTarget: Aim = { az: 0, el: 0 };
  private readonly aimCur: Aim = { az: 0, el: 0 };
  private aimOnAt = -1;
  private aimOffAt = -1;
  private dirty = false;

  // giá trị gốc của các xương đã bị chỉnh trong khung này (để `restore`)
  private readonly modified: boolean[];
  private readonly savedQ: Quaternion[];
  private readonly savedHipsPos = new Vector3();
  private hipsModified = false;
  private readonly armIndex: number;
  private readonly foreArmIndex: number;

  // đối tượng tạm
  private readonly qC = new Quaternion();
  private readonly qCinv = new Quaternion();
  private readonly qP = new Quaternion();
  private readonly qR = new Quaternion();
  private readonly qT = new Quaternion();
  private readonly qS = new Quaternion();
  private readonly qId = new Quaternion();
  private readonly e = new Euler();
  private readonly v = new Vector3();
  private readonly dir = new Vector3();
  private readonly pA = new Vector3();
  private readonly pB = new Vector3();

  /**
   * @param root gốc của model đã nhân bản (chứa xương)
   * @param frameObj đối tượng định nghĩa hệ nhân vật (+Z là hướng mặt): nhóm ngoài cùng của <Character>
   * @param motion nhóm mà <Character> dùng để nảy lên và quay cả người
   * @param facing góc xoay mặt của model (radian), giữ nguyên khi không có tư thế
   * @param fitScale hệ số phóng của model (để đổi độ dài trong cảnh sang độ dài trong file)
   */
  constructor(root: Object3D, frameObj: Object3D, motion: Object3D, facing: number, fitScale: number) {
    this.frameObj = frameObj;
    this.motion = motion;
    this.facing = facing;
    this.fitScale = fitScale;
    this.bones = BONE_KEYS.map((k) => findBone(root, MIXAMO_BONE_NAME[k]));
    this.modified = BONE_KEYS.map(() => false);
    this.savedQ = BONE_KEYS.map(() => new Quaternion());
    this.armIndex = BONE_KEYS.indexOf('rightArm');
    this.foreArmIndex = BONE_KEYS.indexOf('rightForeArm');
    this.rightArm = this.bone('rightArm');
    this.rightForeArm = this.bone('rightForeArm');
    this.rightHand = findBone(root, MIXAMO_BONE_NAME.rightHand);
    this.hips = this.bone('hips');
    const foot = findBone(root, MIXAMO_BONE_NAME.leftFoot);
    const knee = this.bone('leftLeg');
    this.legLength = knee && foot ? (knee.position.length() + foot.position.length()) * fitScale : 0;
    this.ok = !!(this.hips && this.bone('head') && this.rightArm && this.rightForeArm && this.rightHand);
  }

  private bone(k: BoneKey): Object3D | null {
    return this.bones[BONE_KEYS.indexOf(k)];
  }

  /** Bắt đầu một tư thế có thời lượng (phát lại từ đầu nếu đang chạy). Có hiệu lực ở lần `update` kế tiếp. */
  play(name: PoseName): void {
    if (this.ok) this.pendingPose[name] = true;
  }

  /** Nhìn và chỉ về `aim` (giữ đến khi gọi lại với null). Có hiệu lực ở lần `update` kế tiếp. */
  setAim(aim: Aim | null): void {
    if (!this.ok) return;
    this.pendingAim.has = true;
    this.pendingAim.aim = aim;
  }

  /** Trả các xương đã chỉnh ở khung trước về giá trị gốc. Gọi mỗi khung hình, trước `mixer.update`. */
  restore(): void {
    if (this.hipsModified && this.hips) {
      this.hips.position.copy(this.savedHipsPos);
      this.hipsModified = false;
    }
    for (let i = 0; i < this.modified.length; i++) {
      if (!this.modified[i]) continue;
      this.bones[i]?.quaternion.copy(this.savedQ[i]);
      this.modified[i] = false;
    }
  }

  /** Còn tư thế hoặc hướng nhìn nào đang chạy không. */
  get active(): boolean {
    return this.dirty;
  }

  /**
   * Cộng độ lệch của mọi tư thế đang chạy lên các xương. Gọi mỗi khung hình ngay sau `mixer.update`.
   * @param now giây (đồng hồ của cảnh), @param dt giây từ khung trước
   */
  update(now: number, dt: number): void {
    if (!this.ok) return;

    for (const p of POSE_NAMES) {
      if (this.pendingPose[p]) {
        this.pendingPose[p] = false;
        this.start[p] = now;
      }
    }
    if (this.pendingAim.has) {
      this.pendingAim.has = false;
      const a = this.pendingAim.aim;
      if (a) {
        if (this.aimOnAt < 0) {
          // bắt đầu chỉ: lấy hướng mới ngay, trọng số tự vào mượt trong 0,1 giây
          this.aimCur.az = a.az;
          this.aimCur.el = a.el;
          this.aimOnAt = now;
        } else if (this.aimOffAt >= 0) {
          // chỉ lại khi đang thả: vào lại từ trọng số hiện có, không nhảy
          const w0 = heldWeight(now - this.aimOnAt, now - this.aimOffAt);
          this.aimOnAt = now - w0 * POSE_FADE;
        }
        this.aimOffAt = -1;
        this.aimTarget = a;
      } else if (this.aimOnAt >= 0 && this.aimOffAt < 0) {
        this.aimOffAt = now;
      }
    }

    const f = this.frame;
    clearPoseFrame(f);
    let any = false;
    for (const p of POSE_NAMES) {
      if (this.start[p] < 0) continue;
      const t = now - this.start[p];
      if (t >= POSE_DURATION[p]) {
        this.start[p] = -1;
        continue;
      }
      addPose(f, p, t, poseWeight(t, POSE_DURATION[p]));
      any = true;
    }

    let aimW = 0;
    if (this.aimOnAt >= 0) {
      aimW = heldWeight(now - this.aimOnAt, this.aimOffAt >= 0 ? now - this.aimOffAt : undefined);
      if (this.aimOffAt >= 0 && aimW <= 0) {
        this.aimOnAt = -1;
        this.aimOffAt = -1;
      } else {
        any = true;
      }
    }

    if (!any) {
      if (this.dirty) {
        this.motion.position.y = 0;
        this.motion.rotation.y = this.facing;
        this.dirty = false;
      }
      return;
    }
    this.dirty = true;

    // hướng nhìn: chuyển mượt tới đáp án hiện tại rồi chia cho người, thân, đầu, cổ
    if (aimW > 0) {
      const k = dampFactor(dt, AIM_FOLLOW_RATE);
      this.aimCur.az += (this.aimTarget.az - this.aimCur.az) * k;
      this.aimCur.el += (this.aimTarget.el - this.aimCur.el) * k;
      splitAim(this.split, this.aimCur);
      const s = this.split;
      const twist = (s.spineTwist / RAD / 3) * aimW;
      addRot(f, 'spine', 'y', twist);
      addRot(f, 'spine1', 'y', twist);
      addRot(f, 'spine2', 'y', twist);
      addRot(f, 'head', 'y', (s.headYaw / RAD) * aimW);
      addRot(f, 'head', 'x', (s.headPitch / RAD) * aimW);
      addRot(f, 'neck', 'x', (s.neckPitch / RAD) * aimW);
      this.motion.rotation.y = this.facing + s.bodyYaw * aimW;
    } else {
      this.motion.rotation.y = this.facing;
    }
    addSquatLegs(f, this.legLength);
    clampFrame(f);
    this.motion.position.y = f.lift;

    this.applyFrame();
    if (aimW > 0) this.applyPoint(aimW);
  }

  /** local' = P⁻¹ · C · R · C⁻¹ · P · local (R đã đặt sẵn trong qR). Ghi vào quaternion của `bone`. */
  private applyRotation(bone: Object3D, index: number): void {
    const parent = bone.parent;
    if (!parent) return;
    if (!this.modified[index]) {
      this.savedQ[index].copy(bone.quaternion);
      this.modified[index] = true;
    }
    parent.getWorldQuaternion(this.qP);
    this.qT.copy(this.qP).invert().multiply(this.qC).multiply(this.qR).multiply(this.qCinv).multiply(this.qP);
    bone.quaternion.premultiply(this.qT);
  }

  private applyFrame(): void {
    this.frameObj.getWorldQuaternion(this.qC);
    this.qCinv.copy(this.qC).invert();
    const f = this.frame;

    // Hips hạ xuống (theo trục đứng của nhân vật), đổi sang vị trí cục bộ của Hips.
    if (f.hipsDrop > 0 && this.hips?.parent) {
      this.hips.parent.getWorldQuaternion(this.qP);
      this.v.set(0, -f.hipsDrop / this.fitScale, 0).applyQuaternion(this.qC).applyQuaternion(this.qT.copy(this.qP).invert());
      if (!this.hipsModified) {
        this.savedHipsPos.copy(this.hips.position);
        this.hipsModified = true;
      }
      this.hips.position.add(this.v);
    }

    // Xương theo thứ tự từ gốc ra ngọn (BONE_KEYS), để xoay của cha đã có khi tính cho con.
    for (let i = 0; i < BONE_KEYS.length; i++) {
      const b = this.bones[i];
      if (!b) continue;
      const rx = f.rot[i * 3];
      const ry = f.rot[i * 3 + 1];
      const rz = f.rot[i * 3 + 2];
      if (rx === 0 && ry === 0 && rz === 0) continue;
      this.qR.setFromEuler(this.e.set(rx * RAD, ry * RAD, rz * RAD, 'XYZ'));
      this.applyRotation(b, i);
    }
  }

  /** Quay một xương (đang chỉ về hướng hiện tại tới `to`) để chỉ về hướng `this.dir`, mức `w`, tối đa POINT_MAX_ROTATION. */
  private aimBone(bone: Object3D, tip: Object3D, w: number, index: number): void {
    bone.getWorldPosition(this.pA);
    tip.getWorldPosition(this.pB);
    this.v.subVectors(this.pB, this.pA);
    if (this.v.lengthSq() < 1e-12) return;
    this.v.normalize().applyQuaternion(this.qCinv); // hướng hiện tại, trong hệ nhân vật
    this.qS.setFromUnitVectors(this.v, this.dir);
    const angle = 2 * Math.acos(Math.min(1, Math.abs(this.qS.w)));
    const k = angle > POINT_MAX_ROTATION ? POINT_MAX_ROTATION / angle : 1;
    this.qR.copy(this.qId.identity()).slerp(this.qS, k * w);
    this.applyRotation(bone, index);
  }

  /** Cánh tay phải chỉ về đáp án: RightArm rồi RightForeArm (spec 03 mục 3.3). */
  private applyPoint(w: number): void {
    if (!this.rightArm || !this.rightForeArm || !this.rightHand) return;
    this.frameObj.getWorldQuaternion(this.qC);
    this.qCinv.copy(this.qC).invert();
    aimDirection(this.dir, this.aimCur);
    this.aimBone(this.rightArm, this.rightForeArm, w, this.armIndex);
    this.aimBone(this.rightForeArm, this.rightHand, w, this.foreArmIndex);
  }
}
