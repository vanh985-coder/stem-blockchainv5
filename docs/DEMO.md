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

## Chế độ video hướng dẫn (`?kieu=huongdan`)

Chế độ THÊM, dùng cùng `?man=` (nhiều màn hoặc một màn); `?man=` thường (nhịp 30 đến 40 giây) và `&day=1` giữ nguyên. Luật game thật không đổi.

```
http://localhost:5873/?demo=1&man=1,2,5,10&kieu=huongdan
```

Mỗi màn là một video riêng 55 đến 65 giây; giữa hai màn vẫn là màn đen 2 giây ghi tên màn để cắt thành 4 video:

1. **Hướng dẫn**: bot làm hướng dẫn làm thử P8 có sẵn từng bước (`scenes/tutorial.ts`): con trỏ giả chỉ vào vùng sáng (`data-demo="tut-focus"`), dừng 2,5 đến 4 giây theo độ dài chữ, làm thao tác của bước (gõ mã mẫu, Nhảy thử, Đập thử...) rồi bấm nút tiếp. Bài học (Màn 1, 10) chỉ làm thử đủ ở trạm Dễ; hai trạm sau bỏ qua nhanh.
2. **Chơi thường** tới khoảng 30% ván: bài học hết trạm Dễ; Màn 2 tới 30% vòng đầu; Màn 5 tới 30% đồng hồ ván.
3. **Tua nhanh ×2,5** (góc trên phải hiện "⏩ ×2,5", ẩn khi hết tua): hệ số thời gian chung `packages/core/src/demo/timeScale.ts`. Mỗi game nhân `dt` với `timeScale()` (ngoài demo luôn là 1): `RunnerWorld.tsx` (Màn 2), `WhackGame.tsx` (Màn 5), `Hard.tsx` (đồng hồ và nhịp sinh trang của Màn 1 trạm Khó); nhịp bot (`DemoController.sleep`) cũng chia cho hệ số này. Câu hỏi và lượt đáp án KHÔNG tua (game gọi `setDemoQuestion`).
4. **Kết quả** tốc độ thường, giữ 4 giây.

Màn 1 trạm Khó: bot vẫn bị bỏ lại 10 đến 20 trang, phần đua 9 giây (đồng hồ game, trước tua; xấp xỉ 3,6 giây thật sau tua). Nhịp riêng của chế độ này là `HD_PACING` ở `pacing.ts` (ván Màn 2 dài 28 giây).

**Bài học (Màn 1, 10) khác Màn 2, 5**: KHÔNG tua (hệ số thời gian luôn 1, không hiện ⏩), mỗi video khoảng 90 đến 120 giây, nhiều lượt hơn: Màn 1 Dễ 3 trang, Trung bình sửa 3 trang kéo theo, Khó đua 9 giây thật và sửa ít nhất 3 trang trước khi bị bỏ lại 10 đến 20 trang; Màn 10 Dễ 3 cặp, Trung bình dựng 3 nút rồi soi lá bị sửa, Khó kéo đủ các ô (không điền sẵn). Nhịp chậm (`PACING.hd` ở `pacing.ts`, `scenes/hdLesson.ts`): gõ 150 đến 220 ms mỗi ký tự, con trỏ chỉ vào các số dùng để tính 1 đến 1,5 giây trước khi nhập, dừng 1,5 đến 2 giây sau khi kiểm tra, mỗi lần kéo lá 0,8 đến 1,2 giây. Trạm Khó của Màn 1 giữ nhịp nhanh. Bảng của script in thêm giây và số lượt từng trạm (`hdStationStart/End/Turn` ở `hdStats.ts`).

Kiểm: `MAN=1,2,5,10 KIEU=huongdan node scripts/demo-check.mjs`. In bảng mỗi màn: hướng dẫn / chơi thường / tua / kết quả / tổng (giây), kiểm tổng 55 đến 65 giây, biểu tượng tua hiện rồi ẩn, không kẹt, không lỗi console. Mốc thời gian ghi ở `hdStats.ts` (`window.__demoStats.hd`).

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

## Demo trọn game (`?kieu=tron`)

Nhánh `feat/demo-tron` (KHÔNG BAO GIỜ merge vào `main`, không deploy). Bot tự chơi trọn 4 làng theo `docs/demo/KICH-BAN-VIDEO-TRON-GAME.md`: S01 → B11. Không quay phần đọc thoại: mọi hộp thoại lời nhân vật bị bỏ qua ngay (trừ truyện mở đầu S02), nên không có các mã G02, D02, G15, D12, K10, B10; K01 và B01 chỉ còn phần dịch chuyển bằng bản đồ. Chạy ở chế độ chơi thử (khách), tiến độ mới tinh, không đăng nhập, không ghi lên Supabase. Chỉ bật khi bản build có `VITE_DEMO=true` VÀ địa chỉ có `?demo=1&kieu=tron`; bản build không có `VITE_DEMO` không chứa mã demo.

### Chạy để quay

```bash
pnpm dev:assets                                        # máy chủ đồ họa 5180 (hoặc: pnpm dev:demo chạy luôn cả hai)
cd apps/hub && npx vite build --mode demo --outDir dist-demo
npx vite preview --mode demo --outDir dist-demo --port 5874 --strictPort
```

Mở bằng Chrome (cửa sổ 1920×1080, trình duyệt chưa đăng nhập): `http://localhost:5874/?demo=1&kieu=tron`. Đếm ngược 5 giây rồi chạy. Giữ cửa sổ Chrome hiện rõ (không thu nhỏ). Hết video hiện nút "Tải mốc giây" tải `moc-giay.txt` ("S01 0:00", "S02 0:14"…; mốc tính từ khung hình đầu tiên của S01, tức lúc hết đếm ngược).

- `&tu=<mã đoạn>`: bắt đầu từ đơn vị chứa đoạn đó (dựng sẵn tiến độ, vào đúng route). Ví dụ `&tu=G07` (màn 1), `&tu=D01` (Làng Dệt), `&tu=K03` (màn 7), `&tu=B08` (màn 12). `&tu=B11` bắt đầu từ màn 12.
- `&kiem=<0,01 đến 1>`: chia nhỏ mức tối thiểu của mọi đoạn để kiểm nhanh (mặc định 1 = đúng kịch bản). Không dùng khi quay.
- Phím: `P` tạm dừng/tiếp, `N` bỏ qua cảnh hiện tại, `Esc` dừng.
- Mỗi đoạn kéo dài tối thiểu = số chữ lời thuyết minh ÷ 2,5 giây (150 chữ/phút); xong sớm thì bot đứng chờ (nhân vật đứng yên, bảng vẫn mở). Làng Giấy đi bộ và đọc ở tốc độ thường; Làng Dệt, Khắc Dấu, Bạc dịch chuyển bằng bản đồ lớn và đọc, trả lời thẻ nhanh gấp 1,5 lần.
- Số liệu khóa cứng và rút ngắn game phụ: `packages/core/src/demo/tron/data.ts`, báo cáo từng mã đoạn ở `docs/demo/SO-LIEU-DEMO-TRON.md`.

### Kiểm tự động

```bash
node scripts/tron-check.mjs     # URL=... TU=G07 KIEM=0.1 STOP=D01 SHOTS=S03,G14 DEBUG=1 SNAP=<thư mục/> (HEADED=1 mở cửa sổ thật)
```

In bảng mốc giây, thời lượng từng đoạn so với mức tối thiểu và chụp ảnh (JPEG dưới 300 KB) vào `docs/screenshots/demo-tron/`. Trình duyệt không đầu (Chrome swiftshader) chạy 3D rất chậm nên thời lượng đo ở đó dài hơn máy thật.

- Chế độ trọn luôn chơi thử (khách): bỏ qua phiên đăng nhập của trình duyệt, không gọi Supabase. Bot thao tác bằng sự kiện thật (chuột, phím) và có con trỏ giả cùng nhãn phím để người xem thấy; xem bảng "Cách bot thao tác" ở .
- Game không tạm dừng khi cửa sổ bị che trong chế độ này (nguyên nhân bot đứng im trước đây).
