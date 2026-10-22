import { describe, expect, it } from 'vitest';
import {
  AIM_LIMITS,
  AIM_REFERENCE_PX,
  BONE_KEYS,
  HANG,
  HANG_PINNED_BONES,
  MIXAMO_BONE_NAME,
  JOINT_LIMITS,
  POSE_DURATION,
  POSE_FADE,
  POSE_NAMES,
  addHang,
  addPose,
  addSquatLegs,
  aimDirection,
  aimFromRects,
  clampAim,
  clampFrame,
  clearPoseFrame,
  createAimSplit,
  createPoseFrame,
  getRot,
  hangSway,
  heldWeight,
  isPoseAllowed,
  poseWeight,
  splitAim,
  squatAngle,
  type PoseFrame,
} from './poses';

const DEG = Math.PI / 180;

describe('đường cong trọng số: vào 0,1 giây, giữ, ra 0,1 giây', () => {
  it('thời lượng theo spec 03 mục 3.3', () => {
    expect(POSE_FADE).toBe(0.1);
    expect(POSE_DURATION).toEqual({ sad: 1, slide: 0.6, swing: 0.25, hurt: 0.6 });
  });
  it('sad (1 giây): 0 → 1 trong 0,1; giữ 0,8; về 0 trong 0,1', () => {
    const w = (t: number) => poseWeight(t, 1);
    expect(w(-0.01)).toBe(0);
    expect(w(0)).toBe(0);
    expect(w(0.05)).toBeCloseTo(0.5, 9);
    expect(w(0.1)).toBe(1);
    expect(w(0.5)).toBe(1);
    expect(w(0.9)).toBeCloseTo(1, 9);
    expect(w(0.95)).toBeCloseTo(0.5, 9);
    expect(w(0.999)).toBeCloseTo(0.01, 6);
    expect(w(1)).toBe(0);
    expect(w(5)).toBe(0);
  });
  it('liên tục và không bao giờ vượt [0, 1]', () => {
    for (const d of Object.values(POSE_DURATION)) {
      let prev = 0;
      for (let t = 0; t < d; t += 0.001) {
        const v = poseWeight(t, d);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        expect(Math.abs(v - prev)).toBeLessThanOrEqual(0.011);
        prev = v;
      }
    }
  });
  it('tư thế ngắn (swing 0,25 giây) vẫn đạt 1 ở giữa vì còn dài hơn 2×0,1', () => {
    expect(poseWeight(0.125, 0.25)).toBe(1);
    expect(poseWeight(0.05, 0.25)).toBeCloseTo(0.5, 9);
  });
  it('tư thế ngắn hơn 2×fade thì không đạt đủ 1', () => {
    expect(poseWeight(0.075, 0.15)).toBeCloseTo(0.75, 9);
  });

  it('tư thế giữ (point): vào 0,1 giây rồi giữ mức 1', () => {
    expect(heldWeight(-1, undefined)).toBe(0);
    expect(heldWeight(0, undefined)).toBe(0);
    expect(heldWeight(0.05, undefined)).toBeCloseTo(0.5, 9);
    expect(heldWeight(0.1, undefined)).toBe(1);
    expect(heldWeight(30, undefined)).toBe(1);
  });
  it('thả: ra trong 0,1 giây từ mức đã đạt', () => {
    // đã giữ trọn rồi thả
    expect(heldWeight(5, 0)).toBe(1);
    expect(heldWeight(5.05, 0.05)).toBeCloseTo(0.5, 9);
    expect(heldWeight(5.1, 0.1)).toBe(0);
    expect(heldWeight(7, 2)).toBe(0);
    // thả khi mới vào được nửa chừng (giữ 0,05 giây): bắt đầu ra từ 0,5, không nhảy lên 1
    expect(heldWeight(0.05, 0)).toBeCloseTo(0.5, 9);
    expect(heldWeight(0.075, 0.025)).toBeCloseTo(0.5 * 0.75, 9);
    expect(heldWeight(0.15, 0.1)).toBeCloseTo(0, 9);
  });
});

describe('5 tư thế đúng bảng spec 03 mục 3.3', () => {
  const frame = () => createPoseFrame();

  it('sad: Head cúi 20°, Spine2 gập 10°, hai vai rũ', () => {
    const f = frame();
    addPose(f, 'sad', 0.5, 1);
    expect(getRot(f, 'head', 'x')).toBe(20);
    expect(getRot(f, 'spine2', 'x')).toBe(10);
    expect(getRot(f, 'leftShoulder', 'z')).toBeLessThan(0);
    expect(getRot(f, 'rightShoulder', 'z')).toBeGreaterThan(0);
    expect(Math.abs(getRot(f, 'leftShoulder', 'z'))).toBe(Math.abs(getRot(f, 'rightShoulder', 'z')));
  });
  it('sad: trọng số nửa thì góc nửa', () => {
    const f = frame();
    addPose(f, 'sad', 0.05, 0.5);
    expect(getRot(f, 'head', 'x')).toBe(10);
    expect(getRot(f, 'spine2', 'x')).toBe(5);
  });
  it('slide: Spine ngả về sau 35°, Hips hạ 0,5', () => {
    const f = frame();
    addPose(f, 'slide', 0.3, 1);
    expect(getRot(f, 'spine', 'x')).toBe(-35);
    expect(f.hipsDrop).toBe(0.5);
  });
  it('swing: RightArm quét từ trên cao (-175°) xuống trước người (-20°) trong 0,25 giây', () => {
    const at = (t: number) => {
      const f = frame();
      addPose(f, 'swing', t, 1);
      return getRot(f, 'rightArm', 'x');
    };
    expect(at(0)).toBeCloseTo(-175, 6);
    expect(at(0.25)).toBeCloseTo(-20, 6);
    expect(at(0.125)).toBeCloseTo((-175 - 20) / 2, 6);
    let prev = at(0);
    for (let t = 0.005; t <= 0.25; t += 0.005) {
      const a = at(t);
      expect(a).toBeGreaterThanOrEqual(prev); // chỉ đi xuống, một chiều
      prev = a;
    }
    // chỉ cánh tay phải
    const f = frame();
    addPose(f, 'swing', 0.1, 1);
    expect(getRot(f, 'leftArm', 'x')).toBe(0);
  });
  it('hurt: nảy lên 0,3 rồi về 0; hai tay ra sau; rung', () => {
    const lift = (t: number) => {
      const f = frame();
      addPose(f, 'hurt', t, 1);
      return f.lift;
    };
    expect(lift(0)).toBeCloseTo(0, 9);
    expect(lift(0.3)).toBeCloseTo(0.3, 9);
    expect(lift(0.6)).toBeCloseTo(0, 6);
    const f = frame();
    addPose(f, 'hurt', 0.2, 1);
    expect(getRot(f, 'rightArm', 'x')).toBeGreaterThan(0); // ra sau
    expect(getRot(f, 'leftArm', 'x')).toBeGreaterThan(0);
    // rung: góc Z của Spine đổi dấu qua các mốc thời gian
    const zs: number[] = [];
    for (let t = 0; t < 0.6; t += 0.01) {
      const g = frame();
      addPose(g, 'hurt', t, 1);
      zs.push(getRot(g, 'spine', 'z'));
    }
    expect(Math.max(...zs)).toBeGreaterThan(3);
    expect(Math.min(...zs)).toBeLessThan(-3);
  });
  it('hurt chỉ cho Tí', () => {
    expect(isPoseAllowed('characters/ti', 'hurt')).toBe(true);
    expect(isPoseAllowed('characters/hoc-sinh-nam', 'hurt')).toBe(false);
    expect(isPoseAllowed('characters/dan-lang-ba-cu', 'hurt')).toBe(false);
    for (const p of POSE_NAMES.filter((n) => n !== 'hurt')) expect(isPoseAllowed('characters/hoc-sinh-nam', p)).toBe(true);
  });
  it('trọng số 0 hoặc âm thì không thêm gì', () => {
    const f = frame();
    for (const p of POSE_NAMES) addPose(f, p, 0.1, 0);
    expect(Array.from(f.rot).every((v) => v === 0)).toBe(true);
    expect(f.hipsDrop + f.lift).toBe(0);
  });
  it('xóa khung về 0', () => {
    const f = frame();
    addPose(f, 'slide', 0.3, 1);
    addPose(f, 'hurt', 0.3, 1);
    clearPoseFrame(f);
    expect(Array.from(f.rot).every((v) => v === 0)).toBe(true);
    expect(f.hipsDrop + f.lift).toBe(0);
  });
});

describe('chân gập khi hạ Hips (slide)', () => {
  it('không hạ thì không gập; hạ càng nhiều gập càng nhiều', () => {
    expect(squatAngle(0, 0.76)).toBe(0);
    expect(squatAngle(-1, 0.76)).toBe(0);
    expect(squatAngle(0.1, 0.76)).toBeLessThan(squatAngle(0.3, 0.76));
  });
  it('hạ 0,5 với chân dài 0,76: đùi ~70°, gối gấp đôi, và không quá giới hạn khớp', () => {
    const a = squatAngle(0.5, 0.76);
    expect(a).toBeGreaterThan(60);
    expect(a).toBeLessThanOrEqual(75);
    const f = createPoseFrame();
    addPose(f, 'slide', 0.3, 1);
    addSquatLegs(f, 0.76);
    expect(getRot(f, 'leftUpLeg', 'x')).toBeCloseTo(-a, 9);
    expect(getRot(f, 'leftLeg', 'x')).toBeCloseTo(2 * a, 9);
    expect(getRot(f, 'rightLeg', 'x')).toBeCloseTo(2 * a, 9);
    clampFrame(f);
    expect(getRot(f, 'leftLeg', 'x')).toBeLessThanOrEqual(150);
    expect(getRot(f, 'leftUpLeg', 'x')).toBeGreaterThanOrEqual(-110);
  });
  it('hạ quá chiều dài chân vẫn không vượt 75°', () => {
    expect(squatAngle(5, 0.76)).toBeLessThanOrEqual(75);
  });
  it('bàn chân vẫn chạm đất: độ cao hông còn lại = 2 · (L/2) · cos a', () => {
    const L = 0.76;
    const a = (squatAngle(0.4, L) * Math.PI) / 180;
    expect(2 * (L / 2) * Math.cos(a)).toBeCloseTo(L - 0.4, 6);
  });
});

describe('giới hạn khớp: không gãy tay', () => {
  it('chồng mọi tư thế cùng lúc vẫn nằm trong giới hạn sau clampFrame', () => {
    const f: PoseFrame = createPoseFrame();
    for (let k = 0; k < 4; k++) for (const p of POSE_NAMES) addPose(f, p, 0.15, 1);
    addSquatLegs(f, 0.76);
    clampFrame(f);
    for (const b of BONE_KEYS) {
      for (const axis of ['x', 'y', 'z'] as const) {
        const v = getRot(f, b, axis);
        expect(v).toBeGreaterThanOrEqual(JOINT_LIMITS[b][axis][0]);
        expect(v).toBeLessThanOrEqual(JOINT_LIMITS[b][axis][1]);
      }
    }
  });
  it('khớp gối không gập ngược, khuỷu không duỗi ngược quá mức', () => {
    expect(JOINT_LIMITS.leftLeg.x[0]).toBe(0);
    expect(JOINT_LIMITS.rightLeg.x[0]).toBe(0);
    expect(JOINT_LIMITS.leftForeArm.x[1]).toBeLessThanOrEqual(90);
  });
  it('mỗi tư thế đơn lẻ nằm trong giới hạn mà không cần chặn', () => {
    for (const p of POSE_NAMES) {
      for (let t = 0; t < POSE_DURATION[p]; t += 0.01) {
        const f = createPoseFrame();
        addPose(f, p, t, 1);
        const before = Array.from(f.rot);
        clampFrame(f);
        expect(Array.from(f.rot), `${p} t=${t}`).toEqual(before);
      }
    }
  });
});

describe('hướng nhìn/chỉ về đáp án', () => {
  const frame = { x: 0, y: 0, width: 280, height: 420 };
  const target = (cx: number, cy: number) => ({ x: cx - 100, y: cy - 20, width: 200, height: 40 });

  it('đáp án bên phải khung thì az dương (nhân vật quay sang trái của họ, +X)', () => {
    expect(aimFromRects(frame, target(700, 168)).az).toBeGreaterThan(0.5);
    expect(aimFromRects(frame, target(-300, 168)).az).toBeLessThan(-0.5);
  });
  it('đáp án ngang tầm mắt và thẳng phía trước thì az = 0, el = 0', () => {
    const a = aimFromRects(frame, target(140, 168));
    expect(a.az).toBeCloseTo(0, 9);
    expect(a.el).toBeCloseTo(0, 9);
  });
  it('đáp án cao hơn thì el dương, thấp hơn thì el âm', () => {
    expect(aimFromRects(frame, target(140, -100)).el).toBeGreaterThan(0.3);
    expect(aimFromRects(frame, target(140, 600)).el).toBeLessThan(-0.3);
  });
  it('góc tính đúng theo atan2(lệch / độ dài tham chiếu)', () => {
    const a = aimFromRects(frame, target(140 + 200, 168));
    expect(a.az).toBeCloseTo(Math.atan2(200, AIM_REFERENCE_PX), 9);
  });
  it('luôn nằm trong giới hạn', () => {
    const far = aimFromRects(frame, target(100000, -100000));
    expect(far.az).toBe(AIM_LIMITS.azMax);
    expect(far.el).toBe(AIM_LIMITS.elMax);
    const low = clampAim(-9, -9);
    expect(low.az).toBe(-AIM_LIMITS.azMax);
    expect(low.el).toBe(AIM_LIMITS.elMin);
  });
  it('vector hướng chỉ là vector đơn vị: thẳng trước là +Z, sang +X khi az dương, lên khi el dương', () => {
    const d = { x: 0, y: 0, z: 0 };
    aimDirection(d, { az: 0, el: 0 });
    expect([d.x, d.y, d.z]).toEqual([0, 0, 1]);
    aimDirection(d, { az: Math.PI / 2, el: 0 });
    expect(d.x).toBeCloseTo(1, 9);
    expect(d.z).toBeCloseTo(0, 9);
    aimDirection(d, { az: 0.6, el: 0.4 });
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 9);
    expect(d.y).toBeCloseTo(Math.sin(0.4), 9);
  });
  it('chia góc cho người, thân, đầu: cùng chiều với hướng nhìn và có độ lớn hợp lý', () => {
    const s = splitAim(createAimSplit(), { az: 60 * DEG, el: 20 * DEG });
    expect(s.bodyYaw).toBeGreaterThan(0);
    expect(s.spineTwist).toBeGreaterThan(0);
    expect(s.headYaw).toBeGreaterThan(0);
    expect(s.headPitch).toBeLessThan(0); // ngẩng đầu (nhìn lên) = quay âm quanh X
    expect(s.bodyYaw + s.spineTwist + s.headYaw).toBeCloseTo(60 * 1.1 * DEG, 6);
    expect(s.headPitch + s.neckPitch).toBeCloseTo(-20 * DEG, 9);
    const z = splitAim(createAimSplit(), { az: 0, el: 0 });
    expect(z).toEqual({ bodyYaw: 0, spineTwist: 0, headYaw: 0, headPitch: -0, neckPitch: -0 });
  });
  it('góc đầu tối đa nằm trong giới hạn khớp đầu', () => {
    const s = splitAim(createAimSplit(), { az: AIM_LIMITS.azMax, el: AIM_LIMITS.elMax });
    expect(Math.abs(s.headYaw) / DEG).toBeLessThanOrEqual(JOINT_LIMITS.head.y[1]);
    expect(Math.abs(s.spineTwist) / DEG / 3).toBeLessThanOrEqual(JOINT_LIMITS.spine.y[1]);
    expect(Math.abs(s.headPitch) / DEG).toBeLessThanOrEqual(Math.abs(JOINT_LIMITS.head.x[0]));
  });
});

describe('tư thế treo (hang), dựng bằng code thay cho clip hang sai trong file model', () => {
  it('là tư thế giữ như point: không nằm trong POSE_NAMES (tư thế có thời lượng); vào 0,1 giây rồi giữ mức 1', () => {
    expect((POSE_NAMES as readonly string[]).includes('hang')).toBe(false);
    expect(heldWeight(0.05, undefined)).toBeCloseTo(0.5, 9);
    expect(heldWeight(3, undefined)).toBe(1);
  });

  it('hai tay giơ thẳng lên trên đầu (gần −175° của điểm đầu swing), khép vào trong, hai bên đối nhau; cẳng tay thẳng; chân thả lỏng, mũi chân chúc xuống', () => {
    const f = createPoseFrame();
    addHang(f, 1);
    expect(HANG.armX).toBeLessThanOrEqual(-175);
    expect(HANG.armX).toBeGreaterThanOrEqual(-195);
    expect(getRot(f, 'leftArm', 'x')).toBe(HANG.armX);
    expect(getRot(f, 'rightArm', 'x')).toBe(HANG.armX);
    // khép vào trong: tay trái (phía +X) quay âm quanh Z, tay phải quay dương
    expect(getRot(f, 'leftArm', 'z')).toBeLessThan(0);
    expect(getRot(f, 'rightArm', 'z')).toBeGreaterThan(0);
    // chân: đùi hơi ra trước, gối hơi gập (không ngược), mũi chân chúc xuống (đưa bàn chân thêm góc dương quanh X)
    expect(getRot(f, 'leftUpLeg', 'x')).toBeLessThanOrEqual(0);
    expect(getRot(f, 'leftLeg', 'x')).toBeGreaterThan(0);
    expect(getRot(f, 'leftLeg', 'x')).toBeLessThan(20);
    expect(getRot(f, 'leftFoot', 'x')).toBeGreaterThan(0);
    expect(getRot(f, 'rightFoot', 'x')).toBe(getRot(f, 'leftFoot', 'x'));
    // hai chân hơi khép: đùi trái quay âm quanh Z, đùi phải dương
    expect(getRot(f, 'leftUpLeg', 'z')).toBeLessThan(0);
    expect(getRot(f, 'rightUpLeg', 'z')).toBeGreaterThan(0);
    // thân thẳng: không xoay thân, đầu, cổ
    for (const b of ['spine', 'spine1', 'spine2', 'neck', 'head', 'hips'] as const) for (const ax of ['x', 'y', 'z'] as const) expect(getRot(f, b, ax)).toBe(0);
  });

  it('trọng số nửa thì góc nửa; trọng số 0 hay âm thì không thêm gì; nằm trong giới hạn khớp không cần chặn', () => {
    const half = createPoseFrame();
    addHang(half, 0.5);
    expect(getRot(half, 'leftArm', 'x')).toBeCloseTo(HANG.armX / 2, 9);
    const none = createPoseFrame();
    addHang(none, 0);
    addHang(none, -1);
    expect(Array.from(none.rot).every((v) => v === 0)).toBe(true);
    const f = createPoseFrame();
    addHang(f, 1);
    const before = Array.from(f.rot);
    clampFrame(f);
    expect(Array.from(f.rot)).toEqual(before);
  });

  it('có xương bàn chân trong BONE_KEYS (đủ giới hạn khớp, đủ tên Mixamo); xương giữ thẳng đều là xương có thật, gồm thân và hai chân', () => {
    for (const k of ['leftFoot', 'rightFoot'] as const) {
      expect(BONE_KEYS).toContain(k);
      expect(JOINT_LIMITS[k]).toBeDefined();
      expect(MIXAMO_BONE_NAME[k]).toMatch(/Foot$/);
    }
    for (const b of HANG_PINNED_BONES) expect(BONE_KEYS).toContain(b);
    for (const b of ['hips', 'spine', 'spine2', 'leftUpLeg', 'rightLeg', 'leftFoot'] as const) expect(HANG_PINNED_BONES).toContain(b);
    // BONE_KEYS vẫn theo thứ tự từ gốc ra ngọn: xương con sau xương cha
    const order = (k: (typeof BONE_KEYS)[number]) => BONE_KEYS.indexOf(k);
    expect(order('leftLeg')).toBeLessThan(order('leftFoot'));
    expect(order('rightLeg')).toBeLessThan(order('rightFoot'));
  });

  it('đung đưa ±4°, chu kỳ 1,6 giây, đứng yên khi Giảm chuyển động', () => {
    expect(HANG.swayDeg).toBe(4);
    expect(HANG.swaySeconds).toBe(1.6);
    expect(hangSway(0)).toBeCloseTo(0, 9);
    expect(hangSway(0.4)).toBeCloseTo(4, 9);
    expect(hangSway(0.8)).toBeCloseTo(0, 9);
    expect(hangSway(1.2)).toBeCloseTo(-4, 9);
    expect(hangSway(1.6 + 0.3)).toBeCloseTo(hangSway(0.3), 9);
    let max = 0;
    for (let t = 0; t < 3.2; t += 0.01) max = Math.max(max, Math.abs(hangSway(t)));
    expect(max).toBeLessThanOrEqual(4 + 1e-9);
    for (let t = 0; t < 3.2; t += 0.1) expect(hangSway(t, false)).toBe(0);
  });

  it('tỉ lệ độ cao hai bàn tay (đo ở /dev/3d: lòng bàn tay 1,62 trên chiều cao 1,7)', () => {
    expect(HANG.handsRatio).toBeCloseTo(1.62 / 1.7, 2);
  });
});
