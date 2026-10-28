# SPEC 10 — HỘI LÀNG, GỘP WEB & KIỂM TRA (mục 1, hội làng: thuộc CUỐI MỐC 4, làm sau cùng; mục 2 đến 4, gộp web, kiểm tra toàn bộ và ra mắt: thuộc CUỐI MỐC 3)

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

**Đã làm ở bước G1 (mốc 3):**
- `apps/hub/src/villageRoutes.tsx` nạp 4 gói `@so-chung/village-*` bằng `import()` riêng từng làng (mỗi làng là một phần mã tải lười), gắn dưới `/lang/<id>/*` ở `apps/hub/src/App.tsx` khi `VITE_MERGED=true`; trong làng, `useRoutes` dựng lại các route `VillageModule` (`man/<n>` giữ nguyên). Tắt cờ thì hub không có các route này, các vỏ `apps/lang-*` chạy như trước.
- Điều hướng nội bộ khi `VITE_MERGED=true`: cổng làng và biển gỗ trong chợ, "Về làng", "Về chợ", "Chơi tiếp", nút "Về bản đồ" của `LevelGuard` và nút "Vào" ở `/ban-do` (`openLevel` trong `config/urls.ts`: dùng `navigate` khi gộp, tải trang khi không gộp).
- Cookie: không đổi gì. `sc_guest` và cookie phiên đã đặt `Domain=VITE_COOKIE_DOMAIN` (tên miền cha) từ đầu, nên người chơi cũ đọc được tiến độ ở web chính (test `progress/mergedCookies.test.ts`).
- `deploy/Caddyfile`: 4 site làng (8082 đến 8085) chỉ còn `redir {$HUB_ORIGIN:https://stem-block.blockchainptit.com}{uri} 302` (giữ nguyên đường dẫn và tham số; `HUB_ORIGIN` do docker-compose đặt từ `VITE_HUB_URL`). Bản cũ để ở `deploy/Caddyfile.truoc-gop` để quay về. Deploy và quay về: `docs/DEPLOY.md` mục (j). Supabase Redirect URLs giữ nguyên.
- Số đo bản build: trang đầu của hub 454.966 byte (gzip 133.009) trước, 460.346 (gzip 136.482) sau: +1,2% / +2,6%, dưới ngưỡng 5%. Mã từng làng chỉ tải khi vào: Làng Giấy gồm các màn 1 đến 3 khoảng 80,9 KB (gzip 28,5 KB), Làng Dệt 55,7 KB (22,1), Làng Khắc Dấu 61,9 KB (23,1), Làng Bạc 76,1 KB (28,7); phần dùng chung (three, trang bài học) đã nằm trong gói của hub. Kiểm bằng Chrome điều khiển tự động trên bản build: trang chủ → chợ → vào từng làng → một màn → "Về làng", 3 vòng liên tiếp: 1 lần tải trang (lần đầu), 0 lần sau đó; `/ban-do` mở được cả 12 màn bằng "Vào" không tải lại; F5 ở `/lang/lang-bac/man/12` vào đúng màn 12; số `geometries` và `textures` đứng yên (114 và 92) sau mỗi vòng. Spec 03 mục 9 giữ số đo 3D cũ (G1 không đổi cảnh).
- Lệnh `pnpm try:lan` không có trong repo, nên không kiểm.

**Việc gốc của mục 2** (giữ để đối chiếu):

1. **Hub nhận các làng:** trong `apps/hub`, import 4 gói `@sochung/village-*` và gắn route của từng gói dưới `/lang/<id>`. Mỗi gói tải lười, chỉ tải khi vào làng đó.
2. **Bật chế độ gộp:** đặt `VITE_MERGED=true`. Cổng làng trong chợ và nút "Về chợ" lúc này điều hướng nội bộ, không tải lại trang.
3. **Chuyển hướng subdomain cũ:** sửa `deploy/Caddyfile` để 4 site làng (cổng 8082–8085) chuyển mọi đường dẫn về web chính. Ví dụ với Làng Giấy:
   ```
   http://:8082 {
   	redir https://stem-block.blockchainptit.com/lang/lang-giay 302
   }
   ```
4. **Giữ vỏ chạy riêng `apps/lang-*`** để sửa lỗi từng làng sau này. Đổi tên miền của chúng thành tên miền thử nghiệm (ví dụ `thu-lang-giay.ten-mien.vn`), hoặc chỉ chạy trên máy.
5. **Supabase:** giữ nguyên danh sách Redirect URLs.

## 3. Kiểm tra toàn bộ

**Chơi trọn từ đầu:**
- **Đường chơi trọn của mốc 3:** tạo tài khoản mới, đi qua trang chủ → truyện → chợ → 12 màn → cao trào. Không gặp lỗi. (Hội làng, bằng khen và tỉnh giấc thuộc cuối mốc 4, nên chưa có ở mốc 3; khi làm hội làng thì nối thêm vào cuối đường này: … → cao trào → hội làng → bằng khen → tỉnh giấc.)
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
3. **Theo dõi:** xem Supabase (Auth, Database, Logs) và nhật ký của Caddy (`docker logs so-chung-web`) trong tuần đầu.

## Checklist nghiệm thu

- [ ] Hội làng: đủ 6 gian, thử thách cuối, bằng khen lưu ra ảnh đúng dấu tiếng Việt, ảnh tỉnh giấc.
- [ ] Web đã gộp: đi qua các làng không tải lại trang; subdomain cũ chuyển hướng đúng.
- [ ] Mọi mục ở phần 3 đều đạt.
