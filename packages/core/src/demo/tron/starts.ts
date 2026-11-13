/** Đơn vị cảnh của chế độ trọn (chỉ dữ liệu, nhẹ): mã đoạn, đường vào và tiến độ dựng sẵn khi bắt đầu bằng `&tu=`. Phần chạy nằm ở `scenes.ts`. */
import type { TronStart } from './preset';

export interface TronUnitMeta {
  id: string;
  /** Mã đoạn theo thứ tự xuất hiện trong đơn vị */
  codes: readonly string[];
  /** Hạn giờ (mili giây): quá hạn là kẹt */
  timeoutMs: number;
  /** Đường vào khi bắt đầu từ đơn vị này bằng `&tu=` */
  route: string;
  start: TronStart;
}

const none = { cardsDone: false, sceneSeen: false, levels: [] } as const;
const carded = (prior: number, levels: readonly number[]): TronStart => ({ prior, cardsDone: true, sceneSeen: true, levels });
const seen = (prior: number): TronStart => ({ prior, cardsDone: false, sceneSeen: true, levels: [] });

export const TRON_UNIT_META: readonly TronUnitMeta[] = [
  { id: 'mo-dau', codes: ['S01', 'S02', 'S03'], timeoutMs: 600_000, route: '/', start: { prior: 0, ...none } },
  { id: 'giay-di-bo', codes: ['G01', 'G02'], timeoutMs: 600_000, route: '/cho', start: { prior: 0, ...none } },
  { id: 'giay-the', codes: ['G03', 'G04', 'G05', 'G06'], timeoutMs: 900_000, route: '/cho?tu=lang-giay', start: seen(0) },
  { id: 'giay-man-1', codes: ['G07', 'G08', 'G09', 'G10'], timeoutMs: 1_200_000, route: '/cho?tu=lang-giay', start: carded(0, []) },
  { id: 'giay-man-2', codes: ['G11', 'G12'], timeoutMs: 600_000, route: '/lang/lang-giay/man/2', start: carded(0, [1]) },
  { id: 'giay-man-3', codes: ['G13', 'G14', 'G15'], timeoutMs: 900_000, route: '/lang/lang-giay/man/3', start: carded(0, [1, 2]) },
  { id: 'det-vao', codes: ['D01', 'D02'], timeoutMs: 600_000, route: '/cho', start: { prior: 1, ...none } },
  { id: 'det-the', codes: ['D03'], timeoutMs: 600_000, route: '/cho?tu=lang-det', start: seen(1) },
  { id: 'det-man-4', codes: ['D04', 'D05', 'D06', 'D07'], timeoutMs: 1_500_000, route: '/cho?tu=lang-det', start: carded(1, []) },
  { id: 'det-man-5', codes: ['D08', 'D09'], timeoutMs: 600_000, route: '/lang/lang-det/man/5', start: carded(1, [4]) },
  { id: 'det-man-6', codes: ['D10', 'D11', 'D12'], timeoutMs: 600_000, route: '/lang/lang-det/man/6', start: carded(1, [4, 5]) },
  { id: 'kd-vao', codes: ['K01'], timeoutMs: 600_000, route: '/cho', start: { prior: 2, ...none } },
  { id: 'kd-the', codes: ['K02'], timeoutMs: 600_000, route: '/cho?tu=lang-khac-dau', start: seen(2) },
  { id: 'kd-man-7', codes: ['K03', 'K04', 'K05', 'K06'], timeoutMs: 1_800_000, route: '/cho?tu=lang-khac-dau', start: carded(2, []) },
  { id: 'kd-man-8', codes: ['K07'], timeoutMs: 900_000, route: '/lang/lang-khac-dau/man/8', start: carded(2, [7]) },
  { id: 'kd-man-9', codes: ['K08', 'K09', 'K10'], timeoutMs: 900_000, route: '/lang/lang-khac-dau/man/9', start: carded(2, [7, 8]) },
];

export function metaOfCode(code: string): TronUnitMeta | null {
  return TRON_UNIT_META.find((u) => u.codes.includes(code)) ?? null;
}
