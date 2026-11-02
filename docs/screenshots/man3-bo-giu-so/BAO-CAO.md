# Báo cáo kiểm thử: Màn 3 "Ghép lại cuốn sổ" bỏ đoạn giữ sổ

**Ngày thực hiện:** 02/11/2026  
**Nhánh:** `feat/man3-bo-giu-so`  

---

## 1. Tóm tắt công việc đã thực hiện

1. **Bỏ hoàn toàn đoạn giữ sổ 45 giây ở cuối vòng 2:**
   - Vòng 2 kết thúc ngay khi ghép xong thẻ thứ 7 của chuỗi thật → chuyển thẳng sang màn kết quả (`phase = 'over'`, `over = 'done'`).
   - Xóa bỏ toàn bộ logic, trạng thái, đồng hồ, bảng tráo thẻ của đoạn giữ sổ (`KeepState`, `enterKeep`, `stepKeep`, `swapSchedule`, `keepUnfixed`, `placeInSlot`, `binFromSlot`, `finishKeep`...).
   - Xóa tệp test `packages/village-lang-giay/src/rebuild/rebuildKeep.test.ts`.
   - Giữ nguyên vẹn toàn bộ luật vòng 1 (5 trang), công thức mã trang `(prev * 2 + content) % 100`, cơ chế 3 tim, thưởng +30 điểm khi kéo trang giả vào rổ rác ở vòng 2, nút Soi công thức và nút "?".

2. **Cập nhật điểm tối đa và mốc huy chương:**
   - Điểm tối đa mới: **230 điểm** (cũ: 355 điểm). Vòng 1 tối đa 100 điểm, vòng 2 tối đa 130 điểm (30 điểm rổ trang giả + 100 điểm ghép chuỗi 7 trang).
   - Truyền `maxScore = 230` vào `MiniGameLevel` để điểm kỷ lục cũ > 230 tự động hiển thị nhãn "(Kỷ lục từ phiên bản trước)".
   - Mốc huy chương mới: **Đồng 210 / Bạc 220 / Vàng 230** (cũ: 280 / 300 / 320).

3. **Cân bằng bot (300 ván, seed 1-300):**
   - Loại bỏ hàm mô phỏng `playKeep` trong bot.

| Chỉ số | Trước (P4b - có giữ sổ 45s) | Sau (Bỏ giữ sổ) |
|---|---|---|
| **Điểm tối đa** | 355 | **230** |
| **Mốc huy chương** | 280 / 300 / 320 | **210 / 220 / 230** |
| **Bot giỏi - Điểm TB** | 344.2 (320 - 355) | **230.0 (230 - 230)** |
| **Bot giỏi - Tỉ lệ đạt** | 100% Vàng (0% chết) | **100% Vàng (300/300 ván, 0% chết)** |
| **Bot trung bình - Điểm TB** | 299.1 (0 - 340) | **206.6 (0 - 230; ván sống: 223.8)** |
| **Bot trung bình - Vàng** | 20.3% | **36.0%** (108 ván) |
| **Bot trung bình - Bạc** | 42.7% | **40.7%** (122 ván) |
| **Bot trung bình - Đồng** | 30.7% | **15.7%** (47 ván) |
| **Bot trung bình - Hết tim** | 6.3% | **7.7%** (23 ván ≤ tiêu chuẩn 25%) |

4. **Văn bản và giao diện:**
   - `packages/core/src/content/huongDanGame.ts`: Rút gọn luật Màn 3 còn 3 dòng, bỏ hoàn toàn trang 4 (giữ sổ 45 giây), hướng dẫn chỉ còn 3 trang; xóa các câu nhắc về giữ sổ và tráo trang.
   - `packages/core/src/content/huongDan.ts`: Xóa id hình vẽ `'ro-trang'` khỏi `GUIDE_ART_IDS` (giữ nguyên thứ tự các phần `GUIDE_SECTIONS`).
   - `packages/core/src/ui/GuideArt.tsx`: Xóa hàm vẽ `'ro-trang'`.
   - `packages/core/src/content/games.ts`: Xóa toàn bộ các trường text liên quan đến giữ sổ (`giuSo`, `nhacGiuSo`, `oTrong`...).
   - `docs/specs/05-bai1-lang-giay.md`: Đã bổ sung mục `### Bỏ giữ sổ (02/11/2026)` ghi rõ luật, điểm tối đa, mốc và bảng bot.

---

## 2. Kết quả kiểm thử tự động (Puppeteer trên bản build)

Script: `scripts/man3-bo-giu-so-check.mjs` chạy trên cổng 5673 (`VITE_PROBE=true`).

| STT | Tên ảnh | Cỡ màn hình | Kích thước | Nội dung xác nhận |
|---|---|---|---|---|
| 01 | `01-the-bat-dau-1366x768.jpg` | 1366×768 | 72 KB | Thẻ bắt đầu: sạch chữ cấm giữ sổ/45s/tráo; hiển thị đúng 3 mốc huy chương 210, 220, 230. |
| 02 | `02-huong-dan-trang1-1366x768.jpg` | 1366×768 | 74 KB | Hướng dẫn trang 1: sạch chữ cấm. |
| 03 | `03-huong-dan-trang3-1366x768.jpg` | 1366×768 | 53 KB | Hướng dẫn trang 3: trang cuối (hướng dẫn chỉ gồm 3 trang, không còn trang 4). |
| 04 | `04-vong1-bat-dau-1366x768.jpg` | 1366×768 | 115 KB | Vòng 1 bắt đầu: khay 5 trang, chuỗi bài trống. |
| 05 | `05-banner-vong1-xong-1366x768.jpg` | 1366×768 | 105 KB | Vòng 1 hoàn thành: banner "Vòng 1 xong! Sắp sang vòng 2..." xuất hiện. |
| 06 | `06-hop-goi-y-vong2-1366x768.jpg` | 1366×768 | 95 KB | Hộp "?" khi đang chơi vòng 2: tạm dừng ván, câu nhắc sạch chữ cấm. |
| 07 | `07-ket-qua-1366x768.jpg` | 1366×768 | 52 KB | Màn kết quả: kết thúc ngay khi ghép xong thẻ thứ 7; điểm đạt 230 (Vàng 3 sao), sạch chữ cấm. |
| 08 | `08-bao-mat-khach-1366x768.jpg` | 1366×768 | 72 KB | Bảo mật RBAC: bản build ẩn nút Tự hoàn thành với khách release. |
| 09 | `09-vong1-bat-dau-844x390.jpg` | 844×390 | 38 KB | Cỡ mobile ngang: bố cục cân đối, vòng 1 ghép bằng chạm giả lập. |
| 10 | `10-vong2-bat-dau-844x390.jpg` | 844×390 | 48 KB | Cỡ mobile ngang vòng 2: chạm trang giả bỏ vào rổ rác. |
| 11 | `11-ket-qua-844x390.jpg` | 844×390 | 31 KB | Cỡ mobile ngang kết quả: đạt 230 điểm Vàng 3 sao. |

---

## 3. Kết quả 4 lệnh kiểm tra bắt buộc

1. `pnpm test --maxWorkers=2`: **2264 passed, 5 skipped (220 files)**.
2. `pnpm typecheck`: **10 packages / apps passed**.
3. `pnpm check:text`: **437 files clean**.
4. `pnpm build`: **Toàn bộ 5 apps build thành công** (hub, lang-giay, lang-det, lang-khac-dau, lang-bac).
