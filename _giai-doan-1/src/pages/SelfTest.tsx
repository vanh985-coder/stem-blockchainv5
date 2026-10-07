import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface TestCase {
  name: string;
  expected: unknown;
  actual: () => unknown;
}

interface TestModule {
  tests?: TestCase[];
}

interface TestResult {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  error?: string;
  durationMs: number;
}

interface FileTestGroup {
  filePath: string;
  results: TestResult[];
  passedCount: number;
  failedCount: number;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;

  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (
      !deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k]
      )
    ) {
      return false;
    }
  }

  return true;
}

export const SelfTest: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<FileTestGroup[]>([]);
  const [running, setRunning] = useState(true);

  const runAllTests = async () => {
    setRunning(true);

    // Thu thập tất cả các file tests.ts bằng import.meta.glob (lazy)
    const testModules = import.meta.glob('/src/**/tests.ts') as Record<
      string,
      () => Promise<TestModule>
    >;

    const fileGroups: FileTestGroup[] = [];

    for (const [filePath, loadModule] of Object.entries(testModules)) {
      const moduleExport = await loadModule();
      const tests = moduleExport?.tests || [];
      const testResults: TestResult[] = [];

      for (const test of tests) {
        const start = performance.now();
        try {
          const actualValue = test.actual();
          const passed = deepEqual(actualValue, test.expected);
          testResults.push({
            name: test.name,
            passed,
            expected: test.expected,
            actual: actualValue,
            durationMs: Math.round((performance.now() - start) * 100) / 100,
          });
        } catch (err) {
          testResults.push({
            name: test.name,
            passed: false,
            expected: test.expected,
            actual: undefined,
            error: String(err),
            durationMs: Math.round((performance.now() - start) * 100) / 100,
          });
        }
      }

      fileGroups.push({
        filePath,
        results: testResults,
        passedCount: testResults.filter((r) => r.passed).length,
        failedCount: testResults.filter((r) => !r.passed).length,
      });
    }

    setGroups(fileGroups);
    setRunning(false);
  };

  useEffect(() => {
    void runAllTests();
  }, []);

  const total = groups.reduce((acc, g) => acc + g.results.length, 0);
  const totalPassed = groups.reduce((acc, g) => acc + g.passedCount, 0);
  const totalFailed = groups.reduce((acc, g) => acc + g.failedCount, 0);

  return (
    <div className="min-h-screen bg-[#F6F5FB] p-4 sm:p-8 font-body">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-2xl text-[#2A2340]">
              Dev Self-Test Runner
            </h1>
            <p className="text-xs text-[#6B6485]">
              Thu thập test tự động bằng <code className="bg-white px-1.5 py-0.5 rounded border border-[#E3E0EE]">import.meta.glob('/src/**/tests.ts')</code>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
            <Button variant="primary" size="sm" onClick={runAllTests}>
              Chạy lại test
            </Button>
          </div>
        </div>

        {/* Thẻ tóm tắt kết quả */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <span className="text-xs text-[#6B6485] font-semibold block">Tổng số test</span>
            <span className="font-display font-black text-2xl text-[#2A2340]">{total}</span>
          </Card>
          <Card className="p-4 text-center border-[#1FAF5A]/40 bg-[#F0FDF4]">
            <span className="text-xs text-[#1FAF5A] font-semibold block">Thành công (Passed)</span>
            <span className="font-display font-black text-2xl text-[#1FAF5A]">{totalPassed}</span>
          </Card>
          <Card className="p-4 text-center border-[#E5484D]/40 bg-[#FEF2F2]">
            <span className="text-xs text-[#E5484D] font-semibold block">Thất bại (Failed)</span>
            <span className="font-display font-black text-2xl text-[#E5484D]">{totalFailed}</span>
          </Card>
        </div>

        {/* Danh sách test nhóm theo đường dẫn file */}
        {running ? (
          <div className="p-8 text-center text-sm text-[#6B6485]">Đang chạy test...</div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <Card key={group.filePath} className="p-0 overflow-hidden shadow-sticker">
                {/* Header nhóm file */}
                <div className="bg-[#E9E4FF]/60 px-5 py-3 border-b border-[#E3E0EE] flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold text-[#5B3FD6]">
                    <span>📁</span>
                    <span>{group.filePath}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-[#1FAF5A]">✓ {group.passedCount}</span>
                    {group.failedCount > 0 && (
                      <span className="text-[#E5484D]">✗ {group.failedCount}</span>
                    )}
                  </div>
                </div>

                {/* Danh sách test case của file */}
                {group.results.length === 0 ? (
                  <div className="p-4 text-xs text-[#6B6485] italic">
                    Chưa có test nào (mảng tests rỗng)
                  </div>
                ) : (
                  <div className="divide-y divide-[#E3E0EE]">
                    {group.results.map((res, i) => (
                      <div
                        key={i}
                        className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                          res.passed ? 'bg-white' : 'bg-[#FFF0ED]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg shrink-0">{res.passed ? '✅' : '❌'}</span>
                          <div>
                            <div className="font-display font-bold text-sm text-[#2A2340]">
                              {res.name}
                            </div>
                            {!res.passed && (
                              <div className="text-xs text-[#E5484D] mt-1 space-y-0.5 font-mono">
                                <div>Expected: {JSON.stringify(res.expected)}</div>
                                <div>Actual: {JSON.stringify(res.actual)}</div>
                                {res.error && <div>Error: {res.error}</div>}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-[#6B6485] font-mono shrink-0">
                          {res.durationMs} ms
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
