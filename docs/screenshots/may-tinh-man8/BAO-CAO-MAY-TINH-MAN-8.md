# Báo cáo: Phóng to máy tính mod Màn 8 — Lật thẻ tìm cặp khóa (Làng Khắc Dấu)

**Ngày thực hiện:** 30/10/2026  
**Môi trường kiểm thử:** Bản build phục vụ local (`apps/hub/dist-probe-man8`, `VITE_PROBE=true`, `VITE_MERGED=true`, `VITE_ASSETS_URL=http://localhost:5180`), Chrome headless, khách thật (`sc_guest`).  
**Script kiểm thử DOM:** `scripts/p-man8-calc-check.mjs`.

---

## 1. Mục tiêu & Yêu cầu đã thực hiện

1. **Máy tính hiện sẵn trên màn hình:** Khung, nhãn, công thức, kết quả và ô nhập lớn, rõ ràng, dễ đọc.
2. **Tìm nguyên nhân kích thước hiển thị nhỏ:**
   - **Cơ chế scale khung 16:9 của Scene25D:** Khi màn hình có tỉ lệ rộng hơn 16:9 (ví dụ di động ngang 844×390, tỉ lệ 2.164), khung game 16:9 bị giới hạn theo chiều cao 390px, khiến chiều rộng khung co lại còn 693.3px.
   - **Container width quá nhỏ:** Trước đây gán `width: '19.5%'` trong khung 16:9, khiến trên màn hình 844×390 chiều rộng máy tính chỉ còn **135.2 CSS px**, nén toàn bộ viền, padding và nội dung vào một khoảng quá hẹp.
   - **Font-size container bị sập mức sàn:** Ở landscape dùng `clamp(14px, 1.5cqw, 18px)`, trên 844×390 $1.5\text{cqw} = 10.4\text{px}$, rơi xuống sàn **14px**; ở portrait bị gán cứng `fontSize: '14px'`.
   - **Class `text-sm` đè font size:** Trong `ModCalculator.tsx`, nhãn `<label>` và thông báo lỗi dùng class `text-sm` (14px), khoá cứng cỡ chữ ở mức 14px bất kể container font-size.
3. **Đạt chuẩn kích thước thực tế sau scale:**
   - Chữ nội dung (nhãn, tiêu đề, kết quả, thông báo lỗi): **$\ge 16\text{ CSS px}$** ở mọi kích thước màn hình.
   - Chiều cao ô nhập thực tế: **$\ge 44\text{ CSS px}$** (`h-11 min-h-11`), font size số nhập **20 CSS px** (`text-xl font-extrabold`).
4. **Bố trí tận dụng khoảng trống:**
   - **Landscape (1366×768 & 844×390):** Đặt ở cột trái bên dưới HUD/dòng thông báo (`left: 0.8%`, `bottom: 2%`), tăng chiều rộng lên `width: 21.5%`. Mép phải máy tính ở mức 22.3%, hoàn toàn không chạm vào mép trái ngoài cùng của thẻ bàn chơi (22.99% ở Vòng 1 & 2; 24.22% ở Vòng 3). Khoảng cách từ đỉnh máy tính đến đáy dòng kết quả HUD $> 118\text{px}$.
   - **Portrait (360×800):** Tận dụng khoảng trống lớn bên dưới bàn thẻ (bàn thẻ kết thúc ở `top: 72%`, chừa lại 180px chiều cao phía dưới). Máy tính đặt ở `left: 2%`, `bottom: 1.5%`, `width: 74%`, cách đáy bàn thẻ $> 30\text{px}$ và cách {phanDien} ló ra ở góc dưới phải $> 21\text{px}$.
   - Không gây cuộn ngang toàn trang (`hasHScroll: false`).
5. **Kiểm tra đủ cả 3 vòng:** Vòng 1 (8 thẻ), Vòng 2 (12 thẻ), Vòng 3 (16 thẻ). Máy tính không che bất kỳ thẻ nào trong cả 3 vòng.
6. **Bảo toàn toàn bộ logic và tính năng:**
   - Công thức toán và miền giá trị $x \in [1, 22]$ giữ nguyên qua `parseModInput`.
   - Kết quả tính chuẩn xác: $x = 3 \to 5^3 \bmod 23 = 10$.
   - Khi focus vào ô nhập máy tính, đồng hồ tráo thẻ Vòng 3 (`swapTimerMs`) tạm dừng chính xác.
   - Gõ bàn phím và phím số không làm kích hoạt lật thẻ game ngoài ý muốn.
   - Nút gợi ý "?" ở góc trên phải đối diện, mở/đóng hộp gợi ý giữ nguyên giá trị đã nhập của máy tính.

---

## 2. Bảng so sánh số đo Trước / Sau

| Thông số / Kích thước | Trước khi sửa | Sau khi sửa (Số đo thực tế) | Đạt chuẩn |
|---|---|---|---|
| **Cỡ chữ nhãn (`<label>`)** | 14 CSS px (`text-sm`) | **16 CSS px** (`text-base font-bold`) | ✅ $\ge 16\text{px}$ |
| **Cỡ chữ tiêu đề ("Máy tính mod")** | 14 CSS px | **16–18 CSS px** (`text-base sm:text-lg`) | ✅ $\ge 16\text{px}$ |
| **Cỡ chữ kết quả ($5^x \bmod 23 = y$)** | 14–16 CSS px | **16 CSS px** (`text-base font-extrabold`) | ✅ $\ge 16\text{px}$ |
| **Cỡ chữ thông báo lỗi** | 14 CSS px (`text-sm`) | **16 CSS px** (`text-base font-bold`) | ✅ $\ge 16\text{px}$ |
| **Cỡ chữ ô nhập (`<input>`)** | 18–20 CSS px | **20 CSS px** (`text-xl font-extrabold`) | ✅ Dễ đọc |
| **Chiều cao ô nhập (1366×768)** | 36–40 CSS px | **44.0 CSS px** (`h-11 min-h-11`) | ✅ $\ge 44\text{px}$ |
| **Chiều cao ô nhập (360×800)** | 36–40 CSS px | **44.0 CSS px** (`h-11 min-h-11`) | ✅ $\ge 44\text{px}$ |
| **Chiều cao ô nhập (844×390)** | 36–40 CSS px | **44.0 CSS px** (`h-11 min-h-11`) | ✅ $\ge 44\text{px}$ |
| **Chiều rộng máy tính (1366×768)** | 266.0 CSS px (19.5%) | **293.5 CSS px** (21.5%) | ✅ Rộng rãi |
| **Chiều rộng máy tính (360×800)** | 252.0 CSS px (70%) | **266.4 CSS px** (74%) | ✅ Thoáng |
| **Chiều rộng máy tính (844×390)** | 135.2 CSS px (19.5%) | **149.1 CSS px** (21.5%) | ✅ Tối ưu |

---

## 3. Chi tiết kết quả kiểm thử DOM (`scripts/p-man8-calc-check.mjs`)

Tổng số kiểm tra: **66/66 ĐẠT (100%)** trên 3 kích thước đại diện:

### A. Desktop 1366×768 (Chuột + Bàn phím) — 22/22 Đạt
- Máy tính hiện sẵn ở góc dưới bên trái, kích thước $293.5 \times 164.0\text{ px}$.
- Nhãn 16px, tiêu đề 18px, kết quả 16px, ô nhập cao 44.0px, số nhập 20px.
- Không che thẻ Vòng 1, Vòng 2, Vòng 3 (16 thẻ); không che HUD; không che dòng kết quả; không che nút "?".
- Thao tác gõ $x = 3 \to$ hiển thị $5^3 \bmod 23 = 10$.
- Thao tác gõ 99 $\to$ hiển thị lỗi "Em nhập một số nguyên từ 1 đến 22 nhé." cỡ chữ 16px.
- Mở hộp gợi ý "?" rồi bấm "Chơi tiếp" $\to$ máy tính giữ nguyên giá trị $x = 3$.
- Focus vào ô nhập ở Vòng 3 $\to$ đồng hồ tráo `swapTimerMs` tạm dừng ở 1749.9ms.

### B. Mobile dọc 360×800 (Chạm giả lập) — 22/22 Đạt
- Máy tính bố trí ở dải dưới bàn thẻ, kích thước $266.4 \times 156.0\text{ px}$.
- Nhãn 16px, tiêu đề 16px, kết quả 16px, ô nhập cao 44.0px.
- Không che thẻ Vòng 1, Vòng 2, Vòng 3 (16 thẻ); không che HUD; không che {phanDien} góc dưới phải.
- Không gây cuộn ngang (`hasHScroll: false`).
- Thao tác nhập, sửa, xóa, báo lỗi hợp lệ.
- Focus vào ô nhập ở Vòng 3 $\to$ đồng hồ tráo tạm dừng ở 950ms.

### C. Mobile ngang 844×390 (Chạm giả lập) — 22/22 Đạt
- Máy tính bố trí ở cột trái khung 16:9, kích thước $149.1 \times 212.0\text{ px}$.
- Nhãn 16px, tiêu đề 18px, kết quả 16px, ô nhập cao 44.0px, chiều rộng ô nhập 123.1px.
- Không che thẻ ở cả 3 vòng (kể cả vòng 3 16 thẻ), khoảng cách tới mép thẻ vòng 3 là $13.3\text{ px}$.
- Không che dòng thông báo kết quả (khoảng cách $> 118\text{ px}$).
- Thao tác nhập, sửa, xóa, báo lỗi hợp lệ.
- Focus vào ô nhập ở Vòng 3 $\to$ đồng hồ tráo tạm dừng ở 983.3ms.

---

## 4. Danh sách ảnh minh chứng (`docs/screenshots/may-tinh-man8/`)

Tất cả các ảnh đều được nén JPEG chất lượng 75%, dung lượng $< 300\text{ KB}$:

1. `man8-1366x768-vong1.jpg` (125 KB): Máy tính to rõ tại Vòng 1 màn hình 1366×768.
2. `man8-1366x768-vong2.jpg` (198 KB): Máy tính tại Vòng 2 (12 thẻ) màn hình 1366×768.
3. `man8-1366x768-vong3.jpg` (216 KB): Máy tính tại Vòng 3 (16 thẻ) màn hình 1366×768.
4. `man8-360x800-vong1.jpg` (35 KB): Máy tính tại dải dưới Vòng 1 màn hình dọc 360×800.
5. `man8-360x800-vong2.jpg` (51 KB): Máy tính tại dải dưới Vòng 2 (12 thẻ) màn hình 360×800.
6. `man8-360x800-vong3.jpg` (58 KB): Máy tính tại dải dưới Vòng 3 (16 thẻ) màn hình 360×800.
7. `man8-844x390-vong1.jpg` (52 KB): Máy tính tại cột trái Vòng 1 màn hình ngang 844×390.
8. `man8-844x390-vong2.jpg` (59 KB): Máy tính tại cột trái Vòng 2 (12 thẻ) màn hình 844×390.
9. `man8-844x390-vong3.jpg` (65 KB): Máy tính tại cột trái Vòng 3 (16 thẻ) màn hình 844×390.
10. `so-do-man8.json`: File dữ liệu số đo chi tiết từ Puppeteer.

---

## 5. Giới hạn chưa xác minh

- **Bàn phím ảo trên thiết bị di động thật:** Kiểm thử thực hiện bằng Chrome headless với chạm giả lập (`hasTouch: true`, `isMobile: true`); hành vi bật/tắt bàn phím ảo hệ điều hành (Android/iOS) cần kiểm tra trên thiết bị vật lý.
- **Safari / iOS WebKit:** Môi trường kiểm thử là Chromium trên Windows, chưa kiểm tra trực tiếp trên engine WebKit/Safari.
