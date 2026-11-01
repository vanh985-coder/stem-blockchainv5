/**
 * Tính tọa độ an toàn và góc quay (yaw) cho tính năng dịch chuyển trên bản đồ lớn (mốc 2, bước X4).
 * Hàm thuần, không import React hay Three.
 *
 * Quy tắc tính điểm an toàn:
 * - Tâm chợ: nút tâm chợ của roadGraph (nút ring:6 quanh cây đa), quay mặt về (0, 0).
 * - Cổng làng: gateApproachSpawn (cách cổng 8,5 đơn vị về phía chợ), quay mặt vào cổng.
 * - Biển màn: nút đường riêng trước biển (roadGraph: board:<level>), quay mặt về phía biển.
 * - Thẻ "Em có biết?": điểm cách thẻ 3 đơn vị, về phía nút đường gần nhất, quay mặt về phía thẻ.
 */
import type { VillageId } from '../../village';
import type { GateId } from '../cho/marketLayout';
import { assembleWorld, gateApproachSpawn, boardNodeId, type WorldLayout } from './worldLayout';
import { banDoDichChuyen } from '../../content/minimap';
import { levelById } from '../../content/levels';
import { fmt } from '../../content/characters';
import type { MapMarker } from './map/mapMarkers';

export type TeleportDestination =
  | { kind: 'market' }
  | { kind: 'gate'; village: VillageId }
  | { kind: 'board'; village: VillageId; level: number }
  | { kind: 'scroll'; village: VillageId; index: number };

export type TeleportMarker = Extract<MapMarker, { kind: 'gate' | 'board' | 'scroll' }>;

export function isTeleportMarker(m: MapMarker): m is TeleportMarker {
  return m.teleport === true && (m.kind === 'gate' || m.kind === 'board' || m.kind === 'scroll');
}

export type TeleportTargetInput = TeleportDestination | TeleportMarker | { kind: 'market' };

let cachedWorld: WorldLayout | null = null;
function getWorld(world?: WorldLayout): WorldLayout {
  if (world) return world;
  if (!cachedWorld) cachedWorld = assembleWorld();
  return cachedWorld;
}

export interface TeleportTargetResult {
  x: number;
  z: number;
  yaw: number;
}

/**
 * Tính điểm an toàn và hướng quay mặt (yaw) tới mục tiêu cho một điểm dịch chuyển.
 */
export function teleportTarget(dest: TeleportTargetInput, world?: WorldLayout): TeleportTargetResult {
  const w = getWorld(world);

  if (dest.kind === 'market') {
    const ringNode = w.graph.nodes.find((n) => n.id === 'ring:6') ?? w.graph.nodes.find((n) => n.id.startsWith('ring:')) ?? { x: 0, z: -12.5 };
    const x = ringNode.x;
    const z = ringNode.z;
    const yaw = Math.atan2(0 - x, 0 - z);
    return { x, z, yaw };
  }

  if (dest.kind === 'gate') {
    const v = w.villages.find((q) => q.id === dest.village);
    const gateId: GateId = v ? v.frame.gate : dest.village === 'lang-giay' ? 'giay' : dest.village === 'lang-det' ? 'det' : dest.village === 'lang-khac-dau' ? 'khac-dau' : 'bac';
    const spawn = gateApproachSpawn(w, gateId, 8.5);
    if (!spawn) throw new Error(`Gate approach spawn not found for village ${dest.village}`);
    return { x: spawn.x, z: spawn.z, yaw: spawn.yaw };
  }

  if (dest.kind === 'board') {
    const node = w.graph.nodes.find((n) => n.id === boardNodeId(dest.level));
    if (!node) throw new Error(`Road graph node not found for board level ${dest.level}`);
    let bx = node.x;
    let bz = node.z;
    for (const v of w.villages) {
      const b = v.layout.boards.find((q) => q.level === dest.level);
      if (b) {
        bx = b.x;
        bz = b.z;
        break;
      }
    }
    const yaw = Math.atan2(bx - node.x, bz - node.z);
    return { x: node.x, z: node.z, yaw };
  }

  if (dest.kind === 'scroll') {
    const v = w.villages.find((q) => q.id === dest.village);
    const s = v?.layout.scrolls?.find((q) => q.index === dest.index);
    const sx = s?.x ?? ('x' in dest ? (dest as { x: number }).x : 0);
    const sz = s?.z ?? ('z' in dest ? (dest as { z: number }).z : 0);

    let bestNode = w.graph.nodes[0];
    let bestDist = Infinity;
    for (const n of w.graph.nodes) {
      const d = Math.hypot(n.x - sx, n.z - sz);
      if (d < bestDist) {
        bestDist = d;
        bestNode = n;
      }
    }

    const vx = bestNode.x - sx;
    const vz = bestNode.z - sz;
    const len = Math.hypot(vx, vz);
    const px = sx + (len > 0 ? (vx / len) * 3 : 0);
    const pz = sz + (len > 0 ? (vz / len) * 3 : 3);
    const yaw = Math.atan2(sx - px, sz - pz);
    return { x: px, z: pz, yaw };
  }

  throw new Error(`Non-teleportable marker kind: ${(dest as { kind: string }).kind}`);
}

/**
 * Tên thân thiện hiển thị cho điểm dịch chuyển trên khung xác nhận.
 */
export function destinationName(
  dest: TeleportTargetInput,
  names: Readonly<Record<VillageId, string>>,
): string {
  if (dest.kind === 'market') return banDoDichChuyen.tamCho;
  if (dest.kind === 'gate') return fmt(banDoDichChuyen.congLang, { lang: names[dest.village] });
  if (dest.kind === 'board') {
    const l = levelById(dest.level);
    return fmt(l?.bien ?? banDoDichChuyen.manMacDinh, { so: dest.level });
  }
  if (dest.kind === 'scroll') {
    return fmt(banDoDichChuyen.the, { so: dest.index + 1, lang: names[dest.village] });
  }
  return '';
}
