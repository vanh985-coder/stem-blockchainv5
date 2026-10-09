import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { STORY, VnDialog, fmt, ui, useAuth, type VnTurn } from '@so-chung/core';

/**
 * Trang cốt truyện /truyen (spec 04 mục 2): 14 lượt kiểu visual novel. Ảnh truyện ở phần trên, lời ở dưới
 * (qua fmt), nền là chính ảnh đang xem làm mờ. Ảnh kế tiếp được tải trước; ảnh thiếu thì hiện khung trống.
 */
export default function Story() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const ten = profile?.display_name;
  const turns = useMemo<VnTurn[]>(
    () => STORY.map((f) => ({ image: f.image, background: f.image, text: fmt(f.text, { ten }) })),
    [ten],
  );
  const toMap = () => navigate('/ban-do');
  return <VnDialog turns={turns} onFinish={toMap} onSkip={toMap} finishLabel={ui.truyen.batDauHanhTrinh} background="" label={ui.truyen.tieuDe} />;
}
