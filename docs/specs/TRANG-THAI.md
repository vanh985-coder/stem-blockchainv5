# TRẠNG THÁI DỰ ÁN — Giấc mơ Sổ Chung

Cuối mỗi cửa sổ chat, Claude viết lại toàn bộ file này. Bạn xóa bản cũ trong project và tải bản mới lên.

## Thông tin chung

| Mục | Giá trị |
|---|---|
| Tên miền | `blockchainptit.com` (hub `stem-block.`, làng và đồ họa `sb-*.`); cookie đăng nhập dùng chung `.blockchainptit.com` |
| Repo, Supabase | (chưa có) |
| Người code | Sonnet 5.5 qua Claude Code |
| Hosting | Windows Server: Docker (Caddy) + Cloudflare Tunnel; hub, 4 làng (subdomain), assets (spec 01 mục 7) |
| Nhịp làm | 2–3 giờ mỗi ngày; không còn hạn chót |

## Tiến độ theo mốc

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| 0. Đồ họa | DO-HOA 01–06, danh-sach-assets3.txt | ✅ Xong |
| 1. Lõi | Repo, deploy subdomain, xử lý ảnh, đăng nhập, lưu tiến độ an toàn giữa các subdomain, 4 bài học 2D (đổi nội dung), chân dung cắt từ ảnh gốc, trang truyện, bản đồ 2D, trang giáo viên | Chưa làm |
| 2. Làng mẫu | Động cơ 3D tối thiểu, xử lý đồ họa khi build, chợ đơn giản, Làng Giấy, màn 2, màn 3 | Chưa làm |
| 3. Nhân rộng | 3 làng còn lại (đơn giản); game 8 → 12 → 5 → 6 → 9 → 11; tách nền màn 6; hội làng, bằng khen; cuối mốc gộp web (spec 10 mục 2) và kiểm tra toàn bộ | Chưa làm |
| 4. Trau chuốt | Nhân vật nhìn theo đáp án ở mọi màn, tư thế sad và point, cảnh mở đầu, chợ đông đồ vật, tiệm đồ | Chưa làm |

## Quyết định đã chốt

- **Bối cảnh:** giấc mơ về Đại Việt thế kỷ XVI; 4 làng nghề quanh chợ phiên; lịch sử kể chung chung.
- **Kiến trúc:** **giữ subdomain** (hub cộng 4 làng), mỗi làng là một gói riêng. Có bản đồ 2D `/ban-do` để chọn màn.
- **Bốn loại cảnh:** 3D đi lại (chợ, làng, hội làng); 3D chạy (màn 2); 2.5D (màn 3, 5, 6, 8, 9, 11, 12); bài học 2D dùng lại code giai đoạn 1 (màn 1, 4, 7, 10).
- **Nhân vật:**
  - 4 nhân vật có xương Mixamo: học sinh, Tí, 2 dân làng (hoạt ảnh đã kiểm tra).
  - 6 người đứng yên: code làm nhún nhẹ.
  - Chân dung chụp một lần thành PNG. Bi do code dựng.
- **Đồ họa:** `assets/` gốc không đưa lên Git; build ra `assets-build/`.
- **Màn 5:** kiểu Talking Tom: chuột giấy, 5 vết mực là thua, Tí làm trùm 10 lần, mỗi lần một câu hỏi. Nhân vật nhìn theo đáp án ngay từ đầu.
- **Màn 8:** "bộ khuôn tập của chú Dũng". Thẻ khuôn không ghi tên, chỉ dùng bộ số {3, 5, 6, 7, 8, 9, 10, 11, 14, 16, 18, 20}; thẻ mẫu chỉ ghi số; phải tính mới ghép được.
- **Màn 9:** bắn thuốc chữa gà, chỉ tính xuôi.
- **Đăng nhập:** Google (consent screen phải ở trạng thái In production), hoặc tên đăng nhập và mật khẩu (Supabase).
  - Dữ liệu trên máy tách theo chủ; chỉ gộp bản chơi thử khi học sinh đồng ý.
  - Xong màn thì lưu ngay rồi mới cho rời trang.
  - Chơi thử lưu trong cookie `sc_guest` của tên miền cha, để hub và các làng cùng đọc được.
  - Có trang giáo viên.
- **Mở khóa:** có trạng thái `coming-soon`; Trang Sổ Vàng trao ở màn đã làm xong cuối cùng của làng.
- **Tên:** "Linh" ở Bài 3 đổi thành "Lan". Tên phản diện dùng `{phanDien}`.

## Việc để sau / cần theo dõi

- Có thể đổi tên Tí thành "Cuội" để tránh trùng Trạng Tí. Khi đổi chỉ sửa `characters.ts`, cốt truyện và lời truyện của ảnh.
- 2 lớp nền màn 6 là JPG: tách nền ở mốc 3, làm cùng màn 6; xấu thì vẽ lại.

## Câu mở đầu cho cửa sổ tiếp theo

```
Mốc 1 — Lõi. Spec: 01 (kể cả phần ảnh của mục 5 và bảng đổi nội dung ở mục 3), 02, 09; giao diện theo 03 mục 1; chân dung theo 03 mục 3.6 (phần mốc 1); câu hỏi theo 03 mục 5; mở khóa theo 03 mục 6; trang chủ, truyện và bản đồ 2D theo 04 mục 1, 2, 7; phần bài học 2D trong 05–08. Đọc TRANG-THAI.md và các spec này, chia mốc 1 thành các bước nhỏ cho Claude Code, rồi đưa mình lời giao việc cho bước đầu tiên.
```
