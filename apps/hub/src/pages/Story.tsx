import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { STORY, VnDialog, fmt, storyTheme, ui, useAuth, type VnTurn } from '@so-chung/core';
import { StoryBackdrop } from './StoryBackdrop';

/**
 * Trang cốt truyện /truyen (spec 04 mục 2): 14 lượt kiểu visual novel. Ảnh truyện ở phần trên, lời ở dưới
 * (qua fmt), nền là chính ảnh đang xem làm mờ. Ảnh kế tiếp được tải trước; ảnh thiếu thì hiện khung trống.
 */
export default function Story() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const ten = profile?.display_name;
  const [turn, setTurn] = useState(0);
  const turns = useMemo<VnTurn[]>(
    () => STORY.map((f) => ({ image: f.image, background: f.image, text: fmt(f.text, { ten }) })),
    [ten],
  );
  const toMap = () => navigate('/ban-do');
  return (
    <VnDialog
      turns={turns}
      onFinish={toMap}
      onSkip={toMap}
      finishLabel={ui.truyen.batDauHanhTrinh}
      background=""
      label={ui.truyen.tieuDe}
      onTurnChange={setTurn}
      // Nền ấm và icon theo lượt: mở đầu (1–2), làng (3–11), hội làng (12–14); ảnh đang xem làm mờ phủ khoảng 35%
      backdrop={<StoryBackdrop theme={storyTheme(turn + 1)} image={STORY[turn]?.image ?? STORY[0].image} />}
    />
  );
}
