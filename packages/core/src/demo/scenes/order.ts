/** Thứ tự cảnh của demo theo cốt truyện (hàm thuần, có test). Đợt 1: Làng Giấy. Các đợt sau nối tiếp vào cuối danh sách. */
export interface SceneMeta {
  id: string;
  title: string;
  /** Hạn giờ (mili giây, ở nhịp 1): quá hạn là kẹt */
  timeoutMs: number;
}

export const SCENE_META: readonly SceneMeta[] = [
  { id: 'gioi-thieu', title: 'Intro: home and story', timeoutMs: 180_000 },
  { id: 'cho-den-lang-giay', title: 'Walk from market to Giay village', timeoutMs: 120_000 },
  { id: 'giay-the', title: 'Collect 4 know cards', timeoutMs: 240_000 },
  { id: 'giay-man-1', title: 'Level 1: 3 stations', timeoutMs: 360_000 },
  { id: 'giay-man-2', title: 'Level 2: runner', timeoutMs: 420_000 },
  { id: 'giay-man-3', title: 'Level 3: rebuild', timeoutMs: 360_000 },
  { id: 'giay-trao-trang', title: 'Golden page 1', timeoutMs: 120_000 },
] as const;

export const SCENE_IDS: readonly string[] = SCENE_META.map((s) => s.id);
