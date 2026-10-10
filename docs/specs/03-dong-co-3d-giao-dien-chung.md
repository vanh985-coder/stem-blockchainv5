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

### Hộp thoại kiểu visual novel — `VnDialog` (`packages/core/src/ui/VnDialog.tsx`)

Dùng cho **mọi** hội thoại, truyện và giới thiệu làng trong game.

- **Bố cục:** hộp ở giữa màn hình, rộng tối đa **960px**. Phần trên là ảnh minh họa (16:9) hoặc **chân dung lớn** của người nói (≥ 160px trên máy tính, ≥ 112px trên điện thoại); phần dưới là khung lời có **tên người nói**.
- **Nút:** góc dưới trái hiện tiến trình "x/n"; góc dưới phải là nút xanh **"Tiếp ›"** (lượt cuối đổi thành nút kết thúc do nơi gọi đặt tên, ví dụ "Bắt đầu hành trình"). Góc trên có nút **"‹"** lùi một lượt và nút nhỏ **"Bỏ qua"**.
- **Chữ lời:** ≥ 18px trên máy tính, ≥ 16px trên điện thoại.
- **Bàn phím:** → / Enter / Space là tiếp; ← là lùi; Esc là bỏ qua.
- **Nền phía sau:** ảnh do nơi gọi truyền vào, làm mờ và tối nhẹ, phủ cả màn hình. Không truyền nền thì hộp nằm ngay trong trang (như trong trang bài học, nơi nền là cảnh làng sẵn có).
- **Hiệu ứng:** lượt mới hiện lên nhẹ.
- **Nhân vật "sống":** chân dung **thở nhẹ** khi chờ (scale 1 → 1,02, chu kỳ khoảng 3,6 giây) và **nhún nhẹ** khi đang hiện lời; lời **hiện dần từng chữ** (khoảng 35 ký tự/giây). Bấm "Tiếp" (hoặc Enter, Space, →) khi chưa hiện hết thì hiện hết ngay, bấm lần nữa mới sang lượt. Lượt đã xem rồi thì hiện ngay. Trình đọc màn hình đọc cả câu ngay (chữ hiện dần chỉ để nhìn, `aria-hidden`).
- **Tắt hết** khi bật "Giảm chuyển động" (hoặc `prefers-reduced-motion`): không thở, không nhún, lời hiện ngay.
- **Tâm trạng (`mood`):** mỗi lượt có thể khai báo `mood: 'vui'`. Nếu manifest có `ui/portraits/<id>-cuoi` thì lượt đó dùng ảnh cười, không có thì giữ ảnh thường. Trong bài học, hàm `withMoods` (lesson2d/flow.ts) gắn `'vui'` cho câu chào đầu bài, lời kết bài (khen) và lời trao Trang Sổ Vàng; lời giữa bài giữ nguyên. Giới thiệu làng: lượt chào đầu cũng 'vui'.
- **Lượt có thể có:** lời phụ kèm chân dung nhỏ (ví dụ {phanDien} cười "Hì hì!") và phần nội dung thêm (ví dụ danh sách nhiệm vụ của làng). Tải trước ảnh của lượt kế tiếp; ảnh thiếu thì hiện khung trống, không lỗi.
- **`DialogueBox`** (hội thoại nhân vật trong trang bài học `LessonPage2D`) chỉ là lớp đổi lượt thoại theo nhân vật sang `VnDialog`: chân dung lớn, chữ to; các thời điểm thoại giữ nguyên.

### Trang bài học trên màn hình lớn (`LessonPage2D`, dùng chung 4 bài)

- Từ **1280px** trở lên, cả trang bài học được phóng theo hệ số **1,35** (`.lesson-zoom` trong `theme.css`): bảng bài học rộng tối đa khoảng **1200px** (trước là khoảng 870px), chữ nhãn nhỏ nhất ≥ 16px, chữ nội dung ≥ 18px, số trong ô trang và ô cây ≥ 22px; ô trang, ô cây và thanh trên (ô trạm, nút) to theo.
- Dưới 1280px (kể cả điện thoại < 640px) giữ nguyên như cũ.
- Nút kiểm tra chính của vài trạm (Bài 1 trạm Dễ, Bài 3 trạm Dễ, Bài 4 trạm Khó) **dính ở đáy màn hình** từ 1280px để luôn thấy được.

### Nền trang trí — `NenTrangTri` (`packages/core/src/ui/NenTrangTri.tsx`)

Dùng cho **mọi trang** (bảng gán ở `packages/core/src/content/nenTrangTri.ts`, không viết cứng trong component).

**Bộ icon (theme):** mỗi bộ 8–12 icon SVG tự vẽ, cùng phong cách (viền nâu, màu pastel).

| Bộ | Icon |
|---|---|
| `mo` | cuốn vở tím, ngôi sao, đám mây, trăng, bút lông, tờ giấy, Trang Sổ Vàng, tia sáng |
| `lang` | tờ giấy dó, lá tre, đồng xu, nón lá, hoa |
| `hoi` | đèn lồng, cờ, Trang Sổ Vàng, tia sáng, trống, hoa, đồng xu, sao |
| `giay` | tờ giấy dó, khung phơi, lá tre, bút lông |
| `det` | thoi dệt, cuộn chỉ, mảnh vải |
| `khacdau` | con dấu, khuôn gỗ, mực đỏ, tờ giấy |
| `bac` | đồng bạc, lá cây, cành cây, đồng xu |

**Kiểu bố trí (`variant`):**
- `full`: ảnh mờ và icon rải ở rìa cả màn hình, trôi chậm;
- `sides`: chỉ icon (không ảnh nền), ở **2 khoảng trống hai bên bảng bài học**, tối đa **4 icon mỗi bên**, trôi rất chậm (mỗi vòng ≥ 45 giây); chỉ hiện khi màn hình từ **1296px** (bảng 1200px, mỗi bên còn ≥ 48px); dưới đó không hiện; icon không bao giờ nằm sau bảng;
- `still`: như `full` nhưng icon **đứng yên**, độ mờ thấp, nền giấy phủ dày hơn (trang giáo viên).
- Thêm `sparkle`: vài tia sáng lấp lánh (cảnh trao Trang Sổ Vàng, giới thiệu làng).

**Bảng gán theo trang:**

| Trang | Bộ | Kiểu |
|---|---|---|
| Trang chủ, `/ho-so`, `/dang-nhap`, `/dang-ky`, `/quyen-rieng-tu`, `/ban-do` | `lang` | `full` |
| `/truyen` | theo lượt: 1–2 `mo`, 3–11 `lang`, 12–14 `hoi` | nền ấm theo chủ đề thay lớp phủ tối (`mo`: tím than → tím nhạt; `lang`: giấy dó #F6EBD3 → be ấm; `hoi`: cam nhạt → vàng), ảnh truyện làm mờ chỉ phủ khoảng 35%, icon của bộ; đổi chủ đề thì màu và icon chuyển dần khoảng 0,6 giây (tắt khi bật "Giảm chuyển động") |
| Trang bài học màn 1, 4, 7, 10 | bộ của làng đó: `giay`, `det`, `khacdau`, `bac` | `sides` |
| Cảnh trao Trang Sổ Vàng (cuối bài) | bộ của làng đó | `full` kèm `sparkle` |
| Giới thiệu làng (`/ban-do`) | bộ của làng đó | `full` kèm `sparkle` (chỉ icon, trên ảnh nền mờ của làng) |
| Trang giáo viên | `lang` | `still` |

**Chung cho mọi trang:**
- `aria-hidden`, không nhận bấm, nằm dưới mọi bảng; bảng nội dung vẫn đặc nên tương phản chữ không đổi.
- Chỉ dùng CSS (`transform`, `opacity`), không thêm thư viện.
- **Tắt** (không hiện icon) khi bật "Giảm chuyển động" hoặc `prefers-reduced-motion`; riêng `still` không có chuyển động nên vẫn hiện, rất mờ.
- Màn hình dưới 640px: tối đa **5** hình (khi có tia sáng: 3 icon và 2 tia).
- Icon SVG gom trong **một chunk dùng chung**, tải sau khi trang đã hiện (lỗi tải thì bỏ trống, không ảnh hưởng trang). Trang đầu của hub và của 4 làng tăng không quá 3 KB gzip.
- Xem thử ở `/dev/nen?theme=det&variant=sides&sparkle=1&board=1` (chỉ khi chạy dev).

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

**Hội thoại ở trang bài học 2D** dùng `VnDialog` (mục 1): chân dung lớn của người nói, không còn khung 3D nhỏ chồng lên.

**Ở trang bài học 2D (D), từ mốc 2: hai nhân vật 3D ở hai bên bảng bài học.** (Mốc 1 chưa có.)

- **Bố trí:** màn hình từ **1280px** trở lên có **2 khung 3D nền trong suốt** đặt ở **2 khoảng trống hai bên bảng bài học** (bảng rộng khoảng 1200px ở giữa, xem mục 1 "Trang bài học trên màn hình lớn"). Mỗi khung khoảng **280×420px**:
  - **bên trái:** `hoc-sinh-nam`;
  - **bên phải:** {phanDien} (model `ti`).
  Lúc chờ, cả hai ở tư thế `idle`.
- **Phản ứng khi em trả lời:**

| Em trả lời | Học sinh (trái) | {phanDien} (phải) |
|---|---|---|
| **Đúng** | `cheer` (2,5 giây đầu) | `hurt` (hoặc lắc đầu) |
| **Sai** | `sad` | `cheer` |

  Làm xong thì cả hai **về `idle`**.
- **Ẩn cả 2 khung** khi: màn hình dưới 1280px; máy yếu (mức chất lượng **Thấp**); hoặc bật **"Giảm chuyển động"**.
- **Tải:** 2 model **tải lười, sau khi trang bài học đã hiện** (không làm chậm trang đầu). Chưa tải xong hoặc tải lỗi thì **bỏ trống chỗ đó, không ảnh hưởng bài học** (không báo lỗi, không chặn nút).
- **Sự kiện chung cho 4 bài:** `LessonPage2D` phát sự kiện **`onAnswer(dung: boolean)`** mỗi khi em nộp một câu trả lời (đúng hoặc sai); 2 khung 3D chỉ **nghe** sự kiện này. Nhờ vậy 4 bài (và các trạm bên trong) không phải tự nối với khung 3D. Chi tiết: mỗi trạm báo kết quả từng lần trả lời lên khung bài học; khung bài học phát `onAnswer` và chọn tư thế.
- **Giới hạn:** tư thế `hurt` và `sad` do code dựng (mục 3); {phanDien} lắc đầu nếu dùng thì cũng do code dựng, tối đa 0,6 giây.

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

## 7. Mọi chữ hiển thị nằm trong một thư mục (`packages/core/src/content/`)

**Quy tắc bắt buộc:** **không viết chữ tiếng Việt hiển thị thẳng trong component.** Mọi chữ người chơi nhìn thấy đều lấy từ thư mục này. Như vậy người dùng tự sửa câu chữ mà không phải đụng vào code.

| File | Chứa gì |
|---|---|
| `characters.ts` | Tên hiển thị các nhân vật, kể cả `phanDien` |
| `story.ts` | Lời 14 ảnh truyện (spec 04 mục 2) |
| `dialogues.ts` | Mọi lời thoại của người dẫn, Bi, `{phanDien}` và dân làng. Chia theo nơi và thời điểm, ví dụ `langGiay.moDau`, `langGiay.truocTramTB`, `cho.biNhacNhiemVu`, `caoTrao.tiHoiCai` |
| `lessons/bai-1.ts` … `bai-4.ts` | Nội dung 4 bài học: hướng dẫn từng trạm, gợi ý, phản hồi đúng/sai, "Em có biết?" |
| `games.ts` | Tên từng game, luật 2–3 dòng ở thẻ bắt đầu, lời trong game (ví dụ "Ui da!", "Trượt rồi!", "Ngõ cụt!"), tên các mốc điểm |
| `questions.ts` | Ngân hàng câu hỏi (spec 03 mục 5) |
| `ui.ts` | Chữ trên nút, nhãn, menu, cài đặt, thông báo, lỗi (ví dụ "Đang lưu…", "Sắp ra mắt", "Sai tên đăng nhập hoặc mật khẩu…"), trang giáo viên, trang quyền riêng tư |

**Cách viết:**
- Mỗi câu là một cặp **khóa: "chữ"**, có chú thích ngắn cho biết câu đó hiện ở đâu.
- **Chỗ giữ tên** chỉ dùng 3 loại: `{ten}` (tên học sinh), `{Ten}` (tên học sinh viết hoa chữ đầu), `{phanDien}`. Ngoài ra có chỗ giữ số, như `{so}`, `{diem}`.

**File hướng dẫn `content/HUONG-DAN-SUA-CHU.md`** (viết cho người không rành code):
- Chỉ sửa chữ nằm giữa hai dấu ngoặc kép.
- Giữ nguyên các chỗ giữ tên như `{ten}`, `{phanDien}`.
- Sửa xong chạy `pnpm test`, rồi mở trang xem lại.

**Test `content.test.ts`:**
- Không có câu nào rỗng.
- Chỉ dùng các chỗ giữ tên hợp lệ.
- Mọi khóa mà code gọi tới đều có trong `content/`.

**Kiểm tra tự động:** script `pnpm check:text` báo lỗi nếu tìm thấy chữ có dấu tiếng Việt trong file `.tsx` nằm ngoài thư mục `content/`.

**Ngoại lệ:** chuỗi dữ liệu dùng trong logic và test, ví dụ thông điệp được ký "Chuyển 3 xu cho An" ở Bài 3, vẫn nằm trong logic của bài và không được sửa (spec 01 mục 3).

## 8. Âm thanh

Web Audio tự tạo: đúng, sai, bấm, nhặt, đập, hoàn thành. Có nút tắt.

## 9. Hiệu năng

- **Dung lượng:** trang đầu ≤ 150 KB JS. Lõi 3D chỉ tải khi vào cảnh 3D. Mỗi màn tải riêng.
- **Bộ nhớ:** texture nhân vật đã được thu nhỏ khi build (spec 01). Nếu lúc chạy còn thấy texture lớn hơn 2048, ghi cảnh báo.
- **Tốc độ:** mức Thấp ≥ 30fps trên điện thoại tầm trung.
- **Code:** không tạo object mới trong `useFrame`; rời cảnh thì dispose.

## 10. Trang thử

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
- [ ] Trang bài học 2D từ 1280px (mốc 2): 2 nhân vật 3D hai bên bảng; trả lời đúng thì học sinh `cheer` và {phanDien} `hurt`, trả lời sai thì {phanDien} `cheer` và học sinh `sad`, rồi về `idle`; dưới 1280px, mức Thấp hoặc "Giảm chuyển động" thì ẩn; model tải lỗi thì bỏ trống, bài học vẫn chơi được; `onAnswer(dung)` hoạt động ở cả 4 bài.
- [ ] `Scene25D` hiện nền, hình rời và nhân vật 3D đúng lớp, co giãn đúng 16:9.
- [ ] Đổi tên `phanDien` trong `characters.ts` thì đổi ở mọi lời thoại và câu hỏi.
- [ ] `pnpm check:text` không báo chữ hiển thị nào nằm ngoài `content/`; có file `HUONG-DAN-SUA-CHU.md`.
- [ ] Test va chạm và `unlock.ts` ✅. Mức Thấp ≥ 30fps.
