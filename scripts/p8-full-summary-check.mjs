import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';

const GROUPS = [
  {
    id: 'man1',
    name: 'Màn 1: Bài 1 Làng Giấy (Dễ, Trung bình, Khó)',
    files: [
      'docs/screenshots/p8a/ket-qua-p8a-e2e.json',
      'docs/screenshots/p8b/ket-qua-p8b-e2e.json',
    ],
    imgDirs: ['docs/screenshots/p8a', 'docs/screenshots/p8b'],
  },
  {
    id: 'man2_man3',
    name: 'Màn 2 & Màn 3: Runner & Ghép Sổ (Làng Giấy)',
    files: ['docs/screenshots/p2-p3-tutorial/ket-qua.json'],
    imgDirs: ['docs/screenshots/p2-p3-tutorial'],
  },
  {
    id: 'man4',
    name: 'Màn 4: Bài 2 Làng Dệt (Dễ, Trung bình, Khó)',
    files: ['docs/screenshots/p8c/ket-qua-p8c-e2e.json'],
    imgDirs: ['docs/screenshots/p8c'],
  },
  {
    id: 'man5_man6',
    name: 'Màn 5 & Màn 6: Đập Chuột 2D & Diều Đưa Sổ (Làng Dệt)',
    files: ['docs/screenshots/p5-p6-tutorial/ket-qua.json'],
    imgDirs: ['docs/screenshots/p5-p6-tutorial'],
  },
  {
    id: 'man7',
    name: 'Màn 7: Bài 3 Làng Khắc Dấu (Dễ, Trung bình, Khó)',
    files: ['docs/screenshots/p7-tutorial/results.json'],
    imgDirs: ['docs/screenshots/p7-tutorial'],
  },
  {
    id: 'man8_man9',
    name: 'Màn 8 & Màn 9: Lật Thẻ Ghép Khóa & Chữa Gà (Làng Khắc Dấu)',
    files: ['docs/screenshots/p8-p9-tutorial/ket-qua.json'],
    imgDirs: ['docs/screenshots/p8-p9-tutorial'],
  },
  {
    id: 'man10',
    name: 'Màn 10: Bài 4 Làng Bạc (Dễ, Trung bình, Khó)',
    files: ['docs/screenshots/p10-tutorial/ket-qua.json'],
    imgDirs: ['docs/screenshots/p10-tutorial'],
  },
  {
    id: 'man11_man12',
    name: 'Màn 11 & Màn 12: Ghép Lá Merkle & Leo Cây Lá Giả (Làng Bạc)',
    files: ['docs/screenshots/p11-p12-tutorial/ket-qua.json'],
    imgDirs: ['docs/screenshots/p11-p12-tutorial'],
  },
];

console.log('========================================================================');
console.log('       TỔNG HỢP KIỂM CHỨNG HỆ THỐNG FOCUS & LÀM THỬ ĐỦ 12 MÀN (P8)');
console.log('========================================================================\n');

let totalTests = 0;
let totalPassed = 0;
let totalScreenshots = 0;
const summaryRows = [];

for (const g of GROUPS) {
  let groupTotal = 0;
  let groupPassed = 0;

  for (const f of g.files) {
    if (existsSync(f)) {
      const data = JSON.parse(readFileSync(f, 'utf-8'));
      if (Array.isArray(data)) {
        groupTotal += data.length;
        groupPassed += data.filter((r) => r.pass === true || r.passed === true).length;
      } else if (typeof data === 'object') {
        groupTotal += data.total ?? data.results?.length ?? 0;
        groupPassed += data.passed ?? data.results?.filter((r) => r.pass === true || r.passed === true).length ?? 0;
      }
    }
  }

  let pngCount = 0;
  for (const dir of g.imgDirs) {
    if (existsSync(dir)) {
      const pngs = readdirSync(dir).filter((file) => file.endsWith('.png'));
      pngCount += pngs.length;
    }
  }

  totalTests += groupTotal;
  totalPassed += groupPassed;
  totalScreenshots += pngCount;

  summaryRows.push({
    group: g.name,
    tests: `${groupPassed}/${groupTotal}`,
    passRate: groupTotal > 0 ? `${((groupPassed / groupTotal) * 100).toFixed(1)}%` : 'N/A',
    screenshots: pngCount,
  });

  console.log(`[${groupPassed}/${groupTotal} ĐẠT - ${pngCount} ảnh] ${g.name}`);
}

console.log('\n------------------------------------------------------------------------');
console.log(`TỔNG CỘNG E2E TESTS: ${totalPassed} / ${totalTests} ĐẠT (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
console.log(`TỔNG SỐ ẢNH MINH CHỨNG: ${totalScreenshots} ảnh PNG`);
console.log('------------------------------------------------------------------------\n');

writeFileSync(
  'docs/screenshots/p8-tong-hop.json',
  JSON.stringify({ totalTests, totalPassed, totalScreenshots, summaryRows }, null, 2)
);
