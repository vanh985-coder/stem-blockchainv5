import { describe, expect, it } from 'vitest';
import { dialogueFor, momentBeforeStation } from '../../lesson2d/flow';
import { CHARACTER_IDS, EXTRA_VARS, fmt } from '../characters';
import { bai1Lesson, bai1Texts } from './bai-1';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);

function allStrings(node: unknown, path = 'bai1', out: [string, string][] = []): [string, string][] {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) allStrings(v, `${path}.${k}`, out);
  return out;
}

describe('content/lessons/bai-1.ts', () => {
  const strings = [...allStrings(bai1Lesson, 'lesson'), ...allStrings(bai1Texts, 'texts')];

  it('có chữ và không câu nào rỗng', () => {
    expect(strings.length).toBeGreaterThan(60);
    for (const [path, s] of strings) {
      // characterId cũng là chuỗi; chỉ kiểm chuỗi chữ
      expect(s.trim(), path).not.toBe('');
    }
  });

  it('chỉ dùng chỗ giữ tên hợp lệ', () => {
    for (const [path, s] of strings) {
      for (const m of s.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `${path}: {${m[1]}}`).toBe(true);
    }
  });

  it('không viết cứng tên phản diện, không còn "Linh vật", emoji cáo hay nút "Sang Bài"', () => {
    for (const [path, s] of strings) {
      expect(s, path).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
      expect(s, path).not.toMatch(/linh vật/i);
      expect(s, path).not.toContain('🦊');
      expect(s, path).not.toMatch(/Sang Bài \d/);
    }
  });

  it('không còn câu của linh vật trùng với lời bác An ở cuối trạm Khó', () => {
    // Câu "Không kịp! Một người không thể sửa nhanh hơn cả mạng lưới cùng ghi sổ." của linh vật đã bỏ; bác An nói ở cuối bài.
    // (Dòng "Điều em vừa học" của trạm Khó là kiến thức, giữ nguyên như giai đoạn 1.)
    const khoText = JSON.stringify(bai1Texts.kho);
    expect(khoText).not.toContain('Không kịp!');
    expect(Object.keys(bai1Texts.kho)).not.toContain('mascotSad');
  });

  it('đúng 4 lời của bác An ở spec 05 "Màn 1"', () => {
    const d = bai1Lesson.dialogue;
    expect(dialogueFor(d, momentBeforeStation(0))).toEqual([
      {
        characterId: 'bacAn',
        text: 'Mỗi trang sổ ghi Nội dung và Mã trang. Mã trang = (mã trang trước × 2 + nội dung), chỉ giữ 2 chữ số cuối. Nhờ thế các trang móc vào nhau như mắt xích.',
      },
    ]);
    const tb = dialogueFor(d, momentBeforeStation(1));
    expect(tb).toHaveLength(1);
    expect(fmt(tb[0].text)).toBe('Đêm qua Tí lẻn vào sửa một trang. Cháu thử sửa lại xem có dễ không!');
    expect(tb[0].aside?.characterId).toBe('phanDien'); // chân dung {phanDien} cười
    expect(tb[0].aside?.text).toBe('Hì hì!');
    expect(dialogueFor(d, momentBeforeStation(2))[0].text).toBe('Làng vẫn ghi trang mới liên tục. Thử sửa cho kịp xem nào.');
    expect(dialogueFor(d, 'cuoiBai')[0].text).toBe('Một người không thể sửa nhanh hơn cả làng cùng ghi sổ.');
    for (const m of ['dauBai', 'truocTb', 'truocKho', 'cuoiBai'] as const) expect(d[m][0].characterId, m).toBe('bacAn');
  });

  it('lời trao trang là lời "Kết thúc làng" của spec 05', () => {
    expect(bai1Lesson.award.chuThich).toBe('Bác An trao Trang Sổ Vàng thứ nhất.');
    expect(bai1Lesson.award.loi).toEqual([
      {
        characterId: 'bacAn',
        text: 'Một mình giữ sổ thì kẻ gian vẫn ngồi sửa cả đêm được. Vì thế các làng không bao giờ để sổ ở một nơi. Xuống Làng Dệt mà xem.',
      },
    ]);
  });

  it('dòng "Điều em vừa học" của trạm Khó không lặp lời bác An cuối bài', () => {
    expect(bai1Texts.kho.hocDuoc).not.toContain('Một người không thể sửa nhanh hơn');
  });

  it('thẻ "Em có biết?" đủ 4 thẻ giữ thuật ngữ thật', () => {
    expect(bai1Lesson.emCoBiet).toHaveLength(4);
    expect(bai1Lesson.emCoBiet[3].text).toContain('hàm băm');
  });
});
