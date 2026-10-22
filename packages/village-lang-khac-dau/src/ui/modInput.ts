/** Khoảng x Máy tính mod nhận: số nguyên 1 đến 22 (p − 1 với p = 23). */
export const MOD_X_MIN = 1;
export const MOD_X_MAX = 22;

/** Đọc ô nhập của Máy tính mod: trả về x nếu là số nguyên 1 đến 22 (cho phép khoảng trắng hai đầu), ngược lại null. */
export function parseModInput(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const x = Number(t);
  return x >= MOD_X_MIN && x <= MOD_X_MAX ? x : null;
}
