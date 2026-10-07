import { describe, expect, it } from 'vitest';
import { runLegacyTests } from '../legacy-test-runner';
import { tests } from './tests';

describe('Bài 1', () => {
  it('giữ đủ 8 test của giai đoạn 1', () => {
    expect(tests).toHaveLength(8);
  });
  runLegacyTests(tests);
});
