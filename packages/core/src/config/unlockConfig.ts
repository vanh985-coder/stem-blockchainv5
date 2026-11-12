/**
 * Cờ mở khóa màn (một chỗ duy nhất để bật hoặc tắt).
 * `moKhoaTatCa = true`: học sinh vào được MỌI màn bất kỳ lúc nào (bản đồ, cổng làng, biển gỗ, gõ thẳng đường dẫn), không cần xong màn trước
 * và không cần nhặt đủ thẻ "Em có biết?" của làng. Màn chưa chơi vẫn hiện là chưa xong; tiến độ, sao, nhiệm vụ, trang giáo viên giữ nguyên.
 * Muốn khóa lại như cũ: đổi thành false (logic khóa trong `progress/unlock.ts` và `knowCards.ts` vẫn còn nguyên).
 * Đối tượng (không phải hằng) để test đặt lại; test chạy với false (xem vitest.setup.ts) và truyền `openAll` khi cần thử cờ bật.
 */
export const unlockConfig = { moKhoaTatCa: true };
