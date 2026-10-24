import { describe, expect, it } from 'vitest';
import { langDet } from './index';

describe('gói Làng Dệt', () => {
  it('3 màn của làng (bài học 4, game 5 và 6) và route cho cả 3 màn: man/4 (bài học), man/5 (Đập {phanDien}) và man/6 (Diều đưa sổ)', () => {
    expect(langDet.levels).toEqual([4, 5, 6]);
    expect(langDet.routes.map((r) => r.path)).toEqual(['man/4', 'man/5', 'man/6']);
  });
});
