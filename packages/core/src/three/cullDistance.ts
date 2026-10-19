/**
 * Ẩn vật ở xa người chơi (không vẽ, nhưng vật vẫn đi lại và va chạm): hàm thuần dùng cho dân làng (`Villager`) và người đứng yên (`CullGroup` ở thế giới mở) để giữ ngân sách tam giác.
 * Không cấp phát.
 */
export function withinCullDistance(x: number, z: number, px: number, pz: number, distance: number): boolean {
  if (distance === Infinity) return true;
  const dx = x - px;
  const dz = z - pz;
  return dx * dx + dz * dz < distance * distance;
}

/** Dân làng (và người đứng yên) xa người chơi hơn khoảng này thì không vẽ: mỗi người nặng chừng 18.000 tam giác. Mức Thấp (22) ngắn hơn để giữ dưới 300.000 tam giác. */
export const VILLAGER_CULL: Readonly<Record<'low' | 'medium' | 'high', number>> = { low: 22, medium: 38, high: 38 };
