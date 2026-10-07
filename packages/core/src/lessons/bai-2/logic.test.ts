import { describe, expect, it } from 'vitest';
import { runLegacyTests } from '../legacy-test-runner';
import { tests } from './tests';

describe('Bài 2', () => {
  it('giữ đủ 27 test của giai đoạn 1', () => {
    expect(tests).toHaveLength(27);
  });
  runLegacyTests(tests);
});
