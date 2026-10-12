import { describe, expect, it } from 'vitest';
import { box, circle } from './collision';
import {
  AIR_TIME,
  GRAVITY,
  JUMP_BUFFER,
  JUMP_VELOCITY,
  RUN_SPEED,
  TIME_SCALE_MAX,
  TIME_SCALE_MIN,
  WALK_SPEED,
  animationFor,
  createPlayerState,
  jumpTimeScale,
  locomotionTimeScale,
  moveDirection,
  stepPlayer,
  type Dir2,
  type MoveInput,
  type PlayerState,
  type World,
} from './playerMotion';

const FREE: World = { obstacles: [], boundsRadius: Infinity };
const none: MoveInput = { x: 0, y: 0, run: false, jump: false };
const DT = 1 / 60;

/** Chạy `seconds` giây với lệnh `input` (lệnh nhảy chỉ ở khung hình đầu). */
function run(s: PlayerState, input: MoveInput, seconds: number, camYaw = 0, world: World = FREE, paused = false): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) stepPlayer(s, i === 0 ? input : { ...input, jump: false }, camYaw, DT, world, paused);
}

describe('hướng đi theo camera', () => {
  const out: Dir2 = { x: 0, z: 0 };
  it('camera nhìn về +Z: tiến là +Z, sang phải là −X', () => {
    moveDirection(0, 1, 0, out);
    expect(out.x).toBeCloseTo(0, 9);
    expect(out.z).toBeCloseTo(1, 9);
    moveDirection(1, 0, 0, out);
    expect(out.x).toBeCloseTo(-1, 9);
    expect(out.z).toBeCloseTo(0, 9);
  });
  it('camera quay 90° sang +X: tiến là +X, sang phải là +Z', () => {
    moveDirection(0, 1, Math.PI / 2, out);
    expect(out.x).toBeCloseTo(1, 9);
    expect(out.z).toBeCloseTo(0, 9);
    moveDirection(1, 0, Math.PI / 2, out);
    expect(out.x).toBeCloseTo(0, 9);
    expect(out.z).toBeCloseTo(1, 9);
  });
  it('lệnh chéo cho vectơ đơn vị; không có lệnh cho (0, 0) và độ lớn 0', () => {
    expect(moveDirection(1, 1, 0.7, out)).toBe(1);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(1, 9);
    expect(moveDirection(0, 0, 0.7, out)).toBe(0);
    expect(out).toEqual({ x: 0, z: 0 });
  });
  it('độ lớn lệnh nhỏ giữ nguyên, lớn hơn 1 chặn ở 1', () => {
    expect(moveDirection(0, 0.5, 0, out)).toBeCloseTo(0.5, 9);
    expect(moveDirection(0, 3, 0, out)).toBe(1);
  });
});

describe('tốc độ đi và chạy', () => {
  it('đi: sau 1 giây vận tốc đạt 4 (±2%) và đi được khoảng 3,7 đến 4 đơn vị', () => {
    const s = createPlayerState();
    run(s, { ...none, y: 1 }, 1);
    expect(Math.hypot(s.vx, s.vz)).toBeGreaterThan(WALK_SPEED * 0.98);
    expect(Math.hypot(s.vx, s.vz)).toBeLessThanOrEqual(WALK_SPEED + 1e-9);
    expect(s.z).toBeGreaterThan(3.4);
    expect(s.z).toBeLessThan(4.01);
  });
  it('chạy (Shift): vận tốc đạt 7', () => {
    const s = createPlayerState();
    run(s, { ...none, y: 1, run: true }, 1);
    expect(Math.hypot(s.vx, s.vz)).toBeGreaterThan(RUN_SPEED * 0.98);
    expect(Math.hypot(s.vx, s.vz)).toBeLessThanOrEqual(RUN_SPEED + 1e-9);
    expect(s.running).toBe(true);
  });
  it('đi chéo không nhanh hơn đi thẳng', () => {
    const a = createPlayerState();
    const b = createPlayerState();
    run(a, { ...none, y: 1 }, 1);
    run(b, { ...none, x: 1, y: 1 }, 1);
    expect(Math.hypot(b.vx, b.vz)).toBeCloseTo(Math.hypot(a.vx, a.vz), 6);
  });
  it('không có lệnh thì dừng hẳn (vận tốc về 0, không trôi)', () => {
    const s = createPlayerState();
    run(s, { ...none, y: 1 }, 1);
    run(s, none, 1);
    expect(s.vx).toBe(0);
    expect(s.vz).toBe(0);
    expect(s.moving).toBe(false);
  });
  it('đi theo hướng camera đã quay', () => {
    const s = createPlayerState();
    run(s, { ...none, y: 1 }, 1, Math.PI / 2);
    expect(s.x).toBeGreaterThan(3);
    expect(Math.abs(s.z)).toBeLessThan(1e-6);
  });
  it('mặt quay mượt về hướng đi, đi theo đường ngắn, không giật một nhịp', () => {
    const s = createPlayerState(0, 0, 0);
    // đi sang −X (camera nhìn +Z, bấm "phải"): mặt cần quay từ 0 tới −π/2
    stepPlayer(s, { ...none, x: 1 }, 0, DT, FREE);
    expect(s.yaw).toBeLessThan(0);
    expect(s.yaw).toBeGreaterThan(-Math.PI / 2); // chưa quay xong ngay trong một khung hình
    run(s, { ...none, x: 1 }, 0.5);
    expect(s.yaw).toBeCloseTo(-Math.PI / 2, 6);
  });
  it('quay ngược 180° vẫn theo đường ngắn (không quay vòng dài)', () => {
    const s = createPlayerState(0, 0, Math.PI * 0.9);
    stepPlayer(s, { ...none, y: 1 }, 0, DT, FREE); // đi +Z (yaw 0): chênh −0,9π, đi ngắn là giảm
    expect(s.yaw).toBeLessThan(Math.PI * 0.9);
    expect(s.yaw).toBeGreaterThan(Math.PI * 0.9 - 0.2);
  });
});

describe('nhảy', () => {
  it('bấm nhảy thì rời đất với vận tốc 6; trả về true đúng một lần', () => {
    const s = createPlayerState();
    expect(stepPlayer(s, { ...none, jump: true }, 0, DT, FREE)).toBe(true);
    expect(s.grounded).toBe(false);
    expect(s.y).toBeGreaterThan(0);
    expect(stepPlayer(s, none, 0, DT, FREE)).toBe(false);
  });
  it('đỉnh nhảy cao khoảng 1 đơn vị (6² / 2 × 18), ở trên không khoảng 2/3 giây rồi đáp xuống y = 0', () => {
    const s = createPlayerState();
    let peak = 0;
    let airFrames = 0;
    stepPlayer(s, { ...none, jump: true }, 0, DT, FREE);
    for (let i = 0; i < 200 && !s.grounded; i++) {
      peak = Math.max(peak, s.y);
      stepPlayer(s, none, 0, DT, FREE);
      airFrames++;
    }
    expect(peak).toBeGreaterThan(0.95);
    expect(peak).toBeLessThan(1.02);
    expect(airFrames * DT).toBeCloseTo(AIR_TIME, 1);
    expect(s.y).toBe(0);
    expect(s.vy).toBe(0);
    expect(s.grounded).toBe(true);
  });
  it('trên không bấm nhảy tiếp không nhảy đôi', () => {
    const s = createPlayerState();
    stepPlayer(s, { ...none, jump: true }, 0, DT, FREE);
    run(s, none, 0.2);
    const vy = s.vy;
    expect(stepPlayer(s, { ...none, jump: true }, 0, DT, FREE)).toBe(false);
    expect(s.vy).toBeLessThan(vy); // vẫn đang rơi theo trọng lực, không được tăng vận tốc
  });
  it('bấm nhảy hơi sớm (trước khi chạm đất ≤ 0,12 giây) vẫn nhảy ngay khi chạm đất', () => {
    const s = createPlayerState();
    stepPlayer(s, { ...none, jump: true }, 0, DT, FREE);
    // chạy tới sát lúc đáp
    while (s.y > 0.15 || s.vy > 0) stepPlayer(s, none, 0, DT, FREE);
    stepPlayer(s, { ...none, jump: true }, 0, DT, FREE); // bấm sớm
    let again = false;
    for (let i = 0; i < 30 && !again; i++) again = stepPlayer(s, none, 0, DT, FREE);
    expect(again).toBe(true);
    expect(JUMP_BUFFER).toBeLessThanOrEqual(0.15);
  });
  it('bấm quá sớm (hết 0,12 giây) thì không tính', () => {
    const s = createPlayerState();
    stepPlayer(s, { ...none, jump: true }, 0, DT, FREE);
    run(s, none, 0.1); // đang ở gần đỉnh nhảy
    stepPlayer(s, { ...none, jump: true }, 0, DT, FREE);
    let again = false;
    for (let i = 0; i < 120 && !again; i++) again = stepPlayer(s, none, 0, DT, FREE);
    expect(again).toBe(false);
  });
  it('vừa nhảy vừa đi: vẫn đi ngang trong lúc ở trên không', () => {
    const s = createPlayerState();
    stepPlayer(s, { ...none, y: 1, jump: true }, 0, DT, FREE);
    run(s, { ...none, y: 1 }, 0.3);
    expect(s.grounded).toBe(false);
    expect(s.z).toBeGreaterThan(0.5);
  });
  it('hằng số đúng spec: vận tốc đầu 6, trọng lực 18', () => {
    expect(JUMP_VELOCITY).toBe(6);
    expect(GRAVITY).toBe(18);
    expect(WALK_SPEED).toBe(4);
    expect(RUN_SPEED).toBe(7);
  });
});

describe('tạm dừng điều khiển', () => {
  it('đang tạm dừng thì bỏ lệnh đi và nhảy, đứng yên', () => {
    const s = createPlayerState();
    run(s, { ...none, y: 1, jump: true }, 1, 0, FREE, true);
    expect(s.x).toBe(0);
    expect(s.z).toBe(0);
    expect(s.grounded).toBe(true);
    expect(s.moving).toBe(false);
  });
  it('tạm dừng giữa lúc đang đi thì giảm tốc và dừng hẳn', () => {
    const s = createPlayerState();
    run(s, { ...none, y: 1 }, 1);
    run(s, { ...none, y: 1 }, 1, 0, FREE, true);
    expect(s.vx).toBe(0);
    expect(s.vz).toBe(0);
  });
  it('đang ở trên không mà tạm dừng thì vẫn rơi xuống đất', () => {
    const s = createPlayerState();
    stepPlayer(s, { ...none, jump: true }, 0, DT, FREE);
    run(s, none, 1, 0, FREE, true);
    expect(s.grounded).toBe(true);
    expect(s.y).toBe(0);
  });
});

describe('va chạm khi đi', () => {
  it('đi thẳng vào vật tròn thì dừng ở sát vật, không xuyên', () => {
    const s = createPlayerState(0, 0, 0);
    const world: World = { obstacles: [circle(0, 3, 0.5)], boundsRadius: Infinity };
    run(s, { ...none, y: 1 }, 2, 0, world);
    expect(s.z).toBeLessThanOrEqual(3 - 0.5 - 0.4 + 1e-3);
    expect(s.z).toBeGreaterThan(2.0);
  });
  it('đi vào hộp chéo thì trượt dọc theo mặt hộp', () => {
    const s = createPlayerState(-3, 1, 0);
    const world: World = { obstacles: [box(0, 4, 0, 10)], boundsRadius: Infinity };
    // camera nhìn +X (yaw π/2), bấm tiến + sang trái: đi chéo về +X, +Z... tiến = +X, phải = +Z nên trái = −Z; dùng phải để đi +Z
    run(s, { ...none, y: 1, x: 1 }, 1.5, Math.PI / 2, world);
    expect(s.x).toBeLessThanOrEqual(-0.4 + 1e-3);
    expect(s.z).toBeGreaterThan(2);
  });
  it('không bao giờ ra ngoài biên', () => {
    const s = createPlayerState(0, 0, 0);
    const world: World = { obstacles: [], boundsRadius: 5 };
    run(s, { ...none, y: 1, run: true }, 3, 0, world);
    expect(Math.hypot(s.x, s.z)).toBeLessThanOrEqual(5 - 0.4 + 1e-6);
  });
});

describe('clip theo trạng thái', () => {
  const st = (o: Partial<PlayerState>) => ({ grounded: true, moving: false, running: false, ...o });
  it('idle / walk / run / jump', () => {
    expect(animationFor(st({}))).toBe('idle');
    expect(animationFor(st({ moving: true }))).toBe('walk');
    expect(animationFor(st({ moving: true, running: true }))).toBe('run');
    expect(animationFor(st({ grounded: false }))).toBe('jump');
    expect(animationFor(st({ grounded: false, moving: true, running: true }))).toBe('jump');
  });
  it('luồng thật: đứng, đi, chạy, nhảy, đáp, dừng', () => {
    const s = createPlayerState();
    const seen: string[] = [];
    const push = () => {
      const a = animationFor(s);
      if (seen[seen.length - 1] !== a) seen.push(a);
    };
    push();
    for (let i = 0; i < 30; i++) {
      stepPlayer(s, { ...none, y: 1 }, 0, DT, FREE);
      push();
    }
    for (let i = 0; i < 30; i++) {
      stepPlayer(s, { ...none, y: 1, run: true }, 0, DT, FREE);
      push();
    }
    stepPlayer(s, { ...none, y: 1, run: true, jump: true }, 0, DT, FREE);
    push();
    for (let i = 0; i < 60; i++) {
      stepPlayer(s, { ...none, y: 1, run: true }, 0, DT, FREE);
      push();
    }
    for (let i = 0; i < 30; i++) {
      stepPlayer(s, none, 0, DT, FREE);
      push();
    }
    expect(seen).toEqual(['idle', 'walk', 'run', 'jump', 'run', 'idle']);
  });
});

describe('hệ số tốc độ phát clip', () => {
  it('bằng tốc độ đi / tốc độ ngầm, kẹp trong khoảng, chưa biết thì 1', () => {
    expect(locomotionTimeScale(4, 2)).toBe(2);
    expect(locomotionTimeScale(4, 4)).toBe(1);
    expect(locomotionTimeScale(4, 0.5)).toBe(TIME_SCALE_MAX);
    expect(locomotionTimeScale(1, 4)).toBe(TIME_SCALE_MIN);
    expect(locomotionTimeScale(4, null)).toBe(1);
    expect(locomotionTimeScale(4, 0)).toBe(1);
  });
  it('clip jump được co lại cho vừa thời gian ở trên không', () => {
    expect(jumpTimeScale(AIR_TIME)).toBeCloseTo(1, 9);
    expect(jumpTimeScale(1.5)).toBeCloseTo(1.5 / AIR_TIME, 9);
    expect(jumpTimeScale(null)).toBe(1);
  });
});
