import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { villageKnowCards } from '@so-chung/core';
import { KnowCollectionDialog } from '../../../packages/core/src/ui/KnowCollectionDialog';

const cards = villageKnowCards('lang-giay');
const noop = () => {};

describe('Menu "Em có biết?" của làng (bước X3): bộ sưu tập thẻ', () => {
  it('đã nhặt 2 trong 4 thẻ: tiêu đề "(2/4)", thẻ đã nhặt hiện tiêu đề và bấm được, thẻ chưa nhặt hiện dấu "?" và mờ (không bấm được)', () => {
    const html = renderToStaticMarkup(<KnowCollectionDialog cards={cards} mask={0b0101} total={4} onClose={noop} />);
    expect(html).toContain('Em có biết? (2/4)');
    expect((html.match(/data-testid="the-da-nhat"/g) ?? []).length).toBe(2);
    expect((html.match(/data-testid="the-chua-nhat"/g) ?? []).length).toBe(2);
    expect(html).toContain(cards[0].title);
    expect(html).toContain(cards[2].title);
    expect(html).not.toContain(cards[1].title); // thẻ chưa nhặt không lộ nội dung
    expect(html).not.toContain(cards[3].title);
    expect(html).toContain('>?<');
    expect(html).toContain('Chưa nhặt');
    expect(html).toContain('disabled');
    expect(html).toContain('role="dialog"');
  });
  it('chưa nhặt thẻ nào: 4 dấu "?", không thẻ nào bấm được; nhặt đủ: không còn dấu "?"', () => {
    const none = renderToStaticMarkup(<KnowCollectionDialog cards={cards} mask={0} total={4} onClose={noop} />);
    expect((none.match(/data-testid="the-chua-nhat"/g) ?? []).length).toBe(4);
    expect(none).toContain('(0/4)');
    const all = renderToStaticMarkup(<KnowCollectionDialog cards={cards} mask={0b1111} total={4} onClose={noop} />);
    expect(all).not.toContain('the-chua-nhat');
    expect(all).toContain('(4/4)');
    for (const c of cards.slice(0, 4)) expect(all).toContain(c.title);
  });
  it('chỉ liệt kê đúng số thẻ rải trong làng (total), không hơn số thẻ của bài', () => {
    const html = renderToStaticMarkup(<KnowCollectionDialog cards={cards} mask={0} total={2} onClose={noop} />);
    expect((html.match(/data-testid="the-chua-nhat"/g) ?? []).length).toBe(2);
  });
});
