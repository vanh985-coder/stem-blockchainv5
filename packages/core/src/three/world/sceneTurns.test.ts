import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../../content/characters';
import { STORY } from '../../content/story';
import { VILLAGE_SCENE } from '../../content/villageScene';
import { openingSceneTurns, sceneAssetPaths } from './sceneTurns';

describe('cảnh mở đầu làng: các lượt và ảnh cần nạp trước (bước L4)', () => {
  it('mọi làng có cảnh (Giấy, Dệt, Khắc Dấu, Bạc): hai lượt, ảnh truyện rồi lời người dẫn', () => {
    for (const id of ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'] as const) {
      const turns = openingSceneTurns(id, 'Lan')!;
      expect(turns, id).toHaveLength(2);
      const frame = STORY.find((s) => s.n === VILLAGE_SCENE[id]!.storyFrame)!;
      expect(turns[0].image).toBe(frame.image);
      expect(turns[0].background).toBe(frame.image);
      expect(turns[1].portrait).toBe(CHARACTERS[VILLAGE_SCENE[id]!.guide].portrait);
      for (const t of turns) expect(t.text).not.toMatch(/[{}]/);
    }
  });

  it('ảnh cần nạp trước khớp đúng những ảnh mà hộp thoại sẽ vẽ (ảnh truyện, chân dung người dẫn)', () => {
    for (const id of ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'] as const) {
      const turns = openingSceneTurns(id, undefined)!;
      expect(sceneAssetPaths(id)).toEqual([turns[0].image, `ui/portraits/${turns[1].portrait}`]);
    }
  });

  it('Làng Bạc (bước L5): ảnh truyện số 9 rồi lời thầy Linh', () => {
    const turns = openingSceneTurns('lang-bac', 'Lan')!;
    expect(turns[0].image).toBe('story/09-lang-bac');
    expect(turns[1].portrait).toBe(CHARACTERS.thayLinh.portrait);
    expect(sceneAssetPaths('lang-bac')).toEqual(['story/09-lang-bac', `ui/portraits/${CHARACTERS.thayLinh.portrait}`]);
  });
});
