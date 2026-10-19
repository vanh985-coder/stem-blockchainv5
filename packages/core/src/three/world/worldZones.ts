/**
 * Tải theo vùng của thế giới mở (mốc 2, bước W1). Hàm thuần, không import three, không cấp phát khi chạy (ghi vào trạng thái có sẵn).
 * Chợ và đường luôn có. Mỗi làng là một vùng: tải khi người chơi cách RÌA làng dưới `ZONE_LOAD_DISTANCE`, dọn khi cách xa hơn `ZONE_UNLOAD_DISTANCE` liên tục quá `ZONE_UNLOAD_DELAY` giây
 * (khoảng cách và độ trễ để đứng quanh ranh giới không tải rồi dọn liên tục). Từ xa vẫn thấy làng bằng bản xa nhẹ (xem `silhouette` ở worldLayout).
 * Trước khi tải còn có bước CHUẨN BỊ (bước W2): khi rìa làng cách dưới `ZONE_PREWARM_DISTANCE` thì tải sẵn model của làng, nướng sẵn hình học và đẩy sẵn texture lên GPU từng chút một ở các khung hình rảnh, để lúc
 * vùng thật sự tải (dưới `ZONE_LOAD_DISTANCE`) mọi thứ đã có sẵn và không khung hình nào bị khựng. Bỏ chuẩn bị khi rìa xa hơn `ZONE_PREWARM_RELEASE` (xa hơn ngưỡng dọn nên vùng đã dọn).
 */
import type { GateId } from '../cho/marketLayout';
import { VILLAGE_INSIDE_RADIUS } from './worldFrames';

export const ZONE_LOAD_DISTANCE = 60;
export const ZONE_UNLOAD_DISTANCE = 90;
/** Bắt đầu chuẩn bị (tải sẵn, nướng sẵn, làm ấm texture) khi rìa làng gần hơn thế này; bỏ chuẩn bị khi xa hơn `ZONE_PREWARM_RELEASE`. */
export const ZONE_PREWARM_DISTANCE = 110;
export const ZONE_PREWARM_RELEASE = 135;
/** Phải xa quá ngưỡng dọn liên tục chừng này giây thì mới dọn. */
export const ZONE_UNLOAD_DELAY = 3;
/** Tới gần cổng trong khoảng này thì chiếu hiệu ứng mở cổng (lần đầu sau khi nhận trang) và hiện lời nhắc cổng. */
export const GATE_TRIGGER_DISTANCE = 12;

export interface ZoneState {
  loaded: boolean;
  /** Đang chuẩn bị sẵn (xem `stepPrewarm`) */
  prewarm: boolean;
  /** Thời điểm (giây) bắt đầu xa quá ngưỡng dọn; −1 nếu chưa xa quá */
  farSince: number;
}

export const newZoneState = (): ZoneState => ({ loaded: false, prewarm: false, farSince: -1 });

/**
 * Cập nhật việc chuẩn bị theo khoảng cách tới rìa `rim`: bật khi dưới `ZONE_PREWARM_DISTANCE`, tắt khi trên `ZONE_PREWARM_RELEASE` (giữa hai ngưỡng giữ nguyên). Vùng đang tải luôn được chuẩn bị. Trả true
 * nếu `prewarm` vừa đổi.
 */
export function stepPrewarm(s: ZoneState, rim: number): boolean {
  const want = s.loaded || (s.prewarm ? rim <= ZONE_PREWARM_RELEASE : rim < ZONE_PREWARM_DISTANCE);
  if (want === s.prewarm) return false;
  s.prewarm = want;
  return true;
}

/** Khoảng cách từ (x, z) tới rìa vùng tròn tâm (cx, cz) bán kính `radius` (0 nếu đang ở trong). */
export function rimDistance(cx: number, cz: number, radius: number, x: number, z: number): number {
  return Math.max(0, Math.hypot(x - cx, z - cz) - radius);
}

/**
 * Cập nhật trạng thái một vùng theo khoảng cách tới rìa `rim` tại thời điểm `now` (giây). Trả về true nếu `loaded` vừa đổi.
 * Chưa tải: rim < ngưỡng tải thì tải. Đã tải: rim > ngưỡng dọn thì bắt đầu đếm; đủ `ZONE_UNLOAD_DELAY` giây vẫn xa thì dọn; quay lại trong ngưỡng dọn thì hủy đếm.
 */
export function stepZone(s: ZoneState, rim: number, now: number): boolean {
  if (!s.loaded) {
    if (rim < ZONE_LOAD_DISTANCE) {
      s.loaded = true;
      s.farSince = -1;
      return true;
    }
    return false;
  }
  if (rim > ZONE_UNLOAD_DISTANCE) {
    if (s.farSince < 0) s.farSince = now;
    else if (now - s.farSince >= ZONE_UNLOAD_DELAY) {
      s.loaded = false;
      s.farSince = -1;
      return true;
    }
  } else s.farSince = -1;
  return false;
}

/** Người chơi đã vào làng (qua cổng) không: cách tâm làng dưới `VILLAGE_INSIDE_RADIUS`. */
export function insideVillage(cx: number, cz: number, x: number, z: number, radius: number = VILLAGE_INSIDE_RADIUS): boolean {
  return Math.hypot(x - cx, z - cz) < radius;
}

/** Cổng gần nhất trong `distance` (tính tới tâm cổng), hoặc null. */
export function nearGate(gates: readonly { id: GateId; x: number; z: number }[], x: number, z: number, distance: number = GATE_TRIGGER_DISTANCE): GateId | null {
  let best: GateId | null = null;
  let bestD = distance;
  for (const g of gates) {
    const d = Math.hypot(g.x - x, g.z - z);
    if (d <= bestD) {
      bestD = d;
      best = g.id;
    }
  }
  return best;
}
