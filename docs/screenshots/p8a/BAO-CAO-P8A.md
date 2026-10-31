# Báo cáo P8a — Cơ chế hướng dẫn focus và làm thử dùng chung, tích hợp mẫu Màn 1 trạm Dễ (30/10/2026)

## 1. Giới thiệu và Mục tiêu (P8a)

- **Mục tiêu P8:** Khi bắt đầu mỗi màn, học sinh được hướng dẫn bằng focus (làm tối nhẹ phần còn lại, khoét sáng vùng cần chú ý/thao tác) và tự làm thử một phần trước khi chơi thật.
- **Phạm vi hoàn thành trong P8a:**
  - Xây dựng cơ chế dùng chung `TutorialSpotlight` (`packages/core/src/ui/TutorialSpotlight.tsx`) với 4 khối che backdrop chuẩn xác, định vị tooltip thông minh, focus trap bàn phím, và cơ chế chu kỳ Enter chống kích hoạt đúp.
  - Tích hợp mẫu hoàn chỉnh tại **Màn 1, trạm Dễ ("Xây chuỗi 5 trang")** trong `packages/village-lang-giay/src/bai-1/Easy.tsx`.
  - Chưa nhân rộng cả 12 màn hoặc trạm Trung bình/Khó (để lại các bước sau theo đúng chỉ đạo).

---

## 2. Luồng mẫu Màn 1 Trạm Dễ (6 bước)

1. **Bước 0 — Giới thiệu mục tiêu ngắn (`intro`):**
   - Vùng focus: Toàn bộ bảng dải chuỗi sổ (`[data-tutorial="chain-strip"]`).
   - Lời hướng dẫn: *"Trước khi bắt đầu, hãy cùng làm thử một trang để nắm cách tính mã trang nhé!"*
   - Thao tác: Bấm "Tiếp tục" (hoặc phím Enter/Space).
2. **Bước 1 — Focus các số nguồn (`numbers`):**
   - Vùng focus: Ô mã trang mở đầu (`12`) và nội dung trang 1 (`5`).
   - Lời hướng dẫn: *"Mã trang được tính từ hai số: mã của trang trước (12) và nội dung của trang này (5)."*
   - Thao tác: Bấm "Đã hiểu".
3. **Bước 2 — Focus công thức gợi ý (`formula`):**
   - Vùng focus: Khung gợi ý của Tí / Bác An (`[data-tutorial="formula-box"]`).
   - Lời hướng dẫn: *"Công thức: lấy mã trước nhân 2, cộng nội dung trang này, rồi lấy 2 số cuối. Ví dụ: (12 × 2 + 5) = 29."*
   - Thao tác: Bấm "Thử tính ngay".
4. **Bước 3 — Focus ô nhập kết quả thực hành (`input`):**
   - Vùng focus: Ô nhập mã trang của trang 1 (`[data-tutorial="code-input"]`).
   - Lời hướng dẫn: *"Em hãy tính nhẩm và nhập kết quả vào ô mã trang nhé!"*
   - Học sinh thao tác gõ số thực tế vào ô. Khi gõ số, hệ thống tự chuyển hướng dẫn sang nút Kiểm tra.
5. **Bước 4 — Focus nút Kiểm tra (`check`):**
   - Vùng focus: Nút "Kiểm tra" (`[data-tutorial="check-button"]`).
   - Lời hướng dẫn: *"Bấm nút 'Kiểm tra' (hoặc nhấn phím Enter) để xem kết quả."*
   - Học sinh bấm nút hoặc nhấn Enter.
6. **Bước 5 — Phản hồi kết quả (`result`):**
   - **Trường hợp đúng (`29`):** Âm thanh `sound.playCorrect()`, trang 1 đóng dấu xác nhận mã 29 màu xanh, thông báo: *"Chính xác! Mã trang là 29. Trang này đã được gắn chặt vào chuỗi!"*, hiện nút **"Bắt đầu chơi thật"**.
   - **Trường hợp sai (ví dụ `15`):** Âm thanh `sound.playWrong()`, thông báo gợi ý: *"Chưa đúng rồi: 12 × 2 = 24, cộng 5 thành 29. Em hãy thử lại nhé!"*, hiện nút **"Thử lại"** (không phạt tim, không tính số lỗi vào bài thật).

---

## 3. Tách biệt hoàn toàn làm thử khỏi tiến độ thật

- Dữ liệu làm thử cố định (`genesis = 12`, `content = 5`, `expected = 29`), tính bằng logic bài học `pageCode` và `solutionSteps`.
- Quá trình làm thử **không gọi hàm lưu tiến độ** (`record()`, `saveNow()`), không cộng điểm, xu, sao, tim hay Trang Sổ Vàng.
- Khi hoàn thành hoặc bấm "Bỏ qua hướng dẫn", bài thật được khởi tạo sạch sẽ 100% với đề ngẫu nhiên `easyRound(Date.now())`. Đồng hồ bài thật `realStartTime` được bấm giờ từ thời điểm bắt đầu bài thật, đảm bảo thời lượng làm thử không bị tính vào thời gian làm bài của học sinh.
- Nút "💡 Hướng dẫn" được bố trí trên giao diện bài thật. Khi đang làm dở bài thật (ví dụ đang ở trang 2 hoặc 3), học sinh bấm vào thì mở lại hướng dẫn; đóng hướng dẫn thì quay lại đúng trạng thái bài đang làm dở nguyên vẹn.

---

## 4. Bàn phím, Accessibility và Cơ chế chu kỳ Enter

- **Bàn phím & Focus trap:** Phím `Tab` chỉ luân chuyển giữa ô nhập mục tiêu và các nút trong tooltip, không bị văng ra nền tối. Phím `Escape` đóng/bỏ qua hướng dẫn.
- **Chống kích hoạt đúp bằng Enter:** Khi học sinh nhấn Enter để nộp đáp án ở ô nhập, cơ chế chu kỳ phím (`actionArmedRef` và `keyup` listener) chặn nút "Bắt đầu chơi thật" kích hoạt cùng chu kỳ. Học sinh bắt buộc phải thả phím rồi nhấn Enter chu kỳ mới (hoặc click chuột) thì mới bắt đầu bài thật.
- **Giảm chuyển động (`reducedMotion`):** Tắt hiệu ứng transition và nhấp nháy, cuộn màn hình tức thì (`behavior: 'auto'`).
- **Ngôn ngữ:** 100% tiếng Việt có dấu, xưng "em", nằm gọn trong `packages/core/src/content/tutorial.ts`.

---

## 5. Kết quả kiểm tra tự động Puppeteer (`scripts/p8a-check.mjs`, `scripts/p8a-preview-check.mjs`, `scripts/p8a-viewport-fix-check.mjs`)

Đã tiến hành ba đợt kiểm tra độc lập để đảm bảo chất lượng:

### Đợt 1: Kiểm tra toàn diện trên Vite Dev Server (cổng 5173)
Đo lường trên cả 3 độ phân giải chuẩn của dự án:

| Độ phân giải | Bước 0 (intro) | Nhập sai & Thử lại | Nhập đúng & Chúc mừng | Bài thật sạch sẽ | Xem lại giữa bài |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1366×768 (Desktop chuẩn)** | **ĐẠT** | **ĐẠT** (hiện Thử lại) | **ĐẠT** (hiện Bắt đầu chơi thật) | **ĐẠT** | **ĐẠT** |
| **360×800 (Mobile dọc)** | **ĐẠT** | **ĐẠT** | **ĐẠT** | **ĐẠT** | **ĐẠT** |
| **844×390 (Mobile ngang)** | **ĐẠT** | **ĐẠT** | **ĐẠT** | **ĐẠT** | **ĐẠT** |

- **Xác minh tiến độ:** Cookie `sc_guest` trước và sau khi làm thử hoàn toàn giữ nguyên: `progressUnchangedAfterPractice = true`.
- **Xác minh bàn phím:** Giữ phím Enter khi nộp bài không tự ý nhảy cóc sang bài thật: `enterHoldSafe = true`.
- **Xác minh bài thật:** Sau hướng dẫn, bài thật hoàn thành 5 trang và nhận sao trạm Dễ bình thường: `realStationDoneNormally = true`.

### Đợt 2: Kiểm tra luồng chính trên Bản Build Production Preview (cổng 5193)
Chạy trực tiếp trên mã nguồn đã build production (`apps/hub/dist`, `VITE_MERGED=true`):
- **Bước 0 (intro):** Lớp phủ `TutorialSpotlight` và Tooltip tự động mở chuẩn xác (`step0Opened = true`).
- **Thực hành nhập sai (15):** Tooltip hiển thị giải thích từng bước và nút "Thử lại" (`wrongHandled = true`).
- **Thực hành nhập đúng (29):** Đóng dấu xác nhận mã trang và hiện nút "Bắt đầu chơi thật" (`correctHandled = true`).
- **Chuyển sang bài thật:** Spotlight đóng hoàn toàn, hiển thị bài thật với nút "💡 Hướng dẫn" (`realGameClean = true`).
- **Xem lại giữa bài:** Mở lại và đóng hướng dẫn hoạt động trơn tru (`reviewToggle = true`).
- Bằng chứng lưu tại: `docs/screenshots/p8a/ket-qua-p8a-build-preview.json` và các ảnh `p8a-build-*.png`.

### Đợt 3: Đo lường sửa triệt để lỗi trôi khung hướng dẫn (`scripts/p8a-viewport-fix-check.mjs`)
- **Nguyên nhân gốc rễ đã xác minh:**
  1. Ở độ phân giải Desktop (≥ 1280px, ví dụ 1366×768), `.lesson-zoom` trong `theme.css` áp dụng `zoom: 1.35`. Trước khi sửa, `TutorialSpotlight` được render bên trong component `Easy`, tức là con cháu của `.lesson-zoom`. Do đó, tọa độ CSS px lấy từ `getBoundingClientRect()` (tọa độ viewport) khi đặt vào style `fixed` con bị trình duyệt nhân thêm 1,35 lần (`top * 1.35`), đẩy Tooltip và các nút bấm trôi tuột xuống đáy màn hình (`top > 768px`).
  2. Ở màn hình ngang thấp (844×390), chiều cao viewport chỉ có 390px. Thuật toán cũ chỉ có hai hướng trên/dưới dẫn tới đè lên target hoặc đẩy nút bấm tràn đáy.
- **Giải pháp triệt để đã triển khai:**
  1. Sử dụng React Portal (`createPortal(..., document.body)`): Đưa toàn bộ 4 khối backdrop và Tooltip ra trực tiếp `document.body`, hoàn toàn cách ly khỏi CSS `zoom: 1.35` và transform của `.lesson-zoom`. Tọa độ `position: fixed` neo 100% chính xác theo viewport của trình duyệt.
  2. Thuật toán định vị thông minh 4 hướng (`bottom`, `top`, `right`, `left`):
     - Màn hình ngang thấp (chiều cao ≤ 450px): tự động chuyển sang đặt bên cạnh (`right` hoặc `left`), không che ô nhập, không che nút kiểm tra và tận dụng chiều ngang rộng.
     - Cấu trúc Tooltip chống tràn: Container `flex flex-col max-h-[calc(100vh-24px)]`, Header `shrink-0`, Thân chỉ dẫn `overflow-y-auto flex-1 min-h-0` (nội dung dài cuộn được bên trong), Footer chứa nút bấm `shrink-0 mt-2.5 pt-2 border-t` luôn luôn cố định và tiếp cận được 100% trong khung nhìn.
     - Lắng nghe sự kiện `resize`, `scroll` (capture phase) và `window.visualViewport` để cập nhật tọa độ liên tục khi cuộn trang, đổi kích thước, hoặc khi bàn phím ảo xuất hiện.
- **Số liệu đo lường thực tế trên bản build production preview (`ket-qua-p8a-fix.json`):**

| Độ phân giải | Vị trí ô nhập trong VP | Vị trí Tooltip trong VP | Nút thao tác trong VP | Đã cuộn trang (250px) | Sau khi Resize | Kết luận |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1366×768 (Desktop)** | `[462, 505]` (**ĐẠT**) | `[525, 715]` (**ĐẠT**) | `[591, 607]` (**ĐẠT**) | Tooltip `[571, 756]` (**ĐẠT**) | Tooltip `[542, 716]` (**ĐẠT**) | **100% trong viewport, không trôi** |
| **360×800 (Mobile dọc)** | `[495, 535]` (**ĐẠT**) | `[555, 731]` (**ĐẠT**) | `[28, 44]` (**ĐẠT**) | Tooltip `[594, 770]` (**ĐẠT**) | Tooltip `[63, 239]` (**ĐẠT**) | **100% trong viewport, tiếp cận tốt** |
| **844×390 (Mobile ngang)**| `[105, 145]` (**ĐẠT**) | `[30, 220]` (**ĐẠT**) | `[32, 48]` (**ĐẠT**) | Tooltip `[12, 152]` (**ĐẠT**) | Tooltip `[12, 152]` (**ĐẠT**) | **Tự chuyển sang bên phải, không che target** |

- **Giới hạn chưa xác minh:** Đã kiểm tra mô phỏng bàn phím và chạm giả lập qua Puppeteer; chưa kiểm tra với bàn phím ảo trên điện thoại thật có thanh URL động (Safari iOS).

---

### Đợt 4: Đo lường và sửa triệt để luồng thực hành làm thử (Giao diện bước tính thử & Bấm Kiểm tra chấm bài)
Được triển khai sau phản hồi thực tế của người dùng:
1. **Nguyên nhân gốc rễ đã xác định qua script chẩn đoán thực tế (`reproduce-exact-issue.mjs`):**
   - **Lỗi 1 (Cướp focus khi gõ số):** `onChange` tự động gọi `setTutorialStep(4)` ngay khi gõ ký tự đầu tiên (ví dụ gõ '1' trong '15' hoặc '2' trong '29'). Khi đổi bước sang 4, target chuyển sang nút Kiểm tra và cuộn màn hình, khiến ô input bị mất focus (`blur`), học sinh không thể gõ ký tự thứ hai.
   - **Lỗi 2 (Backdrop che chắn chéo khiến không nhận thao tác):**
     - Ở bước 3, spotlight chỉ khoét ô input (`code-input`), nút "Kiểm tra" nằm dưới `bottom backdrop` (`topEl: DIV.fixed.bottom-0...`), khiến học sinh click vào nút Kiểm tra thì click trúng backdrop, nút không nhận được sự kiện click.
     - Ở bước 4, spotlight chỉ khoét nút Kiểm tra (`check-button`), ô input nằm dưới `top backdrop` (`topEl: DIV.fixed.left-0...`), khiến học sinh không thể click vào ô input để sửa số.
   - **Lỗi 3 (Bấm Kiểm tra khi ô trống gây kẹt vô tận):** Khi ô trống hoặc chưa nhập đủ, `handlePracticeCheck` chỉ set `practiceError` và return mà không chuyển bước hay hiện thông báo trong Tooltip. Vì ô input bị backdrop che nên học sinh không thấy dòng lỗi, nút bấm không phản hồi, bị kẹt mãi ở bước 4.
   - **Lỗi 4 (Xóa trắng dữ liệu khi thử lại):** Hàm `retryPractice` gọi `setPracticeVal(null)` xóa sạch số vừa gõ, buộc học sinh gõ lại từ đầu và lại bị lỗi cướp focus lặp lại vô tận.
2. **Giải pháp kỹ thuật đã triển khai:**
   - **Vùng khoét sáng chung `[data-tutorial="practice-area"]`:** Bao trọn cả dải trang sổ (chứa ô input) và khung công thức + nút Kiểm tra ở cả 3 bước 3, 4, 5. Cả ô input và nút Kiểm tra luôn sáng rõ, 100% không bị backdrop che phủ, học sinh có thể click/nhập/sửa hoặc bấm Kiểm tra ở bất kỳ thời điểm nào.
   - **Highlight riêng biệt theo bước:** Ô input nhận viền vàng nổi bật `ring-4 ring-yellow-400 rounded-xl` ở bước 3; nút Kiểm tra nhận viền vàng `ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]` ở bước 4.
   - **Gỡ bỏ chuyển bước tự động trong `onChange`:** Học sinh tự do gõ số 2 chữ số tự nhiên và bấm nút "Tiếp tục" trong Tooltip, bấm nút "Kiểm tra", hoặc nhấn phím Enter để nộp bài.
   - **Bảo lưu dữ liệu khi "Thử lại":** `retryPractice` giữ nguyên `practiceVal` (không set `null`), tự động `focus()` và `select()` ô input để học sinh sửa số nhanh chóng.
   - **Xử lý khi ô trống:** Khi bấm Kiểm tra mà ô đang trống, hệ thống hiển thị thông báo lỗi rõ ràng trong Tooltip (`tutorialTexts.man1De.chuaNhap`), viền đỏ ô input, tự động chuyển về bước 3 và focus vào input; học sinh gõ số tiếp bình thường, không bao giờ bị kẹt.
   - **Chu kỳ phím Enter và chống click ma:** Chu kỳ phím Enter yêu cầu nhả phím (`keyup`) rồi nhấn phím mới mới kích hoạt hành động tiếp theo; click chuột/chạm thật (`e.detail > 0`) được kích hoạt tức thì.
3. **Bảng kết quả kiểm tra tự động E2E qua giao diện thật (`scripts/p8a-e2e-final-check.mjs`):**

| Nhóm kiểm thử | Độ phân giải 1366×768 (Chuột + Phím) | Độ phân giải 360×800 (Chạm giả lập) | Độ phân giải 844×390 (Chạm giả lập) |
| :--- | :---: | :---: | :---: |
| **Test 1: Nhập đúng 29 ngay lần đầu** $\to$ Chúc mừng $\to$ Bắt đầu chơi thật | **ĐẠT** | **ĐẠT** | **ĐẠT** |
| **Test 2: Nhập sai 2 lần (15 $\to$ 16)** $\to$ Giữ số khi Thử lại $\to$ Sửa 29 thành công | **ĐẠT** | **ĐẠT** | **ĐẠT** |
| **Test 3: Ô trống bấm Kiểm tra** $\to$ Báo lỗi rõ $\to$ Gõ 29 tiếp không kẹt | **ĐẠT** | **ĐẠT** | **ĐẠT** |
| **Test 4: Bỏ qua hướng dẫn & mở lại giữa bài** $\to$ Bảo lưu nguyên vẹn bài thật (giá trị 25) | **ĐẠT** | **ĐẠT** | **ĐẠT** |
| **Test 5: Kiểm tra tiến độ cookie `sc_guest`** $\to$ Làm thử đúng 29 không tự ý cộng xu, sao hay hoàn thành trạm | **ĐẠT** (`c = 0`, `lv = {}`) | | |

- **Kết luận:** **13/13 test đạt hoàn toàn!** Bằng chứng lưu tại `docs/screenshots/p8a/ket-qua-p8a-e2e.json` và các ảnh chụp màn hình `test1-correct-*.png`.

---

## 6. Kết quả 4 lệnh kiểm tra bắt buộc

1. `pnpm check:text`: Sạch 100% (**438 file**).
2. `pnpm typecheck`: Biên dịch thành công 100% (**10 packages**).
3. `pnpm test --maxWorkers=2`: **209 test files passed**, **2295 tests passed**, 5 skipped (thêm test mới layout flex-col và footer shrink-0 trong `tutorialSpotlight.test.tsx`).
4. `pnpm build`: Toàn bộ **5 ứng dụng** (`hub`, `lang-bac`, `lang-giay`, `lang-det`, `lang-khac-dau`) build production thành công.

---

## 7. Giới hạn còn lại và Phạm vi tiếp theo

- Đã hoàn thành mẫu hoàn chỉnh tại Màn 1 trạm Dễ (P8a).
- Các trạm Trung bình và Khó của Màn 1, cùng 11 màn còn lại (Màn 2 đến Màn 12) chưa áp dụng trong buổi này và sẽ được nhân rộng ở các bước tiếp theo sau khi chủ dự án đánh giá và nghiệm thu mẫu P8a.
