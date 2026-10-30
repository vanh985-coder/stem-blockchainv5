# BÁO CÁO P7c — LÀM LẠI ĐỒ HỌA 2D MÀN 5 BẰNG BỘ 15 ẢNH HOẠT HÌNH

**Thời điểm thực hiện:** 30/10/2026  
**Nhánh làm việc:** `claude/wonderful-dijkstra-x092dj`  
**Mục tiêu:** Thay thế giao diện placeholder của Màn 5 "Đập {phanDien}" bằng đồ họa hoạt hình 2D sống động bám sát ảnh mẫu tham khảo `assets/references/man5-whack-reference.png`, dựng bằng bộ 15 ảnh hoạt hình chuẩn trong `assets/man5-2d/`. Ưu tiên trải nghiệm PC: sân chơi lớn, cân đối, tận dụng tối đa chiều cao trình duyệt, xóa bỏ hoàn toàn hiện tượng game bị co ở nửa trên trang và khoảng trống kem vô dụng bên dưới.

---

## 1. Kiểm tra bộ 15 ảnh và tích hợp quy trình Assets Build

### 1.1 Kết quả kiểm tra 15 file ảnh bằng `sharp`
Đã quét trực tiếp 15 file trong `assets/man5-2d/` trước khi tích hợp:
- **`background-pc.png`**: 1672×941, opaque (kín nền 100%), không có nền caro giả.
- **`lane-blue.png`, `lane-yellow.png`, `lane-red.png`, `lane-green.png`**: 724×2172, hoa văn sao lung linh, màu sắc tươi sáng đúng thứ tự ảnh mẫu.
- **`book.png`**: 1774×887, có kênh alpha thật 4 góc `[0,0,0,0]`, cuốn Sổ Chung mở rộng hai trang.
- **`coin.png`**: 1254×1254, alpha thật, viền đồng xu vàng óng ánh.
- **`hero-idle.png` & `hero-hit.png`**: 1254×1254, alpha thật, cùng kích thước khung và điểm neo chân nhân vật không bị nhảy vị trí khi chuyển sprite vung búa.
- **5 chuột hoạt hình (`mouse-normal`, `mouse-fast`, `mouse-switch`, `mouse-big`, `mouse-question`)**: 1254×1254, alpha thật, tỉ lệ chuẩn, biểu cảm hoạt hình sinh động.
- **`wood-border.png`**: 724×2172, có cột gỗ sồi đinh tán ở giữa ảnh (x từ ~263 đến ~460), hai bên trong suốt. Cột bên phải lật gương `scale-x-[-1]`.

### 1.2 Tối ưu hóa và nén WebP (`scripts/assets-build.mjs`)
- Đã bổ sung phân loại `man5-2d/` vào `scripts/assets-build.mjs` với giới hạn kích thước phù hợp (nền 1920px, làn/cột 724px, sổ 1024px, hero 768px, chuột 512px, xu 384px).
- Nén thành công 15 ảnh sang WebP trong `assets-build/man5-2d/` và ghi nhận vào `manifest.json`.
- **Tổng dung lượng 15 ảnh WebP:** **596.7 kB** (giảm hơn **25 lần** so với 15.2 MB của 15 ảnh PNG gốc).

---

## 2. Tái cấu trúc giao diện và giải quyết triệt để lỗi co chiều cao PC

### 2.1 Khắc phục lỗi khung game co ở nửa trên
- **Nguyên nhân trước đây:** Container cha trong `MiniGameLevel.tsx` không có chiều cao cố định (`height: auto`), trong khi component con dùng `h-full` khiến sân chơi bị co lại theo nội dung (~500px), để lộ khoảng nền kem thừa lớn ở phía dưới.
- **Giải pháp triệt để:** Áp dụng `fixed inset-0 z-20 flex flex-col items-center justify-between overflow-hidden select-none` cho container chính của `WhackGame.tsx` (tương tự như màn 2D Runner và Cánh diều).

### 2.2 Dựng cấu trúc từng lớp độc lập chuẩn xác
1. **Lớp nền:** `background-pc.webp` trải rộng toàn màn hình (`object-cover object-center`), phủ lớp bóng mờ nhẹ 20% tăng tương phản.
2. **Thanh HUD:** Gọn gàng trên đỉnh màn hình, hiển thị Cúp vàng điểm số, Đồng xu, 8 chấm mực và số lượt Trùm bảo vệ.
3. **Hero học sinh nam:** Đứng trên đỉnh 4 làn, chuyển đổi mượt mà giữa `hero-idle` và `hero-hit` khi gõ phím hoặc chạm đập (thời gian vung búa 180ms), neo chân chuẩn xác không giật khung hình.
4. **Sân chơi 4 làn:**
   - Kẹp giữa 2 cột gỗ `wood-border` (`object-cover object-center`, cột phải `scale-x-[-1]`).
   - 4 làn texture theo thứ tự: Xanh lam (`lane-blue`), Vàng (`lane-yellow`), Đỏ (`lane-red`), Xanh lá (`lane-green`).
   - Mở rộng kích thước tối ưu PC: `max-w-[340px] sm:max-w-[460px] md:max-w-[560px] lg:max-w-[640px] xl:max-w-[700px]`.
   - Vùng đập highlight từ 65% đến 90% chiều cao làn, nhấp nháy phát sáng khi có chuột trong vùng đập.
5. **5 Sprite Chuột hoạt hình 2D:**
   - Chuột thường: biểu cảm tinh nghịch, kích thước cân đối.
   - Chuột nhanh: có tia chớp ⚡ và khóa cót.
   - Chuột đổi làn: có nhãn mũi tên xanh ⇄.
   - Chuột to: 2 vạch máu trên đầu, cần 2 cú đập.
   - Chuột câu hỏi: biểu tượng **DẤU HỎI VÀNG LỚN ❓** nhấp nháy cùng nhãn accessibility nổi bật.
6. **Cuốn sổ Sổ Chung và 8 chấm mực:**
   - `book.webp` nằm ngang chân làn.
   - 8 chấm tròn vết mực dàn đều trên 2 trang sách đang mở (`px-10 sm:px-14 md:px-20 lg:px-24`), không còn tràn ra ngoài mép sổ.
7. **4 Nút đập chân làn (D, F, J, K):**
   - Màu sắc ăn khớp với màu từng làn, kích thước nổi bật ≥ 46px (mobile) và 56px (PC), chữ to rõ nét.

---

## 3. Bảng đo lường bố cục và tỉ lệ hiển thị thực tế

Dữ liệu đo trực tiếp bằng Puppeteer trên bản build probe (`dist-probe-p7c`):

| Viewport | Tỉ lệ chiếm chiều cao | Kích thước 4 làn | Thanh cuộn thừa | Chiều cao nút đập | Nạp ảnh 2D | Đánh giá |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **PC 1366×768** | **91.1%** (700px / 768px) | 604px × 420px | **KHÔNG** | 56px | 9/9 hiển thị chuẩn | **ĐẠT XUẤT SẮC** |
| **PC 1536×864** | **92.1%** (796px / 864px) | 604px × 516px | **KHÔNG** | 56px | 9/9 hiển thị chuẩn | **ĐẠT XUẤT SẮC** |
| **PC 1920×1080** | **93.7%** (1012px / 1080px) | 604px × 732px | **KHÔNG** | 56px | 9/9 hiển thị chuẩn | **ĐẠT XUẤT SẮC** |
| **Mobile 360×800** | Vừa vặn dọc | 340px × 460px | **KHÔNG** | **46px** (≥ 44px) | 9/9 hiển thị chuẩn | **ĐẠT XUẤT SẮC** |
| **Mobile 844×390** | Vừa vặn ngang | 460px × 220px | **KHÔNG** | **56px** (≥ 44px) | 9/9 hiển thị chuẩn | **ĐẠT XUẤT SẮC** |

---

## 4. Kiểm tra chuyên sâu lối chơi & Bảo toàn toàn vẹn cơ chế P7b

1. **Thống nhất điều khiển:**
   - Cả phím D/F/J/K và chạm chân làn / chạm chuột đều áp dụng chung quy tắc vùng đập $[6.5, 9.0]$.
   - Cooldown 140ms trên từng làn, chống kích hoạt trùng đúp.
   - Chuột to yêu cầu 2 lần kích hoạt riêng biệt.
2. **Hero vung búa (`hero-hit`):**
   - Đã xác minh chuyển đổi sprite `hero-hit` khi nhấn phím D/F/J/K và trở lại `hero-idle` sau 180ms.
3. **Chuột câu hỏi và Modal câu hỏi:**
   - Chuột câu hỏi mang biểu tượng ❓ vàng lớn nhấp nháy.
   - Khi đập trong vùng đập, mở modal câu hỏi trùm thành công.
   - Thời gian ván đấu đứng yên 100% trong lúc mở modal (`t0 === t1`).
   - Chống click ma ở capture phase (`onClickCapture`), chống Enter lặp.
4. **Chuyển trạng thái kết thúc ván:**
   - **Thua mực (8 mực):** Hiển thị modal "Sổ đầy mực rồi! Mình thử lại nhé.", bấm "Xem kết quả" chuyển sang màn kết quả thua.
   - **Thắng trùm (10 trùm):** Hiển thị modal "Em giữ được sổ qua cả 10 lượt của {phanDien}!", bấm "Xem kết quả" chuyển sang màn kết quả thắng.
   - Nút "Chơi lại", "Chơi tiếp", "Về làng" hoạt động bình thường.
5. **Nút Tự hoàn thành (bản Dev):**
   - Mở hộp "?" giữa ván, bấm "Tự hoàn thành" kết thúc ván tức thì.
   - Cookie `sc_guest` ghi nhận cờ `ac = 16`, bản ghi Màn 5 là `[0,0,0,0]`, xu và điểm không bị cộng gian lận.

---

## 5. Danh mục ảnh minh chứng lưu trữ

Toàn bộ 21 ảnh chụp màn hình kiểm chứng lưu tại `docs/screenshots/p7c/`:
- `01-pc-bat-dau-1366x768.png`, `01-pc-bat-dau-1536x864.png`, `01-pc-bat-dau-1920x1080.png`: Thẻ bắt đầu trên 3 độ phân giải PC.
- `02-pc-san-choi-1366x768.png`, `02-pc-san-choi-1536x864.png`, `02-pc-san-choi-1920x1080.png`: Sân chơi 4 làn lớn, cân đối, lấp đầy > 91% chiều cao màn hình PC, có viền gỗ và cuốn sổ.
- `03-pc-hero-vung-bua-1366x768.png`, `03-pc-hero-vung-bua-1536x864.png`, `03-pc-hero-vung-bua-1920x1080.png`: Hero chuyển đổi sang sprite vung búa khi đập.
- `04-mobile-san-choi-360x800.png`: Sân chơi mobile dọc, nút đập 46px.
- `04-mobile-san-choi-844x390.png`: Sân chơi mobile ngang, nút đập 56px.
- `05-chuot-cau-hoi-xuat-hien.png`: Chuột câu hỏi mang biểu tượng ❓ vàng lớn.
- `06-modal-cau-hoi-mo.png`: Modal câu hỏi trùm mở, thời gian đứng yên.
- `07-tra-loi-dung-cau-hoi.png`: Trả lời câu hỏi hiển thị giải thích.
- `08-ket-thuc-thua-muc.png`: Modal hết ván khi đầy 8 vết mực.
- `09-man-ket-qua-thua.png`: Màn kết quả thua sổ mực.
- `10-ket-thuc-thang-10-trum.png`: Modal hết ván chiến thắng 10 trùm.
- `11-man-ket-qua-thang.png`: Màn kết quả thắng ván.
- `12-dev-hop-tro-giup.png`: Hộp trợ giúp "?" giữa ván trên bản dev.
- `13-dev-da-tu-hoan-thanh.png`: Thông báo đã tự hoàn thành màn 5.
- `ref-preview.png`: Ảnh mẫu tham khảo đối chiếu.

---

## 6. Dung lượng bundle và tối ưu hóa

- **15 Asset WebP:** 596.7 kB.
- **Chunk `Man5` (JavaScript):** **26.49 kB** (gzip: 8.76 kB).
- Hoàn toàn không phụ thuộc Three.js hay thư viện 3D nào, thời gian tải trang nhanh tức thì.
