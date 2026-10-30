/**
 * P6a: tự kiểm các phép tính trong docs/specs/P6-NOI-DUNG-THE-TUONG-TAC.md bằng logic sẵn có (không viết lại công thức).
 * Mỗi `it` ứng với một thẻ có số liệu. Đổi số trong tài liệu thì phải đổi ở đây (và ngược lại).
 */
import { describe, expect, it } from 'vitest';
import { pageCode } from '../packages/core/src/lib/chain';
import { isValidProposal } from '../packages/core/src/lessons/bai-2/logic';
import { modPow, publicKey, sign, verify, PEOPLE, P, G } from '../packages/core/src/lessons/bai-3/logic';
import { buildTree, combine } from '../packages/core/src/lessons/bai-4/logic';
import { bai3Logic } from '../packages/core/src/content/lessons/bai-3';
import { fmt } from '../packages/core/src/content/characters';

describe('P6a — Làng Giấy (Bài 1)', () => {
  it('thẻ 2: nội dung 23 sau mã bìa 10 ra mã 43; đổi thành 24 thì mã đúng là 44 (không còn khớp 43)', () => {
    expect(pageCode(10, 23)).toBe(43);
    expect(pageCode(10, 24)).toBe(44);
  });
  it('thẻ 3: mã trước 43, nội dung 58 → 44 (đáp án sai thường gặp: 144 quên mod, 101 cộng thẳng)', () => {
    expect(pageCode(43, 58)).toBe(44);
    expect(43 * 2 + 58).toBe(144);
    expect(43 + 58).toBe(101);
  });
  it('chuỗi bìa 10, nội dung 23, 58, 7 → 43, 44, 95; sửa trang 1 thành 24 → 44, 46, 99 (chỉ là một ví dụ, không phải quy tắc chung)', () => {
    const chain = (c0, contents) => contents.reduce((acc, c) => [...acc, pageCode(acc.length ? acc[acc.length - 1] : c0, c)], []);
    expect(chain(10, [23, 58, 7])).toEqual([43, 44, 95]);
    expect(chain(10, [24, 58, 7])).toEqual([44, 46, 99]);
  });
  it('thẻ 4: mã của CHÍNH trang bị sửa luôn đổi khi nội dung (0–99) đổi', () => {
    for (let prev = 0; prev < 100; prev++) {
      for (let a = 0; a < 100; a++) {
        for (let b = a + 1; b < 100; b++) expect(pageCode(prev, a)).not.toBe(pageCode(prev, b));
      }
    }
  });
  it('thẻ 4 (phản ví dụ): mã trang 1 = 10; nội dung trang 2, 3, 4 = 10, 0, 0 → mã 30, 60, 20; sửa trang 2 thành 35 → 55, 10, 20 (mã trang 4 trùng lại)', () => {
    const chain = (c1, contents) => contents.reduce((acc, c) => [...acc, pageCode(acc.length ? acc[acc.length - 1] : c1, c)], []);
    expect(chain(10, [10, 0, 0])).toEqual([30, 60, 20]);
    expect(chain(10, [35, 0, 0])).toEqual([55, 10, 20]);
    // trang 3 đổi (60 → 10) nên phải tính tiếp; trang 4 tính ra đúng mã đang ghi (20) nên các trang sau đó không đổi
    expect(chain(10, [35, 0, 0])[1]).not.toBe(chain(10, [10, 0, 0])[1]);
    expect(chain(10, [35, 0, 0])[2]).toBe(chain(10, [10, 0, 0])[2]);
    expect(chain(10, [35, 0, 0, 7, 9])[3]).toBe(chain(10, [10, 0, 0, 7, 9])[3]); // và các trang sau trang 4 giữ nguyên
  });
});

describe('P6a — Làng Dệt (Bài 2)', () => {
  it('thẻ 2: ví dụ 57, 36 → 50 hợp lệ', () => {
    expect(isValidProposal(57, { prevCode: 57, content: 36, code: 50 })).toBe('ok');
  });
  it('thẻ 2: sổ em mã cuối 40, trang gửi (mã trước 62, nội dung 15, mã 39) tự khớp công thức nhưng mã trước không khớp → Từ chối', () => {
    expect(pageCode(62, 15)).toBe(39);
    expect(isValidProposal(40, { prevCode: 62, content: 15, code: 39 })).toBe('prev-mismatch');
    expect(62 * 2 + 15).toBe(139); // đáp án nhiễu "quên mod"
  });
});

describe('P6a — Làng Khắc Dấu (Bài 3)', () => {
  it('thẻ 1: đổi 3 xu thành 300 xu thì chữ ký của em (khóa riêng 12) không còn khớp, với cả 21 giá trị k (1 đến 21)', () => {
    const em = PEOPLE.find((p) => p.id === 'em');
    expect(publicKey(em.privateKey)).toBe(em.publicKey);
    const orig = fmt(bai3Logic.thongDiep, { n: 3, nguoi: 'An' });
    const fake = fmt(bai3Logic.thongDiep, { n: 300, nguoi: 'An' });
    let stillValid = 0;
    for (let k = 1; k <= 21; k++) {
      const sig = sign(em.privateKey, orig, k);
      expect(verify(em.publicKey, orig, sig)).toBe(true);
      if (verify(em.publicKey, fake, sig)) stillValid += 1;
    }
    // mô hình thu nhỏ của bài (băm mod 22) về nguyên tắc có thể trùng ngẫu nhiên; với đúng hai câu này thì không khóa k nào trùng (đã đếm: 0 trên 21).
    expect(stillValid).toBe(0);
  });
  it('thẻ 2: khóa riêng 15 của An → khóa công khai 5^15 mod 23 = 19; phải thử 15 lần mới ngược lại được', () => {
    expect(modPow(G, 15, P)).toBe(19);
    expect(publicKey(15)).toBe(19);
    let tries = 0;
    for (let x = 1; x < 22; x++) {
      tries += 1;
      if (modPow(G, x, P) === 19) break;
    }
    expect(tries).toBe(15);
    let t18 = 0;
    for (let x = 1; x < 22; x++) {
      t18 += 1;
      if (modPow(G, x, P) === 18) break;
    }
    expect(t18).toBe(12); // khóa riêng 12 của em → khóa công khai 18
    expect(modPow(5, 3, 23)).toBe(10); // ví dụ của spec 04 (khóa riêng 3 → 10)
  });
  it('thẻ 3: 1,16 × 10^77 khóa ÷ 10^18 lần/giây ≈ 3,7 × 10^51 năm (số trong content/lessons/bai-3 uocTinh)', () => {
    const seconds = 1.16e77 / 1e18;
    const years = seconds / (365.25 * 24 * 3600);
    expect(Math.abs(years / 3.7e51 - 1)).toBeLessThan(0.02);
    expect(bai3Logic.uocTinh.supercomputerYears).toBe('3,7 × 10^51');
    expect(bai3Logic.uocTinh.totalPossibilities).toBe('1,16 × 10^77');
    expect(bai3Logic.uocTinh.universeAgeYears).toBe('13,8 tỷ');
  });
  it('thẻ 3: 2^256 ≈ 1,16 × 10^77 NHỎ HƠN 10^80 (câu "lớn hơn số nguyên tử vũ trụ ~10^80" của thẻ gốc sai) và bằng số trong ví dụ gốc', () => {
    const n = 2n ** 256n;
    expect(n < 10n ** 80n).toBe(true);
    expect(n > 10n ** 77n).toBe(true);
    expect(Number(n) / 1e77).toBeCloseTo(1.158, 2);
    expect(String(n)).toBe('115792089237316195423570985008687907853269984665640564039457584007913129639936');
    expect(String(n)).toHaveLength(78);
  });
});

describe('P6a — Làng Bạc (Bài 4)', () => {
  it('thẻ 2 (câu hỏi): lá 2, 5, 3, 8 → tầng [25, 38] → gốc 288', () => {
    expect(buildTree([2, 5, 3, 8])).toEqual([[2, 5, 3, 8], [25, 38], [288]]);
    expect(combine(5, 2)).toBe(52);
    expect(combine(38, 25)).toBe(405);
  });
  it('thẻ 2 (ví dụ): lá 3, 7 → 37, đảo 7, 3 → 73; lá 4, 2, 6, 1 → tầng [42, 61] → gốc 481; đảo thứ tự lá 2, 4, 1, 6 → gốc 256', () => {
    expect(combine(3, 7)).toBe(37);
    expect(combine(7, 3)).toBe(73);
    expect(buildTree([4, 2, 6, 1])).toEqual([[4, 2, 6, 1], [42, 61], [481]]);
    expect(buildTree([2, 4, 1, 6])).toEqual([[2, 4, 1, 6], [24, 16], [256]]);
    expect(combine(4, 2)).toBe(42);
  });
  it('thẻ 2: cây 16 lá cần 8 + 4 + 2 + 1 = 15 phép ghép; cây 8 lá cần 7', () => {
    const count = (n) => buildTree(Array.from({ length: n }, (_, i) => i % 10)).slice(1).flat().length;
    expect(count(16)).toBe(15);
    expect(count(8)).toBe(7);
  });
  it('thẻ 1, 4 (phản ví dụ): mô hình ghép số của bài KHÔNG phải hàm băm: lá khác nhau vẫn có thể cùng gốc', () => {
    expect(combine(1, 20)).toBe(30);
    expect(combine(2, 10)).toBe(30);
    expect(buildTree([1, 20, 3, 5])[2]).toEqual([335]);
    expect(buildTree([2, 10, 3, 5])[2]).toEqual([335]);
    expect(buildTree([1, 20, 3, 5])[0]).not.toEqual(buildTree([2, 10, 3, 5])[0]);
  });
  it('thẻ 3: lá 3, 7, 5, 2 → gốc 422 (ví dụ của spec); đổi lá thứ 3 từ 5 thành 9 → gốc 462', () => {
    expect(buildTree([3, 7, 5, 2])[2]).toEqual([422]);
    expect(buildTree([3, 7, 9, 2])[2]).toEqual([462]);
  });
});
