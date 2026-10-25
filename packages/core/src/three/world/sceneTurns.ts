import { CHARACTERS, fmt, speakerLabel } from '../../content/characters';
import { STORY } from '../../content/story';
import { VILLAGE_SCENE } from '../../content/villageScene';
import type { VnTurn } from '../../ui/VnDialog';
import type { VillageId } from '../../village';

/**
 * Các lượt của cảnh mở đầu một làng (ảnh truyện, rồi lời người dẫn); null nếu làng chưa có cảnh. Dùng cho cả cảnh thật lúc bước qua cổng lẫn hộp thoại làm ấm trước
 * (`scenePreload.ts`), nên hai bên luôn giống hệt nhau.
 */
export function openingSceneTurns(village: VillageId, ten: string | undefined): VnTurn[] | null {
  const text = VILLAGE_SCENE[village];
  if (!text) return null;
  const frame = STORY.find((s) => s.n === text.storyFrame);
  const turns: VnTurn[] = [];
  if (frame) turns.push({ image: frame.image, background: frame.image, text: fmt(frame.text, { ten }) });
  turns.push({ speaker: speakerLabel(text.guide), portrait: CHARACTERS[text.guide].portrait, text: fmt(text.opening, { ten }) });
  return turns;
}

/** Ảnh (đường dẫn trong manifest, không đuôi) mà cảnh mở đầu của làng vẽ: ảnh truyện và chân dung người dẫn. Làng chưa có cảnh thì rỗng. */
export function sceneAssetPaths(village: VillageId): string[] {
  const text = VILLAGE_SCENE[village];
  if (!text) return [];
  const frame = STORY.find((s) => s.n === text.storyFrame);
  const out: string[] = [];
  if (frame) out.push(frame.image);
  out.push(`ui/portraits/${CHARACTERS[text.guide].portrait}`);
  return out;
}
