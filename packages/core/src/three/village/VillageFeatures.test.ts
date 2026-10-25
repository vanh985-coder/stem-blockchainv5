import { describe, expect, it } from 'vitest';
import { characterNames, makeFmt, phanDien } from '../../content/characters';
import { stampBoardText } from '../../content/villageFeatures';
import { PEOPLE } from '../../lessons/bai-3/logic';
import { stampBoardEntries } from './VillageFeatures';

describe('bảng 6 mẫu dấu công khai (Làng Khắc Dấu): tên phản diện lấy từ {phanDien}', () => {
  it('chữ của bảng không viết cứng tên phản diện, tên người trong bảng đi qua {phanDien}', () => {
    expect(stampBoardText.ten.ti).toBe('{phanDien}');
    for (const text of Object.values(stampBoardText.ten)) expect(text).not.toContain(phanDien);
  });

  it('đổi tên phản diện thì tên trên bảng đổi theo, các tên khác và số không đổi', () => {
    const doi = makeFmt({ ...characterNames(), phanDien: 'Xyz' });
    const goc = stampBoardEntries();
    const moi = stampBoardEntries((t) => doi(t));
    expect(goc).toHaveLength(6);
    expect(moi).toHaveLength(6);
    const iGoc = goc.findIndex((e) => e.name === phanDien);
    expect(iGoc).toBeGreaterThanOrEqual(0);
    expect(moi[iGoc].name).toBe('Xyz');
    expect(moi.filter((e) => e.name === phanDien)).toHaveLength(0);
    moi.forEach((e, i) => {
      expect(e.key).toBe(goc[i].key);
      if (i !== iGoc) expect(e.name).toBe(goc[i].name);
    });
  });

  it('đúng 6 người của Bài 3, số là khóa công khai của họ; không còn chỗ giữ tên chưa thay', () => {
    const entries = stampBoardEntries();
    expect(entries.map((e) => e.key)).toEqual(PEOPLE.map((p) => p.publicKey));
    for (const e of entries) expect(e.name).not.toMatch(/[{}]/);
  });
});
