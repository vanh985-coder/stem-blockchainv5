# Số liệu demo trọn game (`?demo=1&kieu=tron`)

Nguồn số: `packages/core/src/demo/tron/data.ts` (chỉ số đầu vào, ghi đè riêng chế độ demo). `data.test.ts` kiểm từng số trong kịch bản bằng logic sẵn có (`pageCode`, `buildChain`, `isValidProposal`, `publicKey`, `combine`, `buildTree`); bản thật không đổi. Bot luôn trả lời đúng. **"Khác kịch bản"** ghi rõ ở mỗi đoạn.

## Phần mở đầu

| Mã | Trên màn hình |
|---|---|
| S01 | Trang chủ |
| S02 | Truyện mở đầu 14 trang (bot bấm Tiếp theo tốc độ đọc; trang cuối giữ cho đủ mức tối thiểu) |
| S03 | Chợ phiên, bảng Nhiệm vụ. Hộp "Hướng dẫn chơi" tự mở ở lần vào chợ đầu bị đóng ngay (lời thuyết minh thay phần này) |

## Làng Giấy

| Mã | Trên màn hình |
|---|---|
| G01–G02 | Đi bộ (không chạy nhanh) từ chợ vào cổng, cảnh bác An 2 lượt thoại |
| G03 | Thẻ 1: câu hỏi chọn đáp án A (theo `knowQuiz.ts`) |
| G04 | Thẻ 2: đáp án B |
| G05 | Thẻ 3: điền số **44** (43 × 2 + 58 = 144) |
| G06 | Thẻ 4: đáp án C |
| G07 | Trạm Dễ: bìa 10; nội dung 23, 45, 7, 88, 12 → mã **43, 31, 69, 26, 64** |
| G08 | Trạm Trung bình: dùng chuỗi trạm Dễ; Tí đổi trang 2 từ 45 sang **72** → mã **58, 23, 34, 80** |
| G09 | Trạm Khó: bìa 79; trang 1 nội dung 29 (mã 87); trang 2, 3, 4 nội dung 22, 18, 47 (trang 2 là trang bị sửa, gốc 55) → mã **96, 10, 67**. **Khác kịch bản:** cuộc đua rút còn 40 giây, mạng thêm trang mỗi 3,5 giây; bot sửa đúng 3 trang (96, 10, 67) rồi dừng nên hết giờ chuỗi của làng dài hơn. Hai trang cuối của chuỗi 6 trang đầu (63, 5) tự chọn |
| G10 | Màn kết quả màn 1 |
| G11 | Màn 2: 1 vòng 25 giây |
| G12 | Câu B1-01, mã trước 40, nội dung 25. Đáp án hiện A 50, B 105, C **5**, D 65 (bot chọn C) |
| G13 | Màn 3 vòng 1: bìa 10, 3 thẻ (10/23/43; 43/45/31; 31/7/69), khay xáo cố định |
| G14 | Vòng 2: cùng chuỗi + trang giả (mã trước 31, nội dung 50, mã 99; công thức ra 12). Bot bấm "Soi công thức" rồi kéo vào rổ |
| G15 | Cảnh bác An trao Trang Sổ Vàng thứ nhất |

## Làng Dệt

| Mã | Trên màn hình |
|---|---|
| D01 | Bản đồ lớn (phím M), bấm chấm cổng Làng Dệt, "Đi tới" (dịch chuyển) |
| D02 | Cảnh cụ Bình |
| D03 | 4 thẻ, mỗi thẻ dịch chuyển bằng bản đồ tới cuộn giấy; đọc và trả lời nhanh gấp 1,5 lần (đáp án D, A, C, B theo `knowQuiz.ts`) |
| D04 | Trạm Dễ: sổ bìa 5, nội dung 10 và 17 → mã 20, **57**. 5 vòng: Bình 36/50 **Đồng ý**; Chi 30/35 Từ chối; Tí 25/25 Đồng ý; Bình 30/80 Đồng ý (đúng ví dụ 25, 30, 80); Chi 47/66 Từ chối. **Khác kịch bản:** ví dụ "57, 36, 51 thì Từ chối" không hiện nguyên văn trên màn hình ở trạm Dễ (màn hình có mã 50); nó hiện ở màn 5 (B2-03) |
| D05 | Trạm Trung bình: hạt giống 4 (tự chọn): sổ bìa 83, 3 trang mã 99, 20, 49. 5 vòng: Bình tampered (77/69/23, từ chối), Chi valid (49/73/71, đồng ý), Tí sai mã (71/87/23, từ chối), Bình valid (71/74/16, đồng ý), Chi sai mã (16/42/80, từ chối). **Khác kịch bản:** số cụ thể là ví dụ do bộ sinh của bài tạo, kịch bản để [SL] |
| D06 | Trạm Khó: bìa 5, nội dung 10 và 85 → mã 20, **25**. Lượt đầu em tạo trang: mã trước 25, nội dung 18 → **68** (đúng ví dụ). Các lượt sau theo hạt giống 9 (tự chọn); bot luôn gửi trang thật và bỏ phiếu đúng |
| D07 | Màn kết quả màn 4 |
| D08 | Màn 5: 3 lượt trùm, chuột thường thưa (sinh mỗi 1,4 giây, trùm mỗi 10 giây) |
| D09 | 3 câu: B2-03 (**Từ chối**: trang cuối 57; 57/36/51), B2-04 (**Đồng ý**: 25/30/80), B2-06 (**đa số đồng ý**) |
| D10 | Màn 6: 1 cổng sau 6 khe |
| D11 | Câu ở cổng: **B1-03** "mã trước 57, nội dung 36" → **50** (đáp án 50, 150, 93, 15). **Khác kịch bản:** câu do Claude Code chọn |
| D12 | Cụ Bình trao Trang Sổ Vàng thứ hai |

## Làng Khắc Dấu

| Mã | Trên màn hình |
|---|---|
| K01 | Dịch chuyển bằng bản đồ + cảnh chú Dũng |
| K02 | 4 thẻ (đáp án A, 19, B, C); thẻ 19: 5^15 mod 23 |
| K03 | Trạm Dễ: Phần 1 ký bằng khóa riêng 12 (khóa công khai 18), thả vào máy, Tí mạo danh bị bắt (khóa 13 → 21); Phần 2 ghép khuôn 3, 5, 6, 7, 9 với mẫu 10, 20, 8, 17, 11 (khay có 2 thẻ bẫy 16, 9) |
| K04 | Trạm Trung bình: hạt giống 7 (tự chọn). 4 giao dịch: Chi "Chuyển 10 xu cho Em" **thật**; Bình "Chuyển 12 xu cho Em" **giả** (khóa đính kèm 3); Dũng "Chuyển 4 xu cho Em" **giả** (đính kèm 3); An "Chuyển 4 xu cho Em" **thật**. Bot kiểm bằng khóa công khai của người gửi trong danh bạ, không tin khóa đính kèm |
| K05 | Trạm Khó: thử tay x = 1, 2, 3; máy thử lần lượt tới **x = 15** (5^15 mod 23 = 19); phần 2 thử số lớn rồi "bỏ cuộc", dò cấu hình p = 1000003; phần 3 tình huống mất khóa, chọn đáp án cuối |
| K06 | Màn kết quả màn 7 |
| K07 | Màn 8 vòng 1 (4 cặp): khuôn **3, 5, 6, 7 ↔ mẫu 10, 20, 8, 17**. **Khác kịch bản:** thẻ xáo theo hạt giống của ván |
| K08 | Màn 9 nạp trứng: khóa **3, 5, 6** → trứng **10, 20, 8**. **Khác kịch bản:** trứng nhiễu (có một trứng ghi chính số khóa riêng) do hạt giống của ván, kịch bản để [SL] |
| K09 | Đợt 1 (3 hàng trứng): bot bắn bằng nước tốt nhất của bot giỏi |
| K10 | Chú Dũng trao Trang Sổ Vàng thứ ba |

## Làng Bạc

| Mã | Trên màn hình |
|---|---|
| B01 | Dịch chuyển bằng bản đồ + cảnh thầy Linh |
| B02 | 4 thẻ (đáp án C, 288, A, D) |
| B03 | Trạm Dễ: lá 3, 7, 5, 2 → T12 **37**, T34 **52**, T21 **73** |
| B04 | Trạm Trung bình: lá 4, 2, 6, 1 → 42, 61, gốc **481**; Tí đổi T3 từ 6 thành 7 → T34 **71**, gốc **491** |
| B05 | Trạm Khó: lá 3 7 5 2 6 1 4 8; ô ẩn T6, T12, T34, T78, T5-8, gốc = **1, 37, 52, 48, 658, 4878**; mảnh bẫy **25, 84** (đề mẫu của bài) |
| B06 | Màn kết quả màn 10 |
| B07 | Màn 11 vòng 1 (4 ô cây), hạt giống 11 (tự chọn), 12 lượt; bot chọn nước tốt nhất của bot giỏi |
| B08 | Màn 12 vòng 1: lá 3 7 5 2 6 1 4 8, T8 từ 8 thành 9 |
| B09 | Leo 3 tầng: **49** (bẫy 94), **659** (bẫy 551), **4879** (bẫy 7012); gốc cũ 4878 |
| B10 | Cảnh cao trào (chiếu tự động ngay sau ván màn 12, nhiều bước nối nhau) |
| B11 | Màn kết quả cuối (trang màn 12 sau cảnh cao trào) |

## Chỗ khác kịch bản (tóm tắt)

- Số thẻ "Em có biết?" và đáp án: theo `knowQuiz.ts` (không đổi).
- D04: xem trên. D05, K04, K05, K08, B07: số do hạt giống hoặc logic của game, báo ở bảng.
- `&tu=G15` bắt đầu từ màn 3, `&tu=D12` từ màn 6, `&tu=K10` từ màn 9, `&tu=B10`/`B11` từ màn 12: cảnh trao trang và cao trào chỉ có sau khi vừa chơi xong màn đó.
- B09 đánh dấu lúc biển "xong vòng" hiện (đã leo tới gốc), B10 lúc cảnh cao trào bắt đầu.

## Cách bot thao tác (cập nhật: mọi màn dùng sự kiện thật)

Bot chỉ gửi sự kiện thật vào giao diện (pointer, click, bàn phím) và chỉ ĐỌC trạng thái qua cầu nối `__demoProbe` (chỉ có khi build `VITE_DEMO=true`). Không gọi hàm logic để "nhảy" kết quả. Con trỏ giả (mũi tên) lướt 0,4 đến 0,6 giây tới mục tiêu rồi có vòng sóng khi bấm; phím bấm hiện nhãn nhỏ ở góc dưới bên trái khoảng 0,6 giây.

| Màn | Thao tác của bot |
|---|---|
| Đi bộ trong thế giới (G01–G02, thẻ ở Giấy) | Giữ phím **W** (tiến) và **Shift** (chạy, chỉ khi cần), **Space** khi kẹt, **E** tương tác; hướng nhìn của camera đặt trực tiếp (chuột xoay camera bị khóa chuột nên không có phím tương ứng) |
| Bản đồ lớn (D01, K01, B01, thẻ, biển) | Phím **M**, bấm chấm điểm đến, bấm "Đi tới" |
| 1, 4, 7, 10 (bài học) | Gõ số từng ký tự, bấm nút, chạm thẻ rồi chạm ô (màn 7), kéo thả (màn 10 trạm Khó) |
| 2 (chạy) | Phím **← →** (đổi làn), **↑** (nhảy), **↓** (trượt) |
| 3 (ghép sổ) | Kéo thả thẻ |
| 5 (đập chuột) | Bấm nút làn |
| 6 (diều) | Phím **Space** khi cần bật |
| 8 (lật thẻ) | Bấm thẻ |
| 9 (bắn trứng) | Bấm trứng ở khay nạp, bấm loại trứng, rê chuột tới đúng góc ngắm trên bàn rồi bấm (thả chuột thì bắn) |
| 11 (ghép lá) | Chạm ô rồi chạm ô kề trên bàn |
| 12 (leo bậc) | Giữ **← →**, **Space** để nhảy |

## Nguyên nhân bot đứng im trên Chrome thật (đã sửa)

Game phụ tự **tạm dừng** ("Trò chơi đã dừng vì em rời khỏi trang này") khi `document.visibilityState` là `hidden`, tức cửa sổ bị che hoặc thu nhỏ (ví dụ OBS hay cửa sổ khác phủ lên), và chỉ chạy tiếp khi bấm "Tiếp tục". Bot không bấm nút này nên đứng im; bản chạy không đầu không bao giờ rơi vào trạng thái đó. Sửa: chế độ trọn không tạm dừng khi cửa sổ ẩn, và bot tự bấm "Tiếp tục" nếu hộp tạm dừng vẫn hiện. Bot KHÔNG dùng các cầu nối `__memory`, `__bubble`, `__match3`, `__climb` (chỉ có khi dev hoặc `VITE_PROBE`).

Chế độ trọn còn bỏ qua mọi phiên đăng nhập của trình duyệt (cấu hình Supabase tắt trong chế độ này): luôn chơi thử, không đọc hay ghi tài khoản.
