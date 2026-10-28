# P2b — thẻ "Em có biết?" chưa nhặt trên bản đồ (28/10/2026, hoàn thiện `/ban-do`)

## Làm gì

Hình thoi vàng (`MapGlyph` dùng chung với bản đồ trong game) cho mọi thẻ chưa nhặt:

| Nơi | Cách đặt |
|---|---|
| Bản đồ lớn (phím M / chạm bản đồ nhỏ) | cả 4 làng, đúng tọa độ thế giới của từng cuộn giấy |
| Bản đồ nhỏ | cả 4 làng, chỉ vẽ thẻ trong vòng đang hiện, đúng tọa độ, cả hướng bắc và xoay |
| `/ban-do` | ảnh vẽ tay chỉ để **chọn làng**; chọn làng thì bảng làng có **vùng bản đồ làng phóng to** vẽ từ bố cục thật, thẻ đúng tọa độ |

- Một nguồn dữ liệu: `LOCAL_VILLAGES[...].scrolls` đổi bằng `placeVillage` (cùng phép với `assembleWorld`). Không chép tọa độ, không dựng cảnh 3D.
- Vùng bản đồ làng (`apps/hub/src/ban-do/VillageScrollMap.tsx`, tải lười): `villageMapData()` ở `three/world/map/banDoScrolls.ts` dựng hình học bằng `buildMapGeometry` + `MapStaticLayer` và chiếu bằng `project`/`staticTransform` (bắc ở trên, đông bên phải; khung 300 × 300 = bán kính làng 125 + 8). Biểu tượng KHÔNG bị dịch. Số 1 đến 4 sát hình; tên khu ("Gần đình làng") và chú thích bằng chữ nằm ở danh sách dưới bản đồ nên không có nhãn nào đè lên bản đồ (4 thẻ cùng làng cách nhau > 44 đơn vị khung, có test). Chữ ở `content/minimap.ts` (`banDoThe`) và `knowScrollUi.khu`.
- Làng nhặt đủ: không vẽ bản đồ, hiện lời báo. Nhặt xong cập nhật ngay (cùng mặt nạ `knowCards` hiệu lực với bảng làng và cảnh 3D); tải lại vẫn khớp.
- Bản trước (biểu tượng quanh điểm làng, bị `layoutScrollIcons` đẩy ra mép chữ tên làng, 0/16 đúng vị trí, lệch hướng 24° ở 360×800) đã bỏ: xóa `ScrollMarks`, `layoutScrollIcons`, `banDoPoint`.

## Kết quả kiểm (`node scripts/p2b-check.mjs`, bản build có cầu nối đo, Chrome headless, WebGL phần mềm)

**410 kiểm đạt** (1366×768: 141, 360×800: 134, 844×390: 135). Chi tiết: `ket-qua.json`; ảnh: `anh.json` (32 ảnh, lớn nhất 162.036 byte). Chuột ở 1366×768, chạm giả lập (`Touchscreen.tap`) ở hai cỡ còn lại. Lần đầu chọn làng có lời giới thiệu: script bấm "Bỏ qua" như người chơi.

| Yêu cầu | Kết quả |
|---|---|
| Đủ 16 thẻ khi chưa nhặt | chọn từng làng bằng chuột/chạm: 4 làng × 4 = 16 ở cả 3 cỡ |
| Tọa độ từng thẻ bằng dữ liệu thật | tọa độ thế giới + tâm làng đọc từ `window.__world` (bố cục thật), tính độc lập `150 − (x − cx)·k`, so với `data-px/py` (sai < 0,01 đơn vị khung) và với vị trí thật trên màn hình (< 0,75 px, đã trừ viền svg) |
| Bố cục | hình ≥ 18 px (22 px nhỏ nhất), nằm trọn trong bản đồ, không đè nhau; lớp bố cục thật có mặt, tâm viền làng ở giữa khung; danh sách có số và tên khu; chú thích bằng chữ; vẫn đủ 4 nút làng trên ảnh chung |
| Đã nhặt một phần / tất cả | mặt nạ Giấy 2 (1,3), Dệt đủ, Khắc Dấu 0, Bạc 1: đúng bộ thẻ còn lại từng làng, "Còn n/4"; Dệt đủ: không bản đồ, có lời báo |
| Chọn làng khác | vùng bản đồ đổi sang làng đó |
| Phông tải muộn | trì hoãn mọi tải phông 2,5 s (tắt cache): vị trí biểu tượng trong khung giống nhau trước và sau khi phông tải xong (< 0,1 đơn vị) |
| Chữ to + giảm chuyển động | 16 thẻ, sai lệch < 0,75 px, không phần tử chuyển động; bản đồ nhỏ nhân 1,15 (207/138 px); bản đồ lớn đủ 16 và chú thích |
| Nhặt thật (phím E) rồi tải lại | bản đồ nhỏ và lớn còn 15; `/ban-do` mở từng làng cũng còn 15, không có thẻ Làng Giấy số 2 |
| Đổi người chơi | cookie khách mới thấy lại đủ 16 thẻ |
| Phần giữ nguyên (bản đồ lớn/nhỏ) | khớp vật thể 3D thật (lệch 0,00 px), hướng bắc/xoay (lệch ≤ 0,06 px), chỉ vẽ thẻ trong vòng: vẫn đạt |

**Ảnh tiêu biểu:** `ban-do-khach-moi-*` (Làng Giấy), `ban-do-lang-det-khach-moi-*`, `ban-do-lang-bac-khach-moi-*`, `ban-do-mot-phan-*`, `ban-do-du-the-*`, `ban-do-chu-to-*`, `ban-do-lon-*`, `ban-do-nho-*`, `ban-do-lon-sau-khi-nhat-*`.

## Test và lệnh bắt buộc

`pnpm test --maxWorkers=2`: **2138 pass, 1 skipped** (195 file). Test mới: `banDoScrolls.test.ts` (16 thẻ trùng bố cục thế giới, chiếu đúng công thức, khớp từng thẻ với bản đồ lớn, không chồng nhau, mặt nạ), `villageScrollMap.test.tsx` (dựng tĩnh: 4 thẻ đúng tọa độ, một phần/đủ, không bóng/lọc/chuyển động). `pnpm typecheck`, `pnpm check:text` (430 file), `pnpm build` đạt (`build.log`, `typecheck.log`).

## Bundle (build thường, tổng JS hub)

Trước P2b 2.764.071 byte; P2b lần 1: 2.774.247; nay **2.774.099** (860.705 gzip). Chunk lười mới `VillageScrollMap` 3.594 byte (1.521 gzip), chỉ tải khi chọn làng; `BanDoPage` 8.718; `index` 237.675. Dữ liệu bố cục làng vẫn ở chunk dùng chung `worldFrames` (≈ 67 KB, 23 KB gzip), tải lười cùng vùng bản đồ. Không sửa dựng cảnh 3D nên không đo FPS.

## Chưa xác minh

- Thiết bị thật, Safari/iPhone, trình đọc màn hình; chạm chỉ giả lập bằng Chrome.
- **Đổi tài khoản Supabase thật**: không có khóa ở máy đo. Chỉ kiểm được khách mới thấy lại 16 thẻ; chưa thử đăng xuất rồi đăng nhập người khác.
- Nhặt thẻ thật chỉ lái bằng phím E ở 1366×768; hai cỡ cảm ứng kiểm thẻ còn lại qua cookie tiến độ.
- Thẻ của làng chưa mở khóa vẫn hiện (theo yêu cầu "cả 4 làng"); giáo viên chưa kiểm riêng.
- Máy đo dựng 3D phần mềm chậm nên bản đồ nhỏ có lúc trễ nhịp; script chờ tới khi khớp.
