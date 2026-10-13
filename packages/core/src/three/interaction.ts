/** Tương tác ở cảnh đi lại (spec 03 mục 3.7): vật gần nhất trong bán kính 2,2 hiện lời nhắc "E: …". Hàm thuần. */

export const INTERACT_RADIUS = 2.2;

/** Vật tương tác được: điểm (x, z) trên đất mà người chơi phải đứng gần. `id` do cảnh đặt. */
export interface Interactable {
  id: string;
  x: number;
  z: number;
  /**
   * Vật dự phòng (ví dụ Bi luôn bay sát người chơi): chỉ được chọn khi không có vật nào khác trong bán kính, dù nó gần hơn. Mặc định false.
   */
  fallback?: boolean;
}

/**
 * Chỉ số của vật gần người chơi nhất trong bán kính `radius` (tính tới tâm vật), hoặc −1 nếu không có. Vật thường được ưu tiên hơn vật dự phòng
 * (`fallback`): vật dự phòng chỉ được chọn khi trong bán kính không có vật thường nào.
 * Cách nhau đúng bằng nhau thì lấy vật đứng trước trong danh sách. Không cấp phát.
 */
export function nearestInteractable(px: number, pz: number, items: readonly Interactable[], radius: number = INTERACT_RADIUS): number {
  let best = -1;
  let bestD2 = radius * radius;
  let fb = -1;
  let fbD2 = radius * radius;
  for (let i = 0; i < items.length; i++) {
    const dx = items[i].x - px;
    const dz = items[i].z - pz;
    const d2 = dx * dx + dz * dz;
    if (items[i].fallback) {
      if (d2 <= fbD2 && (fb < 0 || d2 < fbD2)) {
        fb = i;
        fbD2 = d2;
      }
    } else if (d2 <= bestD2 && (best < 0 || d2 < bestD2)) {
      best = i;
      bestD2 = d2;
    }
  }
  return best >= 0 ? best : fb;
}
