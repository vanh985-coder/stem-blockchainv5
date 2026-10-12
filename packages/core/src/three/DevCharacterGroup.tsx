import { Bi } from './Bi';
import { Character } from './Character';
import { Villager } from './Villager';
import type { Waypoint } from './wander';

/** 10 nhân vật đứng thành hàng (cách nhau 1,3 đơn vị), chừa chỗ cuối hàng cho Bi. */
const ROW: readonly string[] = [
  'characters/hoc-sinh-nam',
  'characters/ti',
  'characters/bac-an',
  'characters/cu-binh',
  'characters/co-chi',
  'characters/chu-dung',
  'characters/thay-linh',
  'characters/lai-buon',
];
const SPACING = 1.3;
const X0 = -((ROW.length) * SPACING) / 2 + SPACING / 2;

/** Đường đi vòng hình chữ nhật phía trước hàng, ngược chiều nhau. */
const LOOP_A: readonly Waypoint[] = [
  [-4, 2.5],
  [4, 2.5],
  [4, 4.5],
  [-4, 4.5],
];
const LOOP_B: readonly Waypoint[] = [...LOOP_A].reverse();

/**
 * Cảnh thử "Xem cả nhóm" ở /dev/3d: 10 nhân vật và Bi cạnh nhau để so chiều cao; 6 người đứng yên nhún lệch pha
 * (một người đang nói); bà cụ và chú nông dân đi vòng.
 */
export function DevCharacterGroup() {
  return (
    <group>
      {ROW.map((id, i) => (
          <Character
            key={id}
            id={id}
            position={[X0 + i * SPACING, 0, 0]}
            clips={['idle']}
            animation="idle"
            seed={i + 1}
            mood={id === 'characters/thay-linh' ? 'talking' : 'idle'}
            lookAt={id === 'characters/thay-linh' ? [0, 1, 20] : undefined}
          />
      ))}
      <Bi position={[X0 + ROW.length * SPACING, 1.4, 0]} seed={3} />
      <Villager id="characters/dan-lang-ba-cu" waypoints={LOOP_A} seed={11} />
      <Villager id="characters/dan-lang-nong-dan" waypoints={LOOP_B} seed={23} />
    </group>
  );
}
