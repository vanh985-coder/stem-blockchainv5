import { useRef } from 'react';
import { MiniGameLevel, climaxUi, hasSeenClimax, useProgress } from '@so-chung/core';
import { CLIMB_SPEC } from '../climb/climbConfig';
import { ClimbGame } from '../climb/ClimbGame';
import { ClimaxScene } from '../climax/ClimaxScene';

/**
 * Màn 12 "Leo cây tìm lá giả": game leo cây trên Scene25D, bọc trong khung game phụ (thẻ bắt đầu, màn kết quả). Ngay sau ván (hết vòng 4, hoặc hết tim sau khi Bi nói "Để Bi giúp em!") và trước
 * màn kết quả là cảnh cao trào; lần đầu tự chạy, những lần sau có nút "Xem lại cảnh cuối" ở màn kết quả. Trang Sổ Vàng thứ tư đã được ghi cùng kết quả ván (chơi xong là đủ điều kiện) nên đóng
 * tab giữa cảnh vẫn giữ trang; cảnh chỉ trao trang (bước d) khi trước ván này em chưa có trang thứ tư.
 */
export default function Man12() {
  const { progress, unlock } = useProgress();
  // Số Trang Sổ Vàng trước ván này, chụp lúc ván bắt đầu (sau ván đã là 4)
  const before = useRef<{ attempt: number; had4: boolean }>({ attempt: -1, had4: false });
  const seen = hasSeenClimax(progress.game.data);
  return (
    <MiniGameLevel
      levelId={12}
      medals={CLIMB_SPEC.medals}
      renderGame={(p) => {
        if (before.current.attempt !== p.attempt) before.current = { attempt: p.attempt, had4: unlock.goldenPages >= 4 };
        return <ClimbGame {...p} />;
      }}
      finale={{
        auto: !seen,
        replayLabel: climaxUi.xemLai,
        render: ({ replay, onDone }) => <ClimaxScene award={replay || !before.current.had4} replay={replay} onDone={onDone} />,
      }}
    />
  );
}
