import { describe, expect, it } from 'vitest';
import { bai1Lesson } from './lessons/bai-1';
import { bai2Lesson } from './lessons/bai-2';
import { bai3Lesson } from './lessons/bai-3';
import { bai4Lesson } from './lessons/bai-4';
import { fmt, phanDien } from './characters';
import { KNOW_QUIZ, knowQuizUi, type KnowQuiz } from './knowQuiz';
import { VILLAGE_ORDER } from './levels';
import { villageKnowCards } from './villageCards';
import { LOCAL_VILLAGES } from '../three/world/villages';
import { pageCode } from '../lib/chain';
import { publicKey } from '../lessons/bai-3/logic';
import { buildTree } from '../lessons/bai-4/logic';

const all: { village: (typeof VILLAGE_ORDER)[number]; i: number; q: KnowQuiz }[] = VILLAGE_ORDER.flatMap((village) => KNOW_QUIZ[village].map((q, i) => ({ village, i, q })));

/** Tên phản diện đứng riêng như một từ (không tính chữ "Tính", "tính"…). */
const hardcoded = new RegExp(`(?<![\\p{L}])${phanDien}(?![\\p{L}])`, 'u');

describe('16 câu hỏi của thẻ Em có biết (P6b)', () => {
  it('đủ 16 câu, mỗi làng đúng 4, khớp số cuộn thật trong làng (không thêm cuộn thứ 5)', () => {
    expect(all).toHaveLength(16);
    for (const v of VILLAGE_ORDER) {
      expect(KNOW_QUIZ[v]).toHaveLength(4);
      const scrolls = LOCAL_VILLAGES[v]?.scrolls ?? [];
      expect(scrolls.map((s) => s.index).sort()).toEqual([0, 1, 2, 3]);
    }
  });
  it('mỗi câu ứng với một thẻ có thật (tiêu đề, nội dung và ví dụ không rỗng), kể cả Khắc Dấu có 5 thẻ nhưng chỉ 4 câu', () => {
    for (const { village, i } of all) {
      const c = villageKnowCards(village)[i];
      expect(c, `${village}#${i}`).toBeDefined();
      expect(c.title.length).toBeGreaterThan(3);
      expect(c.text.length).toBeGreaterThan(20);
      expect((c.example ?? '').length, `${village}#${i} thiếu ví dụ`).toBeGreaterThan(20);
    }
    expect(villageKnowCards('lang-khac-dau')).toHaveLength(5);
    expect(villageKnowCards('lang-giay')).toHaveLength(4);
    expect(villageKnowCards('lang-det')).toHaveLength(4);
    expect(villageKnowCards('lang-bac')).toHaveLength(4);
  });
  it('13 câu ABCD (đúng 4 phương án khác nhau, đúng một đáp án) và 3 câu điền số 44, 19, 288; đáp án đúng rải A:4, B:3, C:4, D:2', () => {
    const abcd = all.filter((x) => x.q.kind === 'abcd');
    const num = all.filter((x) => x.q.kind === 'number');
    expect(abcd).toHaveLength(13);
    expect(num.map((x) => (x.q as { answer: number }).answer)).toEqual([44, 19, 288]);
    const dist = [0, 0, 0, 0];
    for (const { q } of abcd) {
      if (q.kind !== 'abcd') continue;
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      dist[q.correct]++;
    }
    expect(dist).toEqual([4, 3, 4, 2]);
    expect(knowQuizUi.chuCai).toEqual(['A', 'B', 'C', 'D']);
  });
  it('đáp án đúng của từng câu (theo tài liệu P6, bản rà 49168dc)', () => {
    const expected = ['A', 'B', 44, 'C', 'D', 'A', 'C', 'B', 'A', 19, 'B', 'C', 'C', 288, 'A', 'D'];
    const got = all.map(({ q }) => (q.kind === 'number' ? q.answer : 'ABCD'[q.correct]));
    expect(got).toEqual(expected);
  });
  it('số liệu điền số khớp logic sẵn có', () => {
    expect(pageCode(43, 58)).toBe(44);
    expect(publicKey(15)).toBe(19);
    expect(buildTree([2, 5, 3, 8])[2]).toEqual([288]);
  });
  it('mọi chữ qua fmt() không còn chỗ giữ tên chưa thay; không viết cứng tên phản diện (dùng {phanDien})', () => {
    const texts = (q: KnowQuiz) => [q.question, q.explanation, ...(q.kind === 'abcd' ? q.options : [])];
    for (const { q } of all) for (const t of texts(q)) {
      expect(fmt(t)).not.toMatch(/\{[A-Za-z]+\}/);
      expect(t).not.toMatch(hardcoded);
    }
    for (const v of VILLAGE_ORDER) for (const c of villageKnowCards(v)) for (const t of [c.title, c.text, c.example ?? '']) {
      expect(fmt(t)).not.toMatch(/\{[A-Za-z]+\}/);
      expect(t).not.toMatch(hardcoded);
    }
  });
});

describe('nội dung thẻ gốc đã sửa cùng ví dụ/câu hỏi (không để nội dung sai đứng cạnh giải thích đúng)', () => {
  const khac = villageKnowCards('lang-khac-dau');
  const flat = (v: (typeof VILLAGE_ORDER)[number]) => villageKnowCards(v).map((c) => `${c.title} ${c.text} ${c.example ?? ''}`).join(' ');
  it('thẻ Bitcoin: gần 2^256, xấp xỉ 1,16×10^77; 3,7×10^51 năm là thời gian giả định; không còn so sánh sai với 10^80 và không chỉ có ECDSA', () => {
    const c = khac[2];
    expect(c.title).toBe('Cặp khóa trong Bitcoin');
    expect(c.text).toContain('gần 2^256');
    expect(c.text).toContain('1,16 × 10^77');
    expect(c.text).toContain('ECDSA và Schnorr');
    expect(c.example).toContain('3,7 × 10^51 năm');
    expect(c.example).toContain('giả định');
    expect(flat('lang-khac-dau')).not.toContain('10^80');
    expect(flat('lang-khac-dau')).not.toContain('lớn hơn cả số nguyên tử');
    const q = KNOW_QUIZ['lang-khac-dau'][2];
    expect(q.explanation).toContain('gần 2^256');
    expect(q.explanation).toContain('thời gian giả định');
  });
  it('thẻ một chiều: không còn "bất khả thi"; có công thức 5^x mod 23; thẻ 1 có cặp khóa, ký và kiểm', () => {
    expect(flat('lang-khac-dau')).not.toContain('bất khả thi');
    expect(khac[1].text).toContain('5^x mod 23');
    expect(khac[0].text).toContain('khóa riêng');
    expect(khac[0].text).toContain('khóa công khai');
    expect(khac[0].text).toContain('không cần biết khóa riêng');
  });
  it('thẻ mất khóa: có giả định ví tự quản, mất mọi bản sao/cụm khôi phục; không còn ước tính 3–4 triệu Bitcoin', () => {
    const c = khac[3];
    expect(c.text).toContain('ví tự quản');
    expect(c.text).toContain('cụm từ khôi phục');
    expect(flat('lang-khac-dau')).not.toContain('triệu Bitcoin');
  });
  it('thẻ thứ 5 chỉ đọc (không có câu hỏi), tiêu đề và diễn đạt địa chỉ ví đã sửa', () => {
    const c = khac[4];
    expect(c.title).toBe('Địa chỉ ví được tạo từ khóa công khai');
    expect(c.text).toContain('không đồng nhất');
    expect(c.text).toContain('không cho quyền chi tiêu');
    expect(c.text).toContain('riêng tư');
    expect(KNOW_QUIZ['lang-khac-dau']).toHaveLength(4);
  });
  it('Làng Giấy thẻ 4: tính lại/kiểm tra các trang sau, không nói "phải sửa mọi trang phía sau"; Làng Bạc: cùng quy tắc và thứ tự, hàm băm thật', () => {
    const g = villageKnowCards('lang-giay')[3];
    expect(g.text).toContain('kiểm tra và tính lại');
    expect(g.text).not.toContain('mọi trang phía sau');
    const b1 = villageKnowCards('lang-bac')[0];
    expect(b1.text).toContain('cùng quy tắc ghép và cùng thứ tự');
    expect(b1.text).toContain('hàm băm');
    const b4 = villageKnowCards('lang-bac')[3];
    expect(b4.text).toContain('hàm băm thật');
    expect(b4.text).not.toContain('biết ngay tính toàn vẹn');
    expect(`${b4.text} ${b4.example}`).not.toContain('biết ngay tính toàn vẹn');
  });
  it('thẻ của trang bài học là cùng một nguồn với thẻ nhặt trong làng', () => {
    expect(villageKnowCards('lang-giay')).toBe(bai1Lesson.emCoBiet);
    expect(villageKnowCards('lang-det')).toBe(bai2Lesson.emCoBiet);
    expect(villageKnowCards('lang-khac-dau')).toBe(bai3Lesson.emCoBiet);
    expect(villageKnowCards('lang-bac')).toBe(bai4Lesson.emCoBiet);
  });
});
