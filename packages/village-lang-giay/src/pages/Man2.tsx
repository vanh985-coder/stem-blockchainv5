import { MiniGameLevel } from '@so-chung/core';
import { RUNNER_SPEC } from '../runner/runnerConfig';
import { RunnerGame } from '../runner/RunnerGame';

/** Màn 2 "Đuổi theo {phanDien}": game chạy 3D bọc trong khung game phụ (thẻ bắt đầu, màn kết quả). */
export default function Man2() {
  return <MiniGameLevel levelId={2} medals={RUNNER_SPEC.medals} renderGame={(p) => <RunnerGame {...p} />} />;
}
