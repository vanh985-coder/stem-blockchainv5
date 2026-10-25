import type { BufferGeometry } from 'three';

/**
 * Ánh kim của đồng máy soi dấu, NƯỚNG vào màu theo đỉnh (bước L4): mỗi đỉnh nhân màu với độ sáng của một bầu trời giả theo pháp tuyến của nó (trời xanh sáng ở trên, chân trời sáng, đất sẫm ở dưới) cộng một vệt nắng,
 * nên mặt hướng lên sáng, mặt hướng xuống tối và có vệt bóng loáng. Cảnh không có bản đồ môi trường nên kim loại thật vốn tối và phẳng. Hai cách đã thử đều không dùng được: `material.envMap` (three đổi bản đồ sang PMREM
 * ngay lần dùng đầu tiên trên luồng chính: một khung 380 đến 400 ms) và phản chiếu giả tính trong bộ đổ bóng mảnh (hai chương trình shader mới cho thân máy và bánh răng: biên dịch 125 đến 215 ms, và một khung 145 đến 166 ms
 * khi bánh răng vào cảnh). Nướng vào màu đỉnh thì vật liệu vẫn là vật liệu chuẩn có texture và màu theo đỉnh, dùng chung chương trình shader với các đồ nhỏ khác: không có chương trình mới nào để biên dịch.
 * Không theo góc nhìn (ánh kim cố định theo hướng của vật), đổi lại không tốn gì lúc vẽ.
 */
const SUN = [0.45, 0.8, 0.35] as const;
const SUN_LEN = Math.hypot(SUN[0], SUN[1], SUN[2]);

/** Hệ số sáng (khoảng 0,6 tới 1,7) của một đỉnh có pháp tuyến đơn vị (nx, ny, nz); `strength` 0 là không đổi, 1 là đủ mạnh. */
export function copperSheenFactor(nx: number, ny: number, nz: number, strength = 1): number {
  const up = ny; // −1 xuống, 1 lên
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const env = 0.18 + 0.82 * smooth(-0.25, 0.2, up) * (0.72 + 0.28 * smooth(0.1, 0.9, up)); // đất sẫm → chân trời sáng → trời
  const glint = Math.pow(Math.max((nx * SUN[0] + ny * SUN[1] + nz * SUN[2]) / SUN_LEN, 0), 16);
  const f = 0.55 + 0.75 * env + 1.1 * glint;
  return 1 + (f - 1) * strength;
}

/** Nhân màu theo đỉnh (thuộc tính `color`) với `copperSheenFactor` theo pháp tuyến (thuộc tính `normal`). Hình học phải có cả hai. */
export function bakeCopperSheen(g: BufferGeometry, strength = 1): BufferGeometry {
  const color = g.getAttribute('color');
  const normal = g.getAttribute('normal');
  for (let i = 0; i < color.count; i++) {
    const f = copperSheenFactor(normal.getX(i), normal.getY(i), normal.getZ(i), strength);
    color.setXYZ(i, color.getX(i) * f, color.getY(i) * f, color.getZ(i) * f);
  }
  color.needsUpdate = true;
  return g;
}
