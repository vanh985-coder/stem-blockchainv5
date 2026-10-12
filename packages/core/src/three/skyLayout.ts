/** Hàm thuần dựng bầu trời (spec 03 mục 2). Không import three. */
import { createMulberry32 } from '../lib/rng';

/** Màu trời: ở chân trời #E8F6FF, lên đỉnh #8FCBFF. */
export const SKY_HORIZON = '#E8F6FF';
export const SKY_ZENITH = '#8FCBFF';
/** HemisphereLight: trời #FFFFFF, đất #B5D68A. DirectionalLight: #FFF4E0. */
export const HEMI_SKY = '#FFFFFF';
export const HEMI_GROUND = '#B5D68A';
export const SUN_COLOR = '#FFF4E0';
/** Bán kính khối cầu trời. Khối cầu luôn đi theo camera nên chỉ cần nhỏ hơn mặt phẳng xa (far) của camera. */
export const SKY_RADIUS = 400;

/**
 * Độ pha trộn giữa màu chân trời (0) và màu đỉnh (1) theo độ cao chuẩn hóa `y` (-1 đến 1, đã chuẩn hóa theo bán kính).
 * Dưới chân trời giữ màu chân trời; lên đỉnh chuyển dần.
 */
export function skyMix(y: number): number {
  const t = Math.min(1, Math.max(0, y));
  return t * t * (3 - 2 * t); // smoothstep cho chuyển màu mềm
}

export interface CloudPuff {
  x: number;
  y: number;
  z: number;
  /** Bán kính cục mây */
  r: number;
}

/**
 * Vị trí các cục mây tròn: mỗi đám mây là một cụm `puffsPerCloud` cục, các đám rải quanh trục đứng ở độ cao trung bình.
 * Tất định theo `seed`, nên cảnh nào cũng cho cùng một bầu trời.
 */
export function createCloudLayout(seed: number, clouds = 9, puffsPerCloud = 4, radius = SKY_RADIUS * 0.8): CloudPuff[] {
  const rng = createMulberry32(seed);
  const out: CloudPuff[] = [];
  for (let c = 0; c < clouds; c++) {
    const angle = ((c + rng() * 0.6) / clouds) * Math.PI * 2;
    const dist = radius * (0.7 + rng() * 0.3);
    const cx = Math.cos(angle) * dist;
    const cz = Math.sin(angle) * dist;
    const cy = 90 + rng() * 80;
    const base = 14 + rng() * 10;
    for (let p = 0; p < puffsPerCloud; p++) {
      const k = p - (puffsPerCloud - 1) / 2;
      out.push({
        x: cx + k * base * 0.9,
        y: cy + (rng() - 0.5) * base * 0.3 - Math.abs(k) * base * 0.12,
        z: cz + (rng() - 0.5) * base * 0.5,
        r: base * (1 - Math.abs(k) * 0.18) * (0.85 + rng() * 0.3),
      });
    }
  }
  return out;
}
