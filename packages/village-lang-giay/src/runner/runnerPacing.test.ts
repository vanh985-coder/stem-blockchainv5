import { describe, expect, it } from 'vitest';
import { RUNNER_SPEC } from './runnerConfig';
import { createRunner } from './runnerLogic';

describe('Màn 2: ghi đè nhịp video chỉ có trong demo', () => {
  it('ván mặc định giữ 4 vòng, mỗi vòng 25 giây', () => {
    const s = createRunner({ seed: 1 });
    expect([s.rounds, s.roundSec]).toEqual([4, 25]);
    expect([RUNNER_SPEC.rounds, RUNNER_SPEC.roundSec]).toEqual([4, 25]);
  });
  it('tùy chọn roundSec đổi độ dài vòng, không đổi gì khác', () => {
    const s = createRunner({ seed: 1, rounds: 1, roundSec: 17 });
    expect([s.rounds, s.roundSec, s.hearts]).toEqual([1, 17, 3]);
  });
});
