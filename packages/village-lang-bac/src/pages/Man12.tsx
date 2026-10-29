import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CLIMAX_QUERY, MiniGameLevel, canWatchClimax, climaxUi, goToMap, hasSeenClimax, progressManager, useProgress } from '@so-chung/core';
import { CLIMB_SPEC } from '../climb/climbConfig';
import { ClimbGame } from '../climb/ClimbGame';
import { ClimaxScene } from '../climax/ClimaxScene';

const CLIMAX_PARAM = CLIMAX_QUERY.split('=');

/**
 * Màn 12 "Leo cây tìm lá giả": game leo cây trên Scene25D, bọc trong khung game phụ (thẻ bắt đầu, màn kết quả). Ngay sau ván (hết vòng 4, hoặc hết tim sau khi Bi nói "Để Bi giúp em!") và trước
 * màn kết quả là cảnh cao trào, nhưng CHỈ khi em đã đủ 4 Trang Sổ Vàng (các làng vào độc lập nên màn 12 có thể xong trước: cảnh không được nói "đủ 4 trang" khi chưa đủ). Lần đầu tự chạy; những lần sau có
 * nút "Xem lại cảnh cuối" ở màn kết quả. Trang Sổ Vàng thứ tư đã được ghi cùng kết quả ván (chơi xong là đủ điều kiện) nên đóng tab giữa cảnh vẫn giữ trang.
 *
 * Màn 12 xong trước các làng khác: kết quả được ghi như thường; khi đủ trang về sau, cảnh xem được mà không phải chơi lại: nút "Xem cảnh cuối" ở màn kết quả của game vừa làm đủ trang và ở bảng Làng Bạc
 * trên `/ban-do` mở địa chỉ `/lang/lang-bac/man/12?canh=cuoi`, trang này chiếu thẳng cảnh (bước d trao trang chỉ ở lần xem đầu, tức khi cờ `climaxSeen` chưa có; xem lại thì không ghi cờ).
 */
export default function Man12() {
  const { progress } = useProgress();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const seen = hasSeenClimax(progress.game.data);
  // Chụp lúc vào trang: hết cảnh thì cờ `climaxSeen` được ghi và `seen` đổi, nhưng cảnh đang chiếu không được đổi số bước giữa chừng
  const [firstView] = useState(() => !seen);
  const watch = params.get(CLIMAX_PARAM[0]) === CLIMAX_PARAM[1] && canWatchClimax(progress);
  if (watch) {
    // Chiếu thẳng cảnh cuối (em bấm nút xem): chưa chiếu thì trao trang và ghi cờ khi hết hay "Bỏ qua"; đã chiếu thì là xem lại, không ghi gì
    return (
      <div data-testid="man-cuoi">
        <ClimaxScene award={firstView} replay={!firstView} onDone={() => goToMap(navigate)} />
      </div>
    );
  }
  return (
    <MiniGameLevel
      levelId={12}
      medals={CLIMB_SPEC.medals}
      renderGame={(p) => <ClimbGame {...p} />}
      finale={{
        auto: !seen,
        replayLabel: climaxUi.xemLai,
        // chỉ chiếu khi đã đủ 4 trang, xét đúng lúc ván kết thúc (sau khi kết quả đã ghi) và mỗi lần vẽ màn kết quả
        ready: () => canWatchClimax(progressManager.getSnapshot().progress),
        // lần xem đầu có bước trao trang; xem lại cũng có (như trước)
        render: ({ replay, onDone }) => <ClimaxScene award replay={replay} onDone={onDone} />,
      }}
    />
  );
}
