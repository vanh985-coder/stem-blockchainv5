import { describe, expect, it } from 'vitest';
import { FESTIVAL_LAUNCHED, STORY, fmt, phanDien } from '@so-chung/core';
import { climaxMotion, climaxSteps, finishLabelOf } from './climaxFlow';

const TEN = 'Minh';

describe('cảnh cao trào sau màn 12', () => {
  it('bốn bước a, b, c, d theo thứ tự; không trao trang thì chỉ a, b, c', () => {
    expect(climaxSteps({ ten: TEN, award: true }).map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(climaxSteps({ ten: TEN, award: false }).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('bước a và c là ảnh truyện số 10 và 11 với đúng chữ của /truyen (STORY), không viết lại', () => {
    const [a, , c] = climaxSteps({ ten: TEN, award: true });
    const f10 = STORY.find((s) => s.n === 10)!;
    const f11 = STORY.find((s) => s.n === 11)!;
    expect(a.turns).toEqual([{ image: f10.image, text: fmt(f10.text, { ten: TEN }) }]);
    expect(c.turns).toEqual([{ image: f11.image, text: fmt(f11.text, { ten: TEN }) }]);
    expect(a.scene).toBe(false);
    expect(c.scene).toBe(false);
  });

  it('bước b: cảnh 3D; {phanDien} nói câu "Sửa trang thì cả chuỗi lệch…" đúng spec, cụ Bình "Biết sai thì sửa…", {phanDien} "Có ạ!"; lời qua chân dung', () => {
    const b = climaxSteps({ ten: TEN, award: true })[1];
    expect(b.scene).toBe(true);
    expect(b.turns).toHaveLength(3);
    expect(b.turns.map((t) => t.portrait)).toEqual(['ti', 'cu-binh', 'ti']);
    expect(b.turns[0].text).toBe('Sửa trang thì cả chuỗi lệch, gian thì mất cọc, giả dấu thì bị soi ra, tráo lá thì số gốc đổi… Hóa ra làm thật mới có lời.');
    expect(b.turns[1].text).toBe(`Biết sai thì sửa. Làng đang cần thêm người giữ sổ cẩn thận. ${phanDien} có muốn làm không?`);
    expect(b.turns[2].text).toBe('Có ạ!');
    expect(b.turns.map((t) => t.speaker)).toEqual(['Tí', 'Cụ Bình', 'Tí']);
  });

  it('bước d: thầy Linh trao trang với hàng 4 ô, rồi Bi "Đủ 4 trang rồi! Cả làng đang chuẩn bị mở hội." kèm dòng "Hội làng sắp mở" (hội làng chưa ra mắt)', () => {
    const d = climaxSteps({ ten: TEN, award: true })[3];
    expect(d.scene).toBe(true);
    expect(d.turns[0]).toMatchObject({ portrait: 'thay-linh', text: 'Thầy Linh trao Trang Sổ Vàng thứ tư.', pagesRow: true });
    expect(d.turns[1]).toMatchObject({ speaker: 'Bi', portrait: 'bi', text: 'Đủ 4 trang rồi! Cả làng đang chuẩn bị mở hội.', note: 'Hội làng sắp mở' });
    expect(d.turns.filter((t) => t.pagesRow)).toHaveLength(1);
  });

  it('bước d theo cờ hội làng: mặc định theo FESTIVAL_LAUNCHED (false); đã ra mắt thì Bi "Cả làng đang mở hội." và không còn dòng "Hội làng sắp mở"', () => {
    expect(FESTIVAL_LAUNCHED).toBe(false);
    const off = climaxSteps({ ten: TEN, award: true, festivalLaunched: false })[3];
    expect(off.turns[1]).toMatchObject({ text: 'Đủ 4 trang rồi! Cả làng đang chuẩn bị mở hội.', note: 'Hội làng sắp mở' });
    expect(climaxSteps({ ten: TEN, award: true })[3]).toEqual(off);
    const on = climaxSteps({ ten: TEN, award: true, festivalLaunched: true })[3];
    expect(on.turns[1]).toMatchObject({ speaker: 'Bi', text: 'Đủ 4 trang rồi! Cả làng đang mở hội.' });
    expect(on.turns[1].note).toBeUndefined();
    expect(on.turns[0]).toEqual(off.turns[0]);
  });

  it('mọi lượt có chữ, không còn chỗ giữ tên chưa thay, không viết cứng tên phản diện trong chữ nguồn', () => {
    for (const step of climaxSteps({ ten: TEN, award: true })) {
      for (const t of step.turns) {
        expect(t.text.trim().length).toBeGreaterThan(0);
        expect(t.text).not.toMatch(/[{}]/);
      }
    }
  });

  it('nút lượt cuối: bước cuối là "Xem kết quả" (xem lại thì "Xong"), bước khác để mặc định', () => {
    expect(finishLabelOf(3, 4, false)).toBe('Xem kết quả');
    expect(finishLabelOf(3, 4, true)).toBe('Xong');
    expect(finishLabelOf(2, 3, false)).toBe('Xem kết quả');
    expect(finishLabelOf(0, 4, false)).toBeUndefined();
    expect(finishLabelOf(1, 4, true)).toBeUndefined();
  });

  it('hoạt cảnh 3D: {phanDien} cúi đầu ở hai lượt đầu bước b rồi nhảy cẫng khi nói "Có ạ!"; cụ Bình và thầy Linh nói thì "talking"', () => {
    const steps = climaxSteps({ ten: TEN, award: true });
    const b = steps[1];
    expect(climaxMotion(b, 0)).toEqual({ tiBow: true, tiCheer: false, talking: null });
    expect(climaxMotion(b, 1)).toEqual({ tiBow: true, tiCheer: false, talking: 'cuBinh' });
    expect(climaxMotion(b, 2)).toEqual({ tiBow: false, tiCheer: true, talking: null });
    const d = steps[3];
    expect(climaxMotion(d, 0)).toEqual({ tiBow: false, tiCheer: false, talking: 'thayLinh' });
    expect(climaxMotion(d, 1)).toEqual({ tiBow: false, tiCheer: false, talking: null });
    // chỉ số ngoài khoảng được kẹp lại
    expect(climaxMotion(b, 99).tiCheer).toBe(false);
  });
});
