import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EmCoBietDialog,
  GUIDE_ART_IDS,
  GUIDE_SECTIONS,
  GuideArt,
  GuideDialog,
  GuideFigureView,
  guideText,
  villageKnowCards,
  type GuidePage,
} from '@so-chung/core';
import { MarketHud as Hud } from '../../../packages/core/src/three/cho/MarketHud';

const noop = () => {};

describe('EmCoBietDialog (dùng chung cho trang bài học và cảnh làng)', () => {
  const cards = villageKnowCards('lang-giay');
  it('hiện thẻ đầu "Thẻ 1/n", tiêu đề, lời, "Trước" (mờ) và "Tiếp"; các thẻ sau chưa hiện', () => {
    const html = renderToStaticMarkup(<EmCoBietDialog cards={cards} onClose={noop} />);
    expect(html).toContain('Em có biết?');
    expect(html).toContain(`Thẻ 1/${cards.length}`);
    expect(html).toContain(cards[0].title);
    expect(html).not.toContain(cards[1].title);
    expect(html).toContain('Trước');
    expect(html).toContain('Tiếp');
    expect(html).not.toContain('Vào làng');
    expect(html).toContain('role="dialog"');
  });
  it('chỉ một thẻ: nút cuối là chữ do nơi gọi đặt ("Vào làng"), mặc định "Đóng"', () => {
    const one = [cards[0]];
    expect(renderToStaticMarkup(<EmCoBietDialog cards={one} onClose={noop} finishLabel="Vào làng" />)).toContain('Vào làng');
    const def = renderToStaticMarkup(<EmCoBietDialog cards={one} onClose={noop} />);
    expect(def).toContain('Đóng');
    expect(def).not.toContain('Vào làng');
  });
  it('không có thẻ thì không hiện gì', () => {
    expect(renderToStaticMarkup(<EmCoBietDialog cards={[]} onClose={noop} />)).toBe('');
  });
});

describe('GuideDialog (Hướng dẫn chơi)', () => {
  it('hiện tên các phần, trang đầu "Trang 1/n" và nút "Tiếp" (chưa phải trang cuối)', () => {
    const html = renderToStaticMarkup(<GuideDialog onClose={noop} device="may" />);
    for (const s of GUIDE_SECTIONS) expect(html).toContain(s.nhan);
    expect(html).toContain('Hướng dẫn chơi');
    expect(html).toContain(`Trang 1/${GUIDE_SECTIONS[0].trang.length}`);
    expect(html).toContain('Đi lại và camera');
    expect(html).toContain('Tiếp');
    expect(html).not.toContain('Đã hiểu');
    expect(html).not.toContain('{');
  });
  it('mở thẳng phần theo id (thẻ bắt đầu của màn 2): tiêu đề phần qua fmt, không còn {phanDien}', () => {
    const html = renderToStaticMarkup(<GuideDialog section="man-2" onClose={noop} device="may" />);
    expect(html).toContain('Màn 2: Đuổi theo Tí');
    expect(html).not.toContain('{');
    expect(html).toContain('aria-selected="true"');
  });
  it('id phần không đúng thì mở phần đầu', () => {
    expect(renderToStaticMarkup(<GuideDialog section="khong-co" onClose={noop} device="may" />)).toContain('Đi lại và camera');
  });
  it('lời theo thiết bị: máy tính nói phím, điện thoại nói chạm và vuốt', () => {
    const may = renderToStaticMarkup(<GuideDialog section="di-lai" onClose={noop} device="may" />);
    const dt = renderToStaticMarkup(<GuideDialog section="di-lai" onClose={noop} device="dt" />);
    expect(may).toContain('phím W A S D');
    expect(may).not.toContain('cần điều khiển');
    expect(dt).toContain('cần điều khiển');
    expect(dt).not.toContain('phím W A S D');
    const first = GUIDE_SECTIONS[0].trang[0] as GuidePage;
    expect(guideText(first, 'dt')).not.toBe(guideText(first, 'may'));
  });
  it('hình theo thiết bị: máy tính có phím, điện thoại có cần điều khiển', () => {
    expect(renderToStaticMarkup(<GuideDialog section="di-lai" onClose={noop} device="may" />)).toContain('data-art="phim-di-chuyen"');
    expect(renderToStaticMarkup(<GuideDialog section="di-lai" onClose={noop} device="dt" />)).toContain('data-art="can-dieu-khien"');
  });
  it('bố cục điện thoại ngang: hình bên trái, lời bên phải (hai cột khi màn thấp dưới 500px)', () => {
    const html = renderToStaticMarkup(<GuideDialog onClose={noop} device="may" />);
    expect(html).toContain('[@media(max-height:500px)]:grid-cols-2');
  });
});

describe('hình của trang hướng dẫn', () => {
  it('mọi hình minh họa SVG vẽ được, ẩn với phần mềm đọc màn hình, đúng khung 16:9', () => {
    for (const id of GUIDE_ART_IDS) {
      const html = renderToStaticMarkup(<GuideArt id={id} />);
      expect(html, id).toContain('<svg');
      expect(html, id).toContain('viewBox="0 0 320 180"');
      expect(html, id).toContain('aria-hidden="true"');
      expect(html, id).toContain(`data-art="${id}"`);
    }
  });
  it('ảnh chụp thật: đọc theo đường dẫn ui/huong-dan/<id>; chưa có ảnh thì ô thay thế, không lỗi', () => {
    const html = renderToStaticMarkup(<GuideFigureView figure={{ shot: 'cho-di-lai' }} />);
    expect(html).toContain('aspect-video');
    expect(html).toContain('role="img"'); // manifest chưa tải: ô màu thay thế
  });
});

describe('nút "Hướng dẫn chơi" ở HUD', () => {
  it('có nút ? (nhãn đọc màn hình "Hướng dẫn chơi") cạnh Menu khi có onGuide; không có thì không hiện', () => {
    const withGuide = renderToStaticMarkup(<Hud quest="x" pages={0} onMenu={noop} onGuide={noop} />);
    expect(withGuide).toContain('data-testid="nut-huong-dan"');
    expect(withGuide).toContain('aria-label="Hướng dẫn chơi"');
    expect(withGuide.indexOf('nut-huong-dan')).toBeLessThan(withGuide.indexOf('Mở menu'));
    const without = renderToStaticMarkup(<Hud quest="x" pages={0} onMenu={noop} />);
    expect(without).not.toContain('nut-huong-dan');
  });
  it('phần tử gốc của HUD có data-hud (script chụp ảnh ẩn HUD theo thuộc tính này)', () => {
    expect(renderToStaticMarkup(<Hud quest="x" pages={0} onMenu={noop} />)).toContain('data-hud');
  });
});
