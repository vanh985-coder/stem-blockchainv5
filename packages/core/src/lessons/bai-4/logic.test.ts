import { describe, expect, it } from 'vitest';
import { runLegacyTests } from '../legacy-test-runner';
import { tests } from './tests';

describe('Bài 4', () => {
  it('giữ đủ 12 test của giai đoạn 1', () => {
    expect(tests).toHaveLength(12);
  });
  runLegacyTests(tests);
});
