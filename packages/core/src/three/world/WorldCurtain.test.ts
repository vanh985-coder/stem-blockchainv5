import { describe, expect, it } from 'vitest';
import { VILLAGE_ORDER } from '../../content/levels';
import { ui } from '../../content/ui';
import { CURTAIN_IMAGE, curtainName } from './WorldCurtain';

describe('màn chờ thế giới mở', () => {
  it('tên nơi sắp vào: chợ phiên hoặc tên làng', () => {
    expect(curtainName(null)).toBe(ui.manCho.tenCho);
    for (const id of VILLAGE_ORDER) expect(curtainName(id)).toBe(ui.lang[id]);
    expect(Object.keys(CURTAIN_IMAGE)).toHaveLength(VILLAGE_ORDER.length + 1);
  });
});
