import { describe, expect, it } from 'vitest';
import { parsePageCodeInput } from './pageCodeInput';
import { pageCode } from './chain';

describe('page code calculator input', () => {
  it('uses the pageCode formula, not the public-key formula', () => {
    expect(pageCode(parsePageCodeInput('57')!, parsePageCodeInput('36')!)).toBe(50);
  });
  it('accepts both boundaries', () => {
    expect(parsePageCodeInput('0')).toBe(0);
    expect(parsePageCodeInput('99')).toBe(99);
  });
  it.each(['', ' ', 'abc', '-1', '1.5', '1e1', '100', 'Infinity', '5x'])('rejects %j safely', (text) => {
    expect(parsePageCodeInput(text)).toBeNull();
  });
});
