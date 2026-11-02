import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarketHud } from '../../../packages/core/src/three/cho/MarketHud';
import { NHIEM_VU_HOI_SAP_MO } from '../../../packages/core/src/content/dialogues';
import { ui } from '../../../packages/core/src/content/ui';

const noop = () => {};

describe('MarketHud - Thu gọn và mở rộng dòng nhiệm vụ HUD 3D', () => {
  const shortQuest = 'Đến biển "Màn 1: Học cùng bác An".';
  const longQuest = NHIEM_VU_HOI_SAP_MO; // 'Em đã có đủ 4 Trang Sổ Vàng! Hội làng sắp mở.'

  it('mặc định khi không gần biển: hiển thị khung nhiệm vụ mở rộng với đầy đủ nội dung và nút "Thu gọn"', () => {
    const html = renderToStaticMarkup(
      <MarketHud quest={shortQuest} pages={1} onMenu={noop} nearBoard={false} />
    );

    expect(html).toContain('data-testid="hud-nhiem-vu"');
    expect(html).toContain('Học cùng bác An');
    expect(html).toContain('role="status"');
    expect(html).toContain('data-testid="nut-thu-gon-nhiem-vu"');
    expect(html).toContain(ui.cho.thuGonNhiemVu);
    expect(html).toContain(ui.cho.nhiemVuRutGon);
    expect(html).not.toContain('data-testid="nut-mo-nhiem-vu"');
  });

  it('khi nearBoard=true (đang tiếp cận biển chọn màn): tự động thu gọn thành nút gọn không che biển', () => {
    const html = renderToStaticMarkup(
      <MarketHud quest={longQuest} pages={4} onMenu={noop} nearBoard={true} />
    );

    // Không render khung nhiệm vụ dài che biển
    expect(html).not.toContain('data-testid="hud-nhiem-vu"');
    // Render nút mở nhiệm vụ gọn gàng
    expect(html).toContain('data-testid="nut-mo-nhiem-vu"');
    expect(html).toContain(ui.cho.nhiemVuRutGon);
    expect(html).toContain(`aria-label="Nhiệm vụ: ${longQuest}"`);
    expect(html).toContain(`title="${ui.cho.moRongNhiemVu}"`);
  });

  it('trạng thái đủ 4 Trang Sổ Vàng (dòng dài): hiển thị đầy đủ không mất nội dung khi mở rộng', () => {
    const html = renderToStaticMarkup(
      <MarketHud quest={longQuest} pages={4} onMenu={noop} nearBoard={false} />
    );

    expect(html).toContain(longQuest);
    expect(html).toContain('data-testid="hud-nhiem-vu"');
    expect(html).toContain('data-testid="nut-thu-gon-nhiem-vu"');
  });

  it('các nút thao tác đều có thuộc tính data-walk-ui và đảm bảo chuẩn touch target tối thiểu 44px', () => {
    const expandedHtml = renderToStaticMarkup(
      <MarketHud quest={shortQuest} pages={0} onMenu={noop} nearBoard={false} />
    );
    // Nút thu gọn trong khung mở rộng
    expect(expandedHtml).toContain('min-h-11');
    expect(expandedHtml).toContain('min-w-11');
    expect(expandedHtml).toContain('data-walk-ui');

    const collapsedHtml = renderToStaticMarkup(
      <MarketHud quest={shortQuest} pages={0} onMenu={noop} nearBoard={true} />
    );
    // Nút mở nhiệm vụ khi đang thu gọn
    expect(collapsedHtml).toContain('min-h-11');
    expect(collapsedHtml).toContain('data-walk-ui');
  });
});
