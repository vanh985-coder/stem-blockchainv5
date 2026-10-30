# Hướng dẫn Focus và Làm thử (P8)

Tài liệu thiết kế cơ chế hướng dẫn focus và làm thử tương tác cho các màn chơi, triển khai mẫu tại **Màn 1 trạm Dễ (P8a)**.

## 1. Mục tiêu và Nguyên tắc cốt lõi (P8)

- **Focus & Spotlight:** Làm tối nhẹ phần còn lại của màn hình (`bg-black/60` hoặc tương đương), khoét sáng (spotlight) đúng vùng cần chú ý hoặc thao tác với đường viền sáng nổi bật.
- **Lời hướng dẫn đặt cạnh vùng focus (Tooltip):** Đặt thông minh ở trên/dưới/cạnh vùng khoét sáng, không che khuất ô nhập hoặc nút thao tác, không tràn màn hình.
- **Thực hành thật:** Đến bước thực hành, học sinh phải thao tác thật (nhập số, bấm nút); hệ thống nhận diện thao tác đúng rồi mới chuyển bước. Không chỉ là một hộp thoại tĩnh với nút "Tiếp".
- **Tách biệt hoàn toàn khỏi bài thật:**
  - Lượt làm thử sử dụng dữ liệu ví dụ cố định, tính toán bằng logic bài học thuần túy có sẵn.
  - Không tính điểm, không trừ tim, không tính giờ chơi, không cộng xu, sao hay Trang Sổ Vàng.
  - Không gọi API hay hàm lưu tiến độ (`record()`, `saveNow()`).
  - Khi hoàn thành hoặc bỏ qua hướng dẫn, khởi tạo lại bài thật sạch 100%, dọn dẹp toàn bộ timer/listener/giá trị nhập tạm.
- **Bỏ qua & Xem lại:**
  - Có nút "Bỏ qua hướng dẫn" ở mọi bước.
  - Mở lại được bất kỳ lúc nào từ khu vực trợ giúp của màn (nút "Hướng dẫn" trên thanh header).
  - Tự động hiển thị khi bắt đầu một lượt chơi mới ở Màn 1 trạm Dễ. Khi mở lại giữa bài, trạng thái bài đang làm dở được bảo lưu nguyên vẹn; đóng hướng dẫn thì quay lại đúng trạng thái đó.
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

- **Component:** `TutorialSpotlight` trong `@so-chung/core` (`packages/core/src/ui/tutorial/TutorialSpotlight.tsx`).
- **Hook tính toán vị trí:** `useElementRect(targetSelector)` tự động cập nhật khi resize, scroll, hoặc DOM thay đổi.
- **Định vị Tooltip:** Tự tính toán vị trí `top` hoặc `bottom` dựa trên khoảng trống màn hình thực tế, căn giữa theo target hoặc màn hình hẹp, đảm bảo cách viền màn hình tối thiểu 12px.
- **Focus Trap:** Bắt sự kiện phím Tab, giữ focus luân chuyển trong các phần tử tương tác cho phép của bước hiện tại.
