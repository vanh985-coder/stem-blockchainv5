/** Điền {tên} trong một câu của content/teacher.ts. Biến không có thì giữ nguyên. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
