# P4b — Màn 3 còn hai vòng (đoạn giữ sổ ở cuối vòng 2)

Báo cáo đầy đủ: `docs/specs/05-bai1-lang-giay.md` (mục "P4b") và `docs/specs/TRANG-THAI.md`.

- `scripts/p4b-check.mjs` (bản build `VITE_PROBE`, Chrome headless, GL phần mềm SwiftShader, thao tác thật: chuột kéo thả ở 1366×768; chạm chọn rồi chạm đặt ở 360×800 và 844×390): `--label=sau` **75 kiểm đạt** (3 cỡ: trọn ván hai vòng, tạm dừng, hết giờ, hết tim, chơi lại, xoay ngang); `--label=truoc` chạy CÙNG kịch bản trên bản build của mã cũ (3 vòng) để đo thời lượng: 18 kiểm đạt.
- `ket-qua-sau.json`, `do-sau.json`, `anh-sau.json` và `ket-qua-truoc.json`, `do-truoc.json`, `anh-truoc.json`: kết quả kiểm, số đo (thời gian thật từng đoạn, chuỗi trạng thái ván), danh sách ảnh. Ảnh `sau-*.jpg` (lớn nhất 123.431 byte), `truoc-*.jpg`.
- Thời lượng thật cả ván (cùng kịch bản): 158,7 → 103,3 giây (1366×768, −35%), 116,8 → 70,6 giây (360×800, −40%), 118,7 → 70,8 giây (844×390, −40%); đoạn giữ sổ 127,1 → 70,1; 92,1 → 45,9; 93,2 → 46,4 giây (90 → 45 giây danh nghĩa).
- Khung dọc 360×800: nhắc "Xoay ngang để chơi"; xoay ngang rồi chơi; xoay dọc giữa đoạn giữ sổ thì đồng hồ đứng yên (lỗi cũ: vẫn chạy và vẫn tráo, đã sửa), xoay lại chạy tiếp.
- **FPS GL phần mềm KHÔNG dùng để kết luận hiệu năng thiết bị thật**; điện thoại thật chưa kiểm.
