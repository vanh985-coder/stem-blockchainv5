import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { Actor25D, Character, type Aim, type ClipName, type PoseRequest } from '@so-chung/core/three/index';
import { ACTORS, REDUCED_MOTION_SCALE, VILLAIN_TIMING, villainFx, worldHeightOf, worldPoint, type VillainStage } from './rebuildLayout';

/** Phản ứng của học sinh theo kết quả: sad (đặt sai), point (chỉ về rổ hay về {phanDien}), cheer (ghép xong chuỗi). `n` tăng mỗi lần để phát lại. */
export interface Reaction {
  kind: 'none' | 'sad' | 'point' | 'cheer';
  n: number;
}

/** Hướng chỉ của học sinh: về bên phải khung (rổ và {phanDien} ở bên phải), hơi nâng tay. */
const POINT_AIM: Aim = { az: 0.95, el: 0.12 };

/** Bác An đứng ở mép trái (model không xương, đứng yên), quay mặt về phía bàn chơi. */
export function BacAnActor() {
  const p = worldPoint(ACTORS.bacAn.fx, ACTORS.bacAn.fy);
  return (
    <Actor25D x={p.x} y={p.y} layer="actorsBack" height={worldHeightOf(ACTORS.bacAn.heightPct)} facing="right">
      <Character id="characters/bac-an" mood="talking" />
    </Actor25D>
  );
}

const STUDENT_CLIPS: readonly ClipName[] = ['idle', 'cheer'];

/** Học sinh đứng cạnh Bác An: đứng yên (idle), vui (cheer) khi ghép xong chuỗi, buồn (sad) khi sai, chỉ tay (point) về rổ hay về {phanDien}. */
export function StudentActor({ reaction }: { reaction: Reaction }) {
  const p = worldPoint(ACTORS.student.fx, ACTORS.student.fy);
  const pose = useMemo<PoseRequest | undefined>(() => (reaction.kind === 'sad' ? { name: 'sad', n: reaction.n } : undefined), [reaction.kind, reaction.n]);
  const aim = reaction.kind === 'point' ? POINT_AIM : null;
  const cheering = reaction.kind === 'cheer';
  return (
    <Actor25D x={p.x} y={p.y} layer="actors" height={worldHeightOf(ACTORS.student.heightPct)}>
      <Character id="characters/hoc-sinh-nam" animation={cheering ? 'cheer' : 'idle'} trigger={reaction.n} returnTo="idle" clips={STUDENT_CLIPS} pose={pose} aim={aim} />
    </Actor25D>
  );
}

const VILLAIN_CLIPS: readonly ClipName[] = ['idle', 'run', 'cheer'];

/**
 * {phanDien} chạy vào từ bên phải dải giữa (run, quay mặt sang trái), đứng cười (cheer) để thả trang giả, rồi chạy ra (run, quay mặt sang phải). Vị trí cập nhật mỗi khung
 * bằng `villainFx` (không cấp phát); `startedAt` là mốc `performance.now()` lúc bắt đầu (0 = chưa bắt đầu, ẩn).
 */
export function VillainActor({ stage, startedAt, reduced }: { stage: VillainStage; startedAt: number; reduced: boolean }) {
  const group = useRef<Group>(null);
  const y = worldPoint(0, ACTORS.villainStop.fy).y;
  const scale = reduced ? REDUCED_MOTION_SCALE : 1;
  const moving = stage === 'enter' || stage === 'exit';
  const facing = stage === 'exit' ? 'right' : moving ? 'left' : 'front';
  const clip: ClipName = moving ? 'run' : stage === 'cheer' ? 'cheer' : 'idle';
  const visible = stage === 'enter' || stage === 'cheer' || stage === 'exit';

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.visible = visible;
    if (!visible) return;
    const t = (performance.now() - startedAt) / 1000;
    g.position.x = worldPoint(villainFx(t, scale), 0).x;
  });
  // đặt ngay vị trí đúng khi mới hiện (khung đầu tiên chưa kịp chạy useFrame)
  useEffect(() => {
    const g = group.current;
    if (g && visible) g.position.x = worldPoint(villainFx((performance.now() - startedAt) / 1000, scale), 0).x;
  }, [visible, startedAt, scale]);

  return (
    <group ref={group} visible={false}>
      <Actor25D x={0} y={y} layer="actorsBack" height={worldHeightOf(ACTORS.villainStop.heightPct)} facing={facing}>
        <Character id="characters/ti" animation={clip} trigger={stage === 'cheer' ? VILLAIN_TIMING.dropAt : 0} returnTo="idle" clips={VILLAIN_CLIPS} />
      </Actor25D>
    </group>
  );
}
