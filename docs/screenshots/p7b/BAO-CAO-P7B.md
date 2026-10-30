# Báo cáo P7b: Hoàn thiện và kiểm lối chơi Đập Chuột 2D (Màn 5)

- **Thời gian thực hiện:** 30/10/2026.
- **Mã nguồn:** nhánh `claude/wonderful-dijkstra-x092dj`.
- **Nhiệm vụ:** P7b — Hoàn thiện và kiểm lối chơi Đập Chuột 2D Màn 5 (Làng Dệt), giữ nguyên bố cục 4 làn dọc và 2 nhóm chuột (chuột thường / chuột câu hỏi), thống nhất điều khiển, xử lý click ma, phím Enter giữ/lặp, đo dừng thời gian và kiểm trọn ván.

---

## 1. Các vấn đề kỹ thuật đã rà soát và cách xử lý

### A. Thống nhất quy tắc điều khiển giữa mọi phương thức thao tác
- **Vấn đề:** Trước P7b, thao tác chạm trực tiếp vào chuột trên màn hình có thể kích hoạt trúng kể cả khi chuột chưa vào vùng đập; trong khi phím tắt (D/F/J/K, 1/2/3/4) và nút chân làn chỉ tác động trong vùng đập.
- **Xử lý:**
  - Quy tụ toàn bộ vào hàm `whackLane(laneIndex, targetId?)`.
  - Mọi thao tác (chạm trực tiếp vào chuột, bấm nút đập chân làn, phím D/F/J/K hoặc 1/2/3/4) đều bắt buộc chuột mục tiêu phải nằm trong vùng đập:
    $$6.5 \le \text{pos} \le 9.0$$
  - Nếu chuột ngoài vùng đập: phát âm thanh trượt gió (`sound.playWhoosh()`) và hiển thị thông báo nổi "Đợi vào vùng đập!".
  - Chuột thường chỉ nhận tối đa 1 lần đập duy nhất.
  - Chuột to: cần đúng 2 cú đập riêng biệt. Bổ sung thời gian hồi `HIT_COOLDOWN_MS = 140ms` cho từng làn và theo dõi `keysPressed.current` để việc giữ phím, key repeat hoặc chạm giữ không tự động kích hoạt 2 đòn liên tiếp.
  - Nhiều chuột cùng làn: hàm `lowestInZone` luôn ưu tiên chọn con chuột ở vị trí thấp nhất (gần chạm đáy nhất) trong vùng đập của làn đó.
  - Chuột đổi làn: khi di chuyển qua mốc `pos = 5.0`, chuột chuyển sang làn kề và nhận đòn chính xác tại làn mới.

### B. Chống click ma và xử lý phím Enter giữ/lặp ở modal câu hỏi
- **Vấn đề click ma:** Ở màn hình ngang hẹp (844×390), cử chỉ chạm giữ chuột câu hỏi rồi nhấc tay (`pointerup`) có thể kích hoạt nhầm lựa chọn đáp án đầu tiên của `QuizCard` vì sự kiện `click` của trình duyệt lan truyền tới thẻ con.
- **Xử lý bằng Capture Phase (`onClickCapture`):**
  - Gắn `onClickCapture` ở overlay bao bọc `QuizCard`.
  - Tại capture phase (chạy trước khi sự kiện tới thẻ con `button` bên trong), kiểm tra `quizPointerDownInside.current`. Nếu cử chỉ chạm không xuất phát từ bên trong container câu hỏi sau khi mount, sự kiện lập tức bị ngăn chặn (`e.stopPropagation()`).
  - Phân biệt với bàn phím: các sự kiện phím (Enter/Space kích hoạt click giả lập) có `nativeEvent.detail === 0` và toạ độ `(0, 0)` được cho qua bình thường, đảm bảo bàn phím vẫn chọn và nộp bài bình thường.
- **Xử lý Enter giữ/lặp:**
  - Gắn listener `keydown`/`keyup` cho phím Enter trong modal câu hỏi.
  - Theo dõi cờ `enterHeld`: khi người chơi nhấn Enter để nộp bài, nếu tiếp tục giữ phím Enter liên tục > 1s, nút "Chơi tiếp" tuyệt đối không tự bấm. Bắt buộc người chơi phải thả phím (`keyup`) rồi nhấn lại mới tiếp tục ván.

### C. Đo trực tiếp thời gian và vị trí khi tạm dừng
- **Vấn đề:** Tránh việc đồng hồ đếm ngược hoặc đối tượng nhảy cóc thời gian sau khi đóng modal trợ giúp "?" hoặc câu hỏi trùm.
- **Xử lý:**
  - Trong hook vòng lặp `useFrame`: khi `paused` là `true` (mở "?" hoặc mở câu hỏi), vòng lặp bỏ qua hoàn toàn việc gọi `stepWhack`.
  - Khi unpause (đóng modal trợ giúp hoặc bấm "Chơi tiếp" sau câu hỏi), reset ngay mốc `lastTickTime.current = performance.now()` để delta time của khung hình đầu tiên sau khi mở lại không bị cộng dồn thời gian đã dừng.

---

## 2. Kết quả kiểm tra chuyên sâu bằng Puppeteer (`scripts/p7b-check.mjs`)

Đo đạc trên bản build preview thực tế với cookie khách thật (`sc_guest`) và tài khoản dev tại 3 độ phân giải chuẩn:

### A. Bảng kết quả kiểm tra giao diện và điều khiển (`ket-qua-p7b.json`)

| Độ phân giải | Đập ngoài vùng đập bị chặn | Đập trong vùng đập hạ chuột | Dừng thời gian khi mở "?" | Tiếp tục mượt mà sau khi đóng | Chống click ma (touch hold > 600ms) | Giữ Enter > 1s không tự Chơi tiếp |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1366×768 (Desktop)** | **ĐẠT** | **ĐẠT** | **ĐẠT** ($t_0=1.450$, $t_1=1.450$) | **ĐẠT** ($t_2=1.742$) | **ĐẠT** (Dialog mở, chưa nộp) | **ĐẠT** (Dialog vẫn mở) |
| **360×800 (Mobile dọc)** | **ĐẠT** | **ĐẠT** | **ĐẠT** ($t_0=1.658$, $t_1=1.658$) | **ĐẠT** ($t_2=1.967$) | **ĐẠT** (Dialog mở, chưa nộp) | **ĐẠT** (Dialog vẫn mở) |
| **844×390 (Mobile ngang)** | **ĐẠT** | **ĐẠT** | **ĐẠT** ($t_0=1.525$, $t_1=1.525$) | **ĐẠT** ($t_2=1.833$) | **ĐẠT** (Dialog mở, chưa nộp) | **ĐẠT** (Dialog vẫn mở) |

*Ghi chú đo đạc dừng thời gian:*
- Tại cả 3 độ phân giải: thời gian ván chơi $t_0$ và $t_1$ (cách nhau 300ms trong lúc mở hộp "?") trùng khớp nhau 100%, vị trí chuột $pos$ đứng yên hoàn toàn. Sau khi đóng modal, thời gian $t_2$ tăng tiếp tự nhiên không xảy ra hiện tượng nhảy cóc.

### B. Kiểm tra trọn ván thực tế (End-to-End Game Lifecycle)

1. **Thua ván vì đầy 8 vết mực (`reason: 'ink'`):**
   - Không đập chuột, để chuột trôi xuống đáy làn làm tăng vết mực tới 8/8.
   - Game lập tức dừng lại, nhận `reason: 'ink'`, hiển thị thông báo "📜 Sổ đầy mực rồi! Mình thử lại nhé." kèm nút "Xem kết quả".
   - Mở màn kết quả thua.
   - Bấm nút "Chơi lại": ván chơi được reset mới hoàn toàn (`score = 0`, `ink = 0`, `bossesDone = 0`), sẵn sàng chơi ván tiếp theo. (Ảnh 08, 09, 10).
2. **Thắng ván khi vượt qua đủ 10 lượt trùm (`reason: 'complete'`):**
   - Vượt qua lần lượt 10 câu hỏi của trùm Tí theo các mốc thời gian.
   - Hoàn thành đủ 10 trùm, ván chơi kết thúc thành công với `reason: 'complete'`.
   - Hiển thị thông báo chiến thắng "🏆 Em giữ được sổ qua cả 10 lượt của Tí!" kèm nút "Xem kết quả".
   - Màn kết quả hiển thị đầy đủ 4 phần điểm: điểm hạ chuột, điểm câu hỏi, thưởng giữ sổ (theo số vết mực còn lại) và điểm tổng kết. Phần thưởng chỉ ghi nhận 1 lần duy nhất. (Ảnh 11, 12).
3. **Tự hoàn thành giữa ván trên bản dev:**
   - Trên bản dev (cổng 5174), bắt đầu chơi, giữa ván mở hộp trợ giúp "?", bấm nút "Tự hoàn thành".
   - Ván chơi lập tức dừng lại, tiến độ toàn màn được ghi nhận là hoàn thành, không cộng điểm/sao/xu/sổ vàng. (Ảnh 13, 14).

---

## 3. Cân bằng nhịp chơi và Dung lượng Bundle

### A. Kiểm tra cân bằng bot (`whackBalance.test.ts`)
Chạy lại bộ test mô phỏng bot 300 ván với seed 1-300:
- **Bot giỏi:** Vượt qua 10 lượt trùm đạt 91.3% (điểm trung bình 3266.1). Đạt huy chương Vàng.
- **Bot trung bình:** Gặp trung bình 8.31 lượt trùm (điểm trung bình 2129.3). Tỷ lệ đạt: Đồng 48.0%, Bạc 28.7%.
- **Các mốc huy chương được giữ nguyên theo spec:**
  - Đồng: 1650 điểm
  - Bạc: 2650 điểm
  - Vàng: 3100 điểm

### B. Dung lượng bundle chunk Màn 5
- Chunk `Man5` trên bản build Vite: **22.27 kB** (gzip **7.79 kB**).
- Giảm mạnh so với phiên bản 3D cũ (trước đây là 91 kB Three.js chunk riêng + bộ shader Three.js).

---

## 4. Bốn lệnh kiểm tra bắt buộc

| Lệnh | Trạng thái | Chi tiết |
|---|:---:|---|
| `pnpm check:text` | **ĐẠT (SẠCH)** | 437 files kiểm tra. Không có chữ tiếng Việt viết cứng ngoài `packages/core/src/content/`. |
| `pnpm typecheck` | **ĐẠT (SẠCH)** | Toàn bộ 10 package biên dịch TypeScript thành công không có cảnh báo/lỗi type. |
| `pnpm test --maxWorkers=2` | **ĐẠT (2279/2279)** | 206 test files pass, 2279 tests pass, 5 skipped. Bộ test `whack2d.test.ts` đạt 12/12 ca kiểm thử chuyên sâu. |
| `pnpm build` | **ĐẠT** | Tất cả 6 ứng dụng (hub và các làng) build thành công. |

---

## 5. Danh mục ảnh minh chứng trong `docs/screenshots/p7b/`

1. `01-bat-dau-1366x768.png`, `01-bat-dau-360x800.png`, `01-bat-dau-844x390.png`: Thẻ bắt đầu Màn 5 ở 3 kích thước màn hình.
2. `02-dang-choi-1366x768.png`, `02-dang-choi-360x800.png`, `02-dang-choi-844x390.png`: Giao diện 4 làn dải lụa 2D, vùng đập và bàn Sổ Chung 8 chấm mực.
3. `03-thao-tac-dap-1366x768.png`, `03-thao-tac-dap-360x800.png`, `03-thao-tac-dap-844x390.png`: Thao tác đập chuột trong vùng đập, hiển thị hiệu ứng búa gõ và điểm thưởng.
4. `04-do-dung-khi-mo-help-1366x768.png`, `04-do-dung-khi-mo-help-360x800.png`, `04-do-dung-khi-mo-help-844x390.png`: Đo dừng thời gian khi mở hộp "?" giữa ván, chuột và đồng hồ đứng yên hoàn toàn.
5. `05-chuot-cau-hoi-1366x768.png`, `05-chuot-cau-hoi-360x800.png`, `05-chuot-cau-hoi-844x390.png`: Chuột câu hỏi mang biểu tượng ❓ vàng to lớn, nhãn "Chuột câu hỏi" và hào quang sáng rực.
6. `06-hop-cau-hoi-chong-click-ma-1366x768.png`, `06-hop-cau-hoi-chong-click-ma-360x800.png`, `06-hop-cau-hoi-chong-click-ma-844x390.png`: Hộp câu hỏi mở ra sau cú chạm giữ > 600ms, không bị chọn nhầm đáp án (chống click ma thành công).
7. `07-giai-thich-cau-hoi-1366x768.png`, `07-giai-thich-cau-hoi-360x800.png`, `07-giai-thich-cau-hoi-844x390.png`: Nộp câu hỏi, hiện giải thích, xoá 2 vết mực và kiểm tra giữ Enter > 1s không tự Chơi tiếp.
8. `08-thua-vi-day-muc.png`: Thông báo dừng ván khi sổ nhận đủ 8 vết mực.
9. `09-man-ket-qua-thua.png`: Màn hình kết quả khi thua ván với nút "Chơi lại".
10. `10-choi-lai-van-moi.png`: Bắt đầu ván mới sau khi bấm "Chơi lại", mực và điểm đã reset về 0.
11. `11-thang-hoan-thanh-10-trum.png`: Thông báo chiến thắng khi giữ được sổ qua đủ 10 lượt của Tí.
12. `12-man-ket-qua-thang.png`: Màn hình kết quả thắng hiển thị chi tiết 4 phần điểm tổng kết.
13. `13-dev-hop-tro-giup-giua-van.png`: Hộp trợ giúp "?" giữa ván trên bản dev hiển thị nút "Tự hoàn thành".
14. `14-dev-da-tu-hoan-thanh-giua-van.png`: Thao tác tự hoàn thành thành công trên bản dev, ván chơi dừng lại và màn được đánh dấu đã hoàn thành.
