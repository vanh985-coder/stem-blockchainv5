import { describe, expect, it } from 'vitest';
import { dialogueFor, momentBeforeStation } from '../../lesson2d/flow';
import { CHARACTER_IDS, EXTRA_VARS, makeFmt, characterNames } from '../characters';
import { PEOPLE, generateMedium, sign, verify } from '../../lessons/bai-3/logic';
import { bai3Lesson, bai3Logic, bai3Names, bai3Texts } from './bai-3';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);

function allStrings(node: unknown, path = 'bai3', out: [string, string][] = []): [string, string][] {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) allStrings(v, `${path}.${k}`, out);
  return out;
}

describe('content/lessons/bai-3.ts', () => {
  const strings = [...allStrings(bai3Lesson, 'lesson'), ...allStrings(bai3Texts, 'texts')];

  it('khóa có tên theo trạm và nội dung (không còn t01, t02…), chuỗi không thừa khoảng trắng đầu cuối', () => {
    for (const [group, items] of Object.entries(bai3Texts)) {
      for (const [key, text] of Object.entries(items as Record<string, string>)) {
        expect(key, `${group}.${key}`).not.toMatch(/^t\d+$/);
        if (key !== 'khoaKiemTra' && key !== 'ketLuan') expect(text, `${group}.${key}`).toBe(text.trim());
      }
    }
  });

  it('có chữ và không câu nào rỗng', () => {
    expect(strings.length).toBeGreaterThan(150);
    for (const [path, s] of strings) expect(s.trim(), path).not.toBe('');
  });

  it('chỉ dùng chỗ giữ tên hợp lệ', () => {
    for (const [path, s] of strings) {
      for (const m of s.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `${path}: {${m[1]}}`).toBe(true);
    }
  });

  it('không viết cứng tên phản diện, không còn "Linh", emoji nhân vật cũ', () => {
    for (const [path, s] of strings) {
      expect(s, path).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
      expect(s, path).not.toMatch(/(^|[^\p{L}])Linh(?![\p{L}])/u);
      for (const e of ['🦊', '🐢', '🐇', '⚽', '🎒']) expect(s, path).not.toContain(e);
    }
  });

  it('lời chú Dũng đúng bảng "Màn 7" của spec 07 (không có lời trước trạm Khó)', () => {
    const d = bai3Lesson.dialogue;
    expect(dialogueFor(d, momentBeforeStation(0))).toEqual([
      {
        characterId: 'chuDung',
        text: 'Khuôn riêng cất kín, chỉ cháu biết. Mẫu công khai thì treo cho cả làng xem. Có mẫu, ai cũng kiểm được dấu thật hay giả.',
      },
    ]);
    expect(dialogueFor(d, momentBeforeStation(1))).toEqual([
      { characterId: 'chuDung', text: '{phanDien} vừa gửi mấy lá thư giả, còn kèm cả mẫu dấu tự làm. Nhớ chỉ tin bảng mẫu của làng thôi!' },
    ]);
    expect(dialogueFor(d, momentBeforeStation(2))).toEqual([]);
    expect(dialogueFor(d, 'cuoiBai')).toEqual([{ characterId: 'chuDung', text: 'Mất khuôn riêng là mất hết, không ai lấy lại giúp được đâu.' }]);
  });

  it('lời trao trang là lời "Kết thúc làng" của spec 07', () => {
    expect(bai3Lesson.award.chuThich).toBe('Chú Dũng trao Trang Sổ Vàng thứ ba.');
    expect(bai3Lesson.award.loi).toEqual([
      { characterId: 'chuDung', text: 'Không giả dấu được nữa, {phanDien} chuyển sang trò trộn giao dịch ở Làng Bạc rồi.' },
    ]);
  });

  it('có 5 thẻ "Em có biết?"', () => {
    expect(bai3Lesson.emCoBiet).toHaveLength(5);
  });

  it('đổi tên phản diện thì chữ đổi theo', () => {
    const cuoi = makeFmt({ ...characterNames(), phanDien: 'Cuội' });
    expect(cuoi(bai3Lesson.stations.kho.tieuDe)).toBe('Làm thử Cuội: đoán ngược khóa riêng');
  });
});

describe('Bài 3: số khóa và chuỗi được ký giữ nguyên sau khi chuyển chữ sang content/', () => {
  it('bảng khóa đúng spec 07: em 12→18, bác An 15→19, cụ Bình 17→15, cô Chi 19→7, chú Dũng 21→14, phản diện 13→21', () => {
    expect(PEOPLE.map((p) => [p.id, p.privateKey, p.publicKey])).toEqual([
      ['em', 12, 18],
      ['an', 15, 19],
      ['binh', 17, 15],
      ['chi', 19, 7],
      ['dung', 21, 14],
      ['ti', 13, 21],
    ]);
  });

  it('5 bạn: Giang 3, Hoa 5, Khang 6, Lan 7, Minh 9; người khóa riêng 7 tên là Lan (không còn Linh)', () => {
    expect(Object.values(bai3Names)).toEqual(['Giang', 'Hoa', 'Khang', 'Lan', 'Minh']);
  });

  it('chuỗi ký "Chuyển 3 xu cho An" vẫn ra { r: 20, s: 1 } và khớp khóa 18', () => {
    expect(sign(12, 'Chuyển 3 xu cho An', 5)).toEqual({ r: 20, s: 1 });
    expect(verify(18, 'Chuyển 3 xu cho An', { r: 20, s: 1 })).toBe(true);
  });

  it('thông điệp do generateMedium tạo giữ đúng dạng "Chuyển N xu cho <tên>"', () => {
    expect(bai3Logic.thongDiep).toBe('Chuyển {n} xu cho {nguoi}');
    const txs = generateMedium(() => 0.5, 'Em');
    for (const tx of txs) expect(tx.message).toMatch(/^Chuyển \d+ xu cho Em$/);
  });
});
