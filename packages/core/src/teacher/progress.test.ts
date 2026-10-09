import { describe, expect, it } from 'vitest';
import { levelById } from '../content/levels';
import {
  buildProgressTable,
  cellText,
  filterStudents,
  formatDateTime,
  isVillageDone,
  levelCell,
  normalizeName,
  progressHeaders,
  progressRowText,
  type ClassProgressRow,
} from './progress';

const row = (over: Partial<ClassProgressRow>): ClassProgressRow => ({
  student_id: 's1',
  display_name: 'An',
  level_id: null,
  played: null,
  completed: null,
  stars: null,
  best_score: null,
  updated_at: null,
  golden_pages: null,
  ...over,
});

const ROWS: ClassProgressRow[] = [
  // Bình: bài 1 đủ 3 trạm, game 2 vàng; bài 4 mới có 1 trạm
  row({ student_id: 'b', display_name: 'Bình', level_id: 1, played: true, completed: true, stars: { de: 3, tb: 2, kho: 1 }, updated_at: '2026-03-01T08:00:00Z', golden_pages: 1 }),
  row({ student_id: 'b', display_name: 'Bình', level_id: 2, played: true, completed: true, stars: { game: 3 }, best_score: 90, updated_at: '2026-03-02T08:00:00Z', golden_pages: 1 }),
  row({ student_id: 'b', display_name: 'Bình', level_id: 4, played: true, completed: false, stars: { de: 2 }, updated_at: '2026-03-05T08:00:00Z', golden_pages: 1 }),
  // An: chưa chơi gì (một dòng level_id null)
  row({ student_id: 'a', display_name: 'An' }),
  // Đào: bài 1 xong, bài 4 xong; game chưa chơi
  row({ student_id: 'd', display_name: 'Đào', level_id: 1, played: true, completed: true, stars: { de: 1, tb: 1, kho: 1 }, updated_at: '2026-03-03T08:00:00Z', golden_pages: 2 }),
  row({ student_id: 'd', display_name: 'Đào', level_id: 4, played: true, completed: true, stars: { de: 3, tb: 3, kho: 3 }, updated_at: '2026-03-04T08:00:00Z', golden_pages: 2 }),
];

describe('buildProgressTable', () => {
  const table = buildProgressTable(ROWS);

  it('mỗi học sinh một hàng, xếp theo tên tiếng Việt', () => {
    expect(table.map((s) => s.name)).toEqual(['An', 'Bình', 'Đào']);
  });

  it('học sinh chưa chơi: không có màn nào, 0 sao, không có lần chơi', () => {
    const an = table[0];
    expect(an.levels).toEqual({});
    expect(an.totalStars).toBe(0);
    expect(an.lastPlayed).toBeNull();
    expect(an.goldenPages).toBe(0);
  });

  it('tổng sao chỉ cộng sao các bài học; game không tính', () => {
    expect(table[1].totalStars).toBe(3 + 2 + 1 + 2); // bài 1: 6, bài 4: 2
    expect(table[2].totalStars).toBe(3 + 9);
  });

  it('lần chơi gần nhất là mốc muộn nhất; số Trang Sổ Vàng lấy từ game_state', () => {
    expect(table[1].lastPlayed).toBe(Date.parse('2026-03-05T08:00:00Z'));
    expect(table[1].goldenPages).toBe(1);
    expect(table[2].goldenPages).toBe(2);
  });

  it('bỏ qua giá trị bất thường và không sửa mảng đầu vào', () => {
    const bad = [row({ student_id: 'x', display_name: 'X', level_id: 1, played: true, stars: { de: 99, tb: -4, kho: 'abc' } as never, golden_pages: 99 })];
    const copy = JSON.stringify(bad);
    const t = buildProgressTable(bad);
    expect(t[0].levels[1].stars).toEqual({ de: 3, tb: 0, kho: 0 });
    expect(t[0].goldenPages).toBe(4);
    expect(JSON.stringify(bad)).toBe(copy);
  });

  it('lớp trống thì bảng trống', () => {
    expect(buildProgressTable([])).toEqual([]);
  });
});

describe('ký hiệu trong ô', () => {
  const t = buildProgressTable(ROWS);
  const binh = t[1];
  const lesson1 = levelById(1)!;
  const game2 = levelById(2)!;

  it('chưa chơi thì ô trống', () => {
    expect(cellText(levelCell(lesson1, undefined))).toBe('');
    expect(cellText(levelCell(game2, t[0].levels[2]))).toBe('');
  });

  it('bài học: sao của 3 trạm Dễ, Trung bình, Khó', () => {
    expect(cellText(levelCell(lesson1, binh.levels[1]))).toBe('★3 ★2 ★1');
    expect(cellText(levelCell(levelById(4)!, binh.levels[4]))).toBe('★2 ★0 ★0');
  });

  it('game: ✓ kèm mốc đồng, bạc, vàng', () => {
    expect(cellText(levelCell(game2, binh.levels[2]))).toBe('✓ vàng');
    expect(cellText({ kind: 'game', medal: 1 })).toBe('✓ đồng');
    expect(cellText({ kind: 'game', medal: 2 })).toBe('✓ bạc');
    expect(cellText({ kind: 'game', medal: 0 })).toBe('✓');
  });
});

describe('isVillageDone và lọc "Chưa xong làng …"', () => {
  const t = buildProgressTable(ROWS);
  const [an, binh, dao] = t;

  it('làng xong khi mọi màn sẵn sàng xong; game sắp ra mắt không tính', () => {
    expect(isVillageDone(binh, 'lang-giay')).toBe(true); // mốc 1 chỉ có bài 1 sẵn sàng
    expect(isVillageDone(an, 'lang-giay')).toBe(false);
    expect(isVillageDone(binh, 'lang-det')).toBe(false); // bài 4 chưa đủ 3 trạm
    expect(isVillageDone(dao, 'lang-det')).toBe(true);
    expect(isVillageDone(dao, 'lang-khac-dau')).toBe(false);
  });

  it('lọc những em chưa xong một làng', () => {
    const names = (list: typeof t) => list.map((s) => s.name);
    expect(names(filterStudents(t, { notDoneVillage: 'lang-det' }))).toEqual(['An', 'Bình']);
    expect(names(filterStudents(t, { notDoneVillage: 'lang-giay' }))).toEqual(['An']);
    expect(names(filterStudents(t, { notDoneVillage: null }))).toEqual(['An', 'Bình', 'Đào']);
  });

  it('khi game của làng thành sẵn sàng thì phải chơi game mới xong', () => {
    const levels = [
      { ...levelById(1)!, status: 'ready' as const },
      { ...levelById(2)!, status: 'ready' as const },
    ];
    expect(isVillageDone(binh, 'lang-giay', levels)).toBe(true);
    expect(isVillageDone(dao, 'lang-giay', levels)).toBe(false);
  });
});

describe('tìm theo tên', () => {
  const t = buildProgressTable(ROWS);

  it('không phân biệt hoa thường và dấu', () => {
    expect(filterStudents(t, { query: 'binh' }).map((s) => s.name)).toEqual(['Bình']);
    expect(filterStudents(t, { query: 'ĐÀO' }).map((s) => s.name)).toEqual(['Đào']);
    expect(filterStudents(t, { query: 'dao' }).map((s) => s.name)).toEqual(['Đào']);
    expect(filterStudents(t, { query: '  ' })).toHaveLength(3);
    expect(filterStudents(t, { query: 'zzz' })).toEqual([]);
  });

  it('kết hợp tìm tên và lọc làng', () => {
    expect(filterStudents(t, { query: 'b', notDoneVillage: 'lang-det' }).map((s) => s.name)).toEqual(['Bình']);
    expect(filterStudents(t, { query: 'đ', notDoneVillage: 'lang-det' })).toEqual([]);
  });

  it('normalizeName', () => {
    expect(normalizeName('  Nguyễn Đức Việt ')).toBe('nguyen duc viet');
  });
});

describe('hàng chữ cho bảng và CSV', () => {
  it('cùng số cột với tiêu đề: tên, 12 màn, Sổ Vàng, tổng sao, lần chơi gần nhất', () => {
    const t = buildProgressTable(ROWS);
    const headers = progressHeaders();
    expect(headers).toHaveLength(1 + 12 + 3);
    expect(headers[0]).toBe('Học sinh');
    expect(headers[1]).toBe('Màn 1');
    expect(headers[12]).toBe('Màn 12');
    const r = progressRowText(t[1]);
    expect(r).toHaveLength(headers.length);
    expect(r[0]).toBe('Bình');
    expect(r[1]).toBe('★3 ★2 ★1');
    expect(r[2]).toBe('✓ vàng');
    expect(r[3]).toBe('');
    expect(r[13]).toBe('1');
    expect(r[14]).toBe('8');
    expect(r[15]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it('formatDateTime: giờ máy, rỗng nếu chưa chơi', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(0)).toBe('');
    expect(formatDateTime(new Date(2026, 2, 5, 8, 7).getTime())).toBe('05/03/2026 08:07');
  });
});
