import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { STORY, VnDialog, fmt, storyTheme, ui, useAuth, useProgress, useStoryGate, type VnTurn } from '@so-chung/core';
import { StoryBackdrop } from './StoryBackdrop';

/**
 * Trang cốt truyện /truyen (spec 04 mục 2): 14 lượt kiểu visual novel. Ảnh truyện ở phần trên, lời ở dưới
 * (qua fmt), nền là chính ảnh đang xem làm mờ. Ảnh kế tiếp được tải trước; ảnh thiếu thì hiện khung trống.
 * Lần đầu chơi (bước X1; `useStoryGate` là 'read'): không có "Bỏ qua", phải lật hết 14 lượt, trang cuối có nút "Vào chợ phiên" mở /cho và ghi cờ "đã đọc truyện". Đọc lại thì có "Bỏ qua" như cũ.
 */
export default function Story() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { markStoryRead } = useProgress();
  const gate = useStoryGate();
  const ten = profile?.display_name;
  const [turn, setTurn] = useState(0);
  const turns = useMemo<VnTurn[]>(
    () => STORY.map((f) => ({ image: f.image, background: f.image, text: fmt(f.text, { ten }) })),
    [ten],
  );
  // "Bỏ qua" (chỉ khi đọc lại) đi thẳng vào bản đồ; hết truyện ("Vào chợ phiên") ghi cờ đã đọc rồi vào chợ phiên 3D
  const toMap = () => navigate('/ban-do');
  const toMarket = () => {
    markStoryRead();
    navigate('/cho');
  };
  if (gate === 'wait') return <p className="p-6">{ui.chung.dangTai}</p>;
  return (
    <VnDialog
      turns={turns}
      onFinish={toMarket}
      onSkip={toMap}
      noSkip={gate === 'read'}
      finishLabel={ui.truyen.vaoChoPhien}
      background=""
      label={ui.truyen.tieuDe}
      onTurnChange={setTurn}
      // Nền ấm và icon theo lượt: mở đầu (1–2), làng (3–11), hội làng (12–14); ảnh đang xem làm mờ phủ khoảng 35%
      backdrop={<StoryBackdrop theme={storyTheme(turn + 1)} image={STORY[turn]?.image ?? STORY[0].image} />}
    />
  );
}
