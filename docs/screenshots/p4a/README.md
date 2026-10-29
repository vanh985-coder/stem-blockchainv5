# P4a — Màn 2 nhanh hơn (+20% tốc độ mọi vòng)

Báo cáo đầy đủ ở `docs/specs/05-bai1-lang-giay.md` (mục "P4a") và `docs/specs/TRANG-THAI.md`.

- `scripts/p4a-check.mjs` (bản build `VITE_PROBE`, Chrome headless, GL phần mềm SwiftShader): `--label=sau` 49 kiểm đạt ở 1366×768, 360×800, 844×390; `--label=truoc` đo tốc độ của bản build mã cũ (10 đầu ván) cùng cách.
- `ket-qua-sau.json`, `do-sau.json`, `anh-sau.json`: kết quả kiểm, số đo (tốc độ thật, FPS), danh sách ảnh. `ket-qua-truoc.json`, `do-truoc.json`: bản cũ.
- Ảnh `sau-*.jpg`: đang chạy, tạm dừng, câu hỏi, khung dọc 360×800 và sau khi xoay ngang.
- **FPS không có nghĩa** (1 đến 6 khung/giây ở cả bản cũ lẫn mới vì GL phần mềm); điện thoại thật chưa kiểm.
