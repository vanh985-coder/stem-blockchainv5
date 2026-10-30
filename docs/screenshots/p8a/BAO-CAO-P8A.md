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

## 5. Kết quả kiểm tra tự động Puppeteer (`scripts/p8a-check.mjs` & `scripts/p8a-preview-check.mjs`)

Đã tiến hành hai đợt kiểm tra độc lập để đảm bảo chất lượng:

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

---

## 6. Kết quả 4 lệnh kiểm tra bắt buộc

1. `pnpm check:text`: Sạch 100% (**438 file**).
2. `pnpm typecheck`: Biên dịch thành công 100% (**10 packages**).
3. `pnpm test --maxWorkers=2`: **209 test files passed**, **2294 tests passed**, 5 skipped (thêm test mới `TutorialSpotlight.test.tsx` và `man1EasyTutorial.test.tsx`).
4. `pnpm build`: Toàn bộ **5 ứng dụng** build production thành công.

---

## 7. Giới hạn còn lại và Phạm vi tiếp theo

- Đã hoàn thành mẫu hoàn chỉnh tại Màn 1 trạm Dễ (P8a).
- Các trạm Trung bình và Khó của Màn 1, cùng 11 màn còn lại (Màn 2 đến Màn 12) chưa áp dụng trong buổi này và sẽ được nhân rộng ở các bước tiếp theo sau khi chủ dự án đánh giá và nghiệm thu mẫu P8a.
