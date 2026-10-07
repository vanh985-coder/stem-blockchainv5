# ĐỒ HỌA 02 — NHÂN VẬT 3D

Cả 10 nhân vật đều là 3D, dùng chung cho mọi nơi: chợ, các làng, game chạy, bài học 2D và các game 2D (nhân vật 3D đặt lên trên nền 2D).

## CHỐT CUỐI (thay cho bảng hoạt ảnh bên dưới nếu khác nhau)

| Nhân vật | Retopo (Quad, 10.000, Smart Mesh) | Auto Rig (Humanoid, Mixamo) | Hoạt ảnh trong Tripo | Code tự làm |
|---|---|---|---|---|
| `hoc-sinh-nam` | ✅ (đã xong: 9.232 mặt) | ✅ | Preset: idle, walk, run, jump, cheer · AI Animation: hang | sad, point, slide, swing |
| `ti` | ✅ | ✅ | Preset: idle, run, jump, cheer | hurt |
| `dan-lang-ba-cu` | ✅ | ✅ | Preset: idle, walk | — |
| `dan-lang-nong-dan` | ✅ | ✅ | Preset: idle, walk | — |
| `bac-an`, `cu-binh`, `co-chi`, `chu-dung`, `thay-linh`, `lai-buon` | ❌ export nguyên bản ra GLB | ❌ | Không | Nhún nhẹ, lắc lư, nghiêng người khi nói |

**Chi phí còn lại (ước tính):**
- Retopo 3 × 40 = 120 credit.
- Gắn xương 4 × 20 = 80 credit.
- Hoạt ảnh hang (AI Animation) khoảng 20 credit.
- 13 hoạt ảnh preset: xem số credit trên nút.

**Code cần biết khi viết spec:**
- 6 nhân vật đứng yên không có xương. Giảm số mặt bằng `gltf-transform simplify` trong `pnpm assets:build`, mục tiêu khoảng 15.000 tam giác.
- Các tư thế code tự làm (sad, point, slide, swing, hurt) dựng bằng cách xoay xương Mixamo.

## Quy trình cho mỗi nhân vật

1. **ChatGPT vẽ ảnh nhân vật** bằng câu lệnh bên dưới. Lưu ảnh vào `assets/source/characters/`.
2. **Tripo:** chọn Image to 3D, đặt giới hạn **10.000–15.000 mặt**, texture thường (không cần HD).
3. **Gắn xương** (Rig, kiểu người), rồi **chỉ chọn đúng các hoạt ảnh trong bảng.** Mỗi hoạt ảnh thêm là tốn thêm credit.
4. **Xuất GLB** kèm hoạt ảnh, đặt đúng tên, lưu vào `assets/models/characters/`. **Tải về ngay** sau khi xong.

**Mẹo tiết kiệm credit:** chỉnh ảnh trong ChatGPT thật ưng rồi mới đưa sang Tripo. Ảnh đứng sai tư thế là phải dựng lại, mất thêm credit.

## Câu lệnh cho ChatGPT

Thay phần [nhân vật]:
```
Vẽ một nhân vật cho game học tập, phong cách phim hoạt hình 3D Việt Nam đơn giản: khối hình tròn trịa, ít chi tiết, màu tươi, bề mặt mịn. Nhân vật: [nhân vật]. Toàn thân từ đầu tới chân, đứng thẳng, nhìn thẳng, hai tay dang nhẹ không chạm người (tư thế chữ A), tay không cầm đồ vật, quần áo gọn người, không có tà áo bay rộng. Nền trắng trơn, ánh sáng đều, không bóng đổ, không chữ.
```

Làm nhân vật học sinh trước. Với các nhân vật sau, đính kèm ảnh học sinh và thêm câu: *"cùng phong cách và tỉ lệ với nhân vật trong ảnh này"*.

## Danh sách, hoạt ảnh và credit

Làm theo thứ tự từ trên xuống. Credit là số ước tính, đã gồm tạo model, gắn xương và hoạt ảnh.

| # | File | Điền vào [nhân vật] | Hoạt ảnh cần chọn | Credit |
|---|---|---|---|---|
| 1 | `hoc-sinh-nam.glb` | nam sinh THPT Việt Nam thời nay, tóc ngắn, áo sơ mi trắng, quần tây xanh đậm, giày thể thao | idle, walk, run, jump, cheer, sad, hang | ~135 |
| 2 | `ti.glb` | cậu thiếu niên gầy, lanh lợi, đầu cạo trọc để một chỏm tóc trên đỉnh, cười ranh mãnh, áo cánh nâu, quần lửng đen, đi chân đất, túi tiền vải đeo bên hông | idle, run, jump, cheer, hurt | ~115 |
| 3 | `bac-an.glb` | người đàn ông trung niên hiền lành, hơi mập, áo nâu, tạp dề vải, khăn vấn đầu (thợ làm giấy) | idle, cheer | ~85 |
| 4 | `cu-binh.glb` | cụ ông râu tóc bạc, áo the đen ngắn ngang gối, khăn xếp, kính tròn (trùm làng) | idle, cheer | ~85 |
| 5 | `co-chi.glb` | cô gái trẻ nhanh nhẹn, áo cánh hồng nhạt, váy đen dài tới bắp chân, khăn vấn tóc (cô bán vải) | idle, cheer | ~85 |
| 6 | `chu-dung.glb` | người đàn ông cao gầy, ít nói, áo cánh màu chàm, tạp dề da, túi đồ nghề bên hông (thợ khắc dấu) | idle, cheer | ~85 |
| 7 | `thay-linh.glb` | thầy đồ trung niên, áo the xanh lam ngắn ngang gối, khăn xếp, kính tròn, túi sổ đeo chéo (thầy tính sổ) | idle, cheer | ~85 |
| 8 | `lai-buon.glb` | lái buôn từ phương xa, to béo, áo dài xanh lục ngắn ngang gối, mũ rộng vành, túi tiền lớn bên hông | idle | ~75 |
| 9 | `dan-lang-ba-cu.glb` | bà cụ đội khăn mỏ quạ, áo nâu | idle, walk | ~85 |
| 10 | `dan-lang-nong-dan.glb` | chú nông dân đội nón lá, áo cánh, quần xắn gối | idle, walk | ~85 |
| | | | **Tổng** | **~920** |

**Hoạt ảnh không có trong bảng** (`point`, `slide`, `swing`, `sad` của người dẫn làng…) thì code tự dùng tư thế thay thế, theo spec 03.

**Nếu cuối cùng còn credit,** thêm cho học sinh `slide` (màn 2), `point` (chọn đáp án) và `swing` (màn 5), khoảng 30 credit.

**Bi không cần tạo:** code tự dựng.

**Gà ở màn 9 vẽ 2D** (file 06). Còn credit thì mới làm 3D.

## Kiểm tra trước khi lưu

- Kéo file GLB vào https://gltf-viewer.donmccurdy.com và bấm thử từng hoạt ảnh.
- Công cụ chỉ xuất được mỗi lần một hoạt ảnh thì đặt tên `ten@hoat-anh.glb` (ví dụ `ti@run.glb`), để cùng thư mục với file chính.
- **Sau 2 nhân vật đầu**, ghi lại số credit đã tiêu và báo cho Claude, để chỉnh lại kế hoạch nếu cần.

## Checklist

- [ ] 10 nhân vật, mỗi nhân vật có ảnh gốc trong `source/characters/` và file GLB trong `models/characters/`
- [ ] Đã thử từng hoạt ảnh trong glTF Viewer
