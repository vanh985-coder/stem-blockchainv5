import { describe, expect, it } from 'vitest';
import type { Manifest } from '../assets/manifest';
import { TYPE_CPS, glyphs, portraitForMood, revealedCount, splitRevealed, stepOnNext } from './vnLogic';

const entry = { file: 'x.webp', bytes: 1, width: 1, height: 1 };
const withSmile: Manifest = { 'ui/portraits/bac-an': entry, 'ui/portraits/bac-an-cuoi': entry };
const noSmile: Manifest = { 'ui/portraits/bac-an': entry };

describe('chọn ảnh chân dung theo tâm trạng', () => {
  it('lượt vui và manifest có bản cười thì dùng bản cười', () => {
    expect(portraitForMood('bac-an', 'vui', withSmile)).toBe('bac-an-cuoi');
  });

  it('lượt vui nhưng không có bản cười thì giữ ảnh thường', () => {
    expect(portraitForMood('bac-an', 'vui', noSmile)).toBe('bac-an');
    expect(portraitForMood('cu-binh', 'vui', withSmile)).toBe('cu-binh'); // người khác chưa có bản cười
  });

  it('không có tâm trạng thì luôn ảnh thường, kể cả khi có bản cười', () => {
    expect(portraitForMood('bac-an', undefined, withSmile)).toBe('bac-an');
  });

  it('manifest chưa tải xong thì giữ ảnh thường (không lỗi)', () => {
    expect(portraitForMood('bac-an', 'vui', null)).toBe('bac-an');
    expect(portraitForMood('bac-an', 'vui', undefined)).toBe('bac-an');
  });
});

describe('lời hiện dần', () => {
  const text = 'Chào em! Đây là Làng Giấy.'; // 26 ký tự

  it('khoảng 35 ký tự mỗi giây', () => {
    expect(TYPE_CPS).toBe(35);
    expect(revealedCount(0, 100)).toBe(0);
    expect(revealedCount(1000, 100)).toBe(35);
    expect(revealedCount(500, 100)).toBe(17);
    expect(revealedCount(100, 100)).toBe(3);
  });

  it('không vượt tổng số ký tự, không âm, lời rỗng thì 0', () => {
    expect(revealedCount(60_000, 26)).toBe(26);
    expect(revealedCount(-5, 26)).toBe(0);
    expect(revealedCount(Number.NaN, 26)).toBe(0);
    expect(revealedCount(1000, 0)).toBe(0);
  });

  it('tách chữ đã hiện và chưa hiện; chữ có dấu và emoji không bị cắt đôi', () => {
    expect(splitRevealed(text, 0)).toEqual({ shown: '', rest: text });
    expect(splitRevealed(text, 8)).toEqual({ shown: 'Chào em!', rest: ' Đây là Làng Giấy.' });
    expect(splitRevealed(text, 999)).toEqual({ shown: text, rest: '' });
    expect(glyphs('A💡B')).toEqual(['A', '💡', 'B']);
    expect(splitRevealed('A💡B', 2).shown).toBe('A💡');
  });

  it('thời gian trôi thì chữ hiện đủ rồi mới dừng', () => {
    const total = glyphs(text).length;
    let prev = -1;
    for (let ms = 0; ms <= 1000; ms += 50) {
      const c = revealedCount(ms, total);
      expect(c).toBeGreaterThanOrEqual(prev); // không bao giờ lùi
      prev = c;
    }
    expect(prev).toBe(total);
  });
});

describe('bấm "Tiếp" khi chữ chưa hiện hết', () => {
  it('lần đầu hiện hết ngay, lần hai mới sang lượt', () => {
    const total = glyphs('Lời thoại khá dài để hiện dần.').length;
    let count = revealedCount(300, total); // đang hiện dở
    expect(count).toBeLessThan(total);
    expect(stepOnNext(count, total)).toBe('reveal');
    count = total; // hiện hết ngay
    expect(splitRevealed('Lời thoại khá dài để hiện dần.', count).rest).toBe('');
    expect(stepOnNext(count, total)).toBe('advance');
  });

  it('chữ đã hiện hết sẵn thì bấm một lần là sang lượt', () => {
    expect(stepOnNext(12, 12)).toBe('advance');
    expect(stepOnNext(0, 0)).toBe('advance'); // lượt không có lời
  });
});
