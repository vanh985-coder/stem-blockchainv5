# TRẠNG THÁI DỰ ÁN — Giấc mơ Sổ Chung

Cuối mỗi cửa sổ chat, Claude viết lại toàn bộ file này. Bạn thay bản cũ trong project claude.ai và trong repo (`docs/specs/TRANG-THAI.md`).

## Thông tin chung

| Mục | Giá trị |
|---|---|
| Web thật | https://stem-block.blockchainptit.com (hub) |
| Subdomain | `sb-lang-giay`, `sb-lang-det`, `sb-lang-khac-dau`, `sb-lang-bac` (chỉ còn trang bài học và game) · đồ họa `sb-assets` |
| Hosting | Windows Server, Docker Desktop (WSL2) + Caddy, cổng 18081–18086; Cloudflare Tunnel (cloudflared là dịch vụ Windows). Hướng dẫn: `docs/DEPLOY.md` mục (h) lệnh deploy, (i) luật cache |
| Supabase | Project `zlqxwbgcyudybxaynluf` (Singapore), migrations 0001, 0002; Edge Function `teacher-reset-password` |
| Email nội bộ | `<tên>@hs.blockchainptit.com`; **giữ mãi bản ghi MX `hs`** trên Cloudflare |
| Tài khoản thử | Giáo viên `gva`, `gvb`; học sinh `thu01`, `thu02` |
| Người code | Mốc 1–2: Claude Code (Sonnet 5.5). **Mốc 3: Gemini CLI, đọc `GEMINI.md` ở gốc repo.** AI không tự commit/push; chủ dự án tự commit |

## Tiến độ

| Mốc | Trạng thái |
|---|---|
| 0. Đồ họa | ✅ Xong |
| 1. Lõi | ✅ Xong, đã chạy trên mạng |
| 2. Làng mẫu | ✅ **Xong phần code** (≈1458 test xanh). ⏳ **Chưa deploy, chưa thử máy thật (15b)** |
| 3. Nhân rộng | Chưa làm |
| 4. Trau chuốt | Chưa làm |

## Việc phải làm đầu tiên (15b)

1. **Web đang trả 530** (cả bản mốc 1): trên server kiểm `Get-Service cloudflared` (dừng thì `Start-Service cloudflared`) và `docker ps` (lỗi thì mở Docker Desktop).
2. Deploy theo `docs/DEPLOY.md` mục (h); tạo Cache Rule cho `sb-assets` theo mục (i). File `.glb` lần 2 phải `cf-cache-status: HIT`.
3. Thử thật: đăng nhập Google và bằng tên; giáo viên (vào thẳng chợ, không bị chặn thẻ); tài khoản cũ không bị bắt đọc truyện; trọn đường Làng Giấy.
4. **Điện thoại tầm trung, mức Thấp ≥ 30 FPS**: đi lại, bản đồ, nhặt thẻ, màn 2 vuốt, màn 3 kéo thẻ. Chưa có số đo nào trên máy thật.

## Quyết định đã chốt ở mốc 2

**Thế giới mở (thay một phần spec 01, 03, 04, 05):**
- Chợ và 4 làng là **một cảnh 3D ở `/cho`**. Chợ bán kính 42 ở giữa; 4 đường dài 30 (Bắc Giấy, Nam Dệt, Tây Khắc Dấu, Đông Bạc qua cầu); cổng làng ở 72; **mỗi làng bán kính 125, tâm ở 197, bao bằng lũy tre**.
- Subdomain làng: `/` và `/lang/<id>` chuyển về `/cho?tu=<id>`. "Về làng"/"Về chợ" về `/cho?tu=<id>`. `/ban-do` giữ cho máy yếu và giáo viên.
- Tải theo vùng; `ZonePrewarm` chỉ chuẩn bị sẵn **làng nhiệm vụ** và làng mà người chơi đang đi đường tới.
- Mũi tên **dưới chân** đi theo đồ thị đường; biển chỉ đường gỗ ở các ngã; **bản đồ nhỏ góc trái** (bắc ở trên, có tuỳ chọn xoay), **phím M / chạm** mở bản đồ lớn có tiến độ từng làng.
- Làng chưa mở: thấy từ xa, cổng đóng. Cảnh cổng Dệt mở chạy khi lần đầu tới gần sau Trang Sổ Vàng 1.

**Luồng người chơi:**
- Lần đầu (đăng ký, đăng nhập, Chơi thử): **bắt đọc hết 14 trang truyện**, rồi "Vào chợ phiên". Giáo viên và người đã có tiến độ được miễn.
- Lần đầu vào làng: cảnh mở đầu → **tìm 4 thẻ "Em có biết?" rải trong làng** (cột sáng, Bi gợi ý, dòng "Tìm thẻ n/4") → đủ thẻ mới vào được màn chơi. `/ban-do` cũng phải đọc đủ thẻ. Người đã xong màn 1 coi như có đủ thẻ.
- Xong màn 3 → bác An trao Trang Sổ Vàng → cổng làng sau mở.
- Hướng dẫn chơi chung chỉ còn **Đi lại** và **Nói chuyện** (gồm trang Tìm thẻ, Bản đồ nhỏ). Phần riêng của màn 2, 3 mở từ thẻ bắt đầu game.

**Đồ họa và model:**
- `assets:build`: meshopt + WebP; **3 bậc model**: chính (giảm mặt chế độ chặt, sai số 3%, không Permissive), `-vua` (~15.000 tam giác, chỉ tạo khi chế độ chặt xuống ≤ 25.000), `-xa` (~8.000, texture 512).
- Texture: 10 nhân vật 2048; cổng, cây đa, nhà 2048; đồ khác 1024.
- Nhân vật chuẩn hoá **cao 1,7, chân ở y = 0**; cỡ đồ vật trong `modelSizes.ts`.
- Ảnh hình rời: **tự tách nền ô vuông**; ảnh scenes/story/ui: **tự xoá dấu ngôi sao** của công cụ vẽ. Chân dung chụp từ model 3D (`/dev/portraits`).

**Hiệu năng (ngân sách):**
- Tam giác: **Thấp ≤ 270.000**, Vừa < 1.000.000, Cao < 1.500.000. Mức Thấp chỉ vẽ trong khoảng 38.
- Tải lần đầu `/cho` ≤ 25 MB (hiện 21–22 MB); mỗi vùng làng ≤ 15 MB (Làng Giấy 4–5 MB).
- Khựng: tối đa 1 khung > 50 ms, không khung nào > 100 ms khi vào làng. Lớp HTML phủ cảnh 3D **không dùng box-shadow/filter**.

**Điều khiển và giao diện:**
- Máy tính kiểu PUBG: bấm để khoá chuột, rê chuột xoay camera, Esc nhả khoá và mở menu; có độ nhạy chuột. Điện thoại: cần điều khiển + vuốt.
- Trang bài học: 2 khung 3D (học sinh trái, {phanDien} phải); **bảng thu nhỏ để chừa chỗ**: f = clamp(14% màn, 180, 280), s = min(1,35, (màn − 2(f+16)) / 872). Ẩn khi máy yếu, Giảm chuyển động, Chữ to.

**Màn 2 (chạy):** tốc độ **10, +0,3 mỗi 5 giây, tối đa 18**; khoảng cách hàng ≥ tốc độ × 1,2; {phanDien} làm rơi trang (tính vào ngân sách trang); 4 vòng câu hỏi; mốc điểm giữ như spec.

**Màn 3 (ghép sổ):** soi công thức hiện sẵn kết quả (đúng spec). Vòng 3 là **vòng giữ sổ 90 giây**: {phanDien} tráo trang 11 lần (9 → 6 giây), tối đa 3 ô chưa sửa, hồi đủ 3 tim đầu vòng 3, hết tim vẫn giữ điểm phần đã sửa. **Mốc 200 / 400 / 475** (tối đa 505).

## Việc để sau / cần theo dõi

- **Repo Git phình**: mỗi lần build lại model thêm vài chục MB nhị phân vào lịch sử. Xem xét Git LFS hoặc kho riêng cho `assets-build/` trước khi lịch sử quá nặng.
- Docker Desktop chỉ chạy khi có người đăng nhập Windows; cân nhắc Docker Engine trong WSL chạy như dịch vụ.
- Màn 3: bot trung bình hết tim ~30% (do kéo nhầm). Xem lại khi có học sinh chơi thật.
- Vào làng còn 1 cú khựng 55–76 ms lúc vùng làng gắn vào cảnh (mức Vừa, Cao).
- Bản đồ lớn trên điện thoại ngang phải cuộn mới thấy cột tiến độ.
- Mức Thấp: kiểm tra bằng mắt vật ở xa hiện ra (khoảng vẽ 38) có khó chịu không.
- Bàn chép sổ và cuốn Sổ Chung còn thô (mốc 4).
- Sửa chữ trên giao diện thì chạy lại `pnpm guide:capture`.
- 3 làng chưa dựng tạm dùng luật thẻ cũ (`knowSeen`) cho tới khi dựng ở mốc 3.
- `testTimeout` toàn monorepo là 30 giây (do máy bận lúc đo).
- Trước khi dùng thật: xoá tài khoản `test_rls_*`, `thu01`, `thu02`. Supabase miễn phí tự tạm dừng sau ~1 tuần không dùng.
- Từ mốc 1: admin chưa xoá được học sinh khỏi lớp (cần migration policy `members_delete`); chữ đậm trong `rich()` mất màu riêng.

## Ghi chú cho mốc 3

- Phạm vi (00-HUONG-DAN): cảnh 3 làng còn lại; game theo thứ tự **8 → 12 → 5 → 6 → 9 → 11**; hội làng, thử thách cuối, bằng khen; cuối mốc gộp web và kiểm tra toàn bộ (spec 10).
- **Cần quyết đầu mốc:** 3 làng to như Làng Giấy (bán kính 125, thẻ rải, ~+15–25 giờ so với ước tính 35–45 giờ) hay bản gọn hơn.
- Dùng lại: vùng làng, thẻ Em có biết, bản đồ nhỏ, Scene25D, MiniGameLevel, mẫu logic + test + mô phỏng bot. Khung cửi (Làng Dệt) nặng 134.000 tam giác, đo kỹ khi dựng.
- Tải lên project claude.ai các spec mới từ `docs/specs/`: 00, 01, 03, 04, 05, 06, 07, 08 (và file này). Sửa phần A của Instructions: người code là Gemini CLI.

## Câu mở đầu cho cửa sổ tiếp theo

```
Mốc 3 — Nhân rộng. Người code là Gemini CLI (đọc GEMINI.md trong repo); AI không tự commit. Đọc TRANG-THAI.md và spec 06, 07, 08, 10, cùng 03, 04, 05 bản mới (thế giới mở). Trước hết hướng dẫn mình làm xong 15b (khôi phục server, deploy, thử điện thoại). Sau đó hỏi mình chọn làm 3 làng to như Làng Giấy hay bản gọn hơn, rồi chia mốc 3 thành các bước nhỏ và đưa lời giao việc cho bước đầu tiên.
```