import { describe, expect, it } from 'vitest';
import { runLegacyTests } from '../legacy-test-runner';
import { tests } from './tests';

describe('Bài 3', () => {
  it('giữ đủ 10 test của giai đoạn 1', () => {
    expect(tests).toHaveLength(10);
  });
  runLegacyTests(tests);
});
