import type { StoryCard } from '../lessons/types';
import type { VillageId } from '../village';
import { bai1Lesson } from './lessons/bai-1';
import { bai2Lesson } from './lessons/bai-2';
import { bai3Lesson } from './lessons/bai-3';
import { bai4Lesson } from './lessons/bai-4';

/**
 * Thẻ "Em có biết?" của làng (hiện lần đầu vào làng, xem lại ở menu làng): chính là thẻ của bài học làng đó (`emCoBiet` của `LessonContent`), không viết lại.
 * Thẻ chỉ có ở trạm Khó (`emCoBietKho`) không đưa vào đây: em chưa làm trạm đó khi mới vào làng.
 */
const BY_VILLAGE: Readonly<Record<VillageId, readonly StoryCard[]>> = {
  'lang-giay': bai1Lesson.emCoBiet,
  'lang-det': bai2Lesson.emCoBiet,
  'lang-khac-dau': bai3Lesson.emCoBiet,
  'lang-bac': bai4Lesson.emCoBiet,
};

export function villageKnowCards(village: VillageId): readonly StoryCard[] {
  return BY_VILLAGE[village];
}
