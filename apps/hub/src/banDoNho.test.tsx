import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { banDoNho } from '../../../packages/core/src/content/minimap';
import { ui } from '../../../packages/core/src/content/ui';
import { createWalkApi } from '../../../packages/core/src/three/walkApi';
import { assembleWorld } from '../../../packages/core/src/three/world/worldLayout';
import { BigMap } from '../../../packages/core/src/three/world/map/BigMap';
import { MiniMap } from '../../../packages/core/src/three/world/map/MiniMap';
import { buildMapGeometry } from '../../../packages/core/src/three/world/map/mapGeometry';
import { mapMarkers, type MarkerInput } from '../../../packages/core/src/three/world/map/mapMarkers';
import { villageProgress } from '../../../packages/core/src/three/world/map/mapProgress';
import type { VillageId } from '../../../packages/core/src/village';

const world = assembleWorld();
const geo = buildMapGeometry(world);
const names = Object.fromEntries(Object.entries(ui.lang)) as Record<VillageId, string>;
const input: MarkerInput = {
  villages: world.villages,
  gateOpen: { giay: true, det: false, 'khac-dau': false, bac: false },
  levelStates: { 1: 'open', 2: 'locked', 3: 'locked', 4: 'locked' },
  inside: 'lang-giay',
  knowMasks: { 'lang-giay': 0b0011 },
  target: { x: 0, z: 150 },
};
const noop = () => undefined;

describe('bản đồ nhỏ (dựng tĩnh)', () => {
  const html = renderToStaticMarkup(<MiniMap geo={geo} markers={mapMarkers(input, 'mini')} names={names} api={createWalkApi()} inside="lang-giay" rotate={false} size={180} touch={false} reducedMotion={false} onOpen={noop} />);

  it('là một nút có nhãn đọc được; cỡ 180; có chữ B (hướng bắc) và tên các làng', () => {
    expect(html).toContain('data-testid="ban-do-nho"');
    expect(html).toContain(`aria-label="${banDoNho.nhan}"`);
    expect(html).toContain('width="180"');
    expect(html).toContain(`>${banDoNho.bac}<`);
    for (const id of Object.keys(names)) expect(html).toContain(names[id as VillageId]);
  });

  it('có phần tĩnh, mũi tên học sinh, ký hiệu cổng, biển, thẻ chưa nhặt (2 trong 4) và điểm đến', () => {
    expect(html).toContain('data-testid="ban-do-tinh"');
    expect(html).toContain('data-glyph="student"');
    expect((html.match(/data-glyph="gate"/g) ?? []).length).toBe(4);
    expect((html.match(/data-glyph="board"/g) ?? []).length).toBe(3);
    expect((html.match(/data-glyph="scroll"/g) ?? []).length).toBe(2);
    expect((html.match(/data-glyph="target"/g) ?? []).length).toBe(1);
  });

  it('điện thoại: nhãn nút nói "chạm", cỡ 120', () => {
    const h = renderToStaticMarkup(<MiniMap geo={geo} markers={[]} names={names} api={createWalkApi()} inside={null} rotate={false} size={120} touch reducedMotion onOpen={noop} />);
    expect(h).toContain(`aria-label="${banDoNho.nhanDt}"`);
    expect(h).toContain('width="120"');
  });

  it('không dùng đổ bóng hay bộ lọc', () => {
    expect(html).not.toMatch(/box-shadow|text-shadow|filter|drop-shadow/i);
  });

  it('giảm chuyển động: điểm đến không nhấp nháy; bình thường thì có', () => {
    expect(html).toContain('animate-pulse');
    const still = renderToStaticMarkup(<MiniMap geo={geo} markers={mapMarkers(input, 'mini')} names={names} api={createWalkApi()} inside="lang-giay" rotate={false} size={180} touch={false} reducedMotion onOpen={noop} />);
    expect(still).not.toContain('animate-pulse');
  });
});

describe('bản đồ lớn (dựng tĩnh)', () => {
  const progress = villageProgress({ levelStates: { 1: 'done', 2: 'open' }, knowMasks: { 'lang-giay': 0b0011 }, scrollTotals: { 'lang-giay': 4 }, goldenPages: 0 });
  const html = renderToStaticMarkup(
    <BigMap geo={geo} markers={mapMarkers(input, 'big')} names={names} player={{ x: 4, z: 120, yaw: 0.5 }} progress={progress} quest="Tìm thẻ Em có biết: 2/4" touch={false} reducedMotion={false} onClose={noop} />,
  );

  it('có tiêu đề, nút Đóng, dòng "Việc tiếp theo" và hướng bắc', () => {
    expect(html).toContain(banDoNho.tieuDe);
    expect(html).toContain(`aria-label="${banDoNho.dongNhan}"`);
    expect(html).toContain('Việc tiếp theo: Tìm thẻ Em có biết: 2/4');
    expect(html).toContain('role="dialog"');
  });

  it('tiến độ từng làng: màn đã xong, thẻ đã nhặt, Trang Sổ Vàng', () => {
    for (const id of Object.keys(names)) expect(html).toContain(`data-testid="tien-do-${id}"`);
    expect(html).toContain('Màn đã xong: 1/3');
    expect(html).toContain('Thẻ &quot;Em có biết?&quot;: 2/4');
    expect(html).toContain(banDoNho.tienDoTrangChua);
  });

  it('chú thích đủ các ký hiệu và hiện chỗ em đứng', () => {
    for (const k of Object.values(banDoNho.chuThich)) expect(html.replace(/&quot;/g, '"')).toContain(k);
    expect(html).toContain('data-testid="ban-do-lon-em"');
  });

  it('không dùng bộ lọc hay đổ bóng văn bản; chữ ở bảng lấy từ content/', () => {
    expect(html).not.toMatch(/text-shadow|filter|drop-shadow/i);
    expect(html).toContain('box-shadow:none');
  });
});
