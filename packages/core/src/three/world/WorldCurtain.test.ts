import { describe, expect, it } from 'vitest';
import { ui } from '../../content/ui';
import { VILLAGE_ORDER } from '../../content/levels';
import { CURTAIN_IMAGE, curtainTarget, nextPercent } from './WorldCurtain';

describe('màn chờ thế giới mở', () => {
  it('chợ phiên dùng ảnh "đang tải"; mỗi làng dùng ảnh tranh bài học của làng đó', () => {
    expect(curtainTarget(null)).toEqual({ name: ui.manCho.tenCho, image: 'ui/man-hinh-tai' });
    for (const id of VILLAGE_ORDER) expect(curtainTarget(id)).toEqual({ name: ui.lang[id], image: `scenes/bai-hoc-${id}` });
    expect(Object.keys(CURTAIN_IMAGE)).toHaveLength(VILLAGE_ORDER.length + 1);
  });

  it('phần trăm không lùi, kẹp 0 đến 100, làm tròn', () => {
    expect(nextPercent(0, 12.4)).toBe(12);
    expect(nextPercent(40, 10)).toBe(40);
    expect(nextPercent(0, 250)).toBe(100);
    expect(nextPercent(0, -5)).toBe(0);
  });
});
