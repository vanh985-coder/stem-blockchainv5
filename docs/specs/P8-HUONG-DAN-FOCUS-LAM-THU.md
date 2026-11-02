# Hướng dẫn Focus và Làm thử (P8)

Tài liệu thiết kế cơ chế hướng dẫn focus và làm thử tương tác cho các màn chơi, đã triển khai cho **12 màn** theo báo cáo P8; đang chờ người dùng kiểm tổng thể (bàn giao Claude Code ngày 01/11/2026). Mục 2 giữ làm mẫu Màn 1 Dễ.

## 1. Mục tiêu và Nguyên tắc cốt lõi (P8)

- **Focus & Spotlight:** Làm tối nhẹ phần còn lại của màn hình (`bg-black/60` hoặc tương đương), khoét sáng (spotlight) đúng vùng cần chú ý hoặc thao tác với đường viền sáng nổi bật.
- **Lời hướng dẫn đặt cạnh vùng focus (Tooltip):** Đặt thông minh ở trên/dưới/cạnh vùng khoét sáng, không che khuất ô nhập hoặc nút thao tác, không tràn màn hình.
- **Thực hành thật:** Đến bước thực hành, học sinh phải thao tác thật (nhập số, bấm nút); hệ thống nhận diện thao tác đúng rồi mới chuyển bước. Không chỉ là một hộp thoại tĩnh với nút "Tiếp".
- **Tách biệt hoàn toàn khỏi bài thật:**
  - Lượt làm thử sử dụng dữ liệu ví dụ cố định, tính toán bằng logic bài học thuần túy có sẵn.
  - Không tính điểm, không trừ tim, không tính giờ chơi, không cộng xu, sao hay Trang Sổ Vàng.
  - Không gọi API hay hàm lưu tiến độ (`record()`, `saveNow()`).
  - Khi hoàn thành hoặc bỏ qua hướng dẫn đầu lượt, khởi tạo bài thật sạch; khi xem lại giữa ván phải bảo lưu và tiếp tục ván cũ, dọn dẹp toàn bộ timer/listener/giá trị nhập tạm.
- **Bỏ qua & Xem lại:**
  - Có nút "Bỏ qua hướng dẫn" ở mọi bước.
  - Mở lại được bất kỳ lúc nào từ khu vực trợ giúp của màn (nút "Hướng dẫn" trên thanh header).
  - Hiển thị hướng dẫn đầu lượt ở các màn đã tích hợp. Khi mở lại giữa bài, trạng thái bài đang làm dở được bảo lưu nguyên vẹn; đóng hướng dẫn thì quay lại đúng trạng thái đó.
- **Khả năng tiếp cận (Accessibility):**
  - Hỗ trợ chuột, bàn phím và cảm ứng. Focus trap giới hạn phím Tab trong vùng tương tác và tooltip, không nhảy ra nền tối.
  - Chống Enter kích hoạt đúp: nộp đáp án không đồng thời kích hoạt chuyển bước hay bắt đầu bài thật.
  - Chế độ Giảm chuyển động (`reducedMotion`): tắt hiệu ứng nhấp nháy, cuộn tức thì không dùng smooth scroll.
  - Cỡ chữ chuẩn theo `rem`, co giãn responsive tốt trên cả Desktop 1366×768 và Mobile 360×800 / 844×390.
  - Toàn bộ nội dung hiển thị nằm trong `packages/core/src/content/tutorial.ts`, xưng "em", dùng hàm `fmt()` thay placeholder.

---

## 2. Luồng mẫu Màn 1 - Trạm Dễ (P8a)

### 2.1 Dữ liệu ví dụ cố định
- **Trang bìa (mở đầu):** `genesisCode = 12`
- **Trang 1 (cần tính mã):** nội dung giao dịch `content = 5`
- **Công thức:** `pageCode(prevCode, content)` = `(12 * 2 + 5) % 100 = 29`
  - Bước nhân đôi: `12 * 2 = 24`
  - Bước cộng nội dung: `24 + 5 = 29`
  - Mã trang kết quả: `29`

### 2.2 Các bước hướng dẫn (6 bước)
1. **Bước 1 - Giới thiệu mục tiêu (`intro`):**
   - Vùng focus: Toàn bộ bảng chuỗi sổ (`[data-tutorial="chain-strip"]`).
   - Lời hướng dẫn: "Trước khi bắt đầu, hãy cùng làm thử một trang để nắm cách tính mã trang nhé!"
   - Thao tác: Bấm "Tiếp tục" (hoặc phím Enter/Space).
2. **Bước 2 - Focus các số dùng để tính (`numbers`):**
   - Vùng focus: Ô mã trang bìa (`12`) và ô nội dung trang 1 (`5`) (`[data-tutorial="numbers-source"]`).
   - Lời hướng dẫn: "Mã trang được tính từ hai số: mã của trang trước ({truoc}) và nội dung của trang này ({nd})."
   - Thao tác: Bấm "Đã hiểu" để tiếp tục.
3. **Bước 3 - Focus công thức tính (`formula`):**
   - Vùng focus: Bảng công thức gợi ý của Tí / Bác An (`[data-tutorial="formula-box"]`).
   - Lời hướng dẫn: "Công thức: lấy mã trước nhân 2, cộng nội dung trang này, rồi lấy 2 chữ số cuối (chia 100 lấy số dư). Với trang này: ({truoc} × 2 + {nd}) = {tong}."
   - Thao tác: Bấm "Thử tính ngay".
4. **Bước 4 - Focus ô nhập kết quả thực hành (`input`):**
   - Vùng focus: Ô nhập mã trang của trang 1 (`[data-tutorial="code-input"]`).
   - Lời hướng dẫn: "Em hãy tính nhẩm và nhập kết quả vào ô mã trang nhé!"
   - Thao tác: Học sinh gõ số vào ô (chỉ chấp nhận số 0–99). Khi đã có số, chuyển sang hướng dẫn bấm nút Kiểm tra.
5. **Bước 5 - Focus nút Kiểm tra (`check`):**
   - Vùng focus: Nút "Kiểm tra" (`[data-tutorial="check-button"]`).
   - Lời hướng dẫn: "Bấm nút 'Kiểm tra' (hoặc nhấn phím Enter) để nộp đáp án."
   - Thao tác: Học sinh bấm nút hoặc nhấn Enter.
6. **Bước 6 - Phản hồi kết quả (`result`):**
   - **Nếu đúng (`29`):**
     - Spotlight nổi bật trang hoàn thành.
     - Lời hướng dẫn: "Chính xác! Mã trang là {ma}. Trang này đã được gắn chặt vào chuỗi!"
     - Nút hành động: "Bắt đầu chơi thật" -> Kết thúc hướng dẫn, khởi tạo ván bài thật mới hoàn toàn sạch sẽ.
   - **Nếu sai (≠ `29`):**
     - Lời hướng dẫn: "Chưa đúng rồi: {truoc} × 2 = {gapDoi}, cộng {nd} thành {tong}. Em hãy thử lại nhé!"
     - Cho phép học sinh nhập lại và bấm kiểm tra lại, không phạt tim, không tính số lỗi vào bài thật.

---

## 3. Kiến trúc cơ chế dùng chung (Shared Mechanism)

- **Component:** `TutorialSpotlight` trong `@so-chung/core` (`packages/core/src/ui/TutorialSpotlight.tsx`).
- **Vị trí:** render qua Portal vào body để tránh zoom của bài học; đo vùng mục tiêu và cập nhật khi cuộn, resize, visualViewport thay đổi. Không coi tên hook trong bản thiết kế cũ là API bắt buộc.
- **Định vị Tooltip:** Tự tính toán vị trí `top`, `bottom`, `left` hoặc `right` dựa trên khoảng trống màn hình thực tế, căn giữa theo target hoặc màn hình hẹp, đảm bảo cách viền màn hình tối thiểu 12px.
- **Focus Trap:** Bắt sự kiện phím Tab, giữ focus luân chuyển trong các phần tử tương tác cho phép của bước hiện tại.

## 4. Phạm vi đã triển khai và điều kiện nghiệm thu (01/11/2026)

| Màn | Phần hướng dẫn/làm thử theo báo cáo |
|---|---|
| 1 | Dễ/TB/Khó: tính mã, phát hiện và sửa chuỗi |
| 2 | Điều khiển và nhảy thử |
| 3 | Chọn thẻ, soi công thức, ghép thử |
| 4 | Dễ/TB/Khó: so sổ, biểu quyết, tạo trang/đặt cọc |
| 5 | Bốn làn, vùng đập, vung búa thử |
| 6 | Điều khiển nâng diều |
| 7 | Dễ/TB/Khó: ký, kiểm bằng khóa công khai, bài tập dò khóa |
| 8 | Máy tính mod và lật cặp thẻ |
| 9 | Nạp thuốc và bắn thử |
| 10 | Dễ/TB/Khó: ghép số, dựng cây, điền cây |
| 11 | Tráo cặp lá trên bàn cờ |
| 12 | So mã hai nhánh và nhảy bám thử |

- Danh sách trên ghi nhận triển khai, không thay thế nghiệm thu tương tác. Bước thực hành phải gắn với hành động hợp lệ và phản ứng cảnh tập; nút chỉ đặt cờ “đã thử” không đủ.
- Khi vòng sau có cơ chế mới, cần hướng dẫn bổ sung ngắn; chưa có bằng chứng bao phủ riêng mọi vòng, phải rà khi nghiệm thu.
- Không tự đổi bước khi đang gõ; sai → thử lại giữ dữ liệu để sửa; ô trống có thông báo; Enter nộp không đồng thời chuyển bước. Kiểm cả giữ phím và thả/nhấn lại.
- Tooltip phải ở trong viewport, không chặn mục tiêu; thân cuộn khi thiếu chỗ, nút hành động tiếp cận được. Không chỉ kiểm tọa độ: phải bấm/nộp thật.
- Làm thử không ghi tiến độ/phần thưởng. Xem lại dừng timer, vật lý, spawn và tác vụ ván thật; đóng thì tiếp tục đúng trạng thái, không reset hoặc nhân đôi listener.
- Kiểm build local 1366×768, 360×800, 844×390; màn chỉ chơi ngang kiểm nhắc xoay và dừng khi dọc. Không coi giả lập là thiết bị thật.
- Bằng chứng: xem TRANG-THAI.md và các báo cáo trong docs/screenshots/p8*, *-tutorial/. 325 assertions là tổng tích lũy, chưa phải một lượt trên mã cuối. Người dùng chưa nghiệm thu toàn bộ.
- Lỗi nội dung cần sửa: man10Tb.stepByStep đang ghi ×100 trong source được đọc 01/11; quy tắc đúng vẫn là combine(a,b)=a×10+b. Màn 7 cần rà diễn đạt về tìm ngược khóa.
