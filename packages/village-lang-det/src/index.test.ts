import { describe, expect, it } from 'vitest';
import { langDet } from './index';

describe('gói Làng Dệt', () => {
  it('3 màn của làng (bài học 4, game 5 và 6) và route cho màn đã ra mắt: man/4 (bài học) và man/5 (Đập {phanDien}); màn 6 chưa có route', () => {
    expect(langDet.levels).toEqual([4, 5, 6]);
    expect(langDet.routes.map((r) => r.path)).toEqual(['man/4', 'man/5']);
  });
});
