# SPEC 10 — HỘI LÀNG, GỘP WEB & KIỂM TRA (mốc 3: hội làng; gộp web và kiểm tra làm sau cùng)

## 1. Hội làng `/hoi-lang` (trong hub)

**Mở khi:** đủ 4 Trang Sổ Vàng.

**Cảnh:** chợ phiên ban đêm (đổi ánh sáng sang tông đêm ấm), đèn lồng do code dựng giăng khắp nơi và phát sáng, cổng các làng mở toang. Mở đầu bằng ảnh truyện số 12 kèm lời. Các nhân vật đứng ở 6 gian: người không có xương thì nhún vui theo spec 03 mục 3.4.

**Đi dạo ôn bài — "Hành trình của một giao dịch":**
- 6 gian hàng. Mũi tên trên nền chỉ thứ tự 1 → 6.
- Tương tác với từng gian thì nhân vật nói một câu, kèm nút "Ôn lại màn X".

| # | Nhân vật | Câu nói | Ôn lại |
|---|---|---|---|
| 1 | Cô Chi | "Người mua đóng dấu lên giấy giao dịch bằng khuôn riêng của mình." | Màn 7 |
| 2 | Chú Dũng | "Cả làng kiểm con dấu bằng mẫu công khai treo ở đình." | Màn 7 |
| 3 | Thầy Linh | "Giao dịch trong ngày được gộp lên cây, ra một số gốc ghi vào trang mới." | Màn 10 |
| 4 | Bác An | "Trang mới giữ mã của trang trước, nhờ vậy nối vào chuỗi." | Màn 1 |
| 5 | Cụ Bình | "Nhà nào cũng kiểm trang mới; đa số đồng ý thì ghi vào sổ của mọi nhà." | Màn 4 |
| 6 | {phanDien} | "Muốn sửa lén phải tính lại mọi trang sau và sửa sổ của phần lớn các làng. {phanDien} thử rồi, không được đâu!" | Màn 1 và màn 4 |

**Thử thách cuối** (trên sân khấu, Bi dẫn):
- 6 câu theo danh sách trong `CAU-HOI-ON-TAP.md`, dùng `QuizCard`. Ghi `quiz_answers` với `level_id = 0`.
- Đạt từ 5/6 trở lên: nhận **bằng khen của làng**.
- Chưa đạt: Bi gợi ý màn cần ôn, kèm nút "Làm lại".

**Bằng khen:**
- Nền là ảnh `ui/bang-khen-khung`. Code viết lên: "Bằng khen của làng — đã học xong bí quyết giữ Sổ Chung", tên học sinh, ngày cấp (dd/mm/yyyy), tổng số sao.
- Nút "Lưu ảnh": vẽ bằng Canvas 2D, chỉ sau khi `document.fonts.ready`, rồi xuất PNG.

**Tỉnh giấc:**
- Chiếu ảnh truyện 13 và 14 kèm lời.
- Dòng cuối: "Cảm ơn em đã chơi! — [tên nhóm]".
- Nút "Chơi lại các màn" và "Về trang chủ".
- Lưu cờ "đã xem kết thúc".

## 2. Gộp các subdomain thành một web

1. **Hub nhận các làng:** trong `apps/hub`, import 4 gói `@sochung/village-*` và gắn route của từng gói dưới `/lang/<id>`. Mỗi gói tải lười, chỉ tải khi vào làng đó.
2. **Bật chế độ gộp:** đặt `VITE_MERGED=true`. Cổng làng trong chợ và nút "Về chợ" lúc này điều hướng nội bộ, không tải lại trang.
3. **Chuyển hướng subdomain cũ:** đổi `vercel.json` của 4 project làng để mọi đường dẫn chuyển về web chính. Ví dụ với Làng Giấy:
   ```json
   { "redirects": [{ "source": "/(.*)", "destination": "https://ten-mien.vn/lang/lang-giay", "permanent": false }] }
   ```
4. **Giữ vỏ chạy riêng `apps/lang-*`** để sửa lỗi từng làng sau này. Đổi tên miền của chúng thành tên miền thử nghiệm (ví dụ `thu-lang-giay.ten-mien.vn`), hoặc chỉ chạy trên máy.
5. **Supabase:** giữ nguyên danh sách Redirect URLs.

## 3. Kiểm tra toàn bộ

**Chơi trọn từ đầu:**
- Tạo tài khoản mới, đi qua: trang chủ → truyện → chợ → 12 màn → hội làng → bằng khen → tỉnh giấc. Không gặp lỗi.
- Làm lại với tài khoản Google.
- Chơi thử rồi mới đăng nhập: tiến độ được gộp.

**Giáo viên:**
- Tạo lớp; 2 học sinh thử vào lớp.
- Bảng tiến độ và tab câu hỏi khớp với những gì học sinh đã làm.
- Đặt lại mật khẩu được.
- Xuất CSV được.

**Bảo mật:** chạy lại 4 bài thử RLS ở spec 02, cộng thêm 2 bài:
- giáo viên A không thấy lớp của giáo viên B;
- học sinh gọi `class_progress` thì nhận về rỗng.

**Hiệu năng:**
- Trang đầu tải dưới 3 giây trên mạng 4G.
- Ở mức chất lượng Thấp, trên điện thoại tầm trung, chợ và cả 12 màn đều đạt ít nhất 30fps.
- Vào rồi ra một màn bất kỳ 10 lần liên tiếp, bộ nhớ (`renderer.info.memory`) không tăng dần.

**Thiết bị:** thử ở 360px, 768px, 1366px và 1920px; trên Chrome điện thoại, Safari iPhone, và Chrome/Edge máy tính.

**Nội dung:**
- Rà toàn bộ chữ tiếng Việt: chính tả, dấu, cách xưng hô "em", thuật ngữ thống nhất.
- Mọi ảnh và model đều có. Nếu thiếu file nào, hình thay thế hiện đúng.

**Self-test:** `pnpm test` và `/dev/self-test` đều đạt 100% ✅.

**Thông tin trang:**
- Title "Giấc mơ Sổ Chung", có mô tả trang.
- Favicon là Bi.
- Ảnh chia sẻ dựng từ `logo-art`.
- Có trang `/quyen-rieng-tu`.

## 4. Ra mắt

1. **Thử với một nhóm nhỏ trước,** 5–10 học sinh. Ghi lại các lỗi gặp phải.
2. **Sửa lỗi,** rồi gửi đường dẫn và mã lớp cho giáo viên.
3. **Theo dõi:** xem Supabase (Auth, Database, Logs) và Vercel Analytics trong tuần đầu.

## Checklist nghiệm thu

- [ ] Hội làng: đủ 6 gian, thử thách cuối, bằng khen lưu ra ảnh đúng dấu tiếng Việt, ảnh tỉnh giấc.
- [ ] Web đã gộp: đi qua các làng không tải lại trang; subdomain cũ chuyển hướng đúng.
- [ ] Mọi mục ở phần 3 đều đạt.
