/**
 * Cờ "hội làng đã ra mắt" (mặc định false, mốc 3 sửa sau B5). Khi đủ 4 Trang Sổ Vàng mà hội làng chưa có (`/hoi-lang`, spec 10, bước H1), dòng nhiệm vụ nói "Hội làng sắp mở" và không có mũi tên
 * hay điểm đến trên bản đồ. Bước H1 chỉ cần đổi cờ này thành true: dòng nhiệm vụ và lời Bi chuyển sang "Cả làng đang mở hội. Hãy đến dự hội làng nhé!".
 */
export const FESTIVAL_LAUNCHED = false;
