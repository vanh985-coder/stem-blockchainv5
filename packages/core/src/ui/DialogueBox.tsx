import { useMemo } from 'react';
import { CHARACTERS, fmt, speakerLabel, type CharacterId, type FmtVars } from '../content/characters';
import { VnDialog, type VnTurn } from './VnDialog';

export interface DialogueTurn {
  characterId: CharacterId;
  /** Lời thoại; đi qua fmt() nên được dùng {ten}, {phanDien}… */
  text: string;
  /** Chân dung phụ kèm một câu ngắn, ví dụ {phanDien} cười "Hì hì!" */
  aside?: { characterId: CharacterId; text: string };
}

export interface DialogueBoxProps {
  turns: DialogueTurn[];
  /** Gọi khi bấm nút ở lượt cuối */
  onFinish: () => void;
  /** Gọi khi bấm "Bỏ qua"; không có thì gọi onFinish */
  onSkip?: () => void;
  /** Tên nút ở lượt cuối; không có thì "Tiếp ›" */
  finishLabel?: string;
  /** Biến cho fmt(), ví dụ { ten: 'Lan' } */
  vars?: FmtVars;
  className?: string;
}

/** Đổi lượt thoại theo nhân vật thành lượt của VnDialog (chân dung lớn, tên người nói, lời đã qua fmt). */
export function toVnTurns(turns: readonly DialogueTurn[], vars?: FmtVars): VnTurn[] {
  return turns.map((t) => ({
    speaker: speakerLabel(t.characterId, vars),
    portrait: CHARACTERS[t.characterId].portrait,
    text: fmt(t.text, vars),
    aside: t.aside
      ? { portrait: CHARACTERS[t.aside.characterId].portrait, speaker: speakerLabel(t.aside.characterId, vars), text: fmt(t.aside.text, vars) }
      : undefined,
  }));
}

/**
 * Hộp thoại có chân dung lớn: nhiều lượt nói, "Tiếp ›" (→, Enter, Space), "‹" lùi (←) và "Bỏ qua" (Esc).
 * Dùng VnDialog nên giống hộp thoại ở truyện và giới thiệu làng; các thời điểm thoại do nơi gọi quyết định.
 */
export function DialogueBox({ turns, onFinish, onSkip, finishLabel, vars, className }: DialogueBoxProps) {
  const vnTurns = useMemo(() => toVnTurns(turns, vars), [turns, vars]);
  return <VnDialog turns={vnTurns} onFinish={onFinish} onSkip={onSkip} finishLabel={finishLabel} className={className} />;
}
