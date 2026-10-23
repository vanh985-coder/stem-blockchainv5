/**
 * Cách viết lũy thừa chung của game (bước sửa sau HD): số mũ là CHỈ SỐ TRÊN, giống trang bài học 3 (màn 7: `5<sup>x</sup> mod 23`, hay `5^^x^^` qua `rich()`).
 * Một hàm duy nhất `formatPower` dựng chuỗi có dấu đánh dấu `^^` cho thẻ ("Khớp rồi! 5^^3^^ mod 23 = 10"), máy tính mod, câu nhắc và hướng dẫn; nơi hiện chữ đổi dấu thành chỉ số trên bằng `rich()`
 * (ui/rich.tsx). Nơi chỉ nhận chữ thường (nhãn đọc màn hình) dùng `plainPower`.
 */

/** Lũy thừa `base` mũ `exp` dạng có dấu đánh dấu: formatPower(5, 3) = "5^^3^^" (hiện 5³ qua rich()). */
export function formatPower(base: number | string, exp: number | string): string {
  return `${base}^^${exp}^^`;
}

/** Bỏ dấu đánh dấu số mũ để thành chữ thường: "5^^x^^ mod 23" → "5^x mod 23" (cho nhãn đọc màn hình). */
export function plainPower(text: string): string {
  return text.replace(/\^\^([^^]*)\^\^/g, '^$1');
}

/**
 * Chỗ điền tự động cho chữ hướng dẫn của game (`fmt` luôn có sẵn): {congThuc} là công thức khóa công khai 5^x mod 23; {viDu}, {viDuX}, {viDuY} là ví dụ khuôn tập 3 ↔ mẫu công khai 10
 * (5^3 mod 23 = 10; test kiểm khớp `publicKey` của Bài 3).
 */
export const POWER_NAMES: Readonly<Record<string, string>> = {
  congThuc: `${formatPower(5, 'x')} mod 23`,
  viDuX: '3',
  viDuY: '10',
  viDu: `${formatPower(5, 3)} mod 23 = 10`,
};
