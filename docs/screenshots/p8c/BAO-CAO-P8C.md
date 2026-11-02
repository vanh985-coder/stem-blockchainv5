# Báo cáo P8c — Hướng dẫn focus và làm thử Màn 4 Làng Dệt (Đủ Dễ, Trung bình, Khó)

**Thời điểm thực hiện:** 31/10/2026  
**Nhánh làm việc:** `claude/wonderful-dijkstra-x092dj`  
**Môi trường thử nghiệm:** Bản build production preview cổng 5193 (`http://localhost:5193`), máy chủ tài nguyên cổng 5180 (`http://localhost:5180`).

---

## 1. Mục tiêu và Phạm vi thực hiện

Theo yêu cầu P8c, triển khai đầy đủ cơ chế **Hướng dẫn focus (`TutorialSpotlight`)** và **Làm thử tương tác thực tế** cho cả 3 trạm của **Màn 4 — Làng Dệt (Bài 2: Đồng thuận và Phân tán)**:
- **Trạm Dễ ("Duyệt trang mới"):** Học sinh quan sát sổ của mình (mã cuối $X = 40$), quan sát trang mới do bạn Chi gửi ($c = 15$ dải lụa, mã đề xuất $95$), sử dụng máy tính $(X \times 2 + c) \bmod 100$ để kiểm tra tính hợp lệ và đưa ra quyết định **Đồng ý / Từ chối**.
- **Trạm Trung bình ("So sổ trước khi duyệt"):** Học sinh quan sát bố cục đối chiếu 2 cột trái - phải giữa Sổ của em (trái) và Sổ của Tí (phải); phát hiện trang 2 của Tí bị sửa lén từ 14 sang 15 dải lụa khiến chuỗi mã sau đó bị lệch ($74 \neq 72$); nhận biết trang mới đề xuất dựa trên sổ sai là không hợp lệ và quyết định **Từ chối**.
- **Trạm Khó ("Cơ chế Proof of Stake - Đặt cọc và tạo trang"):** Học sinh quan sát bảng điểm cọc 4 người chơi (mỗi người 100 điểm ban đầu, cọc 30 điểm mỗi lượt); thực hành lượt em tạo trang với mã trang trước $X = 25$, nội dung dải lụa $c = 18$; tính nhẩm công thức $(25 \times 2 + 18) \bmod 100 = 68$; nhập số vào ô `NumberInput` và bấm "Gửi trang" (hoặc nhấn phím Enter).

---

## 2. Thiết kế chi tiết từng trạm

### 2.1. Trạm Dễ (Easy) — Quyết định duyệt trang mới
- **Dữ liệu mẫu độc lập:**
  - Sổ của em có mã trang cuối $X = 40$.
  - Bạn Chi gửi trang mới có nội dung $c = 15$, mã đề xuất là $95$.
  - Công thức: $(40 \times 2 + 15) \bmod 100 = 95$. Khớp với mã đề xuất $\to$ Quyết định đúng: **Đồng ý**.
- **Các bước focus:**
  1. *Bước 0 (Giới thiệu):* Nêu mục tiêu node giữ sổ, tự kiểm tra mã trước khi duyệt.
  2. *Bước 1 (Sổ của em):* Focus vào bảng sổ của em, chỉ rõ mã cuối $X = 40$.
  3. *Bước 2 (Trang đề xuất):* Focus vào thẻ trang mới của bạn Chi, phân tích $c = 15$ và mã đề xuất $95$.
  4. *Bước 3 (Máy tính):* Focus vào máy tính `PageCodeCalculator` và gợi ý công thức.
  5. *Bước 4 (Biểu quyết):* Focus vào 2 nút "✓ Đồng ý" và "✗ Từ chối". Chờ học sinh bấm thao tác thật.
  6. *Bước 5 (Phản hồi):*
     - Bấm **Đồng ý**: Phản hồi chính xác! Nút "Bắt đầu chơi thật" đưa vào ván 1 sạch với 3 tim.
     - Bấm **Từ chối**: Phản hồi giải thích công thức, nút "Thử lại" đưa về bước 4 để học sinh chọn lại.

### 2.2. Trạm Trung bình (Medium) — Đối chiếu 2 sổ phát hiện gian lận
- **Dữ liệu mẫu độc lập:**
  - Sổ của em: 3 trang có mã cuối lần lượt là $34, 82, 72$.
  - Sổ của Tí: Trang 2 bị sửa lén từ 14 thành 15 dải lụa, khiến mã trang 2 đổi thành 83, mã trang 3 thành 74.
  - Trang mới Tí gửi đề xuất $prevCode = 74$, lệch hoàn toàn với mã trang cuối 72 trong sổ của em $\to$ Quyết định đúng: **Từ chối**.
- **Các bước focus:**
  1. *Bước 0 (Giới thiệu):* Cảnh báo kẻ gian có thể sửa lén trang cũ trong sổ của họ.
  2. *Bước 1 (So sánh 2 sổ):* Focus vào khung đối chiếu 2 cột trái - phải giữa 2 cuốn sổ.
  3. *Bước 2 (Vết sửa lén):* Focus vào hàng trang của Tí, chỉ rõ trang 2 bị sửa nội dung từ 14 thành 15 làm sai lệch chuỗi.
  4. *Bước 3 (Máy tính & Trang mới):* Giải thích vì sổ người gửi đã sai từ trước, trang mới không hợp lệ.
  5. *Bước 4 (Biểu quyết):* Focus vào 2 nút Đồng ý / Từ chối để học sinh biểu quyết.
  6. *Bước 5 (Phản hồi):*
     - Bấm **Từ chối**: Phản hồi chính xác! Nút "Bắt đầu chơi thật".
     - Bấm **Đồng ý**: Phản hồi cảnh báo sổ người gửi đã bị sửa lén, nút "Thử lại" đưa về bước 4.

### 2.3. Trạm Khó (Hard) — Đặt cọc Proof of Stake và Tạo trang thật
- **Dữ liệu mẫu độc lập:**
  - Bảng cọc: 4 người chơi đều có 100 điểm.
  - Lượt em tạo trang: Mã trước $X = 25$, nội dung $c = 18$.
  - Mã trang đúng: $(25 \times 2 + 18) \bmod 100 = 68$.
- **Các bước focus:**
  1. *Bước 0 (Intro Proof of Stake):* Giới thiệu cơ chế cọc 30 điểm tạo trang.
  2. *Bước 1 (Bảng điểm cọc):* Focus vào bảng điểm 4 người chơi.
  3. *Bước 2 (Thông tin trang tạo):* Focus vào $X = 25$ và $c = 18$.
  4. *Bước 3 (Ô nhập mã & Gửi trang):* Focus vào thẻ "Ghi trang thật", ô nhập số `NumberInput` và nút "Gửi trang". Nút "Ghi trang gian" bị vô hiệu hóa trong làm thử.
     - *Xử lý ô trống:* Nếu chưa nhập mà bấm Gửi trang $\to$ hiện cảnh báo `role="alert"`: *"Em chưa nhập mã trang. Hãy tính nhẩm và nhập số từ 0 đến 99 vào ô mã trang nhé!"*.
     - *Xử lý nhập sai (ví dụ 50):* Báo sai, chuyển sang bước 4 với nút "Thử lại".
     - *Bấm Thử lại:* Quay về bước 3, **giữ nguyên số 50 trong ô nhập** để học sinh chỉ cần xóa/sửa số thay vì gõ lại từ đầu.
     - *Nhập đúng 68:* Chuyển sang bước 4 chúc mừng, nút "Bắt đầu chơi thật".
  5. *Bước 4 (Phản hồi kết quả):* Hiện nút "Bắt đầu chơi thật" (nếu đúng) hoặc "Thử lại" (nếu sai).

---

## 3. Tính độc lập và Bảo toàn tiến độ thật

1. **Không can thiệp tiến độ thật:**
   - Dữ liệu làm thử hoàn toàn tách biệt, không gọi hàm `record()`.
   - Không cộng điểm, không mất tim, không cộng xu, không trao Trang Sổ Vàng.
   - Bắt đầu bài thật sau khi hoàn thành hoặc bấm "Bỏ qua" đều reset thời gian (`realStartTime`) và trạng thái bài thật sạch sẽ từ đầu.
2. **Nút "💡 Hướng dẫn" xem lại giữa bài:**
   - Khi đang làm bài thật, học sinh có thể bấm nút "💡 Hướng dẫn" trên header để mở lại hướng dẫn.
   - Khi đóng hướng dẫn, bảo toàn nguyên vẹn số tim còn lại, vòng chơi đang dở và thời gian chơi.
3. **Kiểm tra Cookie Khách (`sc_guest`):**
   - Đã kiểm tra cookie `sc_guest` sau khi làm thử: mảng `lv['4']` hoàn toàn sạch, không bị ghi nhận sao hoặc cờ hoàn thành gian lận.

---

## 4. Kết quả kiểm tra tự động E2E (`scripts/p8c-e2e-check.mjs`)

Đã chạy toàn bộ 22 ca kiểm tra tự động bằng Puppeteer trên bản build production preview cổng 5193 tại 3 độ phân giải chuẩn:
- **1366×768 (Desktop):** Thao tác chuột và bàn phím.
- **360×800 (Mobile dọc):** Thao tác chạm cảm ứng giả lập (`touchscreen.tap`).
- **844×390 (Mobile ngang):** Thao tác chạm cảm ứng trên màn hình xoay ngang.

| STT | Trạm | Kích thước | Kịch bản kiểm tra | Kết quả |
| :---: | :---: | :---: | :--- | :---: |
| 1 | Dễ | 1366×768 | Test 1: Chọn đúng Đồng ý $\to$ Vào bài thật sạch | **ĐẠT** |
| 2 | Dễ | 1366×768 | Test 2: Chọn sai (Từ chối) $\to$ Thử lại $\to$ Chọn Đồng ý thành công | **ĐẠT** |
| 3 | Dễ | 1366×768 | Test 3: Bỏ qua $\to$ Mở lại giữa bài $\to$ Bảo toàn nguyên vẹn | **ĐẠT** |
| 4 | Dễ | 360×800 | Test 1: Chọn đúng Đồng ý $\to$ Vào bài thật sạch | **ĐẠT** |
| 5 | Dễ | 360×800 | Test 2: Chọn sai (Từ chối) $\to$ Thử lại $\to$ Chọn Đồng ý thành công | **ĐẠT** |
| 6 | Dễ | 360×800 | Test 3: Bỏ qua $\to$ Mở lại giữa bài $\to$ Bảo toàn nguyên vẹn | **ĐẠT** |
| 7 | Dễ | 844×390 | Test 1: Chọn đúng Đồng ý $\to$ Vào bài thật sạch | **ĐẠT** |
| 8 | Dễ | 844×390 | Test 2: Chọn sai (Từ chối) $\to$ Thử lại $\to$ Chọn Đồng ý thành công | **ĐẠT** |
| 9 | Dễ | 844×390 | Test 3: Bỏ qua $\to$ Mở lại giữa bài $\to$ Bảo toàn nguyên vẹn | **ĐẠT** |
| 10 | TB | 1366×768 | Test 1: Chọn đúng Từ chối $\to$ Vào bài thật sạch | **ĐẠT** |
| 11 | TB | 1366×768 | Test 2: Chọn sai (Đồng ý) $\to$ Thử lại $\to$ Chọn Từ chối thành công | **ĐẠT** |
| 12 | TB | 360×800 | Test 1: Chọn đúng Từ chối $\to$ Vào bài thật sạch | **ĐẠT** |
| 13 | TB | 360×800 | Test 2: Chọn sai (Đồng ý) $\to$ Thử lại $\to$ Chọn Từ chối thành công | **ĐẠT** |
| 14 | TB | 844×390 | Test 1: Chọn đúng Từ chối $\to$ Vào bài thật sạch | **ĐẠT** |
| 15 | TB | 844×390 | Test 2: Chọn sai (Đồng ý) $\to$ Thử lại $\to$ Chọn Từ chối thành công | **ĐẠT** |
| 16 | Khó | 1366×768 | Test 1: Nhập đúng 68 $\to$ Vào bài thật sạch | **ĐẠT** |
| 17 | Khó | 1366×768 | Test 2: Ô trống $\to$ Sai (50) $\to$ Giữ số $\to$ Sửa 68 thành công | **ĐẠT** |
| 18 | Khó | 360×800 | Test 1: Nhập đúng 68 $\to$ Vào bài thật sạch | **ĐẠT** |
| 19 | Khó | 360×800 | Test 2: Ô trống $\to$ Sai (50) $\to$ Giữ số $\to$ Sửa 68 thành công | **ĐẠT** |
| 20 | Khó | 844×390 | Test 1: Nhập đúng 68 $\to$ Vào bài thật sạch | **ĐẠT** |
| 21 | Khó | 844×390 | Test 2: Ô trống $\to$ Sai (50) $\to$ Giữ số $\to$ Sửa 68 thành công | **ĐẠT** |
| 22 | Chung | Toàn bộ | Kiểm tra cookie `sc_guest` không bị ghi nhận bậy | **ĐẠT** |

**Tổng kết:** **22/22 ca kiểm tra đạt 100%.** Kết quả JSON lưu tại `docs/screenshots/p8c/ket-qua-p8c-e2e.json`.

---

## 5. Danh mục ảnh chụp minh chứng

Toàn bộ 22 ảnh chụp minh chứng đã được nén tối ưu qua thư viện `sharp` với bảng màu palette (tất cả file đều $< 300\text{ KB}$, dao động từ $32\text{ KB}$ đến $292\text{ KB}$):

1. **Trạm Dễ (1366×768):**
   - `p8c-de-1366-step0-intro.png` (185 KB): Bước 0 giới thiệu nhiệm vụ duyệt trang mới.
   - `p8c-de-1366-step2-proposal.png` (188 KB): Bước 2 focus vào đề xuất trang mới của Chi ($c = 15$, mã 95).
   - `p8c-de-1366-step4-decision.png` (166 KB): Bước 4 focus vào nút Đồng ý / Từ chối.
   - `p8c-de-1366-correct.png` (183 KB): Phản hồi khi chọn đúng Đồng ý.
   - `p8c-de-1366-wrong.png` (163 KB): Phản hồi khi chọn sai Từ chối kèm nút Thử lại.
   - `p8c-de-1366-real-game.png` (292 KB): Giao diện bài thật sạch sau khi bắt đầu chơi.
2. **Trạm Trung bình (1366×768):**
   - `p8c-tb-1366-step0-intro.png` (175 KB): Bước 0 giới thiệu thủ đoạn sửa lén trang cũ.
   - `p8c-tb-1366-step1-compare.png` (213 KB): Bước 1 đối chiếu 2 cột trái - phải giữa 2 cuốn sổ.
   - `p8c-tb-1366-step2-tampered.png` (180 KB): Bước 2 khoanh vùng trang 2 của Tí bị sửa lén từ 14 sang 15.
   - `p8c-tb-1366-correct.png` (180 KB): Phản hồi chọn đúng Từ chối.
   - `p8c-tb-1366-wrong.png` (180 KB): Phản hồi chọn sai Đồng ý kèm nút Thử lại.
3. **Trạm Khó (1366×768):**
   - `p8c-kho-1366-step0-intro.png` (157 KB): Bước 0 giới thiệu cơ chế đặt cọc Proof of Stake.
   - `p8c-kho-1366-step2-create.png` (158 KB): Bước 2 hiển thị mã trước $X = 25$ và nội dung $c = 18$.
   - `p8c-kho-1366-step3-input.png` (151 KB): Bước 3 focus vào ô nhập số và nút Ghi trang thật.
   - `p8c-kho-1366-wrong-50.png` (155 KB): Phản hồi khi nhập sai 50 kèm nút Thử lại.
   - `p8c-kho-1366-correct-68.png` (151 KB): Phản hồi khi nhập đúng 68.
4. **Màn hình di động (360×800 & 844×390):**
   - `p8c-de-360-step0.png` (47 KB) & `p8c-de-360-correct.png` (33 KB): Trạm Dễ trên điện thoại 360×800.
   - `p8c-tb-360-step1.png` (45 KB) & `p8c-tb-360-correct.png` (35 KB): Trạm Trung bình trên điện thoại 360×800.
   - `p8c-kho-844-step3.png` (49 KB) & `p8c-kho-844-correct.png` (52 KB): Trạm Khó trên màn hình ngang 844×390.

---

## 6. Kết quả 4 lệnh kiểm tra bắt buộc

1. **`pnpm typecheck`:**  
   - Đạt 10/10 packages và applications (`core`, `hub`, `village-lang-giay`, `village-lang-det`, `village-lang-khac-dau`, `village-lang-bac`, `config`, etc.). Không phát sinh lỗi TypeScript.
2. **`pnpm check:text`:**  
   - Quét sạch 438 files. 100% chuỗi văn bản giao diện nằm trong `packages/core/src/content/`, xưng "em", định dạng biến chuẩn qua `fmt()`.
3. **`pnpm test --maxWorkers=2`:**  
   - Bổ sung bộ unit test `apps/hub/src/man4Tutorial.test.tsx` (6 tests).  
   - **2306 passed, 5 skipped** trên toàn bộ 213 test files.
4. **`pnpm build`:**  
   - Build production thành công 100% với cờ gộp mạng `VITE_MERGED=true`.
   - Chunk Màn 4 được tách tải lười sạch sẽ, nhẹ và tối ưu.
