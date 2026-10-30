# Báo cáo P7a: Bản chơi được của Màn 5 "Đập {phanDien}" bằng giao diện 2D

- **Thời gian thực hiện:** 30/10/2026.
- **Mã nguồn:** nhánh `claude/wonderful-dijkstra-x092dj` (từ HEAD commit `6507461`).
- **Nhiệm vụ:** Hoàn thành P7a — xây dựng bản chơi được của Màn 5 "Đập {phanDien}" bằng giao diện 2D thuần túy theo yêu cầu của chủ dự án.

---

## 1. Yêu cầu và thiết kế triển khai

### A. Lối chơi và Bố cục 2D các làn dọc (Vertical Lanes)
- **Lấy cảm hứng từ lối chơi làn dọc (Talking Tom):** Các đối tượng xuất hiện từ đỉnh và di chuyển xuống phía dưới dọc theo 4 làn. Người chơi quan sát nhịp điệu và thao tác khi đối tượng đi vào vùng đập.
- **Bản sắc Làng Dệt:** 4 làn dọc được tạo hình như 4 dải lụa truyền thống treo trên khung cửi gỗ (Lụa mộc, Lụa lam, Lụa ngọc, Lụa đào), hoa văn dệt chìm tinh xảo.
- **Vùng đập (Hit Zone):** Nằm ở đoạn 65% tới 90% chiều cao các làn (`pos` từ 6.5 đến 9.0). Viền vệt sáng nổi bật, khi có chuột rơi vào vùng đập vệt sáng lóe lên báo hiệu.
- **Nút đập chân làn:** 4 nút lớn hình thoi dệt/quạt nan ở đáy mỗi làn, hiển thị rõ phím tắt `D`, `F`, `J`, `K` (chuẩn touch target cao ≥ 48px trên điện thoại).
- **Cuốn Sổ Chung ở đáy:** Bàn gỗ đặt cuốn Sổ Chung với 8 chấm tròn vết mực (`WHACK_SPEC.inkMax = 8`). Chuột không bị đập lọt xuống cuối làn sẽ loang vết mực (+1 vết mực, âm thanh wrong).

### B. Hai loại chuột rõ ràng
1. **Chuột thường:** Kế thừa logic sẵn có gồm 4 biến thể:
   - *Chuột thường:* Chuột gấp giấy origami màu vàng đất dân gian, 1 hit, +10 điểm.
   - *Chuột đổi làn:* Chuột giấy màu tím mang biểu tượng mũi tên chuyển làn ⇄, 1 hit, +15 điểm.
   - *Chuột nhanh:* Chuột giấy xanh mang tia chớp ⚡, tốc độ gấp 1.4 lần, 1 hit, +15 điểm.
   - *Chuột to:* Chuột giấy to hơn 1.35 lần, có 2 vạch máu, đập hit 1 khựng lại 0.3s chớp sáng, đập hit 2 hạ gục, +30 điểm.
2. **Chuột câu hỏi:**
   - Xuất hiện 10 lần theo lịch trùm ở các giây 12, 24, 36, 48, 60, 72, 84, 96, 108, 120.
   - **Tạo hình tiếp cận accessibility:** Chuột đặc biệt mang biểu tượng **DẤU HỎI VÀNG LỚN ❓**, hào quang sáng rực, nhãn "Chuột câu hỏi" nổi bật (phân biệt bằng cả hình dạng, biểu tượng và chữ viết, không chỉ bằng màu sắc).
   - Khi người chơi chạm/bấm trúng chuột câu hỏi hoặc khi chuột chạy tới giữa vùng đập (pos 7.75): lập tức mở bảng câu hỏi trùm `QuizCard`.

### C. Cơ chế tạm dừng và Chống click ma
- **Tạm dừng toàn diện:** Khi mở câu hỏi hoặc mở hộp "?" giữa ván, vòng lặp dừng gọi `stepWhack`, mọi chuột trên các làn, đồng tiền và các đồng hồ đếm ngược đứng yên bất động 100%.
- **Chống click ma:** Cú chạm kích hoạt chuột câu hỏi hoặc mở modal chặn lan truyền sự kiện `e.stopPropagation()`. Dialog câu hỏi áp dụng cơ chế nhận diện `pointerDownInside` (chỉ chấp nhận lựa chọn đáp án khi cử chỉ chạm bắt đầu từ bên trong container câu hỏi sau khi dialog mount).
- **Chống kích hoạt lặp:** Mỗi đối tượng chuột chỉ tính 1 lần duy nhất dù người chơi bấm nhanh hay chạm giữ.

### D. Tự hoàn thành và Quyền truy cập
- Giữ nguyên nút "Tự hoàn thành" tại thẻ bắt đầu và trong hộp "?" giữa ván (`MiniGameLevel`).
- Quyền sử dụng nghiêm ngặt: Chỉ bản dev và tài khoản giáo viên/admin mới thấy và dùng được; học sinh và khách trên bản release hoàn toàn không thấy nút này.
- Khi tự hoàn thành: Dừng toàn bộ ván chơi, không cộng điểm, sao, xu hay Trang Sổ Vàng.

---

## 2. Kết quả 4 lệnh kiểm tra bắt buộc

| Lệnh kiểm tra | Kết quả | Chi tiết |
|---|---|---|
| `pnpm check:text` | **ĐẠT (SẠCH)** | 437 file đã quét. Toàn bộ chữ giao diện nằm trong `packages/core/src/content/games.ts` (`whackUi`). |
| `pnpm typecheck` | **ĐẠT (SẠCH)** | Toàn bộ 10 package trong monorepo pass sạch không có lỗi type. |
| `pnpm test --maxWorkers=2` | **ĐẠT (2275/2275)** | 206 test files passed, 2275 tests passed, 5 skipped. Bổ sung test mới `whack2d.test.ts` (8 tests). |
| `pnpm build` | **ĐẠT** | Toàn bộ các app build thành công. Chunk `Man5` giảm từ 91 kB (Three.js) xuống **20.75 kB** (gzip 7.34 kB). |

---

## 3. Kết quả kiểm tra DOM bằng Puppeteer

Kiểm tra bằng script tự động `scripts/p7a-check.mjs` (bản build preview với cookie khách thật) và `scripts/p7a-dev-check.mjs` (bản dev với nút tự hoàn thành):

| Kích thước | Màn bắt đầu | 4 Làn 2D & Vùng đập | Chuột thường & Nút đập | Chuột câu hỏi ❓ | Hộp QuizCard & Giải thích | Hộp "?" giữa ván | Tự hoàn thành |
|---|---|---|---|---|---|---|---|
| **1366×768 (Desktop)** | Đạt (ảnh 01) | Đạt, 4 làn rõ ràng (ảnh 02) | Đạt, phím D, F, J, K (ảnh 03) | Đạt, icon ❓ nổi bật (ảnh 04) | Đạt, đồng hồ dừng (ảnh 05, 06) | Đạt, game dừng (ảnh 07) | Ẩn với khách (ảnh 08); Đạt trên dev (ảnh 09, 10, 11) |
| **360×800 (Mobile dọc)** | Đạt (ảnh 01) | Đạt, vừa vặn ngón cái (ảnh 02) | Đạt, nút đập cao 56px (ảnh 03) | Đạt, chạm mở câu hỏi (ảnh 04) | Đạt, bảng chữ to rõ (ảnh 05, 06) | Đạt, game dừng (ảnh 07) | Ẩn với khách (ảnh 08) |
| **844×390 (Mobile ngang)** | Đạt (ảnh 01) | Đạt, 4 làn ở giữa (ảnh 02) | Đạt, HUD 2 bên sườn (ảnh 03) | Đạt, icon ❓ nổi bật (ảnh 04) | Đạt, không che sổ (ảnh 05, 06) | Đạt, game dừng (ảnh 07) | Ẩn với khách (ảnh 08) |

### Danh mục ảnh minh chứng lưu tại `docs/screenshots/p7a/`:
- `01-bat-dau-1366x768.png`, `01-bat-dau-360x800.png`, `01-bat-dau-844x390.png`: Thẻ bắt đầu Màn 5.
- `02-dang-choi-1366x768.png`, `02-dang-choi-360x800.png`, `02-dang-choi-844x390.png`: Giao diện 4 làn dọc 2D, vùng đập và bàn Sổ Chung 8 chấm mực.
- `03-thao-tac-dap-1366x768.png`, `03-thao-tac-dap-360x800.png`, `03-thao-tac-dap-844x390.png`: Thao tác đập chuột thường bằng phím D F J K và chạm nút chân làn.
- `04-chuot-cau-hoi-1366x768.png`, `04-chuot-cau-hoi-360x800.png`, `04-chuot-cau-hoi-844x390.png`: Chuột câu hỏi xuất hiện với icon ❓ vàng to lớn, nhãn "Chuột câu hỏi" và hào quang sáng rực.
- `05-hop-cau-hoi-1366x768.png`, `05-hop-cau-hoi-360x800.png`, `05-hop-cau-hoi-844x390.png`: Hộp câu hỏi mở ra, đồng hồ và mọi chuyển động của game đứng yên.
- `06-giai-thich-cau-hoi-1366x768.png`, `06-giai-thich-cau-hoi-360x800.png`, `06-giai-thich-cau-hoi-844x390.png`: Trả lời câu hỏi, xem giải thích và điểm thưởng, nút "Chơi tiếp" để tiếp tục ván.
- `07-hop-tro-giup-giua-van-1366x768.png`, `07-hop-tro-giup-giua-van-360x800.png`, `07-hop-tro-giup-giua-van-844x390.png`: Mở hộp "?" giữa ván, game dừng hoàn toàn.
- `08-da-tu-hoan-thanh-1366x768.png`, `08-da-tu-hoan-thanh-360x800.png`, `08-da-tu-hoan-thanh-844x390.png`: Minh chứng khách trên bản release không có nút tự hoàn thành.
- `09-dev-the-bat-dau.png`, `10-dev-hop-tro-giup.png`, `11-dev-da-tu-hoan-thanh.png`: Nút Tự hoàn thành hoạt động chuẩn xác trên bản dev ở thẻ bắt đầu và trong hộp "?".

---

## 4. Những điểm cần lưu ý và việc tiếp theo (P7b)
- **Đã hoàn thành trong P7a:** Bản chơi được 2D hoàn chỉnh của Màn 5, kết nối trơn tru với logic thuần `whackLogic.ts`, các cơ chế đập chuột, chuột câu hỏi, tính điểm, phạt mực, tạm dừng và tự hoàn thành đều được kiểm nghiệm thực tế trên trình duyệt.
- **Dành cho P7b (theo kế hoạch):** Trau chuốt thêm các hiệu ứng đồ họa chi tiết (sprite chuột giấy vẽ tay nếu có thêm tài nguyên mỹ thuật từ họa sĩ), tinh chỉnh cân bằng nhịp sinh chuột nếu chủ dự án yêu cầu điều chỉnh sau khi trải nghiệm thử.
