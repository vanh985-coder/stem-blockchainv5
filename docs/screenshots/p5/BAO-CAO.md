# P5 — cột sáng thay biển chọn màn (29/10/2026)

Mã kiểm: `scripts/p5-check.mjs` (bản BUILD có `VITE_PROBE`, Chrome 1243 headless, GL phần mềm SwiftShader, mức chất lượng Thấp). Ảnh `truoc-*` là bản cũ (biển gỗ), `sau-*` là bản mới, cùng kịch bản, cùng máy, cùng chỗ đứng (cách biển giữa 6, nhìn vào làng).

## Kết quả kiểm bản sau
- **Đủ 12 màn, mỗi làng đủ 3 cột, đúng màn của làng** (1–3, 4–6, 7–9, 10–12): 3 kịch bản tiến độ (khách mới, một phần, hoàn thành thật) × 4 làng ở 1366×768; "một phần" ở 360×800 và 844×390 (Làng Giấy, Làng Dệt).
- **Dáng cột đúng trạng thái** (khách mới: 12 khóa; một phần: Giấy xong/mở/khóa, Dệt mở/khóa/khóa, hai làng còn lại khóa vì chưa đủ thẻ; hoàn thành: 12 xong): đạt. Mỗi biển có đủ cột sáng và vật nổi trong cảnh.
- **Tương tác thật (7 màn, tiến độ một phần):** 1366×768 bằng phím E, 360×800 bằng chạm nút bàn tay: màn mở/xong vào đúng `/lang/<làng>/man/<màn>`; màn khóa báo đúng lý do ("Hoàn thành màn 2/4/10…" hoặc "tìm đủ thẻ Em có biết"). Chạm: lời nhắc ghi đúng tên màn (14/14). Máy tính: vật tương tác gần nhất đúng là biển của màn đó (14/14); lời nhắc "E: …" không đọc được trên máy đo vì phiên bị tạm dừng bởi khóa chuột giả.
- **Giảm chuyển động:** vật nổi và cột sáng đứng yên (đo hai lần cách 1,2 giây), vẫn thấy đủ ba dáng. Chuyển động thường: vật nổi của màn mở quay và nhấp nhô.
- **Vào/ra làng 12 lần (1366×768):** sau: geometries 111 và textures 72 đứng yên từ lần 2, heap +0,04 MB/lần; trước: 104→105 và 72, heap +0,05 MB/lần.
- **Không lỗi trang** trong mọi lượt.

## Số đo (cùng môi trường, GL phần mềm: KHÔNG dùng để kết luận 30 FPS trên điện thoại thật)
| Cỡ | FPS trước → sau | khung p95 (ms) | draw call | tam giác | geometries | textures |
|---|---|---|---|---|---|---|
| 1366×768 | 2,0 → 2,4 | 1533 → 917 | 89 → 101 | 104.850 → 105.626 | 75 → 82 | 41 → 35 |
| 360×800 | 6,2 → 5,9 | 317 → 333 | 50 → 56 | 66.834 → 67.074 | 45 → 49 | 56 → 56 |
| 844×390 | 5,7 → 5,7 | 217 → 200 | 93 → 105 | 105.782 → 106.558 | 78 → 85 | 60 → 60 |

Mỗi ô là một lượt 5 giây ở 2 đến 6 khung/giây; chênh FPS quá nhỏ để kết luận (chỉ một lượt mỗi bên, chưa đo độ nhiễu giữa các lượt). Phần thêm do P5: +7 hình học dùng chung (3 cột, 3 vật nổi, 1 vầng sáng), khoảng +12 draw call và +780 tam giác trong Làng Giấy khi nhìn cả 3 biển; ngân sách tam giác của mục 9 (Thấp ≤ 270.000) còn xa.

## Bundle
JS của hub (bản build có `VITE_PROBE`, cùng cờ): 2.789.647 → 2.792.996 byte (+3.349 byte, +0,12%).

## Điểm chưa xác minh
- Điện thoại và máy tính bảng thật (chạm, FPS 30 ở mức Thấp, Safari/iPhone); chỉ đo bằng GL phần mềm.
- Quyền giáo viên không thử bằng trình duyệt (cần Supabase/tài khoản giáo viên): phần trạng thái màn không đổi; dáng cột lấy từ cùng `levelStates`, hàm thuần `pillarKindOf` có test (mở → mở, xong → xong, khóa/sắp ra mắt → khóa).
- Cờ "tự hoàn thành" chỉ có với giáo viên/bản dev nên không thử trong bản build khách; nó cho trạng thái `done` như xong thật nên hiện dáng "xong".
- 844×390: chỉ thử "một phần" ở 2 làng; làng Khắc Dấu và Làng Bạc ở 360×800 và 844×390 chưa chụp (đã chụp ở 1366×768).
- Ở Làng Bạc, vòng tích của biển giữa có thể che một phần số trên cây đa khi nhìn từ phía cổng (xem `sau-hoan-thanh-lang-bac-1366x768.jpg`); vật nổi nhỏ và cột trong suốt, không chặn đi lại.
- Lần đo "vào/ra làng" bản trước tăng 1 geometry ở lần 9 (104 → 105), có từ trước P5; bản sau đứng yên.
