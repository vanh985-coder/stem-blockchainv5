/**
 * Nhiệm vụ, cổng mở/khóa và mũi tên chỉ đường ở chợ phiên 3D (spec 04 mục 3 "Cổng làng", "HUD" và mục 5). Hàm thuần, không import three.
 * Từ P3a cả 4 cổng mở từ đầu (unlock.ts); nhiệm vụ vẫn gợi ý làng theo số Trang Sổ Vàng nhưng không chặn làng nào.
 */
import { FESTIVAL_LAUNCHED } from '../../config/festival';
import { BI_NHAC_HOI_SAP_MO, BI_NHAC_NHIEM, NHIEM_VU, NHIEM_VU_HOI_SAP_MO } from '../../content/dialogues';
import { VILLAGE_ORDER } from '../../content/levels';
import type { VillageId } from '../../village';
import { type GateId } from './marketLayout';

/** Thứ tự cổng theo thứ tự làng: Giấy, Dệt, Khắc Dấu, Bạc. */
export const GATE_ORDER: readonly GateId[] = ['giay', 'det', 'khac-dau', 'bac'];

/** Làng của từng cổng. */
export const GATE_VILLAGE: Readonly<Record<GateId, VillageId>> = {
  giay: 'lang-giay',
  det: 'lang-det',
  'khac-dau': 'lang-khac-dau',
  bac: 'lang-bac',
};

/** Số Trang Sổ Vàng tối đa. */
export const MAX_PAGES = GATE_ORDER.length;

/** Số Trang Sổ Vàng đưa về số nguyên trong [0, 4] (số lạ thì 0). */
export function clampPages(goldenPages: number): number {
  if (!Number.isFinite(goldenPages)) return 0;
  return Math.max(0, Math.min(MAX_PAGES, Math.floor(goldenPages)));
}

/**
 * Cổng `id` đang mở không: giáo viên mở hết; còn lại theo `villageOpen` (từ `computeUnlock`, theo thứ tự `VILLAGE_ORDER`). Từ P3a cả 4 cổng mở từ đầu
 * (`computeUnlock` trả cả 4 làng mở); thiếu dữ liệu thì coi là mở, chỉ đóng khi `villageOpen` nói rõ `false`.
 */
export function isGateOpen(id: GateId, villageOpen: readonly boolean[], isTeacher: boolean): boolean {
  if (isTeacher) return true;
  const k = GATE_ORDER.indexOf(id);
  return villageOpen[k] !== false;
}

/**
 * Hiệu ứng "then gỗ và dây đỏ rơi" khi tới cổng làng kế tiếp sau khi nhận Trang Sổ Vàng: tắt từ P3a vì cổng đã mở từ đầu (mã hiệu ứng và cờ `gateOpenSeen` đã lưu được giữ nguyên, không đặt lại tiến độ).
 */
export const GATE_OPENING_CEREMONY = false;

/** Trạng thái mở của cả 4 cổng. */
export function gateStates(villageOpen: readonly boolean[], isTeacher: boolean): Record<GateId, boolean> {
  return {
    giay: isGateOpen('giay', villageOpen, isTeacher),
    det: isGateOpen('det', villageOpen, isTeacher),
    'khac-dau': isGateOpen('khac-dau', villageOpen, isTeacher),
    bac: isGateOpen('bac', villageOpen, isTeacher),
  };
}

/** Làng phải giúp trước khi cổng này mở (làng đứng trước trong thứ tự); cổng đầu tiên thì null. */
export function previousVillage(id: GateId): VillageId | null {
  const k = GATE_ORDER.indexOf(id);
  return k <= 0 ? null : VILLAGE_ORDER[k - 1];
}

/** Chỉ số nhiệm vụ (0 đến 4) theo số Trang Sổ Vàng: 0 trang là "Đến Làng Giấy…", 4 trang là hội làng. */
export function questIndex(goldenPages: number): number {
  return clampPages(goldenPages);
}

/**
 * Dòng nhiệm vụ theo số Trang Sổ Vàng (chưa qua fmt). Đủ 4 trang: hội làng đã ra mắt (`launched`, mặc định `FESTIVAL_LAUNCHED`) thì mời dự hội, chưa thì "Hội làng sắp mở" (không mũi tên,
 * không điểm đến: `questGate` đã trả null).
 */
export function questLine(goldenPages: number, launched: boolean = FESTIVAL_LAUNCHED): string {
  const k = questIndex(goldenPages);
  return k >= MAX_PAGES && !launched ? NHIEM_VU_HOI_SAP_MO : NHIEM_VU[k];
}

/** Câu Bi nói theo số Trang Sổ Vàng (chưa qua fmt); đủ 4 trang mà hội làng chưa ra mắt thì "Hội làng sắp mở". */
export function biQuestLine(goldenPages: number, launched: boolean = FESTIVAL_LAUNCHED): string {
  const k = questIndex(goldenPages);
  return k >= MAX_PAGES && !launched ? BI_NHAC_HOI_SAP_MO : BI_NHAC_NHIEM[k];
}

/** Cổng cần tới theo nhiệm vụ (mũi tên chỉ về đó); đủ 4 trang thì không còn cổng nào để tới (hội làng). */
export function questGate(goldenPages: number): GateId | null {
  const k = questIndex(goldenPages);
  return k < MAX_PAGES ? GATE_ORDER[k] : null;
}

/** Cổng vừa mở sau khi làng `giver` trao Trang Sổ Vàng (cổng của làng kế tiếp); làng cuối (Bạc) không mở cổng nào nên null. */
export function gateOpenedAfter(giver: VillageId): GateId | null {
  const k = VILLAGE_ORDER.indexOf(giver);
  return k < 0 || k + 1 >= GATE_ORDER.length ? null : GATE_ORDER[k + 1];
}

/** Mũi tên dưới chân ẩn khi người chơi đã tới gần đích (trong bấy nhiêu đơn vị). */
export const ARROW_HIDE_DISTANCE = 6;
