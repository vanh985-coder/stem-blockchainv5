import {
  pageCode,
  buildChain,
  firstInvalidIndex,
  isSafeDelta,
  pickSafeContent,
  randomGenesis,
  randomContents,
  pagesToFix,
  spawnDelayMs,
  hardStars,
  Page,
} from './logic';
import { createMulberry32 } from '../../lib/rng';

export const tests: { name: string; expected: unknown; actual: () => unknown }[] = [
  {
    name: 'T1: pageCode(10, 23) === 43',
    expected: 43,
    actual: () => pageCode(10, 23),
  },
  {
    name: 'T2: buildChain(10, [23,45,7,88,12]) -> [43,31,69,26,64]',
    expected: [43, 31, 69, 26, 64],
    actual: () => buildChain(10, [23, 45, 7, 88, 12]),
  },
  {
    name: 'T3: Domino: đổi trang 2 và sửa lần lượt từng trang, firstInvalidIndex tăng dần đến -1',
    expected: true,
    actual: () => {
      const genesis = 10;
      const contents = [23, 45, 7, 88, 12];
      const codes = buildChain(genesis, contents);
      const pages: Page[] = contents.map((c, i) => ({ content: c, code: codes[i] }));

      // Đổi pages[1].content = 72
      pages[1].content = 72;
      if (firstInvalidIndex(genesis, pages) !== 1) return false;

      // Sửa code index 1: (43 * 2 + 72) % 100 = 158 % 100 = 58
      pages[1].code = pageCode(pages[0].code, pages[1].content);
      if (pages[1].code !== 58) return false;
      if (firstInvalidIndex(genesis, pages) !== 2) return false;

      // Sửa code index 2: (58 * 2 + 7) % 100 = 123 % 100 = 23
      pages[2].code = pageCode(pages[1].code, pages[2].content);
      if (pages[2].code !== 23) return false;
      if (firstInvalidIndex(genesis, pages) !== 3) return false;

      // Sửa code index 3: (23 * 2 + 88) % 100 = 134 % 100 = 34
      pages[3].code = pageCode(pages[2].code, pages[3].content);
      if (pages[3].code !== 34) return false;
      if (firstInvalidIndex(genesis, pages) !== 4) return false;

      // Sửa code index 4: (34 * 2 + 12) % 100 = 80
      pages[4].code = pageCode(pages[3].code, pages[4].content);
      if (pages[4].code !== 80) return false;
      if (firstInvalidIndex(genesis, pages) !== -1) return false;

      const finalCodes = pages.map((p) => p.code);
      const expectedCodes = [43, 58, 23, 34, 80];
      return JSON.stringify(finalCodes) === JSON.stringify(expectedCodes);
    },
  },
  {
    name: 'T4: isSafeDelta kiểm tra tính an toàn của chênh lệch nội dung',
    expected: true,
    actual: () => {
      const c1 = isSafeDelta(45, 95) === false; // d = 50 chia hết 25
      const c2 = isSafeDelta(45, 72) === true;  // d = 27
      const c3 = isSafeDelta(45, 45) === false; // d = 0
      const c4 = isSafeDelta(45, 70) === false; // d = 25
      const c5 = isSafeDelta(45, 20) === false; // d = -25 = 75
      const c6 = isSafeDelta(10, 11) === true;  // d = 1
      return c1 && c2 && c3 && c4 && c5 && c6;
    },
  },
  {
    name: 'T5: Không tự lành: 300 chuỗi ngẫu nhiên, đổi trang 2 thì trang sau luôn lệch và mã cuối đổi',
    expected: true,
    actual: () => {
      const rng = createMulberry32(98765);
      for (let run = 0; run < 300; run++) {
        const genesis = randomGenesis(rng);
        const contents = randomContents(6, rng);
        const origCodes = buildChain(genesis, contents);
        const origLastCode = origCodes[5];

        const pages: Page[] = contents.map((c, i) => ({ content: c, code: origCodes[i] }));
        pages[1].content = pickSafeContent(pages[1].content, rng);

        // Chuỗi phải lệch ở index 1
        if (firstInvalidIndex(genesis, pages) !== 1) return false;

        // Sửa lần lượt từ index 1 đến 5
        for (let i = 1; i < 6; i++) {
          const prev = i === 0 ? genesis : pages[i - 1].code;
          pages[i].code = pageCode(prev, pages[i].content);
          if (i < 5) {
            // Trang ngay sau nó phải lệch
            if (firstInvalidIndex(genesis, pages) !== i + 1) return false;
          }
        }

        // Sau khi sửa hết: chuỗi phải khớp (-1) và mã trang cuối phải khác chuỗi gốc
        if (firstInvalidIndex(genesis, pages) !== -1) return false;
        if (pages[5].code === origLastCode) return false;
      }
      return true;
    },
  },
  {
    name: 'T6: spawnDelayMs tính đúng độ trễ thêm trang (bình thường và fast)',
    expected: true,
    actual: () => {
      const c1 = spawnDelayMs(0, false) === 6000;
      const c2 = spawnDelayMs(1, false) === 5700;
      const c3 = spawnDelayMs(10, false) === 3000;
      const c4 = spawnDelayMs(20, false) === 3000;
      const c5 = spawnDelayMs(0, true) === 2000;
      const c6 = spawnDelayMs(5, true) === 2000;
      return c1 && c2 && c3 && c4 && c5 && c6;
    },
  },
  {
    name: 'T7: hardStars tính số sao theo số trang đã sửa',
    expected: [3, 2, 2, 1, 1],
    actual: () => [hardStars(8), hardStars(7), hardStars(4), hardStars(3), hardStars(0)],
  },
  {
    name: 'T8: pagesToFix tính số trang còn phải sửa',
    expected: [0, 5, 1],
    actual: () => [pagesToFix(-1, 6), pagesToFix(1, 6), pagesToFix(5, 6)],
  },
];
