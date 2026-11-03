# Chế độ demo (quay video giới thiệu bằng OBS)

Nhánh `feat/demo-bot` (KHÔNG gộp vào `main` hay nhánh nền). Bot tự chơi trọn game như một học sinh giỏi: đi lại trong thế giới, nhặt thẻ, chơi từng màn, nhận Trang Sổ Vàng. Làm theo 4 đợt; đợt 1 là bộ khung và Làng Giấy (màn 1, 2, 3).

## Mở demo

```bash
pnpm dev:demo
```

Mở `http://localhost:5873/?demo=1` (Chrome, cửa sổ 1920×1080). Demo chỉ chạy khi bản build/dev có `VITE_DEMO=true` (tệp `.env.demo`, nạp bằng `vite --mode demo`) VÀ địa chỉ có `?demo=1`. Mở không có `?demo=1` thì game chạy như thường.

Khi bắt đầu: xóa tiến độ chơi thử cũ (cookie `sc_guest`), ẩn nút "Tự hoàn thành", đếm ngược 5 giây ở giữa màn hình rồi chạy. Góc màn hình không hiện chữ nào khác của demo. Nên dùng trình duyệt chưa đăng nhập (tài khoản đăng nhập có tiến độ riêng).

## Phím điều khiển

| Phím | Việc |
| --- | --- |
| `P` | tạm dừng / tiếp tục (bot ngừng thao tác; game chạy thời gian thực như màn 2 vẫn chạy) |
| `N` | bỏ qua cảnh hiện tại, sang cảnh sau |
| `Esc` | dừng demo |

Tham số địa chỉ: `?tocdo=0.75|1|1.5` chỉnh nhịp (chậm, thường, nhanh); `?canh=<id cảnh>` bắt đầu từ một cảnh (không xóa tiến độ, nên cần tiến độ đủ để vào cảnh đó): `gioi-thieu`, `cho-den-lang-giay`, `giay-the`, `giay-man-1`, `giay-man-2`, `giay-man-3`, `giay-trao-trang`.

## Chế độ danh sách màn (`?man=`)

Quay riêng từng màn, không đi bộ qua chợ hay làng:

```
http://localhost:5873/?demo=1&man=1,2,5,10
http://localhost:5873/?demo=1&man=5
```

- Bot chơi lần lượt đúng các màn trong danh sách rồi dừng. Hiện bot chơi được màn 1, 2, 5, 10; màn khác trong danh sách bị bỏ qua.
- Mỗi màn: màn chuyển 2 giây (màn đen, "Màn N" và tên màn chữ to) để dễ cắt video, rồi vào thẳng route của màn.
- Tiến độ khách đặt sẵn tối thiểu (thẻ "Em có biết?" của làng đã nhặt đủ, các màn đứng trước trong làng đã xong), chỉ trong cookie của trình duyệt đang quay; không gọi Supabase.
- **Nhịp video (mặc định ở chế độ danh sách)**: mỗi màn 30 đến 40 giây, tính cả màn chuyển 2 giây và 3 giây xem kết quả. Thêm `&day=1` để chạy bản đầy đủ như trước. Mọi rút gọn nằm ở lớp ghi đè `packages/core/src/demo/pacing.ts` (`PACING` là null ngoài demo hay khi có `day=1`; có test chứng minh số cũ giữ nguyên): nhịp gõ 60 đến 90 ms, "đọc" 0,5 đến 1 giây, hộp thoại 1 giây rồi bấm tiếp, bỏ qua hướng dẫn làm thử. Màn 1/10: mỗi trạm 1 lượt (trạm Dễ điền sẵn 4 trang, trạm Trung bình sửa 1 trang, Màn 10 Dễ 1 cặp, Khó điền sẵn bớt ô). Màn 2: 1 vòng 17 giây + 1 câu hỏi. Màn 5: 1 lượt trùm. Màn 1 trạm Khó: mạng sinh trang nhanh, bot cố tình sửa chậm, hết giờ chuỗi của làng dài hơn bot 10 đến 20 trang, dừng 2 giây trên khung tổng kết rồi sang kết quả (trạm này thua theo đúng ý đồ; số đo ở `window.__demoStats.man1Hard`).
- Không có `&man=` thì chạy trọn như đợt 1. `?tocdo=` dùng được ở cả hai chế độ.
- Màn 5: bot giỏi `WhackBrain` (tách từ `whackBots`) quyết định theo từng bước mô phỏng; con trỏ giả đuổi theo nút chân làn, bấm "Đọc xong" rồi đập chuột đáp án đúng.
- Màn 10: trạm Dễ gõ kết quả ghép cặp (đáp án từ `combine`); trạm Trung bình dựng cây rồi soi từ gốc xuống lá bị sửa, ánh đỏ chạy lên gốc; trạm Khó kéo lá bằng con trỏ giả thả (hơi lệch tâm) vào ô "?".

Kiểm: `MAN=1,2,5,10 node scripts/demo-check.mjs` (trình duyệt sạch, kiểm không kẹt, không lỗi console, mỗi màn đạt Vàng hoặc 3 sao, in thời lượng từng màn và tổng).

## Cấu trúc mã (`packages/core/src/demo/`)

- `config.ts` (cờ bật, nhịp, cảnh bắt đầu), `reset.ts` (xóa tiến độ), `pointerLock.ts` (khóa chuột giả để đi lại được khi không có cú bấm thật), `DemoRunner.tsx` (đếm ngược, phím P/N/Esc, chạy đạo diễn).
- `controller.ts` (nhịp, tạm dừng, bỏ qua, dừng; mọi chờ đợi đi qua đây), `director.ts` (chạy lần lượt các cảnh, hạn giờ từng cảnh, nhật ký `window.__demoLog`), `timing.ts` (hàm thuần: thời gian gõ 120–200 ms/ký tự, thời gian "đọc", đường đi con trỏ).
- `cursor.ts` (chấm tròn sáng, nền phẳng và viền, không bóng, không filter), `actions.ts` (bấm, gõ từng ký tự, nhấn phím, kéo thả bằng sự kiện pointer/mouse/click/keyboard thật), `ui.ts` (lật hộp thoại, đóng hướng dẫn, trả lời thẻ "Em có biết?"), `world.ts` (đi theo đường `roadGraph`, nhấn E khi tới gần), `probe.ts` (game ghi trạng thái thuần cho bot đọc).
- `scenes/`: `order.ts` (thứ tự và hạn giờ, có test), `intro.ts` (trang chủ, truyện, chợ, thẻ), `lesson.ts` (trang bài học 2D), `giay.ts` (màn 1, 2, 3, trao trang).

Bot không viết lại luật: đáp án màn 1 tính bằng `pageCode` của bài; màn 2 dùng `BotBrain` (bot giỏi, nhìn trước chướng ngại) của `runner/testBots.ts` rồi gửi phím như người chơi; màn 3 đọc công thức trên thẻ (`formulaHolds`, `checkPlacement`); thẻ "Em có biết?" lấy đáp án đúng từ `knowQuizOf`.

## Kiểm

```bash
node scripts/demo-check.mjs
```

(`pnpm dev:demo` đang chạy; `HEADED=1` mở cửa sổ thật; `TOCDO=1.5`; `CANH=<id>` kiểm riêng một cảnh với tiến độ đặt sẵn.) Chạy từ đầu tới hết đợt 1 ở 1920×1080, xác nhận không cảnh nào kẹt hay lỗi, không lỗi console, tiến độ cuối đúng (màn 1–3 xong, 4 thẻ, 1 Trang Sổ Vàng), in thời lượng từng cảnh, chụp ảnh vào `docs/screenshots/demo/`.
