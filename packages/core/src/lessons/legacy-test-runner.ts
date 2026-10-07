import { expect, it } from 'vitest';

/** Dạng test của giai đoạn 1: { name, expected, actual() } trong tests.ts của từng bài. */
export interface LegacyTest {
  name: string;
  expected: unknown;
  actual: () => unknown;
}

// Giữ nguyên cách so sánh của trang SelfTest giai đoạn 1.
export function deepEqual(a: unknown, b: unknown): boolean {
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
    if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

function show(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Mỗi phần tử của tests.ts thành một test vitest, so sánh bằng deepEqual cũ. */
export function runLegacyTests(tests: LegacyTest[]): void {
  for (const t of tests) {
    it(t.name, () => {
      const actual = t.actual();
      expect(deepEqual(actual, t.expected), `expected ${show(t.expected)}, got ${show(actual)}`).toBe(true);
    });
  }
}
