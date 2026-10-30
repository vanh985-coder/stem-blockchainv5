# Báo cáo P7b: Hoàn thiện và kiểm lối chơi Đập Chuột 2D (Màn 5)

- **Thời gian thực hiện:** 30/10/2026.
- **Mã nguồn:** nhánh `claude/wonderful-dijkstra-x092dj`, commit bổ sung bằng chứng sau `7852a15`.
- **Nhiệm vụ:** Hoàn thiện và kiểm lối chơi Đập Chuột 2D Màn 5 (Làng Dệt), giữ nguyên bố cục 4 làn dọc và 2 nhóm chuột (chuột thường / chuột câu hỏi), thống nhất điều khiển, xử lý click ma, phím Enter giữ/lặp, đo dừng thời gian và kiểm tra chuyển trạng thái kết thúc ván.

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

## 2. Kết quả kiểm tra bổ sung các tình huống ván chơi

### A. Rà soát luật: Không có kết thúc ván do hết giờ (No Game-Over Timeout)
- **Căn cứ mã nguồn & config:**
  - Trong `packages/village-lang-det/src/whack/whackLogic.ts` (dòng 55):
    ```ts
    export type EndReason = 'complete' | 'ink';
    ```
  - Trong `WHACK_SPEC` (`whackConfig.ts`): Không định nghĩa thời lượng tối đa làm thua ván. Tham số `rampSeconds = 120` là mốc thời gian để nhịp sinh chuột và tốc độ tăng tới mức tối đa, đồng thời là mốc lượt trùm thứ 10 xuất hiện (`bossClock(9) = 120`).
  - **Quy tắc kết thúc ván của Màn 5:** Chỉ có đúng 2 trường hợp kết thúc:
    1. Thua vì đầy mực: `ink >= WHACK_SPEC.inkMax` (8 vết mực) $\to$ `endReason = 'ink'`.
    2. Thắng vì xong 10 lượt trùm: `bossesDone >= WHACK_SPEC.boss.count` (10 lượt) $\to$ `endReason = 'complete'`.
  - Đã có test vitest `luật màn 5 không có kết thúc do hết giờ ván` trong `whack2d.test.ts`: Khi đồng hồ vượt qua 118s (sắp tới 120s), nếu chưa xong 10 trùm và chưa đầy 8 vết mực thì ván vẫn tiếp tục ở `phase = 'play'`, không bị tự động dừng hay ép thua do hết giờ.

### B. Trả lời sai câu hỏi trùm
- **Quy tắc logic:** `answerBoss(state, 'wrong', secondsLeft)`:
  - Vết mực tăng thêm 1: `s.ink++`.
  - Điểm câu hỏi không được cộng (`points = 0`, `stats.bossCorrect` không tăng).
  - `bossesDone++`.
  - Nếu vết mực chạm 8/8: kết thúc ván với `reason: 'ink'`.
- **Bằng chứng kiểm tra thực tế (Ảnh 15):**
  - Mở câu hỏi trùm ở mức mực 2/8. Người chơi chọn đáp án sai.
  - Giao diện `QuizCard` hiển thị giải thích đáp án đúng; thông báo nổi "Tí né được và chạy xuống sổ: thêm một vết mực."
  - Sau khi bấm "Chơi tiếp", chấm mực trên HUD tăng từ 2 lên 3.

### C. Hết giờ câu hỏi trùm (Timeout đếm ngược)
- **Quy tắc logic:** Đếm ngược `quizLeft` từ 15s (trùm 1–5) hoặc 10s (trùm 6–10) về 0s:
  - Khi `quizLeft <= 0`: kích hoạt `answerBoss(state, 'timeout', 0)`.
  - Xử lý tương tự trả lời sai: tăng 1 vết mực, không cộng điểm trùm.
- **Bằng chứng kiểm tra thực tế (Ảnh 16):**
  - Khi đồng hồ đếm ngược hết giờ, giao diện chuyển sang Panel cảnh báo màu đỏ: "Hết giờ rồi!", nêu rõ đáp án đúng và nội dung giải thích kiến thức bài học.
  - Bấm "Chơi tiếp", vết mực trên HUD tăng thêm 1 chấm (từ 3 lên 4).

### D. Minh bạch phương pháp kiểm tra chuyển trạng thái kết thúc ván (Probe-assisted End-to-End Transition)
- **Lưu ý quan trọng về phương pháp đo:** Các ca kiểm tra kết thúc ván dưới đây sử dụng **probe để thiết lập trạng thái cận kề kết thúc** (nhằm kiểm tra chuyển đổi trạng thái giao diện mà không phải chờ 120 giây real-time), **sau đó toàn bộ thao tác còn lại được thực hiện bằng tương tác giao diện người dùng thật** (gõ phím, click chuột, bấm nút). Không gọi đây là "ván chơi hoàn chỉnh từ đầu đến cuối":
  1. **Ca Thua vì đầy mực (Ảnh 08, 09, 10):** Đặt trước `ink = 7`, sinh 1 chuột ở $pos = 9.99$. Chuột trôi chạm đáy làm $ink = 8 \to$ kích hoạt `reason: 'ink'`, hiển thị thông báo "Sổ đầy mực rồi!". Bấm nút "Xem kết quả" qua DOM $\to$ màn kết quả hiện ra. Bấm nút "Chơi lại" $\to$ ván chơi reset về `ink = 0, score = 0`.
  2. **Ca Thắng qua 10 lượt trùm (Ảnh 11, 12):** Đặt trước `bossesDone = 9`, trùm 10 ở làn 1 $pos = 7.2$. Người chơi gõ phím `KeyF` để đập trùm $\to$ dialog mở $\to$ click chọn đáp án $\to$ click "Chơi tiếp" $\to$ hoàn thành lượt trùm thứ 10 $\to$ ván kết thúc với `reason: 'complete'`. Bấm "Xem kết quả" $\to$ màn kết quả hiển thị đủ 4 phần điểm tổng kết.

### E. Kiểm tra tự hoàn thành: Chỉ ghi nhận cờ riêng, không phát sinh phần thưởng
- **Bằng chứng từ cookie `sc_guest` thực tế (Ảnh 17):**
  Khi giáo viên/admin hoặc bản dev bấm nút "Tự hoàn thành" trong hộp "?":
  ```json
  {
    "v": 1,
    "lv": {
      "1": [1, 1, 3, 3, 3],
      "2": [1, 1, 3, 1000],
      "3": [1, 1, 3, 1000],
      "4": [1, 1, 3, 3, 3],
      "5": [0, 0, 0, 0]
    },
    "gp": 1,
    "c": 100,
    "ac": 16
  }
  ```
  - **Cờ tự hoàn thành:** Bitmask `ac = 16` ($2^4 = 1 \ll (5-1)$), đánh dấu riêng Màn 5 đã tự hoàn thành.
  - **Thành tích Màn 5 (`lv['5']`):** Hoàn toàn là `[0, 0, 0, 0]` tương ứng `played = 0, completed = 0, stars = 0, bestScore = 0`.
  - **Tài sản không tăng:** `coins` (c) giữ nguyên 100, `goldenPages` (gp) giữ nguyên 1 (không trao Trang Sổ Vàng).

---

## 3. Cân bằng bot và Dung lượng Bundle

### A. Phân bố huy chương của bot mô phỏng (`whackBalance.test.ts`)
Chạy lại mô phỏng 300 ván (seed 1–300) với mốc huy chương `[1650, 2650, 3100]`:
- **Bot giỏi (Good bot):**
  - Vàng: 91.3% (274 ván)
  - Bạc: 8.7% (26 ván)
  - Đồng: 0% | Chưa đạt: 0% | Thua đầy sổ: 0%
  - Gặp 10 lượt trùm ở 100% số ván. Điểm trung bình: 3266.1 (nhỏ nhất 2670, lớn nhất 3490).
- **Bot trung bình (Average bot):**
  - Vàng: 0%
  - Bạc: 28.7% (86 ván)
  - Đồng: 48.0% (144 ván)
  - Chưa đạt: 23.3% (70 ván)
  - Thua đầy sổ: 57.3% (172 ván). Điểm trung bình: 2129.3 (nhỏ nhất 165, lớn nhất 2990).
  - Lượt trùm gặp được trung bình: 8.31 lượt (44.3% ván vượt qua trọn vẹn 10 trùm).

### B. Giới hạn của bộ test cân bằng đối với cơ chế Cooldown 140ms
- **Xác minh kỹ thuật:** Bot mô phỏng `simulateWhack` (`whackBots.ts`) được xây dựng trên **mô hình toán học của logic thuần** (`whackLogic.ts`), sử dụng khoảng cách giữa hai cú đập của bot là `tapGap = 0.15s` (150ms).
- Cơ chế `HIT_COOLDOWN_MS = 140ms` trong `WhackGame.tsx` là cơ chế ở **tầng React UI Component** nhằm lọc rung tay (touch jitter) và chặn key repeat khi người chơi giữ phím trên bàn phím.
- **Giới hạn thừa nhận minh bạch:** Bộ test bot cân bằng chỉ xác nhận tính cân bằng về mặt **luật chơi và phân phối điểm toán học**. Độ khó thao tác cơ học thực tế của người chơi (với phản xạ tay, độ trễ cảm ứng màn hình và cooldown 140ms) **chưa được đo lường trực tiếp qua bot** và cần được kiểm chứng thông qua thử nghiệm thực tế với học sinh THPT.

### C. Đo đạc dung lượng Bundle
- Trên cùng chế độ build tiêu chuẩn monorepo (`pnpm build`):
  - Chunk độc lập của Màn 5 (`Man5-De5H4DIV.js`): **22.17 kB** (gzip **7.74 kB**).
  - Màn 5 không nạp riêng thư viện 3D; toàn bộ giao diện và hoạt cảnh dựng bằng DOM/SVG. (Chunk Three.js ~205 kB của hub là tài nguyên chung phục vụ các màn 3D khác, không thuộc dung lượng riêng của Màn 5).
- **Về hiệu năng khung hình:** Bỏ khẳng định "60 FPS, không rò rỉ bộ nhớ" do chưa thực hiện đo đạc chuyên sâu bằng profiling heap và đo FPS trên thiết bị di động thật.

---

## 4. Kết quả 4 lệnh kiểm tra bắt buộc

| Lệnh | Kết quả | Chi tiết |
|---|:---:|---|
| `pnpm check:text` | **ĐẠT (SẠCH)** | 437 files quét sạch, không có chữ tiếng Việt ngoài `packages/core/src/content/`. |
| `pnpm typecheck` | **ĐẠT (SẠCH)** | Toàn bộ 10 package biên dịch TypeScript thành công 100%. |
| `pnpm test --maxWorkers=2` | **ĐẠT (2282/2282)** | 206 test files pass, 2282 tests pass, 5 skipped. Bộ test `whack2d.test.ts` đạt 15/15 tests chuyên sâu. |
| `pnpm build` | **ĐẠT** | Toàn bộ **5 ứng dụng** trong monorepo (`hub`, `lang-bac`, `lang-det`, `lang-giay`, `lang-khac-dau`) build thành công. |

---

## 5. Danh mục ảnh minh chứng trong `docs/screenshots/p7b/`

1. `01-bat-dau-1366x768.png`, `01-bat-dau-360x800.png`, `01-bat-dau-844x390.png`: Thẻ bắt đầu Màn 5 ở 3 kích thước màn hình.
2. `02-dang-choi-1366x768.png`, `02-dang-choi-360x800.png`, `02-dang-choi-844x390.png`: Giao diện 4 làn dải lụa 2D, vùng đập và bàn Sổ Chung 8 chấm mực.
3. `03-thao-tac-dap-1366x768.png`, `03-thao-tac-dap-360x800.png`, `03-thao-tac-dap-844x390.png`: Thao tác đập chuột trong vùng đập, hiển thị hiệu ứng búa gõ và điểm thưởng.
4. `04-do-dung-khi-mo-help-1366x768.png`, `04-do-dung-khi-mo-help-360x800.png`, `04-do-dung-khi-mo-help-844x390.png`: Đo dừng thời gian khi mở hộp "?" giữa ván, chuột và đồng hồ đứng yên hoàn toàn.
5. `05-chuot-cau-hoi-1366x768.png`, `05-chuot-cau-hoi-360x800.png`, `05-chuot-cau-hoi-844x390.png`: Chuột câu hỏi mang biểu tượng ❓ vàng to lớn, nhãn "Chuột câu hỏi" và hào quang sáng rực.
6. `06-hop-cau-hoi-chong-click-ma-1366x768.png`, `06-hop-cau-hoi-chong-click-ma-360x800.png`, `06-hop-cau-hoi-chong-click-ma-844x390.png`: Hộp câu hỏi mở ra sau cú chạm giữ > 600ms, không bị chọn nhầm đáp án (chống click ma thành công).
7. `07-giai-thich-cau-hoi-1366x768.png`, `07-giai-thich-cau-hoi-360x800.png`, `07-giai-thich-cau-hoi-844x390.png`: Nộp câu hỏi, hiện giải thích, xoá 2 vết mực và kiểm tra giữ Enter > 1s không tự Chơi tiếp.
8. `08-thua-vi-day-muc.png`: Thông báo dừng ván khi sổ nhận đủ 8 vết mực (probe-assisted).
9. `09-man-ket-qua-thua.png`: Màn hình kết quả khi thua ván với nút "Chơi lại".
10. `10-choi-lai-van-moi.png`: Bắt đầu ván mới sau khi bấm "Chơi lại", mực và điểm đã reset về 0.
11. `11-thang-hoan-thanh-10-trum.png`: Thông báo chiến thắng khi giữ được sổ qua đủ 10 lượt của Tí (probe-assisted).
12. `12-man-ket-qua-thang.png`: Màn hình kết quả thắng hiển thị chi tiết 4 phần điểm tổng kết.
13. `13-dev-hop-tro-giup-giua-van.png`: Hộp trợ giúp "?" giữa ván trên bản dev hiển thị nút "Tự hoàn thành".
14. `14-dev-da-tu-hoan-thanh-giua-van.png`: Thao tác tự hoàn thành thành công trên bản dev, ván chơi dừng lại và màn được đánh dấu đã hoàn thành.
15. `15-tra-loi-sai-cau-hoi.png`: Trả lời sai câu hỏi trùm: hiển thị giải thích, thông báo Tí né được và cộng thêm 1 vết mực trên HUD.
16. `16-hop-cau-hoi-het-gio.png`: Hết giờ câu hỏi trùm (timeout): hiển thị Panel cảnh báo "Hết giờ rồi!", nêu đáp án đúng và giải thích, cộng thêm 1 vết mực khi tiếp tục.
17. `17-xac-minh-tu-hoan-thanh-chi-co-co.png`: Xác minh tiến độ trong cookie: chỉ có cờ `ac = 16`, bản ghi Màn 5 là `[0, 0, 0, 0]`, xu và Trang Sổ Vàng không đổi.
