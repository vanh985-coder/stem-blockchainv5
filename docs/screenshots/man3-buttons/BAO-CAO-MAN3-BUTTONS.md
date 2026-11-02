# Báo cáo kỹ thuật: Tách nút "?" và nút "Soi công thức" Màn 3

**Thời điểm:** 31/10/2026  
**Người thực hiện:** Gemini  
**Môi trường xác minh:** Monorepo local, Production Preview (cổng 5193, `VITE_MERGED=true`), Assets server (cổng 5180).  

---

## 1. Mục tiêu và Yêu cầu

Sửa lỗi nút "?" (`[data-testid="nut-goi-y"]`) đè lên chữ và diện tích bấm của nút "Soi công thức" (`[data-testid="nut-soi"]`) tại Màn 3 (Làng Giấy - `RebuildGame`).

**Các tiêu chí bắt buộc:**
- Hai nút tách biệt rõ ràng, không giao nhau, nhìn rõ nhãn và bấm được thuận tiện.
- Không che đồng hồ, thẻ, khay, rổ hoặc khung hướng dẫn focus (`TutorialSpotlight`).
- Vùng bấm của cả hai nút đạt tối thiểu $44 \times 44$ px.
- Giữ nguyên luật, thời lượng, điểm số, phần thưởng và tiến độ của Màn 3.
- Giữ hoạt động tạm dừng khi mở trợ giúp (`hop-goi-y`) và khi xoay dọc thiết bị.
- Xác minh DOM thực tế trên 3 kích thước: 1366×768 (desktop), 360×800 (mobile portrait), và 844×390 (mobile landscape).

---

## 2. Phân tích nguyên nhân và Giải pháp

### Nguyên nhân
- Nút "?" trong `packages/core/src/ui/MiniGameLevel.tsx` được định vị `fixed right-2 top-2 z-[35] size-11 min-h-11 min-w-11` (cách mép phải viewport 8px, rộng 44px, chiếm $X \in [W - 52, W - 8]$).
- Trong `packages/village-lang-giay/src/rebuild/RebuildGame.tsx`, thanh `HudBar` được định vị với `right: ${100 - AREAS.hud.x1}cqw`. Với `AREAS.hud.x1 = 99`, mép phải `HudBar` chỉ cách mép phải khung 1cqw (~13.6px ở 1366×768). Nút "🔍 Soi công thức" nằm ở mép ngoài cùng bên phải của `HudBar`, dẫn đến việc mép phải của nút bị nút "?" đè lên trực tiếp.

### Giải pháp kỹ thuật
1. **Điều chỉnh vùng layout:**
   - Trong `packages/village-lang-giay/src/rebuild/rebuildLayout.ts`: Cập nhật `AREAS.hud.x1` từ `99` thành `92`.
2. **Cập nhật container `HudBar`:**
   - Trong `packages/village-lang-giay/src/rebuild/RebuildGame.tsx`: Đặt khoảng cách phải an toàn `style={{ right: "max(" + (100 - AREAS.hud.x1) + "cqw, 4.25rem)" }}`.
   - Giá trị `4.25rem` (68px) đảm bảo ngay cả trên khung hẹp, mép phải của nút "Soi công thức" luôn cách mép phải khung tối thiểu 68px, tạo khoảng cách an toàn $\ge 16$ px so với nút "?" ($W - 52$ px).
3. **Đảm bảo chuẩn touch target:**
   - Bổ sung `min-w-11 min-h-11` cho nút "💡 Hướng dẫn" và nút "🔍 Soi công thức" (`[data-testid="nut-soi"]`), đảm bảo chuẩn tối thiểu $44 \times 44$ px trên mọi thiết bị.

---

## 3. Đo lường tọa độ thực tế (Puppeteer E2E)

Script đo kiểm độc lập: `scripts/p8-man3-button-check.mjs` chạy trên Chrome headless thật qua cổng 5193.

| Kích thước màn hình | Tọa độ nút "?" ($X, Y, W, H$) | Tọa độ nút "Soi công thức" ($X, Y, W, H$) | Khoảng cách ngang (Gap) | Đánh giá |
|---|---|---|---|---|
| **1366×768** (Desktop) | $[1314, 8, 44, 44]$ | $[1102.59, 7.67, 153.84, 44]$ | **57.56 px** | Tách rời hoàn toàn, không đè nhau |
| **844×390** (Mobile Ngang) | $[792, 8, 44, 44]$ | $[546.81, 3.89, 153.84, 44]$ | **91.34 px** | Nút "?" nằm dải lề đen, nút Soi nằm trong khung |
| **360×800** (Mobile Dọc) | $[308, 8, 44, 44]$ | *(Ẩn do chế độ xoay dọc)* | N/A | Hiện nhắc xoay ngang, nút ? $\ge 44 \times 44$ px |

### Kiểm tra tương tác:
1. **Nút "Soi công thức" (`nut-soi`):**
   - Click/chạm mở panel `soi-cong-thuc` ở dải giữa, hiển thị rõ ràng kết quả soi công thức.
   - Tuyệt đối không mở nhầm hộp gợi ý `hop-goi-y`.
   - Click/chạm lần 2 đóng panel `soi-cong-thuc`.
2. **Nút "?" (`nut-goi-y`):**
   - Click/chạm mở hộp thoại gợi ý `hop-goi-y`, ván tạm dừng.
   - Bấm nút "Chơi tiếp" đóng hộp thoại, ván tiếp tục bình thường mà không bị nhảy cóc thời gian.
3. **Hướng dẫn focus P8 (`TutorialSpotlight`):**
   - Tại bước 4 (Soi công thức), spotlight khoét sáng chính xác `#tutorial-man3-soi`, hoàn toàn không chạm hay đè lên nút "?".
4. **Xoay màn hình (360×800 $\to$ 800×360):**
   - Khi ở 360×800 dọc: Hiện thông báo "Xoay ngang để chơi", game tạm dừng.
   - Khi xoay sang 800×360 ngang: Thông báo biến mất tức thì, nút "Soi công thức" và toàn bộ ván chơi phục hồi ngay lập tức.

---

## 4. Kết quả kiểm tra chất lượng bắt buộc

1. `pnpm check:text`: **Sạch (438 file đã quét)**.
2. `pnpm typecheck`: **10 packages biên dịch thành công 100%**.
3. `pnpm test --maxWorkers=2`: **2321 / 2321 tests pass (217 files passed, 5 skipped)**.
4. `pnpm build`: **Toàn bộ monorepo build production thành công 100%** (Hub merged và 4 app làng).
5. E2E regression check Màn 2 & 3 (`scripts/p2-p3-tutorial-check.mjs`): **48 / 48 tests ĐẠT (100%)**.
6. E2E button check Màn 3 (`scripts/p8-man3-button-check.mjs`): **16 / 16 assertions ĐẠT (100%)**.

---

## 5. Danh mục ảnh minh chứng (< 300 KB mỗi ảnh)

Toàn bộ ảnh chụp màn hình được nén tối ưu và lưu trữ tại thư mục `docs/screenshots/man3-buttons/`:
- `1366x768-gameplay.png` (253 KB): Hai nút "Soi công thức" và "?" hiển thị tách biệt rõ ràng ở góc trên bên phải.
- `1366x768-soi-open.png` (254 KB): Bấm nút Soi mở panel soi công thức mà không chạm nút "?".
- `1366x768-hint-open.png` (280 KB): Bấm nút "?" mở hộp gợi ý và dừng ván.
- `1366x768-tutorial-soi.png` (201 KB): Spotlight hướng dẫn focus vào nút Soi công thức tách biệt khỏi nút "?".
- `844x390-gameplay.png` (110 KB): Giao diện điện thoại ngang, nút "?" nằm ở lề phải, nút Soi cách xa 91 px.
- `844x390-soi-open.png` (105 KB): Chạm nút Soi mở panel soi trên điện thoại ngang.
- `844x390-hint-open.png` (79 KB): Chạm nút "?" mở hộp gợi ý trên điện thoại ngang.
- `360x800-portrait.png` (27 KB): Khung dọc hiện cảnh báo nhắc xoay ngang và nút "?" $\ge 44 \times 44$ px.
- `800x360-resumed.png` (90 KB): Xoay ngang màn hình, thông báo nhắc biến mất và ván chơi tiếp tục mượt mà.
