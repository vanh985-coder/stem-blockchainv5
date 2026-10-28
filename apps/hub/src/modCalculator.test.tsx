import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ModCalculator } from '../../../packages/village-lang-khac-dau/src/ui/ModCalculator';

describe('ModCalculator presentation', () => {
  const onOpenChange = () => {};

  it('inline is visible without opening or auto-focusing an input', () => {
    const html = renderToStaticMarkup(<ModCalculator inline open={false} onOpenChange={onOpenChange} />);
    expect(html).toContain('data-testid="may-tinh-mod"');
    expect(html).toContain('data-testid="o-nhap-x"');
    expect(html).toContain('role="group"');
    expect(html).not.toContain('data-testid="nut-may-tinh-mod"');
    expect(html).not.toContain('autofocus');
  });

  it('keeps the default closed/open dialog for screen 9', () => {
    const closed = renderToStaticMarkup(<ModCalculator open={false} onOpenChange={onOpenChange} />);
    expect(closed).toContain('data-testid="nut-may-tinh-mod"');
    expect(closed).not.toContain('data-testid="may-tinh-mod"');
    const open = renderToStaticMarkup(<ModCalculator open onOpenChange={onOpenChange} />);
    expect(open).toContain('role="dialog"');
    expect(open).toContain('data-testid="o-nhap-x"');
  });
});
