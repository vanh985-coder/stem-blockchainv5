/**
 * Chuyển động để vẽ (hàm thuần, không import three, ghi vào đối tượng có sẵn nên không cấp phát): rơm {phanDien} ném bay vòng cung, trang sổ rơi lả tả, bóng báo chỗ rơi, và
 * hạt lấp lánh khi nhặt vật (bể hạt dùng lại). Thời gian tính theo giờ chạy của `runnerLogic` (`RunnerState.time`).
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Tiến độ bay (0 đến 1) của vật ném lúc `t0` và hạ xuống lúc `landAt`, ở giờ `time`. Kẹp trong [0, 1]. */
export function flightProgress(t0: number, landAt: number, time: number): number {
  const d = landAt - t0;
  if (!(d > 0)) return 1;
  return Math.min(1, Math.max(0, (time - t0) / d));
}

/** Độ cao tay {phanDien} lúc ném (đơn vị). */
export const HAND_HEIGHT = 1.35;
/** Đỉnh vòng cung của đống rơm ném: cao hơn đường thẳng từ tay xuống đất bấy nhiêu. */
export const STRAW_ARC = 3.2;

/**
 * Vị trí đống rơm đang bay: đi thẳng theo x, z từ chỗ ném (`fromX`, `fromZ`) tới chỗ rơi (`toX`, `toZ`), độ cao đi theo vòng cung (từ tay xuống đất, thêm phần cong parabol `arc`).
 * Ghi vào `out` và trả về nó.
 */
export function strawPosition(out: Vec3, u: number, fromX: number, fromZ: number, toX: number, toZ: number, arc: number = STRAW_ARC): Vec3 {
  out.x = fromX + (toX - fromX) * u;
  out.z = fromZ + (toZ - fromZ) * u;
  out.y = HAND_HEIGHT * (1 - u) + 4 * arc * u * (1 - u);
  return out;
}

/**
 * Vị trí một trang sổ đang rơi lả tả: rơi chậm dần về chỗ nằm (`toY`), đung đưa qua lại theo x (biên độ giảm dần), xoay. `phase` lệch pha giữa các trang.
 * Ghi vào `out` (x, y, z) và trả về góc xoay quanh trục đứng.
 */
export function pageFlutter(out: Vec3, u: number, fromX: number, fromZ: number, toX: number, toZ: number, toY: number, phase: number): number {
  const ease = 1 - (1 - u) * (1 - u); // rơi nhanh lúc đầu rồi chậm dần như lá
  out.x = fromX + (toX - fromX) * u + Math.sin(u * 11 + phase) * 0.45 * (1 - u);
  out.z = fromZ + (toZ - fromZ) * u;
  out.y = HAND_HEIGHT + (toY - HAND_HEIGHT) * ease;
  return u * 7 + phase;
}

/** Bóng báo chỗ rơi: nhỏ lúc mới ném, to dần tới cỡ thật khi gần chạm đất (`u` từ 0 đến 1); trả về hệ số cỡ. */
export function markerScale(u: number): number {
  return 0.45 + 0.55 * Math.min(1, Math.max(0, u));
}

// ---------------------------------------------------------------------------
// Hạt lấp lánh khi nhặt

/**
 * Bể hạt cỡ cố định: mỗi hạt có vị trí, vận tốc, tuổi và màu; `burst` đặt lại các hạt đã chết (không tạo vật mới). Hạt bay ra, rơi chậm và nhỏ dần rồi chết.
 */
export class ParticlePool {
  readonly capacity: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly vz: Float32Array;
  readonly age: Float32Array;
  readonly life: Float32Array;
  readonly r: Float32Array;
  readonly g: Float32Array;
  readonly b: Float32Array;
  private cursor = 0;

  constructor(capacity = 48) {
    this.capacity = capacity;
    const f = () => new Float32Array(capacity);
    this.x = f();
    this.y = f();
    this.z = f();
    this.vx = f();
    this.vy = f();
    this.vz = f();
    this.age = f();
    this.life = f();
    this.r = f();
    this.g = f();
    this.b = f();
    this.age.fill(1);
    this.life.fill(1);
  }

  /** Số hạt còn sống. */
  get alive(): number {
    let n = 0;
    for (let i = 0; i < this.capacity; i++) if (this.age[i] < this.life[i]) n++;
    return n;
  }

  /**
   * Phun `count` hạt từ (x, y, z) theo mọi hướng, sống `life` giây, màu (r, g, b). `seed` (một số bất kỳ, ví dụ id vật nhặt) làm hướng khác nhau mà vẫn tất định.
   * Hết chỗ thì ghi đè hạt cũ nhất (vòng tròn).
   */
  burst(x: number, y: number, z: number, count: number, life: number, r: number, g: number, b: number, seed: number): void {
    for (let k = 0; k < count; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
      const a = ((seed * 7 + k) / count) * Math.PI * 2 + seed * 0.37;
      const speed = 1.6 + ((k * 13 + seed * 5) % 7) * 0.2;
      this.x[i] = x;
      this.y[i] = y;
      this.z[i] = z;
      this.vx[i] = Math.cos(a) * speed;
      this.vz[i] = Math.sin(a) * speed * 0.6;
      this.vy[i] = 2.2 + ((k * 5 + seed) % 4) * 0.3;
      this.age[i] = 0;
      this.life[i] = life;
      this.r[i] = r;
      this.g[i] = g;
      this.b[i] = b;
    }
  }

  /** Cập nhật `dt` giây: hạt di chuyển, chịu trọng lực nhẹ, già đi. */
  update(dt: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.z[i] += this.vz[i] * dt;
      this.vy[i] -= 9 * dt;
    }
  }

  /** Tỉ lệ cỡ của hạt `i` (1 lúc mới sinh, 0 lúc chết); 0 nếu đã chết. */
  size(i: number): number {
    const a = this.age[i];
    const l = this.life[i];
    return a >= l ? 0 : 1 - a / l;
  }
}
