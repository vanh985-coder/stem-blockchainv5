import { describe, expect, it } from 'vitest';
import { VILLAGE_ORDER } from './levels';
import { bai1Lesson } from './lessons/bai-1';
import { bai2Lesson } from './lessons/bai-2';
import { bai3Lesson } from './lessons/bai-3';
import { bai4Lesson } from './lessons/bai-4';
import { villageKnowCards } from './villageCards';

describe('thẻ "Em có biết?" của làng', () => {
  it('lấy đúng thẻ của bài học làng đó (không viết lại)', () => {
    expect(villageKnowCards('lang-giay')).toBe(bai1Lesson.emCoBiet);
    expect(villageKnowCards('lang-det')).toBe(bai2Lesson.emCoBiet);
    expect(villageKnowCards('lang-khac-dau')).toBe(bai3Lesson.emCoBiet);
    expect(villageKnowCards('lang-bac')).toBe(bai4Lesson.emCoBiet);
  });
  it('làng nào cũng có thẻ, mỗi thẻ có tiêu đề và lời', () => {
    for (const v of VILLAGE_ORDER) {
      const cards = villageKnowCards(v);
      expect(cards.length, v).toBeGreaterThanOrEqual(4);
      for (const c of cards) {
        expect(c.title.length).toBeGreaterThan(0);
        expect(c.text.length).toBeGreaterThan(0);
      }
    }
  });
});
