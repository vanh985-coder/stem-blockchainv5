/**
 * Chọn ký hiệu hiện trên bản đồ nhỏ và bản đồ lớn (mốc 2, bước X4). Hàm thuần: nhận bố cục thế giới và tiến độ, trả về danh sách ký hiệu theo tọa độ thế giới.
 *
 * Quy tắc:
 * - Cổng làng: luôn hiện, mở hoặc khóa.
 * - Biển màn chơi: bản đồ lớn hiện cả 4 làng; bản đồ nhỏ chỉ hiện biển của làng em đang ở (ở ngoài làng biển nằm quá xa, hiện lên chỉ rối). Trạng thái: xong, đang mở, khóa, sắp ra mắt.
 * - Thẻ "Em có biết?" chưa nhặt (P2b): cả 4 làng, cả hai bản đồ, kể cả khi em đang ngoài làng; thẻ đã nhặt không hiện. Bản đồ nhỏ chỉ VẼ thẻ nằm trong vòng đang hiện (`placeMarker` ẩn ký hiệu ngoài vòng).
 * - Điểm đến của nhiệm vụ: đúng nút mà mũi tên dưới chân đang chỉ tới.
 * - Tên làng: bản đồ nhỏ đặt cạnh đường ra làng (nhìn thấy khi ở chợ), bản đồ lớn đặt giữa chỗ của làng.
 */
import type { VillageId } from '../../../village';
import type { LevelState } from '../../../progress/unlock';
import { hasKnowCard } from '../../../progress/knowCards';
import type { WorldVillage } from '../worldLayout';
import { reservedCenter } from '../worldLayout';

export type BoardMark = 'done' | 'open' | 'locked' | 'soon';

/** Ký hiệu của một biển theo trạng thái màn (màn chưa có trạng thái coi như khóa). */
export function boardMark(state: LevelState | undefined): BoardMark {
  if (state === 'done') return 'done';
  if (state === 'open') return 'open';
  if (state === 'coming-soon') return 'soon';
  return 'locked';
}

export type MapMarker =
  | { id: string; kind: 'gate'; x: number; z: number; village: VillageId; open: boolean }
  | { id: string; kind: 'board'; x: number; z: number; village: VillageId; level: number; mark: BoardMark }
  | { id: string; kind: 'scroll'; x: number; z: number; village: VillageId; index: number }
  | { id: string; kind: 'target'; x: number; z: number }
  | { id: string; kind: 'name'; x: number; z: number; village: VillageId };

export type MapVillageInput = Pick<WorldVillage, 'id' | 'frame' | 'gate' | 'center'> & {
  layout: { boards: readonly { level: number; x: number; z: number }[]; scrolls?: readonly { index: number; x: number; z: number }[] };
};

export interface MarkerInput {
  villages: readonly MapVillageInput[];
  /** Cổng nào đang mở (theo mã cổng) */
  gateOpen: Readonly<Record<string, boolean>>;
  /** Trạng thái hiện của từng màn (đã tính việc chặn vì chưa đủ thẻ; giáo viên thấy mọi thứ đã mở) */
  levelStates: Readonly<Record<number, LevelState | undefined>>;
  /** Làng em đang ở trong (đã qua cổng), hoặc null */
  inside: VillageId | null;
  /** Mặt nạ thẻ đã nhặt (hiệu lực) theo làng */
  knowMasks: Readonly<Record<string, number>>;
  /** Điểm đến của nhiệm vụ (tọa độ thế giới), hoặc null khi không có */
  target: { x: number; z: number } | null;
}

/** Tên làng trên bản đồ nhỏ nằm cạnh đường ra làng, cách tâm chợ bấy nhiêu và lệch sang bên bấy nhiêu (không đè lên cổng cách 72, vừa trong vòng khi đứng ở chợ). */
export const NAME_DISTANCE_ON_ROAD = 46;
export const NAME_LATERAL = 9;

/** Chỗ đặt tên làng trên bản đồ nhỏ: đường bắc, nam lệch sang đông; đường tây, đông lệch lên phía bắc. */
export function miniNamePoint(f: { dirX: number; dirZ: number }): { x: number; z: number } {
  return { x: f.dirX * NAME_DISTANCE_ON_ROAD + (f.dirZ !== 0 ? -NAME_LATERAL : 0), z: f.dirZ * NAME_DISTANCE_ON_ROAD + (f.dirX !== 0 ? NAME_LATERAL : 0) };
}

export type MapScope = 'mini' | 'big';

export function mapMarkers(input: MarkerInput, scope: MapScope): MapMarker[] {
  const out: MapMarker[] = [];
  for (const v of input.villages) {
    out.push({ id: `gate:${v.gate.id}`, kind: 'gate', x: v.gate.x, z: v.gate.z, village: v.id, open: input.gateOpen[v.gate.id] === true });
    if (scope === 'big') {
      const c = reservedCenter(v.frame);
      out.push({ id: `name:${v.id}`, kind: 'name', x: c.x, z: c.z, village: v.id });
    } else {
      const q = miniNamePoint(v.frame);
      out.push({ id: `name:${v.id}`, kind: 'name', x: q.x, z: q.z, village: v.id });
    }
    if (scope === 'big' || input.inside === v.id) {
      for (const b of v.layout.boards) out.push({ id: `board:${v.id}:${b.level}`, kind: 'board', x: b.x, z: b.z, village: v.id, level: b.level, mark: boardMark(input.levelStates[b.level]) });
    }
    const mask = input.knowMasks[v.id] ?? 0;
    for (const s of v.layout.scrolls ?? []) {
      if (!hasKnowCard(mask, s.index)) out.push({ id: `scroll:${v.id}:${s.index}`, kind: 'scroll', x: s.x, z: s.z, village: v.id, index: s.index });
    }
  }
  if (input.target) out.push({ id: 'target', kind: 'target', x: input.target.x, z: input.target.z });
  return out;
}
