import { useMemo } from 'react';
import { useSettings } from '../settings/SettingsProvider';
import { resolveQuality, type DeviceInfo, type QualityChoice, type QualityLevel } from './quality';
import { useSessionCap } from './qualityStore';

/** Đọc cấu hình máy. Chỉ gọi ở trình duyệt. */
export function readDevice(): DeviceInfo {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number });
  const coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)').matches : false;
  return { coarsePointer: coarse, cores: nav?.hardwareConcurrency, memoryGb: nav?.deviceMemory };
}

export interface UseQuality {
  /** Mức đang dùng thật (đã tính cài đặt, cấu hình máy và mức trần của phiên) */
  level: QualityLevel;
  /** Lựa chọn trong cài đặt (hoặc lựa chọn ghi đè) */
  choice: QualityChoice;
}

/**
 * Mức chất lượng cho cảnh 3D. `override` (ví dụ ở /dev/3d) thay cho cài đặt; dùng ngoài Canvas.
 * Không có `override` thì lấy từ cài đặt "Chất lượng đồ họa".
 */
export function useQuality(override?: QualityChoice): UseQuality {
  const { settings } = useSettings();
  const cap = useSessionCap();
  const device = useMemo(readDevice, []);
  const choice = override ?? settings.quality;
  return { choice, level: resolveQuality(choice, device, override ? undefined : cap) };
}
