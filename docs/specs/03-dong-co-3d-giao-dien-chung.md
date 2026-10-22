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

**Đã làm (mốc 2, bước 13):** `packages/core/src/three/scene25d/`: `Scene25D.tsx` (component), `layout25d.ts` (hàm thuần có test), `Dev25D.tsx` (trang `/dev/25d` chỉ có khi chạy dev).
- Đơn vị thế giới: khung ngang 16 × 9 (dọc 9 × 16), gốc ở tâm, x sang phải, y lên trên; camera trực giao đặt z = 20 nhìn về −z, `manual` nên khung nhìn phủ đúng khung (không phụ thuộc kích thước canvas). Lớp theo Z (`LAYERS`): background −10, far −5, back −2, actorsBack −1, actors 0, actorsFront 1,2, front 3, near 5; các lớp nhân vật cách nhau ≥ 1 đơn vị.
- Props: `background` (đường dẫn manifest, phủ kiểu cover), `sprites` (khóa, đường dẫn, x, y, lớp, cao hoặc rộng, lật, độ mờ, xoay), `children` (R3F: `<Actor25D x y layer height facing><Character …/></Actor25D>`), `overlay` (HTML phủ lên khung), `allowPortrait`, `quality`, `onReady`, `onModeChange`.
- Khung 16:9 co giãn theo phần tử cha (`fitFrame`, dải đen hai bên hoặc trên dưới). Điện thoại xoay dọc (cạnh ngắn dưới 600 điểm ảnh) mà cảnh không cho dọc thì hiện "Xoay ngang để chơi"; cửa sổ máy tính hẹp vẫn chơi trong khung thu nhỏ; `allowPortrait` (màn 12) dùng khung 9:16.
- Nạp trước: ảnh nền và hình rời nạp xong cùng model trước khi tắt màn hình tải, rồi `SceneWarmup`. Thiếu ảnh thì hiện ô màu thay thế. Có `CanvasErrorBoundary`; texture được dispose khi rời cảnh (dựng lại cảnh 6 lần: số texture, geometry, draw call không đổi, không lỗi).
- Số liệu (`/dev/25d`, Intel UHD): 144 FPS (giới hạn của màn hình) ở cả 3 mức, khung lâu nhất 7 đến 14 ms, khoảng 54.700 tam giác, 7 đến 10 draw call.
- **Lớp HTML phủ lên (`overlay`) không có bóng đổ** (mốc 2, bước 14b): `.scene25d-overlay` ở `theme.css` ép `box-shadow`, `text-shadow`, `filter` về none cho mọi phần tử bên trong. Lý do (đo trên bản build, Chrome, Intel UHD, màn 3): lớp phủ nằm trên canvas WebGL; mỗi lần một phần tử đổi (hiện bảng, thẻ rung, lời Bi) GPU vẽ lại các ô nền của lớp phủ, và các bóng đổ (kể cả bóng cứng không mờ) làm một số khung hình lâu 60 đến 240 ms (`RasterDecoderImpl::DoEndRasterCHROMIUM::Flush` 20 đến 70 ms trong tiến trình GPU, luồng chính chỉ 2 đến 6 ms). Bỏ bóng đổ thì khung lâu nhất còn 21 đến 28 ms. Tạo khối bằng viền dưới dày (`border-b`) thay cho bóng. Mọi màn 2.5D sau dùng lại quy ước này.
- **Lưu ý đồ họa:** ảnh trong `assets/sprites/` (kiểm `ro-trang-gia`, `cot-tre`, `than-cay`, `chuot-giay-thuong`) có kênh alpha nhưng 0 điểm ảnh trong suốt: nền ô vuông xám trắng của ảnh "trong suốt" tạo bằng AI đã in thẳng vào ảnh, nên hình rời hiện kèm ô vuông. Cần ảnh có nền trong suốt thật (hoặc thêm bước tách nền vào `assets-build`) trước khi dùng cho màn 3 trở đi.

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
- Mỗi model trong `models/env` và `models/games` có bản `<id>-xa` (spec 01 mục 5), và (nếu bản chính trên 20.000 tam giác **và** chế độ chặt xuống được ≤ 25.000) bản vừa `<id>-vua` khoảng 15.000 tam giác: **3 bậc chính → vừa → xa**. Hiện là 4 cổng làng và giếng (ở chợ); lều, nhà, bụi tre không có bản vừa trong manifest (chế độ chặt dừng ở 36.000 đến 67.000 tam giác) nên 2 bậc chính → xa.
- Model không có bản xa (nhân vật) thì luôn dùng bản chính. Có thể ép bằng `lod="near"` hoặc `lod="far"`.
- **Cỡ model trong file** (đo bằng three, đã áp xương ở tư thế gốc): cạnh dài nhất của mọi model đều khoảng **1 đơn vị** (0,98); cả 10 nhân vật cao ~0,98 với chân ở y = 0. Cảnh phải đặt tỉ lệ cho từng loại (ví dụ cổng làng, nhà phóng to nhiều lần); khoảng đổi bản xa tính theo khoảng cách camera thật trong cảnh.
- **Chuẩn hóa cỡ trong cảnh** (`three/modelSizes.ts`): mọi nhân vật (4 có xương và 6 đứng yên) **cao 1,7 đơn vị**, chân ở y = 0, mặt quay +Z. `<Character>` đo khung bao lúc tải rồi phóng và dịch (hàm thuần `fitToHeight`); bảng `MODEL_SIZES` giữ chiều cao, góc xoay mặt (`facingYaw`) và khung bao chuẩn hóa `dims` từng model; hàm `sizeInScene(id, scale)` cho kích thước thật [rộng, cao, sâu] trong cảnh (bản xa `-xa` dùng cỡ của bản chính).

**Cỡ thật của đồ vật** (mốc 2, bước 7; so với nhân vật cao 1,7; `dims` là khung bao đo bằng gltf-transform từ `assets-build/`, có test khớp với file thật):

| Model | Cao trong cảnh | Rộng × sâu trong cảnh | Gấp nhân vật | Ghi chú |
|---|---|---|---|---|
| `env/cay-da` | 12 | 19 × 12,7 | 7 lần | vật cản là mép nền rễ to nhô cao quanh gốc (bán kính khoảng 5,2–6,7, đo theo chân thật của nền); thân chính (bán kính 2,5) chỉ chắn camera; tán rộng |
| `env/cong-lang-giay` | 6 | 10,4 × 2,7 | 3,5 lần | lối đi giữa nới ra 2,4 (xem mục 3.7) |
| `env/cong-lang-det` | 6 | 8,4 × 3,0 | 3,5 lần | |
| `env/cong-lang-khac-dau` | 6 | 10,7 × 3,8 | 3,5 lần | |
| `env/cong-lang-bac` | 6 | 10,2 × 3,9 | 3,5 lần | |
| `env/nha-mai-ngoi` | 4,5 | 5,3 × 4,8 | 2,6 lần | |
| `env/nha-mai-tranh` | 4 | 5,3 × 5,0 | 2,4 lần | |
| `env/leu-cho` | 3,2 | 3,8 × 3,0 | 1,9 lần | |
| `env/gieng-lang` | 2,4 | 2,4 × 2,3 | 1,4 lần | |
| `env/bui-tre` | 5,5 | 5,9 × 5,3 | 3,2 lần | cả cụm, có nền đất |
| `env/phen-phoi-giay` | 0,17 (nhấc lên giá cao 0,85, đỉnh 1,02) | 2,43 × 1,6 | tấm phẳng | phên phơi giấy của Làng Giấy; bốn chân giá do code dựng |
| `env/khung-cui` | 2 | 1,8 × 1,9 | 1,2 lần | khung cửi của Làng Dệt; bản chính 134.198 tam giác nên chỉ dùng khi thật gần |

Đồ nhỏ do code dựng: chum vại cao 1,05, đống rơm cao 2, khóm hoa cao khoảng 0,8, thuyền gỗ dài 4,6 rộng 1,3. Nhà, lều, bụi tre khi đặt còn nhân với tỉ lệ ngẫu nhiên 0,8 đến 1,25.

**Khung cảnh `<Scene3D>`** (`packages/core/src/three/`): trời, mây, ánh sáng, sương, ACES như dưới đây; mức chất lượng; màn hình tải (thanh phần trăm trên nền giấy dó, `useProgress` của drei, chữ ở `content/ui.ts`); rời cảnh thì giải phóng. Không cấp phát đối tượng mới trong `useFrame`.

**Chunk riêng:** lõi 3D (three, R3F, drei, `Scene3D`, `Model`) chỉ import qua `React.lazy(() => import('@so-chung/core/three/index'))`; trang đầu không import. Phần thuần (mức chất lượng, tên model) nằm ở `@so-chung/core`.

**Vật lặp nhiều** (nhà, cây, rào): dùng `InstancedMesh` hoặc gộp hình; đổi màu, tỉ lệ, góc xoay để nhìn không bị lặp.

**Nhân bản bằng InstancedMesh ở chợ phiên** (`three/cho/ModelInstances.tsx`, mốc 2 bước 7):
- Mọi bản của một model dùng chung hình học và vật liệu của model (không clone dữ liệu); mỗi phần (mỗi vật liệu) một draw call cho bản chính và một cho bản xa. Mesh cùng vật liệu được gộp (cây tre 42 mảnh thành 1). Hình học được **giải nén về Float32** trước khi nướng ma trận node (file nén meshopt lượng tử hóa vị trí, nếu không thì hình méo thành khối hộp).
- **Tự cắt từng bản mỗi khung hình** (`cho/instanceSelect.ts`, hàm thuần có test): bỏ bản ngoài khung nhìn và quá xa, chia phần còn lại thành bản chính (gần) và bản xa. `InstancedMesh` của three chỉ cắt cả khối, nên không tự cắt thì số tam giác tính theo cả chợ.
- **Khoảng đổi bậc ở chợ (bước 8b, 8c):** model 3 bậc (cổng làng, giếng): bản chính tới 12 (cổng) hoặc 6 (giếng) ở Vừa và 28 (cổng) hoặc 14 (giếng) ở Cao, **bản vừa tới 30 ở Vừa và 40 ở Cao**, bản xa từ đó trở đi (`marketFarDistance`: bản xa chỉ xuất hiện ở xa); mức Thấp không có bậc vừa (không tải bản vừa) và bản xa từ 5. Model 2 bậc (nhà, lều, bụi tre): bản chính tới **5 ở Thấp, 15 ở Vừa, 25 ở Cao** (`MARKET_NEAR`), xa hơn dùng bản xa. Các số này chỉnh theo ngân sách tam giác (bản chính nặng 50.000 đến 67.000 tam giác). Mức Thấp không vẽ vật cách xa quá 52. Model mà bản chính chỉ nhẹ hơn bản xa chút ít (cây đa: 9.126 so với 8.000) thì luôn dùng bản chính.
- **Mật độ theo mức:** mức Thấp bớt 25% lều chợ và 40% bụi tre (`densityFor`, rải đều; vật cản và vật chắn camera tính sau khi bớt nên luôn khớp). Vừa và Cao đủ đồ vật.
- **Ngân sách tam giác (kể cả lượt vẽ bóng), 4 góc nhìn từ chỗ xuất hiện về 4 cổng (bước 8c):** **Thấp < 300.000** (và dưới 150 draw call), **Vừa < 1.000.000, Cao < 1.500.000**. Lý do nâng Vừa và Cao: Intel UHD (đồ họa tích hợp) chạy 590.000 tam giác ở 180 đến 250 FPS, nên 600.000 là quá chặt; máy yếu đã có "Tự động" (điện thoại, ít nhân CPU hay ít RAM thì Thấp) và tự hạ mức khi FPS dưới 40 trong 3 giây đầu. Đo ở bản dev (Chrome, 1280×720, `window.__marketStats`): Thấp tối đa 295.007, Vừa tối đa 770.053, Cao tối đa 961.559 tam giác; draw call 38 đến 47 / 62 đến 70 / 62 đến 71. Góc "khó" (sát cổng Dệt nhìn cả chợ, không phải góc thường gặp): Thấp 368.063 (vượt), Vừa 826.188, Cao 1.194.690. Đứng cách cổng 20 đơn vị nhìn vào cổng: Thấp 120.000 đến 151.000, Vừa 452.000 đến 460.000, Cao 631.000 đến 681.000.
- **Nạp trước cảnh (bước 8c, `three/SceneWarmup.tsx`):** trong màn hình tải, sau khi mọi model (kể cả mọi bậc chính, vừa, xa) đã tải và gắn vào cảnh, `warmUp` bật tạm mọi vật ẩn (mỗi `InstancedMesh` 0 bản được đặt 1 bản), gọi `renderer.initTexture` cho mọi texture, `renderer.compile` biên dịch shader và vẽ một khung hình (đẩy hình học lên GPU, biên dịch cả shader bóng), rồi hoàn lại; mất 45 đến 60 ms. Nhờ vậy lúc đi, đổi bậc model không phải nạp hay biên dịch thêm. `?warmup=off` tắt để so sánh. Đo đi chạy một vòng 40 giây ở bản build (vsync 144 Hz): không nạp trước có 4 đến 9 khung hình trên 33 ms (lâu nhất 194 ms, FPS thấp nhất trong 1 giây là 90 đến 133); có nạp trước còn 1 khung (khoảng 55 ms lúc bắt đầu đi, không phải đổi bậc) và FPS thấp nhất 123 đến 138. Thời gian tải tăng khoảng 1 giây.
- **Bóng bám theo người chơi** (mốc 2, bước 8; `three/shadowFocus.ts`, `DayLight` có `followPlayer`, `Scene3D` có `shadowFollowPlayer`): máy ảnh bóng của mặt trời chỉ phủ vùng **nửa cạnh 25** quanh người chơi (`SHADOW_RANGE`), tâm vùng làm tròn theo texel của bản đồ bóng (`snapToLightTexel`) nên bóng không nhấp nháy khi đi. Vật nhân bản không đổ bóng bằng bản chính (nặng 50.000 đến 67.000 tam giác) mà bằng **bản xa** ở một `InstancedMesh` chỉ để đổ bóng (`castShadow`, ẩn khỏi lượt vẽ chính bằng `onBeforeRender` đặt số bản về 0), và chỉ cho vật trong 25 quanh người chơi mà còn chạm khung nhìn nở thêm 8 (`selectShadowCasters`: bóng của vật ngoài khung nhìn mà sát vẫn rơi vào khung nhìn). Bản chính và bản xa của lượt vẽ chính chỉ nhận bóng. **Bụi tre không đổ bóng** (nặng 7.900 tam giác mỗi bụi, bóng ít giá trị). Nhân vật, sàn cầu tàu đổ bóng như thường; vật không nhân bản nằm ngoài máy ảnh bóng thì three tự bỏ.

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

**Clip `hang` (KHÔNG dùng nữa, mốc 3 sửa sau B4):** hông ở thấp hơn hẳn (y ≈ −0,07 trong file, so với 0,44 của clip khác). Xem ở `/dev/3d` thì clip "hanging from a horizontal bar with both arms straight up above" của `hoc-sinh-nam` cho tư thế **ngồi co, tay ôm mặt**, không phải treo tay dưới xà, nên không dùng được. Tư thế treo do code dựng bằng xoay xương: `hang` ở mục 3.3 (màn 12). Clip vẫn nằm trong file model và trong `CLIP_NAMES`, chỉ không có chỗ nào phát nó.

**Dùng chung clip:** mọi model có xương đều là bộ xương Mixamo 65 xương, cùng tên. Vì vậy clip của model này phát được trên model khác. Ví dụ Tí cần `walk` thì mượn của học sinh. `<Character clips={[…]}>` chỉ tải model cho mượn khi thiếu clip (thứ tự cho mượn: học sinh, Tí, bà cụ, chú nông dân); nên liệt kê đúng các clip cần dùng.

### 3.3 Tư thế code tự dựng (xoay xương Mixamo)

| Tư thế | Cách làm | Thời lượng |
|---|---|---|
| `sad` | `Head` cúi xuống 20°, `Spine2` gập 10°, hai vai rũ | 1 giây |
| `point` | Xoay `RightArm` và `RightForeArm` hướng về mục tiêu (đáp án đang rê chuột) | Đến khi rời chuột |
| `slide` | Ngả `Spine` về sau 35°, hạ `Hips` xuống 0,5 | 0,6 giây |
| `swing` | `RightArm` quét một vòng cung từ trên cao xuống | 0,25 giây |
| `hurt` (Tí) | Nảy lên 0,3; hai tay vòng ra sau, ôm mông; rung | 0,6 giây |
| `hang` (học sinh, màn 12) | Hai tay (`LeftArm`, `RightArm`) giơ thẳng lên trên đầu (−185° quanh X: −175° của điểm đầu `swing` cộng 10° vì tay idle hơi chúi tới trước), hai bàn tay cách nhau chừng 0,25, cẳng tay thẳng; thân thẳng; hai chân duỗi, thả lỏng, hơi khép, mũi chân chúc xuống; đung đưa quanh bàn tay ±4°, chu kỳ 1,6 giây | Đến khi thả (như `point`) |

Mỗi tư thế trộn với clip đang chạy, vào ra mượt trong 0,1 giây.

**Cách làm** (`three/poses.ts` thuần, `three/PoseLayer.ts` áp lên xương):
- Độ lệch là góc cộng thêm lên xương **sau khi** `AnimationMixer` chạy, tính trong **hệ tọa độ của nhân vật** (+Z là hướng mặt, +X là bên trái nhân vật, quay quanh +X dương là cúi tới trước), rồi đổi sang hệ cục bộ của từng xương: `local' = P⁻¹·C·R·C⁻¹·P·local`. Nhờ vậy "cúi đầu 20°" luôn là cúi tới trước dù trục xương Mixamo thế nào.
- **Thứ tự mỗi khung hình: `layer.restore()`, `mixer.update(dt)`, `layer.update(now, dt)`.** `PropertyMixer` của three chỉ ghi lại xương khi giá trị clip đổi so với khung trước; nếu không trả xương về giá trị gốc thì độ lệch cộng dồn từng khung (hông lún dần xuống đất).
- Trọng số: vào 0,1 giây, giữ, ra 0,1 giây (`poseWeight`); `point` giữ đến khi thả (`heldWeight`).
- Số độ cao tính theo đơn vị cảnh (nhân vật cao 1,7): `slide` hạ `Hips` 0,5, `hurt` nảy 0,3. **Thêm so với bảng:** khi `Hips` hạ thì đùi ra trước góc a và gối gập 2a (a = arccos((L − hạ)/L), tối đa 75°, L là chiều dài chân) để bàn chân vẫn chạm đất, nếu không chân lún dưới sàn.
- `swing`: `RightArm` quét từ -175° (trên cao) xuống -20° (trước người) quanh trục X của nhân vật trong 0,25 giây, thêm khuỷu và thân hơi theo.
- `hurt` chỉ có tác dụng với Tí (`isPoseAllowed`).
- `hang` (`<Character hang hangSway>`, `three/poses.ts` `HANG`, `addHang`, `hangSway`, `three/PoseLayer.ts` `setHang`): tư thế GIỮ như `point` (vào 0,1 giây, giữ đến khi `hang` = false), không nằm trong `POSE_NAMES`. Làm trên clip `idle`. Mọi xoay đo ở `/dev/3d` (nút "hang", đo vị trí xương bàn tay sau khi đặt tư thế): hai bàn tay cách 0,245; cánh tay lệch khỏi phương thẳng đứng không quá 9° sang bên và 4° ra trước; lòng bàn tay cao 1,62 trên chiều cao 1,7 (`HANG.handsRatio` = 0,95: chỗ đặt tay nắm là độ cao chân + 0,95 × chiều cao).
  - **Thân và chân được ghim** (`HANG_PINNED_BONES`: `Hips`, `Spine`, `Spine1`, `Spine2`, đùi, cẳng chân, bàn chân) về xoay gốc của bộ xương trước khi cộng độ lệch, vì clip `idle` bên dưới đổi chân liên tục (hai bàn chân lúc dang lúc khép trong khoảng 0,2). Vì thế thêm `leftFoot`, `rightFoot` vào `BONE_KEYS`.
  - **Đung đưa** xoay cả người quanh bàn tay: `motion.rotation.x` = ±4° × sin(2π t / 1,6) và dời `motion` để điểm quay (cách chân `handsRatio` × chiều cao) đứng yên. "Giảm chuyển động" thì không đung đưa (`hangSway={false}`); tư thế vẫn giữ.
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

**Bản làm (mốc 2, bước 15a):** `/dev/portraits` (`three/DevPortraits.tsx`, khung chọn ở `three/portraitFrame.ts`, hàm thuần có test):
- Một khung vẽ 512×512, nền trong suốt (hiện trên nền ô caro), ánh sáng riêng (không có trời), nhân vật đứng tư thế `idle`. Camera nhìn góc 3/4 (lệch 25°, cúi 4°, góc nhìn dọc 24°) vào 35% phía trên **khối bao đo thật của tư thế đang đứng** (đo bằng `Box3` chính xác có xương), chừa viền 6% mỗi phía. Bà cụ lấy 48% (đầu to hơn các người khác, 35% chỉ còn mặt). Bi là khối do code dựng nên lấy cả khối.
- Nút bấm từng tên hoặc "Tai tat ca" tải về các PNG. Chạy dev còn có `window.__portraits` (`names`, `select(tên)`, `capture()`) để chụp tự động bằng trình duyệt.
- Đã thay 10 chân dung nhân vật và thêm `bi` (khối 3D thay cho hình SVG `BiAvatar` ở `PortraitFrame`, vì có `ui/portraits/bi` thì dùng ảnh); `bac-an-cuoi` (dùng khi lời thoại ở trạng thái vui) chụp cùng model ở tư thế nghiêng đầu nói chuyện (`mood: 'talking'`) cho cùng kiểu ảnh với `bac-an`. 5 người phụ (giang, hoa, khang, lan, minh) giữ nguyên. Ảnh cũ cắt từ ảnh gốc ChatGPT (nền trắng) không còn dùng.
- `pnpm crop-portraits` bỏ qua 10 chân dung đã chụp từ 3D (danh sách `da_co_anh_3d` trong `scripts/portrait-crops.json`), thêm `--force` để cắt lại từ ảnh gốc.

### 3.7 Điều khiển ở cảnh đi lại (A)

| Thiết bị | Điều khiển |
|---|---|
| Máy tính | **Bấm vào khung để khóa chuột** (pointer lock), rê chuột xoay camera quanh nhân vật (kiểu PUBG); W/↑ đi về phía camera nhìn, A/D/S (và ←/→/↓) quay người đi về hướng đó; Shift chạy; Space nhảy; E tương tác; **Esc nhả chuột và mở menu**; **M mở bản đồ lớn** (mục 3.10) |
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
  - Bấm (chuột) vào khung thì `requestPointerLock({ unadjustedMovement: true })` ngay trong sự kiện `pointerdown` (chuột "thô", không qua gia tốc của hệ điều hành); trình duyệt không hỗ trợ (`NotSupportedError`) thì xin lại bằng cách thường. Bấm được cả lúc chưa khóa lần nào.
  - **Mới vào, chưa khóa lần nào:** chỉ hiện một dòng nhắc nhỏ **"Bấm để điều khiển"** giữa màn hình, không che cảnh; hộp Menu đầy đủ chỉ hiện khi nhả khóa **sau khi đã chơi** (`useWalkSession`, `WalkLockOverlay` dùng chung cho /dev/walk và /cho).
  - **Nhả khóa** (Esc, chuyển cửa sổ, bất cứ lý do gì) mà không có hộp thoại thì **hiện menu tạm dừng** có dòng **"Bấm để chơi tiếp"**; bấm vào khung hoặc nút đó thì khóa lại và menu đóng. Chrome từ chối khóa lại ngay sau khi vừa nhả bằng Esc (khoảng 1 giây): bắt lỗi `pointerlockerror` và Promise bị từ chối, hiện lại lời nhắc, không báo lỗi.
  - **Mở hộp thoại (E)** thì tự nhả khóa để bấm được lựa chọn; **đóng hộp thoại** thì xin khóa lại ngay trong chính sự kiện bấm (nút "Tiếp"/"Bỏ qua", hay Enter/Space). Đóng bằng Esc thì Chrome có thể từ chối (Esc không tính là thao tác của người dùng): khi đó hiện menu với "Bấm để chơi tiếp".
  - Không có khóa chuột (điện thoại, trình duyệt cũ): Esc bật tắt menu như trước (`onMenu`), nút "Tiếp tục".
  - Tạm dừng (chưa khóa, hộp thoại hoặc menu): nơi dùng truyền `paused` cho `WalkControls` và `WalkWorld` (thả hết phím, bỏ lệnh); phím khác bị bỏ khi tạm dừng.
- **Vật cản theo chân tường thật (bước 7b)** — mỗi model môi trường có vật cản dựng từ phần chân tường, KHÔNG dùng khung bao cả model (mái chìa ra rộng hơn tường):
  - Lấy mặt model (sau khi áp cỡ chiều cao) ở khoảng **0–1,5 đơn vị tính từ mặt đất**, rải điểm lên bề mặt tam giác, rồi dựng hình bao sát: vòng tròn hoặc hộp, hoặc vài hộp ghép (cổng làng: hai chân cổng, lối giữa để trống). Hộp xoay (`obox`) là loại vật cản thứ ba của `collision.ts` (tâm, nửa cạnh, góc xoay như `rotation.y` của three).
  - Bảng hình nằm sẵn ở `three/cho/footprints.ts` (hình ở tỉ lệ 1, trong hệ tọa độ model); `footprintObstacles(id, x, z, yaw, scale)` đổi sang vật cản trong cảnh. **Sinh lại bảng khi đổi model:** `GEN_FOOTPRINTS=<đường dẫn.json> pnpm vitest run packages/core/src/three/cho/footprintGen.test.ts` (ghi json và bản báo cáo `.txt`), rồi dán vào `footprints.ts`.
  - Yêu cầu có test với GLB thật: hình phủ ≥ 90% diện tích chân tường và không thừa quá 0,3 đơn vị ra ngoài; ≥ 98,5% điểm chân tường nằm trong hình; lối cổng rộng ≥ 1,0.
  - `/dev/walk` dùng hình đúng bằng hình dựng (cột, hộp, biển gỗ, hòm thư).
- **Mặt đi được cao hơn 0 (bước 7b)** — `World.groundHeight(x, z)` (hàm thuần, mặc định 0). Đứng trên mặt đó khi không nhảy; nhảy và rơi tính từ độ cao đó; xuống chỗ thấp hơn quá `DROP_SNAP` (0,12) trong một khung hình thì rơi tự do. Ở chợ: `groundHeight` ở `cho/marketLayout.ts`, mặt đất 0, cầu tàu cao `DECK_TOP` = 0,45, dốc lên dài 2 ở đầu cầu (x từ −32 tới −34).
- **Xem vùng va chạm:** thêm `?debug=colliders` vào URL (`/cho`, `/dev/walk`) thì vẽ khung lưới đỏ cho mọi vật cản (cao tới 1,5), lưới cam cho mặt cầu tàu (theo `groundHeight`), vòng xanh cho người chơi. Ở `/cho` thêm `?cam=free` (kèm `window.__freeCam`) để đặt camera soi từng chỗ. Chỉ để kiểm tra bằng mắt.
- **Cổng làng (bước 8):** cổng cao **6** (trước là 5). Lối đi giữa nới tới **2,4** giữa hai vật cản (`GATE_OPENING`, `openGate` cắt mép trong hai chân cổng ra ngoài; chân cột thật hở 1,6 đến 2,2 nên nhân vật chạm nhẹ vào mép cột khi đi sát, chấp nhận được); thân người (bán kính 0,4) đi lọt dải rộng 1,6. Cổng đóng có thêm vật cản mỏng chắn kín lối (`gateBarrierObstacle`). Cây đa: vật cản chỉ là hình tròn bán kính 2,5 quanh gốc chính (`TREE_TRUNK`, tâm (0,27, −0,18)); rễ phụ đi xuyên được.
- **Cây đa (bước 8d):** model có nền rễ to nhô cao quanh gốc (gò thoải lên cao khoảng 1,2 ở giữa); vật cản là các hộp bao sát mép nền (sinh bằng `footprintGen` từ điểm chân thật 0–1,5, bỏ rễ mảnh thò ra ngoài bằng `removeThinFeatures`, 34 hộp, thừa không quá 0,3), nên người chơi không đi lên nền rễ được (dừng cách gốc 5,2 đến 6,7). Chum vại đặt sẵn trên nền rễ là phần của model (cảnh, không tới được). Thân chính (hình tròn bán kính 2,5) chỉ là vật chắn camera cao 12, để camera không bị cả nền rễ rộng 6 kéo lại. Lều chợ tự xếp ra ngoài nền rễ (khoảng cách xếp tính theo bán kính 6,7).
- **Đồ nhỏ do code dựng có vật cản sát hình (bước 8d):** vật cao hơn 0,3 đều có vật cản (`PROP_SIZES`, `propCollider`): chum, đống rơm, thúng, đá bờ sông, cuộn vải có vật cản tròn; chồng giấy, khối đá, bàn đá khắc, hòm có vật cản hộp xoay. Khóm hoa (0,8 nhưng thấp bụi) và chân giá phên không có vật cản (đi qua được). **Hàng rào tre là chuỗi hộp xoay mỏng** (nửa bề dày 0,08, cao 1,35) theo từng đoạn giữa hai cột (`fenceColliders`, khoảng 100 đoạn); thanh ngang nằm theo tiếp tuyến vòng (đã sửa: trước đó thanh ngang và vật cản quay nhầm theo bán kính). Thuyền nằm trên nước nên đã có vật cản của sông. Hiện đủ trong `?debug=colliders`.
- **Bi sau vai phải theo camera (bước 8d):** ở cảnh đi lại Bi bay theo góc nhìn của camera chứ không theo hướng mặt người chơi: lệch sang phải màn hình 1,6, lùi về phía camera 1,1, cao 1,1 so với chân (ngang ngực, thấp hơn đầu 1,7), nên luôn ở góc dưới phải cạnh người chơi, không che giữa màn hình và không đè lên cổng ở phía trước (`BI_CAMERA_OFFSET`, `biCameraOffset`, `Bi` có `cameraYaw`).
- **Xà ngang cổng (bước 8):** `CameraBlocker` có thêm `base` (đáy khối; mặc định 0). Mỗi cổng có một hộp xoay vắt qua lối đi từ đáy xà (1,9 đến 2,3 tùy cổng, `GATE_LINTELS` đo từ model) tới đỉnh cổng; camera đi dưới xà thì được, đi xuyên qua xà thì bị kéo lại. Hộp xà chỉ chắn camera, không chắn người đi.
- **Vật dự phòng (bước 8):** `Interactable.fallback`: chỉ được chọn khi trong bán kính 2,2 không có vật thường nào (Bi luôn bay sát người chơi nên là vật dự phòng; đứng cạnh cổng hay dân làng thì E là cổng hay dân làng).
- **Dân làng nhường đường (bước 8, `wander.ts`):** đang đi mà người chơi đứng chắn trong **1,5** phía trước (góc ±60° so với hướng mặt) thì dừng lại (clip `idle`), quay mặt về người chơi và chờ; người chơi tránh xa quá 2,0 trong 0,6 giây thì đi tiếp; chờ quá **3 giây** mà vẫn bị chắn thì đi vòng 1,8 giây (lệch hướng 69° sang bên không có người chơi). `hold`: người chơi đang nói chuyện thì đứng yên, quay mặt về người chơi. `stepWander(…, other, hold)`.
- **Camera tránh vật cản** (`cameraCollision.ts`, hàm thuần có test): từ điểm nhìn (ngang ngực nhân vật) tới vị trí camera mong muốn, nếu đoạn thẳng cắt một vật cao (nhà, cổng, cây, lều, tre, giếng, đống rơm; khối thẳng đứng nở thêm 0,5) thấp hơn đỉnh của nó thì kéo camera lại gần, dừng ở mép vật; không bao giờ gần nhân vật hơn 1,8. Vào nhanh, ra chậm (độ gắt 3), rồi kiểm tra lại vị trí đã làm mượt để không cắt góc tường. Cổng chỉ chắn ở hai bên (tháp và tường), lối giữa để trống. `WalkWorld` nhận `cameraBlockers`.
- **Bi:** bay theo sau vai **phải** của người chơi. Nhân vật quay mặt +Z nên bên phải của họ là −X: `BI_FOLLOW_OFFSET = [−0,75, 2,0, −0,55]` (bước 3 từng đặt +0,75, là vai trái, đã sửa).

### 3.8 Hướng dẫn chơi (mốc 2, bước 16)

Hộp "Hướng dẫn chơi" (`ui/GuideDialog.tsx`) chia **phần**, mỗi phần **2 đến 5 trang** (phần Đi lại có 5 trang từ bước X4: thêm trang "Bản đồ nhỏ", hình vẽ `ban-do-nho`), mỗi trang **một hình và 1 đến 2 câu ngắn**. Nội dung ở `content/huongDan.ts` (`GUIDE_SECTIONS`), hàm thuần có test (`huongDan.test.ts`).
- **6 phần** (thứ tự và mã cố định vì cờ lưu theo bit): Đi lại và camera (`di-lai`); Nói chuyện, cổng làng, biển gỗ (`noi-chuyen`); Trang bài học (`bai-hoc`); Màn 2 (`man-2`: đổi làn, nhảy, trượt, vật nhặt, câu hỏi); Màn 3 (`man-3`: kéo thẻ, soi công thức, rổ trang giả); Trang Sổ Vàng và tiến độ (`trang-vang`).
- **Hộp chung chỉ có 2 phần (bước X1):** nút ? ở HUD và mục trong Menu mở hộp chỉ gồm **Đi lại và camera** và **Nói chuyện, cổng làng, biển gỗ**. Bốn phần còn lại (Bài học, Màn 2, Màn 3, Trang Sổ Vàng) đánh dấu `rieng: true` trong `GUIDE_SECTIONS`: không có trong hộp chung, nhưng vẫn giữ nguyên chỗ và mã. Nút "Hướng dẫn chơi" ở thẻ bắt đầu màn 2, màn 3 vẫn mở phần riêng của game đó, và khi đó hộp chỉ có đúng phần ấy (không có hàng nút chọn phần). Chọn phần hiện trong hộp bằng hàm thuần `guideSectionsFor(id)`.
- **Lời và ảnh khớp thế giới mở (bước X1):** mũi tên vàng nằm dưới chân (chỉ đường theo đường đất); cổng mở thì đi thẳng qua, không bấm E; cổng đóng (then gỗ, dây đỏ) đứng gần và bấm E (điện thoại: nút bàn tay) để nghe lý do; có biển chỉ đường gỗ ở lối ra chợ; bấm E ở bác An nghe lời nhắc. Ảnh chụp thật ở bước W2 đã khớp (`cho-di-lai` có mũi tên dưới chân, `cong-mo` là cổng mở nhìn thẳng vào làng), nên không chụp lại.
- **Trang "Tìm thẻ Em có biết" (bước X3):** nằm trong phần **Đi lại và camera**, hình vẽ `cuon-giay` (cuộn giấy phát sáng, `GuideArt.tsx`): cuộn có chùm sáng thì đi tới và bấm E; có lời riêng cho máy tính và điện thoại.
- **Theo thiết bị:** mỗi trang có lời cho máy tính (`may`) và cho điện thoại (`dt`, bỏ trống thì dùng chung), hình cũng có thể khác (`hinhDt`: phím W A S D ↔ cần điều khiển, chuột ↔ vuốt, phím ← → ↔ vuốt ngang…). Nhận thiết bị bằng `(pointer: coarse)`; test kiểm lời điện thoại không nhắc phím hay chuột và lời chung không nhắc riêng một thiết bị.
- **Hình:** (1) ảnh chụp thật từ game, `ui/huong-dan/<id>` (10 ảnh, WebP 960×540, quy tắc `assets:build` riêng, không dò dấu ngôi sao), do `pnpm guide:capture` tự chụp bằng Chrome (tự bật máy chủ dev còn thiếu, cookie khách đặt sẵn tiến độ và cờ "đã xem" để không hộp nào chen vào, ẩn HUD bằng thuộc tính `data-hud` và `data-walk-ui` khi chụp cảnh đi lại, riêng ảnh `hud-trang-vang` chụp cả HUD rồi cắt góc trên phải). Ảnh chụp trang 2D (trang bài học, màn 2, màn 3, bản đồ) vẫn có chữ của chính giao diện game; (2) hình minh họa SVG do code vẽ (`ui/GuideArt.tsx`, 16 hình trong khung 320×180: phím, chuột, cần điều khiển, vuốt, 3 làn, nhảy và trượt, kéo thẻ vào ô, soi thẻ, rổ trang giả, sao, bóng đèn, bốn trang): không có chữ trong hình ngoài tên phím (`huongDan.phim`). Xem tất cả ở `/dev/guide` (hub, chỉ khi chạy dev).
- **Chỗ mở:** nút **?** ở HUD cạnh Menu (`MarketHud`, `onGuide`; chợ và cảnh làng), mục **"Hướng dẫn chơi"** trong Menu (`MarketMenu`, `onGuide`), và nút ở **thẻ bắt đầu của `MiniGameLevel`** (mở thẳng phần của game: `guideSectionOfLevel`, màn 2 và 3). Hộp có nút chọn phần, "Trước"/"Tiếp" (hoặc phím ← →), "Đã hiểu" ở trang cuối, Esc hoặc ✕ để đóng. Khi mở ở cảnh đi lại thì nhả khóa chuột, đóng thì khóa lại. `VnDialog` có thêm thuộc tính `noSkip` (bước X1): không có nút "Bỏ qua" và Esc không làm gì, dùng cho cốt truyện đọc bắt buộc lần đầu.
- **Lần đầu vào chợ** tự mở phần "Đi lại và camera" một lần; lưu `game_state.data.guideSeen = { "<id phần>": true }` (chơi thử: trường `hd` của cookie `sc_guest`, một bit mỗi phần theo thứ tự `GUIDE_SECTION_IDS`; `progress/guideFlags.ts`, có test). Chờ chuỗi mở cổng (nếu có) xong, không chen lên hộp thoại khác.
- **Thêm phần mới ở mốc 3, 4:** thêm một đối tượng vào CUỐI `GUIDE_SECTIONS` (id, nhãn, tiêu đề, trang, `man` nếu có màn mở thẳng phần đó); ảnh chụp mới thì thêm id vào `GUIDE_SHOT_IDS` và một bước chụp ở `scripts/guide-capture.mjs`; hình vẽ mới thì thêm id vào `GUIDE_ART_IDS` và một hàm vẽ ở `GuideArt.tsx`. Không đổi thứ tự hay xóa phần cũ (cờ lưu theo bit). Test bắt mọi hình chưa dùng, id sai, trang quá dài.

### 3.9 "Em có biết?" khi vào làng (mốc 2, bước 16)

- **Thành phần dùng chung `ui/EmCoBietDialog.tsx`** (trang bài học 2D và cảnh làng 3D dùng chung; nút "Em có biết?" ở trang bài học giữ nguyên): mỗi lần một thẻ, "Thẻ n/tổng", "Trước", "Tiếp", ở thẻ cuối nút đổi thành `finishLabel` ("Đóng" mặc định, "Vào làng" khi tự hiện lúc vào làng).
- **Nội dung không viết lại:** `villageKnowCards(làng)` (`content/villageCards.ts`) trả `emCoBiet` của bài học làng đó (`bai1Lesson` … `bai4Lesson`); thẻ chỉ có ở trạm Khó (`emCoBietKho`) không đưa vào. Mốc 3 chỉ cần cảnh làng mới truyền đúng `VILLAGE_SCENE` của làng đó, thẻ đã có sẵn cho cả 4 làng.
- **Cờ chiếu một lần:** `game_state.data.knowSeen` (chơi thử: trường `ks`, một bit mỗi làng), `shouldShowKnow` ở `progress/villageIntro.ts`, có test. Thứ tự lần đầu vào làng: cảnh mở đầu → "Em có biết?" → (nếu có Trang Sổ Vàng chưa trao) cảnh trao trang. Menu làng có mục "Em có biết?" xem lại bất cứ lúc nào.

#### Thẻ rải trong làng (mốc 2, bước X3)

Làng có thẻ rải (hiện chỉ Làng Giấy: `LOCAL_VILLAGES[...].scrolls`) **không** tự bật hộp "Em có biết?" lúc vào nữa; mỗi thẻ của Bài 1 là một **cuộn giấy phát sáng** đặt ở bốn khu xa nhau trong làng, em phải đi tìm.
- **Cuộn giấy** (`three/village/KnowScrolls.tsx`): cuộn nhỏ lơ lửng có chùm sáng mảnh (hình trụ cộng sáng `AdditiveBlending`, `fog: false`, không bóng đổ, không ánh sáng điểm) cao 36 để thấy từ xa. Tới gần bấm **E** (hoặc nút bàn tay) thì mở `EmCoBietDialog` đúng MỘT thẻ (nút cuối là "Cất vào sổ"), đóng hộp thì thẻ cất vào sổ, chùm sáng tắt, hiện thông báo "Thẻ đã được cất vào sổ của em (n/4)".
- **Cờ lưu:** `game_state.data.knowCards = { "<làng>": <mặt nạ bit theo thứ tự thẻ> }` (chơi thử: mảng `kc` trong cookie `sc_guest`). Hàm thuần ở `progress/knowCards.ts` (có test): `withKnowCard`, `mergeKnowCards` (hợp bit, không mất khi gộp tài khoản và thiết bị), `effectiveKnowMask`, `knowCardsComplete`. **Coi là đủ** khi: đủ bit, hoặc đã xong màn đầu của làng, hoặc cờ cũ `knowSeen` của làng đó đã bật (người chơi cũ không bị chặn). Giáo viên không bị chặn.
- **Chặn biển bài học:** khi chưa đủ thẻ, MỌI biển bài của làng (màn 1, 2, 3) hiện như đang khóa; bấm E ở biển hiện "Em hãy tìm đủ thẻ Em có biết trong làng (n/4)" (luật mở màn theo tiến độ vẫn như cũ khi đã đủ thẻ). Dòng nhiệm vụ ở HUD: "Tìm thẻ Em có biết: n/4"; đủ thì chuyển sang "Đến biển …" như cũ.
- **Mũi tên dưới chân** chỉ tới cuộn **chưa nhặt gần nhất** (theo đường đi, `nearestScroll` ở `three/village/scrollTargets.ts`), đủ thì chỉ biển kế tiếp. Bi gợi ý KHU (xưởng làm giấy, sân đình, ao, chợ nhỏ), không chỉ đúng chỗ.
- **Menu "Em có biết?"** (`ui/KnowCollectionDialog.tsx`): liệt kê thẻ đã nhặt, thẻ chưa nhặt hiện "?".
- **Trang `/ban-do`:** thẻ giới thiệu làng (`VillageIntro`) hiện luôn 4 thẻ; phải lật hết thì mới có nút "Vào" (đặt cùng cờ `knowCards` bằng `markAllKnowCards`). Làng chưa có thẻ rải dùng luật cũ (`knowSeen`).
- **Mốc 3:** làng khác chỉ cần thêm `scrolls` (vị trí, thẻ thứ mấy, khu) vào bố cục của làng; chặn, mũi tên, hộp thoại, lưu cờ đều dùng chung.

### 3.10 Bản đồ nhỏ và bản đồ lớn ở thế giới mở (mốc 2, bước X4)

Mã ở `packages/core/src/three/world/map/`. Chữ ở `content/minimap.ts` (`banDoNho`) và `ui.caiDat.banDoXoay`. Không dùng camera 3D thứ hai: vẽ SVG 2D từ dữ liệu bố cục có sẵn (`WorldLayout`).
- **Bản đồ nhỏ** (`MiniMap.tsx`): góc trên trái, dòng nhiệm vụ nằm ngay dưới (`MarketHud`, prop `map`). Hình tròn, cỡ **180px** trên máy tính, **120px** trên điện thoại (`(pointer: coarse)`), "Chữ to" nhân 1,15 (`miniMapSize`). Là một nút bấm (có `data-walk-ui`, không che cần điều khiển hay nút Menu). Hướng bắc luôn ở trên, có chữ **B** nhỏ ở mép; trong Cài đặt có **"Bản đồ xoay theo hướng nhìn"** (`Settings.rotateMap`, mặc định tắt): bật thì bản đồ xoay để hướng em nhìn ở phía trên, chữ B đi theo hướng bắc, mũi tên học sinh luôn chỉ lên.
- **Thu phóng:** ở ngoài làng bán kính nhìn **88** (ở chợ thấy cả 4 lối ra, cổng cách tâm chợ 72); trong làng (đã qua cổng) bán kính **60** quanh em (`viewRadiusFor`).
- **Vẽ:** phần tĩnh (`MapStaticLayer`, `mapGeometry.ts`) gồm chợ và sân chợ, đường (gộp theo bề rộng và loại, đường gạch trong làng khác màu đường đất), sông (thân và hai nhánh) và cầu, ao, nhà (ô vuông nhỏ), viền lũy tre Làng Giấy (nét liền) và viền chỗ dành của ba làng chưa dựng (nét đứt). Ký hiệu (`mapMarkers.ts`, `MapGlyphs.tsx`; khác nhau về HÌNH chứ không chỉ về màu): cổng (ô vuông có vòm, **mở** màu xanh, **khóa** màu xám có ổ khóa); biển màn chơi (hình tròn: **xong** xanh có dấu ✓, **đang mở** vàng có mũi tên, **khóa** xám có ổ khóa, **sắp ra mắt** viền đứt ba chấm); thẻ "Em có biết?" **chưa nhặt** (hình thoi vàng; chỉ hiện khi em đang ở trong làng đó, thẻ đã nhặt biến mất); **điểm đến của nhiệm vụ** (vòng đỏ, đúng nút mà mũi tên dưới chân đang chỉ tới, `targetNodeId`; nằm ngoài vòng thì kéo về mép kèm mũi tên chỉ hướng); tên làng (tên ngắn "Giấy", "Dệt"… ở bản đồ nhỏ); mũi tên tím của em xoay theo hướng nhìn của camera. Bản đồ nhỏ chỉ hiện biển của làng em đang ở.
- **Cập nhật:** phần tĩnh dựng một lần (`memo`). Mười lần mỗi giây (`MINIMAP_TICK_MS` = 100) một vòng đọc `api.player` (đối tượng trạng thái người chơi có sẵn, do `WalkWorld` gán vào `WalkApi`) và `api.camera.yaw`, rồi chỉ đổi thuộc tính `transform`/`display` của vài nhóm qua ref: **React không vẽ lại** (đã đo trên Chrome: đi 3 giây có 420 lần đổi `transform` và 0 lần đổi cây DOM). Không dùng `box-shadow`, `text-shadow` hay `filter` ở bản đồ (có test).
- **Hàm thuần có test** (`mapProjection.ts`, `miniMapFrame.ts`, `mapMarkers.ts`, `mapProgress.ts`, `mapGeometry.ts`): chiếu tọa độ thế giới sang bản đồ (Bắc = +Z ở trên, Tây = +X bên trái, Đông = −X bên phải; `staticTransform` khớp `project` từng điểm), xoay theo hướng nhìn, góc mũi tên, vị trí chữ B, kéo điểm về mép, chọn ký hiệu theo cổng, trạng thái màn, làng đang ở, thẻ đã nhặt, và tóm tắt tiến độ.
- **Bản đồ lớn** (`BigMap.tsx`): bấm **M** (máy tính) hoặc chạm bản đồ nhỏ (điện thoại, máy tính bấm cũng được) để mở; **Esc**, **M** hay nút **Đóng** để đóng. Mở thì nhả khóa chuột (`api.lock.exit()`) và điều khiển tạm dừng (tính như một hộp thoại đang mở trong `useWalkSession`); đóng bằng M hay cú bấm thì khóa chuột lại ngay (Esc không cho khóa lại, hiện lời nhắc như các hộp thoại khác). Phím M xử lý ở `WalkControls` (`onMap`, hành động `map` của `walkInput`); M không mở bản đồ khi đang có hộp thoại, thẻ "Em có biết?", hướng dẫn, cảnh trao trang, đang vào làng hay menu. Hiện cả thế giới (4 làng, đủ biển), chú thích ký hiệu, **tiến độ từng làng** (màn đã xong/tổng, thẻ "Em có biết?" đã nhặt/tổng với làng có thẻ rải, Trang Sổ Vàng đã nhận hay chưa) và dòng **"Việc tiếp theo: …"** (chính dòng nhiệm vụ ở HUD), chỗ em đứng lúc mở.
- **"Chữ to"** thì cỡ bản đồ nhỏ nhân 1,15 và chữ trên bản đồ theo cỡ rem của trang; **"Giảm chuyển động"** thì vòng đỏ điểm đến không nhấp nháy. **Giáo viên** thấy mọi thứ đã mở (cổng, biển mở như ở thế giới; không bị chặn thẻ).
- **Sửa kèm (lỗi của bước X3):** `placeVillage` làm rơi trường `kind` của đường nên đường gạch ở Làng Giấy chưa bao giờ được lát gạch trong cảnh 3D; đã giữ lại `kind`.
- **Số đo** (bản build, Chrome, Intel UHD, máy cắm điện, đi từ chợ vào Làng Giấy, 2 lượt mỗi mức, xen kẽ bản trước và sau): p50 **6,9 ms** mỗi khung (khoảng 145 FPS, chạm giới hạn của màn hình) cả trước lẫn sau ở mức Thấp và Vừa; khung chậm nhất trước/sau: Thấp 13,8 và 20,8 ms / 13,9 và 7,7 ms; Vừa 14,0 và 13,8 ms / 19,9 và 20,8 ms; không khung nào quá 50 ms.

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

**`VillageScene`** (cảnh làng 3D, **đã làm ở mốc 2 bước 9; từ bước W1 không còn cảnh riêng, làng là một vùng của `WorldScene` ngay bên dưới, giữ nguyên mọi quy tắc ở đây**: `packages/core/src/three/village/`, dùng chung mọi làng; mỗi làng chỉ đưa dữ liệu bố cục `VillageLayoutInput`, ví dụ `packages/village-lang-giay/src/scene/layout.ts`):
- Khu nhỏ, bán kính khoảng 20, có cổng làng và người dẫn đứng yên (không xương). Dùng lại `WalkWorld`, vật cản theo chân thật, ba bậc model chính/vừa/xa, nạp trước, HUD và menu như chợ; menu thêm "Về chợ".
- **3 biển gỗ** do code dựng, mỗi biển có icon, chữ và dải trạng thái ("Đã xong", "Khóa", "Sắp ra mắt"). Lại gần bấm E thì vào màn `/lang/<id>/man/<n>`.
- Biển còn khóa thì hiện "Hoàn thành … để mở" (kèm tên màn cần xong trước); biển "Sắp ra mắt" chỉ báo, không vào được và không chặn màn sau.
- **Nhiệm vụ:** dòng nhiệm vụ ở HUD và mũi tên trên đầu chỉ tới biển của màn đang mở đầu tiên (`villageQuest.ts`: `nextLevel`). Hết việc thì nhắc quay về chợ. Bấm E vào người dẫn hay Bi thì nhắc việc tiếp theo.
- **Cảnh mở đầu:** chiếu một lần khi lần đầu vào làng (ảnh truyện + lời người dẫn), có nút "Bỏ qua". Cờ đã xem lưu cùng tiến độ (`villageSceneSeen` trong `game_state.data`; khách là trường `vs` của cookie).
- Chữ nằm ở `content/villageScene.ts` (theo từng làng) và `ui.langScene`. Làng chưa dựng nội dung 3D (Dệt, Khắc Dấu, Bạc) có bản tối giản ở thế giới mở (xem `WorldScene`).

**`WorldScene`** (thế giới mở, **mốc 2 bước W1**: `packages/core/src/three/world/`, trang `WorldPage`, route `/cho` của hub; thay `MarketScene`, `VillageScene`, `LangGiayScene`):
- **Bố cục** (hàm thuần, có test: `worldLayout.ts`, `worldFrames.ts`): chợ ở giữa (bán kính 42, bố cục như spec 04 mục 3); 4 con đường đất dài 30 từ rìa chợ ra cổng làng; cổng làng cách tâm chợ 72. Tâm làng cách tâm chợ 72 + (khoảng cách cổng tới tâm làng): Làng Giấy (bước W2, bán kính 35, cổng cách tâm 35) ở 107; ba làng nhỏ (bán kính 21, cổng cách tâm 17,5) ở 89,5. Người chơi coi là đã vào làng khi cách tâm làng dưới `insideRadiusOf` (khoảng cách cổng − 1). Bắc Giấy (+Z), Nam Dệt (−Z), Tây Khắc Dấu (+X), Đông Bạc (−X; đường sang Bạc qua cầu gỗ bắc qua sông). Mỗi làng viết bố cục ở hệ tọa độ của làng rồi `placeVillage` xoay + dời ra thế giới; hệ tọa độ thế giới trùng hệ chợ. Biên đi lại bán kính 150.
- **Dùng lại** `WalkWorld`, vật cản, 3 bậc model, nạp trước, HUD, menu; `ModelInstances` dùng chung bộ nhớ hình học đã gộp (`getParts`/`retainParts`/`releaseParts`, đếm tham chiếu) nên vùng làng tải lại không dựng lại hình học.
- **Tải theo vùng** (`worldZones.ts`, `VillageZone.tsx`, `WorldTracker.tsx`): chợ và đường luôn có. Mỗi làng là một vùng: tải khi người chơi cách rìa làng dưới 50 (bước W3, trước đó 60: chỗ xuất hiện ở chợ cách rìa Làng Dệt 58,5 nên ngưỡng 60 tải vùng Dệt ngay lúc vào), dọn khi xa hơn 90 liên tục 3 giây (độ trễ để không tải rồi dọn liên tục). Vùng dựng dần mỗi 2 khung hình một phần (đồ nhỏ, biển gỗ, từng model, người dẫn sau khi model người dẫn đã làm ấm, cuối cùng dân làng đi lại).
- **Chuẩn bị sẵn** (bước W2, chọn lọc ở bước W3; `ZonePrewarm.tsx`, `warm.ts`, `worldZones.ts`): trước khi tải còn một bước chuẩn bị, **chỉ cho làng cần**: làng của nhiệm vụ hiện tại (luôn; nếu đang ở trong một làng thì làng đó), làng mà người chơi đã bước lên con đường dẫn tới (`onRoadTo`: cách tâm chợ từ 14 trở ra, lệch khỏi trục đường không quá 6), hoặc làng có rìa cách dưới 56 (`ZONE_PREWARM_DISTANCE`); bỏ chuẩn bị khi rìa xa hơn 100 (`ZONE_PREWARM_RELEASE`), trừ làng của nhiệm vụ. Hàm chọn là hàm thuần có test (`stepPrewarm`, `onRoadTo`). Lúc mới vào `/cho` không làng nào ngoài làng của nhiệm vụ được chuẩn bị (có test với chỗ xuất hiện mặc định). Cổng của làng chưa chuẩn bị xong chỉ vẽ bản xa (không tải bản chính và bản vừa, khoảng 5 MB cho 3 cổng); chuẩn bị xong mới đổi sang đủ ba bậc. Mục đích của bước chuẩn bị: để lúc vùng thật sự tải không còn việc nặng nào và không khung hình nào quá 50 ms (đo trên bản build thật, đi bộ từ chợ vào làng ở cả 3 mức: lớn nhất 33 ms). Gồm: (1) tải và giải mã mọi model của làng cùng model người dẫn; giải mã meshopt ở luồng phụ (`MeshoptDecoder.useWorkers`, `decoderWorkerCount`); (2) nướng hình học (`createPartsPrewarm`): từng model, mỗi lần một mesh trong ngân sách 6 ms của khung hình rảnh, và `buildParts` đổi hệ tọa độ bằng đúng một phép nhân ma trận; phần đã nướng giữ trong bộ nhớ đệm có đếm tham chiếu nên lúc dựng thật chỉ lấy lại; (3) biên dịch trước shader ở tiến trình GPU (`compileAsync`: vật liệu màu theo đỉnh của đình, cối, bếp là chương trình shader mới, nếu để tới lúc vẽ lần đầu thì khựng 40 đến 60 ms); (4) đẩy texture lên GPU, mỗi khung hình tối đa một cái (`initTexture`) và chờ 140 ms sau texture 2048 (`warmGapMs`) để GPU làm xong. Mặt đất, cổng, bản xa của làng (`VillageFar.tsx`, chỉ bản "xa" nhẹ, không tre ở mức Thấp) nằm ngoài vùng nên luôn thấy. Tới cổng mà vùng chưa dựng xong thì hiện "Đang vào làng…" (`ui.thegioi.dangVaoLang`).
- **Làng chưa dựng** (`villages/minimal.ts`): cổng đúng model, 3 nhà, 5 bụi tre, đủ 3 biển gỗ của làng lấy từ `levels.ts` (bài học và 2 game: màn 4–6, 7–9, 10–12) đứng vòng cung ở sân trước, quay mặt về cổng, dùng chung code biển của Làng Giấy (dải Đã xong / Khóa / Sắp ra mắt, bấm E vào màn; biển `coming-soon` chỉ báo, không chặn màn sau). Mỗi biển có nút đường riêng (chỗ đứng trước biển nối với ngã sân trước) để mũi tên dưới chân và bản đồ chỉ đúng (mốc 3, sửa sau B2). Cổng mở/khóa theo `unlock.ts`; cổng khóa có then gỗ và dây đỏ, thấy làng từ ngoài nhưng không vào được.
- **Mũi tên dưới chân** (`GroundArrow.tsx`, `roadGraph.ts`): mũi tên phẳng vẽ trên mặt đất trước người chơi, chỉ theo đường trên đồ thị đường (nút: tâm chợ, cổng, vòng quanh sân, biển trong làng) tới mục tiêu nhiệm vụ (`worldQuest.ts`: `targetNodeId`). Hàm chọn điểm kế tiếp `createRouter().next` là hàm thuần có test (Dijkstra; tiến tới điểm kế khi cách dưới 2,5; ngoài đường quá 4 thì nối về đoạn gần nhất). Ẩn khi cách mục tiêu dưới `ARROW_HIDE_DISTANCE`.
- **Biển chỉ đường** (`Signposts.tsx`): biển gỗ do code dựng ở lối ra chợ (cách tâm 45; đường Bạc 30, trước cầu), lệch 4,7 khỏi tim đường, có vật cản; mặt hướng ra ghi tên làng, mặt hướng về ghi "Chợ phiên". Chữ ở `ui.lang` và `ui.thegioi.bienChoPhien`.
- **Cảnh theo vị trí:** cảnh mở đầu và "Em có biết?" chạy khi lần đầu bước qua cổng làng (vào trong bán kính 16,5 quanh tâm làng, `worldZones.insideVillage`); cảnh mở cổng Dệt chạy khi tới gần cổng (12) lần đầu sau khi nhận Trang Sổ Vàng 1. Vào `/cho?tu=<id>` thì người chơi xuất hiện trong làng, cạnh các biển gỗ (`villageSpawn`); `?mo=<id>` giữ làm cách đưa người chơi tới ngay trước cổng vừa mở (`gateApproachSpawn`, 8,5) để kiểm tra.
- **Ngân sách (đo bằng Chrome, 28 chỗ × 4 hướng gồm chợ, đường và khắp Làng Giấy mở rộng, mọi chỗ đứng bình thường):** tam giác mỗi khung hình Thấp dưới 270.000 (bước W3, trước đó 300.000; xấu nhất đo 267.763), Vừa dưới 1.000.000 (954.904), Cao dưới 1.500.000 (1.237.020). Mức Thấp bớt lều (×0,6), bụi tre (×0,45), phên (×0,5), bản chính nặng chỉ dùng thật sát (`MARKET_NEAR_LOW_HEAVY`, phên luôn dùng bản xa), dân làng và lái buôn xa hơn 22 thì không vẽ (`VILLAGER_CULL`: Thấp 22, Vừa và Cao 38), mọi vật xa hơn `LOW_MAX_DISTANCE` (38, trước W3 là 52) không vẽ ở mức Thấp (vật ở gần người chơi, có va chạm, không bị ảnh hưởng); bụi tre xa quá không vẽ ở mức Vừa và Cao (`marketMaxDistance`: 90, 120). Mức Vừa bớt bụi tre (×0,75) và phên (×0,8). Phên phơi giấy: bản vừa (15.000 tam giác) chỉ thật gần (`MARKET_FAR_OVERRIDE`: Vừa 14, Cao 22) và chỉ vẽ tới `RACK_MAX_DISTANCE` (Thấp 40, Vừa 70, Cao 90). Hình dáng làng nhìn từ xa: tối đa 4 (Thấp) hay 6 nhà và 4 bụi tre mỗi làng (`farSilhouette`). Tải lần đầu `/cho` không quá 25 MB ở mọi mức (bước W3; đo, nhiệm vụ đầu là Làng Giấy: lúc cảnh sẵn sàng 15,9 MB (Thấp) và 16,3 MB (Vừa, Cao); sau khi chuẩn bị xong làng Giấy 20,1 MB (Thấp) và 21,5 MB (Vừa, Cao); trước W3 là 25,6 và 28,4 MB vì chuẩn bị cả 4 làng và tải đủ 3 bậc của 4 cổng); mỗi vùng làng thêm không quá 15 MB (Làng Giấy: người dẫn 1,7, phên 1,5, cổng bản chính và vừa 1,9: tổng 4,2 MB ở Thấp, 5,2 MB ở Vừa và Cao; Dệt 3,4, Khắc Dấu 1,9, Bạc 1,6 MB ở Vừa và Cao, chưa có người dẫn).
- **Cầu nối đo kiểm** (`lib/dev.ts`, `PROBE`): `window.__walkPlayer`, `__world`, `__zoneLog`… có khi chạy dev hoặc khi build bản đo với `VITE_PROBE=true` (`vite build --outDir dist-probe`); bản phát hành không có. Dùng để đo khung hình chậm ở bản build thật.
- **Chữ:** `content/ui.ts` (`ui.thegioi`). Dev: `window.__world`, `__walkPlayer`, `__loadedZones`, `__marketStats`... chỉ có khi chạy dev.

**Ước tính cho mốc 3** (3 làng còn lại có cỡ và mật độ như Làng Giấy; chỉ ước tính, chưa dựng):
- **Tải lần đầu** không đổi (20,1 MB Thấp, 21,5 MB Vừa và Cao khi nhiệm vụ đầu là Làng Giấy): chỉ làng của nhiệm vụ được chuẩn bị. Người chơi có nhiệm vụ ở làng khác thì tải làng đó thay Làng Giấy (cùng cỡ).
- **Mỗi vùng làng thêm** khoảng 4,0 đến 4,7 MB ở Thấp và 4,5 đến 5,3 MB ở Vừa và Cao: người dẫn (Dệt cụ Bình 1,33 MB, Khắc Dấu chú Dũng 1,33 MB, Bạc thầy Linh 1,83 MB) + cổng bản chính và vừa (1,15 đến 1,39 MB và 0,42 đến 0,51 MB) + chừng 1,5 MB model đồ nghề riêng của làng (Giấy: phên 3 bậc 1,5 MB; Dệt: khung cửi 1,8 MB đã có). Dưới 15 MB với dư lớn. Đi hết cả 4 làng trong một phiên: 20 + 3 × 4,5 ≈ 34 MB cộng dồn (trình duyệt lưu lại, mỗi lúc chỉ tải thêm một làng).
- **Tam giác xấu nhất trong một làng** như Làng Giấy: Thấp 268.000, Vừa 955.000, Cao 1.237.000. Đồ nghề riêng nặng gần người chơi (khung cửi 134.000 tam giác khi cách dưới 7 ở Vừa, 10 ở Cao; ở Thấp không bao giờ dùng bản chính) có thể thêm tới 150.000 ở Cao: vẫn dưới 1.500.000 nhưng còn rất ít dư; mỗi làng cần đo lại.
- **Tam giác xấu nhất ở chợ nhìn về các làng:** hình dáng làng nhìn từ xa tối đa 4 nhà (Thấp) hay 6 nhà và 4 bụi tre (Vừa, Cao) mỗi làng, bản xa 8.000 tam giác. Hiện 3 làng nhỏ có 3 nhà; lên 4 và 6 nhà thì thêm tối đa 8.000 (Thấp) và 32.000 (Vừa, Cao) mỗi làng trong tầm nhìn; một hướng nhìn thấy tối đa 2 làng: Thấp +16.000 (chợ xấu nhất 246.000 thành khoảng 262.000, dưới 270.000), Vừa +64.000 (khoảng 740.000), Cao +64.000 (khoảng 1.030.000).
- **Chuẩn bị sẵn** ngốn cùng thời gian mỗi làng (chừng 2,5 giây ở nền chuẩn bị, không chặn khung hình); không đổi số khung chậm.

**`MiniGameLevel`** (game phụ; **đã làm ở mốc 2 bước 10**: `packages/core/src/ui/MiniGameLevel.tsx`, mốc điểm và ghi kết quả ở `games/medals.ts`, chữ ở `content/games.ts`):
- Thẻ bắt đầu: tên game, luật 2–3 dòng, cách điều khiển (máy tính và điện thoại), điểm cao nhất (chưa chơi thì "Em chưa chơi màn này."), các mốc điểm, nút "Bắt đầu".
- Màn kết quả: điểm, mốc đồng / bạc / vàng (và "Kỷ lục mới!", số xu nhận), nút "Chơi lại" và "Về làng". Ở điện thoại ngang (thấp dưới 500 điểm ảnh: 844 × 390, 667 × 375) bố cục hai cột trong đúng một màn hình, không cuộn (`.mg-result` ở `theme.css`: trái điểm, sao, mốc; phải điểm từng phần, mốc điểm, xu và hai nút cao 44 điểm ảnh luôn thấy); áp cho mọi game phụ.
- Props: `levelId`, `medals` (3 mốc điểm của game), `renderGame({ paused, attempt, onFinish })` (phần chơi do từng game vẽ; gọi `onFinish(điểm)` một lần khi xong, thắng hay thua), `onLeave?`.
- **Ghi tiến độ** (`recordLevelResult`, đăng nhập hay khách): chơi xong là `played = true` (kể cả điểm 0), `best_score` lấy số lớn hơn, `stars {"game": 0–3}` theo mốc (0 thì không ghi khóa, hiểu là 0), `completed` khi đạt ít nhất mốc Đồng; xu +10 cho mỗi sao mới. Ghi vào máy ngay rồi đẩy lên sau.
- **Tạm dừng:** tab bị ẩn lúc đang chơi thì `paused` = true và hộp "Tạm dừng" giữ cho tới khi em bấm "Tiếp tục" (khỏi chạy tiếp lúc em chưa nhìn).
- Trang thử (chỉ khi chạy dev): `/dev/minigame` (game giả có các nút kết thúc với điểm cho trước).

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
- **Mixer (mốc 2, bước 10b):** mixer, hành động và lớp tư thế do bộ điều khiển `CharacterRig` (`three/characterRig.ts`, thuần, có test) giữ; `build` dọn rig cũ trước khi dựng rig mới, `dispose` xóa mọi tham chiếu, `play`/`update` luôn tra rig HIỆN TẠI. Lý do: gọi `play()` trên hành động của mixer đã `uncacheRoot` thì three ném "Cannot set properties of undefined (setting '_cacheIndex')" và sập Canvas; trước đây hàm `play` cũ (giữ rig cũ trong state) vẫn chạy trong cùng lần commit khi model đổi (ví dụ đổi mức chất lượng lúc đang chơi).
- **Lỗi 3D:** mọi `<Scene3D>` có lớp chặn lỗi `CanvasErrorBoundary`: hộp "Cảnh 3D gặp lỗi" trên nền giấy dó với "Tải lại" và "Bản đồ" (chợ, làng phủ kín màn hình), lỗi ghi ra console với tiền tố `[3D]`. Khung 3D trang bài học chỉ ẩn khung (bài học chạy tiếp) và ghi lỗi ra console. Thử bằng `?loi3d=1` (chỉ khi chạy dev).
- **Thế giới mở sau bước X3 (làng bán kính 125), cách giữ nhẹ:** (1) đồ rải dựng bằng code (tre, cây quả, phên, cầu ao, đồi) dưới 200 tam giác mỗi hình, màu theo đỉnh; chia mảnh theo ô lưới 48 (`three/village/ChunkedInstances.tsx`: mỗi mảnh một InstancedMesh có cắt theo khung nhìn, cứ 0,25 giây bật/tắt mảnh theo tầm `SCATTER_MAX_DISTANCE[mức][loại]`; Vừa: tre 100, cây quả 85, phên 70, cầu ao 120, đồi 240); (2) model nhà, cây đa, giếng, lều chợ của làng chỉ vẽ trong `VILLAGE_MODEL_MAX_DISTANCE` (Vừa 170, Cao 240), mức Thấp không vẽ xa hơn 38; (3) vùng làng dựng từng giai đoạn mỗi giai đoạn một khung hình (đồ nhỏ, biển, cuộn giấy, từng loại đồ rải, model, hướng dẫn, dân làng); chuẩn bị sẵn nạp texture mỗi khung hình một cái, chờ khung rảnh (`warm.ts`: nghỉ 240 ms giữa hai texture, đợi khung dưới 13 ms tối đa 700 ms) và biên dịch shader mỗi khung hình một vật liệu (`compileAhead`). Đồ rải ở đất hoang của ba làng chưa dựng (`wildlands`) cũng đi qua `ChunkedInstances`.
- **Số đo bước X3** (bản build, Chrome, Intel UHD, máy cắm điện): **tam giác lớn nhất ở 85 chỗ đứng** (cả Làng Giấy, chợ, đường, cầu, ba làng nhỏ, sông): Thấp **193.536** (giới hạn 270.000), Vừa **920.148** (giới hạn dưới 1.000.000), Cao **1.047.718** (giới hạn dưới 1.500.000). **Tải:** xem `docs/DEPLOY.md` (lần đầu 20,8 MB Thấp, 22,2 MB Vừa và Cao; vùng Làng Giấy thêm 4,1 đến 5,1 MB). **Khung chậm nhất lúc từ ngoài vùng tải đi vào làng** (2 lượt hợp lệ mỗi mức, đặt người chơi ngay ngoài vùng tải rồi chạy vào): Thấp 21,0 và 14,2 ms; Vừa 55,6 và 41,8 ms; Cao 76,3 và 48,4 ms. Còn **2 khung vượt 50 ms trong 6 lượt** (Vừa 55,6 ms, Cao 76,3 ms), cùng nằm ở khoảng 2,3 đến 2,5 giây sau khi bắt đầu chạy, lúc vùng làng được gắn vào cảnh (xem báo cáo X3). Đi dọc làng (đại lộ vào sâu tới z = 250, chạy, một lượt mỗi mức, khoảng 10.000 khung): chậm nhất Thấp 48,6, Vừa 48,6, Cao 34,8 ms, không khung nào quá 50 ms.
- **Bộ nhớ khi vào ra làng (20 lần, mỗi mức):** không có đối tượng X3 nào bị bỏ sót (cột sáng thẻ, `ChunkedInstances`, `ScatterProps`, đồi và tre đất hoang đều được giải phóng; hình học "mồ côi" chỉ có ở làng nhiệm vụ). Số hình học đứng yên sau vài lần đầu: Thấp 127 (từ lần 10), Vừa 127 (từ lần 3), Cao 127 (từ lần 2), nhiệm vụ ở làng khác (Thấp) 119 (từ lần 3); texture không đổi (Thấp 87, Vừa và Cao 92); heap tăng khoảng 0,2 MB mỗi lần ở bài đo 10 lần có thu gom rác (Thấp 19,8 → 21,7, Vừa 19,9 → 21,8, Cao 20,1 → 20,7 MB), dưới ngưỡng 0,3 MB mỗi lần. Số hình học không quay về mốc ban đầu (100 đến 104 lúc chưa vào làng) vì (a) GPU chỉ nạp các mảnh luôn có trong thế giới (nhà làng nhìn từ xa, đồi, tre, dân làng) khi lần đầu được nhìn thấy, và (b) làng nhiệm vụ được chuẩn bị sẵn nên `ZonePrewarm` cố ý giữ model và phần đã nướng của làng đó (2 đến 3 hình học nhà, tre, không còn nằm trong cảnh); khi nhiệm vụ ở làng khác thì không còn hình học mồ côi nào.
- **Texture kích thước 0:** `warmUp` chỉ `initTexture` các texture có ảnh dùng được (`textureUsable`); `modelLoader` không dọn model vừa được đọc lúc render mà chưa kịp giữ (`disposeWaitMs`), để scene vừa render không mang `ImageBitmap` đã đóng. Bóng đổ dùng `shadows="percentage"` (PCFShadowMap) vì `PCFSoftShadowMap` đã bị three gỡ.

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
- [x] `/dev/portraits` xuất được 11 ảnh chân dung rõ mặt. (Bước 15a: 12 ảnh gồm cả `bac-an-cuoi`; đã xem từng ảnh, 512×512, nền trong suốt; đã chép vào `assets/ui/portraits/` và chạy `pnpm assets:build`.)
- [ ] Trang bài học 2D từ 1280px (mốc 2): 2 nhân vật 3D hai bên bảng; trả lời đúng thì học sinh `cheer` và {phanDien} giữ `idle` (`hurt` chỉ dành cho màn 5), trả lời sai thì {phanDien} `cheer` và học sinh `sad`, rồi về `idle`; bảng thu nhỏ để chừa chỗ cho khung (f = 14% màn, 180–280px; s = min(1,35, (màn − 2 × (f + 16)) / 872)); dưới 1280px, mức Thấp, "Giảm chuyển động" hoặc "Chữ to" thì ẩn và bảng như cũ; khung ẩn về sau (lỗi, FPS thấp) thì bảng không nhảy; tắt âm thanh vẫn phản ứng; model tải lỗi thì bỏ trống, bài học vẫn chơi được; `onAnswer(dung)` hoạt động ở cả 4 bài.
- [ ] `Scene25D` hiện nền, hình rời và nhân vật 3D đúng lớp, co giãn đúng 16:9.
- [ ] Đổi tên `phanDien` trong `characters.ts` thì đổi ở mọi lời thoại và câu hỏi.
- [ ] `pnpm check:text` không báo chữ hiển thị nào nằm ngoài `content/`; có file `HUONG-DAN-SUA-CHU.md`.
- [x] Hướng dẫn chơi (bước 16): 6 phần, mỗi phần 2 đến 4 trang; lời và hình theo máy tính hoặc điện thoại; mở từ HUD (nút ?), Menu và thẻ bắt đầu của màn 2, màn 3 (mở thẳng phần của game); lần đầu vào chợ tự mở "Đi lại và camera" một lần. (Kiểm bằng Chrome ở máy tính 1280×720 và điện thoại ngang 844×390; có test ở `huongDan.test.ts`, `guideFlags.test.ts`, `apps/hub/src/guide.test.tsx`.)
- [x] "Em có biết?" lần đầu vào làng (sau cảnh mở đầu, "Thẻ n/tổng", nút "Vào làng", một lần, xem lại ở menu làng). (Bước 16, kiểm bằng Chrome.)
- [ ] Test va chạm và `unlock.ts` ✅. Mức Thấp ≥ 30fps. (Bước 15a: `collision.test.ts`, `unlock.test.ts` xanh; fps trên máy tính xem spec 04 và 05; điện thoại tầm trung thật chưa thử.)
