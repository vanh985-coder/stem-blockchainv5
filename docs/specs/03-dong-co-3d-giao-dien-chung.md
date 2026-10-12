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
- **Khi có hai khung 3D hai bên (mục 4) thì bảng thu nhỏ để chừa chỗ**, không còn cố định 1,35: hệ số `s` tính theo chiều rộng màn hình (công thức ở mục 4). Không có khung (máy yếu, "Giảm chuyển động", "Chữ to", màn < 1280px) thì bảng phóng như trên (1,35 từ 1280px). Hệ số được đặt lúc mở trang (biến CSS `--lz` trên `.lesson-zoom`) và **giữ nguyên** nếu khung bị ẩn về sau (tải lỗi, FPS thấp), để bảng không nhảy.
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
- Hàm `asset(path)` trả URL; `useModel(id)` trả model đã nhân bản (dùng `SkeletonUtils.clone`; hình học và vật liệu dùng chung giữa các bản nhân bản).
- `id` là đường dẫn trong `models/`, ví dụ `characters/bac-an`, `env/cay-da`. Có cache theo id; hết chỗ dùng thì sau khoảng 1,5 giây model được giải phóng (dispose).
- Tải bằng `GLTFLoader` kèm `MeshoptDecoder` (bản đóng gói cùng ứng dụng, không tải từ CDN); file nén meshopt bắt buộc cần bộ giải mã này.
- Thiếu file thì dùng hình thay thế: capsule màu cho nhân vật, khối màu cho đồ vật, ô màu cho ảnh. Chỉ cảnh báo ở chế độ dev.
- Lúc chạy, texture có cạnh dài hơn **2048** thì ghi cảnh báo ở console (mọi chế độ).

**Bản xa (LOD):**
- Mỗi model trong `models/env` và `models/games` có bản `<id>-xa` (spec 01 mục 5). `<Model id>` tự dùng bản xa khi camera ở xa hơn khoảng đổi (drei `Detailed`, độ trễ 5%): **Thấp 12, Vừa 20, Cao 30 đơn vị**.
- Model không có bản xa (nhân vật) thì luôn dùng bản chính. Có thể ép bằng `lod="near"` hoặc `lod="far"`.
- **Cỡ model trong file** (đo bằng three, đã áp xương ở tư thế gốc): cạnh dài nhất của mọi model đều khoảng **1 đơn vị** (0,98); cả 10 nhân vật cao ~0,98 với chân ở y = 0. Cảnh phải đặt tỉ lệ cho từng loại (ví dụ cổng làng, nhà phóng to nhiều lần); khoảng đổi bản xa tính theo khoảng cách camera thật trong cảnh.
- **Chuẩn hóa cỡ trong cảnh** (`three/modelSizes.ts`): mọi nhân vật (4 có xương và 6 đứng yên) **cao 1,7 đơn vị**, chân ở y = 0, mặt quay +Z. `<Character>` đo khung bao lúc tải rồi phóng và dịch (hàm thuần `fitToHeight`); bảng `MODEL_SIZES` giữ chiều cao và góc xoay mặt (`facingYaw`) từng model, bước sau thêm cỡ đồ vật vào đây.

**Khung cảnh `<Scene3D>`** (`packages/core/src/three/`): trời, mây, ánh sáng, sương, ACES như dưới đây; mức chất lượng; màn hình tải (thanh phần trăm trên nền giấy dó, `useProgress` của drei, chữ ở `content/ui.ts`); rời cảnh thì giải phóng. Không cấp phát đối tượng mới trong `useFrame`.

**Chunk riêng:** lõi 3D (three, R3F, drei, `Scene3D`, `Model`) chỉ import qua `React.lazy(() => import('@so-chung/core/three/index'))`; trang đầu không import. Phần thuần (mức chất lượng, tên model) nằm ở `@so-chung/core`.

**Vật lặp nhiều** (nhà, cây, rào): dùng `InstancedMesh` hoặc gộp hình; đổi màu, tỉ lệ, góc xoay để nhìn không bị lặp.

**Ánh sáng ban ngày (cảnh A, B):**
- Trời là khối cầu chuyển màu từ #E8F6FF lên #8FCBFF, có vài đám mây tròn do code dựng.
- `HemisphereLight`: trời #FFFFFF, đất #B5D68A.
- `DirectionalLight`: #FFF4E0.
- Sương nhẹ (màu chân trời #E8F6FF); tone mapping ACES. Mây trôi chậm; đứng yên khi bật "Giảm chuyển động".

**Mức chất lượng** (Thấp / Vừa / Cao):

| Mức | DPR | Bóng | Đổi bản xa ở |
|---|---|---|---|
| Thấp | 1 | Vệt bóng tròn dưới chân (`BlobShadow`) | 12 |
| Vừa | 1.5 | Bóng mềm 1024 | 20 |
| Cao | 2 | Bóng mềm 2048 | 30 |

DPR còn bị chặn bởi `devicePixelRatio` của máy.

**Chọn mức:** cài đặt "Chất lượng đồ họa" (Tự động / Thấp / Vừa / Cao, lưu ở `settings.quality`). "Tự động": điện thoại (màn cảm ứng), máy từ 4 nhân CPU trở xuống hoặc RAM từ 4 GB trở xuống thì Thấp, còn lại Vừa; mức Cao chỉ có khi người dùng chọn.

**Tự hạ mức:** nếu FPS trung bình dưới 40 trong 3 giây đầu của cảnh thì hạ một mức (Cao → Vừa → Thấp). Đo bắt đầu sau 0,5 giây khởi động (để thời gian biên dịch shader không làm hạ mức oan) và chỉ khi model đã tải xong. Mức trần này giữ cho các cảnh sau trong cùng lần mở trang, không ghi đè lựa chọn trong cài đặt. Logic chọn mức là hàm thuần (`three/quality.ts`, có test).

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

**Khóa chuyển động gốc (in-place):** bỏ phần dịch chuyển ngang (x, z) của xương `mixamorig:Hips` (giữ nguyên độ cao y, cố định x, z theo khung đầu). Vị trí nhân vật do code điều khiển, không do clip. Hàm `lockRootMotion` ở `three/clipPlayback.ts`.

**Đoạn phát** nằm ở `three/clipConfig.ts` (`CLIP_CONFIG`); chỉnh bằng thanh trượt ở `/dev/3d` rồi bấm "Xuất ra clipConfig.ts". Chuyển giữa hai clip mượt khoảng 0,2 giây (crossfade). Clip một lần (`jump`, `cheer`) xong thì tự về `idle`.

**Tốc độ ngầm:** clip `walk` của học sinh tiến ~0,9 đơn vị/giây trong cảnh, bà cụ ~0,66, chú nông dân ~0,71; clip `run` ~3,3–3,6. Dân làng đi đúng tốc độ này (đo từ khoảng dịch của hông trước khi khóa, nhân với hệ số phóng) nên chân không trượt.

**Clip `hang`:** hông ở thấp hơn hẳn (y ≈ −0,07 trong file, so với 0,44 của clip khác) vì nhân vật treo mình dưới xà; khi dùng, code phải nâng nhân vật lên.

**Dùng chung clip:** mọi model có xương đều là bộ xương Mixamo 65 xương, cùng tên. Vì vậy clip của model này phát được trên model khác. Ví dụ Tí cần `walk` thì mượn của học sinh. `<Character clips={[…]}>` chỉ tải model cho mượn khi thiếu clip (thứ tự cho mượn: học sinh, Tí, bà cụ, chú nông dân); nên liệt kê đúng các clip cần dùng.

### 3.3 Tư thế code tự dựng (xoay xương Mixamo)

| Tư thế | Cách làm | Thời lượng |
|---|---|---|
| `sad` | `Head` cúi xuống 20°, `Spine2` gập 10°, hai vai rũ | 1 giây |
| `point` | Xoay `RightArm` và `RightForeArm` hướng về mục tiêu (đáp án đang rê chuột) | Đến khi rời chuột |
| `slide` | Ngả `Spine` về sau 35°, hạ `Hips` xuống 0,5 | 0,6 giây |
| `swing` | `RightArm` quét một vòng cung từ trên cao xuống | 0,25 giây |
| `hurt` (Tí) | Nảy lên 0,3; hai tay vòng ra sau, ôm mông; rung | 0,6 giây |

Mỗi tư thế trộn với clip đang chạy, vào ra mượt trong 0,1 giây.

**Cách làm** (`three/poses.ts` thuần, `three/PoseLayer.ts` áp lên xương):
- Độ lệch là góc cộng thêm lên xương **sau khi** `AnimationMixer` chạy, tính trong **hệ tọa độ của nhân vật** (+Z là hướng mặt, +X là bên trái nhân vật, quay quanh +X dương là cúi tới trước), rồi đổi sang hệ cục bộ của từng xương: `local' = P⁻¹·C·R·C⁻¹·P·local`. Nhờ vậy "cúi đầu 20°" luôn là cúi tới trước dù trục xương Mixamo thế nào.
- **Thứ tự mỗi khung hình: `layer.restore()`, `mixer.update(dt)`, `layer.update(now, dt)`.** `PropertyMixer` của three chỉ ghi lại xương khi giá trị clip đổi so với khung trước; nếu không trả xương về giá trị gốc thì độ lệch cộng dồn từng khung (hông lún dần xuống đất).
- Trọng số: vào 0,1 giây, giữ, ra 0,1 giây (`poseWeight`); `point` giữ đến khi thả (`heldWeight`).
- Số độ cao tính theo đơn vị cảnh (nhân vật cao 1,7): `slide` hạ `Hips` 0,5, `hurt` nảy 0,3. **Thêm so với bảng:** khi `Hips` hạ thì đùi ra trước góc a và gối gập 2a (a = arccos((L − hạ)/L), tối đa 75°, L là chiều dài chân) để bàn chân vẫn chạm đất, nếu không chân lún dưới sàn.
- `swing`: `RightArm` quét từ -175° (trên cao) xuống -20° (trước người) quanh trục X của nhân vật trong 0,25 giây, thêm khuỷu và thân hơi theo.
- `hurt` chỉ có tác dụng với Tí (`isPoseAllowed`).
- **Giới hạn khớp** (`JOINT_LIMITS`): mọi góc được chặn sau khi cộng dồn (ví dụ gối 0°–150°, đầu ±80° quanh trục đứng) để tay chân không gãy khi nhiều tư thế chồng nhau.
- `<Character pose={{ name, n }}>` phát tư thế (đổi `n` để phát lại); `<Character aim={{ az, el }}>` là hướng nhìn và chỉ (mục 4).

### 3.4 Nhân vật không có xương (đứng yên)

**Chuyển động do code làm:**

| Tình huống | Chuyển động |
|---|---|
| **Đứng yên** | Nhún như đang thở (scale Y dao động ±2%, chu kỳ 2 giây); lắc nhẹ ±2° quanh trục Z |
| **Khi nói** | Nghiêng đầu (xoay cả model ±4°); quay mặt về phía người chơi |
| **Khi vui** | Bật lên 0,15 hai lần |

Mỗi người lệch pha ngẫu nhiên để không nhún đồng loạt. Hàm thuần ở `three/staticMotion.ts` (chu kỳ lắc 3,2 giây, nghiêng khi nói 1,4 giây; bật lên hai lần, mỗi lần 0,3 giây); khi nói quay mặt dần về điểm `lookAt`.

### 3.5 Bi (code dựng)

**Hình dáng:**
- Khối hộp bo tròn cạnh, cạnh khoảng 0,5, màu `muc-tim`, hơi phát sáng.
- Hai mắt tròn trắng, chớp mắt mỗi 3–5 giây.
- Một mắt xích nhỏ trên đỉnh đầu.

**Chuyển động:**
- Bay lơ lửng nhấp nhô (biên độ 0,1, chu kỳ 2 giây), luôn theo sau vai người chơi (`<Bi target={ref}>`: sau vai phải, hơi cao hơn đầu, mượt).
- Khi vui thì xoay một vòng (0,8 giây). Hàm thuần ở `three/biMotion.ts`.

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
| Máy tính | **Bấm vào khung để khóa chuột** (pointer lock), rê chuột xoay camera quanh nhân vật (kiểu PUBG); W/↑ đi về phía camera nhìn, A/D/S (và ←/→/↓) quay người đi về hướng đó; Shift chạy; Space nhảy; E tương tác; **Esc nhả chuột và mở menu** |
| Điện thoại | Cần điều khiển động ở nửa trái màn hình (đẩy quá 80% là chạy); nút nhảy và nút ✋ ở góc phải |

- **Tốc độ:** đi 4, chạy 7. **Nhảy:** vận tốc đầu 6, trọng lực 18.
- **Camera:** ở sau lưng, cách 7, cao 4.
- **Va chạm** (hàm thuần, có test):

| Tình huống | Kết quả mong đợi |
|---|---|
| Nhân vật ở (0, 0) r 0.4; vật tròn tâm (0.5, 0) r 0.5 | Bị đẩy tới (−0.4, 0) |
| Nhân vật ở (0.8, 0) r 0.4; hộp x ∈ [1, 3], z ∈ [−1, 1] | Bị đẩy tới (0.6, 0) |
| Biên bán kính 60; nhân vật ở (61, 0) | Bị kéo về (59.6, 0) |

- **Tương tác:** vật gần nhất trong bán kính 2,2 hiện lời nhắc "E: …" (điện thoại hiện tên vật trên nút ✋; nút mờ khi không có vật nào gần).

**Cách làm (mốc 2, bước 6)** — logic là hàm thuần có test, trong `packages/core/src/three/`:
- `collision.ts`: `resolveCollisions` (vật tròn, hộp, biên bán kính; bán kính nhân vật 0,4). Đẩy ra theo điểm gần nhất của vật cản nên đi xéo vào hộp là trượt dọc mặt hộp, vòng qua góc; đâm đúng vào góc thì dừng yên, không rung.
- `playerMotion.ts`: `stepPlayer` (đi 4, chạy 7, nhảy vận tốc đầu 6, trọng lực 18, đỉnh nhảy 1 đơn vị, ở trên không 2/3 giây). Tăng và giảm tốc mượt (~0,2 giây), mặt quay mượt 10 rad/giây về hướng đi, nhảy không đôi, bấm nhảy sớm ≤ 0,12 giây vẫn tính. Tạm dừng (`paused`): bỏ lệnh đi và nhảy. `animationFor`: idle/walk/run/jump; `locomotionTimeScale` và `jumpTimeScale` chỉnh tốc độ phát clip cho khớp tốc độ đi (kẹp 0,6–2,4).
- `cameraRig.ts`: camera ở phía sau theo hướng nhìn, cách ngang 7, cao 4 (quỹ đạo bán kính √65, góc ngẩng mặc định ≈ 29,7°); bám mượt (độ gắt 7). "Tiến lên" là hướng camera nhìn.
  - **Máy tính (khóa chuột):** `lookCamera(cam, movementX, movementY, độ nhạy)`: rê sang phải thì camera nhìn sang phải (yaw giảm), rê lên thì ngước (góc ngẩng giảm, camera hạ), rê xuống thì cúi (camera nâng lên); góc ngẩng kẹp trong **5°–60°**; 0,0025 rad mỗi pixel nhân với "Độ nhạy chuột"; mỗi sự kiện chuột chặn tối đa 150px (Chrome thỉnh thoảng báo cú nhảy vọt). Không còn giữ chuột trái để kéo (chỉ còn là cách dự phòng khi trình duyệt không có khóa chuột).
  - **Điện thoại:** vuốt nửa phải màn hình bằng `dragCamera` (kéo sang phải thì cảnh trượt sang phải, giới hạn 0,12–1,2 rad), không đổi.
  - **"Độ nhạy chuột"** là một thanh trượt trong Cài đặt (`Settings.mouseSensitivity`, 0,3 đến 3, bước 0,1, mặc định 1, lưu cùng các cài đặt khác; `clampMouseSensitivity` là hàm thuần có test), cũng có trong hộp menu của /dev/walk.
- `interaction.ts`: `nearestInteractable`, bán kính 2,2.
- `walkInput.ts`, `walkApi.ts`: ánh xạ phím (WASD, mũi tên, Shift, Space, E, Esc), cần điều khiển động (bán kính 56px, vùng chết 12%, quá 80% là chạy), gộp lệnh phím/cần mỗi khung hình.
- `WalkControls.tsx` (DOM) ghi vào `WalkApi`; `WalkWorld.tsx` (trong Scene3D) đọc mỗi khung hình: nền đất tròn, người chơi (học sinh), camera, Bi. Hai bên chỉ trao đổi qua `WalkApi` (đối tượng thường) nên không cấp phát trong `useFrame`.
- **Điện thoại:** `touch-action: none`, chặn `touchmove`/`gesturestart`, khóa cuộn trang khi đang chơi; nút nhảy 76px, nút ✋ 64px (≥ 44px). Chạm nửa trái hiện cần điều khiển tại điểm chạm; vuốt nửa phải xoay camera. Phần tử đánh dấu `data-walk-ui` (bảng thông tin, nút) không bắt đầu kéo camera hay cần điều khiển.
- **Khóa chuột, hộp thoại và menu (máy tính):** `WalkControls` nhận `lockMode` (trình duyệt có `requestPointerLock` và con trỏ là chuột), `onLockChange`, `onLockError`; `WalkApi.lock.request/exit` cho nơi dùng xin hoặc nhả khóa.
  - Bấm (chuột) vào khung thì `requestPointerLock` ngay trong sự kiện `pointerdown`.
  - **Nhả khóa** (Esc, chuyển cửa sổ, bất cứ lý do gì) mà không có hộp thoại thì **hiện menu tạm dừng** có dòng **"Bấm để chơi tiếp"**; bấm vào khung hoặc nút đó thì khóa lại và menu đóng. Chrome từ chối khóa lại ngay sau khi vừa nhả bằng Esc (khoảng 1 giây): bắt lỗi `pointerlockerror` và Promise bị từ chối, hiện lại lời nhắc, không báo lỗi.
  - **Mở hộp thoại (E)** thì tự nhả khóa để bấm được lựa chọn; **đóng hộp thoại** thì xin khóa lại ngay trong chính sự kiện bấm (nút "Tiếp"/"Bỏ qua", hay Enter/Space). Đóng bằng Esc thì Chrome có thể từ chối (Esc không tính là thao tác của người dùng): khi đó hiện menu với "Bấm để chơi tiếp".
  - Không có khóa chuột (điện thoại, trình duyệt cũ): Esc bật tắt menu như trước (`onMenu`), nút "Tiếp tục".
  - Tạm dừng (chưa khóa, hộp thoại hoặc menu): nơi dùng truyền `paused` cho `WalkControls` và `WalkWorld` (thả hết phím, bỏ lệnh); phím khác bị bỏ khi tạm dừng.
- **Bi:** bay theo sau vai **phải** của người chơi. Nhân vật quay mặt +Z nên bên phải của họ là −X: `BI_FOLLOW_OFFSET = [−0,75, 2,0, −0,55]` (bước 3 từng đặt +0,75, là vai trái, đã sửa).

## 4. Phản ứng khi chọn đáp án — `ChoiceReaction`

Dùng ở mọi chỗ có lựa chọn: câu hỏi, Đồng ý/Từ chối, lựa chọn trong hội thoại.

- **Máy tính:** rê chuột hoặc focus vào một đáp án thì nhân vật học sinh **quay đầu và người** về phía đáp án đó, kèm tư thế `point`.
- **Điện thoại:** chạm là chọn. Nhân vật `point` 0,3 giây trước khi hiện kết quả.
- **Kết quả:** đúng thì `cheer`, sai thì `sad`. {phanDien} chỉ `cheer` khi em trả lời sai; đúng thì {phanDien} **giữ `idle`** (`hurt` chỉ dành cho màn 5).

**Kho sự kiện dùng chung** (`three/choiceReactions.ts`, không import three nên nhẹ cho trang đầu): `QuizCard` và các trang bài học chỉ phát sự kiện, khung 3D chỉ nghe.
- `hover(rect)` / `hover(null)`: rê chuột hoặc focus vào đáp án (rect là khung màn hình của nút) hoặc rời đi. Chạm không có rê nên không phát `hover`.
- `select(rect, touch)`: chọn. Trả về Promise: **ngay** nếu bằng chuột hoặc bàn phím, **sau 0,3 giây** nếu chạm (nhân vật chỉ trước rồi mới hiện kết quả). Từ lúc chọn đến khi có kết quả thì khóa hướng chỉ, rê chuột đi chỗ khác không làm mất.
- `result(correct)`: đúng thì học sinh `cheer`, {phanDien} giữ `idle`; sai thì học sinh `sad` và {phanDien} `cheer`; rồi về `idle`. Hai kết quả cùng chiều trong 250 ms là một (hộp phản hồi và trạm cùng báo một lần trả lời).
- **Nối một lần cho cả 4 bài:** mọi chỗ em trả lời (hộp phản hồi, `QuizCard`, mọi trạm) đều gọi `sound.playCorrect()` hoặc `sound.playWrong()`; hai hàm này phát tín hiệu `onAnswer(dung)` (`audio/answerSignal.ts`) và kho `choiceReactions` tự nghe tín hiệu đó (tức là `onAnswer` là cách duy nhất để có `result`, kể cả khi âm thanh bị tắt). `LessonPage2D` có prop `onAnswer?: (dung) => void` cho nơi khác muốn nghe. Rê chuột hoặc focus vào nút thì `useChoiceDelegation` (event delegation trên vùng trạm) phát `hover`, không phải sửa từng trạm; chạm không có rê nên khung 3D trong bài học chỉ phản ứng khi có kết quả.
- Hook `useChoiceHandlers()` (`bindChoice` gắn vào nút, `select`, `result`) và `useReaction()` (nghe). `QuizCard` và trang bài học 2D đã nối (xem dưới).
- **Hướng nhìn:** `aimFromRects(khung3D, đáp án)` cho góc ngang `az` và góc cao `el` (tối đa ±75° và -35°…+45°); bên phải khung thì nhân vật quay sang +X (bên trái nhân vật, vì họ nhìn ra màn hình). `splitAim`: cả người 30% + vặn thân 40% + đầu 40% của `az`; ngẩng/cúi 70% đầu, 30% cổ. Cánh tay phải (`RightArm` rồi `RightForeArm`) quay từ hướng hiện tại tới hướng đáp án, tối đa 160°.
- `<ReactionStage>` (`three/ReactionStage.tsx`) là khung 3D nghe kho này: học sinh và Tí cạnh nhau (thử ở `/dev/3d`); ở trang bài học thì là hai khung hai bên bảng (`LessonStage3D`).

**Hội thoại ở trang bài học 2D** dùng `VnDialog` (mục 1): chân dung lớn của người nói, không còn khung 3D nhỏ chồng lên.

**Ở trang bài học 2D (D), từ mốc 2: hai nhân vật 3D ở hai bên bảng bài học.** (Mốc 1 chưa có.)

- **Bố trí:** từ **1280px** trở lên, mỗi khung **rộng f = 14% chiều rộng màn hình, kẹp từ 180 đến 280px**, cao tối đa **420px**, đặt giữa khoảng trống hai bên bảng, mép dưới cách đáy 16px, **nền trong suốt** (chỉ có bóng đổ trên nền cảnh làng):
  - **bên trái:** `hoc-sinh-nam`;
  - **bên phải:** {phanDien} (model `ti`), xoay nhẹ về phía bảng.
  Lúc chờ, cả hai ở tư thế `idle`.
  - **Bảng thu nhỏ để chừa chỗ** (hàm thuần `lessonFrameLayout`, `lesson2d/frames.ts`, có test): hệ số phóng của bảng **s = min(1,35, (chiều rộng màn − 2 × (f + 16)) / 872)**. 872px là **chiều rộng gốc của bảng** khi chưa phóng (thân trang `max-w-4xl` = 896px trừ lề 2 × 12px, đã đo bằng Chrome). Bảng thật trên màn hình rộng 872 × s. Nếu s < 1 thì **không có khung**, dùng bố cục cũ (1,35 từ 1280px); với công thức này s ≥ 1 từ 1280px khi không có thanh cuộn, nên chỉ xảy ra ở màn sát 1280px có thanh cuộn dọc. **Dung sai:** s từ 0,99 đến dưới 1 vẫn dùng s = 1 (thanh cuộn 17px của Windows ở đúng 1280px cho s = 0,999; khe giữa khung và bảng chỉ mất vài px, vẫn không đè). Chiều rộng màn hình tính **trừ thanh cuộn dọc** (trang giữ chỗ cho thanh cuộn bằng `scrollbar-gutter: stable` từ 1280px, để thanh cuộn hiện hay mất cũng không làm bảng dịch).
  - Lý do bỏ cách cũ ("khung nằm trong khoảng trống của bảng 1200px"): bảng 1200px chỉ chừa 40px mỗi bên ở 1280px nên khung chỉ hiện từ 1512px; thu bảng lại thì khung có từ 1280px và vẫn không bao giờ đè lên bảng (mỗi bên bảng chừa đúng f + 16px: 8px mép màn hình, 8px mép bảng).
  - **Số liệu thật** (`innerWidth`, thanh cuộn 0px / 15px): 1280 → f 180, s 1,018 / 1,001; 1366 → f 191 / 189, s 1,092 / 1,079; 1536 → f 215 / 213, s 1,232 / 1,219; 1920 → f 269 / 267, s 1,35 (giới hạn).
  - **"Chữ to"** bật thì không có khung và bảng giữ cỡ cũ.
  - **Quyết định bố cục một lần lúc mở trang**, trước khi tải 3D (`shouldReserveFrameLayout`: chỉ xét cỡ màn, "Giảm chuyển động", "Chữ to", máy yếu). Khung bị ẩn về sau (tải lỗi, FPS dưới 30) thì **giữ nguyên bố cục**, bảng không nhảy (chỗ hai bên để trống).
  - **Một Canvas duy nhất** (một WebGL context) với drei `View` cho cả hai khung (`three/LessonStage3D.tsx`). Lưu ý: ở bản drei hiện dùng, `<View>` đặt ngoài Canvas **bỏ qua prop `track`** và theo dõi chính `<div>` mà nó render, nên khung phải là chính `<View style={…}>`.
  - Khi khung hiện, **bớt icon nền** `NenTrangTri` ở hai bên còn **2 icon mỗi bên** (hai chỗ trên cùng) cho khỏi chồng lên khung (`sideMax`); khung ẩn thì trở lại 4.
- **Phản ứng khi em trả lời** (khung bên trái còn quay đầu và người về phía nút em đang rê chuột hoặc focus, kèm `point`):

| Em trả lời | Học sinh (trái) | {phanDien} (phải) |
|---|---|---|
| **Đúng** | `cheer` (2,5 giây đầu) | giữ `idle` (`hurt` chỉ dành cho màn 5) |
| **Sai** | `sad` | `cheer` |

  Làm xong thì cả hai **về `idle`**.
- **Ẩn cả 2 khung** (không tải chunk 3D và model) khi: màn hình dưới 1280px hoặc không đủ chỗ (xem trên); bật **"Giảm chuyển động"** hoặc **"Chữ to"**; hoặc **máy yếu** = mức chất lượng **Thấp** (cài đặt "Tự động" chọn Thấp cho điện thoại và máy ít nhân hoặc ít RAM, hoặc em tự chọn Thấp). Máy đã tải rồi mà **FPS dưới 30 trong 3 giây đầu** thì **ẩn khung và dọn bộ nhớ** (gỡ Canvas, model giải phóng sau 1,5 giây) và đặt mức trần của phiên về Thấp, nên các bài sau không thử lại. Logic hiện/ẩn là hàm thuần `shouldShowLessonFrames`, có test.
- **Ngừng vẽ** (`frameloop: 'never'`) khi tab bị ẩn hoặc cả hai khung ra khỏi màn hình.
- **Tải:** chunk 3D và 2 model **tải lười, sau khi trang bài học đã hiện** (chờ 1,2 giây rồi chờ lúc rảnh; không làm chậm trang đầu). Chưa tải xong hoặc tải lỗi (chunk, hoặc một model thiếu/lỗi) thì **ẩn khung, bài học vẫn chơi được** (không báo lỗi, không chặn nút). Chỉ dựng khi cả hai model đã sẵn sàng, rồi hiện dần.
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

- **Dung lượng:** trang đầu ≤ 150 KB JS (gzip). Lõi 3D chỉ tải khi vào cảnh 3D. Mỗi màn tải riêng. **Trang bài học 2D:** mã của 3 trạm (cùng `motion` và `@dnd-kit` mà chúng dùng) **tải sau** bằng `lazy(() => import(...))` ở từng trang `ManN`, và được nạp lúc rảnh (khoảng 1,5 giây sau khi trang hiện) cho trạm sắp tới; nhờ đó JS lúc mở trang bài học của cả 4 làng còn khoảng 117–125 KB (trước đó 152–181 KB).
- **Bộ nhớ:** texture nhân vật đã được thu nhỏ khi build (spec 01). Nếu lúc chạy còn thấy texture lớn hơn 2048, ghi cảnh báo.
- **Tốc độ:** mức Thấp ≥ 30fps trên điện thoại tầm trung.
- **Code:** không tạo object mới trong `useFrame`; rời cảnh thì dispose (hình học, vật liệu, texture và **đóng `ImageBitmap`** của texture, vì `texture.dispose()` không giải phóng bitmap trong RAM). `AnimationMixer` tạo trong `useEffect`, cleanup gọi `stopAllAction` và `uncacheRoot`; mỗi lần effect chạy (kể cả lần gắn lại của StrictMode) tạo mixer mới.

## 10. Trang thử

**`/dev/3d`:**
- Chọn từng model trong manifest để xem.
- Nút phát thử từng clip và từng tư thế code dựng (sad, slide, swing, hurt, và bật/tắt point).
- Khu thử `ChoiceReaction`: khung 3D (học sinh và Tí) và 4 nút đáp án HTML giả (rê chuột hoặc Tab thì học sinh quay và chỉ; bấm hoặc chạm thì ra đúng hoặc sai ngẫu nhiên).
- Nút "Xem cả nhóm": 10 nhân vật và Bi cạnh nhau (cùng chiều cao; 6 người đứng yên nhún lệch pha; bà cụ và chú nông dân đi vòng).
- Thanh trượt chỉnh đoạn phát của `jump` và `cheer`, rồi xuất ra `clipConfig.ts`.
- Có thử `ChoiceReaction`, Bi, chân dung tự chụp, và bộ đếm FPS.

**`/dev/walk`** (mốc 2, bước 6): nền đất phẳng bán kính 20 (`ui/textures/duong-dat`), vài cột tròn và hộp (có hai hộp vuông góc thành chữ L) để thử va chạm, 2 vật tương tác được (mở một `VnDialog` ngắn), 1 dân làng đi lại, bộ đếm FPS, chọn mức chất lượng, hộp "Menu (chưa làm)" mở bằng Esc. Mở bằng điện thoại: `pnpm dev:hub --host` rồi vào `http://<IP máy>:5173/dev/walk` (cần `pnpm dev:assets` chạy cùng). Chạy dev còn có `window.__walkPlayer` (trạng thái người chơi) để kiểm tra bằng trình duyệt.

**`/dev/self-test`:** chạy mọi test logic trong trình duyệt.

## Checklist nghiệm thu

- [ ] `/dev/3d`:
  - học sinh đi, chạy, nhảy, đu mượt;
  - Tí chạy;
  - 2 dân làng đi lại;
  - 6 người đứng yên nhún nhẹ, lệch pha nhau.
- [ ] `sad`, `point`, `slide`, `swing`, `hurt` trông tự nhiên; không clip nào làm nhân vật trôi khỏi chỗ.
- [ ] `/dev/portraits` xuất được 11 ảnh chân dung rõ mặt.
- [ ] Trang bài học 2D từ 1280px (mốc 2): 2 nhân vật 3D hai bên bảng; trả lời đúng thì học sinh `cheer` và {phanDien} giữ `idle` (`hurt` chỉ dành cho màn 5), trả lời sai thì {phanDien} `cheer` và học sinh `sad`, rồi về `idle`; bảng thu nhỏ để chừa chỗ cho khung (f = 14% màn, 180–280px; s = min(1,35, (màn − 2 × (f + 16)) / 872)); dưới 1280px, mức Thấp, "Giảm chuyển động" hoặc "Chữ to" thì ẩn và bảng như cũ; khung ẩn về sau (lỗi, FPS thấp) thì bảng không nhảy; tắt âm thanh vẫn phản ứng; model tải lỗi thì bỏ trống, bài học vẫn chơi được; `onAnswer(dung)` hoạt động ở cả 4 bài.
- [ ] `Scene25D` hiện nền, hình rời và nhân vật 3D đúng lớp, co giãn đúng 16:9.
- [ ] Đổi tên `phanDien` trong `characters.ts` thì đổi ở mọi lời thoại và câu hỏi.
- [ ] `pnpm check:text` không báo chữ hiển thị nào nằm ngoài `content/`; có file `HUONG-DAN-SUA-CHU.md`.
- [ ] Test va chạm và `unlock.ts` ✅. Mức Thấp ≥ 30fps.
