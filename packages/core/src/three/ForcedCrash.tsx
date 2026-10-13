/** `?loi3d=1` (chỉ khi chạy dev): ép một lỗi khi dựng cảnh 3D để thử lớp chặn lỗi. */
export const forcedCanvasCrash = (): boolean => import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('loi3d') === '1';

/** Đặt trong Canvas: ném lỗi lúc dựng. */
export function ForcedCrash(): null {
  throw new Error('Forced by ?loi3d=1 (test only)');
}
