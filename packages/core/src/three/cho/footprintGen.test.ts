import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { deriveShapes, gridFromFilledPoints, gridFromHull, measureFit, type FootShape } from './footprintDerive';
import { bandSample } from './footprintSample.testlib';

/**
 * Công cụ sinh bảng chân tường (không chạy khi `pnpm test` thường): `GEN_FOOTPRINTS=<đường dẫn file json> pnpm vitest run footprintGen`
 * ghi các hình dựng từ file model thật ra file đó (kèm báo cáo .txt), rồi chép vào footprints.ts.
 */
const OUT = process.env.GEN_FOOTPRINTS;

export const FOOTPRINT_IDS = [
  'env/cay-da',
  'env/cong-lang-giay',
  'env/cong-lang-det',
  'env/cong-lang-khac-dau',
  'env/cong-lang-bac',
  'env/nha-mai-ngoi',
  'env/nha-mai-tranh',
  'env/leu-cho',
  'env/gieng-lang',
  'env/bui-tre',
];

describe.skipIf(!OUT)('sinh bảng chân tường', () => {
  it('dựng hình bao cho từng đồ vật', { timeout: 300000 }, async () => {
    const out: Record<string, FootShape[]> = {};
    const report: string[] = [];
    for (const id of FOOTPRINT_IDS) {
      const { points } = await bandSample(id);
      const gate = id.includes('cong-lang');
      const grid = gate ? gridFromFilledPoints(points) : gridFromHull(points);
      const shapes = deriveShapes(grid, undefined, gate ? ['x'] : ['x', 'z']);
      out[id] = shapes;
      report.push(`${id}: ${shapes.length} hình (${shapes.map((s) => s.kind[0]).join('')}) từ ${points.length} điểm; ${JSON.stringify(measureFit(shapes, grid))}`);
    }
    writeFileSync(OUT!, JSON.stringify(out, null, 1));
    writeFileSync(`${OUT}.txt`, report.join('\n'));
  });
});
