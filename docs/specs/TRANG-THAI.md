# TRẠNG THÁI DỰ ÁN — Giấc mơ Sổ Chung

Cuối mỗi cửa sổ chat, Claude viết lại toàn bộ file này. Bạn xóa bản cũ trong project và tải bản mới lên (cả trong repo: `docs/specs/TRANG-THAI.md`).

## Thông tin chung

| Mục | Giá trị |
|---|---|
| Web thật | https://stem-block.blockchainptit.com (hub) |
| Subdomain làng | `sb-lang-giay`, `sb-lang-det`, `sb-lang-khac-dau`, `sb-lang-bac` · đồ họa: `sb-assets` (đều `.blockchainptit.com`) |
| Hosting | Windows Server, Docker Desktop (WSL2) + Caddy, 1 container, cổng 18081–18086 (đổi trong `deploy/.env`); Cloudflare Tunnel (file `config.yml`, cloudflared là dịch vụ Windows). Hướng dẫn: `docs/DEPLOY.md` |
| Cập nhật bản mới | Trên server: `git pull` → `docker compose -f deploy/docker-compose.yml up -d --build` |
| Supabase | Project `zlqxwbgcyudybxaynluf` (Singapore), migrations 0001, 0002; Edge Function `teacher-reset-password` (secret `USERNAME_EMAIL_DOMAIN`) |
| Email nội bộ | `<tên>@hs.blockchainptit.com`. **Bản ghi MX `hs` trên Cloudflare phải giữ mãi** (Supabase kiểm tra MX) |
| Tài khoản | Admin: Google của chủ dự án. Giáo viên thử: `gva`, `gvb` (dùng cho `pnpm rls:check`). Học sinh thử: `thu01`, `thu02` |
| Người code | Sonnet 5.5 qua Claude Code · nhịp 2–3 giờ/ngày, không hạn chót |

## Tiến độ theo mốc

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| 0. Đồ họa | DO-HOA 01–06, danh-sach-assets3.txt | ✅ Xong |
| 1. Lõi | Monorepo, ảnh + manifest, chân dung, giao diện chung, đăng nhập, tiến độ, trang chủ, truyện, bản đồ 2D, 4 bài học 2D, trang giáo viên, deploy Docker | ✅ **Xong, đã chạy trên mạng** (420 test xanh) |
| 2. Làng mẫu | Động cơ 3D tối thiểu, nén model khi build, chợ đơn giản, Làng Giấy 3D, màn 2, màn 3, 2 nhân vật 3D ở trang bài học | Chưa làm |
| 3. Nhân rộng | 3 làng còn lại; game 8 → 12 → 5 → 6 → 9 → 11; hội làng, bằng khen; gộp web và kiểm tra toàn bộ | Chưa làm |
| 4. Trau chuốt | Nhân vật nhìn theo đáp án, tư thế sad/point, cảnh mở đầu, chợ đông, tiệm đồ | Chưa làm |

## Quyết định đã chốt

**Từ trước:** bối cảnh Đại Việt thế kỷ XVI trong mơ; 4 loại cảnh; giữ subdomain; tên phản diện luôn `{phanDien}` (hiện là "Tí"); "Linh" ở Bài 3 đổi thành "Lan"; màn 5, 8, 9 như spec.

**Hạ tầng và bảo mật (mốc 1):**
- Bỏ Vercel. Deploy bằng Docker + Cloudflare Tunnel (spec 01 mục 7).
- Cookie đăng nhập dùng chung `.blockchainptit.com`. Chủ dự án chấp nhận việc cookie cũng gửi sang dự án khác cùng tên miền. **Admin và giáo viên làm việc trên hồ sơ trình duyệt riêng.**
- Supabase dùng bản trên mạng (không tự host). Mọi bảng bật RLS. `pnpm rls:check` kiểm tra 8 điều, phải 8/8.
- Sửa SQL spec 02: `protect_profile` cho phép sửa từ Table Editor (`auth.uid()` rỗng); `handle_new_user` không lỗi khi tên rỗng.
- Edge Function đặt lại mật khẩu: giáo viên của lớp hoặc admin; đuôi email lấy từ secret.

**Tiến độ (spec 02):**
- Chơi thử chỉ lưu ở cookie `sc_guest`. `sc_pending` là map theo `userId`, giữ lại khi đăng xuất lúc mất mạng.
- Gộp xu lấy **số lớn hơn** (xu chỉ tăng). Nếu sau này có cửa hàng tiêu xu thì phải xem lại.
- Vào lại bài học thì bắt đầu ở trạm đầu tiên chưa có sao; bấm được trạm đã mở.

**Bài học (đã ghi vào spec 05, 08):**
- Bài 1 trạm Dễ: nội dung trang do máy chọn ngẫu nhiên, học sinh chỉ tính mã trang.
- Bài 4 trạm Trung bình phần 3: 2 cây (trong sổ / bây giờ). Học sinh soi từ gốc xuống theo nhánh lệch để tìm lá {phanDien} đã sửa.
- Bài 4 ở mốc 1: thầy Linh trao trang thứ tư, Bi nói "Đủ 4 trang rồi! Cả làng đang mở hội.", hiện "Hội làng sắp mở".

**Giao diện (đã ghi vào spec 03, 04):**
- Mọi chữ hiển thị nằm trong `packages/core/src/content/`; `pnpm check:text` và test chuỗi thừa phải sạch. Cách sửa chữ: `content/HUONG-DAN-SUA-CHU.md`.
- `VnDialog` (kiểu visual novel) dùng cho truyện, giới thiệu làng và lời thoại bài học. Chân dung thở và nhún, lời hiện dần. Câu có `mood: 'vui'` tự dùng ảnh `ui/portraits/<id>-cuoi` nếu có.
- `/truyen`: 14 lượt dạng hộp thoại; nền ấm theo chủ đề (lượt 1–2 giấc mơ, 3–11 làng, 12–14 hội).
- Giới thiệu làng: lần đầu bấm vào làng trên bản đồ (lời trong `content/villageIntro.ts`); có nút "Xem lại giới thiệu".
- `NenTrangTri`: icon trôi theo chủ đề ở mọi trang. Trang bài học chỉ dùng 2 khoảng trống hai bên (từ khoảng 1300px); trang giáo viên icon đứng yên. Tắt khi bật "Giảm chuyển động".
- Trang bài học phóng to 1,35 lần từ 1280px khi **không có** 2 khung 3D (máy yếu, "Giảm chuyển động", "Chữ to"); khi có khung thì bảng thu nhỏ để chừa chỗ: f = 14% chiều rộng màn (kẹp 180–280px), s = min(1,35, (màn − 2 × (f + 16)) / 872) — 1280px: f 180, s ≈ 1,0; 1366px: f ≈ 191; 1536px: f ≈ 215; 1920px: s = 1,35. Bố cục quyết định lúc mở trang, khung ẩn về sau thì bảng không nhảy. Lý do: bảng 1200px chừa quá ít chỗ (khung chỉ hiện từ 1512px). Bản đồ lấp đầy màn hình từ 1024px.
- Ngân sách: trang đầu hub khoảng 89 KB gzip; trang bài học của 4 làng 117–125 KB gzip (giới hạn 150 KB; ba trạm của mỗi bài tải sau, lúc rảnh). Chunk 3D của 2 khung tải thêm sau khi trang đã hiện, chỉ khi có khung.

**Đồ họa:** 2 lớp nền màn 6 đã trong suốt sẵn, **bỏ việc tách nền trời**. Icon được tự tách nền khi build.

## Việc của mốc 2 đã ghi sẵn trong spec

- **2 khung 3D ở trang bài học** (spec 03 mục 4): **đã làm** (mốc 2, bước 5 và 5b), từ 1280px, học sinh bên trái, {phanDien} bên phải, một Canvas dùng drei `View`. Đúng thì học sinh `cheer`, {phanDien} giữ `idle`; sai thì {phanDien} `cheer`, học sinh `sad` (`hurt` chỉ để dành cho màn 5). Bảng thu nhỏ để chừa chỗ (xem mục Giao diện). Ẩn khi máy yếu, màn dưới 1280px, "Giảm chuyển động", "Chữ to", tải lỗi hoặc FPS dưới 30 trong 3 giây đầu. Bớt icon nền còn 2 mỗi bên khi khung hiện.
- Model `.glb` hiện khoảng 8 MB mỗi cái: phải nén trong `assets:build` trước khi dùng.
- Sprite, thẻ, ô lá chưa trong suốt: xử lý theo từng game (màn 3 ở mốc 2, còn lại ở mốc 3).

## Việc để sau / cần theo dõi

- **Nên làm trước mốc 2:** cho vài học sinh chơi thử bản trên mạng ở phòng máy trường, ghi lại lỗi và góp ý.
- **Trước khi dùng thật với học sinh:** xóa các tài khoản `test_rls_*`, `thu01`, `thu02` trong Authentication → Users.
- Docker Desktop chỉ chạy khi có người đăng nhập Windows. Server khởi động lại thì web báo 502 cho tới khi đăng nhập. Cân nhắc chạy Docker Engine trong Ubuntu WSL.
- Supabase miễn phí tự tạm dừng sau khoảng 1 tuần không ai dùng (kỳ nghỉ): vào trang quản lý bấm khôi phục.
- Admin chưa xóa được học sinh khỏi lớp (cần migration mới cho policy `members_delete`).
- Chữ in đậm trong `rich()` không còn màu riêng (đỏ, tím).
- Ảnh chân dung cười `<id>-cuoi.png`: tạo bằng ChatGPT nếu muốn.
- Có thể đổi tên Tí thành "Cuội": chỉ sửa `characters.ts` và lời truyện.
- Thư mục `_giai-doan-1/` đã hết dùng: xóa ở đầu mốc 2.
- Tải các spec đã sửa trong mốc 1 lên project claude.ai: 00, 01, 02, 03, 04, 05, 08, 09.

## Câu mở đầu cho cửa sổ tiếp theo

```
Mốc 2 — Làng mẫu. Spec: 01 mục 5 (phần model), 03 (động cơ 3D, nhân vật và hoạt ảnh, mức chất lượng, 2 khung 3D ở trang bài học), 04 mục 3 (chợ phiên), 05 (cảnh Làng Giấy, màn 2, màn 3). Đọc TRANG-THAI.md và các spec này, chia mốc 2 thành các bước nhỏ cho Claude Code, rồi đưa mình lời giao việc cho bước đầu tiên.
```
