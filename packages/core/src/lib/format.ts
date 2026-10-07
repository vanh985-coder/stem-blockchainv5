/**
 * Các hàm định dạng văn bản và số liệu chuẩn tiếng Việt cho ứng dụng "Sổ Chung"
 */

/**
 * Định dạng số thập phân theo tiếng Việt (dấu phẩy)
 * Ví dụ: 3.7 -> "3,7"
 */
export function formatDecimal(val: number): string {
  if (isNaN(val)) return '0';
  return val.toString().replace('.', ',');
}

/**
 * Định dạng số khoa học tiếng Việt dùng dấu ^
 * Ví dụ: 3.7e51 -> "3,7 × 10^51"
 */
export function formatSci(val: number): string {
  if (isNaN(val)) return '0';
  const expStr = val.toExponential();
  const [coeff, exponent] = expStr.split('e');
  const coeffVi = coeff.replace('.', ',');
  const expNum = parseInt(exponent, 10);
  return `${coeffVi} × 10^${expNum}`;
}

/**
 * Định dạng số theo quy ước Việt Nam:
 * Dấu chấm (.) phân tách hàng nghìn, dấu phẩy (,) phân tách thập phân.
 * Ví dụ: 1000003 -> "1.000.003"
 */
export function formatNumber(val: number | bigint): string {
  if (typeof val === 'number') {
    if (isNaN(val)) return '0';
    if (!isFinite(val)) return val > 0 ? '+∞' : '-∞';

    // Xử lý số cực lớn (lớn hơn hoặc bằng 10^15 hoặc cực nhỏ)
    const absVal = Math.abs(val);
    if (absVal >= 1e15) {
      return formatSci(val);
    }

    const parts = val.toString().split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (parts.length > 1) {
      return `${integerPart},${parts[1]}`;
    }
    return integerPart;
  }

  // BigInt
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Định dạng thời gian theo mm:ss
 * Ví dụ: 85 giây -> "01:25"
 */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Định dạng điểm XP hiển thị
 * Ví dụ: 15 -> "+15 XP"
 */
export function formatXP(xp: number): string {
  return `+${formatNumber(xp)} XP`;
}
