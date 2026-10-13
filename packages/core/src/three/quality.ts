/**
 * Mức chất lượng đồ họa 3D (spec 03 mục 2). Toàn bộ là hàm thuần, không import three: dùng được ở cả cài đặt
 * (trang đầu) lẫn lõi 3D mà không kéo three vào trang đầu.
 */

export type QualityLevel = 'low' | 'medium' | 'high';
/** Lựa chọn trong cài đặt: "auto" để máy tự chọn theo cấu hình. */
export type QualityChoice = 'auto' | QualityLevel;

export const QUALITY_LEVELS: readonly QualityLevel[] = ['low', 'medium', 'high'];
export const QUALITY_CHOICES: readonly QualityChoice[] = ['auto', ...QUALITY_LEVELS];

export interface QualityParams {
  /** Tỉ lệ điểm ảnh tối đa (còn bị chặn bởi devicePixelRatio của máy) */
  dpr: number;
  /** "blob" là vệt bóng tròn dưới chân; số là kích thước bản đồ bóng mềm */
  shadow: 'blob' | 1024 | 2048;
  /** Cách camera bao xa (đơn vị) thì đổi sang bản xa (-xa) của model */
  lodDistance: number;
}

/** Bảng ở spec 03 mục 2. Khoảng đổi bản xa: Thấp 12, Vừa 20, Cao 30. */
export const QUALITY_TABLE: Readonly<Record<QualityLevel, QualityParams>> = {
  low: { dpr: 1, shadow: 'blob', lodDistance: 12 },
  medium: { dpr: 1.5, shadow: 1024, lodDistance: 20 },
  high: { dpr: 2, shadow: 2048, lodDistance: 30 },
};

/**
 * Khoảng đổi 3 bậc cho model có bản vừa (spec 03 mục 2): bản chính tới `mid`, bản vừa từ `mid` tới `far`, bản xa từ `far` trở đi. Bản xa chỉ xuất hiện ở xa:
 * Vừa từ 30, Cao từ 40; mức Thấp giữ khoảng đổi của bảng trên (12). Model không có bản vừa dùng `lodDistance` (2 bậc).
 */
export const LOD_TIERS: Readonly<Record<QualityLevel, { mid: number; far: number }>> = {
  low: { mid: 6, far: 12 },
  medium: { mid: 10, far: 30 },
  high: { mid: 15, far: 40 },
};

export function lodTiers(level: QualityLevel): { mid: number; far: number } {
  return LOD_TIERS[level];
}

/** Dưới ngưỡng này (khung hình/giây) trong cửa sổ đo đầu tiên thì hạ một mức. */
export const FPS_MIN = 40;
/** Cửa sổ đo: 3 giây đầu của cảnh (spec 03 mục 2). */
export const FPS_WINDOW_MS = 3000;
/** Bỏ qua khoảng đầu khi biên dịch shader và tải texture, để không hạ mức oan. */
export const FPS_WARMUP_MS = 500;

const RANK: Record<QualityLevel, number> = { low: 0, medium: 1, high: 2 };

export function isQualityLevel(v: unknown): v is QualityLevel {
  return v === 'low' || v === 'medium' || v === 'high';
}

export function isQualityChoice(v: unknown): v is QualityChoice {
  return v === 'auto' || isQualityLevel(v);
}

/** Hạ một mức (Thấp thì giữ nguyên). */
export function lowerQuality(level: QualityLevel): QualityLevel {
  return level === 'high' ? 'medium' : 'low';
}

/** Mức thấp hơn trong hai mức. */
export function minQuality(a: QualityLevel, b: QualityLevel): QualityLevel {
  return RANK[a] <= RANK[b] ? a : b;
}

export interface DeviceInfo {
  /** Màn hình cảm ứng chính (điện thoại, máy tính bảng) */
  coarsePointer: boolean;
  /** navigator.hardwareConcurrency, nếu có */
  cores?: number;
  /** navigator.deviceMemory (GB), nếu có */
  memoryGb?: number;
}

/**
 * Mức máy tự chọn khi cài đặt là "auto": điện thoại, máy ít nhân hoặc ít RAM thì Thấp, còn lại Vừa.
 * Mức Cao chỉ có khi người dùng chọn.
 */
export function autoQuality(device: DeviceInfo): QualityLevel {
  if (device.coarsePointer) return 'low';
  if (device.cores !== undefined && device.cores <= 4) return 'low';
  if (device.memoryGb !== undefined && device.memoryGb <= 4) return 'low';
  return 'medium';
}

/**
 * Mức dùng thật: lựa chọn của người dùng (hoặc mức máy tự chọn), bị chặn bởi mức trần của phiên
 * (đặt khi FPS thấp, xem `createFpsTracker`).
 */
export function resolveQuality(choice: QualityChoice, device: DeviceInfo, sessionCap?: QualityLevel): QualityLevel {
  const wanted = choice === 'auto' ? autoQuality(device) : choice;
  return sessionCap ? minQuality(wanted, sessionCap) : wanted;
}

/** DPR dùng cho canvas: không vượt mức của bảng và không vượt devicePixelRatio của máy. */
export function effectiveDpr(level: QualityLevel, devicePixelRatio: number): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(QUALITY_TABLE[level].dpr, dpr);
}

export function lodDistance(level: QualityLevel): number {
  return QUALITY_TABLE[level].lodDistance;
}

export function shouldDowngrade(fps: number): boolean {
  return fps < FPS_MIN;
}

export interface FpsTracker {
  /**
   * Gọi mỗi khung hình với thời gian hiện tại (ms). Trả về số FPS trung bình đúng một lần, khi cửa sổ đo kết thúc;
   * các lần khác trả null. Không cấp phát bộ nhớ, dùng được trong useFrame.
   */
  tick(nowMs: number): number | null;
  readonly done: boolean;
}

export function createFpsTracker(warmupMs: number = FPS_WARMUP_MS, windowMs: number = FPS_WINDOW_MS): FpsTracker {
  let first = -1;
  let start = -1;
  let frames = 0;
  let done = false;
  return {
    tick(now: number): number | null {
      if (done) return null;
      if (first < 0) {
        first = now;
        return null;
      }
      if (start < 0) {
        if (now - first < warmupMs) return null;
        start = now;
        return null;
      }
      frames++;
      const elapsed = now - start;
      if (elapsed >= windowMs) {
        done = true;
        return (frames * 1000) / elapsed;
      }
      return null;
    },
    get done() {
      return done;
    },
  };
}
