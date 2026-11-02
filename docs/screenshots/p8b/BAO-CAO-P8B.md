# BÁO CÁO P8b — TRIỂN KHAI HƯỚNG DẪN FOCUS VÀ LÀM THỬ CHO MÀN 1 TRUNG BÌNH VÀ KHÓ

**Thời điểm thực hiện:** 31/10/2026  
**Nhánh làm việc:** `claude/wonderful-dijkstra-x092dj`  
**Mục tiêu:** Tiếp tục giai đoạn P8b theo đúng định hướng: triển khai hướng dẫn bằng kỹ thuật focus vùng tương tác và thực hành làm thử một phần bài học trước khi bắt đầu bài thật cho Màn 1 trạm **Trung bình** ("{phanDien} sửa trộm sổ") và trạm **Khó** ("Đua với mạng lưới"), kế thừa và tái sử dụng toàn bộ cơ chế chuẩn của `TutorialSpotlight` đã được nghiệm thu ở P8a.

---

## 1. Tóm tắt các việc đã triển khai

### 1.1 Nội dung hướng dẫn và đa ngôn ngữ (`packages/core/src/content/tutorial.ts`)
- Đã bổ sung đầy đủ bộ chuỗi giao diện tiếng Việt cho trạm Trung bình (`man1Tb`) và trạm Khó (`man1Kho`):
  - Xưng "em" với học sinh, không viết cứng tên nhân vật (dùng `{phanDien}` định dạng qua `fmt()`).
  - Lời hướng dẫn ngắn gọn, tập trung vào bản chất bài học: hiệu ứng domino khi sửa sổ (Trung bình) và tốc độ tính lại để đuổi kịp mạng lưới (Khó).
  - Bổ sung thông báo cảnh báo khi ô nhập trống (`chuaNhap`), giải thích chi tiết khi tính sai và lời chúc mừng khi tính đúng.
  - Kiểm tra `pnpm check:text` đạt sạch 100% (438 file không có chuỗi tiếng Việt viết cứng trong component).

### 1.2 Trạm Trung bình (`packages/village-lang-giay/src/bai-1/Medium.tsx`)
- **Dữ liệu làm thử cố định:**
  - Trang Genesis: 12.
  - Trang 1: số lượng 5, mã 29 (đúng).
  - Trang 2 (bị Tí sửa trộm): số lượng gốc 8 bị sửa thành 9, mã trang cũ là 66.
  - Công thức tính lại: $\text{mã trước} \times 2 + \text{nội dung} = 29 \times 2 + 9 = 67$.
  - Trang 3, 4, 5 tự động đổi mã khi hiệu ứng domino kích hoạt.
- **Luồng 6 bước làm thử:**
  - Bước 0 (intro): Giới thiệu mục tiêu ngắn, làm nổi bật chuỗi trang sổ.
  - Bước 1 (inspect): Quan sát trang 2 bị Tí đổi số từ 8 sang 9, gạch ngang số cũ.
  - Bước 2 (formula): Focus khung công thức của Bí Thư: $29 \times 2 + 9 = 67$.
  - Bước 3 (input): Focus vào trang sổ đang sửa, học sinh tự nhập mã mới.
  - Bước 4 (check): Focus nút "Cập nhật mã" (hoặc học sinh bấm Enter ngay trên ô nhập).
  - Bước 5 (result):
    - Nhập sai (ví dụ 15): Hiển thị phản hồi sai kèm giải thích công thức, hiện nút "Thử lại". Khi bấm "Thử lại", số 15 được giữ nguyên trên ô nhập để học sinh chỉnh sửa, không bị xóa trắng.
    - Nhập đúng (67): Hiển thị phản hồi chúc mừng, hiệu ứng domino lan truyền làm đúng lại trang sổ, hiện nút "Bắt đầu chơi thật".
- **Tách biệt dữ liệu:** Quá trình làm thử hoàn toàn độc lập, không ghi nhận điểm, sao, xu hay tiến độ thật. Bắt đầu bài thật bấm giờ sạch sẽ từ đầu.

### 1.3 Trạm Khó (`packages/village-lang-giay/src/bai-1/Hard.tsx`)
- **Tạm dừng đồng hồ và mạng lưới tuyệt đối:**
  - Đồng hồ đếm ngược `CountdownTimer` dừng 100% khi `tutorialOpen === true` (`isPaused={isTimeUp || tutorialOpen}`).
  - Mạng lưới sinh thêm trang tự động bị ngắt hoàn toàn trong suốt quá trình hướng dẫn.
  - Khi học sinh bấm "Bắt đầu chơi thật", đồng hồ được kích hoạt lại (`gameResetTrigger`), bắt đầu bài thật với trọn vẹn 60 giây sạch sẽ.
- **Dữ liệu làm thử cố định:**
  - Trang Genesis: 10.
  - Trang 1: số lượng 4, mã 24.
  - Trang 2: số lượng 7, mã trang đang sai là 50 (đúng phải là $24 \times 2 + 7 = 55$).
  - Số trang cần sửa: 5 trang.
- **Luồng làm thử:**
  - Học sinh tìm trang sai đầu tiên, nhập mã đúng 55 (hoặc nhập sai 20 $\to$ thử lại giữ số $\to$ sửa 55).
  - Trả lời đúng $\to$ hiện phản hồi $\to$ bấm "Bắt đầu chơi thật" $\to$ đồng hồ bắt đầu đếm ngược, mạng lưới bắt đầu hoạt động.
- **Mở lại giữa bài:** Nút "💡 Hướng dẫn" cho phép học sinh mở lại bất cứ lúc nào. Khi mở lại, đồng hồ bài thật đứng yên bảo lưu thời gian còn lại; khi đóng hướng dẫn, đồng hồ tiếp tục chạy từ đúng mốc thời gian đó mà không bị trôi giây nào.

---

## 2. Kết quả kiểm tra tự động E2E Puppeteer (`scripts/p8b-e2e-check.mjs`)

Đã thực hiện bộ kiểm tra toàn diện trên bản **Production Preview cổng 5193** (`VITE_MERGED=true`) trên 3 kích thước màn hình chuẩn:
1. **Desktop:** 1366×768 (chuột + bàn phím).
2. **Mobile dọc:** 360×800 (chạm cảm ứng giả lập).
3. **Mobile ngang:** 844×390 (chế độ landscape hẹp).

### Bảng kết quả 20/20 Test đạt 100%

| STT | Trạm & Kịch bản kiểm tra | Kích thước | Phương thức thao tác | Trạng thái |
|:---:|:---|:---:|:---:|:---:|
| 1 | [Trung bình] Nhập đúng 67 lần đầu $\to$ vào bài thật | 1366×768 | Chuột + Bàn phím | **PASS** |
| 2 | [Trung bình] Nhập sai (15) $\to$ Giữ số $\to$ Sửa 67 | 1366×768 | Bàn phím Enter | **PASS** |
| 3 | [Trung bình] Cảnh báo ô trống & Mở lại giữa bài bảo toàn bài thật | 1366×768 | Chuột + Nút Hướng dẫn | **PASS** |
| 4 | [Trung bình] Nhập đúng 67 lần đầu $\to$ vào bài thật | 360×800 | Chạm cảm ứng | **PASS** |
| 5 | [Trung bình] Nhập sai (15) $\to$ Giữ số $\to$ Sửa 67 | 360×800 | Chạm + Thử lại | **PASS** |
| 6 | [Trung bình] Cảnh báo ô trống & Mở lại giữa bài | 360×800 | Chạm cảm ứng | **PASS** |
| 7 | [Trung bình] Nhập đúng 67 lần đầu $\to$ vào bài thật | 844×390 | Chạm + Viewport hẹp | **PASS** |
| 8 | [Trung bình] Nhập sai (15) $\to$ Giữ số $\to$ Sửa 67 | 844×390 | Chạm + Thử lại | **PASS** |
| 9 | [Trung bình] Cảnh báo ô trống & Mở lại giữa bài | 844×390 | Chạm cảm ứng | **PASS** |
| 10 | [Khó] Đồng hồ dừng trong hướng dẫn & Nhập đúng 55 $\to$ vào bài thật | 1366×768 | Chuột + Bàn phím | **PASS** |
| 11 | [Khó] Nhập sai (20) $\to$ Giữ số $\to$ Sửa 55 thành công | 1366×768 | Bàn phím Enter | **PASS** |
| 12 | [Khó] Mở lại giữa bài tạm dừng đồng hồ & đóng tiếp tục đúng thời gian | 1366×768 | Timer pause/resume | **PASS** |
| 13 | [Khó] Đồng hồ dừng trong hướng dẫn & Nhập đúng 55 $\to$ vào bài thật | 360×800 | Chạm cảm ứng | **PASS** |
| 14 | [Khó] Nhập sai (20) $\to$ Giữ số $\to$ Sửa 55 thành công | 360×800 | Chạm + Thử lại | **PASS** |
| 15 | [Khó] Mở lại giữa bài tạm dừng đồng hồ & đóng tiếp tục đúng thời gian | 360×800 | Timer pause/resume | **PASS** |
| 16 | [Khó] Đồng hồ dừng trong hướng dẫn & Nhập đúng 55 $\to$ vào bài thật | 844×390 | Chạm cảm ứng | **PASS** |
| 17 | [Khó] Nhập sai (20) $\to$ Giữ số $\to$ Sửa 55 thành công | 844×390 | Chạm + Thử lại | **PASS** |
| 18 | [Khó] Mở lại giữa bài tạm dừng đồng hồ & đóng tiếp tục đúng thời gian | 844×390 | Timer pause/resume | **PASS** |
| 19 | [Hồi quy Màn 1 Dễ] Nhập đúng 29 hoạt động bình thường | 1366×768 | Chuột + Enter | **PASS** |
| 20 | [Bảo toàn Cookie] Cookie `sc_guest` không tự ý cộng sao hay xu khi làm thử | Cả 3 màn | Cookie verification | **PASS** |

---

## 3. Danh mục ảnh chụp minh chứng giao diện thực tế

Tất cả ảnh chụp đã được tự động lưu trong `docs/screenshots/p8b/` và thư mục artifact:

### 3.1 Màn 1 trạm Trung bình
- `p8b-tb-1366-step0-intro.png`: Bước 0 giới thiệu mục tiêu trạm Trung bình.
- `p8b-tb-1366-step1-inspect.png`: Bước 1 quan sát trang 2 bị Tí đổi từ 8 sang 9.
- `p8b-tb-1366-step2-formula.png`: Bước 2 công thức gợi ý của Bí Thư: $29 \times 2 + 9 = 67$.
- `p8b-tb-1366-step3-input.png`: Bước 3 ô nhập mã trang.
- `p8b-tb-1366-wrong-15.png`: Phản hồi khi nhập sai 15 và nút "Thử lại".
- `p8b-tb-1366-correct-67.png`: Phản hồi chúc mừng khi nhập đúng 67 và nút "Bắt đầu chơi thật".
- `p8b-tb-1366-real-game.png`: Bắt đầu bài chơi thật.
- `p8b-tb-360-step0.png`: Giao diện dọc trên điện thoại 360×800.
- `p8b-tb-360-correct.png`: Kết quả đúng trên điện thoại 360×800.

### 3.2 Màn 1 trạm Khó
- `p8b-kho-1366-step0-intro.png`: Bước 0 giới thiệu trạm Khó (đồng hồ dừng ở `⏱️60s`).
- `p8b-kho-1366-step1-inspect.png`: Bước 1 xác định trang sai đầu tiên (trang 2).
- `p8b-kho-1366-step2-formula.png`: Bước 2 gợi ý công thức $24 \times 2 + 7 = 55$.
- `p8b-kho-1366-step3-input.png`: Bước 3 ô nhập mã trang 2.
- `p8b-kho-1366-wrong-20.png`: Phản hồi khi nhập sai 20 và nút "Thử lại".
- `p8b-kho-1366-correct-55.png`: Phản hồi đúng khi nhập 55 và nút "Bắt đầu chơi thật".
- `p8b-kho-1366-real-game.png`: Bắt đầu bài thật (đồng hồ bắt đầu đếm ngược).
- `p8b-kho-844-step0.png`: Giao diện landscape hẹp 844×390.
- `p8b-kho-844-correct.png`: Kết quả đúng trên landscape 844×390.

---

## 4. Bốn lệnh kiểm tra bắt buộc của dự án

1. **`pnpm test --maxWorkers=2`**: **2300 tests passed**, 5 skipped (210 test files passed).
   - Thêm bộ test mới `apps/hub/src/man1MediumHardTutorial.test.tsx` (4 tests đạt 100%).
2. **`pnpm typecheck`**: **10 packages passed** sạch sẽ không có lỗi TypeScript.
3. **`pnpm check:text`**: **438 files checked clean**, không có chuỗi tiếng Việt hardcode ngoài `content/`.
4. **`pnpm build`**: Toàn bộ các gói và ứng dụng (`hub`, `lang-giay`, `lang-det`, `lang-khac-dau`, `lang-bac`) build thành công.

---

## 5. Kết luận và phạm vi còn lại

- **Đã hoàn thành xuất sắc P8b:** Cơ chế hướng dẫn focus và làm thử đã được mở rộng hoàn chỉnh cho cả 3 trạm của Màn 1 (Dễ, Trung bình, Khó).
- **Phạm vi còn lại (chưa triển khai):** Hướng dẫn focus cho các màn tiếp theo (Màn 4, 7, 10) và 8 mini-game của 4 làng sẽ được triển khai theo kế hoạch của các giai đoạn sau.
- **Server phục vụ trải nghiệm:** Hub preview cổng **5193** và Assets server cổng **5180** đang hoạt động liên tục trên local.
