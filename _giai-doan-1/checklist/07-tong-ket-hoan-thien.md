# PROMPT 7/7 — TỔNG KẾT, THỬ THÁCH CUỐI & HOÀN THIỆN

Tiếp tục dự án Sổ Chung. Prompt này làm hai việc:

- Xây trang Tổng kết (mở khi xong Bài 5).
- Rà soát lần cuối toàn bộ web.

Khi xong, liệt kê những gì đã làm, số liệu Lighthouse đo được, và những điểm còn chưa chắc chắn.

## Phần A — Trang "Bức tranh toàn cảnh"

### 1. "Hành trình của một giao dịch"

Hoạt cảnh gồm 6 bước, có nút "Tiếp" và "Lùi". Mỗi bước gắn nhãn bài liên quan và nút "Ôn lại Bài X".

| Bước | Nội dung | Bài liên quan |
|---|---|---|
| 1 | An muốn gửi 5 xu cho Bình. An ký giao dịch bằng khóa riêng. | Bài 3 |
| 2 | Các node kiểm tra chữ ký bằng khóa công khai của An. | Bài 3 |
| 3 | Giao dịch được gói cùng nhiều giao dịch khác bằng cây Merkle; gốc Merkle được ghi vào trang mới. | Bài 4 |
| 4 | Trang mới giữ mã của trang trước, nhờ vậy nối được vào chuỗi. | Bài 1 |
| 5 | Các node tự kiểm tra trang mới; đa số đồng ý thì trang được ghi vào sổ của tất cả mọi người. | Bài 2 |
| 6 | Muốn sửa lại trang đó, kẻ gian phải tính lại mọi trang phía sau và nắm hơn 50% sức mạnh mạng. | Bài 1 + Bài 5 |

### 2. Sơ đồ khái niệm tương tác (SVG)

- Các khái niệm: Node, Cuốn sổ, Trang (khối), Mã trang và chuỗi, Giao dịch, Chữ ký và khóa, Gốc Merkle, Đồng thuận, Tấn công 51%.
- Các khái niệm nối với nhau bằng đường có nhãn quan hệ, ví dụ "giữ bản sao", "được ký bằng", "gói vào".
- Chạm vào một khái niệm: hiện 1–2 câu tóm tắt và nút "Ôn lại Bài X".

### 3. "Blockchain dùng để làm gì?" (4 thẻ)

| Thẻ | Nội dung |
|---|---|
| Tiền mã hóa | Bitcoin ra đời năm 2009: chuyển tiền trực tiếp, không cần trung gian. |
| Truy xuất nguồn gốc hàng hóa | Quét mã QR để xem hành trình của nông sản, từ nông trại tới cửa hàng. |
| Văn bằng, chứng chỉ số | Kiểm tra văn bằng thật hay giả chỉ trong vài giây. |
| Hợp đồng thông minh | Hợp đồng tự thực hiện khi đủ điều kiện. |

### 4. Thẻ "Nghĩ cho tỉnh táo"

- Không phải việc gì cũng cần blockchain. Nếu chỉ một người hay một tổ chức quản lý dữ liệu, cơ sở dữ liệu bình thường vừa nhanh hơn vừa rẻ hơn.
- Công nghệ blockchain khác với "đầu tư tiền ảo". Rất nhiều dự án coin là lừa đảo.
- Đừng bao giờ đưa khóa riêng cho ai, và đừng đầu tư theo lời rủ rê.

## Phần B — Thử thách cuối

- 6 câu trắc nghiệm, mỗi câu có giải thích ngay sau khi trả lời.
- Đạt từ 5/6 câu trở lên: nhận Chứng nhận.
- Chưa đạt: gợi ý những bài cần ôn, kèm nút "Làm lại".

| # | Câu hỏi | Lựa chọn | Đáp án đúng |
|---|---|---|---|
| 1 | Mã trang cuối là 40, nội dung trang mới là 25. Mã trang mới là bao nhiêu? | 5 / 105 / 65 / 50 | 5, vì (40 × 2 + 25) mod 100 = 105 mod 100 = 5 |
| 2 | Khi nhận một trang mới, node làm gì? | Tin ngay / Hỏi quản trị viên / So với sổ của mình và tính lại mã / Xóa trang cũ | So với sổ của mình và tính lại mã |
| 3 | Khóa nào phải giữ bí mật? | Khóa riêng / Khóa công khai / Cả hai | Khóa riêng |
| 4 | Với T_ab = T_a × 10 + T_b, biết T1 = 4 và T2 = 6. T12 bằng bao nhiêu? | 46 / 64 / 10 / 24 | 46 |
| 5 | Hacker nắm 51% sức mạnh mạng. Việc nào hacker KHÔNG làm được? | Chặn giao dịch / Đảo ngược giao dịch gần đây / Lấy tiền trong ví người khác | Lấy tiền trong ví người khác, vì không có khóa riêng của họ |
| 6 | Vì sao giữ 5/10 node chưa đủ để tấn công 51%? | Vì 50% chưa vượt quá một nửa / Vì cần đúng 51 node / Vì 5 là số lẻ | Vì 50% chưa vượt quá một nửa |

## Phần C — Chứng nhận

**Nội dung thẻ chứng nhận:**
- Dòng chữ "Chứng nhận hoàn thành khóa Sổ Chung".
- Tên học sinh.
- Ngày cấp, định dạng dd/mm/yyyy.
- Tổng số sao đạt được.
- Linh vật Bi đang ăn mừng.

**Nút "Lưu ảnh":**
- Vẽ chứng nhận trực tiếp bằng Canvas 2D, chỉ sau khi `document.fonts.ready` (để chữ tiếng Việt không lỗi dấu).
- Xuất ra file PNG để tải về.

## Phần D — Hoàn thiện & tối ưu

1. **Dung lượng bundle.**
   - Build và liệt kê kích thước từng chunk (dùng `rollup-plugin-visualizer` hoặc log của Vite).
   - Bảo đảm đúng ngân sách ở Prompt 1: JS tải ban đầu ≤ 120 KB gzip, mỗi bài ≤ 60 KB gzip.
   - Gỡ các dependency không dùng.
   - `canvas-confetti` và `@dnd-kit` chỉ được nằm trong các chunk thật sự cần chúng.
2. **Lighthouse (Mobile)** cho trang chủ và cho 1 màn chơi.
   - Mục tiêu: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
   - Sửa mọi vấn đề Lighthouse nêu ra.
3. **Kiểm tra thủ công.**
   - Ở các độ rộng 360px, 768px, 1280px, 1920px.
   - Với các cài đặt: chữ to (trình chiếu), giảm chuyển động, tắt âm thanh.
   - Chỉ dùng bàn phím, không dùng chuột.
4. **Self-test.** Chạy `#/dev/self-test`: phải đạt 100% ✅.
5. **Thẻ meta.**
   - `<html lang="vi">`.
   - Title: "Sổ Chung — Học blockchain bằng một cuốn sổ", kèm mô tả trang.
   - Favicon SVG là linh vật Bi; `theme-color` là màu mực tím.
   - Open Graph: ảnh PNG 1200×630 xuất sẵn, đặt trong `/public`.
6. **(Nên có) Chạy offline.**
   - Thêm `vite-plugin-pwa` (`registerType: 'autoUpdate'`, precache toàn bộ assets), để lớp học mạng yếu vẫn dùng được sau lần tải đầu.
   - Khi có bản cập nhật, hiện thông báo nhỏ "Đã có phiên bản mới" kèm nút "Tải lại".
7. **Rà lại toàn bộ chữ.**
   - Tiếng Việt có dấu đúng, không lỗi chính tả.
   - Thuật ngữ thống nhất theo bảng ở Prompt 1.
   - Mọi nút đều bắt đầu bằng động từ.
8. **README ngắn**, gồm:
   - Cách chạy: `npm install`, `npm run dev`.
   - Cách build và deploy tĩnh (Vercel hoặc Cloudflare Pages: build command `npm run build`, thư mục output `dist`).
   - Nơi chỉnh thông số game: `src/config/gameConfig.ts`.

## Checklist nghiệm thu cuối

- [ ] Học trọn từ Bài 1 tới Tổng kết mà không gặp lỗi. Tiến độ, sao và XP được lưu đúng.
- [ ] Chế độ giáo viên mở được mọi bài; "Xóa tiến độ" đưa web về trạng thái ban đầu.
- [ ] Chứng nhận tải về hiển thị đúng dấu tiếng Việt.
- [ ] Lighthouse Mobile đạt đủ mục tiêu ở mục D.2.
- [ ] `npm run build` không lỗi; thư mục `dist` mở bằng một static server bất kỳ đều chạy được.
