/**
 * Cột sáng của biển chọn màn (P5): hàm thuần cho dáng và màu theo trạng thái màn. Không import three. Dáng khác nhau để không chỉ phân biệt bằng màu:
 * màn đã mở là cuộn giấy vàng trên cột sáng cao; màn xong là vòng tròn có dấu tích trên cột sáng thấp hơn; màn khóa/sắp ra mắt là ổ khóa xám trên cột rất thấp.
 */
import type { LevelState } from '../../progress/unlock';

export type PillarKind = 'open' | 'done' | 'locked';

/** Màn đang mở → open, đã xong (thật hay tự hoàn thành) → done, còn lại (khóa, sắp ra mắt, chưa biết) → locked. */
export function pillarKindOf(state: LevelState | undefined): PillarKind {
  return state === 'open' ? 'open' : state === 'done' ? 'done' : 'locked';
}

/** Cao cột sáng, bán kính đỉnh/đáy, độ cao vật nổi và màu theo từng dáng (cuộn "Em có biết?" cao 36, bán kính 0,85–1,7: cột biển hẹp hơn để hai cột bên cạnh cách nhau 4,6 không chạm). */
export const PILLAR = {
  open: { height: 20, glow: '#FFC83D', emissive: '#FFC94A', beam: 0.17, disc: 0.4, emissiveIntensity: 0.85 },
  done: { height: 8, glow: '#5BD26A', emissive: '#58D068', beam: 0.15, disc: 0.36, emissiveIntensity: 0.7 },
  locked: { height: 2.8, glow: '#8FA0B8', emissive: '#5A6478', beam: 0.12, disc: 0.28, emissiveIntensity: 0.35 },
} as const;

export const PILLAR_RADIUS_TOP = 0.45;
export const PILLAR_RADIUS_BASE = 0.95;
export const PILLAR_DISC_RADIUS = 1.2;
/** Vật nổi nằm trên tấm biển (đỉnh tấm biển cao 1,875). */
export const EMBLEM_Y = 2.45;
export const EMBLEM_SCALE = 1.05;

/** Chuyển động của vật nổi theo dáng (khi không "Giảm chuyển động"): quay, nhấp nhô, lắc. Hàm thuần để test. */
export function emblemMotion(kind: PillarKind, t: number, i: number): { yaw: number; bob: number } {
  if (kind === 'open') return { yaw: t * 0.9 + i, bob: Math.sin(t * 2 + i * 1.7) * 0.12 };
  if (kind === 'done') return { yaw: Math.sin(t * 0.8 + i) * 0.4, bob: 0 };
  return { yaw: 0, bob: 0 };
}
