# Rà lại checklist mốc 2 (bản có thế giới mở) — bước W3

Nguồn: checklist nghiệm thu ở spec 01 (mục 8), 03 (cuối), 04 (cuối), 05 (cuối), đối chiếu với bản hiện tại (thế giới mở `/cho`: chợ và 4 làng trong một cảnh). Ba mức trạng thái:

- **Đạt**: đã kiểm (test hoặc Chrome trên máy dev), ghi bằng chứng.
- **Chưa**: chưa làm hoặc chưa kiểm lại ở bản này.
- **Cần người thử**: chỉ kiểm được trên server thật, điện thoại thật hay bằng cảm nhận của người chơi.

Số đo ghi dưới đây là của máy dev (Windows, cắm điện, Chrome desktop, bản build có `VITE_PROBE`). `pnpm test`: 117 file, 1304 test xanh (trước W3); `pnpm build`, `pnpm typecheck`, `pnpm check:text` sạch.

## Spec 01 — nền tảng, subdomain, đồ họa

| # | Mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 1.1 | `pnpm install`, `pnpm test`, `pnpm build` không lỗi; test logic 4 bài cũ vẫn xanh; không còn Bài 5 | **Đạt** | Test, build, typecheck, check:text sạch; 12 màn ở 4 làng. |
| 1.2 | Image Docker dựng được, đủ 6 cổng; Cloudflare Tunnel đưa 6 hostname vào đúng cổng | **Cần người thử** | Docker Desktop không chạy được trên máy dev (đã biết từ bước 15b). Làm trên server theo `docs/DEPLOY.md` mục (a), (b), (h). |
| 1.3 | Mở `/` hay `/lang/<id>` ở subdomain làng thì chuyển về hub | **Đạt** (đổi từ "về bản đồ" thành "về `/cho?tu=<id>`") | `VillageApp.test.tsx` (12 test) và Chrome (`/cho?tu=lang-giay` đưa vào đúng chỗ trong làng). Cần xác nhận lại trên subdomain thật (DEPLOY mục g). |
| 1.4 | Từ bản đồ bấm "Vào" một bài học trên subdomain làng, xong "Về bản đồ"/"Về làng" quay lại hub | **Đạt** (dev) / **Cần người thử** (server) | Chợ → Làng Giấy → biển màn 1 → bài học (subdomain 5174) → "Về làng" quay về `/cho?tu=lang-giay`, người chơi đứng đúng chỗ (Chrome). Qua subdomain thật chưa thử. |
| 1.5 | `pnpm assets:build` phần ảnh: WebP, `manifest.json`, không đưa `concept/` và `source/` | **Đạt** | Chạy lại ở W2; 10 ảnh Hướng dẫn chơi nén WebP. |
| 1.6 | Một ảnh trên `sb-assets` tải được từ cả hub lẫn subdomain làng, không lỗi CORS | **Cần người thử** | Dev đạt (5173 và 5174 tải từ 5180). Server: Caddy có `Access-Control-Allow-Origin: *`; cần kiểm bằng DEPLOY mục (a).5. |
| 1.7 | Đã áp bảng đổi nội dung (Linh thành Lan, tên, Bi); test vẫn xanh | **Đạt** | Mốc 1; test xanh. |
| 1.8 | `pnpm assets:build` phần model: texture 2048, giảm mặt, bản `-xa` và `-vua` | **Đạt** | Báo cáo `assets:build`: model env và games đều có `-xa`; `-vua` khi bản chính trên 20.000 tam giác (một số model nặng dừng ở chế độ chặt và giữ nguyên: ghi trong log). |
| 1.9 | Một model `.glb` trên `sb-assets` tải được từ hub lẫn subdomain làng | **Cần người thử** | Dev đạt; server cần kiểm (header `model/gltf-binary`, CORS, `immutable`) và tạo Cache Rule (DEPLOY mục i). |

## Spec 03 — động cơ 3D, giao diện chung

| # | Mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 3.1 | `/dev/3d`: học sinh đi, chạy, nhảy, đu mượt; Tí chạy; 2 dân làng đi lại; 6 người đứng yên nhún | **Chưa** | Trang dev, chưa kiểm lại ở bản này. Người chạy thử `pnpm dev:hub` rồi mở `/dev/3d`. Dân làng đi lại đã thấy chạy ở chợ và trong Làng Giấy (3 dân làng) bằng Chrome. |
| 3.2 | `sad`, `point`, `slide`, `swing`, `hurt` trông tự nhiên; không clip nào làm nhân vật trôi | **Cần người thử** | Cảm nhận bằng mắt. |
| 3.3 | `/dev/portraits` xuất được ảnh chân dung rõ mặt | **Đạt** | Bước 15a (12 ảnh). |
| 3.4 | Trang bài học 2D từ 1280px: 2 nhân vật 3D hai bên bảng, phản ứng đúng/sai | **Cần người thử** | Đã làm ở các bước trước; chưa kiểm lại ở W. |
| 3.5 | `Scene25D` hiện nền, hình rời, nhân vật 3D đúng lớp, co giãn 16:9 | **Đạt** | Màn 3 chơi được ở bước 15a (Chrome, "Vàng 360 điểm"). |
| 3.6 | Đổi `phanDien` trong `characters.ts` thì đổi ở mọi lời thoại | **Đạt** | Quy tắc được giữ bằng test nội dung và `pnpm check:text` (không có tên viết cứng); chưa thử đổi tên thật ở W3. |
| 3.7 | `pnpm check:text` sạch; có `HUONG-DAN-SUA-CHU.md` | **Đạt** | Sạch (300 file). |
| 3.8 | Hướng dẫn chơi (6 phần, mở từ HUD/Menu/thẻ bắt đầu, tự mở một lần) | **Đạt** | Bước 16; ảnh chụp lại ở W2 từ thế giới mới. |
| 3.9 | "Em có biết?" lần đầu vào làng | **Đạt** | Chrome ở W1 và W2: chạy khi lần đầu bước qua cổng làng. |
| 3.10 | Test va chạm và `unlock.ts` xanh; mức Thấp ≥ 30 fps | **Đạt** trên máy tính / **Cần người thử** trên điện thoại | Test xanh. Máy dev, mức Thấp: 133 đến 144 fps (vsync 144 Hz), 219 đến 286 fps không vsync, ở chợ, giữa đường, trong Làng Giấy. Điện thoại tầm trung thật chưa thử. |
| 3.11 | (Mới, W1–W3) Thế giới mở: tải theo vùng, mũi tên dưới chân, biển chỉ đường, va chạm theo chân thật, ngân sách tam giác | **Đạt** | Chi tiết ở các số đo dưới đây. |

## Spec 04 — trang chủ, cốt truyện, chợ phiên

| # | Mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 4.1 | Trang chủ tải nhanh, đúng nút theo trạng thái đăng nhập | **Cần người thử** | Không đổi ở W; đo trên server (DEPLOY mục g). |
| 4.2 | `/ban-do`: 4 làng đúng trạng thái; bấm "Vào" mở đúng màn trên subdomain | **Đạt** (hiển thị) / **Cần người thử** (qua subdomain thật) | `/ban-do` chụp được và hiển thị đúng ở W2 (ảnh Hướng dẫn). |
| 4.3 | Giới thiệu làng lần đầu, sau đó mở thẳng bảng làng, có "Xem lại giới thiệu" | **Cần người thử** | Không đổi ở W; chưa kiểm lại. |
| 4.4 | Nền trang trí các trang tĩnh; "Giảm chuyển động" làm icon đứng yên | **Cần người thử** | Không đổi ở W. |
| 4.5 | `/truyen` đủ 14 lượt, lượt cuối vào `/ban-do` | **Cần người thử** | Không đổi ở W. |
| 4.6 | `/cho`: cảnh mở đầu chạy đúng và bỏ qua được | **Chưa** (mốc 4) / **Đạt** cho cảnh mở đầu từng làng | Cảnh mở đầu của chợ ở mục 4 spec 04 để mốc 4. Cảnh mở đầu của Làng Giấy (bác An + "Em có biết?") chạy khi bước qua cổng, bỏ qua được (Chrome). |
| 4.7 | `/cho`: chỉ cổng Làng Giấy mở | **Đạt** | Tài khoản mới: 3 cổng còn lại có then gỗ và dây đỏ, "Cổng làng đóng…" (Chrome, W1). Cổng thứ k mở khi có k Trang Sổ Vàng. |
| 4.8 | `/cho`: bấm cổng thì sang được subdomain Làng Giấy | **Đạt** (đổi cách) | Từ W1 làng nằm trong cùng cảnh: cổng mở thì đi thẳng vào, không chuyển trang (Chrome). Bài học vẫn ở subdomain. |
| 4.9 | Nút ? và "Hướng dẫn chơi"; lần đầu vào `/cho` tự mở một lần | **Đạt** | Bước 16; còn đúng trong thế giới mở (guide tự mở khi ở ngoài làng). |
| 4.10 | HUD hiện đúng số Trang Sổ Vàng | **Đạt** | Chrome ở W1 (0 trang: 4 ô "Chưa nhận"; có trang: ô nhấp sáng). |
| 4.11 | ≥ 30 fps ở mức Thấp trên điện thoại tầm trung | **Cần người thử** | Máy dev: xem 3.10. Điện thoại thật chưa thử. |

## Spec 05 — Làng Giấy

| # | Mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 5.1 | Test Bài 1, `runnerLogic`, `rebuildLogic` xanh | **Đạt** | 1304 test xanh. |
| 5.2 | Màn 1: đủ 3 trạm; domino và cuộc đua sửa sổ chạy đúng | **Đạt** (logic) / **Cần người thử** (cảm giác) | Logic có test; trang bài học mở được từ biển màn 1 (Chrome). |
| 5.3 | Màn 2: vuốt và phím nhận ngay; có câu hỏi sau mỗi vòng; chạy lên nóc xe được; không có hàng chắn kín 3 làn | **Cần người thử** | `runnerLogic` có test "không chắn kín 3 làn"; cảm giác điều khiển cần người chơi. |
| 5.4 | Màn 3: trang giả luôn phát hiện được; kéo thả trên điện thoại | **Đạt** (logic, chuột, chạm giả lập) / **Cần người thử** (điện thoại thật) | Bước 15a. |
| 5.5 | Xong màn 3: nhận Trang Sổ Vàng, cổng Làng Dệt mở | **Đạt** | Chrome ở W1, chạy lại ở W2: bác An trao trang, dòng nhiệm vụ đổi sang Làng Dệt; tới gần cổng Dệt thì then gỗ và dây đỏ rơi, Bi báo; tải lại không chiếu lại. (Từ W1 không còn nút "Về chợ" sang `/cho?mo=`; người chơi đi bộ ra cổng.) |
| 5.6 | Em có biết?, Hướng dẫn chơi ở HUD, menu làng, thẻ bắt đầu màn 2 và 3 | **Đạt** | Bước 16 và W1. |
| 5.7 | Đống rơm ở màn 2 đủ khối ở cả ba trạng thái | **Đạt** | Bước 16 (test `signedVolume`). |
| 5.8 | Màn 1 là bài 2D đặt trên nền làng, lời bác An hiện đúng chỗ | **Cần người thử** | Nhìn bằng mắt. |
| 5.9 | Làng Giấy: bố cục mở rộng, chia khu, dân làng, va chạm, đường cho mũi tên (W2) | **Đạt** | `villages/giay.test.ts` (13 test) và Chrome; ảnh trong `docs/hinh-w2/`. |
| 5.10 | ≥ 30 fps ở mức Thấp trên điện thoại tầm trung | **Cần người thử** | Máy dev: xem 3.10. |

## Số đo của thế giới mở (bản build, máy cắm điện)

Xem báo cáo bước W3 cho số cụ thể: tải lần đầu, mỗi làng, tam giác xấu nhất 3 mức, khung chậm nhất khi đi vào làng, bộ nhớ sau 10 lần vào ra làng.
