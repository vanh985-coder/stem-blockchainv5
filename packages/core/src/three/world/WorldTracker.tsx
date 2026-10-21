import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { VILLAGE_ORDER } from '../../content/levels';
import type { VillageId } from '../../village';
import type { GateId } from '../cho/marketLayout';
import { usePlayerState } from '../WalkWorld';
import { GATE_TRIGGER_DISTANCE, insideVillage, nearGate, newZoneState, onRoadTo, rimDistance, stepPrewarm, stepZone, type ZoneState } from './worldZones';
import type { WorldVillage } from './worldLayout';

export type LoadedZones = Readonly<Record<VillageId, boolean>>;
/** Làng nào đang được chuẩn bị sẵn (xem `stepPrewarm`) */
export type PrewarmZones = Readonly<Record<VillageId, boolean>>;

export interface WorldTrackerProps {
  villages: readonly WorldVillage[];
  /** Làng của nhiệm vụ hiện tại: luôn được chuẩn bị sẵn (null: đủ 4 trang, không có) */
  mission: VillageId | null;
  /** Báo khi một vùng làng được tải hay dọn (kèm trạng thái của cả 4 vùng) */
  onZones: (loaded: LoadedZones) => void;
  /** Báo khi một làng bắt đầu hay thôi được chuẩn bị sẵn (kèm trạng thái của cả 4 làng) */
  onPrewarm: (prewarm: PrewarmZones) => void;
  /** Báo khi người chơi bước qua cổng vào làng (hoặc ra khỏi làng: null) */
  onInside: (village: VillageId | null) => void;
  /** Báo khi tới gần một cổng trong `GATE_TRIGGER_DISTANCE` (hoặc rời xa: null) */
  onNearGate: (gate: GateId | null) => void;
}

/** Kiểm tra vị trí mỗi bấy nhiêu giây (không cần mỗi khung hình). */
const TICK = 0.15;

/**
 * Theo dõi người chơi ở thế giới mở: tải và dọn vùng làng theo khoảng cách tới rìa làng (`stepZone`, có độ trễ), biết đang ở trong làng nào (đã qua cổng) và đang gần cổng nào. Chỉ gọi nơi dùng khi giá trị
 * ĐỔI. Đặt trong <WalkWorld> (đọc vị trí người chơi). Không cấp phát trong useFrame.
 */
export function WorldTracker({ villages, mission, onZones, onPrewarm, onInside, onNearGate }: WorldTrackerProps) {
  const missionRef = useRef(mission);
  missionRef.current = mission;
  const player = usePlayerState();
  const zones = useMemo<ZoneState[]>(() => villages.map(() => newZoneState()), [villages]);
  const gates = useMemo(() => villages.map((v) => ({ id: v.gate.id, x: v.gate.x, z: v.gate.z })), [villages]);
  const live = useRef({ onZones, onPrewarm, onInside, onNearGate });
  live.current = { onZones, onPrewarm, onInside, onNearGate };
  const st = useRef({ t: 0, tick: TICK, inside: null as VillageId | null, gate: null as GateId | null, loaded: villages.map(() => false) });
  const sent = useRef(false);

  // dựng lại khi danh sách làng đổi
  useEffect(() => {
    st.current = { t: 0, tick: TICK, inside: null, gate: null, loaded: villages.map(() => false) };
    sent.current = false;
  }, [villages]);

  useFrame((_, dt) => {
    if (!player) return;
    const s = st.current;
    s.t += dt;
    s.tick += dt;
    if (s.tick < TICK && sent.current) return;
    s.tick = 0;
    let changed = !sent.current;
    let prewarmChanged = !sent.current;
    let inside: VillageId | null = null;
    for (let i = 0; i < villages.length; i++) {
      const v = villages[i];
      const rim = rimDistance(v.center.x, v.center.z, v.radius, player.x, player.z);
      if (stepZone(zones[i], rim, s.t)) changed = true;
      if (stepPrewarm(zones[i], rim, v.id === missionRef.current || onRoadTo(v.frame.dirX, v.frame.dirZ, player.x, player.z))) prewarmChanged = true;
      if (insideVillage(v.center.x, v.center.z, player.x, player.z, v.insideRadius)) inside = v.id;
    }
    const gate = nearGate(gates, player.x, player.z, GATE_TRIGGER_DISTANCE);
    if (changed) {
      const loaded = Object.fromEntries(VILLAGE_ORDER.map((id) => [id, zones[villages.findIndex((v) => v.id === id)].loaded])) as Record<VillageId, boolean>;
      s.loaded = villages.map((_, i) => zones[i].loaded);
      live.current.onZones(loaded);
    }
    if (prewarmChanged) live.current.onPrewarm(Object.fromEntries(VILLAGE_ORDER.map((id) => [id, zones[villages.findIndex((v) => v.id === id)].prewarm])) as Record<VillageId, boolean>);
    if (!sent.current || inside !== s.inside) {
      s.inside = inside;
      live.current.onInside(inside);
    }
    if (!sent.current || gate !== s.gate) {
      s.gate = gate;
      live.current.onNearGate(gate);
    }
    sent.current = true;
  });
  return null;
}
