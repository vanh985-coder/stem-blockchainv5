import { createMulberry32 } from '../../lib/rng';

export interface HillParams {
  /** Cách tâm chợ ít nhất bấy nhiêu */
  minDistance: number;
  /** Cộng thêm ngẫu nhiên từ 0 tới bấy nhiêu */
  spread: number;
  size: number;
  sizeVar: number;
  height: number;
  heightVar: number;
}

export interface HillItem {
  x: number;
  z: number;
  y: number;
  sx: number;
  sy: number;
  sz: number;
  yaw: number;
}

/** Vòng tròn mà đồi không được chạm tới (chỗ dành riêng của một làng cộng chút chừa). */
export interface HillAvoid {
  x: number;
  z: number;
  r: number;
}

export const HILL_COUNT = 9;

/** Nửa bề rộng của đồi (khối cầu dẹt xoay `yaw`) đo theo hướng đơn vị (ux, uz). */
export function hillExtent(h: Pick<HillItem, 'sx' | 'sz' | 'yaw'>, ux: number, uz: number): number {
  const c = Math.cos(h.yaw);
  const s = Math.sin(h.yaw);
  // trục x của đồi trong thế giới là (cos, −sin), trục z là (sin, cos)
  const lx = ux * c - uz * s;
  const lz = ux * s + uz * c;
  return Math.hypot(h.sx * lx, h.sz * lz);
}

/**
 * Chín đồi xa quanh chân trời (cùng seed cùng kết quả). Đồi lấn vào một vòng `avoid` (làng bán kính 125 ở thế giới mở) thì bị đẩy ra xa tâm vòng theo đường nối tâm tới đủ để mép đồi không chạm vòng:
 * trước bước L3 một đồi cách tâm Làng Khắc Dấu có 209 mà rộng 170, che kín nửa làng phía bắc và bãi đá. Đồi không lấn thì giữ nguyên chỗ cũ.
 */
export function layoutHills(p: HillParams, avoid: readonly HillAvoid[] = []): HillItem[] {
  const rng = createMulberry32(77);
  const out: HillItem[] = [];
  for (let i = 0; i < HILL_COUNT; i++) {
    const a = (i / HILL_COUNT) * Math.PI * 2 + rng() * 0.3;
    const d = p.minDistance + rng() * p.spread;
    const s = p.size + rng() * p.sizeVar;
    const h: HillItem = { x: Math.cos(a) * d, z: Math.sin(a) * d, y: -4, sx: s * 1.4, sy: p.height + rng() * p.heightVar, sz: s, yaw: rng() * 3 };
    for (let pass = 0; pass < 3; pass++) {
      for (const c of avoid) {
        const dx = h.x - c.x;
        const dz = h.z - c.z;
        const dist = Math.hypot(dx, dz) || 1;
        const ux = dx / dist;
        const uz = dz / dist;
        const need = c.r + hillExtent(h, ux, uz);
        if (dist < need) {
          h.x = c.x + ux * need;
          h.z = c.z + uz * need;
        }
      }
    }
    out.push(h);
  }
  return out;
}
