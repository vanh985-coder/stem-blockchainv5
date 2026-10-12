import { useMemo, useRef } from 'react';
import { Character } from './Character';
import { Scene3D } from './Scene3D';
import { choiceReactions, type Reaction, type ReactionStore } from './choiceReactions';
import { aimFromRects } from './poses';
import type { QualityChoice } from './quality';
import { rectOf, useReaction } from './useReaction';

export interface ReactionStageProps {
  /** Lớp CSS cho khung (phải có kích thước) */
  className?: string;
  quality?: QualityChoice;
  /** Hiện cả {phanDien} (Tí) bên phải học sinh */
  rival?: boolean;
  /** Kho sự kiện (mặc định: kho dùng chung của ứng dụng) */
  store?: ReactionStore;
}

const CLIPS = ['idle', 'cheer'] as const;
const pose = (r: Reaction) => (r.pose ? { name: r.pose, n: r.poseN } : undefined);

/**
 * Khung 3D phản ứng khi chọn đáp án (spec 03 mục 4): nghe kho `choiceReactions`.
 * Học sinh quay đầu và người về phía đáp án đang rê/focus/chạm kèm point; có kết quả thì đúng: học sinh cheer và
 * {phanDien} hurt; sai: học sinh sad và {phanDien} cheer; rồi cả hai về idle.
 * Bước sau gắn khung này vào trang bài học (hai khung hai bên bảng).
 */
export function ReactionStage({ className = '', quality, rival = true, store = choiceReactions }: ReactionStageProps) {
  const state = useReaction(store);
  const frame = useRef<HTMLDivElement>(null);
  // Hướng nhìn tính từ tâm khung 3D tới đáp án (đo lại mỗi khi đổi đáp án).
  const aim = useMemo(() => {
    const el = frame.current;
    return el && state.target ? aimFromRects(rectOf(el), state.target) : null;
  }, [state.target]);

  return (
    <div ref={frame} className={className}>
      <Scene3D quality={quality} autoDowngrade={!quality} camera={{ position: [0, 1.0, 5.4], fov: 32 }} lookAt={[0, 0.9, 0]} shadowExtent={6}>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[30, 40]} />
          <meshStandardMaterial color="#9bc47a" roughness={1} />
        </mesh>
        <Character
          id="characters/hoc-sinh-nam"
          position={[rival ? -0.9 : 0, 0, 0]}
          clips={CLIPS}
          animation={state.student.clip}
          trigger={state.student.clipN}
          pose={pose(state.student)}
          aim={aim}
        />
        {rival && (
          <Character id="characters/ti" position={[0.9, 0, 0]} clips={CLIPS} animation={state.rival.clip} trigger={state.rival.clipN} pose={pose(state.rival)} />
        )}
      </Scene3D>
    </div>
  );
}
