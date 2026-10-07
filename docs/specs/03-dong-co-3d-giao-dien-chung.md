# SPEC 03 — ĐỘNG CƠ, NHÂN VẬT & GIAO DIỆN CHUNG (mốc 1: mục 1, 5, 6; mốc 2: phần 3D)

Mọi thứ trong spec này nằm ở `packages/core`. Hub và 4 gói làng đều dùng chung.

## 0. Bốn loại cảnh trong game

| Loại | Dùng cho | Cách dựng |
|---|---|---|
| **A. Cảnh 3D đi lại** | Chợ phiên, cảnh 4 làng, hội làng | R3F, camera bám sau lưng, nhân vật điều khiển được (mục 3) |
| **B. Cảnh 3D chạy** | Chỉ màn 2 (đuổi Tí) | R3F, camera sau lưng, đường chạy 3 làn (spec 05) |
| **C. Cảnh 2.5D** | Màn 3, 5, 6, 8, 9, 11, 12 | Component `Scene25D`: R3F với **camera trực giao** (orthographic); ảnh nền, hình rời 2D đặt trên các mặt phẳng; nhân vật vẫn là model 3D |
| **D. Trang bài học 2D** | Màn 1, 4, 7, 10 | Component `LessonPage2D`: bài học 2D của giai đoạn 1, đặt trên ảnh nền của làng |

**`Scene25D`:**
- Ảnh nền là một mặt phẳng phủ kín khung nhìn, kiểu `cover`.
- Hình rời (sprite) là mặt phẳng có texture PNG trong suốt, sắp lớp theo trục Z.
- Nhân vật 3D đứng trong cùng cảnh, có ánh sáng riêng (hemisphere và directional) nên vẫn có khối.
- Bảng điểm, nút, câu hỏi là HTML phủ lên trên.
- Tỉ lệ khung 16:9, co giãn theo màn hình. Khi điện thoại xoay dọc, hiện lời nhắc "Xoay ngang để chơi" (riêng màn 12 chơi được cả khung dọc).

**`LessonPage2D`:**
- **Nền:** ảnh `scenes/bai-hoc-<làng>`, làm tối 20% và mờ nhẹ.
- **Giữa:** bảng bài học, dùng lại component các trạm của giai đoạn 1, đổi giao diện theo mục 1.
- **Lời người dẫn:** hộp thoại có chân dung (mục 4) hiện ở đầu bài, giữa các trạm và cuối bài.

## 1. Phong cách giao diện

**Tinh thần:** hoạt hình Việt Nam đơn giản, nắng ban ngày.

**Hộp thoại, bảng, thẻ:** nền `ui/textures/giay-do`, viền gỗ nâu, bo góc mềm.

**Bảng màu:**

| Tên | Hex | Dùng cho |
|---|---|---|
| `muc-tim` | #5B3FD6 | Bi, Trang Sổ Vàng, điểm nhấn |
| `xanh-la` | #3FA34D | Đúng, nút chính |
| `do-son` | #D94A38 | Sai |
| `vang` | #F2B33D | Sao, xu |
| `nau-go` | #8A5A3B | Viền, chữ phụ |
| `giay` | #F6EBD3 | Nền bảng |
| `chu` | #3B2A20 | Chữ chính |

**Chữ:** "Baloo 2" cho tiêu đề và con số, "Be Vietnam Pro" cho nội dung. Tự host, subset `vietnamese`.

**Nút:** kiểu "3D", bo 16px, cao tối thiểu 52px. Nhãn là động từ.

**Khả năng tiếp cận:** điều khiển được bằng bàn phím, có viền focus; vùng bấm ≥ 44px; không dùng màu làm tín hiệu duy nhất; có cài đặt "Giảm chuyển động" và "Chữ to".

**Icon:** `ui/icons/` gồm `tien-dong`, `trang-vang`, `tim`, `sao`, `non-la`, `guoc-moc`, `tui-tien`.

## 2. Đồ họa và tải file

**Manifest:**
- Tải theo `manifest.json` tại `VITE_ASSETS_URL` (spec 01, mục 5).
- Hàm `asset(path)` trả URL; `useModel(id)` trả model đã nhân bản (dùng `SkeletonUtils.clone`).
- Thiếu file thì dùng hình thay thế: capsule màu cho nhân vật, khối màu cho đồ vật, ô màu cho ảnh. Chỉ cảnh báo ở chế độ dev.

**Vật lặp nhiều** (nhà, cây, rào): dùng `InstancedMesh` hoặc gộp hình; đổi màu, tỉ lệ, góc xoay để nhìn không bị lặp.

**Ánh sáng ban ngày (cảnh A, B):**
- Trời là khối cầu chuyển màu từ #E8F6FF lên #8FCBFF, có vài đám mây tròn do code dựng.
- `HemisphereLight`: trời #FFFFFF, đất #B5D68A.
- `DirectionalLight`: #FFF4E0.
- Sương nhẹ; tone mapping ACES.

**Mức chất lượng** (Thấp / Vừa / Cao):

| Mức | DPR | Bóng |
|---|---|---|
| Thấp | 1 | Vệt bóng tròn dưới chân |
| Vừa | 1.5 | Bóng mềm 1024 |
| Cao | 2 | Bóng mềm 2048 |

Tự hạ mức nếu FPS dưới 40 trong 3 giây đầu.

**Chữ trên vật 3D:** `CanvasTexture`, vẽ sau `document.fonts.ready`.

## 3. Nhân vật

### 3.1 Danh sách và tên hiển thị

Tên hiển thị **không viết cứng**. Toàn bộ nằm trong `content/characters.ts`; lời thoại và câu hỏi dùng chỗ giữ tên, ví dụ `{phanDien}`.

**Lý do:** sau này có thể đổi tên Tí (ví dụ thành "Cuội"). Khi đó chỉ sửa đúng một dòng.

| id | Tên hiển thị | Model | Loại |
|---|---|---|---|
| `hocSinh` | (tên người chơi) | `hoc-sinh-nam` | Có xương, điều khiển được |
| `phanDien` | Tí | `ti` | Có xương |
| `baCu`, `nongDan` | Bà cụ, chú nông dân | `dan-lang-ba-cu`, `dan-lang-nong-dan` | Có xương, đi lại theo điểm mốc |
| `bacAn`, `cuBinh`, `coChi`, `chuDung`, `thayLinh`, `laiBuon` | Bác An, cụ Bình, cô Chi, chú Dũng, thầy Linh, lái buôn | cùng tên file | **Không có xương**, đứng yên |
| `bi` | Bi | (code dựng) | Mục 3.5 |

### 3.2 Hoạt ảnh có sẵn trong file (đã kiểm tra)

| Model | Các clip |
|---|---|
| `hoc-sinh-nam` | `idle.001`, `walk.001`, `run.001`, `jump_down.001`, `cheer.001`, và clip "hanging from a horizontal bar…" (hang) |
| `ti` | `idle.001`, `run.001`, `jump_down.001`, `cheer.001` |
| `dan-lang-ba-cu`, `dan-lang-nong-dan` | `idle.001`, `walk.001` |

**Tìm clip theo từ khóa**, không phân biệt hoa thường, bỏ qua hậu tố `.001`:

| Tên dùng trong code | Từ khóa tìm |
|---|---|
| `idle` | "idle" |
| `walk` | "walk" |
| `run` | "run" |
| `jump` | "jump" |
| `cheer` | "cheer" |
| `hang` | "hang" |

**Clip dài thì chỉ phát một đoạn.** Cấu hình trong `clipConfig.ts`, chỉnh được ở `/dev/3d`:

| Clip | Phát đoạn | Kiểu |
|---|---|---|
| `jump` (`jump_down`, dài 3,75 giây) | 30%–70% | Một lần |
| `cheer` (dài 12,1 giây) | 2,5 giây đầu | Một lần |
| `idle` | Toàn bộ | Lặp |

**Khóa chuyển động gốc (in-place):** bỏ phần dịch chuyển ngang của xương `mixamorig:Hips`. Vị trí nhân vật do code điều khiển, không do clip.

**Dùng chung clip:** mọi model có xương đều là bộ xương Mixamo 65 xương, cùng tên. Vì vậy clip của model này phát được trên model khác. Ví dụ Tí cần `walk` thì mượn của học sinh.

### 3.3 Tư thế code tự dựng (xoay xương Mixamo)

| Tư thế | Cách làm | Thời lượng |
|---|---|---|
| `sad` | `Head` cúi xuống 20°, `Spine2` gập 10°, hai vai rũ | 1 giây |
| `point` | Xoay `RightArm` và `RightForeArm` hướng về mục tiêu (đáp án đang rê chuột) | Đến khi rời chuột |
| `slide` | Ngả `Spine` về sau 35°, hạ `Hips` xuống 0,5 | 0,6 giây |
| `swing` | `RightArm` quét một vòng cung từ trên cao xuống | 0,25 giây |
| `hurt` (Tí) | Nảy lên 0,3; hai tay vòng ra sau, ôm mông; rung | 0,6 giây |

Mỗi tư thế trộn với clip đang chạy, vào ra mượt trong 0,1 giây.

### 3.4 Nhân vật không có xương (đứng yên)

**Chuyển động do code làm:**

| Tình huống | Chuyển động |
|---|---|
| **Đứng yên** | Nhún như đang thở (scale Y dao động ±2%, chu kỳ 2 giây); lắc nhẹ ±2° quanh trục Z |
| **Khi nói** | Nghiêng đầu (xoay cả model ±4°); quay mặt về phía người chơi |
| **Khi vui** | Bật lên 0,15 hai lần |

Mỗi người lệch pha ngẫu nhiên để không nhún đồng loạt.

### 3.5 Bi (code dựng)

**Hình dáng:**
- Khối hộp bo tròn cạnh, cạnh khoảng 0,5, màu `muc-tim`, hơi phát sáng.
- Hai mắt tròn trắng, chớp mắt mỗi 3–5 giây.
- Một mắt xích nhỏ trên đỉnh đầu.

**Chuyển động:**
- Bay lơ lửng nhấp nhô (biên độ 0,1, chu kỳ 2 giây), luôn theo sau vai người chơi.
- Khi vui thì xoay một vòng.

### 3.6 Chân dung (chụp một lần, lưu thành PNG)

**Mốc 1, khi chưa có động cơ 3D:**
- Cắt phần đầu và vai từ ảnh gốc ChatGPT trong `assets/source/characters/`. Đây chính là ảnh đã dùng để tạo model, nên cùng dáng với nhân vật 3D.
- Lưu vào `assets/ui/portraits/` với **đúng tên file ở dưới**. Như vậy đến mốc 2, thay ảnh không phải sửa code.
- **Bi:** vẽ bằng SVG theo mô tả ở mục 3.5.

**Từ mốc 2:**

- **Trang `/dev/portraits`:**
  - render đầu và vai của 10 nhân vật và Bi từ model 3D (khung lấy 35% phía trên khối bao, góc 3/4, nền trong suốt, 512×512);
  - có nút "Tải tất cả" để tải về các file PNG.
- **Cách làm:** chép các file vào `assets/ui/portraits/`, chạy lại `pnpm assets:build`. Lúc chạy game chỉ đọc ảnh có sẵn, không chụp lại.
- **Tên file:** `hoc-sinh-nam`, `ti`, `bac-an`, `cu-binh`, `co-chi`, `chu-dung`, `thay-linh`, `lai-buon`, `ba-cu`, `nong-dan`, `bi`. 5 người phụ đã có ảnh sẵn.

### 3.7 Điều khiển ở cảnh đi lại (A)

| Thiết bị | Điều khiển |
|---|---|
| Máy tính | WASD/mũi tên để đi; Shift chạy; Space nhảy; E tương tác; Esc menu; kéo chuột xoay camera |
| Điện thoại | Cần điều khiển động ở nửa trái màn hình (đẩy quá 80% là chạy); nút nhảy và nút ✋ ở góc phải |

- **Tốc độ:** đi 4, chạy 7. **Nhảy:** vận tốc đầu 6, trọng lực 18.
- **Camera:** ở sau lưng, cách 7, cao 4.
- **Va chạm** (hàm thuần, có test):

| Tình huống | Kết quả mong đợi |
|---|---|
| Nhân vật ở (0, 0) r 0.4; vật tròn tâm (0.5, 0) r 0.5 | Bị đẩy tới (−0.4, 0) |
| Nhân vật ở (0.8, 0) r 0.4; hộp x ∈ [1, 3], z ∈ [−1, 1] | Bị đẩy tới (0.6, 0) |
| Biên bán kính 60; nhân vật ở (61, 0) | Bị kéo về (59.6, 0) |

- **Tương tác:** vật gần nhất trong bán kính 2,2 hiện lời nhắc "E: …".

## 4. Phản ứng khi chọn đáp án — `ChoiceReaction`

Dùng ở mọi chỗ có lựa chọn: câu hỏi, Đồng ý/Từ chối, lựa chọn trong hội thoại.

- **Máy tính:** rê chuột hoặc focus vào một đáp án thì nhân vật học sinh **quay đầu và người** về phía đáp án đó, kèm tư thế `point`.
- **Điện thoại:** chạm là chọn. Nhân vật `point` 0,3 giây trước khi hiện kết quả.
- **Kết quả:** đúng thì `cheer`, sai thì `sad`.

**Ở trang bài học 2D (D), từ mốc 2:** đặt một khung 3D nhỏ (300×300, nền trong suốt) ở góc dưới trái, có nhân vật học sinh để phản ứng như trên. **Mốc 1 chưa có khung này.** Điện thoại yếu hoặc bật "Giảm chuyển động" thì ẩn khung này.

## 5. Bảng câu hỏi — `QuizCard`

- **Nguồn:** `content/questions.ts`, lấy từ `CAU-HOI-ON-TAP.md`. Chữ "Tí" trong câu hỏi đổi thành `{phanDien}`.
- **`pickQuestions({ bai, soCau, seed })`:** không lặp câu trong một ván, trộn thứ tự đáp án.
- **Sau khi chọn:** hiện "Đúng rồi!" hoặc "Chưa đúng", kèm đáp án đúng và giải thích; gọi `onAnswer(correct)`.
- **Lưu lại:** ghi `quiz_answers` nếu đã đăng nhập (spec 02).

## 6. Khung màn chơi và mở khóa

**`VillageScene`** (cảnh làng 3D):
- Khu nhỏ, bán kính khoảng 20, có cổng làng và người dẫn đứng yên.
- **3 biển gỗ** do code dựng: "Học bài", "Game 1", "Game 2", mỗi biển có icon. Tương tác thì mở màn tương ứng.
- Biển còn khóa thì hiện "Hoàn thành … để mở".

**`MiniGameLevel`** (game phụ):
- Thẻ bắt đầu: luật 2–3 dòng, cách điều khiển, điểm cao nhất, nút "Bắt đầu".
- Màn kết quả: điểm, mốc đồng / bạc / vàng, nút "Chơi lại" và "Về làng".

**Luật chung:**
- Chơi xong một màn (thắng hay thua) là tính **đã chơi**. Không bao giờ chặn đường.
- Game nào chưa làm xong thì biển ghi "Sắp ra mắt" và **không chặn** màn sau.

**Trạng thái từng màn** (`content/levels.ts`):
- Mỗi màn có `status: 'ready' | 'coming-soon'`.
- Màn `coming-soon` hiện biển "Sắp ra mắt", không vào được, và **được tính như đã qua** khi xét mở khóa.

**Mở khóa** (`unlock.ts`, có test):
- Trong làng: bài học (đủ 3 trạm), rồi game 1 (đã chơi), rồi game 2 (đã chơi).
- **Trang Sổ Vàng** của làng được trao khi xong **màn `ready` cuối cùng** của làng đó. Nếu cả 2 game đều `coming-soon` thì trao ngay sau bài học. Sau đó mở làng kế tiếp.
- Trang Sổ Vàng đã trao thì **không bao giờ bị thu lại**, kể cả khi sau này một màn đổi từ `coming-soon` sang `ready`.
- Thứ tự làng: Giấy, Dệt, Khắc Dấu, Bạc. Tài khoản giáo viên mở tất cả.

**Test `unlock.ts`:**

| Tình huống | Kết quả mong đợi |
|---|---|
| Mới bắt đầu | Chỉ màn 1 mở |
| Xong màn 1 | Màn 2 mở |
| Đã chơi màn 2 | Màn 3 mở |
| Đã chơi màn 3 | `golden_pages` = 1, màn 4 mở |
| Tài khoản giáo viên | Mở cả 12 màn |
| Màn 3 là `coming-soon`; đã chơi màn 2 | Nhận Trang Sổ Vàng 1; màn 4 mở |
| Màn 2 và màn 3 đều `coming-soon`; xong màn 1 | Nhận Trang Sổ Vàng 1; màn 4 mở |
| Đã có Trang Sổ Vàng 1, sau đó màn 3 đổi sang `ready` | Vẫn giữ trang; màn 3 mở để chơi |
| Màn 11 là `coming-soon`, màn 12 là `ready`; xong màn 10 | Màn 12 mở |

## 7. Âm thanh

Web Audio tự tạo: đúng, sai, bấm, nhặt, đập, hoàn thành. Có nút tắt.

## 8. Hiệu năng

- **Dung lượng:** trang đầu ≤ 150 KB JS. Lõi 3D chỉ tải khi vào cảnh 3D. Mỗi màn tải riêng.
- **Bộ nhớ:** texture nhân vật đã được thu nhỏ khi build (spec 01). Nếu lúc chạy còn thấy texture lớn hơn 2048, ghi cảnh báo.
- **Tốc độ:** mức Thấp ≥ 30fps trên điện thoại tầm trung.
- **Code:** không tạo object mới trong `useFrame`; rời cảnh thì dispose.

## 9. Trang thử

**`/dev/3d`:**
- Chọn từng model trong manifest để xem.
- Nút phát thử từng clip và từng tư thế code dựng.
- Thanh trượt chỉnh đoạn phát của `jump` và `cheer`, rồi xuất ra `clipConfig.ts`.
- Có thử `ChoiceReaction`, Bi, chân dung tự chụp, và bộ đếm FPS.

**`/dev/self-test`:** chạy mọi test logic trong trình duyệt.

## Checklist nghiệm thu

- [ ] `/dev/3d`:
  - học sinh đi, chạy, nhảy, đu mượt;
  - Tí chạy;
  - 2 dân làng đi lại;
  - 6 người đứng yên nhún nhẹ, lệch pha nhau.
- [ ] `sad`, `point`, `slide`, `swing`, `hurt` trông tự nhiên; không clip nào làm nhân vật trôi khỏi chỗ.
- [ ] `/dev/portraits` xuất được 11 ảnh chân dung rõ mặt.
- [ ] `Scene25D` hiện nền, hình rời và nhân vật 3D đúng lớp, co giãn đúng 16:9.
- [ ] Đổi tên `phanDien` trong `characters.ts` thì đổi ở mọi lời thoại và câu hỏi.
- [ ] Test va chạm và `unlock.ts` ✅. Mức Thấp ≥ 30fps.
