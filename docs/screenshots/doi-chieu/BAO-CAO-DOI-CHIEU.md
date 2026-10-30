# Báo cáo: Bố cục đối chiếu trái–phải (Màn 4 — Bài 2 Làng Dệt) (30/10/2026)

## 1. Yêu cầu và mục tiêu
- Với màn 4 và các trạm có giao diện đối chiếu tương tự:
  - Màn hình đủ rộng (desktop ≥ 768px): bên trái là sổ / dữ liệu đối chiếu; bên phải là trang hoặc sổ đề xuất, hướng dẫn, máy tính `PageCodeCalculator` và nút trả lời.
  - Thanh vòng/tim đặt phía trên cả hai cột.
  - Tận dụng chiều rộng màn hình, giảm cuộn dọc; không thu nhỏ toàn bộ giao diện để ép vừa.
  - Điện thoại dọc hẹp (< 768px): xếp 1 cột, chữ dễ đọc, không tràn ngang toàn trang.
  - Không ép các màn có cấu trúc khác sang hai cột (ví dụ Trạm Khó màn 4 có cấu trúc đặt cọc và biểu quyết 4 người chơi).
  - Giữ nguyên công thức, luật, đề, điểm, tiến độ và chức năng máy tính.

## 2. Các trạm đã chuyển đổi
1. **Trạm Dễ (`packages/village-lang-det/src/bai-2/Easy.tsx`): Duyệt trang mới**
   - Thanh vòng/tim trên cùng (`max-w-6xl w-full`).
   - Bố cục lưới 2 cột: `grid grid-cols-1 md:grid-cols-2 gap-4 items-start`.
   - **Cột trái:** Sổ của em (2 trang cuối, làm nổi bật mã trang cuối X `lastCodeX`, văn bản hướng dẫn).
   - **Cột phải:** Người gửi (chân dung Chắn `PortraitFrame` + tên), Trang đề xuất (`TrangSo`), hướng dẫn 3 bước kiểm tra (Bước 1: lấy mã trang cuối; Bước 2: nhân đôi cộng nội dung; Bước 3: chia lấy dư 100 và so sánh), máy tính `PageCodeCalculator`, 2 nút biểu quyết Đồng ý / Từ chối.

2. **Trạm Trung bình (`packages/village-lang-det/src/bai-2/Medium.tsx`): So sổ trước khi duyệt**
   - Thanh vòng/tim trên cùng (`max-w-7xl w-full`).
   - Bố cục lưới 2 cột: `grid grid-cols-1 md:grid-cols-2 gap-4 items-start`.
   - **Cột trái:** Sổ của em (3 trang cuối của em + ô trang mới sẽ ở đây; badge mã cuối X `myLastCode`, hỗ trợ cuộn ngang nhẹ trong khung sổ nếu quá hẹp).
   - **Cột phải:** Sổ của người gửi (3 trang + trang mới đề xuất; badge hợp lệ/không hợp lệ khi trả lời), hướng dẫn kiểm tra, máy tính `PageCodeCalculator`, 2 nút biểu quyết Đồng ý / Từ chối.

3. **Trạm Khó:** Giữ nguyên bố cục dọc / 4 người chơi (cơ chế đặt cọc nộp tiền, xem cọc người khác, bỏ phiếu 4 người chơi không phù hợp chia 2 cột đối chiếu sổ).

## 3. Kết quả kiểm tra DOM tự động (`scripts/p-layout-check.mjs`)
Script chạy trên Chrome Headless tại 3 kích thước viewport chuẩn của dự án:
- **1366×768 (Desktop chuột):**
  - Cả Trạm Dễ và Trung bình chia 2 cột (`grid-cols-1 md:grid-cols-2`) rõ ràng, thanh vòng/tim nằm trên cùng.
  - Nhập máy tính `(10 × 2 + 24) mod 100 = 44` (Dễ) và `(15 × 2 + 30) mod 100 = 60` (Trung bình) tính toán chính xác.
  - Nhấp chuột nút Đồng ý / Từ chối mở `FeedbackSheet` giải thích; đóng `FeedbackSheet` tiếp tục bình thường.
- **360×800 (Di động dọc, cảm ứng):**
  - Tự động xếp 1 cột dọc (`grid-cols-1`), nội dung không tràn ngang màn hình, chữ to rõ ràng.
  - Chạm giả lập (`touchscreen.tap`) vào máy tính, nút biểu quyết, mở và đóng `FeedbackSheet` mượt mà.
- **844×390 (Di động ngang, cảm ứng):**
  - Tận dụng chiều ngang 2 cột cân đối, giảm thiểu cuộn trang, thanh vòng/tim dàn đều phía trên.
  - Chạm giả lập các thành phần giao diện đạt 100%.

**Tổng kết:** **42/42 kiểm đạt** (14 kiểm × 3 cỡ màn hình; chi tiết tại `ket-qua-doi-chieu.json`).

## 4. Minh chứng ảnh chụp
Đã chụp và lưu vào `docs/screenshots/doi-chieu/` (tất cả ảnh đều < 300 KB):
- `de-bo-cuc-doi-chieu-1366x768.jpg` (85.7 KB)
- `de-bo-cuc-doi-chieu-360x800.jpg` (34.3 KB)
- `de-bo-cuc-doi-chieu-844x390.jpg` (30.5 KB)
- `de-feedback-mo-1366x768.jpg` (74.7 KB)
- `de-feedback-mo-360x800.jpg` (30.5 KB)
- `de-feedback-mo-844x390.jpg` (26.4 KB)
- `tb-bo-cuc-doi-chieu-1366x768.jpg` (82.8 KB)
- `tb-bo-cuc-doi-chieu-360x800.jpg` (82.8 KB)
- `tb-bo-cuc-doi-chieu-844x390.jpg` (31.4 KB)
- `tb-feedback-mo-1366x768.jpg` (74.2 KB)
- `tb-feedback-mo-360x800.jpg` (36.4 KB)
- `tb-feedback-mo-844x390.jpg` (29.4 KB)
