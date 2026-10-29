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
- (Đã sửa ở phần hoàn thiện bên dưới) Ở Làng Bạc vòng tích từng che một phần số trên cây đa.
- Lần đo "vào/ra làng" bản trước tăng 1 geometry ở lần 9 (104 → 105), có từ trước P5; bản sau đứng yên.

---

# Hoàn thiện sau commit 28caf75 (29/10/2026)

Ảnh `hoanthien-*` và `dev-tu-hoan-thanh-*` là bản cuối. Ảnh `sau-*` và `truoc-*` ở trên là bản trước hoàn thiện (vật nổi cao 2,85, lớn 1,7 lần): chúng ghi đúng trạng thái lúc đó, không còn là hình dáng cuối của vật nổi (các làng Giấy, Dệt, Khắc Dấu ở 1366×768 chưa chụp lại).

## 1. Cột/vòng tích che số trên cây đa (Làng Bạc) — ĐẠT
- Sửa: vật nổi nhỏ lại (1,7 → 1,05 lần) và hạ xuống ngay trên tấm biển (cao 2,85 → 2,45); tọa độ biển, vật cản và vùng tương tác không đổi. Cột sáng, vầng sáng, vật liệu và hình học không đổi nên không đo lại tài nguyên.
- Số gốc cây đa ("4878") đọc rõ ở trạng thái **hoàn thành** (`hoanthien-hoan-thanh-lang-bac-1366x768.jpg`) và **mở + xong + khóa** cùng một cảnh (`hoanthien-bac-mo-lang-bac-1366x768.jpg`), mức Thấp; cả hai cũng ở **giảm chuyển động** (`hoanthien-giam-*`) và ở 360×800, 844×390. Tên màn trên biển đọc được. Ở ảnh hoàn thành 1366×768 chữ trên biển trái bị dòng nhiệm vụ của HUD che (HUD có từ trước P5, không do cột sáng).
- Test mới (`boardPillar.test.ts`): vật nổi (kể cả lúc nhấp nhô) nằm trên đỉnh tấm biển 1,875 và rộng/cao không quá 1,2.

## 2. Kiểm bổ sung
- **Chụp Làng Khắc Dấu và Làng Bạc ở 360×800 và 844×390 — ĐẠT:** hai kịch bản (hoàn thành, và Làng Bạc "mở + xong + khóa"), 28 kiểm đạt (đủ 3 cột, đúng dáng theo trạng thái, không lỗi trang).
- **Tự hoàn thành trên bản dev — ĐẠT** (`scripts/p5-dev-auto.mjs`, `ket-qua-dev-tu-hoan-thanh.json`): khách mới (0 màn xong thật, 0 thẻ) có cờ tự hoàn thành cả 12 màn: ở cả 4 làng 3 cột đều hiện dáng "xong"; Trang Sổ Vàng vẫn 0 (HUD "Chưa nhận" ×4), xu 0, không cảnh trao trang; cookie chỉ có 12 hàng rỗng mang cờ (không điểm, không sao, chưa chơi, chưa xong). Không lỗi trang.
- **Phím E trên máy tính — ĐẠT một phần** (`scripts/p5-e-key.mjs`, `ket-qua-phim-e.json`): nhấn **phím E thật** của bàn phím (sự kiện tin cậy của Chrome) ở màn mở (màn 2) mở đúng `/lang/lang-giay/man/2`, ở màn khóa (màn 3) hiện hộp báo "Hoàn thành màn 2 … để mở" và không chuyển trang. **Chưa đạt:** lời nhắc "E: …" không hiện trong máy đo vì phiên bị tạm dừng: khóa chuột giả của máy đo không đưa trình duyệt vào trạng thái khóa (136 cú bấm chuột vào cảnh không đổi `pointerLockElement`), nên không đọc được dòng chữ nhắc phím trong DOM. Kiểm bằng chạm (360×800, 14/14 lời nhắc đúng tên) KHÔNG được tính là kiểm bàn phím; kiểm "vật tương tác gần nhất" ở 28caf75 chỉ là phụ. Phần dòng nhắc "E:" trên máy tính cần thử bằng chuột khóa thật.

## 3. Năm test bị bỏ qua
Tên tệp và test (`describe.skipIf`, chạy khi có biến môi trường):
1. `packages/core/src/teacher/dbRows.test.ts` › "class_progress thật sau migration 0003": 2 test ("có cờ của giáo viên 2 ở màn 5…", "CSV có đủ cột…"), cần `P3B_ROWS_JSON` (dữ liệu thật từ Postgres biệt lập, `scripts/db-test-p3b.sh`).
2. cùng tệp › "lỗi thật của máy chủ chưa chạy migration 0003" › "được nhận là thiếu cột": cần `P3B_ERR_FILE`.
3. `packages/core/src/three/cho/footprintGen.test.ts` › "sinh bảng chân tường" › "dựng hình bao cho từng đồ vật": chỉ chạy khi sinh lại footprint (`GEN_FOOTPRINTS=<file.json>`).
4. `scripts/export-loi-thoai.test.mjs` › "xuất lời thoại ra JSON": chỉ chạy khi xuất Excel (`EXPORT_LOI_THOAI=<json>`).
Bốn test đầu có từ trước (4 bỏ qua ở P4b). **Test thứ 5 (số 4) là cái mới tăng**, đến từ commit xuất Excel lời thoại (`cfb31c9`), **không liên quan P5**. P5 không thêm test bỏ qua nào; số test đạt tăng 2211 → 2218 nhờ test P5.
