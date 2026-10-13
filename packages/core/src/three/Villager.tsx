import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { createMulberry32 } from '../lib/rng';
import { Character, type CharacterInfo } from './Character';
import { usePlayerState } from './WalkWorld';
import type { ClipName } from './clips';
import { DEFAULT_WANDER, createWanderState, stepWander, type WanderParams, type Waypoint } from './wander';

type GroupProps = Omit<ThreeElements['group'], 'id' | 'position' | 'rotation'>;

export interface VillagerProps extends GroupProps {
  /** Nhân vật có xương có clip walk và idle: "characters/dan-lang-ba-cu" hoặc "characters/dan-lang-nong-dan" */
  id: string;
  /** Các điểm mốc [x, z] để đi lại. Dưới 2 điểm thì đứng yên (idle). */
  waypoints: readonly Waypoint[];
  /** Điểm mốc bắt đầu (mặc định điểm đầu) */
  start?: number;
  /** Hạt giống cho thời gian đứng lại và thứ tự điểm */
  seed?: number;
  /** Ghi đè tham số đi lại (tốc độ mặc định lấy theo clip walk để chân không trượt) */
  wander?: Partial<WanderParams>;
  /** Vật cản tròn đi theo dân làng (dân làng cũng là vật cản): mỗi khung hình ghi vị trí vào x, z của nó */
  collider?: { x: number; z: number };
  /** Vật tương tác đi theo dân làng (nói chuyện bằng E): mỗi khung hình ghi vị trí vào x, z của nó */
  track?: { x: number; z: number };
  /**
   * Người chơi đang nói chuyện với dân làng này: đứng yên, quay mặt về người chơi cho tới khi hết. Không có thì người chơi đứng chắn đường
   * trong 1,5 phía trước vẫn làm dân làng dừng lại nhường (xem `stepWander`), khi ở trong <WalkWorld>.
   */
  hold?: boolean;
}

const CLIPS: readonly ClipName[] = ['idle', 'walk'];

/**
 * Dân làng đi lại theo điểm mốc (spec 03 mục 3.1): đi (walk) giữa các điểm, tới nơi thì đứng lại (idle) một lúc rồi đi
 * tiếp. Logic chọn điểm và hướng là hàm thuần ở `wander.ts`. Dùng trong <Scene3D>.
 */
export function Villager({ id, waypoints, start = 0, seed = 1, wander, collider, track, hold = false, ...group }: VillagerProps) {
  const root = useRef<Group>(null);
  const rng = useMemo(() => createMulberry32(seed), [seed]);
  const params = useRef<WanderParams>({ ...DEFAULT_WANDER, ...wander });
  const state = useMemo(() => createWanderState(waypoints, start, rng, params.current), [waypoints, start, rng]);
  const player = usePlayerState();
  const holdRef = useRef(hold);
  holdRef.current = hold;
  const [mode, setMode] = useState(state.mode);
  const shown = useRef(state.mode);

  const onReady = (info: CharacterInfo) => {
    // Đi đúng tốc độ ngầm của clip walk thì chân không trượt (trừ khi người gọi ghi đè).
    if (info.walkSpeed && info.walkSpeed > 0.05 && wander?.speed === undefined) params.current.speed = info.walkSpeed;
  };

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    stepWander(state, waypoints, params.current, Math.min(dt, 0.1), rng, player, holdRef.current);
    g.position.set(state.x, 0, state.z);
    g.rotation.y = state.yaw;
    if (collider) {
      collider.x = state.x;
      collider.z = state.z;
    }
    if (track) {
      track.x = state.x;
      track.z = state.z;
    }
    if (state.mode !== shown.current) {
      shown.current = state.mode;
      setMode(state.mode);
    }
  });

  return (
    <group ref={root} position={[state.x, 0, state.z]} {...group}>
      <Character id={id} clips={CLIPS} animation={mode === 'walk' ? 'walk' : 'idle'} onReady={onReady} />
    </group>
  );
}
